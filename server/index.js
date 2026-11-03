/**
 * ANTIGRAVITY ARCADE // Room Server
 * Serves the static arcade and pairs two players through a room code.
 *
 * The server knows nothing about any game's rules. It owns only what both
 * players must agree on: who is in the room, the match seed, and who won.
 * Everything else is relayed between the two devices.
 */

'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { WebSocket, WebSocketServer } = require('ws');

const ROOT = path.resolve(__dirname, '..');
const STATIC_DIRS = ['games', 'shared'];
const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp'
};

const DEFAULT_PORT = 8787;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // No I or O: easy to misread aloud
const CODE_LENGTH = 4;
const MAX_ROOMS = 1000;
const MAX_MESSAGE_BYTES = 4096;
const MAX_QUEUED_MESSAGES = 64;
const GRACE_MS = 20000;            // How long a dropped player can come back
const HEARTBEAT_TIMEOUT_MS = 12000; // Silence before a socket counts as dropped
const ROOM_IDLE_MS = 30 * 60 * 1000;
const SWEEP_MS = 3000;

/* ==========================================================================
   STATIC FILES
   ========================================================================== */
function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch (e) {
    res.writeHead(400).end();
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';

  // Only the arcade itself: never .git, this server, or anything above the repo
  const file = path.join(ROOT, path.normalize(pathname));
  const segments = path.relative(ROOT, file).split(path.sep);
  const isArcadeFile = (segments.length === 1 && segments[0] === 'index.html') || STATIC_DIRS.includes(segments[0]);
  if (!isArcadeFile || segments.some((s) => s.startsWith('.'))) {
    res.writeHead(404).end();
    return;
  }

  fs.stat(file, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stats.size
    });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    fs.createReadStream(file).pipe(res);
  });
}

/* ==========================================================================
   ROOMS
   ========================================================================== */
