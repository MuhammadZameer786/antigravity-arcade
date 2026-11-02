/**
 * CYBER JETPACK // Laser Flap Protocol
 * Pure Vanilla HTML5 Canvas + Web Audio API
 */

// ============================================================================
// AUDIO SYNTHESIZER (Music, Thruster Engine & Sound FX)
// ============================================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.bpm = 130;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerID = null;

    // Thruster continuous loop nodes
    this.thrustNoiseGain = null;
    this.thrustSubGain = null;
    this.thrustFilter = null;
    this.thrustNoiseNode = null;
    this.thrustSubOsc = null;
    this.isThrustSoundPlaying = false;

    // Bass notes in D minor pentatonic: D2, F2, G2, A2, C3
    this.bassNotes = [73.42, 87.31, 98.0, 110.0, 130.81];
    // Lead notes: D4, F4, G4, A4, C5, D5
    this.leadNotes = [293.66, 349.23, 392.0, 440.0, 523.25, 587.33];
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupContinuousThrustSound();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.setThrustVolume(0);
    }
    return this.muted;
  }

  setupContinuousThrustSound() {
    if (!this.ctx) return;
    try {
      // White noise buffer for rushing plasma flame
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      this.thrustNoiseNode = this.ctx.createBufferSource();
      this.thrustNoiseNode.buffer = noiseBuffer;
      this.thrustNoiseNode.loop = true;

      this.thrustFilter = this.ctx.createBiquadFilter();
      this.thrustFilter.type = 'lowpass';
      this.thrustFilter.frequency.value = 400;
      this.thrustFilter.Q.value = 3.5;

      this.thrustNoiseGain = this.ctx.createGain();
      this.thrustNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.thrustNoiseNode.connect(this.thrustFilter);
      this.thrustFilter.connect(this.thrustNoiseGain);
      this.thrustNoiseGain.connect(this.ctx.destination);
      this.thrustNoiseNode.start();

      // Deep sub-rumble oscillator for jet engine power
      this.thrustSubOsc = this.ctx.createOscillator();
      this.thrustSubOsc.type = 'sawtooth';
      this.thrustSubOsc.frequency.value = 55;

      const subFilter = this.ctx.createBiquadFilter();
      subFilter.type = 'lowpass';
      subFilter.frequency.value = 120;

      this.thrustSubGain = this.ctx.createGain();
      this.thrustSubGain.gain.setValueAtTime(0, this.ctx.currentTime);

      this.thrustSubOsc.connect(subFilter);
      subFilter.connect(this.thrustSubGain);
      this.thrustSubGain.connect(this.ctx.destination);
      this.thrustSubOsc.start();

      this.isThrustSoundPlaying = true;
    } catch (e) {
      console.warn('Audio thrust init exception:', e);
    }
  }

  setThrustVolume(targetVolume) {
    if (!this.ctx || !this.thrustNoiseGain || !this.thrustSubGain) return;
    if (this.muted) targetVolume = 0;

    const t = this.ctx.currentTime;
    const clampedVol = Math.max(0, Math.min(1, targetVolume));

    this.thrustNoiseGain.gain.cancelScheduledValues(t);
    this.thrustNoiseGain.gain.setTargetAtTime(clampedVol * 0.16, t, 0.04);

    this.thrustSubGain.gain.cancelScheduledValues(t);
    this.thrustSubGain.gain.setTargetAtTime(clampedVol * 0.11, t, 0.05);

    if (this.thrustFilter) {
      const cutoff = clampedVol > 0.01 ? 850 : 250;
      this.thrustFilter.frequency.cancelScheduledValues(t);
      this.thrustFilter.frequency.setTargetAtTime(cutoff, t, 0.06);
    }
  }

  startMusic() {
    this.init();
    if (!this.ctx || this.isPlayingMusic) return;
    this.isPlayingMusic = true;
    this.step = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleNextBeat();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
    this.setThrustVolume(0);
  }

  scheduleNextBeat() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const secondsPer16th = 60.0 / (this.bpm * 4);
    while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
      if (!this.muted) {
        this.playBeatStep(this.step, this.nextNoteTime);
      }
      this.nextNoteTime += secondsPer16th;
      this.step = (this.step + 1) % 16;
    }

    this.timerID = setTimeout(() => this.scheduleNextBeat(), 25);
  }

  playBeatStep(step, time) {
    if (!this.ctx) return;

    // 4-on-the-floor kick
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Snare / clap on 4 and 12
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // Hi-hat on offbeats
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 2 ? 0.04 : 0.02);
    }

    // Running bassline on 16th notes
    if (step % 2 === 0) {
      const idx = (Math.floor(step / 4) + Math.floor(step / 2)) % this.bassNotes.length;
      this.playBassNote(this.bassNotes[idx], time);
    }

    // Periodic synth arpeggio
    if (step % 4 === 2 && Math.random() > 0.35) {
      const leadIdx = Math.floor(Math.random() * this.leadNotes.length);
      this.playLeadNote(this.leadNotes[leadIdx], time);
    }
  }

  playKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.11);
    } catch (e) {}
  }

  playSnare(time) {
    try {
      // Noise burst
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
    } catch (e) {}
  }

  playHiHat(time, vol = 0.03) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(7500, time);

      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.03);
    } catch (e) {}
  }

  playBassNote(freq, time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.14);
    } catch (e) {}
  }

  playLeadNote(freq, time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.09, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.18);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.18);
    } catch (e) {}
  }

  // SFX: Data Coin collect (harmonized crystal chime)
  playCoin(combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
      const freq = notes[Math.min(combo - 1, notes.length - 1)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  // SFX: Power-Up collect
  playPowerup(type) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const chords = [440, 554.37, 659.25, 880];
      chords.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);

        gain.gain.setValueAtTime(0.12, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.25);
      });
    } catch (e) {}
  }

  // SFX: Shield pop / EMP shockwave
  playShieldBreak() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.22);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.24);
    } catch (e) {}
  }

  // SFX: Close Call / Near Miss whoosh
  playNearMiss() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(950, t + 0.06);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.16);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  // SFX: Missile Warning Siren
  playWarning() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'square';
      osc.frequency.setValueAtTime(900, t);
      osc.frequency.setValueAtTime(1200, t + 0.08);

      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);
    } catch (e) {}
  }

  // SFX: Overdrive / Hyper Warp Sonic Boom
  playWarp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, t);
      osc.frequency.exponentialRampToValueAtTime(1600, t + 0.3);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    } catch (e) {}
  }

  // SFX: Explosion / Game Over Crash
  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // Low dive oscillator
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.45);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);

      // Noise burst for debris crunch
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      noise.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      noise.start(t);
    } catch (e) {}
  }
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================
class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(options) {
    const {
      x, y,
      vx = (Math.random() - 0.5) * 100,
      vy = (Math.random() - 0.5) * 100,
      size = 3,
      color = '#00f3ff',
      glow = true,
      life = 0.5,
      decay = true,
      shrink = true,
      shape = 'circle'
    } = options;

