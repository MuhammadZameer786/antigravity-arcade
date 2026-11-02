/**
 * NEON PONG // Cyberpunk Curve Rally
 * Pure Vanilla HTML5 Canvas + Web Audio API
 */

// ============================================================================
// AUDIO SYNTHESIZER
// ============================================================================
class PongAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isPlayingMusic = false;
    this.step = 0;
    this.bpm = 128;
    this.timerID = null;
    this.nextBeatTime = 0;

    // Pentatonic notes in D minor: D2, F2, G2, A2, C3
    this.bassFreqs = [73.42, 87.31, 98.0, 110.0, 130.81];
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

    // Kick drum on 0, 4, 8, 12
    if (step % 4 === 0) {
      this.playKick(time);
    }

    // Hi-hat on offbeats
    if (step % 2 === 1) {
      this.playHiHat(time);
    }

    // Pulsing bassline
    if (step % 2 === 0) {
      const noteIdx = (Math.floor(step / 4) + step) % this.bassFreqs.length;
      this.playBass(this.bassFreqs[noteIdx], time);
    }
  }

  playKick(time) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.frequency.setValueAtTime(130, time);
      osc.frequency.exponentialRampToValueAtTime(35, time + 0.09);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.1);
    } catch (e) {}
  }

  playHiHat(time) {
    try {
      const bufferSize = this.ctx.sampleRate * 0.025;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.025, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.025);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(time);
      noise.stop(time + 0.025);
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
      filter.frequency.setValueAtTime(380, time);
      filter.frequency.exponentialRampToValueAtTime(160, time + 0.12);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(time);
      osc.stop(time + 0.13);
    } catch (e) {}
  }

  // SFX: Paddle Bounce with dynamic pitch by hit location
  playPaddleHit(hitOffset = 0, isSmash = false) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isSmash ? 'sawtooth' : 'triangle';
      // Center hit = 340Hz; Edge slice = up to 720Hz
      const baseFreq = 340 + Math.abs(hitOffset) * 380;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.08);

      gain.gain.setValueAtTime(isSmash ? 0.35 : 0.22, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isSmash ? 0.18 : 0.1));

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + (isSmash ? 0.18 : 0.1));
    } catch (e) {}
  }

  // SFX: Wall Bounce
  playWallHit() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.06);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch (e) {}
  }

  // SFX: Point Scored
  playScore(isP1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const notes = isP1 ? [440, 554.37, 659.25] : [330, 293.66, 220];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gain.gain.setValueAtTime(0.2, t + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.18);
      });
    } catch (e) {}
  }

  // SFX: Match Win Fanfare
  playMatchWin() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const melody = [523.25, 659.25, 783.99, 1046.5];
      melody.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + i * 0.1);
        gain.gain.setValueAtTime(0.25, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.3);
      });
    } catch (e) {}
  }

  // SFX: Powerup collect
  playPowerup() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
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

  emit(x, y, count, color, speed = 180, life = 0.45, size = 3) {
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

  emitSmashBurst(x, y, color) {
    for (let i = 0; i < 22; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = Math.random() * 320 + 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        color,
        size: Math.random() * 4 + 2,
        life: 0.5,
        maxLife: 0.5
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
      ctx.shadowBlur = 8;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  clear() {
    this.particles = [];
  }
}

// ============================================================================
// MAIN NEON PONG CONTROLLER
// ============================================================================
class NeonPong {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new PongAudio();
    this.particles = new ParticleSystem();

    // Virtual resolution
    this.width = 960;
    this.height = 540;

    // Boundaries
    this.topBound = 16;
    this.bottomBound = this.height - 16;

    // Phones: the portrait view turns this same court a quarter turn (see render)
    this.portraitQuery = window.matchMedia('(max-width: 820px) and (orientation: portrait)');
    this.isPortrait = this.portraitQuery.matches;
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;
    this.renderScale = 1;
    this.touchGain = 1.4; // paddle travel per unit of finger travel, so thumbs can reach the walls

    // Game Config & Modes
    this.mode = '1p'; // '1p' or '2p'
    this.difficulty = 'normal'; // 'easy', 'normal', 'hard', 'impossible'
    this.targetScore = 7;

    // Game State
    this.state = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.p1Score = 0;
    this.p2Score = 0;
    this.rally = 0;
    this.maxRallyInMatch = 0;
    this.storageKey = 'neon_pong_best_rally';
    this.allTimeBestRally = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    // Camera & Screen Shake
    this.shake = 0;
    this.flashAlpha = 0;

    // Keys State
    this.keys = {};

    // Paddles
    this.p1 = {
      x: 42,
      y: (this.height - 96) / 2,
      w: 16,
      h: 96,
      vy: 0,
      speed: 560,
      color: '#00f3ff',
      isP1: true,
      powerTimer: 0,
      drag: null,
      targetY: 0
    };

    this.p2 = {
      x: this.width - 42 - 16,
      y: (this.height - 96) / 2,
      w: 16,
      h: 96,
      vy: 0,
      speed: 560,
      color: '#ff007f',
      isP1: false,
      powerTimer: 0,
      drag: null,
      targetY: 0,
      // AI targeting
      aiTargetY: (this.height - 96) / 2,
      aiLastPredictTime: 0
    };

    // Balls (support multi-ball)
    this.balls = [];
    this.serveTimer = 0;
    this.serveDir = 1;

    // Floating Power-Up
    this.powerUp = null;
    this.nextPowerUpRally = 5;

    this.initDOM();
    this.bindEvents();
    this.updateHUD();
  }

  initDOM() {
    this.p1ScoreDisplay = document.getElementById('p1-score');
    this.p2ScoreDisplay = document.getElementById('p2-score');
    this.p1Label = document.getElementById('p1-label');
    this.p2Label = document.getElementById('p2-label');
    this.rallyDisplay = document.getElementById('rally-count');
    this.bestRallyDisplay = document.getElementById('best-rally-display');
    this.targetScoreDisplay = document.getElementById('target-score-display');
    this.modeTagDisplay = document.getElementById('mode-tag-display');
    this.banner = document.getElementById('banner-notification');
    this.audioIcon = document.getElementById('audio-icon');

    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');

    this.winnerTitle = document.getElementById('winner-title');
    this.winnerSub = document.getElementById('winner-sub');
    this.resP1Score = document.getElementById('res-p1-score');
    this.resP2Score = document.getElementById('res-p2-score');
    this.resMaxRally = document.getElementById('res-max-rally');
    this.resBestRally = document.getElementById('res-best-rally');
    this.resP1Label = document.getElementById('res-p1-label');
    this.resP2Label = document.getElementById('res-p2-label');
  }

  bindEvents() {
    // Mode toggles
    const mode1pBtn = document.getElementById('btn-mode-1p');
    const mode2pBtn = document.getElementById('btn-mode-2p');
    const diffGroup = document.getElementById('difficulty-group');
    const p2ControlRow = document.getElementById('p2-control-row');

    mode1pBtn.addEventListener('click', () => {
      this.mode = '1p';
      mode1pBtn.classList.add('active');
      mode2pBtn.classList.remove('active');
      diffGroup.style.display = 'block';
      p2ControlRow.style.opacity = '0.5';
    });

    mode2pBtn.addEventListener('click', () => {
      this.mode = '2p';
      mode2pBtn.classList.add('active');
      mode1pBtn.classList.remove('active');
      diffGroup.style.display = 'none';
      p2ControlRow.style.opacity = '1';
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.difficulty = e.currentTarget.dataset.diff;
      });
    });

    // Match point buttons
    document.querySelectorAll('.pts-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.pts-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.targetScore = parseInt(e.currentTarget.dataset.pts, 10);
      });
    });

    // Start / Restart / Pause buttons
    document.getElementById('btn-start').addEventListener('click', () => this.startMatch());
    document.getElementById('btn-restart').addEventListener('click', () => this.startMatch());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.startMatch());

    document.getElementById('btn-audio-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      const isMuted = this.audio.toggleMute();
      this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pause').addEventListener('click', (e) => {
      e.stopPropagation();
      this.togglePause();
    });

    // Keyboard bindings
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') {
          e.preventDefault();
          this.togglePause();
        }
      }

      if (e.code === 'KeyR' && this.state === 'gameover') {
        e.preventDefault();
        this.startMatch();
      }

      if (e.code === 'KeyM') {
        const isMuted = this.audio.toggleMute();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Touch & pointer controls: each finger slides its paddle from wherever it lands,
    // so the paddle never jumps and the thumb never has to sit on top of the action.
    const bindZone = (zone, getPaddle) => {
      zone.addEventListener('pointerdown', (e) => {
        if (this.state !== 'playing') return;
        const paddle = getPaddle();
        paddle.targetY = paddle.y;
        paddle.drag = { id: e.pointerId, last: this.fingerPos(e) };
      });

      zone.addEventListener('pointermove', (e) => {
        const paddle = getPaddle();
        if (!paddle.drag || paddle.drag.id !== e.pointerId) return;
        const pos = this.fingerPos(e);
        paddle.targetY += (pos - paddle.drag.last) * this.touchGain;
        paddle.targetY = Math.max(this.topBound, Math.min(this.bottomBound - paddle.h, paddle.targetY));
        paddle.drag.last = pos;
      });

      const release = (e) => {
        const paddle = getPaddle();
        if (paddle.drag && paddle.drag.id === e.pointerId) paddle.drag = null;
      };
      zone.addEventListener('pointerup', release);
      zone.addEventListener('pointercancel', release);
    };

    // In 1P mode, a finger anywhere on screen controls Player 1!
    // In 2P mode, each player owns the half of the screen nearest their paddle!
    bindZone(document.getElementById('touch-p1-zone'), () => this.p1);
    bindZone(document.getElementById('touch-p2-zone'), () => (this.mode === '2p' ? this.p2 : this.p1));

    // Don't let the rally run on while the phone is locked or another app is open
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.togglePause();
    });

    window.addEventListener('resize', () => this.resizeCanvas());
    this.portraitQuery.addEventListener('change', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  // Finger position along the paddle's axis of travel, in court units
  fingerPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return this.isPortrait
      ? e.clientX * (this.height / rect.width)
      : e.clientY * (this.height / rect.height);
  }

  resizeCanvas() {
    this.isPortrait = this.portraitQuery.matches;
    const courtW = this.isPortrait ? this.height : this.width;
    const courtH = this.isPortrait ? this.width : this.height;

    // Size the buffer for the screen so the neon stays sharp on high-density phones
    const cssW = this.canvas.getBoundingClientRect().width || courtW;
    const density = (cssW * (window.devicePixelRatio || 1)) / courtW;
    this.renderScale = Math.max(1, Math.min(1.5, density));
    this.canvas.width = Math.round(courtW * this.renderScale);
    this.canvas.height = Math.round(courtH * this.renderScale);

    // Resizing wipes the canvas, so redraw a paused or finished match
    if (this.state !== 'start') this.render();
  }

  startMatch() {
    this.audio.init();
    this.audio.startMusic();

    this.state = 'playing';
    this.p1Score = 0;
    this.p2Score = 0;
    this.rally = 0;
    this.maxRallyInMatch = 0;
    this.shake = 0;
    this.flashAlpha = 0;

    // Reset paddles
    this.resetPaddle(this.p1);
    this.resetPaddle(this.p2);

    // Reset powerup
    this.powerUp = null;
    this.nextPowerUpRally = 4;

    // Reset balls
    this.balls = [];
    this.serveTimer = 0;
    this.spawnBall(Math.random() > 0.5 ? 1 : -1);

    // Update labels
    this.p1Label.textContent = this.isTouch ? 'PLAYER 1' : 'PLAYER 1 [W/S]';
    if (this.mode === '1p') {
      const diffNames = { easy: 'CASUAL', normal: 'CYBER', hard: 'OVERLORD', impossible: 'INSANE' };
      this.p2Label.textContent = this.isTouch ? 'AI' : `AI [${diffNames[this.difficulty]}]`;
      this.modeTagDisplay.textContent = `1P VS AI (${diffNames[this.difficulty]})`;
    } else {
      this.p2Label.textContent = this.isTouch ? 'PLAYER 2' : 'PLAYER 2 [↑/↓]';
      this.modeTagDisplay.textContent = '2P LOCAL VERSUS';
    }

    this.targetScoreDisplay.textContent = this.targetScore;
    this.bestRallyDisplay.textContent = this.allTimeBestRally;

    // Modals
    this.startScreen.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');

    this.showBanner(this.isTouch ? 'DRAG TO MOVE' : 'MATCH COMMENCED');
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

  resetPaddle(paddle) {
    paddle.h = 96;
    paddle.y = (this.height - paddle.h) / 2;
    paddle.vy = 0;
    paddle.powerTimer = 0;
    paddle.drag = null;
  }

  spawnBall(direction = 1) {
    const baseSpeed = 520;
    const launchAngle = (Math.random() * 0.5 - 0.25) * Math.PI; // -45 deg to +45 deg

    this.balls.push({
      x: this.width / 2,
      y: this.height / 2,
      radius: 9,
      speed: baseSpeed,
      vx: direction * baseSpeed * Math.cos(launchAngle),
      vy: baseSpeed * Math.sin(launchAngle),
      lastHitter: direction > 0 ? this.p2 : this.p1,
      isSmash: false,
      color: direction > 0 ? '#ff007f' : '#00f3ff',
      trail: []
    });
  }

  showBanner(msg) {
    this.banner.textContent = msg;
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.classList.remove('show');
    }, 2000);
  }

  scorePoint(scorer) {
    const isP1 = scorer === this.p1;
    if (isP1) {
      this.p1Score++;
    } else {
      this.p2Score++;
    }

    this.audio.playScore(isP1);
    this.shake = 12;
    this.flashAlpha = 0.4;

    // Update rally records
    if (this.rally > this.maxRallyInMatch) {
      this.maxRallyInMatch = this.rally;
    }
    if (this.rally > this.allTimeBestRally) {
      this.allTimeBestRally = this.rally;
      localStorage.setItem(this.storageKey, this.allTimeBestRally.toString());
    }

    this.rally = 0;
    this.powerUp = null;
    this.nextPowerUpRally = 4;
    this.updateHUD();

    // Check match win
    if (this.p1Score >= this.targetScore || this.p2Score >= this.targetScore) {
      this.endMatch(isP1);
      return;
    }

    // Match point warning
    if (this.p1Score === this.targetScore - 1 || this.p2Score === this.targetScore - 1) {
      this.showBanner('★ MATCH POINT ★');
    }

    // Spawn ball after short delay towards scorer (counted in update so pausing can't lose it)
    this.balls = [];
    this.serveTimer = 0.6;
    this.serveDir = isP1 ? -1 : 1;
  }

  endMatch(isP1Won) {
    this.state = 'gameover';
    this.audio.stopMusic();
    this.audio.playMatchWin();

    if (this.mode === '1p') {
      this.winnerTitle.textContent = isP1Won ? 'VICTORY: PLAYER 1!' : 'DEFEAT: AI WINS!';
      this.winnerTitle.style.color = isP1Won ? 'var(--neon-cyan)' : 'var(--neon-pink)';
      this.winnerSub.textContent = isP1Won ? 'AI Core Overridden' : 'Circuit Dominated by AI';
    } else {
      this.winnerTitle.textContent = isP1Won ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
      this.winnerTitle.style.color = isP1Won ? 'var(--neon-cyan)' : 'var(--neon-pink)';
      this.winnerSub.textContent = 'Versus Match Decided';
    }

    this.resP1Score.textContent = this.p1Score;
    this.resP2Score.textContent = this.p2Score;
    this.resMaxRally.textContent = this.maxRallyInMatch;
    this.resBestRally.textContent = this.allTimeBestRally;

    this.resP1Label.textContent = 'PLAYER 1';
    this.resP2Label.textContent = this.mode === '1p' ? 'AI OPPONENT' : 'PLAYER 2';

    this.gameoverScreen.classList.add('active');
    this.updateHUD();
  }

  // ==========================================================================
  // UPDATE LOOP
  // ==========================================================================
  update(dt) {
    if (this.state !== 'playing') return;

    // Decay shake and flash
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 25);
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - dt * 1.5);

    // Update Paddles
    this.updatePlayerPaddles(dt);

    if (this.mode === '1p') {
      this.updateAI(dt);
    }

    // Update Power-ups
    this.updatePowerUp(dt);

    // Serve the next ball
    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) this.spawnBall(this.serveDir);
    }

    // Update Balls
    this.updateBalls(dt);

    // Update Particles
    this.particles.update(dt);

    // Update HUD
    this.updateHUD();
  }

  updatePlayerPaddles(dt) {
    let p1Dir = 0;
    if (this.keys['KeyW']) p1Dir -= 1;
    if (this.keys['KeyS']) p1Dir += 1;
    this.movePaddle(this.p1, p1Dir, dt);

    // 2P Mode: Player 2 keyboard input
    if (this.mode === '2p') {
      let p2Dir = 0;
      if (this.keys['ArrowUp']) p2Dir -= 1;
      if (this.keys['ArrowDown']) p2Dir += 1;
      this.movePaddle(this.p2, p2Dir, dt);
    }
  }

  movePaddle(paddle, dir, dt) {
    const minY = this.topBound;
    const maxY = this.bottomBound - paddle.h;

    if (paddle.drag && dir === 0) {
      const prevY = paddle.y;
      paddle.y = Math.max(minY, Math.min(maxY, paddle.targetY));

      // Finger speed becomes paddle speed, so touch players can smash and add spin too
      const fingerVy = dt > 0 ? (paddle.y - prevY) / dt : 0;
      paddle.vy += (fingerVy - paddle.vy) * 0.5;
      paddle.vy = Math.max(-paddle.speed, Math.min(paddle.speed, paddle.vy));
    } else {
      paddle.vy = dir * paddle.speed;
      paddle.y += paddle.vy * dt;
      paddle.y = Math.max(minY, Math.min(maxY, paddle.y));
    }

    // Power-up duration countdown
    if (paddle.powerTimer > 0) {
      paddle.powerTimer -= dt;
      if (paddle.powerTimer <= 0) paddle.h = 96;
    }
  }

  // AI Logic with multiple distinct difficulty tiers
  updateAI(dt) {
    const ai = this.p2;
    if (this.balls.length === 0) return;

    // Find the primary ball approaching the AI
    let activeBall = this.balls[0];
    for (const b of this.balls) {
      if (b.vx > 0) {
        activeBall = b;
        break;
      }
    }

    let targetY = (this.height - ai.h) / 2;
    let aiSpeed = ai.speed;

    switch (this.difficulty) {
      case 'easy':
        // Reacts late, slow speed, high jitter error
        aiSpeed = 360;
        if (activeBall.vx > 0 && activeBall.x > this.width * 0.45) {
          targetY = activeBall.y - ai.h / 2 + Math.sin(performance.now() * 0.003) * 35;
        }
        break;

      case 'normal':
        // Standard balanced AI with trajectory tracking
        aiSpeed = 500;
        if (activeBall.vx > 0) {
          targetY = activeBall.y - ai.h / 2;
        } else {
          targetY = (this.height - ai.h) / 2;
        }
        break;

      case 'hard':
        // Advanced AI: predicts bounce point and attempts edge slices
        aiSpeed = 620;
        if (activeBall.vx > 0) {
          const predictedY = this.predictBallY(activeBall, ai.x);
          // Aim to slice with edge
          const sliceOffset = (activeBall.y > this.height / 2 ? -28 : 28);
          targetY = predictedY - ai.h / 2 + sliceOffset;
        } else {
          targetY = (this.height - ai.h) / 2;
        }
        break;

      case 'impossible':
        // Maximum speed & precision calculation
        aiSpeed = 780;
        if (activeBall.vx > 0) {
          const predictedY = this.predictBallY(activeBall, ai.x);
          targetY = predictedY - ai.h / 2;
        }
        break;
    }

    // Smooth movement towards target
    const diff = targetY - ai.y;
    if (Math.abs(diff) > 4) {
      const step = Math.sign(diff) * Math.min(Math.abs(diff), aiSpeed * dt);
      ai.y += step;
      ai.vy = step / dt;
    } else {
      ai.vy = 0;
    }

    ai.y = Math.max(this.topBound, Math.min(this.bottomBound - ai.h, ai.y));

    if (ai.powerTimer > 0) {
      ai.powerTimer -= dt;
      if (ai.powerTimer <= 0) ai.h = 96;
    }
  }

  // Trajectory prediction for AI
  predictBallY(ball, targetX) {
    if (ball.vx <= 0) return this.height / 2;

    const timeToReach = (targetX - ball.x) / ball.vx;
    let futureY = ball.y + ball.vy * timeToReach;

    // Simulate wall bounces
    const playableH = this.bottomBound - this.topBound;
    let normalized = (futureY - this.topBound) % (2 * playableH);
    if (normalized < 0) normalized += 2 * playableH;

    if (normalized > playableH) {
      normalized = 2 * playableH - normalized;
    }

    return this.topBound + normalized;
  }

  updateBalls(dt) {
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];

      // Record trail positions
      b.trail.unshift({ x: b.x, y: b.y, color: b.color });
      if (b.trail.length > (b.isSmash ? 14 : 7)) b.trail.pop();

      // Move ball
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Top / Bottom Wall Collision
      if (b.y - b.radius <= this.topBound) {
        b.y = this.topBound + b.radius;
        b.vy = Math.abs(b.vy);
        this.audio.playWallHit();
        this.particles.emit(b.x, this.topBound, 8, '#ffffff', 140, 0.25);
      } else if (b.y + b.radius >= this.bottomBound) {
        b.y = this.bottomBound - b.radius;
        b.vy = -Math.abs(b.vy);
        this.audio.playWallHit();
        this.particles.emit(b.x, this.bottomBound, 8, '#ffffff', 140, 0.25);
      }

      // Check Paddle Collisions (P1 & P2)
      this.checkPaddleCollision(b, this.p1);
      this.checkPaddleCollision(b, this.p2);

      // Check Power-up Collision
      if (this.powerUp) {
        const dist = Math.hypot(b.x - this.powerUp.x, b.y - this.powerUp.y);
        if (dist < b.radius + this.powerUp.radius) {
          this.activatePowerUp(this.powerUp.type, b.lastHitter);
          this.powerUp = null;
        }
      }

      // Out of Bounds / Goal
      if (b.x < -20) {
        // Point for P2 / AI
        this.particles.emit(0, b.y, 25, '#ff007f', 300, 0.6);
        this.scorePoint(this.p2);
        return;
      } else if (b.x > this.width + 20) {
        // Point for P1
        this.particles.emit(this.width, b.y, 25, '#00f3ff', 300, 0.6);
        this.scorePoint(this.p1);
        return;
      }
    }
  }

  checkPaddleCollision(b, paddle) {
    const isP1 = paddle.isP1;

    // Check X overlap
    const paddleLeft = paddle.x;
    const paddleRight = paddle.x + paddle.w;
    const paddleTop = paddle.y;
    const paddleBottom = paddle.y + paddle.h;

    const ballInX = isP1 
      ? (b.x - b.radius <= paddleRight && b.x + b.radius >= paddleLeft && b.vx < 0)
      : (b.x + b.radius >= paddleLeft && b.x - b.radius <= paddleRight && b.vx > 0);

    if (ballInX && b.y >= paddleTop - 6 && b.y <= paddleBottom + 6) {
      // Reposition ball outside paddle
      b.x = isP1 ? paddleRight + b.radius : paddleLeft - b.radius;

      // Hit calculation: offset from center (-1 to +1)
      const hitOffset = (b.y - (paddleTop + paddle.h / 2)) / (paddle.h / 2);
      const clampedOffset = Math.max(-0.95, Math.min(0.95, hitOffset));

      // Calculate deflection angle (max 68 degrees)
      const maxAngle = Math.PI * 0.38;
      const angle = clampedOffset * maxAngle;

      // Increment Rally & Speed
      this.rally++;
      b.speed = Math.min(1050, b.speed * 1.03); // accelerate ball 3% on each hit

      // Check Smash condition (fast paddle movement aligned with edge slice)
      const isSmash = Math.abs(paddle.vy) > 300 && Math.abs(clampedOffset) > 0.45;
      if (isSmash) {
        b.speed = Math.min(1150, b.speed * 1.15);
        b.isSmash = true;
        this.shake = 8;
        this.showBanner('★ HYPER SMASH ★');
        this.particles.emitSmashBurst(b.x, b.y, paddle.color);
      } else {
        b.isSmash = false;
      }

      // Compute new velocities with spin
      const dir = isP1 ? 1 : -1;
      b.vx = dir * b.speed * Math.cos(angle);
      b.vy = b.speed * Math.sin(angle) + paddle.vy * 0.22; // Momentum transfer
      b.lastHitter = paddle;
      b.color = paddle.color;

      // Sound & Particles
      this.audio.playPaddleHit(clampedOffset, isSmash);
      this.particles.emit(b.x, b.y, isSmash ? 18 : 10, paddle.color, 200, 0.35);

      // Check power-up spawn
      if (this.rally >= this.nextPowerUpRally && !this.powerUp) {
        this.spawnPowerUp();
        this.nextPowerUpRally = this.rally + Math.floor(Math.random() * 5 + 5);
      }
    }
  }

  // ==========================================================================
  // POWER-UPS
  // ==========================================================================
  spawnPowerUp() {
    const types = ['turbo', 'expand', 'multiball'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    this.powerUp = {
      x: this.width / 2 + (Math.random() * 200 - 100),
      y: 120 + Math.random() * (this.height - 240),
      radius: 18,
      type: chosenType,
      life: 14 // exists for 14 seconds
    };
  }

  activatePowerUp(type, recipient) {
    this.audio.playPowerup();
    this.particles.emit(this.powerUp.x, this.powerUp.y, 25, '#ffe600', 250, 0.5);

    switch (type) {
      case 'expand':
        recipient.h = 145; // 50% larger!
        recipient.powerTimer = 10;
        this.showBanner(`${recipient.isP1 ? 'P1' : 'P2'} PADDLE EXPANDED`);
        break;

      case 'turbo':
        if (this.balls.length > 0) {
          const ball = this.balls[0];
          ball.speed *= 1.35;
          ball.isSmash = true;
          this.showBanner('⚡ TURBO BALL ACTIVE');
        }
        break;

      case 'multiball':
        this.spawnBall(recipient.isP1 ? 1 : -1);
        this.showBanner('✦ MULTI-BALL ENGAGED');
        break;
    }
  }

  updatePowerUp(dt) {
    if (!this.powerUp) return;
    this.powerUp.life -= dt;
    if (this.powerUp.life <= 0) {
      this.powerUp = null;
    }
  }

  updateHUD() {
    if (this.p1ScoreDisplay) this.p1ScoreDisplay.textContent = this.p1Score;
    if (this.p2ScoreDisplay) this.p2ScoreDisplay.textContent = this.p2Score;
    if (this.rallyDisplay) this.rallyDisplay.textContent = this.rally;
    if (this.bestRallyDisplay) this.bestRallyDisplay.textContent = Math.max(this.rally, this.allTimeBestRally);
  }

  // ==========================================================================
  // RENDER PIPELINE
  // ==========================================================================
  render() {
    const { ctx, width, height, renderScale: s } = this;

    ctx.save();

    // Everything below draws in court units. Portrait maps the court's left edge to
    // the bottom of the phone, which puts Player 1 under the player's thumb.
    if (this.isPortrait) {
      ctx.setTransform(0, -s, s, 0, 0, width * s);
    } else {
      ctx.setTransform(s, 0, 0, s, 0, 0);
    }

    // Camera Shake
    if (this.shake > 0) {
      const ox = (Math.random() - 0.5) * this.shake;
      const oy = (Math.random() - 0.5) * this.shake;
      ctx.translate(ox, oy);
    }

    // Clear Canvas
    ctx.fillStyle = '#05020c';
    ctx.fillRect(0, 0, width, height);

    // Draw Arena Grid & Center Line
    this.renderArena(ctx);

    // Draw Power-Up
    if (this.powerUp) {
      this.renderPowerUp(ctx);
    }

    // Draw Particles
    this.particles.render(ctx);

    // Draw Paddles
    this.renderPaddle(ctx, this.p1);
    this.renderPaddle(ctx, this.p2);

    // Draw Balls
    this.renderBalls(ctx);

    // Screen flash overlay
    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    ctx.restore();
  }

  renderArena(ctx) {
    const { width, height } = this;

    // Glowing Arena Borders
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 243, 255, 0.5)';
    ctx.shadowBlur = 12;

    // Top border
    ctx.beginPath();
    ctx.moveTo(0, this.topBound);
    ctx.lineTo(width, this.topBound);
    ctx.stroke();

    // Bottom border
    ctx.beginPath();
    ctx.moveTo(0, this.bottomBound);
    ctx.lineTo(width, this.bottomBound);
    ctx.stroke();

    // Center Dashed Dividing Net
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(width / 2, this.topBound);
    ctx.lineTo(width / 2, this.bottomBound);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Center Court Glowing Ring
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, 75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  renderPaddle(ctx, paddle) {
    ctx.save();
    ctx.fillStyle = paddle.color;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = paddle.color;
    ctx.shadowBlur = paddle.powerTimer > 0 ? 25 : 15;

    // Rounded rectangle paddle
    const r = 4;
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, r);
    ctx.fill();
    ctx.stroke();

    // Inner glowing core
    ctx.fillStyle = '#fff';
    ctx.fillRect(paddle.x + paddle.w / 2 - 1.5, paddle.y + 10, 3, paddle.h - 20);

    ctx.restore();
  }

  renderBalls(ctx) {
    for (const b of this.balls) {
      // Draw motion trail
      for (let i = 0; i < b.trail.length; i++) {
        const t = b.trail[i];
        const alpha = (1 - (i + 1) / b.trail.length) * 0.45;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = t.color;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(t.x, t.y, b.radius * (1 - i * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Main Ball
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = b.isSmash ? 30 : 16;

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
  }

  renderPowerUp(ctx) {
    const p = this.powerUp;
    const time = performance.now() * 0.005;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(time);

    ctx.strokeStyle = '#ffe600';
    ctx.fillStyle = 'rgba(255, 230, 0, 0.2)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 20;

    // Diamond polygon
    ctx.beginPath();
    ctx.moveTo(0, -p.radius);
    ctx.lineTo(p.radius, 0);
    ctx.lineTo(0, p.radius);
    ctx.lineTo(-p.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Center icon
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.rotate(-time + (this.isPortrait ? Math.PI / 2 : 0)); // keep the icon upright
    const icon = p.type === 'turbo' ? '⚡' : (p.type === 'expand' ? '⬡' : '✦');
    ctx.fillText(icon, 0, 0);

    ctx.restore();
  }

  loop(currentTime) {
    if (this.state !== 'playing') return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.pongGame = new NeonPong();
});
