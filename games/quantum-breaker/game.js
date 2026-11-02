/**
 * QUANTUM BREAKER // Neon Matrix Multi-Ball Arkanoid
 * Pure Vanilla HTML5 Canvas + Web Audio API
 */

// ============================================================================
// AUDIO SYNTHESIZER (WEB AUDIO API)
// ============================================================================
class QuantumAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.step = 0;
    this.bpm = 126;
    this.timerID = null;
    this.nextBeatTime = 0;

    // F Minor / Pentatonic Bassline: F2, Ab2, Bb2, C3, Eb3
    this.bassFreqs = [87.31, 103.83, 116.54, 130.81, 155.56];

    // Brick Musical Pentatonic Scale (Row tones from bottom to top)
    this.brickNotes = [
      261.63, // C4 (Row 7)
      293.66, // D4 (Row 6)
      329.63, // E4 (Row 5)
      392.00, // G4 (Row 4)
      440.00, // A4 (Row 3)
      523.25, // C5 (Row 2)
      587.33, // D5 (Row 1)
      659.25  // E5 (Row 0)
    ];
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

    // Crisp Synth Hi-Hat on offbeats
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 2 ? 0.03 : 0.015);
    }

    // Snare / Clap on beat 4 & 12
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // Arpeggiated Cyber Synth Bass
    if (step % 2 === 0) {
      const noteIdx = (Math.floor(step / 2) + Math.floor(step / 4)) % this.bassFreqs.length;
      this.playBass(this.bassFreqs[noteIdx], time);
    }
  }

  playKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(32, time + 0.09);

      gain.gain.setValueAtTime(0.32, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    } catch (e) {}
  }

  playHiHat(time, vol = 0.02) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.025;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7500, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.025);
    } catch (e) {}
  }

  playSnare(time) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.08);
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
      filter.frequency.setValueAtTime(420, time);
      filter.frequency.exponentialRampToValueAtTime(140, time + 0.12);

      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.13);
    } catch (e) {}
  }

  // SFX: Musical Brick Hit Chime (Tuned by Row & Combo)
  playBrickHit(row = 0, combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const noteIdx = Math.max(0, Math.min(this.brickNotes.length - 1, row));
      const baseFreq = this.brickNotes[noteIdx];
      // Subtle pitch rise with high combo
      const comboMult = 1 + Math.min(0.5, (combo - 1) * 0.05);
      const freq = baseFreq * comboMult;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.1);

      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    } catch (e) {}
  }

  // SFX: Armored Brick Clang
  playArmoredHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  // SFX: Explosive Brick Shockwave
  playExplosion() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, t);
      filter.frequency.exponentialRampToValueAtTime(40, t + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.3);
    } catch (e) {}
  }

  // SFX: Paddle Bounce with Dynamic Angle Pitch
  playPaddleBounce(offsetNorm = 0) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Center hit = 360Hz, edge hit = up to 680Hz
      const freq = 360 + Math.abs(offsetNorm) * 320;
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.3, t + 0.08);

      gain.gain.setValueAtTime(0.26, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  // SFX: Multi-Ball Trigger Split Fanfare
  playMultiBallSplit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.2, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.16);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.16);
      });
    } catch (e) {}
  }

  // SFX: Powerup Collection
  playPowerupCollect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.035);
        gain.gain.setValueAtTime(0.18, t + i * 0.035);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.035 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.035);
        osc.stop(t + i * 0.035 + 0.12);
      });
    } catch (e) {}
  }

  // SFX: Laser Blaster Shot
  playLaserShot() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(960, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.07);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    } catch (e) {}
  }

  // SFX: Safety Floor Grid Bounce
  playShieldBounce() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.12);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {}
  }

  // SFX: Life Lost Downward Warble
  playLifeLost() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(45, t + 0.35);

      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.36);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.36);
    } catch (e) {}
  }

  // SFX: Stage Clear Victorious Fanfare
  playStageClear() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const melody = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      melody.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.09);
        gain.gain.setValueAtTime(0.25, t + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.35);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.09);
        osc.stop(t + idx * 0.09 + 0.35);
      });
    } catch (e) {}
  }
}

// ============================================================================
// PARTICLE SYSTEM & VISUAL EFFECTS
// ============================================================================
class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  reset() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
  }

  // Spawn brick explosion fragments
  spawnBrickBreak(x, y, w, h, color) {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 220 + 80;
      this.particles.push({
        x: x + Math.random() * w,
        y: y + Math.random() * h,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color,
        alpha: 1,
        life: 1,
        decay: Math.random() * 1.5 + 1.2,
        rot: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 8
      });
    }
  }

  // Radial explosive shockwave
  spawnShockwave(x, y, color = '#00f3ff', maxRadius = 110) {
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius,
      color,
      alpha: 1,
      speed: 380
    });
  }

  // Ball glow trail
  spawnBallTrail(x, y, radius, color) {
    this.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: radius,
      color,
      alpha: 0.65,
      life: 1,
      decay: 4.5,
      rot: 0,
      vRot: 0
    });
  }

  // Floating score / notification popup text
  spawnText(text, x, y, color = '#fff', size = 16) {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -55,
      alpha: 1,
      life: 1,
      decay: 1.2,
      color,
      size
    });
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vRot * dt;
      p.life -= p.decay * dt;
      p.alpha = Math.max(0, p.life);

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed * dt;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= t.decay * dt;
      t.alpha = Math.max(0, t.life);
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw shockwaves
    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = sw.alpha;
      ctx.lineWidth = 3;
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Draw floating texts
    for (const t of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.font = `bold ${t.size}px 'Orbitron', monospace`;
      ctx.fillStyle = t.color;
      ctx.textAlign = 'center';
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 12;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}

// ============================================================================
// MAIN GAME CONTROLLER (QUANTUM BREAKER)
// ============================================================================
class QuantumBreaker {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new QuantumAudio();
    this.particles = new ParticleEngine();

    // Virtual Game Resolution (16:9 Standard, swapped for a tall arena on portrait phones)
    this.portraitQuery = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.width = 960;
    this.height = 540;
    this.renderScale = 1;
    this.touchGain = 1.4; // paddle travel per unit of finger travel, so thumbs can reach the walls
    this.drag = null;

    // Game States: 'START', 'PLAYING', 'PAUSED', 'STAGECLEAR', 'GAMEOVER', 'VICTORY'
    this.state = 'START';
    this.lastTime = 0;

