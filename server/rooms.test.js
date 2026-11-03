'use strict';

const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { startArcadeServer } = require('./index.js');

const GRACE_MS = 120;
let arcade;

// A scripted player: records every message and can wait for the next of a type
class TestClient {
  static async connect() {
    const client = new TestClient();
    client.ws = new WebSocket(`ws://localhost:${arcade.port}/ws`);
    client.inbox = [];
    client.waiters = [];
    client.ws.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data);
      const waiter = client.waiters.find((w) => w.type === msg.t);
      if (waiter) {
        client.waiters.splice(client.waiters.indexOf(waiter), 1);
        waiter.resolve(msg);
      } else {
        client.inbox.push(msg);
      }
    });
    await new Promise((resolve, reject) => {
      client.ws.addEventListener('open', resolve);
      client.ws.addEventListener('error', reject);
    });
    return client;
  }

  send(msg) {
    this.ws.send(JSON.stringify(msg));
  }

  next(type) {
    const index = this.inbox.findIndex((m) => m.t === type);
    if (index !== -1) return Promise.resolve(this.inbox.splice(index, 1)[0]);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), 1000);
      this.waiters.push({
        type,
        resolve: (msg) => {
          clearTimeout(timer);
          resolve(msg);
        }
      });
    });
  }

  close() {
    this.ws.close();
  }
}

async function makeRoom() {
  const host = await TestClient.connect();
  host.send({ t: 'create' });
  const created = await host.next('joined');

  const guest = await TestClient.connect();
  guest.send({ t: 'join', code: created.code.toLowerCase() });
  const joined = await guest.next('joined');
  await host.next('peer-joined');

  return { host, guest, code: created.code, hostToken: created.token, guestToken: joined.token };
}

async function startMatch() {
  const room = await makeRoom();
  room.host.send({ t: 'ready' });
  await room.guest.next('peer-ready');
  room.guest.send({ t: 'ready' });
  const [hostStart, guestStart] = await Promise.all([room.host.next('start'), room.guest.next('start')]);
  return { ...room, hostStart, guestStart };
}

before(async () => {
  arcade = await startArcadeServer({ port: 0, graceMs: GRACE_MS, heartbeatTimeoutMs: 400, sweepMs: 50 });
});

after(async () => {
  await arcade.close();
});

test('a room code pairs two players and gives them different slots', async () => {
  const host = await TestClient.connect();
  host.send({ t: 'create' });
  const created = await host.next('joined');
  assert.match(created.code, /^[A-HJ-NP-Z]{4}$/);
  assert.equal(created.slot, 0);
  assert.equal(created.peer, false);

  const guest = await TestClient.connect();
  guest.send({ t: 'join', code: created.code });
  const joined = await guest.next('joined');
  assert.equal(joined.slot, 1);
  assert.equal(joined.peer, true);
  await host.next('peer-joined');
});

test('joining rejects unknown codes and full rooms', async () => {
  const stranger = await TestClient.connect();
  stranger.send({ t: 'join', code: 'ZZZZ' });
  assert.equal((await stranger.next('error')).reason, 'room-not-found');

  const { code } = await makeRoom();
  stranger.send({ t: 'join', code });
  assert.equal((await stranger.next('error')).reason, 'room-full');
});

test('the match starts only once both are ready, with one shared seed', async () => {
  const { hostStart, guestStart } = await startMatch();
  assert.equal(hostStart.seed, guestStart.seed);
  assert.ok(Number.isInteger(hostStart.seed));
});

test('relay forwards only during a match, and only to the other player', async () => {
  const { host, guest } = await makeRoom();
  host.send({ t: 'relay', d: { kind: 'garbage', lines: 4 } });
  host.send({ t: 'ready' });
  guest.send({ t: 'ready' });
  await Promise.all([host.next('start'), guest.next('start')]);

  host.send({ t: 'relay', d: { kind: 'garbage', lines: 2 } });
  const relayed = await guest.next('relay');
  assert.deepEqual(relayed.d, { kind: 'garbage', lines: 2 });
  assert.equal(host.inbox.filter((m) => m.t === 'relay').length, 0);
});

