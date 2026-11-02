/**
 * CYBER PINBALL // Neon Matrix Overdrive
 * Pure Vanilla HTML5 Canvas + Web Audio API
 */

// ============================================================================
// 1. PROCEDURAL WEB AUDIO SYNTHESIZER
// ============================================================================
class CyberAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.step = 0;
    this.bpm = 128;
    this.timerID = null;
    this.nextBeatTime = 0;
    this.isMultiballTempo = false;

    // Synthwave D Minor Bassline: D2, F2, G2, A2, C3
    this.bassNotes = [73.42, 87.31, 98.00, 110.00, 130.81];
    // Synthwave Arpeggio Pentatonic Lead: D4, F4, G4, A4, C5, D5
    this.leadNotes = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33];

    this.plungerOsc = null;
    this.plungerGain = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;
    this.nextBeatTime = this.ctx.currentTime + 0.05;
    this.scheduleBeat();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  setMultiballMode(active) {
    this.isMultiballTempo = active;
    this.bpm = active ? 144 : 128;
  }

  scheduleBeat() {
    if (!this.isPlayingMusic || !this.ctx) return;
    const stepDuration = 60.0 / (this.bpm * 4); // 16th notes

    while (this.nextBeatTime < this.ctx.currentTime + 0.1) {
      if (!this.muted) {
        this.playBeat(this.step, this.nextBeatTime);
      }
      this.nextBeatTime += stepDuration;
      this.step = (this.step + 1) % 16;
    }

    this.timerID = setTimeout(() => this.scheduleBeat(), 25);
  }

  playBeat(step, time) {
    if (!this.ctx) return;

    // Four-on-the-floor Kick
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Hi-Hat on offbeats
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 2 ? 0.04 : 0.02);
    }

    // Snare on beat 4 and 12
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // Rolling Cyber Bass
    const bassIdx = Math.floor(step / 4) % this.bassNotes.length;
    const freq = this.bassNotes[bassIdx] * (step % 2 === 0 ? 1 : 1.5);
    this.playBassNote(freq, time, 0.1);

    // Multiball rave arpeggio
    if (this.isMultiballTempo && step % 2 === 0) {
      const leadNote = this.leadNotes[(step + Math.floor(this.step / 8)) % this.leadNotes.length];
      this.playLeadNote(leadNote, time, 0.08);
    }
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(32, time + 0.08);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.12);
  }

  playHiHat(time, vol = 0.03) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(7000 + Math.random() * 2000, time);
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(5000, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  playSnare(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, time);
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + 0.1);

    // Noise snap
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.22, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    noise.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);
    noise.start(time);
  }

  playBassNote(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isMultiballTempo ? 900 : 550, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  playLeadNote(freq, time, duration) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(time);
    osc.stop(time + duration);
  }

  // --- SOUND EFFECTS ---

  playFlipperUp() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.04);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playFlipperDown() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(90, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.03);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.04);
  }

  startPlungerCharge() {
    if (this.muted || !this.ctx || this.plungerOsc) return;
    const t = this.ctx.currentTime;
    this.plungerOsc = this.ctx.createOscillator();
    this.plungerGain = this.ctx.createGain();
    this.plungerOsc.type = 'triangle';
    this.plungerOsc.frequency.setValueAtTime(80, t);
    this.plungerOsc.frequency.linearRampToValueAtTime(380, t + 1.5);
    this.plungerGain.gain.setValueAtTime(0.01, t);
    this.plungerGain.gain.linearRampToValueAtTime(0.2, t + 1.2);
    this.plungerOsc.connect(this.plungerGain);
    this.plungerGain.connect(this.ctx.destination);
    this.plungerOsc.start(t);
  }

  stopPlungerCharge(fired = false) {
    if (this.plungerOsc) {
      try {
        const t = this.ctx.currentTime;
        this.plungerGain.gain.setValueAtTime(this.plungerGain.gain.value, t);
        this.plungerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
        this.plungerOsc.stop(t + 0.05);
      } catch (e) {}
      this.plungerOsc = null;
      this.plungerGain = null;
    }
    if (fired && !this.muted && this.ctx) {
      this.playPlungerLaunch();
    }
  }

  playPlungerLaunch() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  playBumperHit(superMode = false) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(superMode ? 520 : 380, t);
    osc1.frequency.exponentialRampToValueAtTime(80, t + 0.1);

    osc2.type = 'square';
    osc2.frequency.setValueAtTime(superMode ? 880 : 660, t);
    osc2.frequency.exponentialRampToValueAtTime(140, t + 0.08);

    gain.gain.setValueAtTime(superMode ? 0.45 : 0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);
    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.12);
    osc2.stop(t + 0.12);
  }

  playSlingshot() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.07);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playDropTarget() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playTargetBankReset() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [329.63, 440, 554.37].forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.04);
      gain.gain.setValueAtTime(0.2, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.12);
    });
  }

  playSpinnerTick(speedRatio = 1) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + speedRatio * 800, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.02);
  }

  playRampWhoosh() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, t);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300, t);
    filter.frequency.exponentialRampToValueAtTime(2400, t + 0.28);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  }

  playBallLockChime(lockNum) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const chords = [
      [220, 277.18, 329.63], // A major
      [277.18, 349.23, 415.30], // C# major
      [329.63, 415.30, 493.88]  // E major
    ];
    const notes = chords[Math.min(lockNum - 1, 2)];
    notes.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + i * 0.06);
      gain.gain.setValueAtTime(0.3, t + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.3);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.06);
      osc.stop(t + i * 0.06 + 0.3);
    });
  }

  playMultiballSiren() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Dramatic riser
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(1200, t + 0.7);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.75);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.75);

    // Fanfare chord
    [440, 554.37, 659.25, 880].forEach(f => {
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(f, t + 0.65);
      g.gain.setValueAtTime(0.2, t + 0.65);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g);
      g.connect(this.ctx.destination);
      o.start(t + 0.65);
      o.stop(t + 1.2);
    });
  }

  playJackpot() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Arpeggio fanfare
    const scale = [392, 523.25, 659.25, 783.99, 1046.5];
    scale.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t + idx * 0.06);
      gain.gain.setValueAtTime(0.35, t + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.06 + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + idx * 0.06);
      osc.stop(t + idx * 0.06 + 0.25);
    });
  }

  playSuperJackpot() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    // Huge sub bass drop + bright triumphant triad
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.frequency.setValueAtTime(180, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.5);
    subGain.gain.setValueAtTime(0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    sub.connect(subGain);
    subGain.connect(this.ctx.destination);
    sub.start(t);
    sub.stop(t + 0.55);

    const brass = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    brass.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t + 0.1 + idx * 0.05);
      gain.gain.setValueAtTime(0.3, t + 0.1 + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1 + idx * 0.05 + 0.45);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + 0.1 + idx * 0.05);
      osc.stop(t + 0.1 + idx * 0.05 + 0.45);
    });
  }

  playBallDrain() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.4);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.45);
  }

  playBallSaved() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    [261.63, 392, 523.25].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.07);
      gain.gain.setValueAtTime(0.25, t + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t + i * 0.07);
      osc.stop(t + i * 0.07 + 0.22);
    });
  }

  playNudge() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(80, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.06);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.08);
  }

  playTilt() {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(95, t);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  }
}

