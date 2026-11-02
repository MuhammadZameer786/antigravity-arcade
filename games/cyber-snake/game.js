/**
 * CYBER SNAKE // Neon Grid Overdrive
 * Pure Vanilla HTML5 Canvas + Web Audio API Synthesizer
 */

// ============================================================================
// AUDIO SYNTHESIZER (WEB AUDIO API)
// ============================================================================
class CyberAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.step = 0;
    this.bpm = 130;
    this.timerID = null;
    this.nextBeatTime = 0;
    this.isTurbo = false;

    // D-Minor Synthwave Scale frequencies (D, E, F, G, A, Bb, C)
    this.bassNotes = [
      73.42,  // D2
      87.31,  // F2
      98.00,  // G2
      110.00, // A2
      116.54, // Bb2
      130.81  // C3
    ];

    // Melodic Arpeggio Pentatonic Lead Notes (D Minor Pentatonic: D4, F4, G4, A4, C5, D5)
    this.leadNotes = [
      293.66, // D4
      349.23, // F4
      392.00, // G4
      440.00, // A4
      523.25, // C5
      587.33, // D5
      698.46, // F5
      783.99  // G5
    ];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Dynamics compressor to ensure clean mix without clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);

        this.compressor.connect(this.masterGain);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
    }
    return this.muted;
  }

  setMute(mute) {
    this.muted = mute;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.65, this.ctx.currentTime);
    }
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

  setTurbo(turbo) {
    this.isTurbo = turbo;
  }

  scheduleBeat() {
    if (!this.isPlayingMusic || !this.ctx) return;
    const currentBpm = this.isTurbo ? this.bpm * 1.25 : this.bpm;
    const stepDuration = 60.0 / (currentBpm * 4); // 16th notes

    while (this.nextBeatTime < this.ctx.currentTime + 0.1) {
      if (!this.muted) {
        this.playSequenceStep(this.step, this.nextBeatTime);
      }
      this.nextBeatTime += stepDuration;
      this.step = (this.step + 1) % 32;
    }

    this.timerID = setTimeout(() => this.scheduleBeat(), 25);
  }

  playSequenceStep(step, time) {
    if (!this.ctx) return;

    // Four-on-the-Floor Kick Drum
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Snappy Snare / Cyber Clap on beats 4, 12, 20, 28
    if (step % 8 === 4) {
      this.playSnare(time);
    }

    // Hi-hats on offbeats
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 3 ? 0.035 : 0.02);
    }

    // Cyber Synth Bassline (Driving 16th note arpeggio)
    if (step % 2 === 0) {
      let bassIdx = 0;
      const bar = Math.floor(step / 8);
      if (bar === 0 || bar === 1) bassIdx = 0; // D2
      else if (bar === 2) bassIdx = 1;         // F2
      else bassIdx = 3;                        // A2

      if (step % 4 === 2) bassIdx = (bassIdx + 2) % this.bassNotes.length;
      this.playBass(this.bassNotes[bassIdx], time);
    }

    // Melodic Synth Shimmer on selective steps
    if (step === 2 || step === 6 || step === 10 || step === 15 || step === 18 || step === 26 || step === 30) {
      const leadIdx = (Math.floor(step / 3) + Math.floor(step / 5)) % this.leadNotes.length;
      this.playLeadNote(this.leadNotes[leadIdx], time);
    }
  }

  playKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.08);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(time);
      osc.stop(time + 0.09);
    } catch (e) {}
  }

  playHiHat(time, vol = 0.02) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.03;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      noise.start(time);
      noise.stop(time + 0.03);
    } catch (e) {}
  }

  playSnare(time) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.09;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      noise.start(time);
      noise.stop(time + 0.09);
    } catch (e) {}
  }

  playBass(freq, time) {
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      const cutoff = this.isTurbo ? 900 : 500;
      filter.frequency.setValueAtTime(cutoff, time);
      filter.frequency.exponentialRampToValueAtTime(160, time + 0.12);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      osc.start(time);
      osc.stop(time + 0.13);
    } catch (e) {}
  }

  playLeadNote(freq, time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.045, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(time);
      osc.stop(time + 0.15);
    } catch (e) {}
  }

  // --- SOUND EFFECTS ---

  playTurn() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.04);

      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.04);
    } catch (e) {}
  }

  playEat(combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      // Pitch escalates with combo streak
      const noteIdx = Math.min(this.leadNotes.length - 1, Math.floor(combo - 1) % this.leadNotes.length);
      const baseFreq = this.leadNotes[noteIdx];

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.08);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2, t);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 2.5, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.compressor);

      osc1.start(t);
      osc2.start(t);
      osc1.stop(t + 0.12);
      osc2.stop(t + 0.12);
    } catch (e) {}
  }

  playCrypto() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [587.33, 739.99, 880.00, 1174.66, 1479.98]; // D Major Sparkle Arpeggio

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + idx * 0.035;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.connect(gain);
        gain.connect(this.compressor);
        osc.start(startTime);
        osc.stop(startTime + 0.18);
      });
    } catch (e) {}
  }

  playPowerup(type = 'phase') {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(1320, t + 0.25);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.28);
    } catch (e) {}
  }

  playEmp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // White noise blast
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4000, t);
      filter.frequency.exponentialRampToValueAtTime(80, t + 0.35);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);
      noise.start(t);
      noise.stop(t + 0.35);
    } catch (e) {}
  }

  playPortal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(900, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.2);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  playCrash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;

      // Heavy Noise Explosion
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2500, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.45);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      // Low sub rumble
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.4);
      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.compressor);

      osc.connect(oscGain);
      oscGain.connect(this.compressor);

      noise.start(t);
      osc.start(t);
      noise.stop(t + 0.45);
      osc.stop(t + 0.45);
    } catch (e) {}
  }

  playUiClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);

      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      osc.connect(gain);
      gain.connect(this.compressor);
      osc.start(t);
      osc.stop(t + 0.03);
    } catch (e) {}
  }
}