test('the first reported loss decides the match, and a later one is ignored', async () => {
  const { host, guest } = await startMatch();
  guest.send({ t: 'lost' });
  host.send({ t: 'lost' });

  const [hostResult, guestResult] = await Promise.all([host.next('result'), guest.next('result')]);
  assert.equal(hostResult.winner, 0);
  assert.equal(guestResult.winner, 0);
  assert.equal(hostResult.reason, 'lost');
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(host.inbox.filter((m) => m.t === 'result').length, 0);
});

test('a player who stayed hidden forfeits, and stays in the room for a rematch', async () => {
  const { host, guest } = await startMatch();
  guest.send({ t: 'forfeit' });

  const result = await host.next('result');
  assert.equal(result.winner, 0);
  assert.equal(result.reason, 'away');

  host.send({ t: 'ready' });
  guest.send({ t: 'ready' });
  await Promise.all([host.next('start'), guest.next('start')]);
});

test('a rematch gets a new seed', async () => {
  const { host, guest, hostStart } = await startMatch();
  host.send({ t: 'lost' });
  await Promise.all([host.next('result'), guest.next('result')]);

  host.send({ t: 'ready' });
  guest.send({ t: 'ready' });
  const rematch = await host.next('start');
  assert.notEqual(rematch.seed, hostStart.seed);
});

test('a dropped player can rejoin and receives what they missed', async () => {
  const { host, guest, code, guestToken } = await startMatch();
  guest.close();
  await host.next('peer-away');

  host.send({ t: 'relay', d: { kind: 'board', cells: 'skip me' }, volatile: true });
  host.send({ t: 'relay', d: { kind: 'garbage', lines: 3 } });
  await new Promise((resolve) => setTimeout(resolve, 20));

  const back = await TestClient.connect();
  back.send({ t: 'rejoin', code, token: guestToken });
  await back.next('rejoined');
  assert.deepEqual((await back.next('relay')).d, { kind: 'garbage', lines: 3 });
  await host.next('peer-back');

  await new Promise((resolve) => setTimeout(resolve, GRACE_MS + 50));
  assert.equal(host.inbox.filter((m) => m.t === 'result').length, 0);
});

test('rejoining with the wrong token is refused', async () => {
  const { code } = await startMatch();
  const impostor = await TestClient.connect();
  impostor.send({ t: 'rejoin', code, token: 'not-the-token' });
  assert.equal((await impostor.next('error')).reason, 'room-gone');
});

test('a player who never comes back forfeits after the grace period', async () => {
  const { host, guest } = await startMatch();
  guest.close();
  await host.next('peer-away');
  const result = await host.next('result');
  assert.equal(result.winner, 0);
  assert.equal(result.reason, 'forfeit');
  await host.next('peer-left');
});

test('leaving a match forfeits straight away', async () => {
  const { host, guest } = await startMatch();
  guest.send({ t: 'leave' });
  assert.equal((await host.next('result')).winner, 0);
  await host.next('peer-left');
});

test('a silent socket counts as dropped', async () => {
  const { host, guest } = await startMatch();
  const keepAlive = setInterval(() => host.send({ t: 'ping' }), 100);
  await host.next('peer-away');
  clearInterval(keepAlive);
  guest.close();
});

test('an empty room is deleted', async () => {
  const host = await TestClient.connect();
  host.send({ t: 'create' });
  const { code } = await host.next('joined');
  host.send({ t: 'leave' });
  await new Promise((resolve) => setTimeout(resolve, 50));

  const late = await TestClient.connect();
  late.send({ t: 'join', code });
  assert.equal((await late.next('error')).reason, 'room-not-found');
});

test('the static server exposes the arcade and nothing else', async () => {
  const get = async (pathname) => (await fetch(`http://localhost:${arcade.port}${pathname}`)).status;
  assert.equal(await get('/'), 200);
  assert.equal(await get('/games/neon-blocks/index.html'), 200);
  assert.equal(await get('/shared/arcade-room.js'), 200);
  assert.equal(await get('/README.md'), 404);
  assert.equal(await get('/server/index.js'), 404);
  assert.equal(await get('/.git/config'), 404);
  assert.equal(await get('/games/../server/index.js'), 404);
  assert.equal(await get('/games/%2e%2e/server/index.js'), 404);
  assert.equal(await get('/games/%2e%2e/%2e%2e/%2e%2e/etc/passwd'), 404);
});