// ============================================================================
// 2. TABLE: GEOMETRY, PHYSICS AND RULES
// No DOM in here. The table reports what happens through emit(name, data).
// ============================================================================
const TABLE_W = 540;
const TABLE_H = 960;
const CENTER_X = 253; // Middle of the playfield, left of the shooter lane
const BALL_R = 10;
const WALL_R = 2;
const GRAVITY = 1000;
const STEP = 1 / 300; // Under BALL_R of travel per step at MAX_SPEED, so no tunnelling
const MAX_SPEED = 2300;
const LANE_X = 509;
const PLUNGER_Y = 926;
const LAUNCH_MIN = 1500;
const LAUNCH_MAX = 2000;
const BALLS_PER_GAME = 3;
const BALL_SAVE_TIME = 10;
const STUCK_TIME = 3;
const MAX_MULT = 6;

const mirrorX = (x) => CENTER_X * 2 - x;

class Flipper {
  constructor(side) {
    const dir = side === 'left' ? 1 : -1;
    this.side = side;
    this.px = CENTER_X - dir * 100;
    this.py = 850;
    this.length = 84;
    this.radius = 8;
    this.rest = side === 'left' ? 0.49 : Math.PI - 0.49;
    this.active = side === 'left' ? -0.49 : Math.PI + 0.49;
    this.angle = this.rest;
    this.omega = 0;
    this.held = false;
  }

  update(h) {
    const target = this.held ? this.active : this.rest;
    const speed = this.held ? 26 : 16;
    const diff = target - this.angle;
    const move = Math.sign(diff) * Math.min(Math.abs(diff), speed * h);
    this.angle += move;
    this.omega = move / h;
  }

  get tipX() { return this.px + Math.cos(this.angle) * this.length; }
  get tipY() { return this.py + Math.sin(this.angle) * this.length; }
}

class Table {
  constructor(emit) {
    this.emit = emit || (() => {});
    this.buildGeometry();
    this.newGame();
  }

  buildGeometry() {
    this.walls = [];
    this.kickers = [];
    const poly = (points, list = this.walls) => {
      for (let i = 0; i < points.length - 1; i++) {
        list.push({ ax: points[i][0], ay: points[i][1], bx: points[i + 1][0], by: points[i + 1][1] });
      }
    };
    const both = (points) => {
      poly(points);
      poly(points.map(([x, y]) => [mirrorX(x), y]));
    };

    // Cabinet: left wall, top arch, right wall
    const outline = [[14, TABLE_H + 40], [14, 230]];
    for (let i = 1; i <= 32; i++) {
      const a = Math.PI + (Math.PI * i) / 32;
      outline.push([270 + 256 * Math.cos(a), 230 + 216 * Math.sin(a)]);
    }
    outline.push([526, TABLE_H + 40]);
    poly(outline);

    // Shooter lane divider and floor
    poly([[492, TABLE_H + 40], [492, 226]]);
    poly([[492, 950], [526, 950]]);

    // One-way gate: the ball leaves the lane through it, then it acts as a wall
    // The second turns plunger shots into the bumpers instead of down the left orbit
    this.gates = [
      { ax: 524, ay: 196, bx: 492, by: 226, nx: -0.684, ny: -0.73 },
      { ax: 15, ay: 262, bx: 58, by: 300, nx: 0.662, ny: -0.749 }
    ];

    // Orbit islands
    both([[58, 300], [58, 530], [72, 548]]);

    // Orbit exit deflectors: keep a ball leaving an orbit out of the outlane
    both([[14, 606], [60, 652]]);

    // Top lane dividers
    [133, 213, 293, 373].forEach((x) => poly([[x, 80], [x, 125]]));

    // Slingshot bodies and inlane guides
    both([[100, 690], [100, 770], [150, 806]]);
    both([[46, 724], [46, 792], [156, 844]]);
    [[100, 690, 150, 806]].forEach(([ax, ay, bx, by]) => {
      poly([[ax, ay], [bx, by]], this.kickers);
      poly([[mirrorX(ax), ay], [mirrorX(bx), by]], this.kickers);
    });

    this.bumpers = [
      { x: 253, y: 195, r: 26, flash: 0 },
      { x: 172, y: 285, r: 26, flash: 0 },
      { x: 334, y: 285, r: 26, flash: 0 }
    ];
    this.scoop = { x: 398, y: 455, r: 13 };
    this.dropTargets = [
      { ax: 65, ay: 350, bx: 65, by: 390, letter: 'C' },
      { ax: 65, ay: 392, bx: 65, by: 432, letter: 'Y' },
      { ax: 65, ay: 434, bx: 65, by: 474, letter: 'B' }
    ];
    this.laneSensors = [
      { min: 133, max: 213, x: 173, y: 105, letter: 'N' },
      { min: 213, max: 293, x: 253, y: 105, letter: 'E' },
      { min: 293, max: 373, x: 333, y: 105, letter: 'O' }
    ];
    this.orbitY = 440;
    this.spinnerY = 360;
    this.spinner = { ax: 448, bx: 492, y: this.spinnerY };

    this.flippers = { left: new Flipper('left'), right: new Flipper('right') };
    this.flipperList = [this.flippers.left, this.flippers.right];
  }