    // Player Stats
    this.score = 0;
    this.highScore = Number(localStorage.getItem('quantum_breaker_highscore') || '0');
    this.combo = 1;
    this.maxCombo = 1;
    this.lives = 3;
    this.maxLives = 5;
    this.sector = 1;
    this.totalSectorsCleared = 0;
    this.bricksDestroyed = 0;
    this.maxBallsInPlay = 1;

    // Screen Shake
    this.shakeAmount = 0;

    // Paddle Config
    this.paddle = {
      x: this.width / 2,
      y: 500,
      width: 120,
      baseWidth: 120,
      height: 14,
      targetX: this.width / 2,
      vx: 0,
      speed: 680,
      color: '#00f3ff',
      isExtend: false,
      extendTimer: 0,
      isLaser: false,
      laserTimer: 0,
      laserCooldown: 0,
      isPierce: false,
      pierceTimer: 0,
      isChrono: false,
      chronoTimer: 0,
      isSticky: false,
      safetyShield: false,
      shieldHits: 0
    };

    // Balls Array (Multi-Ball support!)
    this.balls = [];

    // Bricks Array
    this.bricks = [];
    this.brickCols = 12;
    this.brickRows = 8;
    this.brickWidth = 66;
    this.brickHeight = 20;
    this.brickPadding = 8;
    this.brickOffsetTop = 70;
    this.brickOffsetLeft = (this.width - (this.brickCols * (this.brickWidth + this.brickPadding) - this.brickPadding)) / 2;

    // Lasers Array (from laser paddle)
    this.lasers = [];

    // Falling Powerups Array
    this.powerups = [];

    // Input States
    this.keys = {};
    this.mouse = { x: this.width / 2, active: false };

    this.applyWorldSize();
    this.paddle.x = this.paddle.targetX = this.mouse.x = this.width / 2;

    // Starfield Background
    this.stars = [];
    this.initStars();

    // DOM Elements Cache
    this.hud = {
      score: document.getElementById('score-display'),
      combo: document.getElementById('combo-display'),
      sector: document.getElementById('sector-display'),
      balls: document.getElementById('balls-display'),
      lives: document.getElementById('lives-display'),
      highscore: document.getElementById('hud-highscore'),
      powerupsBar: document.getElementById('powerups-active-bar'),
      shieldIndicator: document.getElementById('shield-indicator'),
      banner: document.getElementById('banner-notification')
    };

    this.modals = {
      start: document.getElementById('start-screen'),
      stageClear: document.getElementById('stage-clear-screen'),
      gameOver: document.getElementById('gameover-screen'),
      victory: document.getElementById('victory-screen'),
      pause: document.getElementById('pause-screen')
    };

    // Wire up listeners
    this.setupEvents();
    this.resizeCanvas();
    this.updateHUD();

