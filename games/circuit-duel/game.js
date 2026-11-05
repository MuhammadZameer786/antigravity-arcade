/**
 * CIRCUIT DUEL // Neon Dots & Boxes
 * Pure vanilla HTML5 Canvas + Web Audio API
 *
 * Two players take turns drawing one line between neighboring nodes. Closing
 * the fourth side of a cell claims it and earns another move. Three cores are
 * worth extra, which makes the total odd, so a game can never be drawn.
 *
 * Online, each device keeps the whole board and the players send each other
 * only their moves. The loser's device reports the loss to the room server.
 */

'use strict';

// ============================================================================
// 0. RULES AND BOARD GEOMETRY
// ============================================================================
const N = 5;                                   // Cells per side
const H_LINES = (N + 1) * N;                   // Horizontal lines come first
const LINES = 2 * N * (N + 1);                 // 60 lines
const CELLS = N * N;                           // 25 cells
const CORE_VALUES = [2, 2, 3];                 // Extra points keep the total odd
const TOTAL = CELLS + CORE_VALUES.reduce((sum, v) => sum + v - 1, 0);
const WIN_SCORE = Math.floor(TOTAL / 2) + 1;   // 15 of 29
const TURN_SECONDS = 30;                       // Online move clock
const SOLVE_LIMIT = 18;                        // Hard plays perfectly from here

const COLORS = ['#00f3ff', '#ff007f'];
const RGB = ['0, 243, 255', '255, 0, 127'];
const CORE_COLOR = '#ffe600';
const LEVEL_NAMES = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };

// LINE_ENDS[l] = [col1, row1, col2, row2] in node coordinates
const LINE_ENDS = [];
const LINE_CELLS = [];
const CELL_LINES = [];

for (let r = 0; r <= N; r++) {
  for (let c = 0; c < N; c++) {
    const id = r * N + c;
    LINE_ENDS[id] = [c, r, c + 1, r];
    LINE_CELLS[id] = [];
    if (r > 0) LINE_CELLS[id].push((r - 1) * N + c);
    if (r < N) LINE_CELLS[id].push(r * N + c);
  }
}
for (let r = 0; r < N; r++) {
  for (let c = 0; c <= N; c++) {
    const id = H_LINES + r * (N + 1) + c;
    LINE_ENDS[id] = [c, r, c, r + 1];
    LINE_CELLS[id] = [];
    if (c > 0) LINE_CELLS[id].push(r * N + c - 1);
    if (c < N) LINE_CELLS[id].push(r * N + c);
  }
}
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    const left = H_LINES + r * (N + 1) + c;
    CELL_LINES[r * N + c] = [r * N + c, (r + 1) * N + c, left, left + 1];
  }
}

class Board {
  constructor() {
    this.lines = new Int8Array(LINES).fill(-1);   // Who drew each line, or -1
    this.owners = new Int8Array(CELLS).fill(-1);  // Who claimed each cell, or -1
    this.sides = new Uint8Array(CELLS);           // Drawn sides per cell
    this.values = new Uint8Array(CELLS).fill(1);
    this.scores = [0, 0];
    this.turn = 0;
    this.moves = 0;
    this.over = false;
    this.winner = -1;
    this.lastLine = -1;
  }

