/**
 * VECTOR SIEGE // Neon Arena Shooter
 * Pure vanilla HTML5 Canvas + Web Audio API
 *
 * The arena is a fixed square world. The camera follows the ship and zooms so
 * that every screen shape, upright phone or wide monitor, sees about the same
 * amount of arena. Waves come from a seeded plan, so a daily seed gives every
 * player the same waves.
 */

'use strict';

// ============================================================================
// 0. TUNING
// ============================================================================
const ARENA = 1500;            // World is ARENA x ARENA units
const STEP = 1 / 120;          // Fixed simulation step
const VIEW_SPAN = 760;         // Visible area is about VIEW_SPAN^2 world units
const GRID = 60;               // Background grid spacing
const CELL = 96;               // Collision grid cell size
const COLS = Math.ceil(ARENA / CELL);

const PLAYER_R = 13;
const PLAYER_SPEED = 340;
const BULLET_SPEED = 950;
const BULLET_R = 4;
const FIRE_INTERVAL = 0.105;
const RAPID_INTERVAL = 0.06;
const POWER_TIME = 12;

const START_LIVES = 3;
const START_BOMBS = 3;
const MAX_LIVES = 5;
const MAX_BOMBS = 5;
const EXTRA_LIFE_EVERY = 75000;
const EXTRA_BOMB_EVERY = 30000;

const SHARDS_PER_MULT = 20;
const MAX_MULT = 10;
const MAGNET_R = 170;
const SAFE_SPAWN_R = 280;

const PLATE_R = 66;            // Warden shield ring radius
const PLATE_ARC = 0.9;         // Width of each shield plate in radians

const STICK_R = 52;            // Touch stick throw in CSS pixels
const MAX_PARTICLES = 700;
const MAX_ENEMY_BULLETS = 400;

const TAU = Math.PI * 2;

const COLORS = {
  cyan: '#00f3ff',
  pink: '#ff007f',
  yellow: '#ffe600',
  green: '#05ffa1',
  purple: '#a824ff',
  orange: '#ff8a00',
  white: '#ffffff'
};

// cost: how much of a wave's budget one enemy uses. unlock: first wave it appears.
const ENEMY_TYPES = {
  drone:    { r: 13, hp: 1, score: 100, shards: 1, color: COLORS.cyan, cost: 1, unlock: 1 },
  weaver:   { r: 13, hp: 1, score: 150, shards: 1, color: COLORS.green, cost: 2, unlock: 2 },
  dart:     { r: 12, hp: 1, score: 200, shards: 2, color: COLORS.pink, cost: 2, unlock: 3 },
  splitter: { r: 17, hp: 3, score: 250, shards: 2, color: COLORS.yellow, cost: 3, unlock: 4 },
  fragment: { r: 8, hp: 1, score: 50, shards: 1, color: COLORS.yellow, cost: 0, unlock: Infinity },
  pulsar:   { r: 16, hp: 4, score: 300, shards: 3, color: COLORS.purple, cost: 3, unlock: 6 },
  warden:   { r: 40, hp: 140, score: 5000, shards: 30, color: COLORS.pink, cost: 0, unlock: Infinity }
};

const NEW_ENEMY_NOTES = {
  2: 'NEW: WEAVERS',
  3: 'NEW: DARTS. THEY CHARGE',
  4: 'NEW: SPLITTERS',
  6: 'NEW: PULSARS. KILL THEM BEFORE THEY BURST'
};

const POWERUPS = {
  spread: { label: 'SPREAD SHOT', letter: 'S', color: COLORS.green },
  rapid: { label: 'RAPID FIRE', letter: 'R', color: COLORS.yellow },
  shield: { label: 'SHIELD', letter: '◇', color: COLORS.purple }
};

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const AIM_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ============================================================================
// 1. HELPERS
// ============================================================================
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function angleDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function steer(e, tvx, tvy, rate, dt) {
  const k = Math.min(1, rate * dt);
  e.vx += (tvx - e.vx) * k;
  e.vy += (tvy - e.vy) * k;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function todayKey() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

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

// ============================================================================
// 2. WAVE PLANNING
// A wave is a list of groups, each spawning at a time offset. The plan depends
// only on the seed and the wave number, never on how the player is doing.
// ============================================================================
function planWave(seed, n) {
  const rng = mulberry32(hashString(`${seed}:${n}`));

  if (n % 5 === 0) {
    return { boss: true, groups: [{ at: 0.4, type: 'warden', count: 1, formation: 'boss', seed: 1 }] };
  }

  const groups = [];
  let budget = 6 + n * 4;
  let at = 0.8;
  const gap = Math.max(0.6, 2.2 - n * 0.06);

  while (budget > 0) {
    const options = Object.keys(ENEMY_TYPES).filter((k) => {
      const def = ENEMY_TYPES[k];
      return def.cost > 0 && def.unlock <= n && def.cost <= budget;
    });
    if (!options.length) break;

    // The newest enemy gets extra weight in the wave that introduces it
    const weights = options.map((k) => (ENEMY_TYPES[k].unlock === n ? 3 : 1));
    let pick = rng() * weights.reduce((a, b) => a + b, 0);
    let type = options[0];
    for (let i = 0; i < options.length; i++) {
      pick -= weights[i];
      if (pick <= 0) {
        type = options[i];
        break;
      }
    }

    const def = ENEMY_TYPES[type];
    const maxCount = type === 'pulsar' ? 3 : type === 'splitter' ? 4 : 8;
    const want = 2 + Math.floor(rng() * (maxCount - 1));
    const count = Math.max(1, Math.min(want, maxCount, Math.floor(budget / def.cost)));
    budget -= count * def.cost;

    const formations = ['edge', 'edge', 'corner', 'ring', 'scatter'];
    groups.push({
      at,
      type,
      count,
      formation: formations[Math.floor(rng() * formations.length)],
      edge: Math.floor(rng() * 4),
      corner: Math.floor(rng() * 4),
      u: rng(),
      seed: Math.floor(rng() * 4294967296)
    });
    at += gap + rng() * 1.4;
  }

  return { boss: false, groups };
}

function formationPoints(g, player) {
  const rng = mulberry32(g.seed);
  const pts = [];
  const inset = 70;

  switch (g.formation) {
    case 'edge': {
      const spacing = 64;
      const along = clamp(g.u * ARENA, 200, ARENA - 200);
      const start = along - ((g.count - 1) * spacing) / 2;
      for (let i = 0; i < g.count; i++) {
        const a = start + i * spacing;
        const spots = [[a, inset], [ARENA - inset, a], [a, ARENA - inset], [inset, a]];
        pts.push({ x: spots[g.edge][0], y: spots[g.edge][1] });
      }
      break;
    }
    case 'corner': {
      const cx = g.corner & 1 ? ARENA - 150 : 150;
      const cy = g.corner & 2 ? ARENA - 150 : 150;
      for (let i = 0; i < g.count; i++) {
        const a = rng() * TAU;
        const d = 20 + rng() * 90;
        pts.push({ x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d });
      }
      break;
    }
    case 'ring': {
      const offset = rng() * TAU;
      for (let i = 0; i < g.count; i++) {
        const a = offset + (i * TAU) / g.count;
        pts.push({ x: player.x + Math.cos(a) * 430, y: player.y + Math.sin(a) * 430 });
      }
      break;
    }
    case 'boss': {
      let dx = ARENA / 2 - player.x;
      let dy = ARENA / 2 - player.y;
      const d = Math.hypot(dx, dy);
      if (d < 1) {
        dx = 0;
        dy = -1;
      } else {
        dx /= d;
        dy /= d;
      }
      pts.push({ x: ARENA / 2 + dx * 350, y: ARENA / 2 + dy * 350 });
      break;
    }
    default:
      for (let i = 0; i < g.count; i++) {
        pts.push({ x: 100 + rng() * (ARENA - 200), y: 100 + rng() * (ARENA - 200) });
      }
  }
  return pts;
}

// ============================================================================
// 3. PROCEDURAL WEB AUDIO
// ============================================================================
class SiegeAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.playing = false;
    this.step = 0;
    this.bpm = 120;
    this.timer = null;
    this.nextTime = 0;
    this.intense = false;
    this.last = {};
    // A minor feel: one bass root per bar
    this.bass = [55.0, 55.0, 65.41, 49.0];
    this.lead = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      // Two seconds of white noise, shared by every noisy sound
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
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

  // Stops rapid repeats of the same sound from stacking up
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
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, vol, filterType, freq, t = this.ctx.currentTime, freqEnd = 0) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(freq, t);
    if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  // ---- Music ----
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

  setTempo(wave, boss) {
    this.bpm = Math.min(150, 118 + wave * 2);
    this.intense = boss;
  }

  schedule() {
    if (!this.playing || !this.ctx) return;
    const sixteenth = 60 / this.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.beat(this.step, this.nextTime);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
    this.timer = setTimeout(() => this.schedule(), 25);
  }

  beat(s, t) {
    const b = s % 16;
    const bar = Math.floor(s / 16) % 4;
    if (b % 4 === 0) this.tone('sine', 150, 40, 0.14, 0.42, t);
    if (b === 4 || b === 12) this.noise(0.12, 0.1, 'bandpass', 1800, t);
    if (b % 2 === 1) this.noise(0.03, 0.03, 'highpass', 7000, t);
    if (b % 2 === 0) {
      const root = this.bass[bar] * (b % 8 === 6 ? 2 : 1);
      this.bassNote(root, t, 0.11);
    }
    if (this.intense && b % 2 === 0) {
      this.tone('square', this.lead[(b / 2 + bar) % 8], this.lead[(b / 2 + bar) % 8], 0.08, 0.03, t);
    }
  }

  bassNote(freq, t, dur) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, t);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.intense ? 1000 : 600, t);
    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // ---- Sound effects ----
  shoot() {
    if (this.ready('shoot', 0.075)) this.tone('square', 1500, 500, 0.05, 0.016);
  }

  hit() {
    if (this.ready('hit', 0.05)) this.tone('triangle', 700, 300, 0.05, 0.05);
  }

  plate() {
    if (this.ready('plate', 0.06)) this.tone('square', 2400, 1800, 0.03, 0.022);
  }

  explode(big) {
    if (!this.ready(big ? 'boom' : 'pop', big ? 0.1 : 0.035)) return;
    this.noise(big ? 0.7 : 0.22, big ? 0.35 : 0.13, 'lowpass', big ? 1800 : 2400, undefined, big ? 120 : 300);
    this.tone('sine', big ? 120 : 180, 40, big ? 0.5 : 0.15, big ? 0.3 : 0.09);
  }

  shard(mult) {
    if (this.ready('shard', 0.035)) this.tone('sine', 900 + mult * 90, 1300 + mult * 90, 0.05, 0.03);
  }

  multUp(mult) {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    const f = 520 + mult * 40;
    this.tone('square', f, f, 0.09, 0.045, t);
    this.tone('square', f * 1.5, f * 1.5, 0.12, 0.045, t + 0.07);
  }

  power() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('triangle', f, f, 0.1, 0.08, t + i * 0.06));
  }

  extra() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone('square', f, f, 0.1, 0.04, t + i * 0.07));
  }

  bomb() {
    if (!this.on) return;
    this.noise(1.2, 0.5, 'lowpass', 4000, undefined, 80);
    this.tone('sawtooth', 300, 30, 0.9, 0.2);
  }

  death() {
    if (!this.on) return;
    this.noise(1.0, 0.4, 'lowpass', 3000, undefined, 100);
    this.tone('sawtooth', 600, 40, 1.0, 0.16);
  }

  respawn() {
    if (this.on) this.tone('sine', 300, 900, 0.3, 0.08);
  }

  shieldBreak() {
    if (this.on) this.tone('triangle', 1200, 200, 0.25, 0.1);
  }

  waveStart() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    [220, 277.18, 329.63].forEach((f) => this.tone('triangle', f, f, 0.4, 0.05, t));
    this.tone('triangle', 440, 440, 0.3, 0.04, t + 0.12);
  }

  alarm() {
    if (!this.on) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      this.tone('square', 880, 880, 0.18, 0.05, t + i * 0.4);
      this.tone('square', 660, 660, 0.18, 0.05, t + i * 0.4 + 0.2);
    }
  }

  pulsar() {
    if (!this.ready('pulsar', 0.08)) return;
    this.noise(0.4, 0.2, 'bandpass', 900);
    this.tone('sine', 400, 60, 0.35, 0.14);
  }

  enemyFire() {
    if (this.ready('efire', 0.1)) this.tone('sawtooth', 320, 150, 0.08, 0.025);
  }
}