  newGame() {
    this.score = 0;
    this.ballNum = 1;
    this.mult = 1;
    this.locks = 0;
    this.lockLit = false;
    this.multiball = false;
    this.jackpots = 0;
    this.orbits = 0;
    this.bumperHits = 0;
    this.spins = 0;
    this.over = false;
    this.time = 0;
    this.lanes = [false, false, false];
    this.dropTargets.forEach((t) => { t.down = false; });
    this.flipperList.forEach((f) => { f.held = false; f.angle = f.rest; f.omega = 0; });
    this.serveBall();
  }

  serveBall() {
    this.balls = [this.makeBall()];
    this.autoQueue = 0;
    this.autoTimer = 0;
    this.saveTimer = 0;
    this.charging = false;
    this.charge = 0;
    this.spinner.turns = 0;
    this.spinner.angle = 0;
    this.emit('serve', { ball: this.ballNum });
  }

  makeBall() {
    return { x: LANE_X, y: PLUNGER_Y, vx: 0, vy: 0, held: 'plunger', holdTime: 0, anchorX: LANE_X, anchorY: PLUNGER_Y, stillTime: 0, trail: [] };
  }

  get plungerBall() { return this.balls.find((b) => b.held === 'plunger'); }

  addScore(points, x, y) {
    const total = points * this.mult;
    this.score += total;
    this.emit('score', { total, x, y });
    return total;
  }

  // ---- Player input -------------------------------------------------------
  setFlipper(side, down) {
    if (this.over) return;
    const flipper = this.flippers[side];
    if (flipper.held === down) return;
    flipper.held = down;
    if (down) {
      // Lane change: flippers shuffle the lit top lanes
      const l = this.lanes;
      this.lanes = side === 'left' ? [l[1], l[2], l[0]] : [l[2], l[0], l[1]];
    }
    this.emit(down ? 'flipperUp' : 'flipperDown', { side });
  }

  setCharging(on) {
    if (this.over) return;
    if (on && this.plungerBall && !this.charging) {
      this.charging = true;
      this.charge = 0;
      this.emit('chargeStart');
    } else if (!on && this.charging) {
      this.charging = false;
      const ball = this.plungerBall;
      this.emit('chargeEnd', { fired: !!ball });
      if (ball) this.launch(ball, this.charge);
      this.charge = 0;
    }
  }

  launch(ball, power, saved = true) {
    ball.held = null;
    ball.vx = 0;
    ball.vy = -(LAUNCH_MIN + (LAUNCH_MAX - LAUNCH_MIN) * power) * (0.97 + Math.random() * 0.06);
    this.resetStillness(ball);
    if (saved && !this.multiball) this.saveTimer = BALL_SAVE_TIME;
    this.emit('launch');
  }

  nudge(dx) {
    if (this.over || this.time - (this.lastNudge || -1) < 0.5) return;
    this.lastNudge = this.time;
    for (const ball of this.balls) {
      if (ball.held) continue;
      ball.vx += dx * 150;
      ball.vy -= 90;
    }
    this.emit('nudge', { dx });
  }

