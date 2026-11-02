/**
 * GRAVITY FLIPPER // Quantum Inversion Runner
 * Pure Vanilla HTML5 Canvas + Web Audio API
 */

// ============================================================================
// AUDIO SYNTHESIZER (Music & Sound FX)
// ============================================================================
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.bpm = 132;
    this.step = 0;
    this.nextNoteTime = 0;
    this.timerID = null;

    // Bass notes in A minor pentatonic: A1, C2, D2, E2, G2
    this.bassNotes = [55.0, 65.41, 73.42, 82.41, 98.0];
    // Lead notes: A3, C4, D4, E4, G4, A4
    this.leadNotes = [220.0, 261.63, 293.66, 329.63, 392.0, 440.0];
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
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.scheduleNextBeat();
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerID) {
      clearTimeout(this.timerID);
      this.timerID = null;
    }
  }

  scheduleNextBeat() {
    if (!this.isPlayingMusic || !this.ctx) return;

    const secondsPer16th = 60.0 / (this.bpm * 4);
    while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
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

    // Kick on step 0, 4, 8, 12 (four-on-the-floor)
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Snare / Clap on step 4, 12
    if (step === 4 || step === 12) {
      this.playSnare(time);
    }

    // Hi-hat on every offbeat
    if (step % 2 === 1) {
      this.playHiHat(time, step % 4 === 2 ? 0.04 : 0.02);
    }

    // Rolling bassline
    if (step % 2 === 0) {
      const noteIdx = (Math.floor(step / 4) + Math.floor(step / 2)) % this.bassNotes.length;
      this.playBassNote(this.bassNotes[noteIdx], time);
    }

    // Occasional synth arpeggio lead
    if (step % 4 === 2 && Math.random() > 0.3) {
      const leadIdx = Math.floor(Math.random() * this.leadNotes.length);
      this.playLeadNote(this.leadNotes[leadIdx], time);
    }
  }

  playKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(140, time);
      osc.frequency.exponentialRampToValueAtTime(36, time + 0.08);

      gain.gain.setValueAtTime(0.35, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.12);
    } catch (e) {}
  }

  playSnare(time) {
    try {
      // Noise component
      const bufferSize = this.ctx.sampleRate * 0.08;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.08);
    } catch (e) {}
  }

  playHiHat(time, vol = 0.03) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.03;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(7000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.03);
    } catch (e) {}
  }

  playBassNote(freq, time) {
    try {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(180, time + 0.12);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.connect(filter);
      filter.connect(gain);
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

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    } catch (e) {}
  }

  // SFX: Gravity Flip (ascending/descending frequency sweep)
  playFlip(isUp) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      const startFreq = isUp ? 260 : 580;
      const endFreq = isUp ? 680 : 220;

      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.1);

      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch (e) {}
  }

  // SFX: Mid-Air Flip
  playAirFlip() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.exponentialRampToValueAtTime(1100, t + 0.08);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch (e) {}
  }

  // SFX: Orb Collect (Harmonic Crystal Chime)
  playOrb(combo = 1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
      const freq = notes[Math.min(combo - 1, notes.length - 1)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    } catch (e) {}
  }

  // SFX: Warp Gate
  playWarp() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = this.ctx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t + 0.2);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    } catch (e) {}
  }

  // SFX: Crash / Death explosion
  playCrash() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      // White noise explosion
      const bufferSize = this.ctx.sampleRate * 0.4;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(100, t + 0.4);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(t);
      noise.stop(t + 0.4);
    } catch (e) {}
  }

  // SFX: Sector Shift Fanfare
  playSectorShift() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
      chords.forEach((f, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, t + i * 0.06);
        gain.gain.setValueAtTime(0.15, t + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.06);
        osc.stop(t + i * 0.06 + 0.25);
      });
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

  emit(x, y, count, color, speed = 150, life = 0.5, size = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: Math.random() * size + 1.5,
        life,
        maxLife: life
      });
    }
  }

  emitSparks(x, y, dirY, color) {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x - 10 + Math.random() * 6,
        y: y + (dirY > 0 ? -2 : 2),
        vx: -Math.random() * 220 - 50,
        vy: (Math.random() - 0.5) * 80 * -dirY,
        color,
        size: Math.random() * 2.5 + 1,
        life: 0.25,
        maxLife: 0.25
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    ctx.save();
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class GravityFlipper {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new AudioEngine();
    this.particles = new ParticleSystem();

    // Virtual resolution
    this.width = 960;
    this.height = 540;

    // Boundaries: Ceiling at y=40, Floor at y=500
    this.ceilingY = 40;
    this.floorY = 500;

    // Game state
    this.state = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1;
    this.orbsCollected = 0;
    this.streak = 0;

    // Speed progression
    this.baseSpeed = 460;
    this.speed = this.baseSpeed;
    this.maxSpeed = 880;

    // Sector management
    this.currentSector = 0;
    this.sectors = [
      { name: 'NEXUS', primary: '#00f3ff', secondary: '#9d00ff', glow: 'rgba(0, 243, 255, 0.4)' },
      { name: 'PLASMA', primary: '#ff007f', secondary: '#ffe600', glow: 'rgba(255, 0, 127, 0.4)' },
      { name: 'SOLAR', primary: '#ffe600', secondary: '#ff7700', glow: 'rgba(255, 230, 0, 0.4)' },
      { name: 'VOID', primary: '#05ffa1', secondary: '#00f3ff', glow: 'rgba(5, 255, 161, 0.4)' },
      { name: 'NEBULA', primary: '#9d00ff', secondary: '#ff007f', glow: 'rgba(157, 0, 255, 0.4)' }
    ];

    // High Score Storage
    this.storageKey = 'gravity_flipper_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    // Player state
    this.player = {
      x: 170,
      y: this.floorY - 28,
      size: 28,
      vy: 0,
      gravityDir: 1, // 1 = down towards floor, -1 = up towards ceiling
      gravityForce: 2800,
      terminalVel: 1250,
      isGrounded: true,
      airFlipAvailable: true,
      rotation: 0,
      targetRotation: 0,
      trail: [],
      nearMissCooldown: 0
    };

    // Camera & Screen Shake
    this.shake = 0;
    this.flashAlpha = 0;

    // Level objects
    this.obstacles = [];
    this.platforms = [];
    this.orbs = [];
    this.warpGates = [];
    this.bgGridOffset = 0;
    this.nextSpawnX = 800;

    this.initDOM();
    this.bindEvents();
    this.updateHUD();
  }

  initDOM() {
    this.scoreDisplay = document.getElementById('score-display');
    this.distDisplay = document.getElementById('dist-display');
    this.multDisplay = document.getElementById('mult-display');
    this.sectorDisplay = document.getElementById('sector-display');
    this.hudHighscore = document.getElementById('hud-highscore');
    this.airflipPill = document.getElementById('airflip-pill-1');
    this.banner = document.getElementById('banner-notification');
    this.audioIcon = document.getElementById('audio-icon');

    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.resScore = document.getElementById('res-score');
    this.resDist = document.getElementById('res-distance');
    this.resOrbs = document.getElementById('res-orbs');
    this.resHighscore = document.getElementById('res-highscore');
    this.newRecordBadge = document.getElementById('new-record-badge');
  }

  bindEvents() {
    // Don't run on while the phone is locked, or behind the rotate prompt
    const pauseIfPlaying = () => {
      if (this.state === 'playing') this.togglePause();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseIfPlaying();
    });
    window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
      if (e.matches) pauseIfPlaying();
    });

    // Start / Restart Buttons
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-restart').addEventListener('click', () => this.start());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.start());

    // Audio & Pause toggles
    document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = this.audio.toggleMute();
      this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pause').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    // Tap / Click to flip anywhere in canvas or touch zone
    const triggerFlip = (e) => {
      if (this.state === 'playing') {
        if (e) e.preventDefault();
        this.handleFlip();
      }
    };

    document.getElementById('touch-tap-zone').addEventListener('pointerdown', triggerFlip);
    this.canvas.addEventListener('pointerdown', triggerFlip);

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyW' || e.code === 'KeyS') {
        if (this.state === 'playing') {
          e.preventDefault();
          this.handleFlip();
        } else if (this.state === 'start') {
          e.preventDefault();
          this.start();
        }
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') {
          e.preventDefault();
          this.togglePause();
        }
      }

      if (e.code === 'KeyR' && this.state === 'gameover') {
        e.preventDefault();
        this.start();
      }

      if (e.code === 'KeyM') {
        const isMuted = this.audio.toggleMute();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    // Auto resize crisp render
    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  resizeCanvas() {
    // Virtual 960x540 resolution
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    this.audio.init();
    this.audio.startMusic();

    this.state = 'playing';
    this.score = 0;
    this.distance = 0;
    this.multiplier = 1;
    this.orbsCollected = 0;
    this.streak = 0;
    this.speed = this.baseSpeed;
    this.currentSector = 0;
    this.shake = 0;
    this.flashAlpha = 0;

    // Reset player
    this.player.y = this.floorY - this.player.size;
    this.player.vy = 0;
    this.player.gravityDir = 1;
    this.player.isGrounded = true;
    this.player.airFlipAvailable = true;
    this.player.rotation = 0;
    this.player.targetRotation = 0;
    this.player.trail = [];
    this.player.nearMissCooldown = 0;

    // Clear world entities
    this.obstacles = [];
    this.platforms = [];
    this.orbs = [];
    this.warpGates = [];
    this.particles.clear();
    this.nextSpawnX = 750;

    // Modals
    this.startScreen.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');
    this.newRecordBadge.classList.add('hidden');

    this.showBanner('SECTOR 01: CYBER NEXUS');
    this.updateHUD();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.audio.stopMusic();
      this.pauseScreen.classList.add('active');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.audio.startMusic();
      this.pauseScreen.classList.remove('active');
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  handleFlip() {
    const p = this.player;

    if (p.isGrounded) {
      // Normal grounded flip
      p.gravityDir = -p.gravityDir;
      p.isGrounded = false;
      p.vy = p.gravityDir * 320; // initial leap impulse
      p.targetRotation += Math.PI;
      this.audio.playFlip(p.gravityDir < 0);
      this.shake = 4;
      this.particles.emit(p.x, p.gravityDir < 0 ? p.y + p.size : p.y, 8, this.getSector().primary, 120, 0.3);
    } else if (p.airFlipAvailable) {
      // Emergency Air Flip!
      p.gravityDir = -p.gravityDir;
      p.airFlipAvailable = false;
      p.vy = p.gravityDir * 400; // strong redirection
      p.targetRotation += Math.PI;
      this.audio.playAirFlip();
      this.shake = 7;
      this.particles.emit(p.x, p.y + p.size / 2, 14, '#ffe600', 200, 0.4);
      this.updateAirFlipUI();
    }
  }

  updateAirFlipUI() {
    if (this.player.airFlipAvailable) {
      this.airflipPill.classList.add('ready');
    } else {
      this.airflipPill.classList.remove('ready');
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.audio.stopMusic();
    this.audio.playCrash();
    this.shake = 22;
    this.flashAlpha = 0.8;

    // Emit big death explosion
    this.particles.emit(this.player.x, this.player.y, 35, '#ff007f', 380, 0.8, 5);
    this.particles.emit(this.player.x, this.player.y, 25, '#00f3ff', 320, 0.7, 4);

    const isNewBest = this.score > this.highScore;
    if (isNewBest) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
      this.newRecordBadge.classList.remove('hidden');
    }

    this.resScore.textContent = this.score.toLocaleString();
    this.resDist.textContent = Math.floor(this.distance) + 'm';
    this.resOrbs.textContent = this.orbsCollected;
    this.resHighscore.textContent = this.highScore.toLocaleString();

    this.gameoverScreen.classList.add('active');
    this.updateHUD();
  }

  showBanner(text) {
    this.banner.textContent = text;
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.classList.remove('show');
    }, 2400);
  }

  getSector() {
    return this.sectors[this.currentSector % this.sectors.length];
  }

  // ==========================================================================
  // PROCEDURAL LEVEL GENERATION
  // ==========================================================================
  spawnNextPattern() {
    const x = this.nextSpawnX;
    const theme = this.getSector();

    // Pattern catalogue
    const patternType = Math.floor(Math.random() * 6);
    let patternLength = 400;

    switch (patternType) {
      case 0:
        // Alternating rhythm spikes (Floor -> Ceiling -> Floor)
        this.obstacles.push({ type: 'spike', x: x, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 240, y: this.ceilingY, isCeiling: true });
        this.obstacles.push({ type: 'spike', x: x + 480, y: this.floorY, isCeiling: false });
        this.orbs.push({ x: x + 120, y: (this.ceilingY + this.floorY) / 2 });
        this.orbs.push({ x: x + 360, y: (this.ceilingY + this.floorY) / 2 });
        patternLength = 620;
        break;

      case 1:
        // Mid-air Floating Platform with spikes above and below
        const platY = 270;
        const platW = 200;
        this.platforms.push({ x: x + 100, y: platY, w: platW, h: 14 });
        this.obstacles.push({ type: 'spike', x: x + 150, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 150, y: this.ceilingY, isCeiling: true });
        this.orbs.push({ x: x + 200, y: platY - 26 });
        patternLength = 480;
        break;

      case 2:
        // Stepped dual platforms
        this.platforms.push({ x: x, y: 190, w: 160, h: 14 });
        this.platforms.push({ x: x + 220, y: 350, w: 160, h: 14 });
        this.obstacles.push({ type: 'spike', x: x + 80, y: this.ceilingY, isCeiling: true });
        this.obstacles.push({ type: 'spike', x: x + 300, y: this.floorY, isCeiling: false });
        this.orbs.push({ x: x + 80, y: 150 });
        this.orbs.push({ x: x + 300, y: 390 });
        patternLength = 520;
        break;

      case 3:
        // Spike tunnel with central Warp Gate
        this.obstacles.push({ type: 'spike', x: x + 60, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 110, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 60, y: this.ceilingY, isCeiling: true });
        this.obstacles.push({ type: 'spike', x: x + 110, y: this.ceilingY, isCeiling: true });
        this.warpGates.push({ x: x + 280, y: (this.ceilingY + this.floorY) / 2, radius: 32 });
        patternLength = 460;
        break;

      case 4:
        // Consecutive gap leap
        this.obstacles.push({ type: 'spike', x: x + 40, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 200, y: this.floorY, isCeiling: false });
        this.orbs.push({ x: x + 120, y: 440 });
        this.orbs.push({ x: x + 280, y: 100 });
        this.obstacles.push({ type: 'spike', x: x + 340, y: this.ceilingY, isCeiling: true });
        patternLength = 500;
        break;

      case 5:
        // High-density Graviton Arc with single precision hazard
        const midY = (this.ceilingY + this.floorY) / 2;
        this.orbs.push({ x: x + 50, y: midY - 60 });
        this.orbs.push({ x: x + 120, y: midY });
        this.orbs.push({ x: x + 190, y: midY + 60 });
        this.obstacles.push({ type: 'spike', x: x + 120, y: this.floorY, isCeiling: false });
        this.obstacles.push({ type: 'spike', x: x + 300, y: this.ceilingY, isCeiling: true });
        patternLength = 450;
        break;
    }

    this.nextSpawnX += patternLength;
  }

  // ==========================================================================
  // UPDATE LOOP
  // ==========================================================================
  update(dt) {
    if (this.state !== 'playing') return;

    // Distance & dynamic speed scaling
    this.distance += (this.speed * dt) / 10;
    this.speed = Math.min(this.maxSpeed, this.baseSpeed + this.distance * 0.16);

    // Score accumulation
    this.score += Math.floor(this.speed * dt * 0.25 * this.multiplier);

    // Sector transitions every 750m
    const newSectorIdx = Math.floor(this.distance / 750);
    if (newSectorIdx !== this.currentSector) {
      this.currentSector = newSectorIdx;
      const theme = this.getSector();
      this.showBanner(`SECTOR ${String(this.currentSector + 1).padStart(2, '0')}: ${theme.name}`);
      this.audio.playSectorShift();
      this.flashAlpha = 0.45;
      this.shake = 10;
    }

    // Camera shake decay
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 25);
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.5);
    }

    // Move world entities leftward
    const dx = this.speed * dt;
    this.bgGridOffset = (this.bgGridOffset + dx * 0.6) % 40;
    this.nextSpawnX -= dx;

    // Spawn new obstacles as needed
    while (this.nextSpawnX < 1400) {
      this.spawnNextPattern();
    }

    // Update Player Physics
    this.updatePlayer(dt, dx);

    // Update & check collisions on obstacles
    this.updateObstacles(dx);

    // Update & check collisions on platforms
    this.updatePlatforms(dx);

    // Update & check collisions on Orbs
    this.updateOrbs(dx);

    // Update & check collisions on Warp Gates
    this.updateWarpGates(dx);

    // Update particles
    this.particles.update(dt);

    // Update HUD
    this.updateHUD();
  }

  updatePlayer(dt, dx) {
    const p = this.player;

    // Record trail positions
    p.trail.unshift({ x: p.x, y: p.y, rotation: p.rotation, gravityDir: p.gravityDir });
    if (p.trail.length > 8) p.trail.pop();

    // Gravity acceleration
    p.vy += p.gravityDir * p.gravityForce * dt;
    // Terminal velocity clamp
    if (p.gravityDir > 0 && p.vy > p.terminalVel) p.vy = p.terminalVel;
    if (p.gravityDir < 0 && p.vy < -p.terminalVel) p.vy = -p.terminalVel;

    p.y += p.vy * dt;

    // Smooth rotation towards target orientation
    p.rotation += (p.targetRotation - p.rotation) * Math.min(1, dt * 18);

    // Boundary checks: Floor & Ceiling
    p.isGrounded = false;

    // Floor collision
    if (p.y + p.size >= this.floorY) {
      p.y = this.floorY - p.size;
      p.vy = 0;
      p.isGrounded = true;
      p.airFlipAvailable = true;
      this.updateAirFlipUI();
      // Sparks while running
      this.particles.emitSparks(p.x, this.floorY, 1, this.getSector().primary);
    }

    // Ceiling collision
    if (p.y <= this.ceilingY) {
      p.y = this.ceilingY;
      p.vy = 0;
      p.isGrounded = true;
      p.airFlipAvailable = true;
      this.updateAirFlipUI();
      // Sparks while running on ceiling
      this.particles.emitSparks(p.x, this.ceilingY, -1, this.getSector().primary);
    }
  }

  updatePlatforms(dx) {
    const p = this.player;

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const plat = this.platforms[i];
      plat.x -= dx;

      // Platform collision
      const pRight = p.x + p.size;
      const pLeft = p.x;
      const platRight = plat.x + plat.w;
      const platLeft = plat.x;

      if (pRight > platLeft && pLeft < platRight) {
        // Landing on top (falling down)
        if (p.gravityDir > 0 && p.vy >= 0) {
          const prevY = p.y - p.vy * 0.016;
          if (prevY + p.size <= plat.y + 10 && p.y + p.size >= plat.y) {
            p.y = plat.y - p.size;
            p.vy = 0;
            p.isGrounded = true;
            p.airFlipAvailable = true;
            this.updateAirFlipUI();
            this.particles.emitSparks(p.x, plat.y, 1, '#00f3ff');
          }
        }
        // Landing on bottom (falling up towards ceiling)
        else if (p.gravityDir < 0 && p.vy <= 0) {
          const prevY = p.y - p.vy * 0.016;
          const platBottom = plat.y + plat.h;
          if (prevY >= platBottom - 10 && p.y <= platBottom) {
            p.y = platBottom;
            p.vy = 0;
            p.isGrounded = true;
            p.airFlipAvailable = true;
            this.updateAirFlipUI();
            this.particles.emitSparks(p.x, platBottom, -1, '#00f3ff');
          }
        }
      }

      if (plat.x + plat.w < -100) {
        this.platforms.splice(i, 1);
      }
    }
  }

  updateObstacles(dx) {
    const p = this.player;
    const pBox = {
      x: p.x + 4,
      y: p.y + 4,
      w: p.size - 8,
      h: p.size - 8
    };

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= dx;

      // Check collision for spike triangle
      if (obs.type === 'spike') {
        const spikeW = 30;
        const spikeH = 40;
        const spikeBox = {
          x: obs.x - spikeW / 2 + 5,
          y: obs.isCeiling ? obs.y : obs.y - spikeH,
          w: spikeW - 10,
          h: spikeH - 6
        };

        // AABB Box intersection
        if (
          pBox.x < spikeBox.x + spikeBox.w &&
          pBox.x + pBox.w > spikeBox.x &&
          pBox.y < spikeBox.y + spikeBox.h &&
          pBox.y + pBox.h > spikeBox.y
        ) {
          this.gameOver();
          return;
        }

        // Near-miss detection (gives streak boost!)
        const distToSpike = Math.hypot(p.x - obs.x, p.y - (obs.isCeiling ? obs.y + 20 : obs.y - 20));
        if (distToSpike < 45 && !obs.nearMissed) {
          obs.nearMissed = true;
          this.score += 50 * this.multiplier;
        }
      }

      if (obs.x < -100) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  updateOrbs(dx) {
    const p = this.player;
    const pCenter = { x: p.x + p.size / 2, y: p.y + p.size / 2 };

    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i];
      orb.x -= dx;

      // Distance to player center
      const dist = Math.hypot(pCenter.x - orb.x, pCenter.y - orb.y);
      if (dist < p.size / 2 + 16) {
        // Collect!
        this.orbsCollected++;
        this.streak++;
        // Boost multiplier every 4 orbs up to 8x
        this.multiplier = Math.min(8, 1 + Math.floor(this.streak / 4));

        this.score += 150 * this.multiplier;
        this.audio.playOrb(this.multiplier);

        // Recharge Air Flip
        this.player.airFlipAvailable = true;
        this.updateAirFlipUI();

        // Particles
        this.particles.emit(orb.x, orb.y, 12, '#ffe600', 160, 0.4);

        this.orbs.splice(i, 1);
        continue;
      }

      if (orb.x < -50) {
        this.orbs.splice(i, 1);
      }
    }
  }

  updateWarpGates(dx) {
    const p = this.player;
    const pCenter = { x: p.x + p.size / 2, y: p.y + p.size / 2 };

    for (let i = this.warpGates.length - 1; i >= 0; i--) {
      const gate = this.warpGates[i];
      gate.x -= dx;

      const dist = Math.hypot(pCenter.x - gate.x, pCenter.y - gate.y);
      if (dist < gate.radius + p.size / 2) {
        // Trigger Warp Gate!
        this.score += 600 * this.multiplier;
        this.distance += 40; // warp forward!
        this.audio.playWarp();
        this.shake = 12;
        this.flashAlpha = 0.5;

        this.particles.emit(gate.x, gate.y, 25, '#00f3ff', 300, 0.6);
        this.warpGates.splice(i, 1);
        continue;
      }

      if (gate.x < -100) {
        this.warpGates.splice(i, 1);
      }
    }
  }

  updateHUD() {
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score.toString().padStart(6, '0');
    if (this.distDisplay) this.distDisplay.textContent = Math.floor(this.distance) + 'm';
    if (this.multDisplay) this.multDisplay.textContent = `x${this.multiplier}`;
    if (this.sectorDisplay) this.sectorDisplay.textContent = this.getSector().name;
    if (this.hudHighscore) this.hudHighscore.textContent = this.highScore.toString().padStart(6, '0');
  }

  // ==========================================================================
  // RENDER PIPELINE
  // ==========================================================================
  render() {
    const { ctx, width, height } = this;
    const theme = this.getSector();

    ctx.save();

    // Camera Shake
    if (this.shake > 0) {
      const ox = (Math.random() - 0.5) * this.shake;
      const oy = (Math.random() - 0.5) * this.shake;
      ctx.translate(ox, oy);
    }

    // Clear Canvas
    ctx.fillStyle = '#06020d';
    ctx.fillRect(0, 0, width, height);

    // Draw Parallax Geometric Grid & Horizon Glow
    this.renderBackground(ctx, theme);

    // Draw Ceiling & Floor boundaries
    this.renderBoundaries(ctx, theme);

    // Draw Platforms
    this.renderPlatforms(ctx, theme);

    // Draw Obstacles (Spikes)
    this.renderObstacles(ctx);

    // Draw Collectible Orbs & Warp Gates
    this.renderOrbs(ctx);
    this.renderWarpGates(ctx);

    // Draw Particles
    this.particles.render(ctx);

    // Draw Player
    if (this.state !== 'gameover') {
      this.renderPlayer(ctx, theme);
    }

    // Screen flash overlay
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  renderBackground(ctx, theme) {
    const { width, height } = this;

    // Gradient atmosphere
    const grad = ctx.createRadialGradient(width / 2, height / 2, 40, width / 2, height / 2, 400);
    grad.addColorStop(0, theme.glow);
    grad.addColorStop(1, 'rgba(6, 2, 13, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Scrolling background grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const step = 40;

    for (let x = -this.bgGridOffset; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, this.ceilingY);
      ctx.lineTo(x, this.floorY);
      ctx.stroke();
    }

    for (let y = this.ceilingY; y <= this.floorY; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  renderBoundaries(ctx, theme) {
    const { width } = this;

    // Ceiling bar
    ctx.fillStyle = '#0b0518';
    ctx.fillRect(0, 0, width, this.ceilingY);
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 3;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(0, this.ceilingY);
    ctx.lineTo(width, this.ceilingY);
    ctx.stroke();

    // Floor bar
    ctx.fillRect(0, this.floorY, width, this.height - this.floorY);
    ctx.beginPath();
    ctx.moveTo(0, this.floorY);
    ctx.lineTo(width, this.floorY);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  renderPlatforms(ctx, theme) {
    for (const plat of this.platforms) {
      ctx.save();
      ctx.fillStyle = 'rgba(16, 10, 32, 0.95)';
      ctx.strokeStyle = theme.primary;
      ctx.lineWidth = 2;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 10;

      ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);

      // Energy line across platform center
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(plat.x + 4, plat.y + plat.h / 2);
      ctx.lineTo(plat.x + plat.w - 4, plat.y + plat.h / 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  renderObstacles(ctx) {
    for (const obs of this.obstacles) {
      if (obs.type === 'spike') {
        ctx.save();
        const spikeW = 30;
        const spikeH = 40;
        const tipY = obs.isCeiling ? obs.y + spikeH : obs.y - spikeH;
        const baseY = obs.y;

        ctx.fillStyle = 'rgba(255, 0, 127, 0.25)';
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff007f';
        ctx.shadowBlur = 15;

        ctx.beginPath();
        ctx.moveTo(obs.x - spikeW / 2, baseY);
        ctx.lineTo(obs.x, tipY);
        ctx.lineTo(obs.x + spikeW / 2, baseY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Inner glowing core line
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(obs.x, baseY);
        ctx.lineTo(obs.x, tipY);
        ctx.stroke();

        ctx.restore();
      }
    }
  }

  renderOrbs(ctx) {
    const time = performance.now() * 0.005;
    for (const orb of this.orbs) {
      ctx.save();
      const floatY = orb.y + Math.sin(time + orb.x * 0.02) * 4;

      ctx.translate(orb.x, floatY);
      ctx.rotate(time * 0.5);

      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 16;

      // Diamond polygon
      const r = 9;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();

      // Inner white core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  renderWarpGates(ctx) {
    const time = performance.now() * 0.006;
    for (const gate of this.warpGates) {
      ctx.save();
      ctx.translate(gate.x, gate.y);

      // Outer pulsing ring
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.arc(0, 0, gate.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating inner spokes
      ctx.rotate(time);
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(gate.radius - 4, 0);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  renderPlayer(ctx, theme) {
    const p = this.player;

    // Draw motion trail after-images
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      const alpha = (1 - (i + 1) / p.trail.length) * 0.45;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(t.x + p.size / 2, t.y + p.size / 2);
      ctx.rotate(t.rotation);
      ctx.fillStyle = theme.primary;
      ctx.shadowColor = theme.primary;
      ctx.shadowBlur = 10;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }

    // Main Player Avatar
    ctx.save();
    ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
    ctx.rotate(p.rotation);

    // Outer cybernetic cube
    ctx.fillStyle = 'rgba(10, 5, 25, 0.9)';
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.primary;
    ctx.shadowBlur = 15;

    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);

    // Glowing center core (changes color if Air Flip is ready!)
    const coreColor = p.airFlipAvailable ? '#00f3ff' : '#ff007f';
    ctx.fillStyle = coreColor;
    ctx.shadowColor = coreColor;
    ctx.shadowBlur = 10;
    ctx.fillRect(-p.size / 4, -p.size / 4, p.size / 2, p.size / 2);

    // Directional chevron indicator
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(4, -2);
    ctx.stroke();

    ctx.restore();
  }

  // ==========================================================================
  // MAIN GAME LOOP
  // ==========================================================================
  loop(currentTime) {
    if (this.state !== 'playing') return;

    // A frame's timestamp can predate the tap that started the run, so never step backwards
    const dt = Math.max(0, Math.min((currentTime - this.lastTime) / 1000, 0.05));
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gravityGame = new GravityFlipper();
});