// ============================================================================
// 4. SPRITES
// Glows are drawn once into small canvases, then stamped every frame.
// shadowBlur is too slow to run on hundreds of objects on a phone.
// ============================================================================
const SHAPES = {
  ship(c, r) {
    c.moveTo(r * 1.35, 0);
    c.lineTo(-r * 0.75, r * 0.95);
    c.lineTo(-r * 0.25, 0);
    c.lineTo(-r * 0.75, -r * 0.95);
    c.closePath();
  },
  drone(c, r) {
    c.moveTo(0, -r);
    c.lineTo(r * 0.8, 0);
    c.lineTo(0, r);
    c.lineTo(-r * 0.8, 0);
    c.closePath();
    c.moveTo(0, -r * 0.4);
    c.lineTo(r * 0.32, 0);
    c.lineTo(0, r * 0.4);
    c.lineTo(-r * 0.32, 0);
    c.closePath();
  },
  weaver(c, r) {
    c.moveTo(-r, -r * 0.8);
    c.lineTo(r, r * 0.8);
    c.lineTo(r, -r * 0.8);
    c.lineTo(-r, r * 0.8);
    c.closePath();
  },
  dart(c, r) {
    c.moveTo(r * 1.2, 0);
    c.lineTo(-r * 0.8, r * 0.75);
    c.lineTo(-r * 0.35, 0);
    c.lineTo(-r * 0.8, -r * 0.75);
    c.closePath();
  },
  splitter(c, r) {
    const s = r * 0.78;
    c.rect(-s, -s, s * 2, s * 2);
    const q = r * 0.55;
    c.moveTo(0, -q);
    c.lineTo(q, 0);
    c.lineTo(0, q);
    c.lineTo(-q, 0);
    c.closePath();
  },
  fragment(c, r) {
    const s = r * 0.8;
    c.rect(-s, -s, s * 2, s * 2);
  },
  pulsar(c, r) {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath();
    c.moveTo(r * 0.38, 0);
    c.arc(0, 0, r * 0.38, 0, TAU);
  },
  shard(c, r) {
    c.moveTo(0, -r);
    c.lineTo(r * 0.7, 0);
    c.lineTo(0, r);
    c.lineTo(-r * 0.7, 0);
    c.closePath();
  }
};

function makeCanvas(half, px) {
  const size = Math.max(2, Math.ceil(half * 2 * px));
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const c = cv.getContext('2d');
  c.scale(size / (half * 2), size / (half * 2));
  c.translate(half, half);
  return { cv, c };
}

function shapeSprite(shape, r, color, px, white = false) {
  const half = r * 1.4 + 10;
  const { cv, c } = makeCanvas(half, px);
  c.lineJoin = 'round';
  c.beginPath();
  SHAPES[shape](c, r);
  const main = white ? COLORS.white : color;
  c.fillStyle = white ? 'rgba(255,255,255,0.55)' : `${color}22`;
  c.fill('evenodd');
  c.shadowColor = color;
  c.shadowBlur = 9 * px;
  c.strokeStyle = main;
  c.lineWidth = 2.4;
  c.stroke();
  c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 0.9;
  c.stroke();
  return { cv, half };
}

function boltSprite(color, px) {
  const half = 14;
  const { cv, c } = makeCanvas(half, px);
  c.lineCap = 'round';
  c.shadowColor = color;
  c.shadowBlur = 8 * px;
  c.strokeStyle = color;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(-7, 0);
  c.lineTo(7, 0);
  c.stroke();
  c.shadowBlur = 0;
  c.strokeStyle = '#ffffff';
  c.lineWidth = 1.6;
  c.stroke();
  return { cv, half };
}

function orbSprite(r, color, px) {
  const half = r + 9;
  const { cv, c } = makeCanvas(half, px);
  c.shadowColor = color;
  c.shadowBlur = 9 * px;
  c.fillStyle = color;
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fill();
  c.shadowBlur = 0;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(0, 0, r * 0.45, 0, TAU);
  c.fill();
  return { cv, half };
}

// ============================================================================
// 5. GAME
// ============================================================================
class VectorSiege {
  constructor() {
    this.canvas = document.getElementById('arena');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.audio = new SiegeAudio();
    this.hudEl = document.querySelector('.hud');
    this.ui = {
      score: document.getElementById('hud-score'),
      mult: document.getElementById('hud-mult'),
      multFill: document.getElementById('hud-mult-fill'),
      wave: document.getElementById('hud-wave'),
      lives: document.getElementById('hud-lives'),
      high: document.getElementById('hud-high'),
      bombs: document.getElementById('hud-bombs'),
      bombBtn: document.getElementById('btn-bomb')
    };
    this.modals = {
      start: document.getElementById('start-modal'),
      pause: document.getElementById('pause-modal'),
      over: document.getElementById('gameover-modal')
    };

    this.state = 'START';
    this.mode = 'endless';
    this.touchUsed = window.matchMedia('(pointer: coarse)').matches;
    this.keys = new Set();
    this.sticks = new Map();
    this.mouse = { x: 0, y: 0, seen: false };
    this.aimSource = 'auto';
    this.pad = null;
    this.padPrev = { bomb: false, start: false };
    this.overAt = 0;

    this.view = { left: 0, top: 0, w: 0, h: 0 };
    this.cam = { x: ARENA / 2, y: ARENA / 2 };
    this.shake = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
    this.lastTime = 0;
    this.acc = 0;
    this.attract = 0;
    this.shown = {};

    this.cells = Array.from({ length: COLS * COLS }, () => []);
    this.highScore = this.readBest('endless');

    this.resetWorld();
    this.bindEvents();
    this.resize();
    this.refreshStartScreen();
    this.updateHud();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- Setup ---------------------------------------------------------------
  resetWorld() {
    this.player = {
      x: ARENA / 2,
      y: ARENA / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      alive: true,
      invuln: 0,
      respawn: 0,
      shield: false,
      spread: 0,
      rapid: 0,
      fireCd: 0
    };
    this.bullets = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.markers = [];
    this.shards = [];
    this.powerups = [];
    this.particles = [];
    this.ripples = [];
    this.popups = [];
    this.message = null;
    this.boss = null;

    this.score = 0;
    this.lives = START_LIVES;
    this.bombs = START_BOMBS;
    this.shardCount = 0;
    this.mult = 1;
    this.bestMult = 1;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.nextLife = EXTRA_LIFE_EVERY;
    this.nextBomb = EXTRA_BOMB_EVERY;

    this.waveNum = 0;
    this.wave = null;
    this.intermission = 0;
    this.overTimer = 0;
    this.time = 0;
    this.cam.x = ARENA / 2;
    this.cam.y = ARENA / 2;
  }

  bindEvents() {
    const click = (id, fn) => {
      document.getElementById(id).addEventListener('click', (e) => {
        e.currentTarget.blur();
        fn();
      });
    };
    click('btn-start', () => this.startGame('endless'));
    click('btn-daily', () => this.startGame('daily'));
    click('btn-again', () => this.startGame(this.mode));
    click('btn-restart', () => this.startGame(this.mode));
    click('btn-menu', () => this.showStart());
    click('btn-resume', () => this.setPaused(false));
    click('btn-pause', () => this.setPaused(this.state === 'PLAYING'));
    click('btn-audio', () => this.toggleAudio());

    // Bomb fires on touch-down so it never waits for a click. A keyboard
    // press on the focused button still arrives as a click with no pointer.
    const bombBtn = this.ui.bombBtn;
    bombBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.init();
      this.bomb();
    });
    bombBtn.addEventListener('click', (e) => {
      if (e.detail === 0) this.bomb();
    });