  // ---- Simulation ---------------------------------------------------------
  step(h = STEP) {
    if (this.over) return;
    this.time += h;
    this.flipperList.forEach((f) => f.update(h));
    if (this.saveTimer > 0) this.saveTimer = Math.max(0, this.saveTimer - h);
    if (this.charging) this.charge = Math.min(1, this.charge + h / 0.9);
    for (const bumper of this.bumpers) bumper.flash = Math.max(0, bumper.flash - h * 5);
    this.updateSpinner(h);

    if (this.autoQueue > 0) {
      this.autoTimer -= h;
      if (this.autoTimer <= 0) {
        const ball = this.makeBall();
        this.balls.push(ball);
        this.launch(ball, 0.7, false);
        this.autoQueue--;
        this.autoTimer = 0.8;
      }
    }

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];
      if (ball.held) {
        this.updateHeld(ball, h);
        continue;
      }
      this.moveBall(ball, h);
      if (ball.y > TABLE_H + 20) {
        this.balls.splice(i, 1);
        this.onDrain();
        if (this.over) return;
      }
    }
  }

  updateHeld(ball, h) {
    if (ball.held !== 'scoop') return;
    ball.holdTime -= h;
    if (ball.holdTime <= 0) {
      ball.held = null;
      ball.vx = -300 + (Math.random() - 0.5) * 140;
      ball.vy = 620;
      ball.y += 16;
      this.resetStillness(ball);
      this.emit('scoopKick');
    }
  }

  moveBall(ball, h) {
    const prevY = ball.y;
    ball.vy += GRAVITY * h;
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    for (const wall of this.walls) this.hitWall(ball, wall, 0.3);
    for (const kicker of this.kickers) this.hitKicker(ball, kicker);
    for (const gate of this.gates) this.hitGate(ball, gate);
    for (const target of this.dropTargets) {
      if (!target.down) this.hitDropTarget(ball, target);
    }
    for (const bumper of this.bumpers) this.hitBumper(ball, bumper);
    for (const flipper of this.flipperList) this.hitFlipper(ball, flipper);

    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) {
      ball.vx *= MAX_SPEED / speed;
      ball.vy *= MAX_SPEED / speed;
    }

    this.checkSensors(ball, prevY);
    this.checkScoop(ball);
    this.checkStuck(ball, h);

    // Fell back down the lane: wait for another pull
    if (ball.x > 492 && ball.y >= PLUNGER_Y && ball.vy >= 0) {
      ball.x = LANE_X;
      ball.y = PLUNGER_Y;
      ball.vx = 0;
      ball.vy = 0;
      if (this.balls.some((b) => b !== ball && b.held === 'plunger') || this.multiball) {
        this.launch(ball, 0.7, false);
      } else {
        ball.held = 'plunger';
      }
    }
  }

  // Pushes the ball out of a segment. Returns the contact, or null if none.
  touchSegment(ball, s, extra) {
    const dx = s.bx - s.ax;
    const dy = s.by - s.ay;
    const t = Math.max(0, Math.min(1, ((ball.x - s.ax) * dx + (ball.y - s.ay) * dy) / (dx * dx + dy * dy)));
    const cx = s.ax + dx * t;
    const cy = s.ay + dy * t;
    const ox = ball.x - cx;
    const oy = ball.y - cy;
    const reach = BALL_R + extra;
    const distSq = ox * ox + oy * oy;
    if (distSq >= reach * reach || distSq === 0) return null;
    const dist = Math.sqrt(distSq);
    const nx = ox / dist;
    const ny = oy / dist;
    ball.x = cx + nx * reach;
    ball.y = cy + ny * reach;
    return { nx, ny, cx, cy };
  }

  bounce(ball, nx, ny, restitution) {
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn >= 0) return 0;
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
    return -vn;
  }

  hitWall(ball, wall, restitution) {
    const contact = this.touchSegment(ball, wall, WALL_R);
    if (contact) this.bounce(ball, contact.nx, contact.ny, restitution);
  }

  hitKicker(ball, kicker) {
    const contact = this.touchSegment(ball, kicker, WALL_R);
    if (!contact) return;
    const impact = this.bounce(ball, contact.nx, contact.ny, 0.3);
    if (impact > 90) {
      ball.vx += contact.nx * 520;
      ball.vy += contact.ny * 520;
      this.addScore(500, ball.x, ball.y);
      this.emit('sling', { x: ball.x, y: ball.y });
    }
  }

  hitGate(ball, g) {
    const side = (ball.x - g.ax) * g.nx + (ball.y - g.ay) * g.ny;
    if (side < 0 || ball.vx * g.nx + ball.vy * g.ny >= 0) return;
    const contact = this.touchSegment(ball, g, WALL_R);
    if (contact) this.bounce(ball, contact.nx, contact.ny, 0.3);
  }

  hitDropTarget(ball, target) {
    const contact = this.touchSegment(ball, target, 3);
    if (!contact) return;
    const impact = this.bounce(ball, contact.nx, contact.ny, 0.4);
    if (impact < 120 || contact.nx < 0) return;
    target.down = true;
    this.addScore(5000, target.ax + 20, target.ay + 20);
    this.emit('dropTarget');
    if (this.dropTargets.every((t) => t.down)) {
      this.lockLit = true;
      this.addScore(25000, 110, 412);
      this.emit('lockLit');
    }
  }

  hitBumper(ball, bumper) {
    const ox = ball.x - bumper.x;
    const oy = ball.y - bumper.y;
    const reach = BALL_R + bumper.r;
    const distSq = ox * ox + oy * oy;
    if (distSq >= reach * reach || distSq === 0) return;
    const dist = Math.sqrt(distSq);
    const nx = ox / dist;
    const ny = oy / dist;
    ball.x = bumper.x + nx * reach;
    ball.y = bumper.y + ny * reach;
    this.bounce(ball, nx, ny, 0.4);
    ball.vx += nx * 560;
    ball.vy += ny * 560;
    bumper.flash = 1;
    this.bumperHits++;
    this.addScore(1000, bumper.x, bumper.y);
    this.emit('bumper', { x: ball.x, y: ball.y });
  }

  hitFlipper(ball, flipper) {
    const segment = { ax: flipper.px, ay: flipper.py, bx: flipper.tipX, by: flipper.tipY };
    const contact = this.touchSegment(ball, segment, flipper.radius);
    if (!contact) return;
    // Surface speed at the contact point, from the flipper's rotation
    const sx = -flipper.omega * (contact.cy - flipper.py);
    const sy = flipper.omega * (contact.cx - flipper.px);
    const rel = (ball.vx - sx) * contact.nx + (ball.vy - sy) * contact.ny;
    if (rel >= 0) return;
    const restitution = Math.abs(flipper.omega) > 1 ? 0.55 : 0.2;
    ball.vx -= (1 + restitution) * rel * contact.nx;
    ball.vy -= (1 + restitution) * rel * contact.ny;
  }

  checkSensors(ball, prevY) {
    const crossed = (y) => (prevY < y) !== (ball.y < y);

    if (crossed(105)) {
      this.laneSensors.forEach((lane, i) => {
        if (ball.x > lane.min && ball.x < lane.max) this.rollLane(i);
      });
    }

    if (crossed(this.spinnerY) && ball.x > this.spinner.ax && ball.x < this.spinner.bx) {
      this.spinner.turns += Math.min(16, Math.abs(ball.vy) / 110);
    }

    if (crossed(this.orbitY) && ball.vy < -250) {
      if (ball.x > 14 && ball.x < 58) this.passOrbit(36);
      else if (ball.x > 448 && ball.x < 492) this.passOrbit(470);
    }
  }

  rollLane(i) {
    this.addScore(2500, this.laneSensors[i].x, this.laneSensors[i].y);
    this.lanes[i] = true;
    this.emit('lane');
    if (this.lanes.every(Boolean)) {
      this.lanes = [false, false, false];
      if (this.mult < MAX_MULT) this.mult++;
      this.emit('multUp', { mult: this.mult });
    }
  }

  passOrbit(x) {
    this.orbits++;
    if (this.multiball) {
      this.awardJackpot(x, this.orbitY);
    } else {
      this.addScore(25000, x, this.orbitY);
      this.emit('orbit');
    }
  }

  awardJackpot(x, y) {
    this.jackpots++;
    this.addScore(250000, x, y);
    this.emit('jackpot');
  }

  updateSpinner(h) {
    const s = this.spinner;
    if (s.turns <= 0) return;
    const spent = Math.min(s.turns, (s.turns * 2 + 4) * h);
    const before = Math.floor(s.angle);
    s.angle += spent;
    s.turns -= spent;
    if (Math.floor(s.angle) > before) {
      this.spins++;
      this.addScore(250);
      this.emit('spin', { rate: Math.min(1, s.turns / 8) });
    }
  }

  checkScoop(ball) {
    const s = this.scoop;
    if (Math.hypot(ball.x - s.x, ball.y - s.y) > s.r || Math.hypot(ball.vx, ball.vy) > 1000) return;
    ball.x = s.x;
    ball.y = s.y;
    ball.vx = 0;
    ball.vy = 0;
    ball.held = 'scoop';
    ball.holdTime = 0.9;
    this.addScore(10000, s.x, s.y);

    if (this.multiball) {
      this.awardJackpot(s.x, s.y);
    } else if (this.lockLit) {
      this.lockLit = false;
      this.locks++;
      this.dropTargets.forEach((t) => { t.down = false; });
      this.emit('lock', { locks: this.locks });
      if (this.locks === 3) this.startMultiball();
    } else {
      this.emit('scoop');
    }
  }

  startMultiball() {
    this.locks = 0;
    this.multiball = true;
    this.autoQueue = 2;
    this.autoTimer = 1;
    this.emit('multiballStart');
  }

  checkStuck(ball, h) {
    if (Math.hypot(ball.x - ball.anchorX, ball.y - ball.anchorY) > 14) {
      this.resetStillness(ball);
      return;
    }
    ball.stillTime += h;
    if (ball.stillTime < STUCK_TIME) return;
    // Cradling on a held flipper is a real move, so leave those balls alone
    if (this.flipperList.some((f) => f.held && ball.y > 780)) return;
    ball.vx = (Math.random() < 0.5 ? -1 : 1) * (160 + Math.random() * 160);
    ball.vy = -420;
    this.resetStillness(ball);
    this.emit('unstuck');
  }

  resetStillness(ball) {
    ball.anchorX = ball.x;
    ball.anchorY = ball.y;
    ball.stillTime = 0;
  }

  onDrain() {
    if (this.saveTimer > 0 && !this.multiball) {
      this.saveTimer = 0;
      this.autoQueue++;
      this.autoTimer = 0.6;
      this.emit('ballSaved');
      return;
    }

    const remaining = this.balls.length + this.autoQueue;
    if (this.multiball && remaining <= 1) {
      this.multiball = false;
      this.emit('multiballEnd');
    }
    if (remaining > 0) return;

    this.emit('drain');
    this.ballNum++;
    this.mult = 1;
    this.lanes = [false, false, false];
    if (this.ballNum > BALLS_PER_GAME) {
      this.ballNum = BALLS_PER_GAME;
      this.over = true;
      this.emit('gameOver');
      return;
    }
    this.serveBall();
  }
}