    this.particles.push({
      x, y, vx, vy, size, startSize: size,
      color, glow, life, maxLife: life,
      decay, shrink, shape
    });
  }

  // Jetpack twin plasma blast
  emitJetpackFlame(x, y, vxBase, vyBase, isWarp = false) {
    const count = isWarp ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const spreadX = (Math.random() - 0.5) * 20;
      const spreadY = Math.random() * 60 + 120;
      const isCore = Math.random() < 0.4;
      const color = isWarp
        ? (isCore ? '#ffffff' : (Math.random() < 0.5 ? '#ffe600' : '#ff007f'))
        : (isCore ? '#ffffff' : (Math.random() < 0.6 ? '#00f3ff' : '#05ffa1'));

      this.emit({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: vxBase - 180 + spreadX,
        vy: vyBase + spreadY + (Math.random() - 0.5) * 30,
        size: isCore ? 4 : (Math.random() * 5 + 3),
        color: color,
        life: Math.random() * 0.25 + 0.15,
        shape: 'circle'
      });
    }
  }

  // Spark burst for wall scraping or laser impact
  emitSparks(x, y, color = '#ffaa00', count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 80;
      this.emit({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        color: color,
        life: Math.random() * 0.35 + 0.15,
        shape: 'spark'
      });
    }
  }

  // Shockwave ring on explosions / shield pops
  emitShockwave(x, y, color = '#00f3ff', maxRadius = 90) {
    this.particles.push({
      x, y,
      radius: 5,
      maxRadius: maxRadius,
      color: color,
      life: 0.35,
      maxLife: 0.35,
      shape: 'ring'
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

      if (p.shape === 'ring') {
        const progress = 1 - (p.life / p.maxLife);
        p.radius = progress * p.maxRadius;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.shrink) {
          p.size = p.startSize * (p.life / p.maxLife);
        }
      }
    }
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;

      if (p.shape === 'ring') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * alpha;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.stroke();
      } else if (p.shape === 'spark') {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * 1.8, p.size * 0.8);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
        }
        ctx.fill();
      }
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ============================================================================
// FLOATING COMBAT TEXT
// ============================================================================
class FloatingTextManager {
  constructor() {
    this.texts = [];
  }