  // The same rng gives the same cores, so both online players see one board
  static create(rng, first) {
    const board = new Board();
    const cells = Array.from({ length: CELLS }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    CORE_VALUES.forEach((v, i) => {
      board.values[cells[i]] = v;
    });
    board.turn = first;
    return board;
  }

  clone() {
    const b = Object.create(Board.prototype);
    b.lines = this.lines.slice();
    b.owners = this.owners.slice();
    b.sides = this.sides.slice();
    b.values = this.values;
    b.scores = this.scores.slice();
    b.turn = this.turn;
    b.moves = this.moves;
    b.over = this.over;
    b.winner = this.winner;
    b.lastLine = this.lastLine;
    return b;
  }

  // Draws a line for whoever's turn it is. Returns the cells it closed,
  // or null if the move isn't allowed.
  play(line) {
    if (this.over || this.lines[line] !== -1) return null;
    const p = this.turn;
    this.lines[line] = p;
    this.moves++;
    this.lastLine = line;
    const closed = [];
    for (const c of LINE_CELLS[line]) {
      this.sides[c]++;
      if (this.sides[c] === 4) {
        this.owners[c] = p;
        this.scores[p] += this.values[c];
        closed.push(c);
      }
    }
    if (!closed.length) this.turn = 1 - p;
    if (this.scores[0] >= WIN_SCORE || this.scores[1] >= WIN_SCORE || this.moves === LINES) {
      this.over = true;
      this.winner = this.scores[0] > this.scores[1] ? 0 : 1;
    }
    return closed;
  }

  empties() {
    const out = [];
    for (let i = 0; i < LINES; i++) if (this.lines[i] === -1) out.push(i);
    return out;
  }
}

// ============================================================================
// 1. COMPUTER OPPONENT
// Easy is careless. Normal takes free cells, avoids handing any over while
// it can, and gives away as little as possible once it must. Hard plays like
// Normal, then searches every remaining ending once few lines are left.
// ============================================================================
const AI = {
  missingLine(board, cell) {
    for (const l of CELL_LINES[cell]) if (board.lines[l] === -1) return l;
    return -1;
  },

  captures(board) {
    const out = [];
    for (let c = 0; c < CELLS; c++) {
      if (board.sides[c] === 3) {
        const l = AI.missingLine(board, c);
        if (l >= 0 && !out.includes(l)) out.push(l);
      }
    }
    return out;
  },

  // A safe line leaves no cell with three sides for the opponent
  isSafe(board, line) {
    for (const c of LINE_CELLS[line]) if (board.sides[c] >= 2) return false;
    return true;
  },

  // Points the opponent can grab straight after this line
  giveaway(board, line) {
    const b = board.clone();
    const me = b.turn;
    b.play(line);
    if (b.turn === me) return 0;
    const before = b.scores[1 - me];
    let caps = AI.captures(b);
    while (!b.over && caps.length) {
      b.play(caps[0]);
      caps = AI.captures(b);
    }
    return b.scores[1 - me] - before;
  },

  choose(board, level, rng = Math.random) {
    const pick = (list) => list[Math.floor(rng() * list.length)];
    const empties = board.empties();
    const caps = AI.captures(board);
    const safe = empties.filter((l) => AI.isSafe(board, l));

    if (level === 'easy') {
      if (caps.length && rng() < 0.7) return pick(caps);
      if (safe.length && rng() < 0.75) return pick(safe);
      return pick(empties);
    }
    if (level === 'hard' && empties.length <= SOLVE_LIMIT) return AI.solve(board, rng);
    if (caps.length) return AI.bestCapture(board, caps);
    if (safe.length) return pick(safe);
    return AI.leastGiveaway(board, empties, rng);
  },

  // Prefer the line that closes the most points at once
  bestCapture(board, caps) {
    let best = caps[0];
    let bestGain = -1;
    for (const l of caps) {
      let gain = 0;
      for (const c of LINE_CELLS[l]) if (board.sides[c] === 3) gain += board.values[c];
      if (gain > bestGain) {
        bestGain = gain;
        best = l;
      }
    }
    return best;
  },

  leastGiveaway(board, empties, rng) {
    let best = Infinity;
    let list = [];
    for (const l of empties) {
      const g = AI.giveaway(board, l);
      if (g < best) {
        best = g;
        list = [l];
      } else if (g === best) {
        list.push(l);
      }
    }
    return list[Math.floor(rng() * list.length)];
  },

  // Exhaustive search over the remaining lines. The position depends only on
  // which lines are drawn, so each set of drawn lines is solved once.
  // value(mask) = best points lead the player to move can still get.
  solve(board, rng) {
    const empties = board.empties();
    const k = empties.length;
    const bit = new Int8Array(LINES).fill(-1);
    empties.forEach((l, i) => {
      bit[l] = i;
    });
    const cellMask = new Int32Array(CELLS);
    for (let c = 0; c < CELLS; c++) {
      if (board.owners[c] !== -1) continue;
      for (const l of CELL_LINES[c]) if (bit[l] >= 0) cellMask[c] |= 1 << bit[l];
    }
    const adj = empties.map((l) => LINE_CELLS[l]);
    const values = board.values;
    const full = (1 << k) - 1;
    const memo = new Int16Array(1 << k);
    const known = new Uint8Array(1 << k);

    const gain = (i, mask) => {
      let g = 0;
      for (const c of adj[i]) {
        const m = cellMask[c];
        if (m && (mask & m) === m) g += values[c];
      }
      return g;
    };

    const value = (mask) => {
      if (mask === full) return 0;
      if (known[mask]) return memo[mask];
      let best = -1000;
      for (let i = 0; i < k; i++) {
        const b = 1 << i;
        if (mask & b) continue;
        const next = mask | b;
        const g = gain(i, next);
        const v = g > 0 ? g + value(next) : -value(next);
        if (v > best) best = v;
      }
      known[mask] = 1;
      memo[mask] = best;
      return best;
    };

    let best = -Infinity;
    let choices = [];
    for (let i = 0; i < k; i++) {
      const next = 1 << i;
      const g = gain(i, next);
      const v = g > 0 ? g + value(next) : -value(next);
      if (v > best) {
        best = v;
        choices = [empties[i]];
      } else if (v === best) {
        choices.push(empties[i]);
      }
    }
    return choices[Math.floor(rng() * choices.length)];
  }
};

// ============================================================================
// 2. PROCEDURAL WEB AUDIO
// ============================================================================
class DuelAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.playing = false;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.last = {};
    this.arp = [220, 261.63, 329.63, 392, 440, 392, 329.63, 261.63];
    this.bass = [110, 87.31, 130.81, 98];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get on() {
    return !!this.ctx && !this.muted;
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) this.stopMusic();
  }

  ready(name, gap) {
    if (!this.on) return false;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || -1) < gap) return false;
    this.last[name] = now;
    return true;
  }

  tone(type, f0, f1, dur, vol, t = this.ctx.currentTime) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ---- Music: a quiet loop that stays out of the way of thinking ----
  startMusic() {
    if (!this.on || this.playing) return;
    this.playing = true;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.schedule();
  }

  stopMusic() {
    this.playing = false;
    clearTimeout(this.timer);
    this.timer = null;
  }

  schedule() {
    if (!this.playing || !this.ctx) return;
    const eighth = 60 / 100 / 2;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      const s = this.step;
      const bar = Math.floor(s / 8) % 4;
      this.tone('triangle', this.arp[s % 8], this.arp[s % 8], 0.22, 0.022, this.nextTime);
      if (s % 4 === 0) this.tone('sine', this.bass[bar], this.bass[bar], 0.5, 0.07, this.nextTime);
      this.nextTime += eighth;
      this.step = (this.step + 1) % 32;
    }
    this.timer = setTimeout(() => this.schedule(), 40);
  }

  // ---- Effects ----
  draw(player) {
    if (!this.on) return;
    const f = player === 0 ? 880 : 660;
    this.tone('square', f, f * 0.5, 0.07, 0.04);
    this.tone('sine', f * 2, f * 2, 0.03, 0.03);
  }

  select() {
    if (this.ready('select', 0.04)) this.tone('sine', 1400, 1400, 0.03, 0.03);
  }

  capture(chain, value) {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    const base = 523.25 * Math.pow(1.122, Math.min(chain, 12));
    this.tone('triangle', base, base, 0.18, 0.08, t);
    this.tone('triangle', base * 1.5, base * 1.5, 0.22, 0.05, t + 0.06);
    if (value > 1) {
      [1, 1.25, 1.5, 2].forEach((m, i) => this.tone('square', base * m, base * m, 0.16, 0.035, t + 0.1 + i * 0.05));
    }
  }

  tick(urgent) {
    if (this.on) this.tone('square', urgent ? 1200 : 900, urgent ? 1200 : 900, 0.04, 0.035);
  }

  win() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.tone('square', f, f, 0.16, 0.05, t + i * 0.09));
  }

  lose() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [392, 349.23, 311.13, 261.63].forEach((f, i) => this.tone('sawtooth', f, f * 0.98, 0.22, 0.04, t + i * 0.14));
  }
}