// ============================================================================
// 3. DISPLAY, INPUT AND GAME FLOW
// ============================================================================
const COLORS = {
  cyan: '#00f3ff',
  pink: '#ff007f',
  yellow: '#ffe600',
  green: '#05ffa1',
  purple: '#a824ff',
  orange: '#ff6a00',
  dim: '#2a1a4a'
};
const MAX_PARTICLES = 140;

class PinballGame {
  constructor() {
    this.canvas = document.getElementById('table');
    this.ctx = this.canvas.getContext('2d');
    this.wrap = document.getElementById('table-wrap');
    this.audio = new CyberAudio();
    this.ui = {
      score: document.getElementById('hud-score'),
      ball: document.getElementById('hud-ball'),
      mult: document.getElementById('hud-mult'),
      high: document.getElementById('hud-high'),
      ticker: document.getElementById('ticker')
    };
    this.table = new Table((name, data) => this.onTableEvent(name, data || {}));
    this.state = 'START';
    this.particles = [];
    this.popups = [];
    this.flash = 0;
    this.shake = 0;
    this.lastTime = 0;
    this.accumulator = 0;
    this.pointers = new Map();
    this.keysDown = new Set();
    this.touchUsed = window.matchMedia('(pointer: coarse)').matches;
    this.highScore = this.readHighScore();
    this.shownScore = -1;

    this.modals = {
      start: document.getElementById('start-modal'),
      pause: document.getElementById('pause-modal'),
      over: document.getElementById('gameover-modal')
    };

    this.bindEvents();
    this.resize();
    this.updateHud();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- Setup --------------------------------------------------------------
  bindEvents() {
    const click = (id, fn) => document.getElementById(id).addEventListener('click', fn);
    click('btn-start', () => this.startGame());
    click('btn-again', () => this.startGame());
    click('btn-restart', () => this.startGame());
    click('btn-resume', () => this.setPaused(false));
    click('btn-pause', () => this.setPaused(this.state === 'PLAYING'));
    click('btn-audio', () => this.toggleAudio());

    window.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointerup', (e) => this.onPointerUp(e));
    window.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));

