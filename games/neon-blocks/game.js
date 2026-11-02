/**
 * NEON MATRIX BLOCKS // Cyberpunk Tetromino Puzzle
 * Pure Vanilla HTML5 Canvas & Web Audio API
 */

(function () {
  'use strict';

  /* ==========================================================================
     AUDIO SYNTHESIZER CONTROLLER (Procedural Synthwave & Cyber SFX)
     ========================================================================== */
  class SoundController {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.isPlayingMusic = false;
      this.bpm = 132;
      this.step = 0;
      this.timerID = null;
      this.nextBeatTime = 0;
      this.dangerMode = false;
      this.lastDangerBeep = 0;

      // Synthwave Bass Notes (A Minor cyber progression)
      // A1, C2, D2, F1, G1
      this.bassFreqs = [55.0, 55.0, 65.41, 73.42, 43.65, 49.0, 55.0, 65.41];

      // Arpeggio / Lead Notes (Pentatonic A Minor)
      this.leadFreqs = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33];
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
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

    setDanger(isDanger) {
      this.dangerMode = isDanger;
      this.bpm = isDanger ? 148 : 132;
    }

    scheduleBeat() {
      if (!this.isPlayingMusic || !this.ctx) return;
      const stepDuration = 60.0 / (this.bpm * 4); // 16th notes

      while (this.nextBeatTime < this.ctx.currentTime + 0.12) {
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

      // 1. Kick on 0, 4, 8, 12 (Four-on-the-floor)
      if (step % 4 === 0) {
        this.synthKick(time);
      }

      // 2. Snare / Clap on 4 and 12
      if (step === 4 || step === 12) {
        this.synthSnare(time);
      }

      // 3. Hi-Hat on offbeats
      if (step % 2 === 1) {
        this.synthHiHat(time, step % 4 === 2 ? 0.04 : 0.02);
      }

      // 4. Rolling Cyber Bass (16th notes)
      const bassIndex = Math.floor(step / 2) % this.bassFreqs.length;
      let freq = this.bassFreqs[bassIndex];
      if (step % 2 === 1) freq *= 1.5; // Syncopated bounce
      this.synthBass(freq, time, 0.09);

      // 5. Arpeggio lead every 2 steps
      if (step % 2 === 0) {
        const leadIdx = (step + (Math.floor(this.step / 8) * 3)) % this.leadFreqs.length;
        const leadFreq = this.leadFreqs[leadIdx];
        this.synthLead(leadFreq, time, 0.08);
      }
    }

    synthKick(time) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.09);
      gain.gain.setValueAtTime(0.45, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.13);
    }

    synthHiHat(time, dur) {
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 7500;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      whiteNoise.start(time);
    }

    synthSnare(time) {
      // Body oscillator
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.exponentialRampToValueAtTime(70, time + 0.08);
      oscGain.gain.setValueAtTime(0.2, time);
      oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.11);

      // Noise sizzle
      const dur = 0.14;
      const bufferSize = this.ctx.sampleRate * dur;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1400;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, time);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(time);
    }

    synthBass(freq, time, dur) {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(550, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + dur);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + dur + 0.02);
    }

    synthLead(freq, time, dur) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.05, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + dur + 0.01);
    }

    /* SFX Methods */
    playMove() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.035);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.045);
    }

    playRotate() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, t);
      osc.frequency.exponentialRampToValueAtTime(840, t + 0.06);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.075);
    }

    playSoftDrop() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.035);
    }

    playHardDrop() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      // Low boom
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.16);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.19);

      // Laser impact snap
      const snap = this.ctx.createOscillator();
      const snapGain = this.ctx.createGain();
      snap.type = 'sawtooth';
      snap.frequency.setValueAtTime(1400, t);
      snap.frequency.exponentialRampToValueAtTime(200, t + 0.05);
      snapGain.gain.setValueAtTime(0.15, t);
      snapGain.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
      snap.connect(snapGain);
      snapGain.connect(this.ctx.destination);
      snap.start(t);
      snap.stop(t + 0.06);
    }

    playHold() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.setValueAtTime(880, t + 0.05);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.12);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    playLineClear(lines) {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;

      // Chord frequencies for clears
      let notes = [523.25, 659.25]; // Single: C5, E5
      if (lines === 2) notes = [523.25, 659.25, 783.99]; // Double: C5, E5, G5
      if (lines === 3) notes = [523.25, 659.25, 783.99, 1046.50]; // Triple: C5, E5, G5, C6
      if (lines >= 4) notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // Tetris: Full chord

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = lines >= 4 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.035);
        gain.gain.setValueAtTime(lines >= 4 ? 0.18 : 0.14, t + idx * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.035 + (lines >= 4 ? 0.45 : 0.25));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.035);
        osc.stop(t + idx * 0.035 + 0.5);
      });

      // Special Tetris Sub-bass explosion
      if (lines >= 4) {
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(180, t);
        sub.frequency.exponentialRampToValueAtTime(30, t + 0.4);
        subGain.gain.setValueAtTime(0.5, t);
        subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        sub.connect(subGain);
        subGain.connect(this.ctx.destination);
        sub.start(t);
        sub.stop(t + 0.46);
      }
    }

    playTSpin() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.25);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }

    playLevelUp() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const fanNotes = [440, 554.37, 659.25, 880];
      fanNotes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + i * 0.08);
        gain.gain.setValueAtTime(0.12, t + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.08);
        osc.stop(t + i * 0.08 + 0.35);
      });
    }

    playGameOver() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.7);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    }

    playDangerPulse() {
      if (this.muted) return;
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      if (t - this.lastDangerBeep < 1.1) return;
      this.lastDangerBeep = t;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(440, t + 0.08);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  }

  /* ==========================================================================
     TETROMINO DEFINITIONS & SRS (Super Rotation System)
     ========================================================================== */
  const COLS = 10;
  const ROWS = 20;
  const HIDDEN_ROWS = 2; // Rows 0 & 1 hidden above visible matrix
  const TOTAL_ROWS = ROWS + HIDDEN_ROWS;
  const TILE_SIZE = 30; // 300x600 visible playing field

  // Colors & Palettes
  const PIECE_PALETTE = {
    I: { color: '#00f3ff', border: '#70fbff', shadow: 'rgba(0, 243, 255, 0.7)' },
    O: { color: '#ffe600', border: '#fff36b', shadow: 'rgba(255, 230, 0, 0.7)' },
    T: { color: '#a824ff', border: '#cc73ff', shadow: 'rgba(168, 36, 255, 0.7)' },
    S: { color: '#05ffa1', border: '#83ffcf', shadow: 'rgba(5, 255, 161, 0.7)' },
    Z: { color: '#ff007f', border: '#ff70b8', shadow: 'rgba(255, 0, 127, 0.7)' },
    J: { color: '#0066ff', border: '#66a3ff', shadow: 'rgba(0, 102, 255, 0.7)' },
    L: { color: '#ff7700', border: '#ffa34d', shadow: 'rgba(255, 119, 0, 0.7)' }
  };

  // Base 4x4 or 3x3 Matrices (State 0)
  const PIECE_MATRICES = {
    I: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    O: [
      [1, 1],
      [1, 1]
    ],
    T: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    S: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    Z: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    J: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    L: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ]
  };

  // Standard SRS Wall Kick Offsets
  // [JLSTZ] Kick Table: state -> [[dx, dy], ...]
  const JLSTZ_KICKS = {
    '0->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '1->0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '1->2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
    '2->1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
    '2->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
    '3->2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '3->0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
    '0->3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]
  };

  // I-Piece Kick Table
  const I_KICKS = {
    '0->1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '1->0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '1->2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
    '2->1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '2->3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
    '3->2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
    '3->0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
    '0->3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]]
  };

  /* Helper matrix rotations */
  function rotateMatrixClockwise(matrix) {
    const N = matrix.length;
    const result = [];
    for (let r = 0; r < N; r++) {
      result[r] = [];
      for (let c = 0; c < N; c++) {
        result[r][c] = matrix[N - 1 - c][r];
      }
    }
    return result;
  }

  function rotateMatrixCounterClockwise(matrix) {
    const N = matrix.length;
    const result = [];
    for (let r = 0; r < N; r++) {
      result[r] = [];
      for (let c = 0; c < N; c++) {
        result[r][c] = matrix[c][N - 1 - r];
      }
    }
    return result;
  }

  /* ==========================================================================
     PARTICLE & SHOCKWAVE VISUAL FX SYSTEM
     ========================================================================== */
  class Particle {
    constructor(x, y, color, vx, vy, size, life) {
      this.x = x;
      this.y = y;
      this.color = color;
      this.vx = vx;
      this.vy = vy;
      this.size = size;
      this.maxLife = life;
      this.life = life;
    }

    update(dt) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += 450 * dt; // Gravity
      this.life -= dt;
      return this.life > 0;
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
      ctx.restore();
    }
  }

  class Shockwave {
    constructor(x, y, maxRadius, color) {
      this.x = x;
      this.y = y;
      this.radius = 2;
      this.maxRadius = maxRadius;
      this.color = color;
      this.life = 0.35;
      this.maxLife = 0.35;
    }

    update(dt) {
      this.life -= dt;
      this.radius += (this.maxRadius / this.maxLife) * dt;
      return this.life > 0;
    }

    draw(ctx) {
      const alpha = Math.max(0, this.life / this.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha * 0.8;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ==========================================================================
     BACKGROUND MATRIX DIGITAL RAIN
     ========================================================================== */
  class MatrixRain {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.fontSize = 12;
      this.columns = Math.floor(canvas.width / this.fontSize);
      this.drops = [];
      this.chars = '0123456789ABCDEF01アイウエオカキクケコサシスセソタチツテト';

      for (let i = 0; i < this.columns; i++) {
        this.drops[i] = Math.random() * -50;
      }
    }

    updateAndDraw() {
      // Fade previous frame
      this.ctx.fillStyle = 'rgba(4, 2, 10, 0.15)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.font = `${this.fontSize}px 'VT323', monospace`;

      for (let i = 0; i < this.columns; i++) {
        const text = this.chars.charAt(Math.floor(Math.random() * this.chars.length));
        const x = i * this.fontSize;
        const y = this.drops[i] * this.fontSize;

        // Leading tip character is bright cyan/white
        this.ctx.fillStyle = Math.random() > 0.8 ? '#00f3ff' : 'rgba(5, 255, 161, 0.75)';
        this.ctx.fillText(text, x, y);

        if (y > this.canvas.height && Math.random() > 0.975) {
          this.drops[i] = 0;
        }
        this.drops[i] += 0.55;
      }
    }
  }

  /* ==========================================================================
     MAIN GAME LOGIC ENGINE
     ========================================================================== */
  class NeonMatrixBlocks {
    constructor() {
      this.sound = new SoundController();

      // Canvases & Contexts
      this.gameCanvas = document.getElementById('gameCanvas');
      this.ctx = this.gameCanvas.getContext('2d');

      this.bgCanvas = document.getElementById('bgCanvas');
      this.matrixRain = new MatrixRain(this.bgCanvas);

      this.holdCanvas = document.getElementById('holdCanvas');
      this.holdCtx = this.holdCanvas.getContext('2d');

      this.nextCanvas = document.getElementById('nextCanvas');
      this.nextCtx = this.nextCanvas.getContext('2d');

      // Overlays & UI
      this.flashOverlay = document.getElementById('flash-overlay');
      this.dangerOverlay = document.getElementById('danger-overlay');
      this.floatTextLayer = document.getElementById('float-text-layer');
      this.crtOverlay = document.getElementById('crt-overlay');
      this.modalStart = document.getElementById('modal-start');
      this.modalPause = document.getElementById('modal-pause');
      this.modalGameOver = document.getElementById('modal-gameover');
      this.tickerText = document.getElementById('ticker-text');

      // HUD elements
      this.vitalScore = document.getElementById('vital-score');
      this.vitalHigh = document.getElementById('vital-high');
      this.vitalLevel = document.getElementById('vital-level');
      this.vitalLines = document.getElementById('vital-lines');
      this.vitalTimer = document.getElementById('vital-timer');
      this.badgeB2B = document.getElementById('badge-b2b');
      this.badgeCombo = document.getElementById('badge-combo');
      this.modeDisplay = document.getElementById('current-mode-display');
      this.modeSublabel = document.getElementById('mode-stat-label');

      // Stats elements
      this.statTetris = document.getElementById('stat-tetris');
      this.statTSpins = document.getElementById('stat-tspins');
      this.statSingles = document.getElementById('stat-singles');
      this.statDoubles = document.getElementById('stat-doubles');
      this.statTriples = document.getElementById('stat-triples');
      this.statMaxCombo = document.getElementById('stat-max-combo');
      this.statPpm = document.getElementById('stat-ppm');

      // Game Modes: 'marathon', 'sprint', 'ultra'
      this.gameMode = 'marathon';
      this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'

      // Board Grid: [TOTAL_ROWS][COLS] - null or { type, color, border, shadow }
      this.board = [];
      this.initBoard();

      // 7-Bag Randomizer
      this.bag = [];
      this.nextQueue = [];

      // Active & Hold Pieces
      this.currentPiece = null;
      this.holdPieceType = null;
      this.canHold = true;

      // Physics, Lock Delay & Movement
      this.dropCounter = 0;
      this.dropInterval = 1000; // ms per row, scales with level
      this.lockDelay = 500; // ms
      this.lockTimer = 0;
      this.isLocking = false;
      this.lockResets = 0;
      this.maxLockResets = 15;

      // DAS (Delayed Auto Shift) & ARR (Auto Repeat Rate)
      this.keyState = {};
      this.dasDelay = 140; // ms before auto-repeat
      this.arrRate = 32;   // ms per repeat step
      this.dasTimerLeft = 0;
      this.dasTimerRight = 0;
      this.softDropActive = false;

      // Scoring, Combo, Leveling
      this.score = 0;
      this.highScore = 0;
      this.lines = 0;
      this.level = 1;
      this.combo = -1;
      this.maxCombo = 0;
      this.backToBack = false;
      this.piecesPlaced = 0;
      this.gameStartTime = 0;
      this.elapsedTime = 0;
      this.ultraRemaining = 120; // 2 minutes for Ultra mode
      this.sprintTarget = 40;     // 40 lines for Sprint mode

      // Stats counters
      this.countSingles = 0;
      this.countDoubles = 0;
      this.countTriples = 0;
      this.countTetrises = 0;
      this.countTSpins = 0;

      // Visual effects
      this.particles = [];
      this.shockwaves = [];
      this.shakeDuration = 0;
      this.shakeIntensity = 0;
      this.lineClearAnimation = null; // { rows: [], timer: 0.3 }

      // Last piece maneuver (for T-Spin detection)
      this.lastActionWasRotate = false;

      // Animation frame tracking
      this.lastTime = 0;

      this.loadHighScores();
      this.bindInputs();
      this.bindButtons();

      // Start rendering loop immediately (background rain & menu state)
      requestAnimationFrame((t) => this.loop(t));
    }

    initBoard() {
      this.board = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) {
          row.push(null);
        }
        this.board.push(row);
      }
    }

    loadHighScores() {
      try {
        const saved = localStorage.getItem('neon_blocks_highscore_' + this.gameMode);
        this.highScore = saved ? parseInt(saved, 10) : 0;
        this.vitalHigh.textContent = this.formatScore(this.highScore);
      } catch (e) {
        this.highScore = 0;
      }
    }

    saveHighScore() {
      try {
        if (this.gameMode === 'sprint') {
          // In sprint mode, lower time is better
          const currentBest = localStorage.getItem('neon_blocks_sprint_time');
          if (!currentBest || this.elapsedTime < parseFloat(currentBest)) {
            localStorage.setItem('neon_blocks_sprint_time', this.elapsedTime.toString());
            return true;
          }
          return false;
        } else {
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neon_blocks_highscore_' + this.gameMode, this.highScore.toString());
            this.vitalHigh.textContent = this.formatScore(this.highScore);
            return true;
          }
          return false;
        }
      } catch (e) {
        return false;
      }
    }

    formatScore(num) {
      return num.toString().padStart(6, '0');
    }

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      const millis = Math.floor((seconds * 100) % 100);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millis.toString().padStart(2, '0')}`;
    }

    /* ==========================================================================
       7-BAG RANDOMIZER & QUEUE
       ========================================================================== */
    refillBag() {
      const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      // Fisher-Yates shuffle
      for (let i = types.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [types[i], types[j]] = [types[j], types[i]];
      }
      this.bag.push(...types);
    }

    getNextPieceType() {
      while (this.bag.length < 7) {
        this.refillBag();
      }
      return this.bag.shift();
    }

    populateQueue() {
      while (this.nextQueue.length < 5) {
        this.nextQueue.push(this.getNextPieceType());
      }
    }

    spawnPiece(typeToSpawn = null) {
      const type = typeToSpawn || this.nextQueue.shift();
      this.populateQueue();

      const matrix = PIECE_MATRICES[type].map(row => [...row]);
      // Center piece at top
      const colOffset = Math.floor((COLS - matrix[0].length) / 2);
      // Row 0 or 1 so it spawns neatly at the edge of the visible field
      const rowOffset = type === 'I' ? 0 : (type === 'O' ? 1 : 1);

      this.currentPiece = {
        type: type,
        matrix: matrix,
        rotation: 0, // 0, 1, 2, 3
        col: colOffset,
        row: rowOffset,
        palette: PIECE_PALETTE[type]
      };

      this.canHold = true;
      this.isLocking = false;
      this.lockTimer = 0;
      this.lockResets = 0;
      this.lastActionWasRotate = false;

      // Game Over check: if newly spawned piece collides immediately
      if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.col, this.currentPiece.row)) {
        this.triggerGameOver('MATRIX OVERFLOW');
      }

      this.renderNextQueue();
    }

    /* ==========================================================================
       PIECE COLLISION & ROTATION LOGIC (SRS)
       ========================================================================== */
    checkCollision(matrix, col, row) {
      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            const boardC = col + c;
            const boardR = row + r;

            // Boundaries
            if (boardC < 0 || boardC >= COLS || boardR >= TOTAL_ROWS) {
              return true;
            }

            // Existing locked block
            if (boardR >= 0 && this.board[boardR][boardC] !== null) {
              return true;
            }
          }
        }
      }
      return false;
    }

    rotatePiece(clockwise = true) {
      if (!this.currentPiece) return false;
      const piece = this.currentPiece;
      if (piece.type === 'O') return false; // O piece does not rotate

      const oldRot = piece.rotation;
      const newRot = clockwise ? (oldRot + 1) % 4 : (oldRot + 3) % 4;
      const rotatedMatrix = clockwise
        ? rotateMatrixClockwise(piece.matrix)
        : rotateMatrixCounterClockwise(piece.matrix);

      const kickKey = `${oldRot}->${newRot}`;
      const kickTable = piece.type === 'I' ? I_KICKS[kickKey] : JLSTZ_KICKS[kickKey];

      // Test all standard SRS kick offsets
      if (kickTable) {
        for (let i = 0; i < kickTable.length; i++) {
          const [dx, dy] = kickTable[i];
          const testCol = piece.col + dx;
          const testRow = piece.row - dy; // In SRS y goes up, but canvas y goes down

          if (!this.checkCollision(rotatedMatrix, testCol, testRow)) {
            piece.matrix = rotatedMatrix;
            piece.rotation = newRot;
            piece.col = testCol;
            piece.row = testRow;
            this.lastActionWasRotate = true;

            // Reset lock delay if active
            this.handleLockDelayReset();
            this.sound.playRotate();
            return true;
          }
        }
      }
      return false;
    }

    movePiece(dx) {
      if (!this.currentPiece) return false;
      const piece = this.currentPiece;
      if (!this.checkCollision(piece.matrix, piece.col + dx, piece.row)) {
        piece.col += dx;
        this.lastActionWasRotate = false;
        this.handleLockDelayReset();
        this.sound.playMove();
        return true;
      }
      return false;
    }

    softDrop() {
      if (!this.currentPiece) return false;
      const piece = this.currentPiece;
      if (!this.checkCollision(piece.matrix, piece.col, piece.row + 1)) {
        piece.row += 1;
        this.score += 1; // Soft drop award
        this.vitalScore.textContent = this.formatScore(this.score);
        this.dropCounter = 0;
        this.lastActionWasRotate = false;
        this.sound.playSoftDrop();
        return true;
      } else {
        // Resting on ground
        this.isLocking = true;
      }
      return false;
    }

    hardDrop() {
      if (!this.currentPiece) return;
      const piece = this.currentPiece;
      let dropDistance = 0;

      while (!this.checkCollision(piece.matrix, piece.col, piece.row + 1)) {
        piece.row += 1;
        dropDistance += 1;
      }

      this.score += dropDistance * 2; // Hard drop award (2 pts per cell)
      this.vitalScore.textContent = this.formatScore(this.score);

      // Impact Shockwave & Shake
      const impactX = (piece.col + piece.matrix[0].length / 2) * TILE_SIZE;
      const impactY = (piece.row + piece.matrix.length - HIDDEN_ROWS) * TILE_SIZE;
      this.shockwaves.push(new Shockwave(impactX, impactY, 50, piece.palette.color));
      this.triggerScreenShake(7, 0.16);

      // White flash drop line
      this.spawnDropParticles(piece);

      this.sound.playHardDrop();
      this.lockPiece();
    }

    hold() {
      if (!this.canHold || !this.currentPiece) return;
      this.sound.playHold();
      const currentType = this.currentPiece.type;

      if (this.holdPieceType === null) {
        this.holdPieceType = currentType;
        this.spawnPiece();
      } else {
        const nextType = this.holdPieceType;
        this.holdPieceType = currentType;
        this.spawnPiece(nextType);
      }

      this.canHold = false;
      this.renderHoldPiece();
    }

    handleLockDelayReset() {
      if (this.isLocking && this.lockResets < this.maxLockResets) {
        this.lockTimer = 0;
        this.lockResets++;
      }
    }

    /* Calculate Ghost Piece position */
    getGhostPiece() {
      if (!this.currentPiece) return null;
      const piece = this.currentPiece;
      let ghostRow = piece.row;

      while (!this.checkCollision(piece.matrix, piece.col, ghostRow + 1)) {
        ghostRow++;
      }

      return {
        matrix: piece.matrix,
        col: piece.col,
        row: ghostRow,
        palette: piece.palette
      };
    }

    /* ==========================================================================
       LOCK PIECE, T-SPIN EVALUATION & LINE CLEARING
       ========================================================================== */
    lockPiece() {
      if (!this.currentPiece) return;
      const piece = this.currentPiece;

      // Check for T-Spin before committing to board
      const isTSpin = this.checkTSpin(piece);

      // Commit blocks to board
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[r].length; c++) {
          if (piece.matrix[r][c]) {
            const boardC = piece.col + c;
            const boardR = piece.row + r;
            if (boardR >= 0 && boardR < TOTAL_ROWS && boardC >= 0 && boardC < COLS) {
              this.board[boardR][boardC] = {
                type: piece.type,
                color: piece.palette.color,
                border: piece.palette.border,
                shadow: piece.palette.shadow
              };
            }
          }
        }
      }

      this.piecesPlaced++;
      this.currentPiece = null;
      this.isLocking = false;
      this.lockTimer = 0;

      // Check line clears
      this.processLineClears(isTSpin);
    }

    checkTSpin(piece) {
      if (piece.type !== 'T' || !this.lastActionWasRotate) return false;

      // T-piece center is at (piece.col + 1, piece.row + 1)
      const centerX = piece.col + 1;
      const centerY = piece.row + 1;

      // Check 4 diagonal corners
      const corners = [
        [centerX - 1, centerY - 1], // Top-Left
        [centerX + 1, centerY - 1], // Top-Right
        [centerX - 1, centerY + 1], // Bottom-Left
        [centerX + 1, centerY + 1]  // Bottom-Right
      ];

      let occupiedCorners = 0;
      for (const [cx, cy] of corners) {
        if (cx < 0 || cx >= COLS || cy >= TOTAL_ROWS || (cy >= 0 && this.board[cy][cx] !== null)) {
          occupiedCorners++;
        }
      }

      return occupiedCorners >= 3;
    }

    processLineClears(isTSpin) {
      const fullRows = [];
      for (let r = 0; r < TOTAL_ROWS; r++) {
        let isFull = true;
        for (let c = 0; c < COLS; c++) {
          if (this.board[r][c] === null) {
            isFull = false;
            break;
          }
        }
        if (isFull) {
          fullRows.push(r);
        }
      }

      const linesCleared = fullRows.length;

      if (linesCleared > 0) {
        this.combo++;
        if (this.combo > this.maxCombo) {
          this.maxCombo = this.combo;
          this.statMaxCombo.textContent = this.maxCombo;
        }

        // Animate line clears
        this.lineClearAnimation = {
          rows: fullRows,
          timer: 0.22,
          maxTimer: 0.22
        };

        // Spawn glowing particles across rows
        fullRows.forEach(rowIdx => {
          for (let c = 0; c < COLS; c++) {
            const cell = this.board[rowIdx][c];
            const color = cell ? cell.color : '#00f3ff';
            const px = c * TILE_SIZE + TILE_SIZE / 2;
            const py = (rowIdx - HIDDEN_ROWS) * TILE_SIZE + TILE_SIZE / 2;
            for (let p = 0; p < 4; p++) {
              const vx = (Math.random() - 0.5) * 350;
              const vy = (Math.random() - 0.7) * 300;
              this.particles.push(new Particle(px, py, color, vx, vy, Math.random() * 4 + 2, 0.45));
            }
          }
        });

        // Flash screen subtly on 4-line Tetris
        if (linesCleared >= 4) {
          this.triggerFlash();
          this.triggerScreenShake(12, 0.25);
        }

        this.sound.playLineClear(linesCleared);

        // Remove lines from board after animation
        setTimeout(() => {
          this.executeRowCollapse(fullRows);
          this.evaluateScore(linesCleared, isTSpin);
          this.checkBoardDanger();
          this.spawnPiece();
        }, 220);

      } else {
        // Reset combo if no lines cleared
        this.combo = -1;
        this.badgeCombo.classList.remove('active');
        this.badgeCombo.textContent = 'COMBO x0';

        if (isTSpin) {
          this.sound.playTSpin();
          this.showFloatMessage('T-SPIN!', '#a824ff');
          this.countTSpins++;
          this.statTSpins.textContent = this.countTSpins;
          this.score += 400 * this.level;
          this.vitalScore.textContent = this.formatScore(this.score);
        }

        this.checkBoardDanger();
        this.spawnPiece();
      }
    }

    executeRowCollapse(fullRows) {
      // Sort rows descending
      fullRows.sort((a, b) => b - a);

      fullRows.forEach(r => {
        this.board.splice(r, 1);
        // Add new empty row at very top
        const newRow = [];
        for (let c = 0; c < COLS; c++) newRow.push(null);
        this.board.unshift(newRow);
      });

      this.lineClearAnimation = null;
    }

    evaluateScore(linesCleared, isTSpin) {
      let basePoints = 0;
      let isDifficult = false;
      let textMsg = '';
      let msgColor = '#00f3ff';

      if (isTSpin) {
        this.countTSpins++;
        this.statTSpins.textContent = this.countTSpins;
        isDifficult = true;
        if (linesCleared === 1) {
          basePoints = 800;
          textMsg = 'T-SPIN SINGLE!';
          msgColor = '#a824ff';
        } else if (linesCleared === 2) {
          basePoints = 1200;
          textMsg = 'T-SPIN DOUBLE!';
          msgColor = '#a824ff';
        } else if (linesCleared >= 3) {
          basePoints = 1600;
          textMsg = 'T-SPIN TRIPLE!';
          msgColor = '#a824ff';
        }
      } else {
        if (linesCleared === 1) {
          basePoints = 100;
          textMsg = 'SINGLE';
          this.countSingles++;
          this.statSingles.textContent = this.countSingles;
        } else if (linesCleared === 2) {
          basePoints = 300;
          textMsg = 'DOUBLE';
          this.countDoubles++;
          this.statDoubles.textContent = this.countDoubles;
        } else if (linesCleared === 3) {
          basePoints = 500;
          textMsg = 'TRIPLE';
          this.countTriples++;
          this.statTriples.textContent = this.countTriples;
        } else if (linesCleared >= 4) {
          basePoints = 800;
          textMsg = 'TETRIS!';
          msgColor = '#00f3ff';
          isDifficult = true;
          this.countTetrises++;
          this.statTetris.textContent = this.countTetrises;
        }
      }

      // Back-to-Back bonus calculation (1.5x)
      if (isDifficult) {
        if (this.backToBack) {
          basePoints = Math.floor(basePoints * 1.5);
          textMsg = 'B2B ' + textMsg;
          msgColor = '#ff007f';
          this.badgeB2B.classList.add('active');
        } else {
          this.backToBack = true;
          this.badgeB2B.classList.add('active');
        }
      } else {
        this.backToBack = false;
        this.badgeB2B.classList.remove('active');
      }

      // Combo Bonus
      let comboBonus = 0;
      if (this.combo > 0) {
        comboBonus = 50 * this.combo * this.level;
        this.badgeCombo.classList.add('active');
        this.badgeCombo.textContent = `COMBO x${this.combo}`;
        textMsg += ` (x${this.combo})`;
      }

      // Check Perfect Clear (Board completely empty)
      let isPerfectClear = true;
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.board[r][c] !== null) {
            isPerfectClear = false;
            break;
          }
        }
        if (!isPerfectClear) break;
      }

      if (isPerfectClear) {
        const pcBonus = 3500 * this.level;
        this.score += pcBonus;
        textMsg = '★ PERFECT CLEAR ★';
        msgColor = '#ffe600';
        this.showFloatMessage(textMsg, msgColor);
      }

      // Award Points
      const earned = (basePoints * this.level) + comboBonus;
      this.score += earned;
      this.lines += linesCleared;

      this.vitalScore.textContent = this.formatScore(this.score);
      this.vitalLines.textContent = this.lines;

      this.showFloatMessage(textMsg, msgColor);

      // Level progression (Marathon mode: level up every 10 lines)
      if (this.gameMode === 'marathon') {
        const targetLevel = Math.min(15, Math.floor(this.lines / 10) + 1);
        if (targetLevel > this.level) {
          this.level = targetLevel;
          this.vitalLevel.textContent = this.level;
          this.dropInterval = Math.max(80, 1000 * Math.pow(0.85 - (this.level - 1) * 0.007, this.level - 1));
          this.sound.playLevelUp();
          this.showFloatMessage(`LEVEL UP! [LVL ${this.level}]`, '#ffe600');
        }
      }

      // Sprint mode victory condition (40 lines)
      if (this.gameMode === 'sprint' && this.lines >= this.sprintTarget) {
        this.triggerVictory();
      }
    }

    checkBoardDanger() {
      // Find highest occupied row
      let highestRow = TOTAL_ROWS;
      for (let r = 0; r < TOTAL_ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.board[r][c] !== null) {
            highestRow = r;
            break;
          }
        }
        if (highestRow < TOTAL_ROWS) break;
      }

      // If blocks are in top 5 visible rows (r <= HIDDEN_ROWS + 5)
      const inDanger = highestRow <= HIDDEN_ROWS + 5;
      if (inDanger) {
        this.dangerOverlay.classList.add('active');
        this.sound.setDanger(true);
        this.sound.playDangerPulse();
      } else {
        this.dangerOverlay.classList.remove('active');
        this.sound.setDanger(false);
      }
    }

    /* ==========================================================================
       VISUAL EFFECTS & OVERLAYS
       ========================================================================== */
    triggerFlash() {
      this.flashOverlay.classList.add('active');
      setTimeout(() => {
        this.flashOverlay.classList.remove('active');
      }, 90);
    }

    triggerScreenShake(intensity, duration) {
      this.shakeIntensity = intensity;
      this.shakeDuration = duration;
    }

    showFloatMessage(text, color) {
      const msg = document.createElement('div');
      msg.className = 'float-msg';
      msg.textContent = text;
      msg.style.color = color;
      msg.style.textShadow = `0 0 10px ${color}`;
      msg.style.top = '40%';
      this.floatTextLayer.appendChild(msg);

      setTimeout(() => {
        if (msg.parentNode) msg.parentNode.removeChild(msg);
      }, 1250);
    }

    spawnDropParticles(piece) {
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[r].length; c++) {
          if (piece.matrix[r][c]) {
            const px = (piece.col + c) * TILE_SIZE + TILE_SIZE / 2;
            const py = (piece.row + r - HIDDEN_ROWS) * TILE_SIZE + TILE_SIZE / 2;
            for (let i = 0; i < 3; i++) {
              const vx = (Math.random() - 0.5) * 120;
              const vy = -(Math.random() * 120 + 20);
              this.particles.push(new Particle(px, py, piece.palette.color, vx, vy, 3, 0.28));
            }
          }
        }
      }
    }

    /* ==========================================================================
       CANVAS RENDERING
       ========================================================================== */
    drawBlock(ctx, x, y, size, palette, isGhost = false) {
      ctx.save();

      if (isGhost) {
        // Holographic Ghost Wireframe
        ctx.strokeStyle = palette.color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = palette.color;
        ctx.shadowBlur = 6;
        ctx.strokeRect(x + 1.5, y + 1.5, size - 3, size - 3);

        ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      } else {
        // Cyberpunk Glowing Block with Bevels & Core
        ctx.shadowColor = palette.shadow || palette.color;
        ctx.shadowBlur = 10;

        // Base fill
        ctx.fillStyle = palette.color;
        ctx.fillRect(x + 1, y + 1, size - 2, size - 2);

        // Inner beveled highlight
        ctx.strokeStyle = palette.border || '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, size - 4, size - 4);

        // Core jewel highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(x + 4, y + 4, size / 3, size / 3);

        // Dark corner accent
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(x + size - 8, y + size - 8, 6, 6);
      }

      ctx.restore();
    }

    render() {
      const ctx = this.ctx;
      const width = this.gameCanvas.width;
      const height = this.gameCanvas.height;

      ctx.save();

      // Screen Shake translation
      if (this.shakeDuration > 0) {
        const dx = (Math.random() - 0.5) * this.shakeIntensity;
        const dy = (Math.random() - 0.5) * this.shakeIntensity;
        ctx.translate(dx, dy);
      }

      // Clear main canvas (transparent so matrix rain shines through slightly)
      ctx.clearRect(0, 0, width, height);

      // Subtle Grid Lines
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(c * TILE_SIZE, 0);
        ctx.lineTo(c * TILE_SIZE, height);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(0, r * TILE_SIZE);
        ctx.lineTo(width, r * TILE_SIZE);
        ctx.stroke();
      }

      // Draw Locked Blocks on Board
      for (let r = HIDDEN_ROWS; r < TOTAL_ROWS; r++) {
        const renderY = (r - HIDDEN_ROWS) * TILE_SIZE;
        for (let c = 0; c < COLS; c++) {
          const cell = this.board[r][c];
          if (cell) {
            this.drawBlock(ctx, c * TILE_SIZE, renderY, TILE_SIZE, cell, false);
          }
        }
      }

      // Line Clear Laser Animation
      if (this.lineClearAnimation) {
        const progress = 1 - (this.lineClearAnimation.timer / this.lineClearAnimation.maxTimer);
        this.lineClearAnimation.rows.forEach(r => {
          const py = (r - HIDDEN_ROWS) * TILE_SIZE;
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 18;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(0, py, width, TILE_SIZE);

          // Central laser beam
          ctx.fillStyle = '#00f3ff';
          ctx.fillRect(0, py + TILE_SIZE / 2 - 2, width, 4);
          ctx.restore();
        });
      }

      // Draw Ghost Piece Projection
      if (this.currentPiece && !this.lineClearAnimation) {
        const ghost = this.getGhostPiece();
        if (ghost && ghost.row !== this.currentPiece.row) {
          for (let r = 0; r < ghost.matrix.length; r++) {
            for (let c = 0; c < ghost.matrix[r].length; c++) {
              if (ghost.matrix[r][c]) {
                const renderR = ghost.row + r - HIDDEN_ROWS;
                if (renderR >= 0) {
                  this.drawBlock(ctx, (ghost.col + c) * TILE_SIZE, renderR * TILE_SIZE, TILE_SIZE, ghost.palette, true);
                }
              }
            }
          }
        }
      }

      // Draw Active Falling Piece
      if (this.currentPiece && !this.lineClearAnimation) {
        const piece = this.currentPiece;
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[r].length; c++) {
            if (piece.matrix[r][c]) {
              const renderR = piece.row + r - HIDDEN_ROWS;
              if (renderR >= 0) {
                this.drawBlock(ctx, (piece.col + c) * TILE_SIZE, renderR * TILE_SIZE, TILE_SIZE, piece.palette, false);
              }
            }
          }
        }
      }

      // Draw Shockwaves
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const sw = this.shockwaves[i];
        sw.draw(ctx);
      }

      // Draw Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.draw(ctx);
      }

      ctx.restore();
    }

    renderHoldPiece() {
      const ctx = this.holdCtx;
      const w = this.holdCanvas.width;
      const h = this.holdCanvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!this.holdPieceType) return;

      const type = this.holdPieceType;
      const matrix = PIECE_MATRICES[type];
      const palette = PIECE_PALETTE[type];
      const tileSize = 20;

      const offsetX = (w - matrix[0].length * tileSize) / 2;
      const offsetY = (h - matrix.length * tileSize) / 2;

      for (let r = 0; r < matrix.length; r++) {
        for (let c = 0; c < matrix[r].length; c++) {
          if (matrix[r][c]) {
            this.drawBlock(ctx, offsetX + c * tileSize, offsetY + r * tileSize, tileSize, palette, !this.canHold);
          }
        }
      }
    }

    renderNextQueue() {
      const ctx = this.nextCtx;
      const w = this.nextCanvas.width;
      const h = this.nextCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const count = Math.min(3, this.nextQueue.length);
      const slotHeight = h / count;
      const tileSize = 18;

      for (let i = 0; i < count; i++) {
        const type = this.nextQueue[i];
        const matrix = PIECE_MATRICES[type];
        const palette = PIECE_PALETTE[type];

        const offsetX = (w - matrix[0].length * tileSize) / 2;
        const offsetY = i * slotHeight + (slotHeight - matrix.length * tileSize) / 2;

        for (let r = 0; r < matrix.length; r++) {
          for (let c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c]) {
              this.drawBlock(ctx, offsetX + c * tileSize, offsetY + r * tileSize, tileSize, palette, false);
            }
          }
        }
      }
    }

    /* ==========================================================================
       MAIN GAME LOOP & UPDATE
       ========================================================================== */
    update(dt) {
      if (this.state !== 'PLAYING') return;

      // Update Timer
      this.elapsedTime += dt;
      if (this.gameMode === 'ultra') {
        this.ultraRemaining = Math.max(0, this.ultraRemaining - dt);
        this.vitalTimer.textContent = this.formatTime(this.ultraRemaining);
        if (this.ultraRemaining <= 0) {
          this.triggerGameOver('TIME ELAPSED');
          return;
        }
      } else {
        this.vitalTimer.textContent = this.formatTime(this.elapsedTime);
      }

      // Update Pieces Per Minute (PPM)
      if (this.elapsedTime > 2) {
        const ppm = Math.floor((this.piecesPlaced / this.elapsedTime) * 60);
        this.statPpm.textContent = ppm;
      }

      // Screen shake decay
      if (this.shakeDuration > 0) {
        this.shakeDuration -= dt;
      }

      // Update particles & shockwaves
      for (let i = this.particles.length - 1; i >= 0; i--) {
        if (!this.particles[i].update(dt)) {
          this.particles.splice(i, 1);
        }
      }
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        if (!this.shockwaves[i].update(dt)) {
          this.shockwaves.splice(i, 1);
        }
      }

      // Update line clear animation
      if (this.lineClearAnimation) {
        this.lineClearAnimation.timer -= dt;
        return; // Pause falling during laser clear flash
      }

      // Handle Key Hold DAS & ARR
      this.handleAutoRepeat(dt);

      // Handle Falling Gravity
      this.dropCounter += dt * 1000;
      const currentInterval = this.softDropActive ? Math.min(50, this.dropInterval / 8) : this.dropInterval;

      if (this.dropCounter >= currentInterval) {
        this.dropCounter = 0;
        if (this.currentPiece) {
          if (!this.checkCollision(this.currentPiece.matrix, this.currentPiece.col, this.currentPiece.row + 1)) {
            this.currentPiece.row += 1;
            this.lastActionWasRotate = false;
          } else {
            this.isLocking = true;
          }
        }
      }

      // Handle Lock Delay
      if (this.isLocking && this.currentPiece) {
        // Double check if piece is truly resting
        if (this.checkCollision(this.currentPiece.matrix, this.currentPiece.col, this.currentPiece.row + 1)) {
          this.lockTimer += dt * 1000;
          if (this.lockTimer >= this.lockDelay) {
            this.lockPiece();
          }
        } else {
          // No longer resting
          this.isLocking = false;
          this.lockTimer = 0;
        }
      }
    }

    handleAutoRepeat(dt) {
      const dtMs = dt * 1000;

      // Left Move DAS
      if (this.keyState['ArrowLeft'] || this.keyState['KeyA']) {
        this.dasTimerLeft += dtMs;
        if (this.dasTimerLeft > this.dasDelay) {
          this.movePiece(-1);
          this.dasTimerLeft -= this.arrRate;
        }
      } else {
        this.dasTimerLeft = 0;
      }

      // Right Move DAS
      if (this.keyState['ArrowRight'] || this.keyState['KeyD']) {
        this.dasTimerRight += dtMs;
        if (this.dasTimerRight > this.dasDelay) {
          this.movePiece(1);
          this.dasTimerRight -= this.arrRate;
        }
      } else {
        this.dasTimerRight = 0;
      }
    }

    loop(currentTime) {
      if (!this.lastTime) this.lastTime = currentTime;
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // cap max dt
      this.lastTime = currentTime;

      // Always update and render ambient matrix rain in background
      this.matrixRain.updateAndDraw();

      this.update(dt);
      this.render();

      requestAnimationFrame((t) => this.loop(t));
    }

    /* ==========================================================================
       GAME STATE TRANSITIONS
       ========================================================================== */
    startGame() {
      this.sound.init();
      this.sound.startMusic();

      this.initBoard();
      this.bag = [];
      this.nextQueue = [];
      this.holdPieceType = null;
      this.canHold = true;

      this.score = 0;
      this.lines = 0;
      this.level = 1;
      this.combo = -1;
      this.maxCombo = 0;
      this.backToBack = false;
      this.piecesPlaced = 0;
      this.elapsedTime = 0;
      this.ultraRemaining = 120;
      this.dropCounter = 0;
      this.dropInterval = 1000;

      this.countSingles = 0;
      this.countDoubles = 0;
      this.countTriples = 0;
      this.countTetrises = 0;
      this.countTSpins = 0;

      // Reset HUD
      this.vitalScore.textContent = '000000';
      this.vitalLevel.textContent = '1';
      this.vitalLines.textContent = '0';
      this.vitalTimer.textContent = '00:00.0';
      this.badgeB2B.classList.remove('active');
      this.badgeCombo.classList.remove('active');
      this.dangerOverlay.classList.remove('active');

      this.statTetris.textContent = '0';
      this.statTSpins.textContent = '0';
      this.statSingles.textContent = '0';
      this.statDoubles.textContent = '0';
      this.statTriples.textContent = '0';
      this.statMaxCombo.textContent = '0';
      this.statPpm.textContent = '0';

      this.loadHighScores();

      // Set Mode display
      if (this.gameMode === 'marathon') {
        this.modeDisplay.textContent = 'MARATHON';
        this.modeSublabel.textContent = 'ENDLESS // LEVEL 15';
      } else if (this.gameMode === 'sprint') {
        this.modeDisplay.textContent = 'SPRINT 40L';
        this.modeSublabel.textContent = 'TARGET: 40 LINES';
      } else if (this.gameMode === 'ultra') {
        this.modeDisplay.textContent = 'ULTRA 2MIN';
        this.modeSublabel.textContent = 'TARGET: HIGH SCORE';
      }

      this.modalStart.classList.remove('active');
      this.modalPause.classList.remove('active');
      this.modalGameOver.classList.remove('active');

      this.state = 'PLAYING';
      this.populateQueue();
      this.spawnPiece();
      this.renderHoldPiece();
    }

    pauseGame() {
      if (this.state === 'PLAYING') {
        this.state = 'PAUSED';
        this.modalPause.classList.add('active');
        document.getElementById('pause-icon').textContent = '▶';
        this.tickerText.textContent = 'SYSTEM PAUSED // CYCLE SUSPENDED';
      } else if (this.state === 'PAUSED') {
        this.resumeGame();
      }
    }

    resumeGame() {
      if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        this.modalPause.classList.remove('active');
        document.getElementById('pause-icon').textContent = '⏸';
        this.tickerText.textContent = 'SYSTEM RESUMED // SRS ROTATION ONLINE';
      }
    }

    triggerGameOver(reason) {
      this.state = 'GAMEOVER';
      this.sound.playGameOver();
      this.sound.stopMusic();

      const isNewRecord = this.saveHighScore();

      document.getElementById('go-badge').textContent = reason;
      document.getElementById('go-title').textContent = 'CYCLE TERMINATED';
      document.getElementById('go-score').textContent = this.formatScore(this.score);
      document.getElementById('go-high').textContent = this.formatScore(this.highScore);
      document.getElementById('go-lines').textContent = this.lines;
      document.getElementById('go-level').textContent = this.level;
      document.getElementById('go-time').textContent = this.formatTime(this.elapsedTime);
      document.getElementById('go-tetris').textContent = this.countTetrises;

      const recordBanner = document.getElementById('go-new-record');
      if (isNewRecord) {
        recordBanner.classList.add('active');
      } else {
        recordBanner.classList.remove('active');
      }

      this.modalGameOver.classList.add('active');
      this.tickerText.textContent = `SYSTEM HALTED // FINAL SCORE: ${this.score} // RECORD: ${this.highScore}`;
    }

    triggerVictory() {
      this.state = 'GAMEOVER';
      this.sound.playLevelUp();
      this.sound.stopMusic();

      const isNewRecord = this.saveHighScore();

      document.getElementById('go-badge').textContent = 'MISSION COMPLETE';
      document.getElementById('go-title').textContent = 'SPRINT VICTORY!';
      document.getElementById('go-score').textContent = this.formatScore(this.score);
      document.getElementById('go-high').textContent = this.formatTime(this.elapsedTime);
      document.getElementById('go-lines').textContent = this.lines;
      document.getElementById('go-level').textContent = this.level;
      document.getElementById('go-time').textContent = this.formatTime(this.elapsedTime);
      document.getElementById('go-tetris').textContent = this.countTetrises;

      const recordBanner = document.getElementById('go-new-record');
      if (isNewRecord) {
        recordBanner.classList.add('active');
      } else {
        recordBanner.classList.remove('active');
      }

      this.modalGameOver.classList.add('active');
    }

    /* ==========================================================================
       USER INPUT HANDLING (KEYBOARD & TOUCH)
       ========================================================================== */
    bindInputs() {
      // Don't run on while the phone is locked, or behind the rotate prompt
      const pauseIfPlaying = () => {
        if (this.state === 'PLAYING') this.pauseGame();
      };
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pauseIfPlaying();
      });
      window.matchMedia('(orientation: landscape)').addEventListener('change', (e) => {
        if (e.matches) pauseIfPlaying();
      });

      window.addEventListener('keydown', (e) => {
        // Prevent window scrolling on arrow keys and space
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
          e.preventDefault();
        }

        // Toggle Audio on M
        if (e.code === 'KeyM') {
          const isMuted = this.sound.toggleMute();
          document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
          return;
        }

        // Toggle Scanlines on C (if paused or menu)
        if (e.code === 'KeyC' && this.state !== 'PLAYING') {
          this.crtOverlay.classList.toggle('active');
          return;
        }

        // Pause on P or Escape
        if (e.code === 'KeyP' || e.code === 'Escape') {
          this.pauseGame();
          return;
        }

        // Restart on R
        if (e.code === 'KeyR' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
          this.startGame();
          return;
        }

        if (this.state !== 'PLAYING') return;

        // Immediate first press actions
        if (!this.keyState[e.code]) {
          this.keyState[e.code] = true;

          switch (e.code) {
            case 'ArrowLeft':
            case 'KeyA':
              this.movePiece(-1);
              break;
            case 'ArrowRight':
            case 'KeyD':
              this.movePiece(1);
              break;
            case 'ArrowUp':
            case 'KeyW':
            case 'KeyX':
              this.rotatePiece(true); // Clockwise
              break;
            case 'KeyZ':
            case 'ControlLeft':
            case 'ControlRight':
              this.rotatePiece(false); // Counter-Clockwise
              break;
            case 'ArrowDown':
            case 'KeyS':
              this.softDropActive = true;
              this.softDrop();
              break;
            case 'Space':
              this.hardDrop();
              break;
            case 'KeyC':
            case 'ShiftLeft':
            case 'ShiftRight':
              this.hold();
              break;
          }
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keyState[e.code] = false;
        if (e.code === 'ArrowDown' || e.code === 'KeyS') {
          this.softDropActive = false;
        }
      });
    }

    bindButtons() {
      // Audio toggle button
      document.getElementById('btn-audio-toggle').addEventListener('click', () => {
        const isMuted = this.sound.toggleMute();
        document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
      });

      // CRT scanlines toggle
      document.getElementById('btn-crt-toggle').addEventListener('click', (e) => {
        this.crtOverlay.classList.toggle('active');
        e.currentTarget.classList.toggle('active');
      });

      // Pause button
      document.getElementById('btn-pause').addEventListener('click', () => {
        this.pauseGame();
      });

      // Start modal mode selectors
      document.querySelectorAll('.mode-option').forEach(opt => {
        opt.addEventListener('click', () => {
          document.querySelectorAll('.mode-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          this.gameMode = opt.dataset.mode;
        });
      });

      // Start Game Button
      document.getElementById('btn-start-game').addEventListener('click', () => {
        this.startGame();
      });

      // Pause Modal Buttons
      document.getElementById('btn-resume-game').addEventListener('click', () => {
        this.resumeGame();
      });
      document.getElementById('btn-restart-game').addEventListener('click', () => {
        this.startGame();
      });
      document.getElementById('btn-menu-game').addEventListener('click', () => {
        this.state = 'MENU';
        this.modalPause.classList.remove('active');
        this.modalStart.classList.add('active');
      });

      // Game Over Modal Buttons
      document.getElementById('btn-play-again').addEventListener('click', () => {
        this.startGame();
      });
      document.getElementById('btn-go-menu').addEventListener('click', () => {
        this.state = 'MENU';
        this.modalGameOver.classList.remove('active');
        this.modalStart.classList.add('active');
      });

      // Mobile Touch Gamepad Buttons
      const addTouchListener = (id, onDown, onUp) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          onDown();
        });
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          onDown();
        });
        if (onUp) {
          el.addEventListener('touchend', (e) => {
            e.preventDefault();
            onUp();
          });
          el.addEventListener('touchcancel', onUp);
          el.addEventListener('mouseup', (e) => {
            e.preventDefault();
            onUp();
          });
        }
      };

      // Holding LEFT / RIGHT auto-repeats exactly like holding the arrow keys
      addTouchListener('touch-left',
        () => {
          if (this.state === 'PLAYING') {
            this.movePiece(-1);
            this.keyState['ArrowLeft'] = true;
          }
        },
        () => {
          this.keyState['ArrowLeft'] = false;
        }
      );
      addTouchListener('touch-right',
        () => {
          if (this.state === 'PLAYING') {
            this.movePiece(1);
            this.keyState['ArrowRight'] = true;
          }
        },
        () => {
          this.keyState['ArrowRight'] = false;
        }
      );
      addTouchListener('touch-soft', 
        () => {
          if (this.state === 'PLAYING') {
            this.softDropActive = true;
            this.softDrop();
          }
        },
        () => {
          this.softDropActive = false;
        }
      );
      addTouchListener('touch-hard', () => {
        if (this.state === 'PLAYING') this.hardDrop();
      });
      addTouchListener('touch-rot-cw', () => {
        if (this.state === 'PLAYING') this.rotatePiece(true);
      });
      addTouchListener('touch-rot-ccw', () => {
        if (this.state === 'PLAYING') this.rotatePiece(false);
      });
      addTouchListener('touch-hold', () => {
        if (this.state === 'PLAYING') this.hold();
      });
    }
  }

  // Initialize on page load
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new NeonMatrixBlocks();
  });

})();