  spawn(x, y, text, color = '#ffe600', scale = 1) {
    this.texts.push({
      x, y, text, color, scale,
      life: 0.85, maxLife: 0.85,
      vy: -55
    });
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.font = '700 14px "Orbitron", monospace';
    ctx.textAlign = 'center';

    for (const t of this.texts) {
      const progress = t.life / t.maxLife;
      ctx.globalAlpha = Math.max(0, progress);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 8;

      ctx.save();
      ctx.translate(t.x, t.y);
      const pulseScale = 1 + (1 - progress) * 0.3;
      ctx.scale(pulseScale * t.scale, pulseScale * t.scale);
      ctx.fillText(t.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
  }

  clear() {
    this.texts = [];
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class CyberJetpackGame {
  constructor() {
    // Canvas & Setup
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = 960;
    this.height = 540;

    // Boundaries
    this.ceilingY = 32;
    this.floorY = 508;

    // Sub-systems
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();
    this.floatTexts = new FloatingTextManager();

    // Game States
    this.state = 'START'; // 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER'
    this.lastTime = performance.now();

    // Inputs
    this.isThrusting = false;
    this.keysDown = new Set();

    // Player State
    this.player = {
      x: 180,
      y: 270,
      vy: 0,
      radius: 17,
      angle: 0,
      isFloorGrounded: false,
      isCeilingScraping: false,
      flameAnimTimer: 0,
      // Visual flair
      visorGlow: 1,
      invulnerableTimer: 0
    };

    // Physics Constants
    this.gravity = 1150;      // px/s^2 downwards
    this.thrustPower = -2150; // px/s^2 upwards
    this.maxFallSpeed = 520;
    this.maxRiseSpeed = -490;

    // Progression & Speed
    this.baseSpeed = 260;     // px/s scrolling speed
    this.currentSpeed = 260;
    this.distanceMeters = 0;
    this.score = 0;
    this.coins = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.closeCallCount = 0;

    // Overdrive Meter (0 to 100)
    this.overdriveMeter = 0;
    this.isOverdriveActive = false;
    this.overdriveDuration = 0;

    // Power-Ups Active Status
    this.powerups = {
      shield: false,
      magnetTimer: 0,
      warpTimer: 0,
      chronosTimer: 0
    };

    // Obstacles & Items Containers
    this.lasers = [];
    this.missiles = [];
    this.coinsList = [];
    this.powerupDrops = [];

    // Spawning Timers & Distances
    this.nextLaserDistance = 450;
    this.nextCoinDistance = 250;
    this.nextPowerupDistance = 1400;
    this.nextMissileTimer = 8.0;

    // Parallax Background Layers
    this.bgOffsets = [0, 0, 0, 0];
    this.bgStars = this.generateStars(80);
    this.cityBuildings = this.generateCityScape();

    // Camera Shake
    this.screenShake = 0;

    // DOM UI Caches
    this.hudScore = document.getElementById('score-display');
    this.hudDist = document.getElementById('dist-display');
    this.hudCoins = document.getElementById('coin-display');
    this.hudMult = document.getElementById('mult-display');
    this.hudHighscore = document.getElementById('hud-highscore');
    this.hudPowerupRow = document.getElementById('powerup-hud-row');
    this.hudOverdriveFill = document.getElementById('overdrive-bar-fill');
    this.hudOverdriveText = document.getElementById('overdrive-status');
    this.bannerNotification = document.getElementById('banner-notification');

    // Modals
    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.touchZone = document.getElementById('touch-zone');

    // Local Storage High Scores
    this.highscore = parseInt(localStorage.getItem('cyber_jetpack_highscore') || '0', 10);
    this.bestDistance = parseInt(localStorage.getItem('cyber_jetpack_best_distance') || '0', 10);
    this.totalCoinsSaved = parseInt(localStorage.getItem('cyber_jetpack_total_coins') || '0', 10);

    this.hudHighscore.textContent = this.highscore.toLocaleString();

    this.initEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  // --------------------------------------------------------------------------
  // BACKGROUND ASSETS INITIALIZATION
  // --------------------------------------------------------------------------
  generateStars(count) {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.8,
        alpha: Math.random() * 0.7 + 0.3,
        blinkSpeed: Math.random() * 2 + 1
      });
    }
    return stars;
  }

  generateCityScape() {
    const buildings = [];
    let currentX = 0;
    while (currentX < this.width * 2) {
      const bWidth = Math.random() * 60 + 40;
      const bHeight = Math.random() * 180 + 120;
      const hasAntenna = Math.random() > 0.6;
      const neonColor = Math.random() > 0.5 ? '#00f3ff' : '#ff007f';
      const windowRows = Math.floor(bHeight / 24);
      const windowCols = Math.floor(bWidth / 14);

      buildings.push({
        x: currentX,
        width: bWidth,
        height: bHeight,
        hasAntenna,
        neonColor,
        windowRows,
        windowCols
      });
      currentX += bWidth + Math.random() * 15;
    }
    return buildings;
  }

  // --------------------------------------------------------------------------
  // EVENT LISTENERS & ONE-TOUCH INPUT HANDLING
  // --------------------------------------------------------------------------
  initEvents() {
    // Keyboard inputs
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keysDown.add(e.code);

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (this.state === 'START') {
          this.startGame();
        } else if (this.state === 'GAMEOVER') {
          this.startGame();
        } else if (this.state === 'PLAYING') {
          this.setThrust(true);
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      } else if (e.code === 'KeyM') {
        this.toggleAudio();
      } else if (e.code === 'KeyR') {
        if (this.state === 'GAMEOVER' || this.state === 'PAUSED') {
          this.startGame();
        }
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE') {
        if (this.state === 'PLAYING' && this.overdriveMeter >= 100 && !this.isOverdriveActive) {
          this.triggerOverdrive();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        // If no thrust keys down, cut thrusters
        if (!this.keysDown.has('Space') && !this.keysDown.has('ArrowUp') && !this.keysDown.has('KeyW') && !this.pointerThrusting) {
          this.setThrust(false);
        }
      }
    });

    // Touch Zone (Mouse & Mobile Touch)
    this.pointerThrusting = false;

    const onPointerDown = (e) => {
      e.preventDefault();
      this.audio.init();

      if (this.state === 'START') {
        this.startGame();
        return;
      }
      if (this.state === 'GAMEOVER') {
        this.startGame();
        return;
      }
      if (this.state === 'PLAYING') {
        this.pointerThrusting = true;
        this.setThrust(true);
      }
    };

    const onPointerUp = (e) => {
      e.preventDefault();
      this.pointerThrusting = false;
      if (!this.keysDown.has('Space') && !this.keysDown.has('ArrowUp') && !this.keysDown.has('KeyW')) {
        this.setThrust(false);
      }
    };

    this.touchZone.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mouseup', onPointerUp);

    this.touchZone.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchend', onPointerUp, { passive: false });
    window.addEventListener('touchcancel', onPointerUp, { passive: false });

    // Don't run on while the phone is locked, or behind the rotate prompt
    const pauseIfPlaying = () => {
      if (this.state === 'PLAYING') this.pauseGame();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseIfPlaying();
    });
    window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
      if (e.matches) pauseIfPlaying();
    });

    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.startGame());

    document.getElementById('btn-pause').addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    });

    document.getElementById('btn-audio-toggle').addEventListener('click', () => this.toggleAudio());

    // Window Blur
    window.addEventListener('blur', () => {
      if (this.state === 'PLAYING') {
        this.pauseGame();
      }
      this.setThrust(false);
    });
  }

  setThrust(active) {
    if (this.isThrusting === active) return;
    this.isThrusting = active;
    this.audio.setThrustVolume(active ? 1.0 : 0);
  }

  toggleAudio() {
    const isMuted = this.audio.toggleMute();
    document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
  }

  // --------------------------------------------------------------------------
  // GAME LIFECYCLE
  // --------------------------------------------------------------------------
  startGame() {
    this.audio.init();
    this.audio.startMusic();

    this.state = 'PLAYING';
    this.startScreen.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');

    // Reset Player
    this.player.x = 180;
    this.player.y = 270;
    this.player.vy = 0;
    this.player.angle = 0;
    this.player.invulnerableTimer = 0.5;

    // Reset Parameters
    this.distanceMeters = 0;
    this.score = 0;
    this.coins = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.closeCallCount = 0;
    this.currentSpeed = this.baseSpeed;
    this.screenShake = 0;

    // Reset Overdrive
    this.overdriveMeter = 0;
    this.isOverdriveActive = false;
    this.overdriveDuration = 0;

    // Reset Power-Ups
    this.powerups.shield = false;
    this.powerups.magnetTimer = 0;
    this.powerups.warpTimer = 0;
    this.powerups.chronosTimer = 0;

    // Clear Entities
    this.lasers = [];
    this.missiles = [];
    this.coinsList = [];
    this.powerupDrops = [];
    this.particles.clear();
    this.floatTexts.clear();

    // Spacing
    this.nextLaserDistance = 400;
    this.nextCoinDistance = 200;
    this.nextPowerupDistance = 1200;
    this.nextMissileTimer = 7.5;

    this.setThrust(false);
    this.updateHUD();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.pauseScreen.classList.add('active');
    this.setThrust(false);
    this.audio.stopMusic();
    document.getElementById('pause-icon').textContent = '▶';
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.pauseScreen.classList.remove('active');
    this.audio.startMusic();
    this.lastTime = performance.now();
    document.getElementById('pause-icon').textContent = '⏸';
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.audio.stopMusic();
    this.audio.playExplosion();
    this.setThrust(false);

    // Screen Shake & Death Explosion
    this.screenShake = 22;
    this.particles.emitSparks(this.player.x, this.player.y, '#ff007f', 35);
    this.particles.emitSparks(this.player.x, this.player.y, '#00f3ff', 25);
    this.particles.emitShockwave(this.player.x, this.player.y, '#ff007f', 150);

    // High Score Checks
    let isNewRecord = false;
    if (this.score > this.highscore) {
      this.highscore = this.score;
      localStorage.setItem('cyber_jetpack_highscore', this.highscore.toString());
      isNewRecord = true;
    }

    if (this.distanceMeters > this.bestDistance) {
      this.bestDistance = Math.floor(this.distanceMeters);
      localStorage.setItem('cyber_jetpack_best_distance', this.bestDistance.toString());
    }

    this.totalCoinsSaved += this.coins;
    localStorage.setItem('cyber_jetpack_total_coins', this.totalCoinsSaved.toString());

    // Update Game Over Modal
    document.getElementById('res-score').textContent = this.score.toLocaleString();
    document.getElementById('res-distance').textContent = Math.floor(this.distanceMeters) + 'm';
    document.getElementById('res-coins').textContent = this.coins.toLocaleString();
    document.getElementById('res-closecalls').textContent = this.closeCallCount.toString();
    document.getElementById('res-highscore').textContent = this.highscore.toLocaleString();

    const recordBadge = document.getElementById('new-record-badge');
    if (isNewRecord) {
      recordBadge.classList.remove('hidden');
    } else {
      recordBadge.classList.add('hidden');
    }

    setTimeout(() => {
      this.gameoverScreen.classList.add('active');
    }, 450);
  }

  // --------------------------------------------------------------------------
  // MAIN LOOP
  // --------------------------------------------------------------------------
  loop(now) {
    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05); // Prevent tunneling on tab switch

    this.update(dt);
    this.draw();

    requestAnimationFrame(this.loop);
  }

  // --------------------------------------------------------------------------
  // UPDATE LOGIC
  // --------------------------------------------------------------------------
  update(dt) {
    // Ambient animations even when paused or in start screen
    this.particles.update(dt);
    this.floatTexts.update(dt);

    if (this.screenShake > 0) {
      this.screenShake = Math.max(0, this.screenShake - dt * 35);
    }

    if (this.state !== 'PLAYING') return;

    // Time Dilation Factor (Chronos power-up)
    const timeScale = this.powerups.chronosTimer > 0 ? 0.5 : 1.0;
    const effectiveDt = dt * timeScale;

    // Speed progression curve based on distance
    const speedMultiplier = this.isOverdriveActive ? 2.4 : 1.0;
    this.currentSpeed = (this.baseSpeed + Math.min(180, this.distanceMeters * 0.12)) * speedMultiplier;

    // Distance & Score progression
    const distDelta = (this.currentSpeed * effectiveDt) / 30; // 30 px = 1 meter
    this.distanceMeters += distDelta;
    this.score += Math.floor(distDelta * 10 * this.combo);

    // Update Background Parallax
    this.bgOffsets[0] = (this.bgOffsets[0] + this.currentSpeed * 0.1 * effectiveDt) % this.width;
    this.bgOffsets[1] = (this.bgOffsets[1] + this.currentSpeed * 0.3 * effectiveDt) % this.width;
    this.bgOffsets[2] = (this.bgOffsets[2] + this.currentSpeed * 0.65 * effectiveDt) % this.width;
    this.bgOffsets[3] = (this.bgOffsets[3] + this.currentSpeed * effectiveDt) % this.width;

    // Combo decay timer
    if (this.combo > 1) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateComboDisplay();
      }
    }

    // Power-Up Countdown Timers
    this.updatePowerupTimers(dt);

    // Player Physics & Thrusters
    this.updatePlayerPhysics(dt);

    // Obstacle Spawners & Updates
    this.updateLasers(effectiveDt);
    this.updateMissiles(effectiveDt);
    this.updateCoins(effectiveDt);
    this.updatePowerupDrops(effectiveDt);

    // Collisions
    this.checkCollisions();

    // HUD Refreshes
    this.updateHUD();
  }

  updatePlayerPhysics(dt) {
    const p = this.player;

    if (p.invulnerableTimer > 0) {
      p.invulnerableTimer -= dt;
    }

    // Thrust acceleration vs gravity
    let accel = this.gravity;
    if (this.isThrusting) {
      accel += this.thrustPower;
      this.particles.emitJetpackFlame(p.x - 18, p.y + 4, 0, p.vy * 0.2, this.isOverdriveActive);
    }

    p.vy += accel * dt;
    p.vy = Math.max(this.maxRiseSpeed, Math.min(this.maxFallSpeed, p.vy));
    p.y += p.vy * dt;

    // Bounds checking & surface interaction
    p.isCeilingScraping = false;
    p.isFloorGrounded = false;

    if (p.y <= this.ceilingY) {
      p.y = this.ceilingY;
      if (p.vy < 0) {
        p.vy = 0;
        p.isCeilingScraping = true;
        this.particles.emitSparks(p.x, this.ceilingY + 4, '#00f3ff', 2);
      }
    }

    if (p.y >= this.floorY) {
      p.y = this.floorY;
      if (p.vy > 0) {
        p.vy = 0;
        p.isFloorGrounded = true;
        this.particles.emitSparks(p.x, this.floorY - 4, '#ffaa00', 3);
      }
    }

    // Dynamic tilt angle
    const targetAngle = (p.vy / this.maxFallSpeed) * 0.38;
    p.angle += (targetAngle - p.angle) * 12 * dt;
    p.flameAnimTimer += dt * 15;
  }

  updatePowerupTimers(dt) {
    // Overdrive Boost
    if (this.isOverdriveActive) {
      this.overdriveDuration -= dt;
      this.screenShake = Math.max(this.screenShake, 3);
      this.particles.emitJetpackFlame(this.player.x - 22, this.player.y, -120, 0, true);

      if (this.overdriveDuration <= 0) {
        this.isOverdriveActive = false;
        this.overdriveMeter = 0;
        this.triggerBanner('OVERDRIVE EXHAUSTED');
      }
    }

    // Magnet
    if (this.powerups.magnetTimer > 0) {
      this.powerups.magnetTimer -= dt;
    }

    // Chronos (Slow-Mo)
    if (this.powerups.chronosTimer > 0) {
      this.powerups.chronosTimer -= dt;
    }
  }

  // --------------------------------------------------------------------------
  // SPAWNERS & HAZARDS
  // --------------------------------------------------------------------------
  updateLasers(dt) {
    const scrollDelta = this.currentSpeed * dt;

    // Move existing lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const laser = this.lasers[i];
      laser.x -= scrollDelta;
      laser.animTimer += dt * 4;

      // Handle moving / oscillating laser
      if (laser.type === 'oscillating') {
        laser.y = laser.baseY + Math.sin(laser.animTimer * 1.8) * laser.amplitude;
      } else if (laser.type === 'spinner') {
        laser.rotation += dt * laser.spinSpeed;
      } else if (laser.type === 'zapper') {
        laser.pulseTimer = (laser.pulseTimer + dt) % laser.pulseCycle;
        laser.isActive = laser.pulseTimer < laser.activeDuration;
      }

      // Despawn off-screen
      if (laser.x < -120) {
        this.lasers.splice(i, 1);
      }
    }

    // Spawn new lasers based on distance
    this.nextLaserDistance -= scrollDelta;
    if (this.nextLaserDistance <= 0) {
      this.spawnLaserPattern();
      // Distance between laser obstacles tightens slightly as run progresses
      const minSpacing = Math.max(260, 440 - this.distanceMeters * 0.08);
      this.nextLaserDistance = minSpacing + Math.random() * 160;
    }
  }

  spawnLaserPattern() {
    const patterns = ['single_vertical', 'dual_gate', 'oscillating', 'spinner', 'zapper'];
    const pType = patterns[Math.floor(Math.random() * patterns.length)];
    const spawnX = this.width + 80;

    if (pType === 'single_vertical') {
      // Top or Bottom hanging laser beam
      const isTop = Math.random() > 0.5;
      const height = Math.random() * 160 + 140;
      const y1 = isTop ? this.ceilingY : this.floorY - height;
      const y2 = isTop ? this.ceilingY + height : this.floorY;

      this.lasers.push({
        type: 'vertical',
        x: spawnX,
        y1: y1,
        y2: y2,
        width: 14,
        animTimer: Math.random() * 10,
        isActive: true,
        nearMissTriggered: false
      });
    } else if (pType === 'dual_gate') {
      // Beam with gap in the center or high/low
      const gapY = Math.random() * 220 + 160;
      const gapSize = Math.max(145, 190 - this.distanceMeters * 0.04);

      // Top segment
      this.lasers.push({
        type: 'vertical',
        x: spawnX,
        y1: this.ceilingY,
        y2: gapY - gapSize / 2,
        width: 14,
        animTimer: 0,
        isActive: true,
        nearMissTriggered: false
      });

      // Bottom segment
      this.lasers.push({
        type: 'vertical',
        x: spawnX,
        y1: gapY + gapSize / 2,
        y2: this.floorY,
        width: 14,
        animTimer: 0,
        isActive: true,
        nearMissTriggered: false
      });
    } else if (pType === 'oscillating') {
      const baseY = (this.ceilingY + this.floorY) / 2;
      this.lasers.push({
        type: 'oscillating',
        x: spawnX,
        baseY: baseY,
        y: baseY,
        beamHeight: 180,
        amplitude: 80,
        width: 14,
        animTimer: Math.random() * 5,
        isActive: true,
        nearMissTriggered: false
      });
    } else if (pType === 'spinner') {
      const centerY = Math.random() * 220 + 160;
      this.lasers.push({
        type: 'spinner',
        x: spawnX,
        y: centerY,
        armLength: 125,
        rotation: Math.random() * Math.PI,
        spinSpeed: (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 0.8),
        width: 12,
        animTimer: 0,
        isActive: true,
        nearMissTriggered: false
      });
    } else if (pType === 'zapper') {
      const y1 = Math.random() * 160 + 100;
      const y2 = y1 + 180;
      this.lasers.push({
        type: 'zapper',
        x: spawnX,
        y1: y1,
        y2: y2,
        width: 16,
        pulseCycle: 2.8,
        activeDuration: 1.6,
        pulseTimer: 0,
        animTimer: 0,
        isActive: true,
        nearMissTriggered: false
      });
    }
  }

  updateMissiles(dt) {
    // Missile warning & launch timer
    this.nextMissileTimer -= dt;
    if (this.nextMissileTimer <= 0) {
      this.spawnMissile();
      this.nextMissileTimer = Math.max(5.5, 9.0 - this.distanceMeters * 0.05) + Math.random() * 3;
    }

    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];

      if (m.state === 'warning') {
        m.warningTimer -= dt;
        // Tracking player altitude during warning phase
        m.targetY += (this.player.y - m.targetY) * 4 * dt;
        m.y = m.targetY;

        if (m.warningTimer <= 0) {
          m.state = 'launch';
          m.x = this.width + 60;
          this.audio.playWarning();
        }
      } else if (m.state === 'launch') {
        m.x -= m.speed * dt;
        // Subtle flight correction towards player
        m.y += Math.sign(this.player.y - m.y) * 45 * dt;

        // Smoke and rocket flame particles
        this.particles.emit({
          x: m.x + 28,
          y: m.y,
          vx: Math.random() * 60 + 80,
          vy: (Math.random() - 0.5) * 20,
          size: Math.random() * 4 + 3,
          color: Math.random() < 0.6 ? '#ff007f' : '#ff7700',
          life: 0.2
        });

        if (m.x < -80) {
          this.missiles.splice(i, 1);
        }
      }
    }
  }

  spawnMissile() {
    this.audio.playWarning();
    this.missiles.push({
      state: 'warning',
      x: this.width - 45,
      y: this.player.y,
      targetY: this.player.y,
      warningTimer: 1.1,
      speed: 740,
      radius: 12,
      nearMissTriggered: false
    });
  }

  updateCoins(dt) {
    const scrollDelta = this.currentSpeed * dt;

    // Move existing coins
    for (let i = this.coinsList.length - 1; i >= 0; i--) {
      const coin = this.coinsList[i];
      coin.x -= scrollDelta;
      coin.rotation += dt * 3.5;

      // Magnet attractor logic
      if (this.powerups.magnetTimer > 0) {
        const dx = this.player.x - coin.x;
        const dy = this.player.y - coin.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 320) {
          const pullSpeed = 550;
          coin.x += (dx / dist) * pullSpeed * dt;
          coin.y += (dy / dist) * pullSpeed * dt;

          // Draw magnetic lightning tether particle
          if (Math.random() < 0.25) {
            this.particles.emit({
              x: coin.x,
              y: coin.y,
              vx: (dx / dist) * 120,
              vy: (dy / dist) * 120,
              size: 2,
              color: '#9d00ff',
              life: 0.15
            });
          }
        }
      }

      // Collect coin
      const distToPlayer = Math.hypot(this.player.x - coin.x, this.player.y - coin.y);
      if (distToPlayer < this.player.radius + coin.radius + 6) {
        this.collectCoin(coin, i);
        continue;
      }

      // Despawn off-screen
      if (coin.x < -40) {
        this.coinsList.splice(i, 1);
      }
    }

    // Spawn coin waves
    this.nextCoinDistance -= scrollDelta;
    if (this.nextCoinDistance <= 0) {
      this.spawnCoinFormation();
      this.nextCoinDistance = 320 + Math.random() * 200;
    }
  }

  spawnCoinFormation() {
    const formationTypes = ['arc', 'sine', 'stair', 'ring'];
    const fType = formationTypes[Math.floor(Math.random() * formationTypes.length)];
    const startX = this.width + 60;
    const baseY = Math.random() * 240 + 150;

    if (fType === 'arc') {
      const count = 7;
      for (let i = 0; i < count; i++) {
        const progress = i / (count - 1);
        const arcY = baseY - Math.sin(progress * Math.PI) * 90;
        this.coinsList.push({
          x: startX + i * 36,
          y: Math.max(this.ceilingY + 30, Math.min(this.floorY - 30, arcY)),
          radius: 11,
          rotation: Math.random() * Math.PI
        });
      }
    } else if (fType === 'sine') {
      const count = 8;
      for (let i = 0; i < count; i++) {
        const sineY = baseY + Math.sin(i * 0.8) * 60;
        this.coinsList.push({
          x: startX + i * 34,
          y: Math.max(this.ceilingY + 30, Math.min(this.floorY - 30, sineY)),
          radius: 11,
          rotation: Math.random() * Math.PI
        });
      }
    } else if (fType === 'stair') {
      const count = 6;
      const stepDirection = Math.random() > 0.5 ? 1 : -1;
      for (let i = 0; i < count; i++) {
        const stairY = baseY + i * 28 * stepDirection;
        this.coinsList.push({
          x: startX + i * 35,
          y: Math.max(this.ceilingY + 30, Math.min(this.floorY - 30, stairY)),
          radius: 11,
          rotation: Math.random() * Math.PI
        });
      }
    } else if (fType === 'ring') {
      const count = 8;
      const radius = 55;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        this.coinsList.push({
          x: startX + 60 + Math.cos(angle) * radius,
          y: baseY + Math.sin(angle) * radius,
          radius: 11,
          rotation: Math.random() * Math.PI
        });
      }
    }
  }

  collectCoin(coin, index) {
    this.coinsList.splice(index, 1);
    this.coins++;
    this.combo = Math.min(5, this.combo + 0.2);
    this.comboTimer = 2.5;

    const pointsGained = Math.floor(100 * Math.floor(this.combo));
    this.score += pointsGained;

    // Overdrive charge increment (2.5% per coin)
    if (!this.isOverdriveActive) {
      this.overdriveMeter = Math.min(100, this.overdriveMeter + 2.5);
      if (this.overdriveMeter >= 100) {
        this.hudOverdriveText.textContent = 'READY! [E] / [SHIFT]';
        this.hudOverdriveText.classList.add('overdrive-ready');
      }
    }

    this.audio.playCoin(Math.floor(this.combo));
    this.particles.emitSparks(coin.x, coin.y, '#ffe600', 8);
    this.floatTexts.spawn(coin.x, coin.y - 12, `+${pointsGained}`, '#ffe600', 0.9);
    this.updateComboDisplay();
  }

  updatePowerupDrops(dt) {
    const scrollDelta = this.currentSpeed * dt;

    for (let i = this.powerupDrops.length - 1; i >= 0; i--) {
      const drop = this.powerupDrops[i];
      drop.x -= scrollDelta;
      drop.floatTimer += dt * 3;
      drop.y = drop.baseY + Math.sin(drop.floatTimer) * 15;

      const dist = Math.hypot(this.player.x - drop.x, this.player.y - drop.y);
      if (dist < this.player.radius + drop.radius + 6) {
        this.collectPowerup(drop.type, drop.x, drop.y);
        this.powerupDrops.splice(i, 1);
        continue;
      }

      if (drop.x < -50) {
        this.powerupDrops.splice(i, 1);
      }
    }

    // Power-Up Spawner
    this.nextPowerupDistance -= scrollDelta;
    if (this.nextPowerupDistance <= 0) {
      this.spawnPowerupDrop();
      this.nextPowerupDistance = 1500 + Math.random() * 800;
    }
  }

  spawnPowerupDrop() {
    const types = ['shield', 'magnet', 'boost', 'chronos'];
    const type = types[Math.floor(Math.random() * types.length)];
    const baseY = Math.random() * 240 + 150;

    this.powerupDrops.push({
      type: type,
      x: this.width + 60,
      baseY: baseY,
      y: baseY,
      radius: 18,
      floatTimer: Math.random() * 10
    });
  }

  collectPowerup(type, x, y) {
    this.audio.playPowerup(type);
    this.particles.emitShockwave(x, y, '#00f3ff', 80);
    this.particles.emitSparks(x, y, '#00f3ff', 20);

    if (type === 'shield') {
      this.powerups.shield = true;
      this.triggerBanner('CYBER SHIELD ARMED');
      this.floatTexts.spawn(x, y - 20, 'SHIELD ARMED!', '#00f3ff', 1.2);
    } else if (type === 'magnet') {
      this.powerups.magnetTimer = 10;
      this.triggerBanner('DATA MAGNET ONLINE');
      this.floatTexts.spawn(x, y - 20, 'MAGNET x10s', '#9d00ff', 1.2);
    } else if (type === 'boost') {
      this.triggerOverdrive();
    } else if (type === 'chronos') {
      this.powerups.chronosTimer = 8;
      this.triggerBanner('CHRONOS MATRIX ACTIVE');
      this.floatTexts.spawn(x, y - 20, 'TIME DILATION', '#05ffa1', 1.2);
    }
  }

  triggerOverdrive() {
    this.isOverdriveActive = true;
    this.overdriveDuration = 6.0;
    this.audio.playWarp();
    this.screenShake = 16;
    this.triggerBanner('HYPER WARP OVERDRIVE!');
    this.particles.emitShockwave(this.player.x, this.player.y, '#ffe600', 140);
    this.floatTexts.spawn(this.player.x, this.player.y - 30, 'HYPER OVERDRIVE!', '#ffe600', 1.4);
  }

  // --------------------------------------------------------------------------
  // COLLISION DETECTION & NEAR-MISS PROTOCOL
  // --------------------------------------------------------------------------
  checkCollisions() {
    const p = this.player;
    if (p.invulnerableTimer > 0) return;

    // Check Laser Collisions
    for (const laser of this.lasers) {
      if (!laser.isActive) continue;

      let hit = false;
      let nearMiss = false;

      if (laser.type === 'vertical' || laser.type === 'zapper') {
        const segDist = this.distancePointToSegment(p.x, p.y, laser.x, laser.y1, laser.x, laser.y2);
        if (segDist < p.radius + laser.width / 2) {
          hit = true;
        } else if (segDist < p.radius + laser.width / 2 + 28 && !laser.nearMissTriggered) {
          nearMiss = true;
          laser.nearMissTriggered = true;
        }
      } else if (laser.type === 'oscillating') {
        const halfH = laser.beamHeight / 2;
        const segDist = this.distancePointToSegment(p.x, p.y, laser.x, laser.y - halfH, laser.x, laser.y + halfH);
        if (segDist < p.radius + laser.width / 2) {
          hit = true;
        } else if (segDist < p.radius + laser.width / 2 + 28 && !laser.nearMissTriggered) {
          nearMiss = true;
          laser.nearMissTriggered = true;
        }
      } else if (laser.type === 'spinner') {
        const x2_a = laser.x + Math.cos(laser.rotation) * laser.armLength;
        const y2_a = laser.y + Math.sin(laser.rotation) * laser.armLength;
        const x2_b = laser.x - Math.cos(laser.rotation) * laser.armLength;
        const y2_b = laser.y - Math.sin(laser.rotation) * laser.armLength;

        const distA = this.distancePointToSegment(p.x, p.y, laser.x, laser.y, x2_a, y2_a);
        const distB = this.distancePointToSegment(p.x, p.y, laser.x, laser.y, x2_b, y2_b);
        const minRotDist = Math.min(distA, distB);

        if (minRotDist < p.radius + laser.width / 2) {
          hit = true;
        } else if (minRotDist < p.radius + laser.width / 2 + 28 && !laser.nearMissTriggered) {
          nearMiss = true;
          laser.nearMissTriggered = true;
        }
      }

      if (nearMiss && !hit) {
        this.triggerNearMiss(p.x, p.y);
      }

      if (hit) {
        this.handleHazardCollision(laser.x, p.y);
        return;
      }
    }

    // Check Missile Collisions
    for (const m of this.missiles) {
      if (m.state !== 'launch') continue;

      const dist = Math.hypot(p.x - m.x, p.y - m.y);
      if (dist < p.radius + m.radius) {
        this.handleHazardCollision(m.x, m.y);
        return;
      } else if (dist < p.radius + m.radius + 32 && !m.nearMissTriggered) {
        m.nearMissTriggered = true;
        this.triggerNearMiss(m.x, m.y);
      }
    }
  }

  distancePointToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = x1 + t * (x2 - x1);
    const projY = y1 + t * (y2 - y1);
    return Math.hypot(px - projX, py - projY);
  }

  triggerNearMiss(x, y) {
    this.closeCallCount++;
    const bonus = 500 * Math.floor(this.combo);
    this.score += bonus;
    this.audio.playNearMiss();
    this.screenShake = 5;
    this.particles.emitSparks(x, y, '#05ffa1', 12);
    this.floatTexts.spawn(x, y - 25, `CLOSE CALL! +${bonus}`, '#05ffa1', 1.15);
  }

  handleHazardCollision(x, y) {
    // If Overdrive is active, player smashes through obstacles!
    if (this.isOverdriveActive) {
      this.screenShake = 12;
      this.particles.emitSparks(x, y, '#ffe600', 30);
      this.particles.emitShockwave(x, y, '#ffe600', 100);
      this.score += 1000;
      this.floatTexts.spawn(x, y - 20, 'OBLITERATED! +1000', '#ffe600', 1.3);
      return;
    }

    // If Shield is armed, shield breaks & creates EMP shockwave
    if (this.powerups.shield) {
      this.powerups.shield = false;
      this.player.invulnerableTimer = 1.2;
      this.audio.playShieldBreak();
      this.screenShake = 15;
      this.particles.emitShockwave(this.player.x, this.player.y, '#00f3ff', 240);
      this.particles.emitSparks(this.player.x, this.player.y, '#00f3ff', 35);
      this.floatTexts.spawn(this.player.x, this.player.y - 30, 'SHIELD BROKEN!', '#00f3ff', 1.3);

      // Destroy all missiles and clear nearby laser threats
      this.missiles = [];
      return;
    }

    // Fatal Impact
    this.gameOver();
  }

  // --------------------------------------------------------------------------
  // HUD & UI UPDATES
  // --------------------------------------------------------------------------
  updateHUD() {
    this.hudScore.textContent = this.score.toString().padStart(6, '0');
    this.hudDist.textContent = Math.floor(this.distanceMeters) + 'm';
    this.hudCoins.textContent = this.coins.toLocaleString();

    // Overdrive bar
    this.hudOverdriveFill.style.width = `${Math.min(100, this.overdriveMeter)}%`;
    if (!this.isOverdriveActive && this.overdriveMeter < 100) {
      this.hudOverdriveText.textContent = `CHARGING ${Math.floor(this.overdriveMeter)}%`;
      this.hudOverdriveText.classList.remove('overdrive-ready');
    }

    // Power-Up Badges
    this.renderPowerupBadges();
  }

  updateComboDisplay() {
    const formatted = 'x' + this.combo.toFixed(1).replace('.0', '');
    this.hudMult.textContent = formatted;
    this.hudMult.classList.add('pulse');
    setTimeout(() => this.hudMult.classList.remove('pulse'), 150);
  }

  renderPowerupBadges() {
    let html = '';

    if (this.powerups.shield) {
      html += `
        <div class="powerup-badge shield-badge">
          <span class="powerup-badge-icon">🛡️</span>
          <span class="powerup-badge-name" style="color:var(--neon-cyan);">SHIELD</span>
        </div>
      `;
    }

    if (this.powerups.magnetTimer > 0) {
      const pct = (this.powerups.magnetTimer / 10) * 100;
      html += `
        <div class="powerup-badge magnet-badge">
          <span class="powerup-badge-icon">🧲</span>
          <span class="powerup-badge-name" style="color:var(--neon-purple);">${this.powerups.magnetTimer.toFixed(1)}s</span>
          <div class="powerup-badge-bar"><div class="powerup-badge-fill" style="width:${pct}%; background:var(--neon-purple);"></div></div>
        </div>
      `;
    }

    if (this.isOverdriveActive) {
      const pct = (this.overdriveDuration / 6.0) * 100;
      html += `
        <div class="powerup-badge boost-badge">
          <span class="powerup-badge-icon">⚡</span>
          <span class="powerup-badge-name" style="color:var(--neon-yellow);">WARP</span>
          <div class="powerup-badge-bar"><div class="powerup-badge-fill" style="width:${pct}%; background:var(--neon-yellow);"></div></div>
        </div>
      `;
    }

    if (this.powerups.chronosTimer > 0) {
      const pct = (this.powerups.chronosTimer / 8.0) * 100;
      html += `
        <div class="powerup-badge time-badge">
          <span class="powerup-badge-icon">⏱️</span>
          <span class="powerup-badge-name" style="color:var(--neon-green);">${this.powerups.chronosTimer.toFixed(1)}s</span>
          <div class="powerup-badge-bar"><div class="powerup-badge-fill" style="width:${pct}%; background:var(--neon-green);"></div></div>
        </div>
      `;
    }

    this.hudPowerupRow.innerHTML = html;
  }

  triggerBanner(text) {
    this.bannerNotification.textContent = text;
    this.bannerNotification.classList.add('show');
    clearTimeout(this.bannerTimeout);
    this.bannerTimeout = setTimeout(() => {
      this.bannerNotification.classList.remove('show');
    }, 1800);
  }

  // --------------------------------------------------------------------------
  // RENDERING ENGINE
  // --------------------------------------------------------------------------
  draw() {
    const ctx = this.ctx;

    // Apply Camera Screen Shake
    ctx.save();
    if (this.screenShake > 0) {
      const shakeX = (Math.random() - 0.5) * this.screenShake;
      const shakeY = (Math.random() - 0.5) * this.screenShake;
      ctx.translate(shakeX, shakeY);
    }

    // 1. Draw Deep Cyberpunk Background & Parallax
    this.drawBackground(ctx);

    // 2. Draw Speed Lines (during Overdrive or high speed)
    if (this.isOverdriveActive || this.currentSpeed > 380) {
      this.drawSpeedLines(ctx);
    }

    // 3. Draw Collectibles (Coins & Power-Up Drops)
    this.drawCoins(ctx);
    this.drawPowerupDrops(ctx);

    // 4. Draw Obstacles (Lasers & Missiles)
    this.drawLasers(ctx);
    this.drawMissiles(ctx);

    // 5. Draw Particle System
    this.particles.draw(ctx);

    // 6. Draw Player Cyber Pilot & Thrusters
    if (this.state !== 'GAMEOVER') {
      this.drawPlayer(ctx);
    }

    // 7. Draw Floating Combat Text
    this.floatTexts.draw(ctx);

    // 8. Draw Ceiling and Floor Hazard Conduits
    this.drawFacilityConduits(ctx);

    ctx.restore();
  }

  drawBackground(ctx) {
    // Gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGrad.addColorStop(0, '#06020f');
    skyGrad.addColorStop(0.5, '#120728');
    skyGrad.addColorStop(1, '#05010a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Twinkling Starfield (Layer 0)
    ctx.save();
    for (const star of this.bgStars) {
      const starAlpha = Math.sin(performance.now() * 0.003 * star.blinkSpeed) * 0.35 + star.alpha;
      ctx.fillStyle = `rgba(0, 243, 255, ${Math.max(0.1, starAlpha)})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
    ctx.restore();

    // Distant City Skyline (Layer 1)
    ctx.save();
    const cityOffset = this.bgOffsets[1];
    ctx.translate(-cityOffset, 0);

    for (let rep = 0; rep < 2; rep++) {
      const offsetX = rep * this.width;
      for (const b of this.cityBuildings) {
        const drawX = b.x + offsetX;
        if (drawX + b.width < 0 || drawX > this.width + cityOffset) continue;

        const bY = this.floorY - b.height;
        // Building body
        ctx.fillStyle = '#0a0418';
        ctx.fillRect(drawX, bY, b.width, b.height);
        ctx.strokeStyle = 'rgba(157, 0, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, bY, b.width, b.height);

        // Windows
        ctx.fillStyle = b.neonColor;
        ctx.globalAlpha = 0.25;
        for (let r = 0; r < b.windowRows; r++) {
          for (let c = 0; c < b.windowCols; c++) {
            if ((r + c + Math.floor(b.x)) % 3 === 0) {
              ctx.fillRect(drawX + 6 + c * 11, bY + 12 + r * 18, 5, 8);
            }
          }
        }
        ctx.globalAlpha = 1.0;

        // Antenna
        if (b.hasAntenna) {
          ctx.strokeStyle = b.neonColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(drawX + b.width / 2, bY);
          ctx.lineTo(drawX + b.width / 2, bY - 22);
          ctx.stroke();

          ctx.fillStyle = b.neonColor;
          ctx.beginPath();
          ctx.arc(drawX + b.width / 2, bY - 22, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();

    // Midground Industrial Conduits & Pipes (Layer 2)
    ctx.save();
    const pipeOffset = this.bgOffsets[2];
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.12)';
    ctx.lineWidth = 3;

    for (let x = -pipeOffset; x < this.width + 100; x += 180) {
      // Vertical structural trusses
      ctx.beginPath();
      ctx.moveTo(x, this.ceilingY);
      ctx.lineTo(x, this.floorY);
      ctx.stroke();

      // Holographic corridor decals
      ctx.fillStyle = 'rgba(255, 0, 127, 0.15)';
      ctx.font = '700 10px "Orbitron", monospace';
      ctx.fillText('⚡ LASER PROTOCOL // SECTOR 04', x + 15, 80);
    }
    ctx.restore();
  }

  drawSpeedLines(ctx) {
    ctx.save();
    ctx.strokeStyle = this.isOverdriveActive ? 'rgba(255, 230, 0, 0.4)' : 'rgba(0, 243, 255, 0.25)';
    ctx.lineWidth = 1.8;

    for (let i = 0; i < 18; i++) {
      const y = Math.random() * (this.floorY - this.ceilingY) + this.ceilingY;
      const len = Math.random() * 220 + 80;
      const x = Math.random() * this.width;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFacilityConduits(ctx) {
    // Ceiling Hazard Strip & Rail
    ctx.save();
    // Ceiling fill
    ctx.fillStyle = '#06020c';
    ctx.fillRect(0, 0, this.width, this.ceilingY);

    // Hazard Stripes
    const stripeOffset = this.bgOffsets[3] % 24;
    ctx.beginPath();
    for (let x = -stripeOffset; x < this.width + 24; x += 24) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 12, this.ceilingY);
      ctx.lineTo(x + 20, this.ceilingY);
      ctx.lineTo(x + 8, 0);
    }
    ctx.fillStyle = 'rgba(255, 230, 0, 0.15)';
    ctx.fill();

    // Ceiling Neon Rail
    ctx.strokeStyle = 'var(--neon-cyan)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, this.ceilingY);
    ctx.lineTo(this.width, this.ceilingY);
    ctx.stroke();

    // Floor Hazard Strip & Rail
    ctx.fillStyle = '#06020c';
    ctx.fillRect(0, this.floorY, this.width, this.height - this.floorY);

    ctx.beginPath();
    for (let x = -stripeOffset; x < this.width + 24; x += 24) {
      ctx.moveTo(x, this.floorY);
      ctx.lineTo(x + 12, this.height);
      ctx.lineTo(x + 20, this.height);
      ctx.lineTo(x + 8, this.floorY);
    }
    ctx.fillStyle = 'rgba(255, 230, 0, 0.15)';
    ctx.fill();

    // Floor Neon Rail
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, this.floorY);
    ctx.lineTo(this.width, this.floorY);
    ctx.stroke();

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // PLAYER SPRITE RENDERING
  // --------------------------------------------------------------------------
  drawPlayer(ctx) {
    const p = this.player;

    // Invulnerability flashing
    if (p.invulnerableTimer > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // 1. Draw Energy Shield Bubble if armed
    if (this.powerups.shield) {
      ctx.save();
      const shieldPulse = Math.sin(performance.now() * 0.008) * 3;
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = 'rgba(0, 243, 255, 0.12)';

      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 14 + shieldPulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Rotating hex shield facets
      ctx.rotate(performance.now() * 0.002);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        const a = (i / 6) * Math.PI * 2;
        ctx.arc(Math.cos(a) * (p.radius + 14), Math.sin(a) * (p.radius + 14), 4, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 2. Draw Magnet Field Arcs if active
    if (this.powerups.magnetTimer > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(157, 0, 255, 0.6)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 22, -0.6, 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, p.radius + 28, -0.4, 0.4);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Jetpack Unit (Mounted on back / left side)
    ctx.fillStyle = '#1b1429';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-19, -12, 11, 24, 3);
    ctx.fill();
    ctx.stroke();

    // Twin rocket exhaust nozzles
    ctx.fillStyle = '#2d2244';
    ctx.fillRect(-17, 10, 8, 4);

    // Jetpack Core Fusion Glow
    ctx.fillStyle = this.isThrusting ? '#ffe600' : '#00f3ff';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-14, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Pilot Body / Exosuit Armor
    ctx.fillStyle = '#100824';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 0;

    // Torso armor plate
    ctx.beginPath();
    ctx.roundRect(-8, -10, 16, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Armor Chest Core
    ctx.fillStyle = '#ff007f';
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Legs / Boots with hover thrusters
    ctx.fillStyle = '#1d1238';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    // Front leg
    ctx.beginPath();
    ctx.roundRect(-5, 12, 7, 10, 2);
    ctx.fill();
    ctx.stroke();
    // Back leg
    ctx.beginPath();
    ctx.roundRect(4, 12, 7, 10, 2);
    ctx.fill();
    ctx.stroke();

    // Hover skate light
    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(-5, 21, 16, 2);

    // 5. Pilot Cyber Helmet & Visor
    ctx.fillStyle = '#180c33';
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(2, -16, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Visor HUD Shield (Glows brighter when boosting)
    const visorColor = this.isOverdriveActive ? '#ffe600' : (this.isThrusting ? '#00f3ff' : '#05ffa1');
    ctx.fillStyle = visorColor;
    ctx.shadowColor = visorColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(4, -19, 7, 6, 2);
    ctx.fill();

    ctx.restore();
  }

  // --------------------------------------------------------------------------
  // OBSTACLES & ITEMS RENDERING
  // --------------------------------------------------------------------------
  drawLasers(ctx) {
    ctx.save();

    for (const laser of this.lasers) {
      if (!laser.isActive) {
        // Charging warning state (faint line & sparks)
        ctx.strokeStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(laser.x, laser.y1);
        ctx.lineTo(laser.x, laser.y2);
        ctx.stroke();
        ctx.setLineDash([]);
        continue;
      }

      if (laser.type === 'vertical' || laser.type === 'zapper') {
        this.renderLaserBeam(ctx, laser.x, laser.y1, laser.x, laser.y2, laser.width);
      } else if (laser.type === 'oscillating') {
        const halfH = laser.beamHeight / 2;
        this.renderLaserBeam(ctx, laser.x, laser.y - halfH, laser.x, laser.y + halfH, laser.width);
      } else if (laser.type === 'spinner') {
        const x2_a = laser.x + Math.cos(laser.rotation) * laser.armLength;
        const y2_a = laser.y + Math.sin(laser.rotation) * laser.armLength;
        const x2_b = laser.x - Math.cos(laser.rotation) * laser.armLength;
        const y2_b = laser.y - Math.sin(laser.rotation) * laser.armLength;

        this.renderLaserBeam(ctx, x2_a, y2_a, x2_b, y2_b, laser.width);

        // Center hub
        ctx.fillStyle = '#080315';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(laser.x, laser.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  renderLaserBeam(ctx, x1, y1, x2, y2, beamWidth) {
    const pulse = Math.sin(performance.now() * 0.02) * 2;
    const finalWidth = beamWidth + pulse;

    // Emitter nodules at endpoints
    this.drawEmitterNode(ctx, x1, y1);
    this.drawEmitterNode(ctx, x2, y2);

    // Outer Neon Glow Corona
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = finalWidth + 10;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Mid Laser Body
    ctx.strokeStyle = '#ff3399';
    ctx.lineWidth = finalWidth;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // White-Hot Laser Core
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(3, finalWidth * 0.35);
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.globalAlpha = 1.0;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  drawEmitterNode(ctx, x, y) {
    ctx.fillStyle = '#0c051a';
    ctx.strokeStyle = '#ff007f';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawMissiles(ctx) {
    ctx.save();
    for (const m of this.missiles) {
      if (m.state === 'warning') {
        // Red flashing tracking warning crosshair on the right edge
        const flash = Math.floor(performance.now() / 100) % 2 === 0;
        ctx.fillStyle = flash ? '#ff007f' : '#ffe600';
        ctx.strokeStyle = ctx.fillStyle;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 2;

        // Warning triangle & chevron
        ctx.beginPath();
        ctx.moveTo(m.x - 18, m.y);
        ctx.lineTo(m.x + 8, m.y - 12);
        ctx.lineTo(m.x + 8, m.y + 12);
        ctx.closePath();
        ctx.stroke();

        ctx.font = '900 13px "Orbitron", monospace';
        ctx.textAlign = 'right';
        ctx.fillText('⚠️ MISSILE', m.x - 24, m.y + 5);
      } else if (m.state === 'launch') {
        // Missile Body
        ctx.fillStyle = '#1c0a2a';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(m.x - 22, m.y - 7, 34, 14, 4);
        ctx.fill();
        ctx.stroke();

        // Warhead nose cone
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.moveTo(m.x - 22, m.y - 7);
        ctx.lineTo(m.x - 32, m.y);
        ctx.lineTo(m.x - 22, m.y + 7);
        ctx.closePath();
        ctx.fill();

        // Stabilizer Fins
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(m.x + 6, m.y - 11, 5, 4);
        ctx.fillRect(m.x + 6, m.y + 7, 5, 4);
      }
    }
    ctx.restore();
  }

  drawCoins(ctx) {
    ctx.save();
    for (const coin of this.coinsList) {
      ctx.save();
      ctx.translate(coin.x, coin.y);

      // Rotating 3D Diamond / Hexagon shape
      const scaleX = Math.cos(coin.rotation);
      ctx.scale(scaleX, 1);

      ctx.fillStyle = '#ffe600';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(0, -coin.radius);
      ctx.lineTo(coin.radius, 0);
      ctx.lineTo(0, coin.radius);
      ctx.lineTo(-coin.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner shiny facet
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.moveTo(0, -coin.radius * 0.5);
      ctx.lineTo(coin.radius * 0.5, 0);
      ctx.lineTo(0, coin.radius * 0.5);
      ctx.lineTo(-coin.radius * 0.5, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }

  drawPowerupDrops(ctx) {
    ctx.save();
    for (const p of this.powerupDrops) {
      ctx.save();
      ctx.translate(p.x, p.y);

      let color = '#00f3ff';
      let icon = '🛡️';
      if (p.type === 'shield') { color = '#00f3ff'; icon = '🛡️'; }
      else if (p.type === 'magnet') { color = '#9d00ff'; icon = '🧲'; }
      else if (p.type === 'boost') { color = '#ffe600'; icon = '⚡'; }
      else if (p.type === 'chronos') { color = '#05ffa1'; icon = '⏱️'; }

      // Outer holographic orb
      ctx.fillStyle = 'rgba(10, 5, 24, 0.88)';
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner icon symbol
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowBlur = 0;
      ctx.fillText(icon, 0, 1);

      ctx.restore();
    }
    ctx.restore();
  }
}

// ============================================================================
// BOOTSTRAP ON LOAD
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.cyberJetpackGame = new CyberJetpackGame();
});