    window.addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(this.wrap);

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.autoPause();
    });
    window.addEventListener('blur', () => this.releaseAll());
  }

  resize() {
    const box = this.wrap.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;
    const cssW = Math.min(box.width, (box.height * TABLE_W) / TABLE_H);
    const cssH = (cssW * TABLE_H) / TABLE_W;
    const scale = (cssW * Math.min(window.devicePixelRatio || 1, 2)) / TABLE_W;
    if (scale === this.scale) return;
    this.scale = scale;
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(TABLE_W * scale);
    this.canvas.height = Math.round(TABLE_H * scale);
    this.buildStaticLayer();
    this.draw();
  }

  // ---- Input --------------------------------------------------------------
  onPointerDown(e) {
    if (e.target.closest('button, a, .modal')) return;
    e.preventDefault();
    this.audio.init();
    if (e.pointerType === 'touch') this.touchUsed = true;
    if (this.state !== 'PLAYING') return;
    const side = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
    this.pointers.set(e.pointerId, side);
    this.applyHeld();
  }

  onPointerUp(e) {
    if (!this.pointers.delete(e.pointerId)) return;
    this.applyHeld();
  }

  onKey(e, down) {
    const code = e.code;
    if (down && !e.repeat) {
      if (code === 'KeyP' || code === 'Escape') {
        this.setPaused(this.state === 'PLAYING');
        return;
      }
      if (code === 'KeyM') {
        this.toggleAudio();
        return;
      }
      if (code === 'Enter' && this.state !== 'PLAYING' && this.state !== 'PAUSED') {
        this.startGame();
        return;
      }
      if (this.state === 'PLAYING') {
        if (code === 'KeyX') this.table.nudge(-1);
        if (code === 'KeyN') this.table.nudge(1);
      }
    }
    if (['KeyA', 'KeyZ', 'ArrowLeft', 'KeyD', 'Slash', 'ArrowRight', 'Space', 'ArrowDown'].includes(code)) {
      e.preventDefault();
      if (e.repeat) return;
      if (down && this.state === 'PLAYING') {
        this.audio.init();
        this.touchUsed = false;
        this.keysDown.add(code);
      } else {
        this.keysDown.delete(code);
      }
      this.applyHeld();
    }
  }

  // Works out what is held across all fingers and keys, so that lifting one
  // of two fingers on the same side doesn't drop the flipper
  applyHeld() {
    const sides = [...this.pointers.values()];
    const keys = this.keysDown;
    const left = sides.includes('left') || keys.has('KeyA') || keys.has('KeyZ') || keys.has('ArrowLeft');
    const rightTouch = sides.includes('right');
    const right = rightTouch || keys.has('KeyD') || keys.has('Slash') || keys.has('ArrowRight');
    const plungerKey = keys.has('Space') || keys.has('ArrowDown');
    const table = this.table;

    // A finger on the right pulls the plunger while a ball is waiting for it
    const pulling = plungerKey || (rightTouch && (!!table.plungerBall || table.charging));
    table.setCharging(pulling);
    table.setFlipper('left', left);
    table.setFlipper('right', right && !(rightTouch && pulling));
  }

  releaseAll() {
    this.pointers.clear();
    this.keysDown.clear();
    this.table.setFlipper('left', false);
    this.table.setFlipper('right', false);
    if (this.table.charging) {
      this.table.charging = false;
      this.table.charge = 0;
      this.audio.stopPlungerCharge(false);
    }
  }

  toggleAudio() {
    this.audio.init();
    const muted = this.audio.toggleMute();
    document.getElementById('audio-icon').textContent = muted ? '🔇' : '🔊';
    if (muted) this.audio.stopMusic();
    else if (this.state === 'PLAYING') this.audio.startMusic();
  }

  // ---- Game flow ----------------------------------------------------------
  startGame() {
    this.audio.init();
    this.releaseAll();
    this.table.newGame();
    this.particles = [];
    this.popups = [];
    this.shownScore = -1;
    this.accumulator = 0;
    this.state = 'PLAYING';
    this.hideModals();
    this.updateHud();
    this.audio.setMultiballMode(false);
    if (!this.audio.muted) this.audio.startMusic();
    this.say(this.launchHint());
  }

  setPaused(paused) {
    if (paused && this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.releaseAll();
      this.audio.stopMusic();
      this.modals.pause.classList.add('active');
    } else if (!paused && this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.lastTime = 0;
      this.hideModals();
      if (!this.audio.muted) this.audio.startMusic();
    }
  }

  autoPause() {
    this.setPaused(true);
  }

  hideModals() {
    Object.values(this.modals).forEach((m) => m.classList.remove('active'));
  }

  launchHint() {
    return this.touchUsed ? 'HOLD RIGHT SIDE, LET GO TO LAUNCH' : 'HOLD SPACE, LET GO TO LAUNCH';
  }

  say(text) {
    this.ui.ticker.textContent = text;
  }

  readHighScore() {
    try {
      return parseInt(localStorage.getItem('cyber_pinball_highscore') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  readRecords() {
    try {
      return JSON.parse(localStorage.getItem('cyber_pinball_records') || '[]');
    } catch (e) {
      return [];
    }
  }

  saveRecord(score) {
    const records = this.readRecords();
    records.push({ score, date: new Date().toLocaleDateString() });
    records.sort((a, b) => b.score - a.score);
    try {
      localStorage.setItem('cyber_pinball_records', JSON.stringify(records.slice(0, 5)));
      localStorage.setItem('cyber_pinball_highscore', String(this.highScore));
    } catch (e) {}
    return records.slice(0, 5);
  }

  endGame() {
    const t = this.table;
    this.state = 'OVER';
    this.releaseAll();
    this.audio.stopMusic();
    this.highScore = Math.max(this.highScore, t.score);
    const records = this.saveRecord(t.score);

    document.getElementById('final-score').textContent = t.score.toLocaleString();
    document.getElementById('final-jackpots').textContent = t.jackpots;
    document.getElementById('final-orbits').textContent = t.orbits;
    document.getElementById('final-bumpers').textContent = t.bumperHits;
    document.getElementById('final-spins').textContent = t.spins;

    const list = document.getElementById('records');
    list.innerHTML = '';
    records.forEach((record) => {
      const li = document.createElement('li');
      const date = document.createElement('span');
      const score = document.createElement('strong');
      date.textContent = record.date;
      score.textContent = record.score.toLocaleString();
      li.append(date, score);
      list.append(li);
    });
    this.modals.over.classList.add('active');
    this.updateHud();
  }

  updateHud() {
    const t = this.table;
    if (t.score !== this.shownScore) {
      this.shownScore = t.score;
      this.ui.score.textContent = t.score.toLocaleString();
    }
    this.ui.ball.textContent = `${t.ballNum}/${BALLS_PER_GAME}`;
    this.ui.mult.textContent = `x${t.mult}`;
    this.ui.high.textContent = Math.max(this.highScore, t.score).toLocaleString();
  }

  // ---- Table events: sound, effects, messages -----------------------------
  onTableEvent(name, d) {
    const a = this.audio;
    switch (name) {
      case 'score':
        if (d.x !== undefined) this.addPopup(d.x, d.y, `+${d.total.toLocaleString()}`, COLORS.yellow);
        break;
      case 'serve':
        this.say(this.launchHint());
        break;
      case 'flipperUp':
        a.playFlipperUp();
        break;
      case 'flipperDown':
        a.playFlipperDown();
        break;
      case 'chargeStart':
        a.startPlungerCharge();
        break;
      case 'chargeEnd':
        a.stopPlungerCharge(d.fired);
        break;
      case 'launch':
        a.playPlungerLaunch();
        this.say('HIT THE C-Y-B TARGETS TO LIGHT THE LOCK');
        break;
      case 'nudge':
        a.playNudge();
        this.shake = 5;
        break;
      case 'bumper':
        a.playBumperHit(false);
        this.burst(d.x, d.y, COLORS.pink, 8);
        this.shake = Math.max(this.shake, 2);
        break;
      case 'sling':
        a.playSlingshot();
        this.burst(d.x, d.y, COLORS.cyan, 6);
        break;
      case 'lane':
        a.playDropTarget();
        break;
      case 'multUp':
        a.playTargetBankReset();
        this.say(`N-E-O COMPLETE: MULTIPLIER x${d.mult}`);
        break;
      case 'dropTarget':
        a.playDropTarget();
        break;
      case 'lockLit':
        a.playTargetBankReset();
        this.say('LOCK LIT: SHOOT THE SCOOP');
        break;
      case 'scoop':
        a.playBallLockChime(1);
        break;
      case 'scoopKick':
        a.playSlingshot();
        break;
      case 'lock':
        a.playBallLockChime(d.locks);
        this.say(d.locks < 3 ? `BALL ${d.locks} LOCKED: LIGHT THE NEXT LOCK` : 'ALL LOCKED');
        break;
      case 'orbit':
        a.playRampWhoosh();
        this.say('ORBIT!');
        break;
      case 'spin':
        a.playSpinnerTick(d.rate);
        break;
      case 'jackpot':
        a.playJackpot();
        this.flash = 1;
        this.shake = 8;
        this.say('JACKPOT!');
        break;
      case 'multiballStart':
        a.playMultiballSiren();
        a.setMultiballMode(true);
        this.flash = 1;
        this.say('MULTIBALL: ORBITS AND SCOOP SCORE JACKPOTS');
        break;
      case 'multiballEnd':
        a.setMultiballMode(false);
        this.say('MULTIBALL OVER');
        break;
      case 'ballSaved':
        a.playBallSaved();
        this.say('BALL SAVED');
        break;
      case 'drain':
        a.playBallDrain();
        this.shake = 6;
        break;
      case 'gameOver':
        this.pendingOver = true;
        break;
      default:
        break;
    }
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 200;
      this.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 0.5, color });
    }
  }

  addPopup(x, y, text, color) {
    if (this.popups.length > 10) this.popups.shift();
    this.popups.push({ x, y, text, color, life: 0.8 });
  }

  // ---- Main loop ----------------------------------------------------------
  loop(timestamp) {
    requestAnimationFrame((t) => this.loop(t));
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.max(0, Math.min(0.05, (timestamp - this.lastTime) / 1000));
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      this.accumulator += dt;
      while (this.accumulator >= STEP) {
        this.table.step();
        this.accumulator -= STEP;
      }
      if (this.pendingOver) {
        this.pendingOver = false;
        this.endGame();
      }
      this.updateHud();
    }
    this.updateEffects(dt);
    this.draw();
  }

  updateEffects(dt) {
    for (const ball of this.table.balls) {
      ball.trail.push(ball.x, ball.y);
      if (ball.trail.length > 12) ball.trail.splice(0, 2);
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i];
      p.life -= dt;
      p.y -= 40 * dt;
      if (p.life <= 0) this.popups.splice(i, 1);
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.shake = Math.max(0, this.shake - dt * 30);
  }

  // ---- Drawing ------------------------------------------------------------
  // Walls and artwork are drawn once with glow, because shadowBlur every frame
  // is what makes canvas games crawl on phones
  buildStaticLayer() {
    const layer = document.createElement('canvas');
    layer.width = this.canvas.width;
    layer.height = this.canvas.height;
    const c = layer.getContext('2d');
    const t = this.table;
    c.scale(this.scale, this.scale);

    const bg = c.createLinearGradient(0, 0, 0, TABLE_H);
    bg.addColorStop(0, '#120828');
    bg.addColorStop(0.55, '#0b0520');
    bg.addColorStop(1, '#05020c');
    c.fillStyle = bg;
    c.fillRect(0, 0, TABLE_W, TABLE_H);

    // Perspective grid across the playfield
    c.strokeStyle = 'rgba(168, 36, 255, 0.13)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = 14; x <= 492; x += 40) {
      c.moveTo(x, 100);
      c.lineTo(CENTER_X + (x - CENTER_X) * 1.5, TABLE_H);
    }
    for (let y = 120, gap = 20; y < TABLE_H; y += gap, gap *= 1.16) {
      c.moveTo(14, y);
      c.lineTo(492, y);
    }
    c.stroke();

    // Slingshot faces and centre artwork
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '900 30px Orbitron, sans-serif';
    c.fillStyle = 'rgba(0, 243, 255, 0.1)';
    c.fillText('CYBER', CENTER_X, 520);
    c.fillText('PINBALL', CENTER_X, 556);

    const stroke = (list, color, width) => {
      c.strokeStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.lineWidth = width;
      c.lineCap = 'round';
      c.beginPath();
      for (const s of list) {
        c.moveTo(s.ax, s.ay);
        c.lineTo(s.bx, s.by);
      }
      c.stroke();
      c.shadowBlur = 0;
    };
    stroke(t.walls, COLORS.purple, 4);
    stroke(t.kickers, COLORS.pink, 6);
    stroke(t.gates, COLORS.yellow, 3);

    c.font = '700 11px Orbitron, sans-serif';
    c.fillStyle = 'rgba(0, 243, 255, 0.55)';
    c.save();
    c.translate(36, 500);
    c.rotate(-Math.PI / 2);
    c.fillText('ORBIT', 0, 0);
    c.restore();
    c.save();
    c.translate(470, 500);
    c.rotate(-Math.PI / 2);
    c.fillText('ORBIT', 0, 0);
    c.restore();

    this.staticLayer = layer;
  }

  draw() {
    const c = this.ctx;
    const t = this.table;
    const s = this.scale;
    const sx = this.shake ? (Math.random() - 0.5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - 0.5) * this.shake : 0;

    c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(this.staticLayer, sx * s, sy * s);
    c.setTransform(s, 0, 0, s, sx * s, sy * s);

    this.drawLights();
    this.drawTargets();
    this.drawBumpers();
    this.drawSpinner();
    this.drawPlunger();
    t.flipperList.forEach((f) => this.drawFlipper(f));
    t.balls.forEach((ball) => this.drawBall(ball));
    this.drawEffects();

    if (this.flash > 0) {
      c.fillStyle = `rgba(255, 0, 127, ${this.flash * 0.3})`;
      c.fillRect(-10, -10, TABLE_W + 20, TABLE_H + 20);
    }
  }

  light(x, y, r, color, on) {
    const c = this.ctx;
    if (on) {
      c.fillStyle = color;
      c.globalAlpha = 0.25;
      c.beginPath();
      c.arc(x, y, r * 1.7, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    c.fillStyle = on ? color : COLORS.dim;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }

  drawLights() {
    const c = this.ctx;
    const t = this.table;
    const pulse = 0.5 + 0.5 * Math.sin(t.time * 8);
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    t.laneSensors.forEach((lane, i) => {
      this.light(lane.x, lane.y, 13, COLORS.cyan, t.lanes[i]);
      c.font = '900 13px Orbitron, sans-serif';
      c.fillStyle = t.lanes[i] ? '#05020c' : '#8a7ab0';
      c.fillText(lane.letter, lane.x, lane.y + 1);
    });

    // Scoop: bright when it will do something
    const scoop = t.scoop;
    const hot = t.lockLit || t.multiball;
    this.light(scoop.x, scoop.y, 17, hot ? COLORS.pink : COLORS.purple, hot && pulse > 0.4);
    c.fillStyle = '#05020c';
    c.beginPath();
    c.arc(scoop.x, scoop.y, 12, 0, Math.PI * 2);
    c.fill();
    c.font = '700 11px Orbitron, sans-serif';
    c.fillStyle = hot ? COLORS.pink : 'rgba(255, 255, 255, 0.45)';
    c.fillText(t.multiball ? 'JACKPOT' : 'LOCK', scoop.x, scoop.y + 31);

    // Lock progress and multiplier ladder
    for (let i = 0; i < 3; i++) this.light(CENTER_X - 24 + i * 24, 600, 7, COLORS.pink, i < t.locks);
    for (let i = 2; i <= MAX_MULT; i++) {
      const x = CENTER_X - 80 + (i - 2) * 40;
      const lit = t.mult >= i;
      this.light(x, 640, 13, COLORS.yellow, lit);
      c.font = '700 11px Orbitron, sans-serif';
      c.fillStyle = lit ? '#05020c' : '#8a7ab0';
      c.fillText(`x${i}`, x, 641);
    }

    // Ball save, between the flippers
    if (t.saveTimer > 0) {
      const blink = t.saveTimer > 3 || pulse > 0.5;
      c.font = '900 13px Orbitron, sans-serif';
      c.fillStyle = blink ? COLORS.green : 'rgba(5, 255, 161, 0.3)';
      c.fillText('BALL SAVE', CENTER_X, 925);
    }
  }

  drawTargets() {
    const c = this.ctx;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '900 13px Orbitron, sans-serif';
    for (const target of this.table.dropTargets) {
      const h = target.by - target.ay;
      c.fillStyle = target.down ? 'rgba(255, 106, 0, 0.14)' : COLORS.orange;
      c.fillRect(target.ax - 5, target.ay + 1, 10, h - 2);
      c.fillStyle = target.down ? 'rgba(255, 255, 255, 0.2)' : '#fff';
      c.fillText(target.letter, target.ax + 16, target.ay + h / 2);
    }
  }

  drawBumpers() {
    const c = this.ctx;
    for (const b of this.table.bumpers) {
      c.fillStyle = b.flash > 0 ? '#fff' : '#3a0a33';
      c.strokeStyle = COLORS.pink;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(b.x, b.y, b.r + b.flash * 3, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = COLORS.cyan;
      c.beginPath();
      c.arc(b.x, b.y, 10, 0, Math.PI * 2);
      c.fill();
    }
  }

  drawSpinner() {
    const c = this.ctx;
    const s = this.table.spinner;
    const open = Math.abs(Math.cos(s.angle * Math.PI));
    const mid = (s.ax + s.bx) / 2;
    const half = ((s.bx - s.ax) / 2 - 5) * open + 1;
    c.strokeStyle = COLORS.green;
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(mid - half, s.y);
    c.lineTo(mid + half, s.y);
    c.stroke();
  }

  drawPlunger() {
    const c = this.ctx;
    const t = this.table;
    const pull = t.charge * 26;
    const top = PLUNGER_Y + BALL_R + 2 + pull;
    c.fillStyle = COLORS.cyan;
    c.fillRect(LANE_X - 9, top, 18, 6);
    c.fillStyle = '#556';
    c.fillRect(LANE_X - 3, top + 6, 6, TABLE_H - top);

    // Charge meter up the lane, and an arrow while a ball is waiting
    if (t.charging) {
      const height = 200 * t.charge;
      c.fillStyle = t.charge >= 1 ? COLORS.green : COLORS.pink;
      c.fillRect(LANE_X - 3, PLUNGER_Y - 26 - height, 6, height);
    } else if (t.plungerBall) {
      const bob = Math.sin(t.time * 6 + performance.now() / 160) * 4;
      c.fillStyle = COLORS.yellow;
      c.beginPath();
      c.moveTo(LANE_X, PLUNGER_Y - 44 + bob);
      c.lineTo(LANE_X - 9, PLUNGER_Y - 28 + bob);
      c.lineTo(LANE_X + 9, PLUNGER_Y - 28 + bob);
      c.fill();
    }
  }

  drawFlipper(f) {
    const c = this.ctx;
    c.lineCap = 'round';
    c.strokeStyle = f.held ? '#fff' : COLORS.cyan;
    c.lineWidth = f.radius * 2;
    c.beginPath();
    c.moveTo(f.px, f.py);
    c.lineTo(f.tipX, f.tipY);
    c.stroke();
    c.strokeStyle = COLORS.pink;
    c.lineWidth = 3;
    c.stroke();
    c.fillStyle = '#05020c';
    c.beginPath();
    c.arc(f.px, f.py, 4, 0, Math.PI * 2);
    c.fill();
  }

  drawBall(ball) {
    const c = this.ctx;
    const trail = ball.trail;
    for (let i = 0; i < trail.length; i += 2) {
      c.fillStyle = `rgba(0, 243, 255, ${0.04 * (i + 1)})`;
      c.beginPath();
      c.arc(trail[i], trail[i + 1], BALL_R * 0.75, 0, Math.PI * 2);
      c.fill();
    }
    const g = c.createRadialGradient(ball.x - 3, ball.y - 4, 1, ball.x, ball.y, BALL_R);
    g.addColorStop(0, '#fff');
    g.addColorStop(0.5, '#b8c8dc');
    g.addColorStop(1, '#46506a');
    c.fillStyle = g;
    c.beginPath();
    c.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    c.fill();
  }

  drawEffects() {
    const c = this.ctx;
    for (const p of this.particles) {
      c.globalAlpha = p.life * 2;
      c.fillStyle = p.color;
      c.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '700 14px Orbitron, sans-serif';
    for (const p of this.popups) {
      c.globalAlpha = Math.min(1, p.life * 2);
      c.fillStyle = p.color;
      c.fillText(p.text, Math.max(50, Math.min(450, p.x)), p.y);
    }
    c.globalAlpha = 1;
  }
}

window.addEventListener('load', () => {
  window.cyberPinball = new PinballGame();
});