// ============================================================================
// 3. STORAGE
// ============================================================================
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

function readPref(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (e) {
    return fallback;
  }
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2)) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// ============================================================================
// 4. GAME
// ============================================================================
class CircuitDuel {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.canvas = $('board');
    this.ctx = this.canvas.getContext('2d');
    this.wrap = $('board-wrap');
    this.layer = document.createElement('canvas');
    this.layerCtx = this.layer.getContext('2d');
    this.audio = new DuelAudio();
    this.el = {
      status: $('status'),
      clock: $('clock'),
      clockFill: $('clock-fill'),
      modeLabel: $('mode-label'),
      panels: [$('panel-0'), $('panel-1')],
      names: [$('name-0'), $('name-1')],
      scores: [$('score-0'), $('score-1')],
      again: $('btn-again'),
      againLabel: $('again-label'),
      showResult: $('btn-show-result')
    };
    this.modals = {
      start: $('start-modal'),
      pause: $('pause-modal'),
      leave: $('leave-modal'),
      result: $('result-modal')
    };

    this.state = 'MENU';      // MENU | PLAYING | PAUSED | OVER | LOBBY
    this.mode = 'cpu';        // cpu | local | online
    this.level = readPref('circuit_duel_level', 'normal');
    if (!LEVEL_NAMES[this.level]) this.level = 'normal';
    this.board = Board.create(Math.random, 0);
    this.names = ['YOU', 'CPU'];
    this.mySlot = 0;
    this.cpuStarts = false;
    this.localStarter = 0;
    this.chain = 0;

    this.hover = -1;
    this.selected = -1;
    this.cursor = -1;
    this.keyboardUsed = false;
    this.aiTimer = null;

    this.lobby = null;
    this.matchLive = false;
    this.pending = new Map();
    this.netStatus = '';
    this.turnStartedAt = 0;
    this.lastTick = 0;
    this.awaitingResult = false;

    this.particles = [];
    this.popups = [];
    this.cellFlashes = [];
    this.lineFlash = null;
    this.dirty = true;
    this.shownStatus = '';

