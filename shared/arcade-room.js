/**
 * ANTIGRAVITY ARCADE // Online Room Client
 * Room codes, heartbeats and reconnecting for any game, so a game only has to
 * react to events. Events arrive at onEvent as { t: '<type>', ... }:
 *
 *   joined       You're in a room: { code, slot, peer }
 *   peer-joined  A rival arrived
 *   peer-ready   The rival pressed ready
 *   peer-away    The rival dropped and has a grace period to return
 *   peer-back    The rival returned
 *   peer-left    The rival is gone for good
 *   start        Both are ready: { seed }
 *   relay        Data from the rival: { d }
 *   result       The match is over: { winner, reason } (compare winner to room.slot)
 *   reconnecting Your own connection dropped
 *   reconnected  Your connection is back
 *   gone         Your connection could not be restored
 *   error        A request failed: { reason }
 *
 * Most games want ArcadeLobby, which drives this class and supplies the screens.
 */

(function () {
  'use strict';

  const LOCAL_SERVER_URL = 'ws://localhost:8787/ws'; // For games opened from file://
  const HEARTBEAT_MS = 4000;
  const HEARTBEAT_TIMEOUT_MS = 9000;
  const RECONNECT_DELAY_MS = 1000;
  const RECONNECT_GIVE_UP_MS = 25000; // A little past the server's grace period
  const HIDDEN_FORFEIT_MS = 15000;    // A hidden game stops running, so it can't lose by itself

  function defaultServerUrl() {
    if (window.ARCADE_SERVER_URL) return window.ARCADE_SERVER_URL;
    if (location.protocol === 'file:') return LOCAL_SERVER_URL;
    return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
  }

  // Seeded generator (mulberry32): the same seed gives both rivals the same game
  function seededRandom(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  class ArcadeRoom {
    constructor(onEvent, url = defaultServerUrl()) {
      this.onEvent = onEvent;
      this.url = url;
      this.ws = null;
      this.code = null;
      this.slot = null;
      this.token = null;
      this.live = false;          // True once the server has us in a room on this socket
      this.outbox = [];           // Messages that must survive a reconnect
      this.heartbeat = null;
      this.lastPong = 0;
      this.reconnectTimer = null;
      this.droppedAt = 0;
      this.closed = false;
      this.inMatch = false;
      this.hiddenTimer = null;
      this.watchVisibility = () => this.checkHidden();
      document.addEventListener('visibilitychange', this.watchVisibility);
    }

    create() {
      this.open({ t: 'create' });
    }

    join(code) {
      this.open({ t: 'join', code });
    }

    ready() {
      this.send({ t: 'ready' });
    }

    // Report that this player lost; the server decides the winner
    lost() {
      this.send({ t: 'lost' });
    }

    // Volatile data is dropped rather than queued while either player is offline
    relay(data, { volatile = false } = {}) {
      this.send({ t: 'relay', d: data, volatile }, volatile);
    }

    leave() {
      this.shutDown();
      clearTimeout(this.reconnectTimer);
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ t: 'leave' }));
      }
      if (this.ws) this.ws.close();
    }

    shutDown() {
      this.closed = true;
      clearInterval(this.heartbeat);
      clearTimeout(this.hiddenTimer);
      document.removeEventListener('visibilitychange', this.watchVisibility);
    }

    // Keeping a match hidden would freeze this player's game while the rival plays on
    checkHidden() {
      clearTimeout(this.hiddenTimer);
      if (this.inMatch && document.hidden) {
        this.hiddenTimer = setTimeout(() => this.send({ t: 'forfeit' }), HIDDEN_FORFEIT_MS);
      }
    }

    send(msg, droppable = false) {
      if (this.live && this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(msg));
      } else if (!droppable) {
        this.outbox.push(msg);
      }
    }

    open(firstMessage) {
      const ws = new WebSocket(this.url);
      this.ws = ws;

      ws.addEventListener('open', () => {
        this.lastPong = Date.now();
        ws.send(JSON.stringify(firstMessage));
        clearInterval(this.heartbeat);
        this.heartbeat = setInterval(() => this.beat(ws), HEARTBEAT_MS);
      });
      ws.addEventListener('message', (e) => this.handleMessage(JSON.parse(e.data)));
      ws.addEventListener('close', () => {
        if (this.ws === ws) this.handleDrop();
      });
    }

    // A dead network can leave a socket looking open, so listen for the replies
    beat(ws) {
      if (Date.now() - this.lastPong > HEARTBEAT_TIMEOUT_MS) {
        ws.close();
        this.handleDrop();
        return;
      }
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ t: 'ping' }));
    }

    handleMessage(msg) {
      if (this.closed) return;

      switch (msg.t) {
        case 'pong':
          this.lastPong = Date.now();
          return;
        case 'joined':
          this.code = msg.code;
          this.slot = msg.slot;
          this.token = msg.token;
          this.live = true;
          break;
        case 'rejoined':
          this.live = true;
          this.droppedAt = 0;
          this.outbox.splice(0).forEach((queued) => this.send(queued));
          this.onEvent({ t: 'reconnected' });
          return;
        case 'start':
          this.inMatch = true;
          this.checkHidden();
          break;
        case 'result':
          this.inMatch = false;
          this.checkHidden();
          break;
        case 'error':
          if (msg.reason === 'room-gone') {
            this.giveUp();
            return;
          }
          break;
      }
      this.onEvent(msg);
    }

    handleDrop() {
      if (this.closed || this.reconnectTimer) return;
      clearInterval(this.heartbeat);
      this.ws = null;
      this.live = false;

      // Never got into a room, so there's nothing to get back to
      if (!this.token) {
        this.closed = true;
        this.onEvent({ t: 'error', reason: 'unreachable' });
        return;
      }

      if (!this.droppedAt) {
        this.droppedAt = Date.now();
        this.onEvent({ t: 'reconnecting' });
      }
      if (Date.now() - this.droppedAt > RECONNECT_GIVE_UP_MS) {
        this.giveUp();
        return;
      }

      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.open({ t: 'rejoin', code: this.code, token: this.token });
      }, RECONNECT_DELAY_MS);
    }

    giveUp() {
      this.shutDown();
      if (this.ws) this.ws.close();
      this.onEvent({ t: 'gone' });
    }
  }

  ArcadeRoom.seededRandom = seededRandom;
  window.ArcadeRoom = ArcadeRoom;
})();