    window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', (e) => this.sticks.delete(e.pointerId));
    window.addEventListener('pointercancel', (e) => this.sticks.delete(e.pointerId));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('resize', () => this.resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize());

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.setPaused(true);
    });
    window.addEventListener('blur', () => this.releaseInput());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = clamp(Math.sqrt(w * h) / VIEW_SPAN, 0.42, 1.7);
    this.hudBottom = this.hudEl.getBoundingClientRect().bottom;
    if (w === this.cssW && h === this.cssH && dpr === this.dpr) return;

    this.cssW = w;
    this.cssH = h;
    this.dpr = dpr;
    this.scale = scale;
    this.px = scale * dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.view.w = w / scale;
    this.view.h = h / scale;
    this.buildSprites();
    this.updateView();
  }

  buildSprites() {
    const px = this.px;
    this.sprites = { white: {} };
    for (const [type, def] of Object.entries(ENEMY_TYPES)) {
      if (!SHAPES[type]) continue;
      this.sprites[type] = shapeSprite(type, def.r, def.color, px);
      this.sprites.white[type] = shapeSprite(type, def.r, def.color, px, true);
    }
    this.sprites.ship = shapeSprite('ship', PLAYER_R, COLORS.cyan, px);
    this.sprites.shard = shapeSprite('shard', 4.5, COLORS.green, px);
    this.sprites.bolt = boltSprite(COLORS.cyan, px);
    this.sprites.orb = orbSprite(5.5, COLORS.pink, px);
    this.sprites.orbBoss = orbSprite(6.5, COLORS.orange, px);
  }

  // ---- Input ---------------------------------------------------------------
  onPointerDown(e) {
    if (e.target.closest('button, a, .modal, .hud')) return;
    this.audio.init();
    if (e.pointerType === 'mouse') {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.seen = true;
      this.aimSource = 'mouse';
      if (e.button === 2) this.bomb();
      return;
    }
    e.preventDefault();
    this.touchUsed = true;
    if (this.state !== 'PLAYING') return;
    // Left half moves, right half aims. A second thumb that lands on the
    // same half as the first takes whichever stick is still free.
    const taken = new Set([...this.sticks.values()].map((s) => s.role));
    let role = e.clientX < window.innerWidth / 2 ? 'move' : 'aim';
    if (taken.has(role)) role = role === 'move' ? 'aim' : 'move';
    if (taken.has(role)) return;
    this.sticks.set(e.pointerId, { role, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY });
    if (role === 'aim') this.aimSource = 'touch';
  }

  onPointerMove(e) {
    if (e.pointerType === 'mouse') {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.seen = true;
      if (!this.arrowAim()) this.aimSource = 'mouse';
      return;
    }
    const s = this.sticks.get(e.pointerId);
    if (!s) return;
    s.x = e.clientX;
    s.y = e.clientY;
    // The base trails a thumb that slides past the rim, so turning back is instant
    const dx = s.x - s.ox;
    const dy = s.y - s.oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK_R) {
      s.ox = s.x - (dx / d) * STICK_R;
      s.oy = s.y - (dy / d) * STICK_R;
    }
  }

  onKey(e, down) {
    const code = e.code;
    const onControl = e.target && e.target.closest && e.target.closest('button, a');
    if (down && !e.repeat) {
      if (code === 'KeyP' || code === 'Escape') {
        if (this.state === 'PLAYING' || this.state === 'PAUSED') this.setPaused(this.state === 'PLAYING');
        return;
      }
      if (code === 'KeyM') {
        this.toggleAudio();
        return;
      }
      // Let a focused button handle its own Enter or Space
      if ((code === 'Enter' || code === 'Space') && onControl) return;
      if (code === 'Enter' || code === 'KeyR') {
        if (this.state === 'START' && code === 'Enter') this.startGame('endless');
        else if (this.state === 'OVER') this.startGame(this.mode);
        return;
      }
      if (code === 'Space' || code === 'KeyB') {
        e.preventDefault();
        this.audio.init();
        this.bomb();
        return;
      }
    }
    if (MOVE_KEYS.has(code) || AIM_KEYS.has(code)) {
      e.preventDefault();
      if (down) {
        this.keys.add(code);
        this.audio.init();
        if (AIM_KEYS.has(code)) this.aimSource = 'keys';
      } else {
        this.keys.delete(code);
      }
    } else if (code === 'Space') {
      e.preventDefault();
    }
  }

  arrowAim() {
    const k = this.keys;
    const x = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0);
    const y = (k.has('ArrowDown') ? 1 : 0) - (k.has('ArrowUp') ? 1 : 0);
    return x || y ? { x, y } : null;
  }

  pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let gp = null;
    for (const p of pads) {
      if (p && p.connected) {
        gp = p;
        break;
      }
    }
    if (!gp) {
      this.pad = null;
      return;
    }
    const dz = (v) => (Math.abs(v || 0) < 0.22 ? 0 : v);
    this.pad = { mx: dz(gp.axes[0]), my: dz(gp.axes[1]), ax: dz(gp.axes[2]), ay: dz(gp.axes[3]) };
    const pressed = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
    const bombBtn = pressed(0) || pressed(5) || pressed(7);
    const startBtn = pressed(9);

    if (bombBtn && !this.padPrev.bomb) {
      this.audio.init();
      if (this.state === 'PLAYING') this.bomb();
      else if (this.state === 'START') this.startGame('endless');
      else if (this.state === 'PAUSED') this.setPaused(false);
      else if (this.state === 'OVER' && performance.now() - this.overAt > 900) this.startGame(this.mode);
    }
    if (startBtn && !this.padPrev.start) {
      if (this.state === 'PLAYING' || this.state === 'PAUSED') this.setPaused(this.state === 'PLAYING');
      else if (this.state === 'START') this.startGame('endless');
    }
    this.padPrev = { bomb: bombBtn, start: startBtn };
    if (Math.hypot(this.pad.ax, this.pad.ay) > 0.3) this.aimSource = 'pad';
  }

  releaseInput() {
    this.keys.clear();
    this.sticks.clear();
  }

  readMove() {
    const k = this.keys;
    let x = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
    let y = (k.has('KeyS') ? 1 : 0) - (k.has('KeyW') ? 1 : 0);
    if (this.pad) {
      x += this.pad.mx;
      y += this.pad.my;
    }
    for (const s of this.sticks.values()) {
      if (s.role !== 'move') continue;
      const tx = (s.x - s.ox) / STICK_R;
      const ty = (s.y - s.oy) / STICK_R;
      if (Math.hypot(tx, ty) > 0.12) {
        x += tx;
        y += ty;
      }
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  // Returns an aim angle, or null to keep the current one. The second value
  // says whether the player is steering the aim by hand.
  readAim() {
    const p = this.player;
    if (this.pad && Math.hypot(this.pad.ax, this.pad.ay) > 0.3) {
      return { angle: Math.atan2(this.pad.ay, this.pad.ax), manual: true };
    }
    for (const s of this.sticks.values()) {
      if (s.role !== 'aim') continue;
      const dx = s.x - s.ox;
      const dy = s.y - s.oy;
      if (dx * dx + dy * dy > 100) return { angle: Math.atan2(dy, dx), manual: true };
    }
    const arrows = this.arrowAim();
    if (arrows) return { angle: Math.atan2(arrows.y, arrows.x), manual: true };
    if (this.aimSource === 'mouse' && this.mouse.seen) {
      const wx = this.view.left + this.mouse.x / this.scale;
      const wy = this.view.top + this.mouse.y / this.scale;
      return { angle: Math.atan2(wy - p.y, wx - p.x), manual: false };
    }
    const target = this.nearestTarget();
    if (target) {
      // Lead the target so auto-aim hits things that move
      const d = Math.hypot(target.x - p.x, target.y - p.y);
      const t = d / BULLET_SPEED;
      return { angle: Math.atan2(target.y + target.vy * t - p.y, target.x + target.vx * t - p.x), manual: false };
    }
    return { angle: null, manual: false };
  }

  nearestTarget() {
    const p = this.player;
    let best = null;
    let bestD = 900 * 900;
    for (const e of this.enemies) {
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  // ---- Game flow -----------------------------------------------------------
  startGame(mode) {
    this.mode = mode;
    this.audio.init();
    this.seed = mode === 'daily' ? `daily-${todayKey()}` : `run-${Math.floor(Math.random() * 1e9)}`;
    this.resetWorld();
    this.releaseInput();
    this.highScore = this.readBest(mode);
    this.state = 'PLAYING';
    this.lastTime = 0;
    this.acc = 0;
    document.body.classList.add('playing');
    this.hideModals();
    this.startWave(1);
    this.audio.startMusic();
    this.updateHud();
  }

  showStart() {
    this.state = 'START';
    this.resetWorld();
    document.body.classList.remove('playing');
    this.hideModals();
    this.refreshStartScreen();
    this.modals.start.classList.add('active');
    this.highScore = this.readBest('endless');
    this.updateHud();
  }

  setPaused(paused) {
    if (paused && this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.releaseInput();
      this.audio.stopMusic();
      this.modals.pause.classList.add('active');
    } else if (!paused && this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = 0;
      this.hideModals();
      this.audio.startMusic();
    }
  }

  toggleAudio() {
    this.audio.init();
    this.audio.setMuted(!this.audio.muted);
    document.getElementById('audio-icon').textContent = this.audio.muted ? '🔇' : '🔊';
    if (!this.audio.muted && this.state === 'PLAYING') this.audio.startMusic();
  }

  hideModals() {
    Object.values(this.modals).forEach((m) => m.classList.remove('active'));
  }

  startWave(n) {
    this.waveNum = n;
    const plan = planWave(this.seed, n);
    this.wave = { plan, time: 0, next: 0 };
    if (plan.boss) {
      this.showMessage('WARDEN INCOMING', 'SHOOT THROUGH THE GAPS IN ITS SHIELD', COLORS.pink);
      this.audio.alarm();
    } else {
      this.showMessage(`WAVE ${n}`, NEW_ENEMY_NOTES[n] || '', COLORS.cyan);
      this.audio.waveStart();
    }
    this.audio.setTempo(n, plan.boss);
  }

  updateWave(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.startWave(this.waveNum + 1);
      return;
    }
    // Nothing new arrives while the ship is respawning
    if (!this.wave || !this.player.alive) return;
    const w = this.wave;
    w.time += dt;
    const groups = w.plan.groups;
    while (w.next < groups.length && groups[w.next].at <= w.time) {
      this.spawnGroup(groups[w.next]);
      w.next++;
    }
    if (w.next >= groups.length && !this.markers.length && !this.enemies.length) this.clearWave();
  }

  clearWave() {
    const bonus = 250 * this.waveNum;
    this.addScore(bonus);
    this.showMessage(`WAVE ${this.waveNum} CLEAR`, `+${bonus.toLocaleString()} BONUS`, COLORS.green);
    this.intermission = 2.6;
  }

  spawnGroup(g) {
    for (const pt of formationPoints(g, this.player)) {
      const spot = this.safeSpot(pt.x, pt.y);
      const warn = g.type === 'warden' ? 2 : 0.8;
      this.markers.push({ x: spot.x, y: spot.y, type: g.type, t: warn, max: warn });
    }
  }

  // Keeps spawns off the ship so nothing appears on top of the player
  safeSpot(x, y) {
    const p = this.player;
    const m = 50;
    x = clamp(x, m, ARENA - m);
    y = clamp(y, m, ARENA - m);
    let dx = x - p.x;
    let dy = y - p.y;
    let d = Math.hypot(dx, dy);
    if (d < SAFE_SPAWN_R) {
      if (d < 1) {
        dx = 1;
        dy = 0;
        d = 1;
      }
      x = clamp(p.x + (dx / d) * SAFE_SPAWN_R, m, ARENA - m);
      y = clamp(p.y + (dy / d) * SAFE_SPAWN_R, m, ARENA - m);
      // Pinned against a wall: try the other side of the ship
      if (Math.hypot(x - p.x, y - p.y) < SAFE_SPAWN_R * 0.8) {
        x = clamp(p.x - (dx / d) * SAFE_SPAWN_R, m, ARENA - m);
        y = clamp(p.y - (dy / d) * SAFE_SPAWN_R, m, ARENA - m);
      }
    }
    return { x, y };
  }

  speedMul() {
    return 1 + Math.min(0.5, (this.waveNum - 1) * 0.025);
  }

  spawnEnemy(type, x, y, angle) {
    const def = ENEMY_TYPES[type];
    const e = {
      type,
      def,
      x,
      y,
      vx: 0,
      vy: 0,
      r: def.r,
      hp: def.hp,
      angle: Math.random() * TAU,
      flash: 0,
      t: 0,
      phase: Math.random() * TAU,
      dead: false
    };
    switch (type) {
      case 'dart':
        e.mode = 'aim';
        e.timer = 0.5 + Math.random() * 0.3;
        break;
      case 'pulsar':
        e.fuse = 6.5;
        e.tx = clamp(x + (Math.random() - 0.5) * 500, 80, ARENA - 80);
        e.ty = clamp(y + (Math.random() - 0.5) * 500, 80, ARENA - 80);
        break;
      case 'fragment': {
        const a = angle === undefined ? Math.random() * TAU : angle;
        e.vx = Math.cos(a) * 280;
        e.vy = Math.sin(a) * 280;
        e.homeDelay = 0.35;
        break;
      }
      case 'warden': {
        const tier = Math.max(1, Math.floor(this.waveNum / 5));
        e.hp = def.hp + (tier - 1) * 70;
        e.maxHp = e.hp;
        e.plateRot = 0;
        e.ringTimer = 2.2;
        e.spiral = 0;
        e.spiralOn = false;
        e.spiralTimer = 3;
        e.spiralAngle = 0;
        e.summonTimer = 7;
        e.orbit = Math.atan2(y - ARENA / 2, x - ARENA / 2);
        this.boss = e;
        this.addShake(10);
        this.ripple(x, y, 50, 1.2);
        break;
      }
      default:
        break;
    }
    this.enemies.push(e);
    this.burst(x, y, def.color, 10, 140);
    return e;
  }

  // ---- Simulation ------------------------------------------------------------
  update(dt) {
    this.time += dt;
    this.updatePlayer(dt);
    this.updateMarkers(dt);
    this.updateEnemies(dt);
    this.updateEnemyBullets(dt);
    this.buildGrid();
    this.separateEnemies();
    this.updateBullets(dt);
    this.checkPlayerHits();
    this.updateShards(dt);
    this.updatePowerups(dt);
    if (this.enemies.some((e) => e.dead)) this.enemies = this.enemies.filter((e) => !e.dead);
    this.updateWave(dt);
    this.updateCamera(dt);

    if (this.overTimer > 0) {
      this.overTimer -= dt;
      if (this.overTimer <= 0) this.endGame();
    }
  }

  updatePlayer(dt) {
    const p = this.player;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.spread > 0) p.spread -= dt;
    if (p.rapid > 0) p.rapid -= dt;

    if (!p.alive) {
      if (this.lives > 0) {
        p.respawn -= dt;
        if (p.respawn <= 0) {
          p.alive = true;
          p.invuln = 2.2;
          p.vx = 0;
          p.vy = 0;
          this.ripple(p.x, p.y, 30, 0.8);
          this.audio.respawn();
        }
      }
      return;
    }

    const move = this.readMove();
    steer(p, move.x * PLAYER_SPEED, move.y * PLAYER_SPEED, 12, dt);
    p.x = clamp(p.x + p.vx * dt, PLAYER_R, ARENA - PLAYER_R);
    p.y = clamp(p.y + p.vy * dt, PLAYER_R, ARENA - PLAYER_R);

    const aim = this.readAim();
    if (aim.angle !== null) p.angle = aim.angle;

    // Firing is automatic while there is something to shoot at
    p.fireCd -= dt;
    if (p.fireCd <= 0 && (this.enemies.length || aim.manual)) {
      this.fire();
      p.fireCd = p.rapid > 0 ? RAPID_INTERVAL : FIRE_INTERVAL;
    }

    // Engine trail behind the direction of travel
    if (Math.random() < 0.5 && Math.abs(p.vx) + Math.abs(p.vy) > 60) {
      const back = Math.atan2(p.vy, p.vx) + Math.PI;
      const a = back + (Math.random() - 0.5) * 0.6;
      this.addParticle(p.x + Math.cos(back) * 10, p.y + Math.sin(back) * 10, Math.cos(a) * 160, Math.sin(a) * 160, 0.25, COLORS.cyan);
    }
  }

  fire() {
    const p = this.player;
    const spreads = p.spread > 0 ? [-0.14, 0, 0.14] : [0];
    for (const s of spreads) {
      if (this.bullets.length >= 240) break;
      const a = p.angle + s;
      const c = Math.cos(a);
      const sn = Math.sin(a);
      this.bullets.push({ x: p.x + c * 18, y: p.y + sn * 18, vx: c * BULLET_SPEED, vy: sn * BULLET_SPEED, a });
      this.shotsFired++;
    }
    this.audio.shoot();
  }

  updateMarkers(dt) {
    for (let i = this.markers.length - 1; i >= 0; i--) {
      const mk = this.markers[i];
      mk.t -= dt;
      if (mk.t <= 0) {
        this.markers.splice(i, 1);
        this.spawnEnemy(mk.type, mk.x, mk.y);
      }
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    const mul = this.speedMul();
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.t += dt;
      if (e.flash > 0) e.flash -= dt;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;

      switch (e.type) {
        case 'drone': {
          const sp = 115 * mul;
          steer(e, ux * sp, uy * sp, 3, dt);
          e.angle += 2 * dt;
          break;
        }
        case 'weaver': {
          const sp = 135 * mul;
          e.phase += dt * 4.5;
          const w = Math.sin(e.phase) * 1.2;
          steer(e, (ux - uy * w) * sp, (uy + ux * w) * sp, 5, dt);
          e.angle = Math.atan2(e.vy, e.vx);
          break;
        }
        case 'dart':
          this.updateDart(e, ux, uy, mul, dt);
          break;
        case 'splitter': {
          const sp = 72 * mul;
          steer(e, ux * sp, uy * sp, 2, dt);
          e.angle += 1.3 * dt;
          break;
        }
        case 'fragment': {
          if (e.homeDelay > 0) {
            e.homeDelay -= dt;
            e.vx *= 1 - 2 * dt;
            e.vy *= 1 - 2 * dt;
          } else {
            const sp = 185 * mul;
            steer(e, ux * sp, uy * sp, 2.5, dt);
          }
          e.angle += 5 * dt;
          break;
        }
        case 'pulsar': {
          const tx = e.tx - e.x;
          const ty = e.ty - e.y;
          const td = Math.hypot(tx, ty) || 1;
          const sp = td > 10 ? 55 : 0;
          steer(e, (tx / td) * sp, (ty / td) * sp, 1.5, dt);
          e.fuse -= dt;
          e.angle += (1 + Math.max(0, 6.5 - e.fuse) * 0.9) * dt;
          if (e.fuse <= 0) this.pulsarBurst(e);
          break;
        }
        case 'warden':
          this.updateWarden(e, dt);
          break;
        default:
          break;
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;
      const bounce = e.type === 'dart' ? 1 : 0.3;
      if (e.x < e.r) {
        e.x = e.r;
        if (e.vx < 0) e.vx = -e.vx * bounce;
      } else if (e.x > ARENA - e.r) {
        e.x = ARENA - e.r;
        if (e.vx > 0) e.vx = -e.vx * bounce;
      }
      if (e.y < e.r) {
        e.y = e.r;
        if (e.vy < 0) e.vy = -e.vy * bounce;
      } else if (e.y > ARENA - e.r) {
        e.y = ARENA - e.r;
        if (e.vy > 0) e.vy = -e.vy * bounce;
      }
    }
  }

  updateDart(e, ux, uy, mul, dt) {
    e.timer -= dt;
    if (e.mode === 'aim') {
      const k = Math.min(1, 5 * dt);
      e.vx *= 1 - k;
      e.vy *= 1 - k;
      e.angle += angleDiff(Math.atan2(uy, ux), e.angle) * Math.min(1, 8 * dt);
      if (e.timer <= 0) {
        e.mode = 'charge';
        e.timer = 0.9;
        const sp = 430 * mul;
        e.vx = Math.cos(e.angle) * sp;
        e.vy = Math.sin(e.angle) * sp;
      }
    } else {
      e.angle = Math.atan2(e.vy, e.vx);
      if (e.timer <= 0) {
        e.mode = 'aim';
        e.timer = 0.6;
      }
    }
  }

  updateWarden(e, dt) {
    const enraged = e.hp < e.maxHp * 0.5;
    e.orbit += dt * 0.22;
    const tx = ARENA / 2 + Math.cos(e.orbit) * 260;
    const ty = ARENA / 2 + Math.sin(e.orbit) * 260;
    steer(e, (tx - e.x) * 0.8, (ty - e.y) * 0.8, 1.5, dt);
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > 90) {
      e.vx *= 90 / sp;
      e.vy *= 90 / sp;
    }
    e.plateRot += dt * (enraged ? 1.7 : 1.05);
    e.angle -= dt * 0.4;

    e.ringTimer -= dt;
    if (e.ringTimer <= 0) {
      e.ringTimer = enraged ? 2.0 : 2.6;
      const n = enraged ? 18 : 14;
      for (let i = 0; i < n; i++) this.fireEnemyBullet(e.x, e.y, e.plateRot + (i * TAU) / n, 165, true);
      this.audio.enemyFire();
    }

    if (enraged) {
      e.spiralTimer -= dt;
      if (e.spiralTimer <= 0) {
        e.spiralOn = !e.spiralOn;
        e.spiralTimer = e.spiralOn ? 2.4 : 1.8;
      }
      if (e.spiralOn) {
        e.spiral -= dt;
        if (e.spiral <= 0) {
          e.spiral = 0.1;
          e.spiralAngle += 0.37;
          this.fireEnemyBullet(e.x, e.y, e.spiralAngle, 200, true);
          this.fireEnemyBullet(e.x, e.y, e.spiralAngle + Math.PI, 200, true);
          this.audio.enemyFire();
        }
      }
    }

    e.summonTimer -= dt;
    if (e.summonTimer <= 0) {
      e.summonTimer = enraged ? 5.5 : 8;
      const n = enraged ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const spot = this.safeSpot(e.x + Math.cos(a) * 110, e.y + Math.sin(a) * 110);
        this.markers.push({ x: spot.x, y: spot.y, type: 'drone', t: 0.8, max: 0.8 });
      }
    }
  }

  fireEnemyBullet(x, y, a, speed, boss = false) {
    if (this.enemyBullets.length >= MAX_ENEMY_BULLETS) return;
    this.enemyBullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: boss ? 6.5 : 5.5, boss, life: 9 });
  }

  pulsarBurst(e) {
    e.dead = true;
    const n = this.waveNum >= 11 ? 16 : 12;
    const offset = Math.random() * TAU;
    for (let i = 0; i < n; i++) this.fireEnemyBullet(e.x, e.y, offset + (i * TAU) / n, 150);
    this.explode(e.x, e.y, COLORS.purple, 26, 260);
    this.ripple(e.x, e.y, 26, 0.7);
    this.audio.pulsar();
  }

  updateEnemyBullets(dt) {
    const list = this.enemyBullets;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.y < -20 || b.x > ARENA + 20 || b.y > ARENA + 20) list.splice(i, 1);
    }
  }

  // Enemies go into a coarse grid so bullets only test nearby ones.
  // The Warden is too big for the grid and is tested on its own.
  buildGrid() {
    for (const cell of this.cells) cell.length = 0;
    for (const e of this.enemies) {
      if (e.dead || e.type === 'warden') continue;
      this.cells[this.cellIndex(e.x, e.y)].push(e);
    }
  }

  cellIndex(x, y) {
    const cx = clamp(Math.floor(x / CELL), 0, COLS - 1);
    const cy = clamp(Math.floor(y / CELL), 0, COLS - 1);
    return cy * COLS + cx;
  }

  forNearby(x, y, fn) {
    const cx = clamp(Math.floor(x / CELL), 0, COLS - 1);
    const cy = clamp(Math.floor(y / CELL), 0, COLS - 1);
    for (let gy = Math.max(0, cy - 1); gy <= Math.min(COLS - 1, cy + 1); gy++) {
      for (let gx = Math.max(0, cx - 1); gx <= Math.min(COLS - 1, cx + 1); gx++) {
        const cell = this.cells[gy * COLS + gx];
        for (let i = 0; i < cell.length; i++) {
          if (fn(cell[i]) === true) return true;
        }
      }
    }
    return false;
  }

  // Light push apart so packs spread out instead of stacking into one sprite
  separateEnemies() {
    for (const cell of this.cells) {
      for (let i = 0; i < cell.length; i++) {
        const a = cell[i];
        for (let j = i + 1; j < cell.length; j++) {
          const b = cell[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < min * min) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.25;
            const nx = dx / d;
            const ny = dy / d;
            a.x -= nx * push;
            a.y -= ny * push;
            b.x += nx * push;
            b.y += ny * push;
          }
        }
      }
    }
  }

  onPlate(w, angle) {
    for (let i = 0; i < 3; i++) {
      if (Math.abs(angleDiff(angle, w.plateRot + (i * TAU) / 3)) < PLATE_ARC / 2) return true;
    }
    return false;
  }

  updateBullets(dt) {
    const list = this.bullets;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x < -20 || b.y < -20 || b.x > ARENA + 20 || b.y > ARENA + 20) {
        list.splice(i, 1);
        continue;
      }

      const w = this.boss;
      if (w && !w.dead) {
        const dx = b.x - w.x;
        const dy = b.y - w.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (PLATE_R + 10) ** 2) {
          const d = Math.sqrt(d2);
          if (Math.abs(d - PLATE_R) < 9 && this.onPlate(w, Math.atan2(dy, dx))) {
            this.burst(b.x, b.y, COLORS.yellow, 3, 160);
            this.audio.plate();
            list.splice(i, 1);
            continue;
          }
          if (d < w.r + BULLET_R) {
            this.damageEnemy(w);
            list.splice(i, 1);
            continue;
          }
        }
      }

      let target = null;
      this.forNearby(b.x, b.y, (e) => {
        if (e.dead) return false;
        const rr = e.r + BULLET_R;
        if ((e.x - b.x) ** 2 + (e.y - b.y) ** 2 < rr * rr) {
          target = e;
          return true;
        }
        return false;
      });
      if (target) {
        this.damageEnemy(target);
        list.splice(i, 1);
      }
    }
  }

  damageEnemy(e) {
    this.shotsHit++;
    e.hp -= 1;
    e.flash = 0.06;
    if (e.hp <= 0) {
      this.killEnemy(e, 'shot');
    } else {
      this.burst(e.x, e.y, e.def.color, 3, 120);
      this.audio.hit();
    }
  }

  // how: 'shot' scores and drops shards, 'bomb' scores only, 'clear' does neither
  killEnemy(e, how) {
    if (e.dead) return;
    e.dead = true;
    const def = e.def;
    const big = e.type === 'warden';

    if (how !== 'clear') {
      this.kills++;
      this.addScore(def.score * this.mult);
    }
    if (how === 'shot') {
      for (let i = 0; i < def.shards; i++) this.dropShard(e.x, e.y);
      if (big || (Math.random() < 0.035 && this.powerups.length < 2)) this.dropPowerup(e.x, e.y);
    }
    if (e.type === 'splitter' && how === 'shot') {
      const base = Math.random() * TAU;
      for (let i = 0; i < 3; i++) this.spawnEnemy('fragment', e.x, e.y, base + (i * TAU) / 3);
    }

    if (big) {
      this.boss = null;
      this.enemyBullets.length = 0;
      this.explode(e.x, e.y, COLORS.pink, 90, 520);
      this.explode(e.x, e.y, COLORS.yellow, 60, 380);
      this.ripple(e.x, e.y, 90, 1.6);
      this.addShake(24);
      this.flash = 0.4;
      this.showMessage('WARDEN DOWN', `+${(def.score * this.mult).toLocaleString()}`, COLORS.yellow);
      this.audio.explode(true);
    } else {
      this.explode(e.x, e.y, def.color, e.type === 'fragment' ? 10 : 22, 280);
      this.ripple(e.x, e.y, 14, 0.6);
      this.audio.explode(false);
    }
  }

  checkPlayerHits() {
    const p = this.player;
    if (!p.alive || p.invuln > 0) return;

    let hitBy = null;
    this.forNearby(p.x, p.y, (e) => {
      if (e.dead) return false;
      const rr = e.r + PLAYER_R * 0.8;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < rr * rr) {
        hitBy = e;
        return true;
      }
      return false;
    });

    const w = this.boss;
    if (!hitBy && w && !w.dead) {
      const dx = p.x - w.x;
      const dy = p.y - w.y;
      const d = Math.hypot(dx, dy);
      if (d < w.r + PLAYER_R || (Math.abs(d - PLATE_R) < PLAYER_R + 4 && this.onPlate(w, Math.atan2(dy, dx)))) hitBy = w;
    }

    if (hitBy) {
      this.hitPlayer(hitBy);
      return;
    }

    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      const rr = b.r + PLAYER_R * 0.55;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < rr * rr) {
        this.enemyBullets.splice(i, 1);
        this.hitPlayer(null);
        return;
      }
    }
  }

  hitPlayer(source) {
    const p = this.player;
    if (p.shield) {
      p.shield = false;
      p.invuln = 1.0;
      if (source && source.type !== 'warden') this.killEnemy(source, 'clear');
      this.enemyBullets = this.enemyBullets.filter((b) => (b.x - p.x) ** 2 + (b.y - p.y) ** 2 > 160 * 160);
      this.explode(p.x, p.y, COLORS.purple, 30, 300);
      this.ripple(p.x, p.y, 40, 0.8);
      this.addShake(8);
      this.audio.shieldBreak();
      this.popup(p.x, p.y - 30, 'SHIELD LOST', COLORS.purple);
      return;
    }
    this.die();
  }

  die() {
    const p = this.player;
    p.alive = false;
    p.spread = 0;
    p.rapid = 0;
    this.lives -= 1;
    this.explode(p.x, p.y, COLORS.cyan, 70, 420);
    this.explode(p.x, p.y, COLORS.white, 30, 260);
    this.ripple(p.x, p.y, 70, 1.3);
    this.addShake(18);
    this.flash = 0.25;
    this.audio.death();

    // Clear the area so the respawn is not an instant second death
    this.enemyBullets.length = 0;
    const near = (o) => (o.x - p.x) ** 2 + (o.y - p.y) ** 2 < 360 * 360;
    for (const e of this.enemies) {
      if (e.type !== 'warden' && near(e)) this.killEnemy(e, 'clear');
    }
    this.markers = this.markers.filter((mk) => mk.type === 'warden' || !near(mk));
    this.shardCount = Math.floor(this.shardCount / 2);
    this.updateMult(false);

    if (this.lives <= 0) {
      this.overTimer = 1.8;
      this.showMessage('SIEGE OVER', '', COLORS.pink);
      this.audio.stopMusic();
    } else {
      p.respawn = 1.4;
    }
  }

  bomb() {
    const p = this.player;
    if (this.state !== 'PLAYING' || this.bombs <= 0 || !p.alive) return;
    this.bombs--;
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.type === 'warden') {
        e.hp -= 25;
        e.flash = 0.2;
        if (e.hp <= 0) this.killEnemy(e, 'bomb');
      } else {
        this.killEnemy(e, 'bomb');
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.enemyBullets.length = 0;
    p.invuln = Math.max(p.invuln, 0.8);
    this.ripple(p.x, p.y, 110, 1.4, COLORS.yellow);
    this.addShake(16);
    this.flash = 0.35;
    this.audio.bomb();
    this.updateHud();
  }

  addScore(n) {
    this.score += n;
    while (this.score >= this.nextLife) {
      this.nextLife += EXTRA_LIFE_EVERY;
      if (this.lives < MAX_LIVES) {
        this.lives++;
        this.popup(this.player.x, this.player.y - 40, 'EXTRA LIFE', COLORS.green);
        this.audio.extra();
      }
    }
    while (this.score >= this.nextBomb) {
      this.nextBomb += EXTRA_BOMB_EVERY;
      if (this.bombs < MAX_BOMBS) {
        this.bombs++;
        this.popup(this.player.x, this.player.y - 56, '+1 BOMB', COLORS.yellow);
      }
    }
  }

  dropShard(x, y) {
    if (this.shards.length >= 300) this.shards.shift();
    const a = Math.random() * TAU;
    const sp = 60 + Math.random() * 120;
    this.shards.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 7, spin: Math.random() * TAU });
  }

  updateShards(dt) {
    const p = this.player;
    const list = this.shards;
    const friction = 1 - Math.min(1, 2.2 * dt);
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i];
      s.life -= dt;
      if (s.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      if (p.alive) {
        const dx = p.x - s.x;
        const dy = p.y - s.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < (PLAYER_R + 10) ** 2) {
          list.splice(i, 1);
          this.collectShard();
          continue;
        }
        if (d2 < MAGNET_R * MAGNET_R) {
          const d = Math.sqrt(d2) || 1;
          const pull = 1600 * (1 - d / MAGNET_R) + 400;
          s.vx += (dx / d) * pull * dt;
          s.vy += (dy / d) * pull * dt;
        }
      }
      s.vx *= friction;
      s.vy *= friction;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.spin += dt * 4;
    }
  }

  collectShard() {
    this.shardCount++;
    this.addScore(10 * this.mult);
    this.updateMult(true);
    this.audio.shard(this.mult);
  }

  updateMult(announce) {
    const next = Math.min(MAX_MULT, 1 + Math.floor(this.shardCount / SHARDS_PER_MULT));
    if (next > this.mult && announce) {
      this.popup(this.player.x, this.player.y - 30, `x${next}`, COLORS.pink);
      this.audio.multUp(next);
    }
    this.mult = next;
    this.bestMult = Math.max(this.bestMult, next);
  }

  dropPowerup(x, y) {
    const types = Object.keys(POWERUPS).filter((t) => !(t === 'shield' && this.player.shield));
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({ x, y, type, life: 10, spin: 0 });
  }

  updatePowerups(dt) {
    const p = this.player;
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const u = this.powerups[i];
      u.life -= dt;
      u.spin += dt * 1.5;
      if (u.life <= 0) {
        this.powerups.splice(i, 1);
        continue;
      }
      if (p.alive && (u.x - p.x) ** 2 + (u.y - p.y) ** 2 < (PLAYER_R + 18) ** 2) {
        this.powerups.splice(i, 1);
        if (u.type === 'shield') p.shield = true;
        else p[u.type] = POWER_TIME;
        const info = POWERUPS[u.type];
        this.popup(p.x, p.y - 34, info.label, info.color);
        this.burst(u.x, u.y, info.color, 16, 220);
        this.audio.power();
      }
    }
  }

  updateCamera(dt) {
    const k = Math.min(1, dt * 6);
    this.cam.x += (this.player.x - this.cam.x) * k;
    this.cam.y += (this.player.y - this.cam.y) * k;
    this.updateView();
  }

  updateView() {
    const v = this.view;
    const margin = 60;
    v.left = v.w >= ARENA + margin * 2 ? (ARENA - v.w) / 2 : clamp(this.cam.x - v.w / 2, -margin, ARENA + margin - v.w);
    v.top = v.h >= ARENA + margin * 2 ? (ARENA - v.h) / 2 : clamp(this.cam.y - v.h / 2, -margin, ARENA + margin - v.h);
  }

  endGame() {
    this.state = 'OVER';
    this.overAt = performance.now();
    this.releaseInput();
    this.audio.stopMusic();
    document.body.classList.remove('playing');

    const isDaily = this.mode === 'daily';
    const previous = this.readBest(this.mode);
    const isBest = this.score > previous;
    const list = document.getElementById('records');
    list.innerHTML = '';

    if (isDaily) {
      if (isBest) writeJSON('vector_siege_daily', { date: todayKey(), score: this.score });
      document.getElementById('daily-note').textContent =
        `Today's best: ${Math.max(previous, this.score).toLocaleString()}. New waves tomorrow.`;
    } else {
      document.getElementById('daily-note').textContent = '';
      const records = readJSON('vector_siege_records', []);
      records.push({ score: this.score, wave: this.waveNum, date: new Date().toLocaleDateString() });
      records.sort((a, b) => b.score - a.score);
      const top = records.slice(0, 5);
      writeJSON('vector_siege_records', top);
      if (isBest) {
        try {
          localStorage.setItem('vector_siege_highscore', String(this.score));
        } catch (e) {}
      }
      top.forEach((r) => {
        const li = document.createElement('li');
        const label = document.createElement('span');
        const score = document.createElement('strong');
        label.textContent = `Wave ${r.wave} · ${r.date}`;
        score.textContent = r.score.toLocaleString();
        li.append(label, score);
        list.append(li);
      });
    }
    this.highScore = Math.max(previous, this.score);

    const acc = this.shotsFired ? Math.round((this.shotsHit / this.shotsFired) * 100) : 0;
    document.getElementById('final-mode').textContent = isDaily ? `DAILY SIEGE · ${todayKey()}` : 'ENDLESS';
    document.getElementById('final-score').textContent = this.score.toLocaleString();
    document.getElementById('new-best').classList.toggle('show', isBest && this.score > 0);
    document.getElementById('final-wave').textContent = this.waveNum;
    document.getElementById('final-kills').textContent = this.kills.toLocaleString();
    document.getElementById('final-mult').textContent = `x${this.bestMult}`;
    document.getElementById('final-acc').textContent = `${acc}%`;
    this.modals.over.classList.add('active');
    this.updateHud();
  }

  readBest(mode) {
    if (mode === 'daily') {
      const d = readJSON('vector_siege_daily', null);
      return d && d.date === todayKey() ? d.score || 0 : 0;
    }
    try {
      return parseInt(localStorage.getItem('vector_siege_highscore') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  refreshStartScreen() {
    const best = this.readBest('daily');
    document.getElementById('daily-best').textContent = best
      ? `Same waves all day · today's best ${best.toLocaleString()}`
      : 'Same waves all day for everyone';
  }

  // ---- Effects ---------------------------------------------------------------
  addParticle(x, y, vx, vy, life, color) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, life, max: life, color });
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.3 + Math.random() * 0.7);
      this.addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.25 + Math.random() * 0.25, color);
    }
  }

  explode(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.2 + Math.random() * 0.8);
      this.addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.5, color);
    }
  }

  // Ripples bend the background grid and, if colored, draw an expanding ring
  ripple(x, y, amp, dur, ringColor = null) {
    if (this.ripples.length >= 10) this.ripples.shift();
    this.ripples.push({ x, y, amp: reducedMotion ? amp * 0.3 : amp, dur, t: 0, ringColor });
  }

  addShake(amount) {
    if (!reducedMotion) this.shake = Math.max(this.shake, amount);
  }

  popup(x, y, text, color) {
    if (this.popups.length > 8) this.popups.shift();
    this.popups.push({ x, y, text, color, life: 1.1 });
  }

  showMessage(text, sub, color) {
    this.message = { text, sub, color, t: 2.2, max: 2.2 };
  }

  updateFx(dt) {
    const parts = this.particles;
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life -= dt;
      if (q.life <= 0) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      const f = 1 - Math.min(1, 3 * dt);
      q.vx *= f;
      q.vy *= f;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
    }
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.t += dt;
      if (r.t >= r.dur) this.ripples.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const u = this.popups[i];
      u.life -= dt;
      u.y -= 40 * dt;
      if (u.life <= 0) this.popups.splice(i, 1);
    }
    if (this.message) {
      this.message.t -= dt;
      if (this.message.t <= 0) this.message = null;
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 40);
      const s = this.shake * this.dpr;
      this.shakeX = (Math.random() - 0.5) * s;
      this.shakeY = (Math.random() - 0.5) * s;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  // A slow drift and the odd ripple behind the menus
  updateAttract(dt) {
    this.attract += dt;
    this.cam.x = ARENA / 2 + Math.cos(this.attract * 0.12) * 300;
    this.cam.y = ARENA / 2 + Math.sin(this.attract * 0.09) * 300;
    this.updateView();
    if (Math.random() < dt * 0.7) {
      const x = this.view.left + Math.random() * this.view.w;
      const y = this.view.top + Math.random() * this.view.h;
      this.ripple(x, y, 30, 1.4);
      const colors = [COLORS.cyan, COLORS.pink, COLORS.purple, COLORS.green];
      this.burst(x, y, colors[Math.floor(Math.random() * colors.length)], 14, 200);
    }
  }

  // ---- HUD -----------------------------------------------------------------
  setText(key, el, value) {
    if (this.shown[key] === value) return;
    this.shown[key] = value;
    el.textContent = value;
  }

  updateHud() {
    const ui = this.ui;
    this.setText('score', ui.score, this.score.toLocaleString());
    this.setText('mult', ui.mult, `x${this.mult}`);
    this.setText('wave', ui.wave, String(Math.max(1, this.waveNum)));
    this.setText('lives', ui.lives, this.lives > 0 ? '▲'.repeat(this.lives) : '—');
    this.setText('high', ui.high, Math.max(this.highScore, this.score).toLocaleString());
    this.setText('bombs', ui.bombs, String(this.bombs));
    const fill = this.mult >= MAX_MULT ? 100 : Math.round(((this.shardCount % SHARDS_PER_MULT) / SHARDS_PER_MULT) * 100);
    if (this.shown.fill !== fill) {
      this.shown.fill = fill;
      ui.multFill.style.width = `${fill}%`;
    }
    const empty = this.bombs <= 0;
    if (this.shown.empty !== empty) {
      this.shown.empty = empty;
      ui.bombBtn.classList.toggle('empty', empty);
    }
  }

  // ---- Main loop -------------------------------------------------------------
  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.max(0, Math.min(0.05, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;

    this.pollPad();
    if (this.state === 'PLAYING') {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.update(STEP);
        this.acc -= STEP;
        if (this.state !== 'PLAYING') break;
      }
      this.updateFx(dt);
      this.updateHud();
    } else if (this.state === 'START') {
      this.updateAttract(dt);
      this.updateFx(dt);
    } else if (this.state === 'OVER') {
      this.updateFx(dt);
    }
    this.draw();
  }

  // ---- Drawing -------------------------------------------------------------
  worldTransform() {
    const px = this.px;
    this.ctx.setTransform(px, 0, 0, px, -this.view.left * px + this.shakeX, -this.view.top * px + this.shakeY);
  }

  screenTransform() {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  onScreen(x, y, pad) {
    const v = this.view;
    return x > v.left - pad && x < v.left + v.w + pad && y > v.top - pad && y < v.top + v.h + pad;
  }

  drawSprite(sp, x, y, angle, alpha = 1, scale = 1) {
    const ctx = this.ctx;
    const k = this.px * scale;
    const sx = (x - this.view.left) * this.px + this.shakeX;
    const sy = (y - this.view.top) * this.px + this.shakeY;
    if (angle) {
      const c = Math.cos(angle) * k;
      const s = Math.sin(angle) * k;
      ctx.setTransform(c, s, -s, c, sx, sy);
    } else {
      ctx.setTransform(k, 0, 0, k, sx, sy);
    }
    ctx.globalAlpha = alpha;
    ctx.drawImage(sp.cv, -sp.half, -sp.half, sp.half * 2, sp.half * 2);
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#05020c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.worldTransform();
    this.drawGrid();
    this.drawArenaEdge();
    this.drawMarkers();

    ctx.globalCompositeOperation = 'lighter';
    this.drawShards();
    this.drawEnemies();
    this.drawEnemyBullets();
    this.drawBullets();
    ctx.globalAlpha = 1;
    this.worldTransform();
    this.drawParticles();
    this.drawRings();
    ctx.globalCompositeOperation = 'source-over';

    this.drawPowerups();
    this.drawWarden();
    this.drawPlayer();

    this.screenTransform();
    ctx.globalAlpha = 1;
    this.drawPopups();
    this.drawIndicators();
    this.drawBossBar();
    this.drawSticks();
    this.drawHint();
    this.drawMessage();
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.5, this.flash);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, this.cssW, this.cssH);
      ctx.globalAlpha = 1;
    }
  }

  displace(x, y, out) {
    let ox = 0;
    let oy = 0;
    for (const r of this.ripples) {
      const radius = r.t * 520;
      const dx = x - r.x;
      const dy = y - r.y;
      const d = Math.hypot(dx, dy);
      const k = 1 - Math.abs(d - radius) / 90;
      if (k > 0 && d > 1) {
        const f = r.amp * k * (1 - r.t / r.dur);
        ox += (dx / d) * f;
        oy += (dy / d) * f;
      }
    }
    out.x = x + ox;
    out.y = y + oy;
  }

  drawGrid() {
    const ctx = this.ctx;
    const v = this.view;
    const x0 = Math.max(0, Math.floor(v.left / GRID) * GRID);
    const x1 = Math.min(ARENA, v.left + v.w + GRID);
    const y0 = Math.max(0, Math.floor(v.top / GRID) * GRID);
    const y1 = Math.min(ARENA, v.top + v.h + GRID);
    ctx.strokeStyle = 'rgba(130, 70, 255, 0.17)';
    ctx.lineWidth = 1 / this.scale;
    ctx.beginPath();
    if (!this.ripples.length) {
      for (let x = x0; x <= x1; x += GRID) {
        ctx.moveTo(x, y0);
        ctx.lineTo(x, y1);
      }
      for (let y = y0; y <= y1; y += GRID) {
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
      }
    } else {
      const pt = { x: 0, y: 0 };
      const step = GRID / 2;
      for (let x = x0; x <= x1; x += GRID) {
        for (let y = y0; y <= y1 + 0.1; y += step) {
          this.displace(x, Math.min(y, y1), pt);
          if (y === y0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
      for (let y = y0; y <= y1; y += GRID) {
        for (let x = x0; x <= x1 + 0.1; x += step) {
          this.displace(Math.min(x, x1), y, pt);
          if (x === x0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
      }
    }
    ctx.stroke();
  }

  drawArenaEdge() {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.lineWidth = 12;
    ctx.strokeRect(0, 0, ARENA, ARENA);
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(0, 0, ARENA, ARENA);
  }

  drawMarkers() {
    const ctx = this.ctx;
    for (const mk of this.markers) {
      if (!this.onScreen(mk.x, mk.y, 80)) continue;
      const def = ENEMY_TYPES[mk.type];
      const k = mk.t / mk.max;
      const r = def.r * (1 + k * 2.2);
      ctx.globalAlpha = 0.35 + 0.5 * (Math.sin(mk.t * 30) > 0 ? 1 : 0.4);
      ctx.strokeStyle = def.color;
      ctx.lineWidth = mk.type === 'warden' ? 3 : 1.6;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, r, 0, TAU);
      ctx.moveTo(mk.x - 5, mk.y - 5);
      ctx.lineTo(mk.x + 5, mk.y + 5);
      ctx.moveTo(mk.x + 5, mk.y - 5);
      ctx.lineTo(mk.x - 5, mk.y + 5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawShards() {
    const sp = this.sprites.shard;
    for (const s of this.shards) {
      if (!this.onScreen(s.x, s.y, 20)) continue;
      const alpha = s.life < 1.5 ? (Math.sin(s.life * 20) > 0 ? 0.9 : 0.3) : 0.9;
      this.drawSprite(sp, s.x, s.y, s.spin, alpha);
    }
  }

  drawEnemies() {
    for (const e of this.enemies) {
      if (e.type === 'warden' || !this.onScreen(e.x, e.y, 40)) continue;
      const sp = e.flash > 0 ? this.sprites.white[e.type] : this.sprites[e.type];
      let scale = 1;
      if (e.type === 'pulsar' && e.fuse < 2.5) scale = 1 + Math.abs(Math.sin(e.t * (12 + (2.5 - e.fuse) * 8))) * 0.25;
      this.drawSprite(sp, e.x, e.y, e.angle, 1, scale);
    }
    // Pulsar fuses as a ring that empties
    this.worldTransform();
    const ctx = this.ctx;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    for (const e of this.enemies) {
      if (e.type !== 'pulsar' || !this.onScreen(e.x, e.y, 40)) continue;
      ctx.strokeStyle = e.fuse < 2 ? COLORS.pink : COLORS.purple;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, e.fuse / 6.5));
      ctx.stroke();
    }
  }

  drawEnemyBullets() {
    for (const b of this.enemyBullets) {
      if (!this.onScreen(b.x, b.y, 20)) continue;
      this.drawSprite(b.boss ? this.sprites.orbBoss : this.sprites.orb, b.x, b.y, 0, 1);
    }
  }

  drawBullets() {
    const sp = this.sprites.bolt;
    for (const b of this.bullets) {
      if (!this.onScreen(b.x, b.y, 20)) continue;
      this.drawSprite(sp, b.x, b.y, b.a, 1);
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    const byColor = new Map();
    for (const q of this.particles) {
      if (!this.onScreen(q.x, q.y, 30)) continue;
      let list = byColor.get(q.color);
      if (!list) {
        list = [];
        byColor.set(q.color, list);
      }
      list.push(q);
    }
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.9;
    for (const [color, list] of byColor) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      for (const q of list) {
        // Tails shrink as a spark dies, which reads as a fade without per-spark alpha
        const tail = 0.035 * (q.life / q.max);
        ctx.moveTo(q.x, q.y);
        ctx.lineTo(q.x - q.vx * tail - 0.5, q.y - q.vy * tail);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
  }

  drawRings() {
    const ctx = this.ctx;
    for (const r of this.ripples) {
      if (!r.ringColor) continue;
      const k = r.t / r.dur;
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.strokeStyle = r.ringColor;
      ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.t * 900, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawPowerups() {
    const ctx = this.ctx;
    this.worldTransform();
    ctx.font = '700 13px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const u of this.powerups) {
      if (!this.onScreen(u.x, u.y, 40)) continue;
      const info = POWERUPS[u.type];
      ctx.globalAlpha = u.life < 2.5 && Math.sin(u.life * 18) < 0 ? 0.35 : 1;
      ctx.strokeStyle = info.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = u.spin + (i * TAU) / 6;
        const px = u.x + Math.cos(a) * 15;
        const py = u.y + Math.sin(a) * 15;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = `${info.color}26`;
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = info.color;
      ctx.fillText(info.letter, u.x, u.y + 1);
    }
    ctx.globalAlpha = 1;
  }

  drawWarden() {
    const w = this.boss;
    if (!w || w.dead) return;
    const ctx = this.ctx;
    this.worldTransform();
    const hot = w.flash > 0;

    // Shield plates
    ctx.lineCap = 'round';
    ctx.shadowColor = COLORS.yellow;
    ctx.shadowBlur = 10 * this.dpr;
    ctx.strokeStyle = COLORS.yellow;
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const c = w.plateRot + (i * TAU) / 3;
      ctx.moveTo(w.x + Math.cos(c - PLATE_ARC / 2) * PLATE_R, w.y + Math.sin(c - PLATE_ARC / 2) * PLATE_R);
      ctx.arc(w.x, w.y, PLATE_R, c - PLATE_ARC / 2, c + PLATE_ARC / 2);
    }
    ctx.stroke();

    // Octagon body
    ctx.shadowColor = COLORS.pink;
    ctx.strokeStyle = hot ? '#ffffff' : COLORS.pink;
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(255, 0, 127, 0.12)';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = w.angle + (i * TAU) / 8;
      const x = w.x + Math.cos(a) * w.r;
      const y = w.y + Math.sin(a) * w.r;
      if (i) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Pulsing core
    const pulse = 0.7 + Math.sin(w.t * 6) * 0.3;
    ctx.shadowBlur = 16 * this.dpr;
    ctx.fillStyle = hot ? '#ffffff' : `rgba(255, 120, 200, ${pulse})`;
    ctx.beginPath();
    ctx.arc(w.x, w.y, 14 + pulse * 4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  drawPlayer() {
    const p = this.player;
    if (!p.alive || this.state === 'START') return;
    const blink = p.invuln > 0 && Math.sin(this.time * 30) < 0;
    this.drawSprite(this.sprites.ship, p.x, p.y, p.angle, blink ? 0.35 : 1);
    this.ctx.globalAlpha = 1;

    // Power timers as rings around the ship
    const ctx = this.ctx;
    this.worldTransform();
    ctx.lineWidth = 2;
    const ring = (radius, color, frac) => {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
    };
    ctx.globalAlpha = 0.85;
    if (p.spread > 0) ring(21, COLORS.green, p.spread / POWER_TIME);
    if (p.rapid > 0) ring(25, COLORS.yellow, p.rapid / POWER_TIME);
    if (p.shield) {
      ctx.globalAlpha = 0.55 + Math.sin(this.time * 5) * 0.2;
      ring(29, COLORS.purple, 1);
    }
    ctx.globalAlpha = 1;
  }

  drawPopups() {
    const ctx = this.ctx;
    ctx.font = '700 14px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const u of this.popups) {
      const sx = (u.x - this.view.left) * this.scale + this.shakeX / this.dpr;
      const sy = (u.y - this.view.top) * this.scale + this.shakeY / this.dpr;
      ctx.globalAlpha = Math.min(1, u.life * 2);
      ctx.fillStyle = u.color;
      ctx.fillText(u.text, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  // Arrows on the screen edge for things you can't see yet
  drawIndicators() {
    const ctx = this.ctx;
    const s = this.scale;
    const v = this.view;
    const p = this.player;
    const pad = 16;
    const top = this.hudBottom + 8;
    const draw = (x, y, color) => {
      const sx = (x - v.left) * s;
      const sy = (y - v.top) * s;
      if (sx > 0 && sx < this.cssW && sy > top && sy < this.cssH) return;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > 1100) return;
      const cx = clamp(sx, pad, this.cssW - pad);
      const cy = clamp(sy, top + pad, this.cssH - pad);
      const a = Math.atan2(sy - cy, sx - cx);
      ctx.globalAlpha = 0.35 + 0.6 * (1 - d / 1100);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8);
      ctx.lineTo(cx + Math.cos(a + 2.4) * 6, cy + Math.sin(a + 2.4) * 6);
      ctx.lineTo(cx + Math.cos(a - 2.4) * 6, cy + Math.sin(a - 2.4) * 6);
      ctx.closePath();
      ctx.fill();
    };
    if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;
    let count = 0;
    for (const e of this.enemies) {
      if (count++ > 60) break;
      draw(e.x, e.y, e.def.color);
    }
    for (const mk of this.markers) draw(mk.x, mk.y, ENEMY_TYPES[mk.type].color);
    ctx.globalAlpha = 1;
  }

  drawBossBar() {
    const w = this.boss;
    if (!w || w.dead) return;
    const ctx = this.ctx;
    const width = Math.min(360, this.cssW - 40);
    const x = (this.cssW - width) / 2;
    const y = this.hudBottom + 6;
    ctx.font = '700 10px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = COLORS.pink;
    ctx.fillText('WARDEN', this.cssW / 2, y + 12);
    ctx.fillStyle = 'rgba(255, 0, 127, 0.2)';
    ctx.fillRect(x, y + 16, width, 6);
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(x, y + 16, width * Math.max(0, w.hp / w.maxHp), 6);
  }

  drawSticks() {
    const ctx = this.ctx;
    for (const s of this.sticks.values()) {
      const color = s.role === 'move' ? '0, 243, 255' : '255, 0, 127';
      ctx.strokeStyle = `rgba(${color}, 0.45)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.ox, s.oy, STICK_R, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = `rgba(${color}, 0.3)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, TAU);
      ctx.fill();
    }
  }

  drawHint() {
    if (this.state !== 'PLAYING' || this.waveNum !== 1 || !this.wave || this.wave.time > 7) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, (7 - this.wave.time) / 1.5) * 0.75;
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 11px Orbitron, sans-serif';
    const y = this.cssH - 110;
    if (this.touchUsed) {
      const hasMove = [...this.sticks.values()].some((s) => s.role === 'move');
      const hasAim = [...this.sticks.values()].some((s) => s.role === 'aim');
      ctx.lineWidth = 2;
      if (!hasMove) {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(this.cssW * 0.22, y, 34, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = COLORS.cyan;
        ctx.fillText('MOVE', this.cssW * 0.22, y);
      }
      if (!hasAim) {
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.6)';
        ctx.beginPath();
        ctx.arc(this.cssW * 0.78, y, 34, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = COLORS.pink;
        ctx.fillText('AIM', this.cssW * 0.78, y);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('FIRING IS AUTOMATIC', this.cssW / 2, y - 56);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillText('WASD MOVE · MOUSE OR ARROWS AIM · SPACE BOMB', this.cssW / 2, this.cssH - 100);
    }
    ctx.globalAlpha = 1;
  }

  drawMessage() {
    const m = this.message;
    if (!m) return;
    const ctx = this.ctx;
    const alpha = Math.min(1, (m.max - m.t) / 0.25, m.t / 0.5);
    const size = Math.min(44, this.cssW / 11);
    const y = this.cssH * 0.34;
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = m.color;
    ctx.shadowBlur = 16 * this.dpr;
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${size}px Orbitron, sans-serif`;
    ctx.fillText(m.text, this.cssW / 2, y);
    if (m.sub) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = m.color;
      ctx.font = `700 ${Math.max(11, size * 0.32)}px Orbitron, sans-serif`;
      ctx.fillText(m.sub, this.cssW / 2, y + size * 0.85);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.vectorSiege = new VectorSiege();
});