function startArcadeServer({
  port = DEFAULT_PORT,
  graceMs = GRACE_MS,
  heartbeatTimeoutMs = HEARTBEAT_TIMEOUT_MS,
  sweepMs = SWEEP_MS
} = {}) {
  const rooms = new Map();
  const server = http.createServer(serveStatic);
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

  const newCode = () => {
    let code;
    do {
      code = '';
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
      }
    } while (rooms.has(code));
    return code;
  };

  const newPlayer = (room, slot, ws) => {
    const player = {
      room,
      slot,
      ws,
      token: crypto.randomBytes(16).toString('hex'),
      ready: false,
      queue: [],
      graceTimer: null
    };
    room.players[slot] = player;
    ws.player = player;
    return player;
  };

  const peerOf = (player) => player.room.players[1 - player.slot];

  // For messages that can be missed, like board snapshots
  const send = (player, msg) => {
    if (player && player.ws && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(msg));
    }
  };

  // For messages that can't: held until a dropped player comes back
  const deliver = (player, msg) => {
    if (!player) return;
    if (player.ws) send(player, msg);
    else if (player.queue.length < MAX_QUEUED_MESSAGES) player.queue.push(msg);
  };

  const finishMatch = (room, winner, reason) => {
    room.status = 'finished';
    room.players.forEach((p) => {
      if (p) p.ready = false;
      deliver(p, { t: 'result', winner, reason });
    });
  };

  const removePlayer = (player) => {
    const { room } = player;
    clearTimeout(player.graceTimer);
    if (player.ws) player.ws.player = null;
    if (room.status === 'playing') finishMatch(room, 1 - player.slot, 'forfeit');
    room.players[player.slot] = null;

    const peer = peerOf(player);
    if (peer) {
      peer.ready = false;
      room.status = 'lobby';
      deliver(peer, { t: 'peer-left' });
    } else {
      rooms.delete(room.code);
    }
  };

  const handleDisconnect = (ws) => {
    const { player } = ws;
    if (!player) return;
    player.ws = null;
    ws.player = null;
    send(peerOf(player), { t: 'peer-away' });
    player.graceTimer = setTimeout(() => removePlayer(player), graceMs);
  };

  const handlers = {
    create(ws) {
      if (ws.player) return;
      if (rooms.size >= MAX_ROOMS) {
        ws.send(JSON.stringify({ t: 'error', reason: 'server-full' }));
        return;
      }
      const room = { code: newCode(), status: 'lobby', players: [null, null], lastActive: Date.now() };
      rooms.set(room.code, room);
      const player = newPlayer(room, 0, ws);
      send(player, { t: 'joined', code: room.code, slot: 0, token: player.token, peer: false });
    },

    join(ws, msg) {
      if (ws.player) return;
      const room = rooms.get(String(msg.code || '').trim().toUpperCase());
      if (!room) {
        ws.send(JSON.stringify({ t: 'error', reason: 'room-not-found' }));
        return;
      }
      const slot = room.players.indexOf(null);
      if (slot === -1) {
        ws.send(JSON.stringify({ t: 'error', reason: 'room-full' }));
        return;
      }
      const player = newPlayer(room, slot, ws);
      const peer = peerOf(player);
      send(player, { t: 'joined', code: room.code, slot, token: player.token, peer: Boolean(peer) });
      deliver(peer, { t: 'peer-joined' });
    },

    rejoin(ws, msg) {
      if (ws.player) return;
      const room = rooms.get(msg.code);
      const player = room && room.players.find((p) => p && p.token === msg.token);
      if (!player) {
        ws.send(JSON.stringify({ t: 'error', reason: 'room-gone' }));
        return;
      }

      // The old socket may not have closed yet if the network changed under it
      if (player.ws) {
        player.ws.player = null;
        player.ws.terminate();
      }
      clearTimeout(player.graceTimer);
      player.ws = ws;
      ws.player = player;

      send(player, { t: 'rejoined' });
      player.queue.splice(0).forEach((queued) => send(player, queued));
      send(peerOf(player), { t: 'peer-back' });
    },

    ready(ws) {
      const { player } = ws;
      if (!player || player.room.status === 'playing') return;
      const { room } = player;
      player.ready = true;
      send(peerOf(player), { t: 'peer-ready' });

      if (room.players.every((p) => p && p.ready)) {
        room.status = 'playing';
        const seed = crypto.randomInt(2 ** 32);
        room.players.forEach((p) => {
          p.ready = false;
          deliver(p, { t: 'start', seed });
        });
      }
    },

    // First report wins, so a near-simultaneous double loss still has one answer
    lost(ws) {
      const { player } = ws;
      if (player && player.room.status === 'playing') {
        finishMatch(player.room, 1 - player.slot, 'lost');
      }
    },

    // Sent by a client that has been hidden too long to count as still playing
    forfeit(ws) {
      const { player } = ws;
      if (player && player.room.status === 'playing') {
        finishMatch(player.room, 1 - player.slot, 'away');
      }
    },

    relay(ws, msg) {
      const { player } = ws;
      if (!player || player.room.status !== 'playing' || typeof msg.d !== 'object') return;
      const forward = msg.volatile ? send : deliver;
      forward(peerOf(player), { t: 'relay', d: msg.d });
    },

    leave(ws) {
      if (ws.player) removePlayer(ws.player);
    },

    ping(ws) {
      ws.send(JSON.stringify({ t: 'pong' }));
    }
  };

  wss.on('connection', (ws) => {
    ws.lastSeen = Date.now();
    ws.player = null;

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data);
      } catch (e) {
        return;
      }
      if (!msg || !Object.hasOwn(handlers, msg.t)) return;

      ws.lastSeen = Date.now();
      if (ws.player) ws.player.room.lastActive = ws.lastSeen;
      handlers[msg.t](ws, msg);
    });

    ws.on('close', () => handleDisconnect(ws));
    ws.on('error', () => ws.terminate());
  });

  // Phones can vanish without closing their socket, so silence counts as a drop
  const sweep = setInterval(() => {
    const now = Date.now();
    wss.clients.forEach((ws) => {
      if (now - ws.lastSeen > heartbeatTimeoutMs) ws.terminate();
    });
    rooms.forEach((room) => {
      if (now - room.lastActive > ROOM_IDLE_MS) {
        room.players.forEach((p) => {
          if (p) removePlayer(p);
        });
      }
    });
  }, sweepMs);

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({
        port: server.address().port,
        close: () => new Promise((done) => {
          clearInterval(sweep);
          rooms.forEach((room) => room.players.forEach((p) => p && clearTimeout(p.graceTimer)));
          wss.clients.forEach((ws) => ws.terminate());
          wss.close(() => server.close(done));
        })
      });
    });
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

if (require.main === module) {
  startArcadeServer({ port: Number(process.env.PORT) || DEFAULT_PORT }).then(({ port }) => {
    console.log(`Arcade running at http://localhost:${port}`);
    lanAddresses().forEach((ip) => console.log(`Same Wi-Fi devices: http://${ip}:${port}`));
  });
}

module.exports = { startArcadeServer };