    // Kick off animation loop
    requestAnimationFrame((t) => this.loop(t));
  }

  // Same 12 x 8 brick grid in both shapes, so every sector layout still works
  applyWorldSize() {
    const portrait = this.portraitQuery.matches;
    this.width = portrait ? 540 : 960;
    this.height = portrait ? 960 : 540;

    this.brickWidth = portrait ? 37 : 66;
    this.brickHeight = portrait ? 26 : 20;
    this.brickPadding = portrait ? 4 : 8;
    this.brickOffsetLeft = (this.width - (this.brickCols * (this.brickWidth + this.brickPadding) - this.brickPadding)) / 2;

    this.paddle.y = this.height - 40;
    this.paddle.baseWidth = portrait ? 100 : 120;
    this.paddle.width = this.paddle.baseWidth * (this.paddle.isExtend ? 1.5 : 1);
  }

  resizeCanvas() {
    // Size the buffer for the screen so the neon stays sharp on high-density phones
    const cssW = this.canvas.getBoundingClientRect().width || this.width;
    const density = (cssW * (window.devicePixelRatio || 1)) / this.width;
    this.renderScale = Math.max(1, Math.min(1.5, density));
    this.canvas.width = Math.round(this.width * this.renderScale);
    this.canvas.height = Math.round(this.height * this.renderScale);
  }

  // Phone rotated: rebuild the arena around the bricks and balls already in play
  handleOrientationChange() {
    const oldW = this.width;
    const oldH = this.height;
    this.applyWorldSize();
    this.resizeCanvas();
    if (this.width === oldW) return;

    const sx = this.width / oldW;
    const sy = this.height / oldH;
    for (const b of this.bricks) {
      b.x = this.brickOffsetLeft + b.col * (this.brickWidth + this.brickPadding);
      b.y = this.brickOffsetTop + b.row * (this.brickHeight + this.brickPadding);
      b.w = this.brickWidth;
      b.h = this.brickHeight;
    }
    for (const item of [...this.balls, ...this.powerups, ...this.lasers]) {
      item.x *= sx;
      item.y *= sy;
    }
    this.paddle.x *= sx;
    this.paddle.targetX *= sx;
    this.mouse.x *= sx;
    this.initStars();
    this.pauseGame();
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.7 + 0.2,
        speed: Math.random() * 15 + 8
      });
    }
  }

  setupEvents() {
    // Keyboard Listeners
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyM') {
        const isMuted = this.audio.toggleMute();
        document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
        this.showBanner(isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE');
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'PLAYING') this.pauseGame();
        else if (this.state === 'PAUSED') this.resumeGame();
      }

      if (e.code === 'KeyR') {
        if (this.state === 'GAMEOVER' || this.state === 'PAUSED') {
          this.startGame();
        }
      }

      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.handleLaunchOrFire();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Mouse Tracking across canvas
    const updatePointerPos = (clientX) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.width / rect.width;
      this.mouse.x = (clientX - rect.left) * scaleX;
      this.mouse.active = true;
    };

    // Touch Support for Mobile / Tablets: a finger slides the paddle from wherever it
    // lands (anywhere on screen), and tapping launches the ball or fires lasers
    window.addEventListener('pointerdown', (e) => {
      this.audio.init();
      if (this.state !== 'PLAYING' || e.target.closest('button, a')) return;
      this.handleLaunchOrFire();
      if (e.pointerType !== 'mouse') {
        this.drag = { id: e.pointerId, lastX: e.clientX };
        this.mouse.x = this.paddle.x;
        this.mouse.active = true;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        updatePointerPos(e.clientX);
      } else if (this.drag && this.drag.id === e.pointerId) {
        const scaleX = this.width / this.canvas.getBoundingClientRect().width;
        const halfW = this.paddle.width / 2;
        const target = this.mouse.x + (e.clientX - this.drag.lastX) * scaleX * this.touchGain;
        this.mouse.x = Math.max(20 + halfW, Math.min(this.width - 20 - halfW, target));
        this.drag.lastX = e.clientX;
      }
    });

    const endDrag = (e) => {
      if (this.drag && this.drag.id === e.pointerId) this.drag = null;
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    // Don't let the ball run on while the phone is locked or another app is open
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pauseGame();
    });

    window.addEventListener('resize', () => this.handleOrientationChange());
    this.portraitQuery.addEventListener('change', () => this.handleOrientationChange());

    // UI Buttons
    document.getElementById('btn-start').addEventListener('click', () => this.startGame());
    document.getElementById('btn-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.resumeGame());
    document.getElementById('btn-pause').addEventListener('click', () => {
      if (this.state === 'PLAYING') this.pauseGame();
      else if (this.state === 'PAUSED') this.resumeGame();
    });
    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
      this.showBanner(isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE');
    });
    document.getElementById('btn-next-sector').addEventListener('click', () => this.nextSector());
    document.getElementById('btn-continue-endless').addEventListener('click', () => {
      this.modals.victory.classList.remove('active');
      this.sector++;
      this.buildLevel();
      this.resetBallOnPaddle();
      this.state = 'PLAYING';
    });
  }

  showModal(modalEl) {
    Object.values(this.modals).forEach(m => m.classList.remove('active'));
    if (modalEl) modalEl.classList.add('active');
  }

  hideAllModals() {
    Object.values(this.modals).forEach(m => m.classList.remove('active'));
  }

  showBanner(msg, duration = 2200) {
    this.hud.banner.textContent = msg;
    this.hud.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.hud.banner.classList.remove('show');
    }, duration);
  }

  // ==========================================================================
  // LEVEL BUILDER
  // ==========================================================================
  buildLevel() {
    this.bricks = [];
    const sec = this.sector;
    const cols = this.brickCols;
    const rows = this.brickRows;

    // Palette per row
    const rowColors = [
      '#ff007f', // Row 0 (Top): Neon Pink
      '#ff00bb', // Row 1: Magenta
      '#9d00ff', // Row 2: Neon Purple
      '#00f3ff', // Row 3: Neon Cyan
      '#05ffa1', // Row 4: Neon Green
      '#ffe600', // Row 5: Neon Yellow
      '#ff7700', // Row 6: Neon Orange
      '#0077ff'  // Row 7 (Bottom): Electric Blue
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let exists = true;
        let type = 'NORMAL';
        let hp = 1;
        let points = 100 + (rows - 1 - r) * 25;
        let color = rowColors[r % rowColors.length];

        // Level Design Logic
        if (sec === 1) {
          // Sector 01: Genesis Matrix (Full symmetric rainbow grid)
          if (r === 0 && (c === 0 || c === cols - 1)) exists = false;
        } else if (sec === 2) {
          // Sector 02: Cyber Bastion (Armored outer shields + explosive cores)
          if (r === 0 || r === 1) {
            type = 'ARMORED';
            hp = 2;
            points = 250;
            color = '#00f3ff';
          }
          if ((r === 3 || r === 4) && (c === 3 || c === cols - 4)) {
            type = 'EXPLOSIVE';
            hp = 1;
            points = 300;
            color = '#ff007f';
          }
        } else if (sec === 3) {
          // Sector 03: Quantum Diamond (Diamond layout)
          const midC = (cols - 1) / 2;
          const dist = Math.abs(c - midC) + Math.abs(r - 3.5);
          if (dist > 5) {
            exists = false;
          } else {
            if (dist <= 1.5) {
              type = 'PRISMATIC';
              hp = 1;
              points = 500;
              color = '#ffe600';
            } else if (dist <= 3) {
              type = 'ARMORED';
              hp = 2;
              points = 220;
            }
          }
        } else if (sec === 4) {
          // Sector 04: Singularity Core (Heavy fortress with unbreakable quantum obelisks)
          if (r === 3 && (c === 2 || c === cols - 3)) {
            type = 'UNBREAKABLE';
            hp = 999;
            points = 0;
            color = '#7d8a9e';
          } else if (r <= 2) {
            type = 'ARMORED';
            hp = (r === 0 ? 3 : 2);
            points = hp * 150;
          }
          if ((r === 4 || r === 5) && (c === 5 || c === 6)) {
            type = 'EXPLOSIVE';
            color = '#ff007f';
            points = 350;
          }
        } else if (sec === 5) {
          // Sector 05: Hyperflux Void (Complex wave layout)
          const wave = Math.sin(c * 0.8) * 2 + 3;
          if (Math.abs(r - wave) > 2.2) {
            exists = false;
          } else {
            if (r % 2 === 0) {
              type = 'ARMORED';
              hp = 2;
              points = 280;
            }
            if (c === 1 || c === cols - 2 || c === 5 || c === 6) {
              type = 'EXPLOSIVE';
              color = '#ff7700';
            }
          }
        } else {
          // Sector 6+ (Procedural Infinite Matrix)
          const rnd = Math.random();
          if (rnd < 0.12) {
            exists = false;
          } else if (rnd < 0.35) {
            type = 'ARMORED';
            hp = Math.min(3, 1 + Math.floor(sec / 3));
            points = hp * 180;
          } else if (rnd < 0.48) {
            type = 'EXPLOSIVE';
            color = '#ff007f';
            points = 300;
          } else if (rnd < 0.58) {
            type = 'PRISMATIC';
            points = 500;
          }
        }

        if (exists) {
          const bx = this.brickOffsetLeft + c * (this.brickWidth + this.brickPadding);
          const by = this.brickOffsetTop + r * (this.brickHeight + this.brickPadding);

          // Decide powerup drop type (Multi-ball is prominent!)
          let powerupType = null;
          const dropRand = Math.random();
          if (type === 'PRISMATIC') {
            // Prismatic always drops high tier powerup!
            powerupType = Math.random() < 0.5 ? 'MULTIBALL' : 'LASER';
          } else if (dropRand < 0.28) {
            // 28% drop rate
            const pTypes = [
              'MULTIBALL', 'MULTIBALL', 'MULTIBALL', // High weight for Multi-ball!
              'LASER', 'LASER',
              'EXPAND',
              'PIERCE',
              'SHIELD',
              'CHRONO',
              'LIFE'
            ];
            powerupType = pTypes[Math.floor(Math.random() * pTypes.length)];
          }

          this.bricks.push({
            x: bx,
            y: by,
            w: this.brickWidth,
            h: this.brickHeight,
            row: r,
            col: c,
            type,
            hp,
            maxHp: hp,
            color,
            points,
            powerupType,
            phase: Math.random() * Math.PI * 2
          });
        }
      }
    }
  }

  // ==========================================================================
  // GAME LIFECYCLE
  // ==========================================================================
  startGame() {
    this.audio.init();
    this.audio.startMusic();
    this.hideAllModals();

    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.lives = 3;
    this.sector = 1;
    this.totalSectorsCleared = 0;
    this.bricksDestroyed = 0;
    this.maxBallsInPlay = 1;

    this.resetPaddle();
    this.buildLevel();
    this.resetBallOnPaddle();

    this.state = 'PLAYING';
    this.showBanner('SECTOR 01: GENESIS MATRIX');
    this.updateHUD();
  }

  pauseGame() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.showModal(this.modals.pause);
  }

  resumeGame() {
    if (this.state !== 'PAUSED') return;
    this.hideAllModals();
    this.state = 'PLAYING';
  }

  resetPaddle() {
    this.paddle.x = this.width / 2;
    this.paddle.targetX = this.width / 2;
    this.paddle.width = this.paddle.baseWidth;
    this.paddle.isExtend = false;
    this.paddle.extendTimer = 0;
    this.paddle.isLaser = false;
    this.paddle.laserTimer = 0;
    this.paddle.isPierce = false;
    this.paddle.pierceTimer = 0;
    this.paddle.isChrono = false;
    this.paddle.chronoTimer = 0;
    this.paddle.safetyShield = false;
    this.paddle.shieldHits = 0;
    this.lasers = [];
    this.powerups = [];
    this.hud.shieldIndicator.classList.add('hidden');
  }

  resetBallOnPaddle() {
    this.balls = [{
      x: this.paddle.x,
      y: this.paddle.y - 12,
      vx: 0,
      vy: 0,
      radius: 6,
      speed: 400,
      baseSpeed: 400,
      color: '#00f3ff',
      isPierce: false,
      isStuck: true,
      stickOffsetX: 0
    }];
    this.combo = 1;
    this.updateHUD();
  }

  handleLaunchOrFire() {
    // Launch any stuck ball
    let launchedAny = false;
    for (const b of this.balls) {
      if (b.isStuck) {
        b.isStuck = false;
        // Launch with a slight random or paddle-direction angle
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.45;
        b.vx = Math.cos(angle) * b.speed;
        b.vy = Math.sin(angle) * b.speed;
        this.audio.playPaddleBounce(0);
        launchedAny = true;
      }
    }

    // Fire laser if laser cannon is equipped
    if (this.paddle.isLaser && this.paddle.laserCooldown <= 0) {
      this.fireLasers();
      this.paddle.laserCooldown = 0.18; // 180ms fire interval
    }
  }

  fireLasers() {
    const leftWing = this.paddle.x - this.paddle.width / 2 + 10;
    const rightWing = this.paddle.x + this.paddle.width / 2 - 10;
    const y = this.paddle.y - 6;

    this.lasers.push({ x: leftWing, y, vx: 0, vy: -750, color: '#ff007f' });
    this.lasers.push({ x: rightWing, y, vx: 0, vy: -750, color: '#ff007f' });

    this.audio.playLaserShot();
    this.shakeAmount = 2;
  }

  // ==========================================================================
  // MULTI-BALL SPAWNER
  // ==========================================================================
  triggerMultiBall() {
    this.audio.playMultiBallSplit();
    this.particles.spawnShockwave(this.paddle.x, this.paddle.y, '#00f3ff', 160);
    this.particles.spawnText('✦ MULTI-BALL ACTIVATED! ✦', this.width / 2, this.height * 0.48, '#00f3ff', 22);
    this.showBanner('QUANTUM MULTI-BALL ENGAGED');
    this.shakeAmount = 8;

    const newBalls = [];
    const maxAllowed = 24; // Smooth performance limit

    // If all balls happen to be stuck, release them
    for (const b of this.balls) {
      if (b.isStuck) {
        b.isStuck = false;
        b.vy = -b.speed;
        b.vx = (Math.random() - 0.5) * 120;
      }
    }

    // Clone each ball into 3 balls with angled spread!
    for (const b of this.balls) {
      if (this.balls.length + newBalls.length >= maxAllowed) break;

      const currentAngle = Math.atan2(b.vy, b.vx);
      const speed = Math.max(380, Math.hypot(b.vx, b.vy));

      // Ball 1 (spread left)
      const a1 = currentAngle - 0.42;
      newBalls.push({
        x: b.x,
        y: b.y,
        vx: Math.cos(a1) * speed,
        vy: Math.sin(a1) * speed,
        radius: 6,
        speed: speed,
        baseSpeed: b.baseSpeed,
        color: '#ff007f', // Clone balls get distinct neon colors
        isPierce: this.paddle.isPierce,
        isStuck: false,
        stickOffsetX: 0
      });

      // Ball 2 (spread right)
      if (this.balls.length + newBalls.length < maxAllowed) {
        const a2 = currentAngle + 0.42;
        newBalls.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(a2) * speed,
          vy: Math.sin(a2) * speed,
          radius: 6,
          speed: speed,
          baseSpeed: b.baseSpeed,
          color: '#ffe600',
          isPierce: this.paddle.isPierce,
          isStuck: false,
          stickOffsetX: 0
        });
      }
    }

    this.balls.push(...newBalls);
    if (this.balls.length > this.maxBallsInPlay) {
      this.maxBallsInPlay = this.balls.length;
    }
    this.updateHUD();
  }

  // ==========================================================================
  // POWER-UP COLLECTION & APPLICATION
  // ==========================================================================
  collectPowerup(p) {
    this.audio.playPowerupCollect();
    this.score += 200;
    this.particles.spawnText(`+200 [${p.type}]`, p.x, p.y - 10, p.color, 14);

    switch (p.type) {
      case 'MULTIBALL':
        this.triggerMultiBall();
        break;

      case 'LASER':
        this.paddle.isLaser = true;
        this.paddle.laserTimer = 12; // 12 seconds
        this.showBanner('⚡ DUAL LASER CANNONS MOUNTED');
        break;

      case 'EXPAND':
        this.paddle.isExtend = true;
        this.paddle.extendTimer = 15; // 15 seconds
        this.paddle.width = this.paddle.baseWidth * 1.5;
        this.showBanner('↔ QUANTUM BEAM EXPANDED');
        break;

      case 'PIERCE':
        this.paddle.isPierce = true;
        this.paddle.pierceTimer = 8; // 8 seconds
        for (const b of this.balls) b.isPierce = true;
        this.showBanner('🔥 PLASMA PIERCE CHARGED');
        break;

      case 'CHRONO':
        this.paddle.isChrono = true;
        this.paddle.chronoTimer = 10;
        this.showBanner('⏱ CHRONO FIELD SLOWDOWN');
        break;

      case 'SHIELD':
        this.paddle.safetyShield = true;
        this.paddle.shieldHits = 3;
        this.hud.shieldIndicator.classList.remove('hidden');
        this.showBanner('🛡️ SAFETY ENERGY GRID DEPLOYED');
        break;

      case 'LIFE':
        if (this.lives < this.maxLives) {
          this.lives++;
          this.particles.spawnText('♥ +1 SHIELD CORE!', this.width / 2, this.height * 0.59, '#ff007f', 20);
          this.showBanner('♥ +1 QUANTUM CORE ACQUIRED');
        }
        break;
    }

    this.updateHUD();
  }

  // ==========================================================================
  // BRICK DESTRUCTION & EXPLOSIONS
  // ==========================================================================
  hitBrick(brick, ballOrLaser) {
    if (brick.type === 'UNBREAKABLE') {
      this.audio.playArmoredHit();
      this.particles.spawnText('DEFLECTED', brick.x + brick.w / 2, brick.y, '#aaa', 12);
      this.shakeAmount = 2;
      return false; // Did not break
    }

    brick.hp--;

    if (brick.hp > 0) {
      // Armored hit (still intact)
      this.audio.playArmoredHit();
      brick.color = '#fff'; // Flash white
      setTimeout(() => {
        brick.color = '#00f3ff';
      }, 70);
      this.particles.spawnText(`ARMOR ${brick.hp}/${brick.maxHp}`, brick.x + brick.w / 2, brick.y, '#00f3ff', 11);
      return false;
    }

    // Brick destroyed! Remove it first so a neighbouring explosive can't hit it again
    const idx = this.bricks.indexOf(brick);
    if (idx !== -1) {
      this.bricks.splice(idx, 1);
    }

    this.bricksDestroyed++;
    const pts = brick.points * this.combo;
    this.score += pts;
    this.particles.spawnBrickBreak(brick.x, brick.y, brick.w, brick.h, brick.color);
    this.particles.spawnText(`+${pts}`, brick.x + brick.w / 2, brick.y, brick.color, 13);
    this.audio.playBrickHit(brick.row, this.combo);

    // Increase combo
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    // Drop powerup?
    if (brick.powerupType) {
      const colors = {
        MULTIBALL: '#00f3ff',
        LASER: '#ff007f',
        EXPAND: '#05ffa1',
        PIERCE: '#ff7700',
        CHRONO: '#9d00ff',
        SHIELD: '#0077ff',
        LIFE: '#ff007f'
      };
      const icons = {
        MULTIBALL: '✦',
        LASER: '⚡',
        EXPAND: '↔',
        PIERCE: '🔥',
        CHRONO: '⏱',
        SHIELD: '🛡️',
        LIFE: '♥'
      };

      this.powerups.push({
        x: brick.x + brick.w / 2,
        y: brick.y + brick.h / 2,
        w: 26,
        h: 26,
        vy: 140,
        type: brick.powerupType,
        color: colors[brick.powerupType] || '#fff',
        icon: icons[brick.powerupType] || '★',
        rot: 0
      });
    }

    // Explosive Chain Reaction
    if (brick.type === 'EXPLOSIVE') {
      this.audio.playExplosion();
      this.shakeAmount = 12;
      this.particles.spawnShockwave(brick.x + brick.w / 2, brick.y + brick.h / 2, '#ff007f', 130);
      this.particles.spawnText('💥 NOVA BURST!', brick.x + brick.w / 2, brick.y - 15, '#ff007f', 16);

      // Damage surrounding bricks
      const radius = 90;
      const bx = brick.x + brick.w / 2;
      const by = brick.y + brick.h / 2;

      // Fixed list: the chain removes bricks from this.bricks as it spreads
      const nearby = this.bricks.filter(other => {
        if (other.type === 'UNBREAKABLE') return false;
        const ox = other.x + other.w / 2;
        const oy = other.y + other.h / 2;
        return Math.hypot(ox - bx, oy - by) <= radius;
      });

      for (const other of nearby) {
        if (other.hp > 0) this.hitBrick(other, null);
      }
    }

    this.checkStageClear();
    this.updateHUD();
    return true;
  }

  checkStageClear() {
    // A chain reaction lands here once per brick; only the first clear counts
    if (this.state !== 'PLAYING') return;

    // Check if any breakable bricks remain
    const breakables = this.bricks.filter(b => b.type !== 'UNBREAKABLE');
    if (breakables.length === 0) {
      this.onStageClear();
    }
  }

  onStageClear() {
    this.state = 'STAGECLEAR';
    this.audio.playStageClear();
    this.totalSectorsCleared++;

    const bonus = 1000 + this.sector * 500 + this.balls.length * 250;
    this.score += bonus;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('quantum_breaker_highscore', this.highScore);
    }

    document.getElementById('res-stage-bonus').textContent = `+${bonus.toLocaleString()}`;
    document.getElementById('res-stage-total').textContent = this.score.toLocaleString();
    document.getElementById('res-stage-balls').textContent = this.balls.length.toString();
    document.getElementById('res-stage-combo').textContent = `x${this.maxCombo}`;

    if (this.sector === 5) {
      // Victory screen for completing the 5 story sectors!
      document.getElementById('res-vic-score').textContent = this.score.toLocaleString();
      document.getElementById('res-vic-bricks').textContent = this.bricksDestroyed.toLocaleString();
      this.showModal(this.modals.victory);
    } else {
      this.showModal(this.modals.stageClear);
    }
  }

  nextSector() {
    this.sector++;
    this.hideAllModals();
    this.resetPaddle();
    this.buildLevel();
    this.resetBallOnPaddle();
    this.state = 'PLAYING';
    this.showBanner(`SECTOR 0${this.sector}: MATRIX EXPANSION`);
  }

  // ==========================================================================
  // LIFE LOSS & GAME OVER
  // ==========================================================================
  onBallLost(ballIndex) {
    this.balls.splice(ballIndex, 1);

    // If active balls remain, keep playing! (Multi-ball glory!)
    if (this.balls.length > 0) {
      this.updateHUD();
      return;
    }

    // All balls lost! Lose 1 Shield Core
    this.audio.playLifeLost();
    this.lives--;
    this.combo = 1;
    this.shakeAmount = 14;
    this.particles.spawnShockwave(this.paddle.x, this.paddle.y, '#ff007f', 180);

    if (this.lives > 0) {
      this.showBanner(`QUANTUM CORE LOST (${this.lives} REMAINING)`);
      this.resetPaddle();
      this.resetBallOnPaddle();
    } else {
      this.onGameOver();
    }

    this.updateHUD();
  }

  onGameOver() {
    this.state = 'GAMEOVER';
    this.audio.stopMusic();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('quantum_breaker_highscore', this.highScore);
    }

    document.getElementById('res-score').textContent = this.score.toLocaleString();
    document.getElementById('res-highscore').textContent = this.highScore.toLocaleString();
    document.getElementById('res-sectors').textContent = this.totalSectorsCleared.toString();
    document.getElementById('res-bricks').textContent = this.bricksDestroyed.toString();
    document.getElementById('res-max-balls').textContent = this.maxBallsInPlay.toString();
    document.getElementById('res-max-combo').textContent = `x${this.maxCombo}`;

    this.showModal(this.modals.gameOver);
  }

  // ==========================================================================
  // UPDATE LOOP & PHYSICS
  // ==========================================================================
  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Decay screen shake
    if (this.shakeAmount > 0) {
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 25);
    }

    // Update Stars Background
    for (const star of this.stars) {
      star.y += star.speed * dt;
      if (star.y > this.height) {
        star.y = 0;
        star.x = Math.random() * this.width;
      }
    }

    // Update Paddle Movement
    let moveDir = 0;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) moveDir -= 1;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) moveDir += 1;

    if (moveDir !== 0) {
      this.paddle.x += moveDir * this.paddle.speed * dt;
      this.paddle.vx = moveDir * this.paddle.speed;
      this.mouse.active = false;
    } else if (this.mouse.active) {
      // Smooth tracking of mouse cursor
      const dx = this.mouse.x - this.paddle.x;
      this.paddle.vx = dx / Math.max(dt, 0.001);
      this.paddle.x += dx * Math.min(1, dt * 24);
    } else {
      this.paddle.vx *= 0.8;
    }

    // Clamp paddle within walls
    const halfW = this.paddle.width / 2;
    const minX = 20 + halfW;
    const maxX = this.width - 20 - halfW;
    if (this.paddle.x < minX) this.paddle.x = minX;
    if (this.paddle.x > maxX) this.paddle.x = maxX;

    // Laser timer
    if (this.paddle.isLaser) {
      this.paddle.laserTimer -= dt;
      this.paddle.laserCooldown -= dt;
      // The steering thumb can't tap as well, so a held finger keeps firing
      if (this.drag && this.paddle.laserCooldown <= 0) {
        this.fireLasers();
        this.paddle.laserCooldown = 0.18;
      }
      if (this.paddle.laserTimer <= 0) {
        this.paddle.isLaser = false;
      }
    }

    // Extend timer
    if (this.paddle.isExtend) {
      this.paddle.extendTimer -= dt;
      if (this.paddle.extendTimer <= 0) {
        this.paddle.isExtend = false;
        this.paddle.width = this.paddle.baseWidth;
      }
    }

    // Pierce timer
    if (this.paddle.isPierce) {
      this.paddle.pierceTimer -= dt;
      if (this.paddle.pierceTimer <= 0) {
        this.paddle.isPierce = false;
        for (const b of this.balls) b.isPierce = false;
      }
    }

    // Chrono timer
    if (this.paddle.isChrono) {
      this.paddle.chronoTimer -= dt;
      if (this.paddle.chronoTimer <= 0) {
        this.paddle.isChrono = false;
      }
    }

    // Speed multiplier for Chrono Field
    const speedMult = this.paddle.isChrono ? 0.65 : 1.0;

    // Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;

      // Laser hitting bricks
      let laserHit = false;
      for (const brick of this.bricks) {
        if (l.x >= brick.x && l.x <= brick.x + brick.w &&
            l.y >= brick.y && l.y <= brick.y + brick.h) {
          laserHit = true;
          this.hitBrick(brick, l);
          break;
        }
      }

      if (laserHit || l.y < 20) {
        this.lasers.splice(i, 1);
      }
    }

    // Update Falling Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;
      p.rot += dt * 3;

      // Collision with Paddle
      if (p.y + p.h / 2 >= this.paddle.y - this.paddle.height / 2 &&
          p.y - p.h / 2 <= this.paddle.y + this.paddle.height / 2 &&
          p.x >= this.paddle.x - this.paddle.width / 2 &&
          p.x <= this.paddle.x + this.paddle.width / 2) {
        this.collectPowerup(p);
        this.powerups.splice(i, 1);
        continue;
      }

      // Drop below bottom
      if (p.y > this.height + 30) {
        this.powerups.splice(i, 1);
      }
    }

    // Update Balls Physics & Collisions
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const ball = this.balls[i];

      // Stuck ball tracks paddle position
      if (ball.isStuck) {
        ball.x = this.paddle.x + ball.stickOffsetX;
        ball.y = this.paddle.y - 12;
        continue;
      }

      // Trail
      this.particles.spawnBallTrail(ball.x, ball.y, ball.radius, ball.color);

      // Movement step
      ball.x += ball.vx * dt * speedMult;
      ball.y += ball.vy * dt * speedMult;

      // Anti-stuck safeguard: ensure ball never bounces purely horizontally
      if (Math.abs(ball.vy) < 45) {
        ball.vy = (ball.vy >= 0 ? 1 : -1) * 70;
      }

      // Wall Collisions: Left, Right, Top
      const minWallX = 20 + ball.radius;
      const maxWallX = this.width - 20 - ball.radius;
      const minWallY = 20 + ball.radius;

      if (ball.x <= minWallX) {
        ball.x = minWallX;
        ball.vx = Math.abs(ball.vx);
        this.audio.playArmoredHit();
      } else if (ball.x >= maxWallX) {
        ball.x = maxWallX;
        ball.vx = -Math.abs(ball.vx);
        this.audio.playArmoredHit();
      }

      if (ball.y <= minWallY) {
        ball.y = minWallY;
        ball.vy = Math.abs(ball.vy);
        this.audio.playArmoredHit();
      }

      // Collision with Paddle Top Edge
      const pTop = this.paddle.y - this.paddle.height / 2;
      const pBottom = this.paddle.y + this.paddle.height / 2;
      const pLeft = this.paddle.x - this.paddle.width / 2;
      const pRight = this.paddle.x + this.paddle.width / 2;

      if (ball.vy > 0 &&
          ball.y + ball.radius >= pTop &&
          ball.y - ball.radius <= pBottom &&
          ball.x >= pLeft - ball.radius &&
          ball.x <= pRight + ball.radius) {

        // Position normalization: -1 (far left) to +1 (far right)
        const hitOffset = (ball.x - this.paddle.x) / (this.paddle.width / 2);
        const clampedOffset = Math.max(-1, Math.min(1, hitOffset));

        // Compute rebound angle: 72 degrees max tilt
        const maxAngle = Math.PI * 0.40;
        const reboundAngle = clampedOffset * maxAngle - Math.PI / 2;

        // Accelerate ball slightly per hit (1.5%) up to 640px/s max
        ball.speed = Math.min(640, ball.speed * 1.015);
        ball.vx = Math.cos(reboundAngle) * ball.speed + this.paddle.vx * 0.12;
        ball.vy = Math.sin(reboundAngle) * ball.speed;

        // Position on top of paddle to prevent clipping
        ball.y = pTop - ball.radius - 1;

        // Reset combo on paddle return
        this.combo = 1;
        this.updateHUD();

        this.audio.playPaddleBounce(clampedOffset);
        this.particles.spawnShockwave(ball.x, ball.y, ball.color, 45);
      }

      // Collision with Safety Bottom Grid
      if (this.paddle.safetyShield && ball.y + ball.radius >= this.height - 12 && ball.vy > 0) {
        ball.y = this.height - 12 - ball.radius;
        ball.vy = -Math.abs(ball.vy);
        this.audio.playShieldBounce();
        this.particles.spawnShockwave(ball.x, this.height - 12, '#0077ff', 90);
        this.shakeAmount = 4;

        this.paddle.shieldHits--;
        if (this.paddle.shieldHits <= 0) {
          this.paddle.safetyShield = false;
          this.hud.shieldIndicator.classList.add('hidden');
          this.showBanner('SAFETY GRID SHATTERED');
        }
      }

      // Collision with Bricks
      for (let bIdx = this.bricks.length - 1; bIdx >= 0; bIdx--) {
        const brick = this.bricks[bIdx];

        // AABB check with ball radius
        if (ball.x + ball.radius >= brick.x &&
            ball.x - ball.radius <= brick.x + brick.w &&
            ball.y + ball.radius >= brick.y &&
            ball.y - ball.radius <= brick.y + brick.h) {

          const destroyed = this.hitBrick(brick, ball);

          // If pierce mode is active, ball blazes right through without deflecting!
          if (!ball.isPierce) {
            // Determine collision normal edge
            const overlapLeft = (ball.x + ball.radius) - brick.x;
            const overlapRight = (brick.x + brick.w) - (ball.x - ball.radius);
            const overlapTop = (ball.y + ball.radius) - brick.y;
            const overlapBottom = (brick.y + brick.h) - (ball.y - ball.radius);

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

            if (minOverlap === overlapLeft) {
              ball.vx = -Math.abs(ball.vx);
              ball.x = brick.x - ball.radius - 1;
            } else if (minOverlap === overlapRight) {
              ball.vx = Math.abs(ball.vx);
              ball.x = brick.x + brick.w + ball.radius + 1;
            } else if (minOverlap === overlapTop) {
              ball.vy = -Math.abs(ball.vy);
              ball.y = brick.y - ball.radius - 1;
            } else {
              ball.vy = Math.abs(ball.vy);
              ball.y = brick.y + brick.h + ball.radius + 1;
            }
          }

          break; // One brick collision per ball frame
        }
      }

      // Ball drops below screen
      if (ball.y - ball.radius > this.height) {
        this.onBallLost(i);
      }
    }

    // Update Particles
    this.particles.update(dt);
  }

  // ==========================================================================
  // HUD UPDATES
  // ==========================================================================
  updateHUD() {
    this.hud.score.textContent = this.score.toLocaleString();
    this.hud.combo.textContent = `x${this.combo}`;
    this.hud.sector.textContent = (this.sector < 10 ? '0' : '') + this.sector;
    this.hud.balls.textContent = this.balls.length.toString();
    this.hud.highscore.textContent = this.highScore.toLocaleString();

    // Hearts indicator
    let heartsHTML = '';
    for (let i = 0; i < this.maxLives; i++) {
      heartsHTML += `<span class="heart ${i < this.lives ? 'active' : ''}">◆</span>`;
    }
    this.hud.lives.innerHTML = heartsHTML;

    // Powerups Active Bar
    let pBarHTML = '';
    if (this.paddle.isLaser) {
      const sec = Math.ceil(this.paddle.laserTimer);
      pBarHTML += `<div class="powerup-pill ${sec <= 3 ? 'expiring' : ''}"><span>⚡</span> LASER ${sec}s</div>`;
    }
    if (this.paddle.isExtend) {
      const sec = Math.ceil(this.paddle.extendTimer);
      pBarHTML += `<div class="powerup-pill ${sec <= 3 ? 'expiring' : ''}"><span>↔</span> EXPAND ${sec}s</div>`;
    }
    if (this.paddle.isPierce) {
      const sec = Math.ceil(this.paddle.pierceTimer);
      pBarHTML += `<div class="powerup-pill ${sec <= 3 ? 'expiring' : ''}"><span>🔥</span> PIERCE ${sec}s</div>`;
    }
    if (this.paddle.isChrono) {
      const sec = Math.ceil(this.paddle.chronoTimer);
      pBarHTML += `<div class="powerup-pill ${sec <= 3 ? 'expiring' : ''}"><span>⏱</span> CHRONO ${sec}s</div>`;
    }
    if (this.balls.length > 1) {
      pBarHTML += `<div class="powerup-pill" style="border-color: #00f3ff; color: #00f3ff;"><span>✦</span> MULTI-BALL (${this.balls.length})</div>`;
    }
    this.hud.powerupsBar.innerHTML = pBarHTML;
  }

  // ==========================================================================
  // RENDERING
  // ==========================================================================
  draw() {
    this.ctx.save();
    this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);

    // Screen Shake Offset
    if (this.shakeAmount > 0) {
      const sx = (Math.random() - 0.5) * this.shakeAmount;
      const sy = (Math.random() - 0.5) * this.shakeAmount;
      this.ctx.translate(sx, sy);
    }

    // Clear Canvas
    this.ctx.fillStyle = '#05020c';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw Cyber Background Grid
    this.drawBackground();

    // Draw Starfield Dust
    for (const s of this.stars) {
      this.ctx.fillStyle = '#00f3ff';
      this.ctx.globalAlpha = s.alpha;
      this.ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    this.ctx.globalAlpha = 1;

    // Draw Boundaries (Neon Outer Frame)
    this.drawArenaBorders();

    // Draw Safety Grid if active
    if (this.paddle.safetyShield) {
      this.drawSafetyGrid();
    }

    // Draw Bricks
    this.drawBricks();

    // Draw Falling Powerups
    this.drawPowerups();

    // Draw Lasers
    this.drawLasers();

    // Draw Paddle
    this.drawPaddle();

    // Draw Particles, shockwaves, floating text
    this.particles.draw(this.ctx);

    // Draw Balls
    this.drawBalls();

    this.ctx.restore();
  }

  drawBackground() {
    this.ctx.save();
    // Perspective Grid floor in the lower half
    const horizonY = Math.round(this.height * 16 / 27);
    this.ctx.strokeStyle = 'rgba(157, 0, 255, 0.12)';
    this.ctx.lineWidth = 1;

    // Horizontal grid lines
    for (let y = horizonY; y < this.height; y += 22) {
      this.ctx.beginPath();
      this.ctx.moveTo(20, y);
      this.ctx.lineTo(this.width - 20, y);
      this.ctx.stroke();
    }

    // Perspective lines
    const centerX = this.width / 2;
    for (let x = -200; x <= this.width + 200; x += 90) {
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, horizonY);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawArenaBorders() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    this.ctx.lineWidth = 3;
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 10;

    // U-shaped border (Left, Top, Right)
    this.ctx.beginPath();
    this.ctx.moveTo(20, this.height);
    this.ctx.lineTo(20, 20);
    this.ctx.lineTo(this.width - 20, 20);
    this.ctx.lineTo(this.width - 20, this.height);
    this.ctx.stroke();

    // Corner Accents
    this.ctx.fillStyle = '#ff007f';
    this.ctx.shadowColor = '#ff007f';
    this.ctx.fillRect(16, 16, 8, 8);
    this.ctx.fillRect(this.width - 24, 16, 8, 8);
    this.ctx.restore();
  }

  drawSafetyGrid() {
    this.ctx.save();
    const y = this.height - 12;
    this.ctx.strokeStyle = '#0077ff';
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 15;
    this.ctx.lineWidth = 4;

    this.ctx.beginPath();
    this.ctx.moveTo(20, y);
    this.ctx.lineTo(this.width - 20, y);
    this.ctx.stroke();

    // Electric zig-zag pulses
    this.ctx.strokeStyle = '#00f3ff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    for (let x = 20; x < this.width - 20; x += 15) {
      const offsetY = (Math.random() - 0.5) * 6;
      this.ctx.lineTo(x, y + offsetY);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawBricks() {
    this.ctx.save();
    for (const b of this.bricks) {
      this.ctx.shadowColor = b.color;
      this.ctx.shadowBlur = 8;

      // Base body
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);

      // Glass inner highlight
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      this.ctx.fillRect(b.x + 2, b.y + 2, b.w - 4, b.h * 0.4);

      // Border outline
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Armored / Explosive Icon Accents
      if (b.type === 'ARMORED') {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '10px "Orbitron", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(`⬡ ${b.hp}`, b.x + b.w / 2, b.y + b.h / 2);
      } else if (b.type === 'EXPLOSIVE') {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('💣', b.x + b.w / 2, b.y + b.h / 2);
      } else if (b.type === 'PRISMATIC') {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('✦', b.x + b.w / 2, b.y + b.h / 2);
      } else if (b.type === 'UNBREAKABLE') {
        this.ctx.fillStyle = '#444';
        this.ctx.fillRect(b.x, b.y, b.w, b.h);
        this.ctx.strokeStyle = '#aaa';
        this.ctx.strokeRect(b.x, b.y, b.w, b.h);
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '9px "Orbitron"';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('OBELISK', b.x + b.w / 2, b.y + b.h / 2);
      }
    }
    this.ctx.restore();
  }

  drawPaddle() {
    this.ctx.save();
    const p = this.paddle;
    const x = p.x - p.width / 2;
    const y = p.y - p.height / 2;

    // Hover thruster flames beneath paddle
    this.ctx.fillStyle = '#00f3ff';
    this.ctx.shadowColor = '#00f3ff';
    this.ctx.shadowBlur = 15;
    const flameH = Math.random() * 6 + 4;
    this.ctx.fillRect(p.x - p.width * 0.35, y + p.height, p.width * 0.15, flameH);
    this.ctx.fillRect(p.x + p.width * 0.20, y + p.height, p.width * 0.15, flameH);

    // Paddle Base Bar
    this.ctx.fillStyle = p.isPierce ? '#ff7700' : p.isLaser ? '#ff007f' : '#00f3ff';
    this.ctx.shadowColor = this.ctx.fillStyle;
    this.ctx.shadowBlur = 14;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, p.width, p.height, 6);
    this.ctx.fill();

    // Inner Metallic Core
    this.ctx.fillStyle = '#0d071a';
    this.ctx.beginPath();
    this.ctx.roundRect(x + 4, y + 3, p.width - 8, p.height - 6, 4);
    this.ctx.fill();

    // Center Quantum Gem
    this.ctx.fillStyle = '#fff';
    this.ctx.shadowColor = '#fff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillRect(p.x - 6, y + 4, 12, p.height - 8);

    // Laser cannons attached to wings
    if (p.isLaser) {
      this.ctx.fillStyle = '#ff007f';
      this.ctx.shadowColor = '#ff007f';
      this.ctx.shadowBlur = 10;
      this.ctx.fillRect(x + 4, y - 8, 6, 10);
      this.ctx.fillRect(x + p.width - 10, y - 8, 6, 10);
    }
    this.ctx.restore();
  }

  drawBalls() {
    this.ctx.save();
    for (const b of this.balls) {
      const color = b.isPierce ? '#ff7700' : b.color;

      // Glow Halo
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius + 4, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 18;
      this.ctx.globalAlpha = 0.45;
      this.ctx.fill();

      // Ball Core
      this.ctx.globalAlpha = 1;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = 12;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawLasers() {
    this.ctx.save();
    this.ctx.fillStyle = '#ff007f';
    this.ctx.shadowColor = '#ff007f';
    this.ctx.shadowBlur = 12;
    for (const l of this.lasers) {
      this.ctx.fillRect(l.x - 2, l.y, 4, 16);
    }
    this.ctx.restore();
  }

  drawPowerups() {
    this.ctx.save();
    for (const p of this.powerups) {
      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rot);

      // Outer glowing diamond capsule
      this.ctx.strokeStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 12;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);

      this.ctx.fillStyle = 'rgba(18, 10, 36, 0.85)';
      this.ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);

      // Icon inside
      this.ctx.fillStyle = p.color;
      this.ctx.font = 'bold 13px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(p.icon, 0, 0);

      this.ctx.restore();
    }
    this.ctx.restore();
  }

  // ==========================================================================
  // MAIN LOOP
  // ==========================================================================
  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate and attach to window
window.addEventListener('DOMContentLoaded', () => {
  window.quantumBreaker = new QuantumBreaker();
});