// ============================================================================
// PARTICLE SYSTEM & FLOATING TEXTS
// ============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawn(x, y, color, count = 8, speed = 2, size = 3, life = 0.5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color: color,
        size: Math.random() * size + 1.5,
        maxLife: life,
        life: life,
        alpha: 1
      });
    }
  }

  spawnShockwave(x, y, color, maxRadius = 35) {
    this.particles.push({
      x: x,
      y: y,
      isWave: true,
      radius: 4,
      maxRadius: maxRadius,
      color: color,
      life: 0.4,
      maxLife: 0.4
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.isWave) {
        p.radius += (p.maxRadius - p.radius) * 12 * dt;
        p.alpha = p.life / p.maxLife;
      } else {
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.vx *= Math.pow(0.95, dt * 60);
        p.vy *= Math.pow(0.95, dt * 60);
        p.alpha = p.life / p.maxLife;
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      if (p.isWave) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * p.alpha;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

class FloatingTextManager {
  constructor() {
    this.items = [];
  }

  add(x, y, text, color = '#00f3ff', size = 16) {
    this.items.push({
      x: x,
      y: y,
      text: text,
      color: color,
      size: size,
      life: 0.8,
      maxLife: 0.8,
      vy: -1.2
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      if (item.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      item.y += item.vy * 60 * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 14px "Orbitron", sans-serif';

    for (const item of this.items) {
      const alpha = Math.max(0, item.life / item.maxLife);
      ctx.fillStyle = item.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 10;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  clear() {
    this.items = [];
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class CyberSnakeGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new CyberAudio();
    this.particles = new ParticleSystem();
    this.floatingTexts = new FloatingTextManager();

    // Logical Grid (48 x 27 = 1296 cells, 20px per cell)
    this.cols = 48;
    this.rows = 27;
    this.cellSize = 20; // 48 * 20 = 960, 27 * 20 = 540
    this.worldW = 960;
    this.worldH = 540;
    this.renderScale = 1;

    // Theme Configs
    this.themes = {
      cyan: {
        head: '#ffffff',
        bodyGradStart: '#00f3ff',
        bodyGradEnd: '#0055ff',
        glow: '#00f3ff',
        eye: '#ffffff',
        accent: '#00f3ff'
      },
      magenta: {
        head: '#ffffff',
        bodyGradStart: '#ff007f',
        bodyGradEnd: '#9d00ff',
        glow: '#ff007f',
        eye: '#ffe600',
        accent: '#ff007f'
      },
      matrix: {
        head: '#ffffff',
        bodyGradStart: '#05ffa1',
        bodyGradEnd: '#00b050',
        glow: '#05ffa1',
        eye: '#00ff44',
        accent: '#05ffa1'
      },
      solar: {
        head: '#ffffff',
        bodyGradStart: '#ffe600',
        bodyGradEnd: '#ff3700',
        glow: '#ffe600',
        eye: '#ffffff',
        accent: '#ffe600'
      },
      spectrum: {
        head: '#ffffff',
        bodyGradStart: '#00f3ff',
        bodyGradEnd: '#ff007f',
        glow: '#9d00ff',
        eye: '#05ffa1',
        accent: '#00f3ff',
        rainbow: true
      }
    };

    // State Variables
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.mode = 'arcade'; // 'arcade', 'hazards', 'time'
    this.wallProtocol = 'wrap'; // 'wrap' or 'solid'
    this.speedSetting = 'fast'; // 'slow', 'fast', 'hyper'
    this.activeTheme = 'cyan';

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.foodConsumed = 0;
    this.peakCombo = 1.0;
    this.surgeTime = 60.0; // For time surge mode

    // Overdrive Turbo Meter
    this.boostEnergy = 100;
    this.isBoostActive = false;
    this.boostRechargeRate = 8; // % per sec
    this.boostDrainRate = 35;   // % per sec

    // Grid Tick & Interpolation
    this.tickTimer = 0;
    this.baseTickInterval = 0.088; // Default tick step in seconds
    this.currentTickInterval = 0.088;
    this.lastTime = 0;
    this.interpolationFactor = 0;

    // Snake State
    this.snake = []; // Array of {x, y, prevX, prevY}
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.inputQueue = [];

    // Items
    this.food = null;       // Standard Data Bit
    this.crypto = null;     // Rare Golden Matrix Bit
    this.cryptoTimer = 0;
    this.cryptoSpawnTimer = 15;
    this.powerup = null;    // Active floating item on board
    this.powerupSpawnTimer = 12;

    // Active Buff Timers
    this.buffs = {
      phase: 0,       // Pass through tail & laser walls
      chrono: 0,      // Slow-mo
      multiplier: 0   // Double score
    };

    // Hazards (for Hazards mode)
    this.hazards = [];
    this.portals = []; // Linked portals: [PortalA, PortalB]

    // Screen Shake & Radar Scan
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.radarY = 0;

    // High Scores (Loaded from localStorage)
    this.highScores = {
      arcade: parseInt(localStorage.getItem('cyber_snake_hi_arcade') || '0', 10),
      hazards: parseInt(localStorage.getItem('cyber_snake_hi_hazards') || '0', 10),
      time: parseInt(localStorage.getItem('cyber_snake_hi_time') || '0', 10)
    };

    // DOM Elements Cache
    this.dom = {
      score: document.getElementById('score-display'),
      length: document.getElementById('length-display'),
      combo: document.getElementById('combo-display'),
      timeBox: document.getElementById('hud-time-box'),
      timeDisplay: document.getElementById('time-display'),
      highscore: document.getElementById('hud-highscore'),
      boostBar: document.getElementById('boost-bar'),
      boostPercent: document.getElementById('boost-percent'),
      activePowerups: document.getElementById('active-powerups'),
      bannerNotification: document.getElementById('banner-notification'),
      startScreen: document.getElementById('start-screen'),
      gameoverScreen: document.getElementById('gameover-screen'),
      pauseScreen: document.getElementById('pause-screen'),
      crtOverlay: document.getElementById('crt-overlay'),
      audioIcon: document.getElementById('audio-icon'),
      btnAudio: document.getElementById('btn-audio-toggle'),
      btnPause: document.getElementById('btn-pause'),
      btnFullscreen: document.getElementById('btn-fullscreen'),
      btnStart: document.getElementById('btn-start'),
      btnRestart: document.getElementById('btn-restart'),
      btnResume: document.getElementById('btn-resume'),
      btnPauseRestart: document.getElementById('btn-pause-restart'),
      btnToggleCrt: document.getElementById('btn-toggle-crt'),
      btnPauseAudio: document.getElementById('btn-pause-audio'),
      resScore: document.getElementById('res-score'),
      resLength: document.getElementById('res-length'),
      resFood: document.getElementById('res-food'),
      resCombo: document.getElementById('res-combo'),
      resHighscore: document.getElementById('res-highscore'),
      newHighBadge: document.getElementById('new-high-badge'),
      gameoverCause: document.getElementById('gameover-cause')
    };

    this.initEventListeners();
    this.loadSavedSettings();
    this.chooseGrid();
    this.updateHUD();
    this.showBanner('CYBER MATRIX STANDBY', 2000);

    // Start Game Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  loadSavedSettings() {
    const savedTheme = localStorage.getItem('cyber_snake_theme') || 'cyan';
    this.selectTheme(savedTheme);

    const savedCrt = localStorage.getItem('cyber_snake_crt');
    if (savedCrt === 'false') {
      this.dom.crtOverlay.classList.add('disabled');
      this.dom.btnToggleCrt.classList.remove('active');
      this.dom.btnToggleCrt.textContent = 'OFF';
    }

    const savedAudio = localStorage.getItem('cyber_snake_muted');
    if (savedAudio === 'true') {
      this.audio.setMute(true);
      this.dom.audioIcon.textContent = '🔇';
      this.dom.btnPauseAudio.classList.remove('active');
      this.dom.btnPauseAudio.textContent = 'MUTED';
    }
  }

  initEventListeners() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));

    // UI Buttons
    this.dom.btnStart.addEventListener('click', () => {
      this.audio.playUiClick();
      this.startGame();
    });

    this.dom.btnRestart.addEventListener('click', () => {
      this.audio.playUiClick();
      this.startGame();
    });

    this.dom.btnResume.addEventListener('click', () => {
      this.audio.playUiClick();
      this.resumeGame();
    });

    this.dom.btnPauseRestart.addEventListener('click', () => {
      this.audio.playUiClick();
      this.startGame();
    });

    this.dom.btnAudio.addEventListener('click', () => {
      this.toggleAudio();
    });

    this.dom.btnPauseAudio.addEventListener('click', () => {
      this.toggleAudio();
    });

    this.dom.btnPause.addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    });

    this.dom.btnToggleCrt.addEventListener('click', () => {
      const isDisabled = this.dom.crtOverlay.classList.toggle('disabled');
      this.dom.btnToggleCrt.classList.toggle('active', !isDisabled);
      this.dom.btnToggleCrt.textContent = isDisabled ? 'OFF' : 'ON';
      localStorage.setItem('cyber_snake_crt', !isDisabled);
      this.audio.playUiClick();
    });

    this.dom.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      this.audio.playUiClick();
    });

    // Option Pickers on Start Screen
    document.querySelectorAll('#mode-selector .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#mode-selector .pill-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.mode = target.dataset.mode;
        this.updateHUD();
        this.audio.playUiClick();
      });
    });

    document.querySelectorAll('#wall-selector .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#wall-selector .pill-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.wallProtocol = target.dataset.walls;
        this.audio.playUiClick();
      });
    });

    document.querySelectorAll('#speed-selector .pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#speed-selector .pill-btn').forEach(b => b.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.speedSetting = target.dataset.speed;
        this.audio.playUiClick();
      });
    });

    document.querySelectorAll('#theme-selector .theme-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const theme = e.currentTarget.dataset.theme;
        this.selectTheme(theme);
        this.audio.playUiClick();
      });
    });

    // Touch D-Pad & Turbo
    document.querySelectorAll('.dpad-btn').forEach(btn => {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const dir = btn.dataset.dir;
        this.handleDirectionInput(dir);
      }, { passive: false });
    });

    const touchBoost = document.getElementById('btn-touch-boost');
    touchBoost.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.isBoostActive = true;
    }, { passive: false });
    touchBoost.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.isBoostActive = false;
    }, { passive: false });

    touchBoost.addEventListener('touchcancel', () => {
      this.isBoostActive = false;
    });

    // Swipe anywhere on screen: the turn happens as soon as the finger has moved far
    // enough, and the same swipe keeps reading so one gesture can chain several turns
    let swipe = null;
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.target.closest('button, a, .game-modal')) return;
      swipe = { id: e.pointerId, x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e) => {
      if (!swipe || swipe.id !== e.pointerId) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);

      if (Math.max(absX, absY) > 18) {
        if (absX > absY) {
          this.handleDirectionInput(dx > 0 ? 'RIGHT' : 'LEFT');
        } else {
          this.handleDirectionInput(dy > 0 ? 'DOWN' : 'UP');
        }
        swipe.x = e.clientX;
        swipe.y = e.clientY;
      }
    });

    const endSwipe = () => {
      swipe = null;
    };
    window.addEventListener('pointerup', endSwipe);
    window.addEventListener('pointercancel', endSwipe);

    // Don't let the snake run on while the phone is locked or another app is open
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseGame();
    });

    // A run keeps its grid, so a phone rotated mid-run pauses and letterboxes that grid
    window.addEventListener('resize', () => this.resizeCanvas());
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
      this.resizeCanvas();
      this.pauseGame();
    });
  }

  // Portrait phones get a tall grid that fills the space above the controls
  chooseGrid() {
    const slot = document.getElementById('arena-slot').getBoundingClientRect();
    if (slot.height > 0) {
      this.cols = 24;
      this.rows = Math.floor(slot.height / (slot.width / this.cols));
    } else {
      this.cols = 48;
      this.rows = 27;
    }
    this.worldW = this.cols * this.cellSize;
    this.worldH = this.rows * this.cellSize;
    document.documentElement.style.setProperty('--grid-ratio', `${this.cols} / ${this.rows}`);
    this.resizeCanvas();
  }

  resizeCanvas() {
    // Size the buffer for the screen so the neon stays sharp on high-density phones
    const cssW = this.canvas.getBoundingClientRect().width || this.worldW;
    const density = (cssW * (window.devicePixelRatio || 1)) / this.worldW;
    this.renderScale = Math.max(1, Math.min(1.5, density));
    this.canvas.width = Math.round(this.worldW * this.renderScale);
    this.canvas.height = Math.round(this.worldH * this.renderScale);
  }

  selectTheme(themeName) {
    if (!this.themes[themeName]) return;
    this.activeTheme = themeName;
    document.body.dataset.theme = themeName;
    document.querySelectorAll('#theme-selector .theme-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.theme === themeName);
    });
    localStorage.setItem('cyber_snake_theme', themeName);
  }

  toggleAudio() {
    const isMuted = this.audio.toggleMute();
    this.dom.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    this.dom.btnPauseAudio.classList.toggle('active', !isMuted);
    this.dom.btnPauseAudio.textContent = isMuted ? 'MUTED' : 'ACTIVE';
    localStorage.setItem('cyber_snake_muted', isMuted);
  }

  showBanner(text, duration = 2500) {
    this.dom.bannerNotification.textContent = text;
    this.dom.bannerNotification.classList.add('visible');
    if (this.bannerTimer) clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.dom.bannerNotification.classList.remove('visible');
    }, duration);
  }

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================
  handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }

    if (e.key === ' ' || e.code === 'Space') {
      if (this.state === 'PLAYING') {
        this.isBoostActive = true;
      }
      return;
    }

    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
      return;
    }

    if (e.key === 'm' || e.key === 'M') {
      this.toggleAudio();
      return;
    }

    if (e.key === 'r' || e.key === 'R') {
      if (this.state === 'GAMEOVER') {
        this.startGame();
      }
      return;
    }

    if (this.state !== 'PLAYING') return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.handleDirectionInput('UP');
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.handleDirectionInput('DOWN');
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.handleDirectionInput('LEFT');
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.handleDirectionInput('RIGHT');
        break;
    }
  }

  handleKeyUp(e) {
    if (e.key === ' ' || e.code === 'Space') {
      this.isBoostActive = false;
    }
  }

  handleDirectionInput(dirName) {
    if (this.state !== 'PLAYING') return;

    let targetDir = { x: 0, y: 0 };
    if (dirName === 'UP') targetDir = { x: 0, y: -1 };
    else if (dirName === 'DOWN') targetDir = { x: 0, y: 1 };
    else if (dirName === 'LEFT') targetDir = { x: -1, y: 0 };
    else if (dirName === 'RIGHT') targetDir = { x: 1, y: 0 };

    // Prevent queuing more than 2 turn inputs ahead
    if (this.inputQueue.length >= 2) return;

    const lastQueued = this.inputQueue.length > 0 ? this.inputQueue[this.inputQueue.length - 1] : this.dir;

    // Check 180 degree instant reversal
    if (targetDir.x !== -lastQueued.x && targetDir.y !== -lastQueued.y) {
      if (targetDir.x !== lastQueued.x || targetDir.y !== lastQueued.y) {
        this.inputQueue.push(targetDir);
      }
    }
  }

  // ============================================================================
  // GAME LIFECYCLE
  // ============================================================================
  startGame() {
    this.chooseGrid();
    this.state = 'PLAYING';
    this.dom.startScreen.classList.remove('active');
    this.dom.gameoverScreen.classList.remove('active');
    this.dom.pauseScreen.classList.remove('active');

    this.score = 0;
    this.combo = 1.0;
    this.comboTimer = 0;
    this.foodConsumed = 0;
    this.peakCombo = 1.0;
    this.boostEnergy = 100;
    this.isBoostActive = false;
    this.surgeTime = 60.0;

    // Set base speed according to setting
    if (this.speedSetting === 'slow') this.baseTickInterval = 0.105;
    else if (this.speedSetting === 'fast') this.baseTickInterval = 0.082;
    else if (this.speedSetting === 'hyper') this.baseTickInterval = 0.065;
    this.currentTickInterval = this.baseTickInterval;

    // Initialize Snake in Center
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);

    this.snake = [
      { x: startX, y: startY, prevX: startX - 1, prevY: startY },
      { x: startX - 1, y: startY, prevX: startX - 2, prevY: startY },
      { x: startX - 2, y: startY, prevX: startX - 3, prevY: startY },
      { x: startX - 3, y: startY, prevX: startX - 4, prevY: startY }
    ];

    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.inputQueue = [];
    this.tickTimer = 0;

    // Reset Buffs & Timers
    this.buffs = { phase: 0, chrono: 0, multiplier: 0 };
    this.crypto = null;
    this.powerup = null;
    this.cryptoSpawnTimer = 10;
    this.powerupSpawnTimer = 14;

    this.particles.clear();
    this.floatingTexts.clear();

    // Setup Hazards / Portals if needed
    this.setupHazards();

    // Spawn first food
    this.spawnFood();

    // Audio
    this.audio.startMusic();
    this.showBanner(`${this.mode.toUpperCase()} MATRIX ENGAGED`, 2000);
    this.updateHUD();
  }

  setupHazards() {
    this.hazards = [];
    this.portals = [];

    if (this.mode === 'hazards') {
      // Create 4 cyber energy pylons around the board
      const marginX = Math.round(this.cols * 0.2);
      const marginY = Math.round(this.rows * 0.22);
      this.hazards.push({ x: marginX, y: marginY, width: 2, height: 2, type: 'pylon' });
      this.hazards.push({ x: this.cols - marginX - 2, y: marginY, width: 2, height: 2, type: 'pylon' });
      this.hazards.push({ x: marginX, y: this.rows - marginY - 2, width: 2, height: 2, type: 'pylon' });
      this.hazards.push({ x: this.cols - marginX - 2, y: this.rows - marginY - 2, width: 2, height: 2, type: 'pylon' });

      // Create a pair of quantum portals
      this.portals = [
        { x: Math.round(this.cols / 8), y: Math.floor(this.rows / 2), color: '#00f3ff', label: 'PORTAL α' },
        { x: this.cols - 1 - Math.round(this.cols / 8), y: Math.floor(this.rows / 2), color: '#ff007f', label: 'PORTAL β' }
      ];
    }
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.audio.stopMusic();
    this.dom.pauseScreen.classList.add('active');
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.audio.startMusic();
    this.dom.pauseScreen.classList.remove('active');
    this.lastTime = performance.now();
  }

  gameOver(cause = 'COLLISION DETECTED') {
    this.state = 'GAMEOVER';
    this.audio.stopMusic();
    this.audio.playCrash();
    this.triggerShake(16, 0.45);

    // Spawn destruction particles at each segment
    const theme = this.themes[this.activeTheme];
    for (const seg of this.snake) {
      this.particles.spawn(
        (seg.x + 0.5) * this.cellSize,
        (seg.y + 0.5) * this.cellSize,
        theme.glow,
        6,
        3.5,
        3,
        0.8
      );
    }

    // Highscore Check
    const currentRecord = this.highScores[this.mode];
    const isNewHigh = this.score > currentRecord;
    if (isNewHigh) {
      this.highScores[this.mode] = this.score;
      localStorage.setItem(`cyber_snake_hi_${this.mode}`, this.score.toString());
    }

    // Update Game Over Modal
    this.dom.gameoverCause.textContent = cause;
    this.dom.resScore.textContent = this.score.toLocaleString();
    this.dom.resLength.textContent = this.snake.length;
    this.dom.resFood.textContent = this.foodConsumed;
    this.dom.resCombo.textContent = `x${this.peakCombo.toFixed(1)}`;
    this.dom.resHighscore.textContent = this.highScores[this.mode].toLocaleString();
    this.dom.newHighBadge.classList.toggle('hidden', !isNewHigh);

    setTimeout(() => {
      this.dom.gameoverScreen.classList.add('active');
    }, 450);
  }

  // ============================================================================
  // SPAWNING SYSTEM
  // ============================================================================
  isCellOccupied(x, y) {
    // Check snake body
    for (const seg of this.snake) {
      if (seg.x === x && seg.y === y) return true;
    }
    // Check hazards
    for (const h of this.hazards) {
      if (x >= h.x && x < h.x + h.width && y >= h.y && y < h.y + h.height) return true;
    }
    // Check portals
    for (const p of this.portals) {
      if (p.x === x && p.y === y) return true;
    }
    // Check food
    if (this.food && this.food.x === x && this.food.y === y) return true;
    // Check crypto
    if (this.crypto && this.crypto.x === x && this.crypto.y === y) return true;
    // Check powerup
    if (this.powerup && this.powerup.x === x && this.powerup.y === y) return true;

    return false;
  }

  getEmptyCell() {
    let attempts = 0;
    while (attempts < 500) {
      const rx = Math.floor(Math.random() * (this.cols - 4)) + 2;
      const ry = Math.floor(Math.random() * (this.rows - 4)) + 2;
      if (!this.isCellOccupied(rx, ry)) {
        return { x: rx, y: ry };
      }
      attempts++;
    }
    return { x: 5, y: 5 };
  }

  spawnFood() {
    const pos = this.getEmptyCell();
    this.food = {
      x: pos.x,
      y: pos.y,
      pulse: 0,
      color: '#00f3ff'
    };
  }

  spawnCrypto() {
    const pos = this.getEmptyCell();
    this.crypto = {
      x: pos.x,
      y: pos.y,
      life: 9.0, // 9 seconds to catch
      maxLife: 9.0,
      color: '#ffe600'
    };
    this.showBanner('★ CRYPTO CORE DETECTED', 1800);
  }

  spawnPowerup() {
    const types = ['phase', 'chrono', 'emp', 'boost'];
    const selected = types[Math.floor(Math.random() * types.length)];
    const pos = this.getEmptyCell();

    let color = '#9d00ff';
    let icon = '◈';
    let label = 'PHASE SHIFT';

    if (selected === 'chrono') {
      color = '#0077ff';
      icon = '⌛';
      label = 'SLOW-MO';
    } else if (selected === 'emp') {
      color = '#ff1744';
      icon = '⚡';
      label = 'EMP SURGE';
    } else if (selected === 'boost') {
      color = '#ffe600';
      icon = '▲';
      label = 'OVERDRIVE';
    }

    this.powerup = {
      x: pos.x,
      y: pos.y,
      type: selected,
      icon: icon,
      label: label,
      color: color,
      life: 11.0,
      maxLife: 11.0
    };
  }

  // ============================================================================
  // GAME UPDATE & LOGIC
  // ============================================================================
  update(dt) {
    // Audio Turbo state
    this.audio.setTurbo(this.isBoostActive && this.boostEnergy > 0);

    // Boost Energy Management
    if (this.isBoostActive && this.boostEnergy > 0) {
      this.boostEnergy = Math.max(0, this.boostEnergy - this.boostDrainRate * dt);
      if (this.boostEnergy === 0) {
        this.isBoostActive = false;
      }
    } else if (!this.isBoostActive && this.boostEnergy < 100) {
      this.boostEnergy = Math.min(100, this.boostEnergy + this.boostRechargeRate * dt);
    }

    // Active Buffs countdown
    for (const key in this.buffs) {
      if (this.buffs[key] > 0) {
        this.buffs[key] -= dt;
        if (this.buffs[key] <= 0) {
          this.buffs[key] = 0;
          this.showBanner(`${key.toUpperCase()} MODULE EXPIRED`, 1200);
        }
      }
    }

    // Combo Timer Decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1.0;
        this.dom.combo.textContent = 'x1.0';
      }
    }

    // Time Surge Mode Countdown
    if (this.mode === 'time') {
      this.surgeTime -= dt;
      if (this.surgeTime <= 0) {
        this.surgeTime = 0;
        this.gameOver('TIME SURGE EXPIRED');
        return;
      }
    }

    // Item Lifecycles & Spawners
    if (this.crypto) {
      this.crypto.life -= dt;
      if (this.crypto.life <= 0) {
        this.crypto = null;
      }
    } else {
      this.cryptoSpawnTimer -= dt;
      if (this.cryptoSpawnTimer <= 0) {
        this.spawnCrypto();
        this.cryptoSpawnTimer = 16 + Math.random() * 8;
      }
    }

    if (this.powerup) {
      this.powerup.life -= dt;
      if (this.powerup.life <= 0) {
        this.powerup = null;
      }
    } else {
      this.powerupSpawnTimer -= dt;
      if (this.powerupSpawnTimer <= 0) {
        this.spawnPowerup();
        this.powerupSpawnTimer = 18 + Math.random() * 10;
      }
    }

    // Grid Clock Tick Computation
    let speedMult = 1.0;
    if (this.isBoostActive && this.boostEnergy > 0) speedMult *= 1.85;
    if (this.buffs.chrono > 0) speedMult *= 0.55;

    // Slight speed acceleration with length
    const lengthBoost = Math.min(0.35, (this.snake.length - 4) * 0.005);
    speedMult *= (1 + lengthBoost);

    this.currentTickInterval = this.baseTickInterval / speedMult;

    this.tickTimer += dt;
    if (this.tickTimer >= this.currentTickInterval) {
      this.stepGrid();
      this.tickTimer %= this.currentTickInterval;
    }

    // Compute interpolation progress between previous cell and current cell
    this.interpolationFactor = Math.min(1.0, this.tickTimer / this.currentTickInterval);

    // Particle & Ambient updates
    this.particles.update(dt);
    this.floatingTexts.update(dt);

    // Screen Shake decay
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) this.shakeIntensity = 0;
    }

    // Radar scanline progression
    this.radarY = (this.radarY + dt * 140) % this.worldH;

    this.updateHUD();
  }

  stepGrid() {
    // Process input queue
    if (this.inputQueue.length > 0) {
      const next = this.inputQueue.shift();
      if (next.x !== -this.dir.x && next.y !== -this.dir.y) {
        this.dir = next;
        this.audio.playTurn();
      }
    }

    const head = this.snake[0];
    let newX = head.x + this.dir.x;
    let newY = head.y + this.dir.y;

    // Wall Collision / Portal Wrap
    if (this.wallProtocol === 'wrap') {
      if (newX < 0) newX = this.cols - 1;
      else if (newX >= this.cols) newX = 0;

      if (newY < 0) newY = this.rows - 1;
      else if (newY >= this.rows) newY = 0;
    } else {
      // Solid Walls
      if (newX < 0 || newX >= this.cols || newY < 0 || newY >= this.rows) {
        this.gameOver('GRID PERIMETER BREACH');
        return;
      }
    }

    // Check Quantum Portals
    if (this.portals.length === 2) {
      if (newX === this.portals[0].x && newY === this.portals[0].y) {
        newX = this.portals[1].x + this.dir.x;
        newY = this.portals[1].y + this.dir.y;
        this.audio.playPortal();
        this.particles.spawnShockwave((newX + 0.5) * this.cellSize, (newY + 0.5) * this.cellSize, '#ff007f', 40);
      } else if (newX === this.portals[1].x && newY === this.portals[1].y) {
        newX = this.portals[0].x + this.dir.x;
        newY = this.portals[0].y + this.dir.y;
        this.audio.playPortal();
        this.particles.spawnShockwave((newX + 0.5) * this.cellSize, (newY + 0.5) * this.cellSize, '#00f3ff', 40);
      }
    }

    // Check Cyber Hazard Obstacles (Pylons)
    for (const h of this.hazards) {
      if (newX >= h.x && newX < h.x + h.width && newY >= h.y && newY < h.y + h.height) {
        if (this.buffs.phase <= 0) {
          this.gameOver('ENERGY PYLON IMPACT');
          return;
        }
      }
    }

    // Check Self-Collision
    if (this.buffs.phase <= 0) {
      // Ignore very last segment because it moves forward
      for (let i = 0; i < this.snake.length - 1; i++) {
        if (this.snake[i].x === newX && this.snake[i].y === newY) {
          this.gameOver('CIRCUIT FEEDBACK // SELF COLLISION');
          return;
        }
      }
    }

    // Create New Head
    const newHead = {
      x: newX,
      y: newY,
      prevX: head.x,
      prevY: head.y
    };

    // Update historical positions for smooth rendering
    for (const seg of this.snake) {
      seg.prevX = seg.x;
      seg.prevY = seg.y;
    }

    this.snake.unshift(newHead);

    let hasEaten = false;

    // 1. Check Data Bit Consumption
    if (this.food && newX === this.food.x && newY === this.food.y) {
      hasEaten = true;
      this.foodConsumed++;
      this.combo = Math.min(4.0, this.combo + 0.2);
      this.comboTimer = 4.5;
      if (this.combo > this.peakCombo) this.peakCombo = this.combo;

      const pts = Math.round(100 * this.combo * (this.buffs.multiplier > 0 ? 2 : 1));
      this.score += pts;
      this.boostEnergy = Math.min(100, this.boostEnergy + 20); // Data bits give turbo boost
      if (this.mode === 'time') this.surgeTime += 3.5;

      const pixelX = (newX + 0.5) * this.cellSize;
      const pixelY = (newY + 0.5) * this.cellSize;
      this.particles.spawn(pixelX, pixelY, '#00f3ff', 12, 3, 3, 0.5);
      this.particles.spawnShockwave(pixelX, pixelY, '#00f3ff', 24);
      this.floatingTexts.add(pixelX, pixelY - 10, `+${pts}`, '#00f3ff');

      this.audio.playEat(this.combo);
      this.spawnFood();
    }

    // 2. Check Crypto Core Consumption
    if (this.crypto && newX === this.crypto.x && newY === this.crypto.y) {
      hasEaten = true;
      this.foodConsumed++;
      this.combo = Math.min(4.0, this.combo + 0.5);
      this.comboTimer = 6.0;
      if (this.combo > this.peakCombo) this.peakCombo = this.combo;

      const pts = Math.round(500 * this.combo * (this.buffs.multiplier > 0 ? 2 : 1));
      this.score += pts;
      this.boostEnergy = 100;
      if (this.mode === 'time') this.surgeTime += 8.0;

      const pixelX = (newX + 0.5) * this.cellSize;
      const pixelY = (newY + 0.5) * this.cellSize;
      this.particles.spawn(pixelX, pixelY, '#ffe600', 20, 4.5, 4, 0.7);
      this.particles.spawnShockwave(pixelX, pixelY, '#ffe600', 45);
      this.floatingTexts.add(pixelX, pixelY - 14, `+${pts} CRYPTO!`, '#ffe600', 18);

      this.audio.playCrypto();
      this.crypto = null;
    }

    // 3. Check Powerup Capsule Consumption
    if (this.powerup && newX === this.powerup.x && newY === this.powerup.y) {
      const type = this.powerup.type;
      const pColor = this.powerup.color;
      const pLabel = this.powerup.label;

      const pixelX = (newX + 0.5) * this.cellSize;
      const pixelY = (newY + 0.5) * this.cellSize;
      this.particles.spawn(pixelX, pixelY, pColor, 18, 4, 3.5, 0.6);
      this.particles.spawnShockwave(pixelX, pixelY, pColor, 38);
      this.floatingTexts.add(pixelX, pixelY - 14, pLabel, pColor, 16);

      if (type === 'phase') {
        this.buffs.phase = 6.5;
        this.audio.playPowerup('phase');
        this.showBanner('◈ PHASE CLOAK ENGAGED: PASS THROUGH TAIL', 2500);
      } else if (type === 'chrono') {
        this.buffs.chrono = 6.0;
        this.audio.playPowerup('chrono');
        this.showBanner('⌛ CHRONO MATRIX: TIME DILATION ACTIVE', 2500);
      } else if (type === 'emp') {
        this.audio.playEmp();
        this.triggerShake(12, 0.3);
        // Trims 25% of tail if > 8 segments
        if (this.snake.length > 8) {
          const trimCount = Math.floor(this.snake.length * 0.25);
          for (let i = 0; i < trimCount; i++) {
            const popped = this.snake.pop();
            this.particles.spawn((popped.x + 0.5) * this.cellSize, (popped.y + 0.5) * this.cellSize, '#ff1744', 8, 3, 2, 0.5);
          }
          this.score += trimCount * 150;
        }
        this.showBanner('⚡ EMP SHOCKWAVE DISCHARGED', 2000);
      } else if (type === 'boost') {
        this.boostEnergy = 100;
        this.buffs.multiplier = 8.0;
        this.audio.playPowerup('boost');
        this.showBanner('★ OVERDRIVE CHARGED: 2X MULTIPLIER ACTIVE', 2500);
      }

      this.powerup = null;
    }

    // Tail Management
    if (!hasEaten) {
      this.snake.pop();
    }
  }

  triggerShake(intensity = 10, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  // ============================================================================
  // HUD MANAGEMENT
  // ============================================================================
  updateHUD() {
    this.dom.score.textContent = this.score.toLocaleString();
    this.dom.length.textContent = this.snake.length;
    this.dom.combo.textContent = `x${this.combo.toFixed(1)}`;
    this.dom.highscore.textContent = this.highScores[this.mode].toLocaleString();

    // Time box visibility
    if (this.mode === 'time') {
      this.dom.timeBox.style.display = 'flex';
      this.dom.timeDisplay.textContent = `${this.surgeTime.toFixed(1)}s`;
    } else {
      this.dom.timeBox.style.display = 'none';
    }

    // Boost bar
    this.dom.boostBar.style.width = `${Math.round(this.boostEnergy)}%`;
    this.dom.boostPercent.textContent = `${Math.round(this.boostEnergy)}%`;
    this.dom.boostBar.classList.toggle('depleted', this.boostEnergy <= 0);

    // Active Buffs list
    let buffHtml = '';
    if (this.buffs.phase > 0) {
      buffHtml += `<div class="active-buff" style="border-color:#9d00ff"><span style="color:#9d00ff">◈ PHASE</span> <span class="buff-timer">${this.buffs.phase.toFixed(1)}s</span></div>`;
    }
    if (this.buffs.chrono > 0) {
      buffHtml += `<div class="active-buff" style="border-color:#0077ff"><span style="color:#0077ff">⌛ SLOW-MO</span> <span class="buff-timer">${this.buffs.chrono.toFixed(1)}s</span></div>`;
    }
    if (this.buffs.multiplier > 0) {
      buffHtml += `<div class="active-buff" style="border-color:#ffe600"><span style="color:#ffe600">★ 2X BOOST</span> <span class="buff-timer">${this.buffs.multiplier.toFixed(1)}s</span></div>`;
    }
    this.dom.activePowerups.innerHTML = buffHtml;
  }

  // ============================================================================
  // RENDERING ENGINE
  // ============================================================================
  render() {
    this.ctx.save();
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

    // Camera Shake
    if (this.shakeIntensity > 0) {
      const rx = (Math.random() * 2 - 1) * this.shakeIntensity;
      const ry = (Math.random() * 2 - 1) * this.shakeIntensity;
      this.ctx.translate(rx, ry);
    }

    // 1. Clear Screen
    this.ctx.fillStyle = '#04010a';
    this.ctx.fillRect(0, 0, this.worldW, this.worldH);

    // 2. Draw Ambient Cyber Grid
    this.drawGrid();

    // 3. Draw Hazards & Portals
    this.drawHazards();

    // 4. Draw Food & Items
    this.drawItems();

    // 5. Draw Snake
    this.drawSnake();

    // 6. Draw Particles & Overlays
    this.particles.draw(this.ctx);
    this.floatingTexts.draw(this.ctx);

    // 7. Draw Radar Sweep Line
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.radarY);
    this.ctx.lineTo(this.worldW, this.radarY);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
    this.ctx.lineWidth = 1;

    // Vertical Lines
    for (let c = 0; c <= this.cols; c++) {
      const x = c * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.worldH);
      this.ctx.stroke();
    }

    // Horizontal Lines
    for (let r = 0; r <= this.rows; r++) {
      const y = r * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.worldW, y);
      this.ctx.stroke();
    }

    // Grid Outer Border
    if (this.wallProtocol === 'solid') {
      this.ctx.strokeStyle = 'rgba(255, 23, 68, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#ff1744';
      this.ctx.shadowBlur = 10;
      this.ctx.strokeRect(1, 1, 958, 538);
    } else {
      this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeRect(0, 0, this.worldW, this.worldH);
    }

    this.ctx.restore();
  }

  drawHazards() {
    this.ctx.save();

    // Energy Pylons
    for (const h of this.hazards) {
      const px = h.x * this.cellSize;
      const py = h.y * this.cellSize;
      const pw = h.width * this.cellSize;
      const ph = h.height * this.cellSize;

      this.ctx.fillStyle = 'rgba(255, 23, 68, 0.15)';
      this.ctx.fillRect(px, py, pw, ph);

      this.ctx.strokeStyle = '#ff1744';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#ff1744';
      this.ctx.shadowBlur = 12;
      this.ctx.strokeRect(px + 2, py + 2, pw - 4, ph - 4);

      // Cyber hazard icon
      this.ctx.fillStyle = '#ff1744';
      this.ctx.font = '700 16px "Share Tech Mono"';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('☣', px + pw / 2, py + ph / 2);
    }

    // Portals
    const now = performance.now() * 0.003;
    for (const p of this.portals) {
      const cx = (p.x + 0.5) * this.cellSize;
      const cy = (p.y + 0.5) * this.cellSize;
      const radius = 14 + Math.sin(now * 3) * 2;

      this.ctx.save();
      this.ctx.strokeStyle = p.color;
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 15;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Rotating portal notches
      this.ctx.translate(cx, cy);
      this.ctx.rotate(now * 2);
      for (let i = 0; i < 4; i++) {
        this.ctx.beginPath();
        this.ctx.moveTo(radius - 2, 0);
        this.ctx.lineTo(radius + 4, 0);
        this.ctx.stroke();
        this.ctx.rotate(Math.PI / 2);
      }
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  drawItems() {
    const t = performance.now() * 0.004;

    // 1. Standard Data Bit
    if (this.food) {
      const fx = (this.food.x + 0.5) * this.cellSize;
      const fy = (this.food.y + 0.5) * this.cellSize;
      const fSize = 7 + Math.sin(t * 3) * 1.5;

      this.ctx.save();
      this.ctx.translate(fx, fy);
      this.ctx.rotate(t * 2);

      this.ctx.fillStyle = '#00f3ff';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.shadowColor = '#00f3ff';
      this.ctx.shadowBlur = 14;

      this.ctx.beginPath();
      this.ctx.moveTo(0, -fSize);
      this.ctx.lineTo(fSize, 0);
      this.ctx.lineTo(0, fSize);
      this.ctx.lineTo(-fSize, 0);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      // Core center spark
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }

    // 2. Crypto Core (Rare Golden Bit)
    if (this.crypto) {
      const cx = (this.crypto.x + 0.5) * this.cellSize;
      const cy = (this.crypto.y + 0.5) * this.cellSize;
      const cSize = 9 + Math.sin(t * 4) * 2;

      this.ctx.save();
      this.ctx.translate(cx, cy);

      // Remaining lifetime countdown ring
      const progress = this.crypto.life / this.crypto.maxLife;
      this.ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.strokeStyle = '#ffe600';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      this.ctx.stroke();

      // Golden Hexagon
      this.ctx.rotate(t * 3);
      this.ctx.fillStyle = '#ffe600';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = '#ffe600';
      this.ctx.shadowBlur = 20;

      this.ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * cSize;
        const y = Math.sin(angle) * cSize;
        if (i === 0) this.ctx.moveTo(x, y);
        else this.ctx.lineTo(x, y);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.restore();
    }

    // 3. Power-Up Capsule
    if (this.powerup) {
      const px = (this.powerup.x + 0.5) * this.cellSize;
      const py = (this.powerup.y + 0.5) * this.cellSize;
      const pColor = this.powerup.color;

      this.ctx.save();
      this.ctx.translate(px, py);

      // Pulse aura
      const aura = 12 + Math.sin(t * 5) * 3;
      this.ctx.strokeStyle = pColor;
      this.ctx.lineWidth = 2;
      this.ctx.shadowColor = pColor;
      this.ctx.shadowBlur = 16;

      this.ctx.beginPath();
      this.ctx.arc(0, 0, aura, 0, Math.PI * 2);
      this.ctx.stroke();

      // Inner Icon
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '700 13px "Orbitron", sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.powerup.icon, 0, 0);

      this.ctx.restore();
    }
  }

  drawSnake() {
    if (this.snake.length === 0) return;

    this.ctx.save();
    const theme = this.themes[this.activeTheme];
    const isPhasing = this.buffs.phase > 0;
    const isTurbo = this.isBoostActive && this.boostEnergy > 0;

    // Get interpolated positions for each segment
    const lerpPositions = this.snake.map(seg => {
      let dx = seg.x - seg.prevX;
      let dy = seg.y - seg.prevY;

      // Handle wrapping jump
      if (Math.abs(dx) > 1) dx = seg.x > seg.prevX ? -1 : 1;
      if (Math.abs(dy) > 1) dy = seg.y > seg.prevY ? -1 : 1;

      return {
        x: (seg.prevX + dx * this.interpolationFactor + 0.5) * this.cellSize,
        y: (seg.prevY + dy * this.interpolationFactor + 0.5) * this.cellSize
      };
    });

    // Draw Speed Trail / Afterimages when Turbo is active
    if (isTurbo) {
      this.ctx.strokeStyle = 'rgba(255, 230, 0, 0.3)';
      this.ctx.lineWidth = this.cellSize * 0.9;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.beginPath();
      for (let i = 0; i < lerpPositions.length; i++) {
        const pt = lerpPositions[i];
        if (i === 0) this.ctx.moveTo(pt.x, pt.y);
        else this.ctx.lineTo(pt.x, pt.y);
      }
      this.ctx.stroke();
    }

    // 1. Draw Body Spine & Segments
    for (let i = lerpPositions.length - 1; i >= 0; i--) {
      const pt = lerpPositions[i];
      const progress = i / (this.snake.length - 1 || 1); // 0 at head, 1 at tail
      const radius = (this.cellSize * 0.44) * (1 - progress * 0.4); // Taper tail

      this.ctx.save();

      // Phase Shift Alpha
      if (isPhasing) {
        this.ctx.globalAlpha = 0.5 + Math.sin(performance.now() * 0.01 + i) * 0.25;
      }

      // Neon Glow
      this.ctx.shadowColor = isTurbo ? '#ffe600' : theme.glow;
      this.ctx.shadowBlur = isTurbo ? 18 : 12;

      if (i === 0) {
        // --- DRAW HEAD ---
        this.drawSnakeHead(pt, this.dir, theme, isTurbo);
      } else {
        // --- DRAW BODY SEGMENT ---
        let segColor = theme.bodyGradStart;
        if (theme.rainbow) {
          const hue = (performance.now() * 0.1 + i * 15) % 360;
          segColor = `hsl(${hue}, 100%, 60%)`;
        } else if (isTurbo) {
          segColor = '#ffe600';
        }

        this.ctx.fillStyle = segColor;
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.2;

        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Inner glowing cyber node
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, radius * 0.35, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    // 2. Draw Electric Spine Conduit connecting segments
    this.ctx.save();
    this.ctx.strokeStyle = isTurbo ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 8;

    this.ctx.beginPath();
    for (let i = 0; i < lerpPositions.length; i++) {
      const pt = lerpPositions[i];
      if (i === 0) this.ctx.moveTo(pt.x, pt.y);
      else this.ctx.lineTo(pt.x, pt.y);
    }
    this.ctx.stroke();
    this.ctx.restore();

    this.ctx.restore();
  }

  drawSnakeHead(pt, dir, theme, isTurbo) {
    this.ctx.save();
    this.ctx.translate(pt.x, pt.y);

    // Rotate head toward moving direction
    const angle = Math.atan2(dir.y, dir.x);
    this.ctx.rotate(angle);

    const headLength = this.cellSize * 0.65;
    const headWidth = this.cellSize * 0.55;

    // Head Visor Cone Beam
    this.ctx.fillStyle = 'rgba(0, 243, 255, 0.08)';
    this.ctx.beginPath();
    this.ctx.moveTo(headLength, 0);
    this.ctx.lineTo(headLength + 50, -25);
    this.ctx.lineTo(headLength + 50, 25);
    this.ctx.closePath();
    this.ctx.fill();

    // Aerodynamic Cyber Serpent Head
    this.ctx.fillStyle = isTurbo ? '#ffe600' : theme.bodyGradStart;
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = isTurbo ? '#ffe600' : theme.glow;
    this.ctx.shadowBlur = 18;

    this.ctx.beginPath();
    this.ctx.moveTo(headLength, 0);                 // Snout tip
    this.ctx.lineTo(headLength * 0.2, headWidth);   // Right cheek
    this.ctx.lineTo(-headLength * 0.6, headWidth * 0.7); // Back right
    this.ctx.lineTo(-headLength * 0.6, -headWidth * 0.7); // Back left
    this.ctx.lineTo(headLength * 0.2, -headWidth);  // Left cheek
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Glowing Visor / Headlights
    this.ctx.fillStyle = isTurbo ? '#ffffff' : theme.eye;
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 10;

    this.ctx.beginPath();
    this.ctx.arc(headLength * 0.2, -headWidth * 0.45, 2.5, 0, Math.PI * 2);
    this.ctx.arc(headLength * 0.2, headWidth * 0.45, 2.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  // ============================================================================
  // MAIN GAME LOOP
  // ============================================================================
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
    this.lastTime = timestamp;

    if (this.state === 'PLAYING') {
      this.update(dt);
    }

    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate Game on load
window.addEventListener('DOMContentLoaded', () => {
  window.cyberSnake = new CyberSnakeGame();
});