    this.bindEvents();
    this.selectLevel(this.level);
    this.refreshMenu();
    this.resize();
    this.updateHud();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- Setup ---------------------------------------------------------------
  bindEvents() {
    const click = (id, fn) => {
      document.getElementById(id).addEventListener('click', (e) => {
        e.currentTarget.blur();
        this.audio.init();
        fn();
      });
    };
    click('btn-cpu', () => this.startLocal('cpu'));
    click('btn-local', () => this.startLocal('local'));
    click('btn-online', () => this.openLobby());
    click('btn-resume', () => this.setPaused(false));
    click('btn-restart', () => this.startLocal(this.mode));
    click('btn-quit', () => this.showMenu());
    click('btn-pause', () => this.openMenu());
    click('btn-audio', () => this.toggleAudio());
    click('btn-stay', () => this.modals.leave.classList.remove('active'));
    click('btn-forfeit', () => this.forfeit());
    click('btn-again', () => this.playAgain());
    click('btn-board', () => this.viewBoard(true));
    click('btn-show-result', () => this.viewBoard(false));
    click('btn-result-menu', () => this.showMenu());

    document.querySelectorAll('.level-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectLevel(btn.dataset.level);
        this.refreshMenu();
      });
    });

    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerleave', () => {
      this.hover = -1;
    });
    window.addEventListener('keydown', (e) => this.onKey(e));
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input')) e.preventDefault();
    });

    new ResizeObserver(() => this.resize()).observe(this.wrap);
    window.addEventListener('resize', () => this.resize());
    // Core numbers are drawn with the web font, so redraw once it arrives
    if (document.fonts) {
      document.fonts.ready.then(() => {
        this.dirty = true;
      });
    }

    // A turn-based game doesn't need pausing, but its music shouldn't play on
    document.addEventListener('visibilitychange', () => {
      if (!this.audio.ctx) return;
      if (document.hidden) this.audio.ctx.suspend();
      else if (!this.audio.muted) this.audio.ctx.resume();
    });
  }

  resize() {
    const box = this.wrap.getBoundingClientRect();
    const size = Math.floor(Math.min(box.width, box.height));
    if (size <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (size === this.size && dpr === this.dpr) return;
    this.size = size;
    this.dpr = dpr;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
    this.canvas.width = Math.round(size * dpr);
    this.canvas.height = Math.round(size * dpr);
    this.layer.width = this.canvas.width;
    this.layer.height = this.canvas.height;
    const cell = size / (N + 1.2);
    this.geo = { cell, margin: cell * 0.6 };
    this.dirty = true;
  }

  selectLevel(level) {
    this.level = level;
    try {
      localStorage.setItem('circuit_duel_level', level);
    } catch (e) {}
    document.querySelectorAll('.level-btn').forEach((btn) => {
      const on = btn.dataset.level === level;
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-checked', String(on));
    });
  }

  // ---- Input ---------------------------------------------------------------
  nodeXY(col, row) {
    return [this.geo.margin + col * this.geo.cell, this.geo.margin + row * this.geo.cell];
  }

  // The empty line nearest to a point on the board, within reach
  lineAt(px, py) {
    const reach = this.geo.cell * 0.45;
    let best = -1;
    let bestScore = Infinity;
    for (let l = 0; l < LINES; l++) {
      if (this.board.lines[l] !== -1) continue;
      const [c1, r1, c2, r2] = LINE_ENDS[l];
      const [x1, y1] = this.nodeXY(c1, r1);
      const [x2, y2] = this.nodeXY(c2, r2);
      const d = distToSegment(px, py, x1, y1, x2, y2);
      if (d > reach) continue;
      // Near a node several lines tie, so favor the one whose middle is closer
      const score = d + Math.hypot(px - (x1 + x2) / 2, py - (y1 + y2) / 2) * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = l;
      }
    }
    return best;
  }

  pointerXY(e) {
    const rect = this.canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  onPointerDown(e) {
    e.preventDefault();
    this.audio.init();
    this.keyboardUsed = false;
    if (!this.canInput()) return;
    const [x, y] = this.pointerXY(e);
    const line = this.lineAt(x, y);

    // A mouse is precise enough to draw on the first click. A finger picks
    // the line first and draws on a second tap, so a near miss costs nothing.
    if (e.pointerType === 'mouse') {
      if (line >= 0) this.humanMove(line);
      return;
    }
    if (line >= 0 && line === this.selected) {
      this.humanMove(line);
    } else {
      this.selected = line;
      if (line >= 0) this.audio.select();
    }
  }

  onPointerMove(e) {
    if (e.pointerType !== 'mouse') return;
    if (this.keyboardUsed) this.keyboardUsed = false;
    const [x, y] = this.pointerXY(e);
    this.hover = this.canInput() ? this.lineAt(x, y) : -1;
  }

  onKey(e) {
    // Leave typing in the room code box alone
    if (e.target.closest && e.target.closest('input')) return;
    const onControl = e.target.closest && e.target.closest('button, a');
    const code = e.code;

    if (code === 'KeyM') {
      this.toggleAudio();
      return;
    }
    if (code === 'KeyP' || code === 'Escape') {
      if (this.state === 'PLAYING') this.openMenu();
      else if (this.state === 'PAUSED') this.setPaused(false);
      else if (this.modals.leave.classList.contains('active')) this.modals.leave.classList.remove('active');
      return;
    }
    if (onControl && (code === 'Enter' || code === 'Space')) return;

    const dirs = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    if (dirs[code] && this.state === 'PLAYING') {
      e.preventDefault();
      this.keyboardUsed = true;
      this.moveCursor(dirs[code][0], dirs[code][1]);
      this.audio.select();
      return;
    }
    if ((code === 'Enter' || code === 'Space') && this.state === 'PLAYING') {
      e.preventDefault();
      if (this.cursor >= 0 && this.canInput()) this.humanMove(this.cursor);
    }
  }

  // Steps the keyboard cursor to the nearest empty line in a direction
  moveCursor(dx, dy) {
    const empties = this.board.empties();
    if (!empties.length) return;
    const mid = (l) => {
      const [c1, r1, c2, r2] = LINE_ENDS[l];
      return [(c1 + c2) / 2, (r1 + r2) / 2];
    };
    if (this.cursor < 0 || this.board.lines[this.cursor] !== -1) {
      let best = empties[0];
      let bestD = Infinity;
      for (const l of empties) {
        const [x, y] = mid(l);
        const d = Math.hypot(x - N / 2, y - N / 2);
        if (d < bestD) {
          bestD = d;
          best = l;
        }
      }
      this.cursor = best;
      return;
    }
    const [x0, y0] = mid(this.cursor);
    let best = -1;
    let bestScore = Infinity;
    for (const l of empties) {
      if (l === this.cursor) continue;
      const [x, y] = mid(l);
      const along = (x - x0) * dx + (y - y0) * dy;
      if (along <= 0.01) continue;
      const across = Math.abs((x - x0) * dy - (y - y0) * dx);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = l;
      }
    }
    if (best >= 0) this.cursor = best;
  }

  canInput() {
    const b = this.board;
    if (this.state !== 'PLAYING' || b.over) return false;
    if (this.mode === 'cpu') return b.turn === 0;
    if (this.mode === 'online') return b.turn === this.mySlot;
    return true;
  }

  // ---- Moves ---------------------------------------------------------------
  humanMove(line) {
    if (!this.canInput() || this.board.lines[line] !== -1) return;
    if (this.mode === 'online') {
      this.lobby.room.relay({ kind: 'move', n: this.board.moves, line });
    }
    this.applyMove(line);
  }

  applyMove(line) {
    const b = this.board;
    const player = b.turn;
    const closed = b.play(line);
    if (closed === null) return false;

    this.selected = -1;
    this.hover = -1;
    this.lineFlash = { line, player, t: 0 };
    this.audio.draw(player);

    if (closed.length) {
      this.chain += closed.length;
      let value = 0;
      for (const c of closed) {
        value += b.values[c];
        this.cellFlashes.push({ cell: c, player, t: 0 });
        const [x, y] = this.cellCenter(c);
        this.burst(x, y, COLORS[player], b.values[c] > 1 ? 34 : 16);
        if (b.values[c] > 1) this.burst(x, y, CORE_COLOR, 20);
        this.popups.push({ x, y, text: `+${b.values[c]}`, color: b.values[c] > 1 ? CORE_COLOR : COLORS[player], t: 0 });
      }
      this.audio.capture(this.chain, value);
    } else {
      this.chain = 0;
    }

    this.dirty = true;
    this.turnStartedAt = performance.now();
    this.lastTick = 0;
    this.updateHud();
    if (b.over) this.finishGame();
    else this.nextTurn();
    return true;
  }

  nextTurn() {
    clearTimeout(this.aiTimer);
    this.updateStatus();
    const b = this.board;
    if (this.mode === 'cpu' && b.turn === 1 && this.state === 'PLAYING' && !b.over) {
      const delay = this.chain > 0 ? 380 : 520 + Math.random() * 380;
      this.aiTimer = setTimeout(() => this.cpuMove(), delay);
    }
  }

  cpuMove() {
    const b = this.board;
    if (this.state !== 'PLAYING' || b.over || b.turn !== 1 || this.mode !== 'cpu') return;
    this.applyMove(AI.choose(b, this.level));
  }

  // ---- Game flow -----------------------------------------------------------
  startLocal(mode) {
    if (this.lobby) this.lobby.leave();
    this.mode = mode;
    let first;
    if (mode === 'cpu') {
      first = this.cpuStarts ? 1 : 0;
      this.cpuStarts = !this.cpuStarts;
      this.names = ['YOU', `CPU · ${LEVEL_NAMES[this.level]}`];
    } else {
      first = this.localStarter;
      this.localStarter = 1 - this.localStarter;
      this.names = ['PLAYER 1', 'PLAYER 2'];
    }
    this.board = Board.create(Math.random, first);
    this.beginGame();
  }

  beginGame() {
    clearTimeout(this.aiTimer);
    this.state = 'PLAYING';
    this.chain = 0;
    this.selected = -1;
    this.hover = -1;
    this.cursor = -1;
    this.awaitingResult = false;
    this.particles = [];
    this.popups = [];
    this.cellFlashes = [];
    this.lineFlash = null;
    this.dirty = true;
    this.turnStartedAt = performance.now();
    this.lastTick = 0;
    this.hideModals();
    this.el.showResult.hidden = true;
    this.el.clock.hidden = this.mode !== 'online';
    this.updateHud();
    this.audio.startMusic();
    this.nextTurn();
  }

  openMenu() {
    if (this.state !== 'PLAYING') return;
    if (this.mode === 'online') this.modals.leave.classList.add('active');
    else this.setPaused(true);
  }

  setPaused(paused) {
    if (paused && this.state === 'PLAYING' && this.mode !== 'online') {
      this.state = 'PAUSED';
      clearTimeout(this.aiTimer);
      this.audio.stopMusic();
      this.modals.pause.classList.add('active');
    } else if (!paused && this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hideModals();
      this.audio.startMusic();
      this.nextTurn();
    }
  }

  showMenu() {
    clearTimeout(this.aiTimer);
    if (this.lobby) this.lobby.leave();
    this.matchLive = false;
    this.netStatus = '';
    this.state = 'MENU';
    this.audio.stopMusic();
    this.hideModals();
    this.el.showResult.hidden = true;
    this.el.clock.hidden = true;
    this.refreshMenu();
    this.modals.start.classList.add('active');
    this.updateHud();
  }

  hideModals() {
    Object.values(this.modals).forEach((m) => m.classList.remove('active'));
  }

  toggleAudio() {
    this.audio.init();
    this.audio.setMuted(!this.audio.muted);
    document.getElementById('audio-icon').textContent = this.audio.muted ? '🔇' : '🔊';
    if (!this.audio.muted && this.state === 'PLAYING') this.audio.startMusic();
  }

  playAgain() {
    if (this.mode === 'online') {
      if (this.lobby) this.lobby.requestRematch();
    } else {
      this.startLocal(this.mode);
    }
  }

  viewBoard(show) {
    this.modals.result.classList.toggle('active', !show);
    this.el.showResult.hidden = !show;
  }

  finishGame() {
    const b = this.board;
    clearTimeout(this.aiTimer);
    this.audio.stopMusic();
    this.celebrate(b.winner);

    if (this.mode === 'online') {
      // The server decides online results; the loser's device reports
      this.awaitingResult = true;
      if (b.winner === this.mySlot) {
        this.audio.win();
      } else {
        this.audio.lose();
        this.lobby.reportLoss();
      }
      this.updateStatus();
      return;
    }

    this.state = 'OVER';
    let title;
    let win = true;
    let record = '';
    if (this.mode === 'cpu') {
      win = b.winner === 0;
      title = win ? 'YOU WIN' : 'CPU WINS';
      const all = readJSON('circuit_duel_cpu', {});
      const r = all[this.level] || { w: 0, l: 0 };
      if (win) r.w++;
      else r.l++;
      all[this.level] = r;
      writeJSON('circuit_duel_cpu', all);
      record = `${LEVEL_NAMES[this.level]} record: ${r.w} W · ${r.l} L`;
    } else {
      title = `${this.names[b.winner]} WINS`;
    }
    if (win) this.audio.win();
    else this.audio.lose();
    this.updateStatus();
    setTimeout(() => {
      if (this.state === 'OVER' && this.mode !== 'online') this.showResult(title, `FIRST TO ${WIN_SCORE}`, win, record);
    }, 1100);
  }

  showResult(title, sub, win, record) {
    const titleEl = document.getElementById('result-title');
    titleEl.textContent = title;
    titleEl.classList.toggle('win', win);
    titleEl.classList.toggle('lose', !win);
    document.getElementById('result-sub').textContent = sub;
    document.getElementById('final-0').textContent = this.board.scores[0];
    document.getElementById('final-1').textContent = this.board.scores[1];
    document.getElementById('result-record').textContent = record;
    // Online, the lobby owns this button's label and whether it works
    if (this.mode !== 'online') {
      this.el.againLabel.textContent = 'PLAY AGAIN';
      this.el.again.disabled = false;
    }
    this.el.showResult.hidden = true;
    this.modals.result.classList.add('active');
  }

  refreshMenu() {
    const all = readJSON('circuit_duel_cpu', {});
    const r = all[this.level];
    document.getElementById('cpu-record').textContent = r
      ? `${LEVEL_NAMES[this.level]}: ${r.w} W · ${r.l} L`
      : `No games yet on ${LEVEL_NAMES[this.level]}`;
    const online = readJSON('circuit_duel_online', null);
    document.getElementById('online-record').textContent = online
      ? `Online record: ${online.w} W · ${online.l} L`
      : 'Play a friend with a room code';
  }

  // ---- Online --------------------------------------------------------------
  openLobby() {
    this.hideModals();
    this.state = 'LOBBY';
    if (!this.lobby) {
      this.lobby = new ArcadeLobby({
        mount: document.body,
        classes: {
          overlay: 'modal',
          box: 'card card-small',
          title: 'title',
          primaryButton: 'btn btn-primary',
          secondaryButton: 'btn btn-secondary'
        },
        rules: `SAME BOARD // FIRST TO ${WIN_SCORE} // ${TURN_SECONDS}S A MOVE`,
        rematchButton: this.el.again,
        rematchLabel: this.el.againLabel,
        onGesture: () => this.audio.init(),
        onCountdown: () => this.prepareOnline(),
        onStart: (seed) => this.startOnline(seed),
        onRelay: (data) => this.handleRelay(data),
        onStatus: (text) => {
          this.netStatus = text;
          this.updateStatus();
        },
        onResult: (won, reason) => this.onlineResult(won, reason),
        onBack: () => this.showMenu()
      });
    }
    this.lobby.open();
  }

  prepareOnline() {
    clearTimeout(this.aiTimer);
    this.mode = 'online';
    this.state = 'LOBBY';
    this.hideModals();
    this.el.showResult.hidden = true;
    this.pending = new Map();
    this.matchLive = true;
    this.awaitingResult = false;
    this.mySlot = this.lobby.room.slot;
    this.names = this.mySlot === 0 ? ['YOU', 'RIVAL'] : ['RIVAL', 'YOU'];
    this.board = new Board();
    this.dirty = true;
    this.updateHud();
  }

  startOnline(seed) {
    const rng = ArcadeRoom.seededRandom(seed);
    const first = rng() < 0.5 ? 0 : 1;
    this.board = Board.create(rng, first);
    this.beginGame();
    this.applyPending();
  }

  // Moves carry the move number, so a repeat or an early arrival can't
  // put the two boards out of step
  handleRelay(d) {
    if (!this.matchLive || !d || d.kind !== 'move') return;
    if (!Number.isInteger(d.n) || !Number.isInteger(d.line) || d.line < 0 || d.line >= LINES) return;
    this.pending.set(d.n, d.line);
    if (this.state === 'PLAYING') this.applyPending();
  }

  applyPending() {
    const b = this.board;
    while (!b.over && b.turn !== this.mySlot && this.pending.has(b.moves)) {
      const line = this.pending.get(b.moves);
      this.pending.delete(b.moves);
      if (!this.applyMove(line)) break;
    }
  }

  // Leaving mid-match ends it as a loss on the server, and no result comes
  // back to a player who has left, so count it here
  forfeit() {
    if (this.mode === 'online' && this.matchLive && this.state === 'PLAYING') {
      const rec = readJSON('circuit_duel_online', { w: 0, l: 0 });
      rec.l++;
      writeJSON('circuit_duel_online', rec);
    }
    this.showMenu();
  }

  onlineResult(won, reason) {
    this.matchLive = false;
    this.awaitingResult = false;
    this.state = 'OVER';
    this.netStatus = '';
    this.el.clock.hidden = true;
    this.modals.leave.classList.remove('active');
    this.audio.stopMusic();

    const rec = readJSON('circuit_duel_online', { w: 0, l: 0 });
    if (won) rec.w++;
    else rec.l++;
    writeJSON('circuit_duel_online', rec);

    const subs = won
      ? { lost: `YOU REACHED ${WIN_SCORE}`, forfeit: 'YOUR RIVAL LEFT', away: 'YOUR RIVAL WENT AWAY' }
      : { lost: `YOUR RIVAL REACHED ${WIN_SCORE}`, forfeit: 'YOU LEFT OR LOST CONNECTION', away: 'THE GAME WAS HIDDEN TOO LONG' };
    if (reason !== 'lost') {
      if (won) this.audio.win();
      else this.audio.lose();
    }
    this.updateStatus();
    const delay = reason === 'lost' ? 900 : 200;
    setTimeout(() => {
      if (this.state !== 'OVER' || this.mode !== 'online') return;
      this.showResult(won ? 'VICTORY' : 'DEFEAT', subs[reason] || '', won, `Online record: ${rec.w} W · ${rec.l} L`);
    }, delay);
  }

  // Runs every frame during an online match: the move clock
  updateClock(now) {
    if (this.mode !== 'online' || this.state !== 'PLAYING' || this.board.over) return;
    const left = TURN_SECONDS - (now - this.turnStartedAt) / 1000;
    const frac = Math.max(0, left / TURN_SECONDS);
    this.el.clockFill.style.width = `${frac * 100}%`;
    this.el.clock.classList.toggle('low', left < 8);

    if (this.board.turn !== this.mySlot) return;
    const whole = Math.ceil(left);
    if (left < 5.5 && whole !== this.lastTick && whole > 0) {
      this.lastTick = whole;
      this.audio.tick(whole <= 2);
    }
    if (left <= 0) {
      // Out of time: this device moves for its player so the match never stalls
      this.popups.push({ x: this.size / 2, y: this.size / 2, text: 'TIME UP', color: CORE_COLOR, t: 0 });
      this.humanMove(AI.choose(this.board, 'normal'));
    }
  }

  // ---- HUD -----------------------------------------------------------------
  updateHud() {
    const b = this.board;
    for (let p = 0; p < 2; p++) {
      this.el.names[p].textContent = this.names[p];
      this.el.scores[p].textContent = b.scores[p];
      const active = (this.state === 'PLAYING' || this.state === 'PAUSED') && !b.over && b.turn === p;
      this.el.panels[p].classList.toggle('active', active);
    }
    const labels = {
      cpu: `VS CPU · ${LEVEL_NAMES[this.level]}`,
      local: 'PASS & PLAY',
      online: this.lobby && this.lobby.room && this.lobby.room.code ? `ONLINE · ROOM ${this.lobby.room.code}` : 'ONLINE'
    };
    this.el.modeLabel.textContent = labels[this.mode];
    this.updateStatus();
  }

  updateStatus() {
    const b = this.board;
    let text = '';
    let color = '';
    if (this.mode === 'online' && this.netStatus && this.state !== 'MENU') {
      text = this.netStatus;
      color = 'yellow';
    } else if (this.state === 'MENU') {
      text = 'PICK A MODE';
    } else if (this.state === 'LOBBY') {
      text = 'WAITING FOR THE MATCH';
    } else if (b.over) {
      const mine = this.mode === 'online' ? b.winner === this.mySlot : b.winner === 0;
      if (this.mode === 'online' && this.awaitingResult) text = mine ? 'YOU WIN // CONFIRMING' : 'RIVAL WINS';
      else if (this.mode === 'local') text = `${this.names[b.winner]} WINS`;
      else text = mine ? 'YOU WIN' : this.mode === 'cpu' ? 'CPU WINS' : 'RIVAL WINS';
      color = b.winner === 0 ? 'cyan' : 'pink';
    } else if (this.state === 'OVER') {
      text = 'MATCH OVER';
    } else {
      const again = this.chain > 0 ? ' // GO AGAIN' : '';
      color = b.turn === 0 ? 'cyan' : 'pink';
      if (this.mode === 'cpu') text = b.turn === 0 ? `YOUR TURN${again}` : 'CPU IS THINKING';
      else if (this.mode === 'online') text = b.turn === this.mySlot ? `YOUR TURN${again}` : 'RIVAL\'S TURN';
      else text = `${this.names[b.turn]}${again || ' TO MOVE'}`;
    }
    const key = `${text}|${color}`;
    if (key === this.shownStatus) return;
    this.shownStatus = key;
    this.el.status.textContent = text;
    this.el.status.className = `status ${color}`;
  }

  // ---- Effects -------------------------------------------------------------
  cellCenter(cell) {
    const r = Math.floor(cell / N);
    const c = cell % N;
    return this.nodeXY(c + 0.5, r + 0.5);
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count && this.particles.length < 500; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 160;
      this.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.4 + Math.random() * 0.4, color });
    }
  }

  celebrate(winner) {
    const b = this.board;
    let delay = 0;
    for (let c = 0; c < CELLS; c++) {
      if (b.owners[c] !== winner) continue;
      const [x, y] = this.cellCenter(c);
      setTimeout(() => this.burst(x, y, COLORS[winner], 10), delay);
      delay += 40;
    }
  }

  // ---- Main loop -------------------------------------------------------------
  loop(now) {
    requestAnimationFrame((t) => this.loop(t));
    const dt = this.lastFrame ? Math.min(0.05, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const q = this.particles[i];
      q.life -= dt;
      if (q.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      q.vx *= 1 - Math.min(1, 3 * dt);
      q.vy *= 1 - Math.min(1, 3 * dt);
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const u = this.popups[i];
      u.t += dt;
      if (u.t > 1) this.popups.splice(i, 1);
    }
    for (let i = this.cellFlashes.length - 1; i >= 0; i--) {
      this.cellFlashes[i].t += dt;
      if (this.cellFlashes[i].t > 0.6) this.cellFlashes.splice(i, 1);
    }
    if (this.lineFlash) {
      this.lineFlash.t += dt;
      if (this.lineFlash.t > 0.8) this.lineFlash = null;
    }

    this.updateClock(now);
    if (!this.geo) return;
    if (this.dirty) {
      this.drawLayer();
      this.dirty = false;
    }
    this.draw(now);
  }

  // ---- Drawing -------------------------------------------------------------
  // Everything that only changes when a move is made: cells, lines, nodes
  drawLayer() {
    const c = this.layerCtx;
    const b = this.board;
    const { cell } = this.geo;
    const dpr = this.dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, this.size, this.size);

    // Claimed cells
    const inset = cell * 0.1;
    for (let i = 0; i < CELLS; i++) {
      const owner = b.owners[i];
      if (owner < 0) continue;
      const [x, y] = this.nodeXY(i % N, Math.floor(i / N));
      c.fillStyle = `rgba(${RGB[owner]}, 0.16)`;
      c.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2);
      c.strokeStyle = `rgba(${RGB[owner]}, 0.45)`;
      c.lineWidth = 1.5;
      c.strokeRect(x + inset * 1.8, y + inset * 1.8, cell - inset * 3.6, cell - inset * 3.6);
    }

    // Cores
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let i = 0; i < CELLS; i++) {
      if (b.values[i] < 2) continue;
      const [x, y] = this.cellCenter(i);
      const owner = b.owners[i];
      const color = owner >= 0 ? COLORS[owner] : CORE_COLOR;
      const r = cell * 0.2;
      c.shadowColor = color;
      c.shadowBlur = 10 * dpr;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.fillStyle = owner >= 0 ? `rgba(${RGB[owner]}, 0.3)` : 'rgba(255, 230, 0, 0.12)';
      c.beginPath();
      c.moveTo(x, y - r);
      c.lineTo(x + r, y);
      c.lineTo(x, y + r);
      c.lineTo(x - r, y);
      c.closePath();
      c.fill();
      c.stroke();
      c.shadowBlur = 0;
      c.fillStyle = '#ffffff';
      c.font = `900 ${Math.round(cell * 0.2)}px Orbitron, sans-serif`;
      c.fillText(String(b.values[i]), x, y + 1);
    }

    // Empty lines as faint guides
    c.setLineDash([cell * 0.06, cell * 0.09]);
    c.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let l = 0; l < LINES; l++) {
      if (b.lines[l] !== -1) continue;
      this.segment(c, l, cell * 0.14);
    }
    c.stroke();
    c.setLineDash([]);

    // Drawn lines, one glowing path per player
    c.lineCap = 'round';
    for (let p = 0; p < 2; p++) {
      c.beginPath();
      let any = false;
      for (let l = 0; l < LINES; l++) {
        if (b.lines[l] !== p) continue;
        this.segment(c, l, 0);
        any = true;
      }
      if (!any) continue;
      c.shadowColor = COLORS[p];
      c.shadowBlur = 12 * dpr;
      c.strokeStyle = COLORS[p];
      c.lineWidth = cell * 0.085;
      c.stroke();
      c.shadowBlur = 0;
      c.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      c.lineWidth = cell * 0.025;
      c.stroke();
    }
    c.lineCap = 'butt';

    // Nodes
    c.shadowColor = '#a824ff';
    c.shadowBlur = 8 * dpr;
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let r = 0; r <= N; r++) {
      for (let col = 0; col <= N; col++) {
        const [x, y] = this.nodeXY(col, r);
        c.moveTo(x + cell * 0.07, y);
        c.arc(x, y, cell * 0.07, 0, Math.PI * 2);
      }
    }
    c.fill();
    c.shadowBlur = 0;
  }

  // Adds a line to the current path, pulled in from the nodes by `trim`
  segment(c, line, trim) {
    const [c1, r1, c2, r2] = LINE_ENDS[line];
    const [x1, y1] = this.nodeXY(c1, r1);
    const [x2, y2] = this.nodeXY(c2, r2);
    const ux = Math.sign(x2 - x1);
    const uy = Math.sign(y2 - y1);
    c.moveTo(x1 + ux * trim, y1 + uy * trim);
    c.lineTo(x2 - ux * trim, y2 - uy * trim);
  }

  draw(now) {
    const ctx = this.ctx;
    const { cell } = this.geo;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.layer, 0, 0);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Freshly claimed cells flash white
    for (const f of this.cellFlashes) {
      const k = 1 - f.t / 0.6;
      const [x, y] = this.nodeXY(f.cell % N, Math.floor(f.cell / N));
      ctx.globalAlpha = k * 0.7;
      ctx.fillStyle = '#ffffff';
      const grow = cell * 0.1 * k;
      ctx.fillRect(x + grow, y + grow, cell - grow * 2, cell - grow * 2);
    }

    // The newest line glows white, then settles into its color
    if (this.lineFlash) {
      ctx.globalAlpha = Math.max(0, 1 - this.lineFlash.t / 0.8);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = cell * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      this.segment(ctx, this.lineFlash.line, 0);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
    ctx.globalAlpha = 1;

    // The line under the mouse, finger or keyboard cursor
    const preview = this.canInput()
      ? this.keyboardUsed && this.cursor >= 0 ? this.cursor : this.selected >= 0 ? this.selected : this.hover
      : -1;
    if (preview >= 0 && this.board.lines[preview] === -1) this.drawPreview(preview, now);

    // Sparks
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const q of this.particles) {
      ctx.globalAlpha = Math.min(1, q.life * 2);
      ctx.strokeStyle = q.color;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x - q.vx * 0.04, q.y - q.vy * 0.04);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'butt';

    // Points popping up from claimed cells
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(cell * 0.32)}px Orbitron, sans-serif`;
    for (const u of this.popups) {
      ctx.globalAlpha = Math.max(0, 1 - u.t);
      ctx.fillStyle = u.color;
      ctx.fillText(u.text, u.x, u.y - u.t * cell * 0.5);
    }
    ctx.globalAlpha = 1;
  }

  drawPreview(line, now) {
    const ctx = this.ctx;
    const { cell } = this.geo;
    const b = this.board;
    const color = RGB[b.turn];
    const picked = line === this.selected || (this.keyboardUsed && line === this.cursor);
    const pulse = picked ? 0.65 + Math.sin(now / 130) * 0.3 : 0.5;

    // Warn when the line would leave a cell for the opponent to close
    for (const c of LINE_CELLS[line]) {
      if (b.sides[c] !== 2) continue;
      const [x, y] = this.nodeXY(c % N, Math.floor(c / N));
      ctx.fillStyle = 'rgba(255, 60, 60, 0.12)';
      ctx.fillRect(x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.84);
      ctx.strokeStyle = 'rgba(255, 90, 90, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x + cell * 0.08, y + cell * 0.08, cell * 0.84, cell * 0.84);
      ctx.setLineDash([]);
    }

    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${color}, ${pulse})`;
    ctx.lineWidth = cell * (picked ? 0.1 : 0.07);
    ctx.beginPath();
    this.segment(ctx, line, cell * 0.08);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.circuitDuel = new CircuitDuel();
});
