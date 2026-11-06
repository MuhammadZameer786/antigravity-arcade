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
// ONLINE VERSUS SETTINGS (see the ONLINE VERSUS section of NeonPong)
// ============================================================================
const NET_PADDLE_SEND_SECONDS = 1 / 30; // How often your paddle position goes to the rival
const NET_PING_SECONDS = 2;             // How often the trip time to the rival is measured
const NET_MAX_LEAD_SECONDS = 0.2;       // Most a received ball is moved on to make up for its trip
const NET_HOLD_MARGIN = 24;             // How near the rival's paddle a ball waits for their verdict
const NET_GLIDE_LIMIT = 160;            // Bigger corrections than this jump instead of gliding
const NET_MAX_CATCH_UP_SECONDS = 1;     // Longest stall an online game makes up for in one frame
const MAX_STEP_SECONDS = 0.05;          // Longest single update step, so the ball can't skip a paddle
const NET_QUEUED_KINDS = ['setup', 'serve', 'hit', 'orb', 'collect', 'point', 'miss'];
const POWER_UP_TYPES = ['turbo', 'expand', 'multiball'];

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
    this.mode = '1p'; // '1p', '2p' or 'online'
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

    // Online versus: each device always plays the left paddle (p1)
    this.lobby = null;          // ArcadeLobby, built the first time someone goes online
    this.isHost = false;        // The room's creator keeps score, serves and drops power-ups
    this.rivalPad = null;       // The rival's latest paddle report
    this.netLatency = 0.05;     // One-way trip to the rival in seconds, measured during play
    this.latencyMeasured = false;
    this.padSendTimer = 0;
    this.pingTimer = 0;
    this.lastPadSent = '';
    this.ballSerial = 0;
    this.onlineStarted = false; // False during the countdown, when early messages wait in a queue
    this.pendingRelay = [];

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

    this.netStatus = document.getElementById('net-status');
    this.startLabel = document.getElementById('start-label');
    this.lengthTitle = document.getElementById('length-title');
    this.rematchBtn = document.getElementById('btn-restart');
    this.rematchLabel = document.getElementById('rematch-label');
  }

  bindEvents() {
    // Mode toggles
    const modeButtons = document.querySelectorAll('#mode-group .toggle-btn');
    const diffGroup = document.getElementById('difficulty-group');
    const p2ControlRow = document.getElementById('p2-control-row');

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        this.mode = btn.dataset.mode;
        modeButtons.forEach((b) => b.classList.toggle('active', b === btn));
        diffGroup.style.display = this.mode === '1p' ? 'block' : 'none';
        p2ControlRow.style.opacity = this.mode === '2p' ? '1' : '0.5';
        this.startLabel.textContent = this.mode === 'online' ? 'FIND A RIVAL' : 'START MATCH';
        this.lengthTitle.textContent = this.mode === 'online'
          ? 'MATCH LENGTH (ROOM CREATOR DECIDES)'
          : 'MATCH LENGTH (FIRST TO)';
      });
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
        this.setTargetScore(parseInt(e.currentTarget.dataset.pts, 10));
      });
    });

    // Start / Restart / Pause buttons
    document.getElementById('btn-start').addEventListener('click', () => {
      if (this.mode === 'online') this.openLobby();
      else this.startMatch();
    });
    this.rematchBtn.addEventListener('click', () => this.rematch());
    document.getElementById('btn-menu').addEventListener('click', () => this.backToMenu());
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
      // Typing a room code shouldn't mute the game or start a rematch
      if (e.target instanceof HTMLInputElement) return;

      this.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') {
          e.preventDefault();
          this.togglePause();
        }
      }

      if (e.code === 'KeyR' && this.state === 'gameover') {
        e.preventDefault();
        this.rematch();
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

    // Don't let the rally run on while the phone is locked or another app is open.
    // Online matches can't pause; the room forfeits a player who stays away too long.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing' && this.mode !== 'online') this.togglePause();
    });

    // Closing the page tells the rival at once, instead of after the reconnect grace period
    window.addEventListener('pagehide', () => {
      if (this.lobby) this.lobby.leave();
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
    if (this.mode === 'online') {
      this.resetOnlineMatch();
    } else {
      this.spawnBall(Math.random() > 0.5 ? 1 : -1);
    }

    // Update labels
    this.p1Label.textContent = this.isTouch ? 'PLAYER 1' : 'PLAYER 1 [W/S]';
    if (this.mode === '1p') {
      const diffNames = { easy: 'CASUAL', normal: 'CYBER', hard: 'OVERLORD', impossible: 'INSANE' };
      this.p2Label.textContent = this.isTouch ? 'AI' : `AI [${diffNames[this.difficulty]}]`;
      this.modeTagDisplay.textContent = `1P VS AI (${diffNames[this.difficulty]})`;
    } else if (this.mode === 'online') {
      this.p1Label.textContent = this.isTouch ? 'YOU' : 'YOU [W/S ↑/↓]';
      this.p2Label.textContent = 'RIVAL';
      this.modeTagDisplay.textContent = `ONLINE VERSUS // ROOM ${this.lobby.room.code}`;
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

    // Anything the rival sent while this side was still counting down
    if (this.mode === 'online') {
      this.onlineStarted = true;
      this.pendingRelay.splice(0).forEach((d) => this.handleRivalData(d));
    }
  }

  rematch() {
    if (this.mode === 'online') {
      if (this.lobby) this.lobby.requestRematch();
    } else {
      this.startMatch();
    }
  }

  backToMenu() {
    if (this.mode === 'online') this.leaveOnline();
    this.state = 'start';
    this.audio.stopMusic();
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');
    this.startScreen.classList.add('active');
  }

  setTargetScore(points) {
    this.targetScore = points;
    document.querySelectorAll('.pts-btn').forEach((b) => {
      b.classList.toggle('active', parseInt(b.dataset.pts, 10) === points);
    });
    this.targetScoreDisplay.textContent = points;
  }

  togglePause() {
    if (this.mode === 'online') return;
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

    const ball = {
      // Odd and even ids, so the two devices in an online match never pick the same one
      id: this.ballSerial++ * 2 + (this.isHost ? 0 : 1),
      x: this.width / 2,
      y: this.height / 2,
      radius: 9,
      speed: baseSpeed,
      vx: direction * baseSpeed * Math.cos(launchAngle),
      vy: baseSpeed * Math.sin(launchAngle),
      lastHitter: direction > 0 ? this.p2 : this.p1,
      isSmash: false,
      color: direction > 0 ? '#ff007f' : '#00f3ff',
      trail: [],
      ...this.netBallState(true)
    };
    this.balls.push(ball);
    return ball;
  }

  // Launches the next rally's ball, and online sends it to the rival too
  serve(direction) {
    const ball = this.spawnBall(direction);
    if (this.mode === 'online') this.relay({ k: 'serve', ball: this.packBall(ball) });
  }

  showBanner(msg) {
    this.banner.textContent = msg;
    this.banner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      this.banner.classList.remove('show');
    }, 2000);
  }

  // Online, only the host runs this; the guest hears about the point from the host
  scorePoint(scorer, y = this.height / 2) {
    const isP1 = scorer === this.p1;
    if (isP1) {
      this.p1Score++;
    } else {
      this.p2Score++;
    }

    if (this.mode === 'online') {
      this.relay({ k: 'point', by: isP1 ? 'host' : 'guest', h: this.p1Score, g: this.p2Score, y: Math.round(y) });
    }

    if (this.settlePoint(isP1)) {
      // Spawn ball after short delay towards scorer (counted in update so pausing can't lose it)
      this.serveTimer = 0.6;
      this.serveDir = isP1 ? -1 : 1;
    }
  }

  // Everything a point does besides the score itself. Returns false if it ended the match.
  settlePoint(isP1) {
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
      return false;
    }

    // Match point warning
    if (this.p1Score === this.targetScore - 1 || this.p2Score === this.targetScore - 1) {
      this.showBanner('★ MATCH POINT ★');
    }

    this.balls = [];
    return true;
  }

  endMatch(isP1Won) {
    if (this.mode === 'online') {
      this.awaitOnlineResult(isP1Won);
      return;
    }

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
    } else if (this.mode === 'online') {
      this.updateRivalPaddle(dt);
      this.updateNetSync(dt);
    }

    // Update Power-ups
    this.updatePowerUp(dt);

    // Serve the next ball
    if (this.serveTimer > 0) {
      this.serveTimer -= dt;
      if (this.serveTimer <= 0) this.serve(this.serveDir);
    }

    // Update Balls
    this.updateBalls(dt);

    // Update Particles
    this.particles.update(dt);

    // Update HUD
    this.updateHUD();
  }

  updatePlayerPaddles(dt) {
    // Online you're the only player at this keyboard, so the arrows work too
    const arrowsToo = this.mode === 'online';
    let p1Dir = 0;
    if (this.keys['KeyW'] || (arrowsToo && this.keys['ArrowUp'])) p1Dir -= 1;
    if (this.keys['KeyS'] || (arrowsToo && this.keys['ArrowDown'])) p1Dir += 1;
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
    const online = this.mode === 'online';

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];

      // Online corrections glide in rather than making the ball jump
      if (b.ox || b.oy) {
        const fade = Math.exp(-dt * 14);
        b.ox = Math.abs(b.ox) > 0.5 ? b.ox * fade : 0;
        b.oy = Math.abs(b.oy) > 0.5 ? b.oy * fade : 0;
      }

      // Record trail positions
      b.trail.unshift({ x: b.x + b.ox, y: b.y + b.oy, color: b.color });
      if (b.trail.length > (b.isSmash ? 14 : 7)) b.trail.pop();

      // Waiting at the rival's end to hear whether they hit it
      if (b.held) continue;

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

      // Check Paddle Collisions (P1 & P2). Online, the rival's device decides their hits.
      this.checkPaddleCollision(b, this.p1);
      if (online) {
        this.holdAtRivalEnd(b);
      } else {
        this.checkPaddleCollision(b, this.p2);
      }

      // Check Power-up Collision. Online, only the device that launched the ball checks.
      if (this.powerUp && (!online || b.local)) {
        const dist = Math.hypot(b.x - this.powerUp.x, b.y - this.powerUp.y);
        if (dist < b.radius + this.powerUp.radius) {
          const type = this.powerUp.type;
          const extraBall = this.activatePowerUp(type, b.lastHitter, b);
          this.powerUp = null;
          if (online) this.sendPowerUp(type, b, extraBall);
        }
      }

      // Out of Bounds / Goal
      if (b.x < -20) {
        // Point for P2 / AI
        this.particles.emit(0, b.y, 25, '#ff007f', 300, 0.6);
        if (online && !this.isHost) {
          this.reportMiss(i);
          continue;
        }
        this.scorePoint(this.p2, b.y);
        return;
      } else if (b.x > this.width + 20) {
        // Point for P1 (never online: the ball waits at the goal line for the rival's word)
        this.particles.emit(this.width, b.y, 25, '#00f3ff', 300, 0.6);
        this.scorePoint(this.p1, b.y);
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

      // Online, this device now owns the ball's flight until the rival answers it
      if (this.mode === 'online') {
        b.local = true;
        b.passing = false;
        this.relay({
          k: 'hit',
          ball: this.packBall(b),
          rally: this.rally,
          offset: Math.round(clampedOffset * 100) / 100,
          smash: isSmash
        });
      }

      this.maybeSpawnPowerUp();
    }
  }

  // Online, only the host drops power-ups, so both courts get the same one
  maybeSpawnPowerUp() {
    if (this.mode === 'online' && !this.isHost) return;
    if (this.rally >= this.nextPowerUpRally && !this.powerUp) {
      this.spawnPowerUp();
      this.nextPowerUpRally = this.rally + Math.floor(Math.random() * 5 + 5);
      if (this.mode === 'online') {
        const { x, y, type } = this.powerUp;
        this.relay({ k: 'orb', x: Math.round(x), y: Math.round(y), type });
      }
    }
  }

  // ==========================================================================
  // POWER-UPS
  // ==========================================================================
  spawnPowerUp() {
    const chosenType = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    this.powerUp = {
      x: this.width / 2 + (Math.random() * 200 - 100),
      y: 120 + Math.random() * (this.height - 240),
      radius: 18,
      type: chosenType,
      life: 14 // exists for 14 seconds
    };
  }

  // The ball is the one that collected it. Returns the extra ball a multi-ball adds.
  activatePowerUp(type, recipient, ball) {
    this.audio.playPowerup();
    this.particles.emit(this.powerUp.x, this.powerUp.y, 25, '#ffe600', 250, 0.5);
    this.showBanner(this.powerUpBanner(type, recipient));

    switch (type) {
      case 'expand':
        recipient.h = 145; // 50% larger!
        recipient.powerTimer = 10;
        break;

      case 'turbo':
        ball.speed *= 1.35;
        ball.isSmash = true;
        break;

      case 'multiball':
        return this.spawnBall(recipient.isP1 ? 1 : -1);
    }
    return null;
  }

  powerUpBanner(type, recipient) {
    if (type === 'turbo') return '⚡ TURBO BALL ACTIVE';
    if (type === 'multiball') return '✦ MULTI-BALL ENGAGED';
    if (this.mode === 'online') return recipient.isP1 ? 'YOUR PADDLE EXPANDED' : 'RIVAL PADDLE EXPANDED';
    return `${recipient.isP1 ? 'P1' : 'P2'} PADDLE EXPANDED`;
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
      ctx.arc(b.x + b.ox, b.y + b.oy, b.radius, 0, Math.PI * 2);
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

  // ==========================================================================
  // ONLINE VERSUS
  // Both devices run the court with their own paddle on the left, and send
  // each other what they see mirrored. Between hits a ball flies in straight
  // lines, so the devices only trade the moments that change it: each device
  // decides the hits on its own paddle, and the room's creator (the host)
  // keeps the score, serves and drops power-ups. Your own hits are never
  // second-guessed. The rival's arrive a network trip late and are moved on
  // by that trip, so both courts show the ball in the same place.
  // ==========================================================================
  openLobby() {
    this.startScreen.classList.remove('active');

    // Built on first use, so the other modes never depend on the shared scripts
    if (!this.lobby) {
      this.lobby = new ArcadeLobby({
        mount: document.getElementById('game-container'),
        classes: {
          overlay: 'game-modal',
          box: 'modal-card',
          title: 'gameover-title',
          primaryButton: 'neon-btn primary-btn',
          secondaryButton: 'neon-btn secondary-btn'
        },
        rules: 'YOU PLAY CYAN // NO PAUSING ONLINE',
        rematchButton: this.rematchBtn,
        rematchLabel: this.rematchLabel,
        onGesture: () => this.audio.init(),
        onCountdown: () => this.prepareOnlineMatch(),
        onStart: () => this.startMatch(),
        onRelay: (data) => this.handleRivalData(data),
        onStatus: (text) => this.setNetStatus(text),
        onResult: (won, reason) => this.showOnlineResult(won, reason),
        onBack: () => {
          this.leaveOnline();
          this.startScreen.classList.add('active');
        }
      });
    }
    this.lobby.open();
  }

  prepareOnlineMatch() {
    this.state = 'countdown';
    this.onlineStarted = false;
    this.pendingRelay = [];
    document.body.classList.add('online-match');
    this.gameoverScreen.classList.remove('active');
    this.setNetStatus('');
  }

  // Called from startMatch once the countdown ends
  resetOnlineMatch() {
    this.isHost = this.lobby.room.slot === 0;
    this.ballSerial = 0;
    this.rivalPad = null;
    this.padSendTimer = 0;
    this.pingTimer = 0;
    this.lastPadSent = '';

    if (this.isHost) {
      this.relay({ k: 'setup', target: this.targetScore });
      this.serveTimer = 0.8;
      this.serveDir = Math.random() > 0.5 ? 1 : -1;
    }
  }

  leaveOnline() {
    if (this.lobby) this.lobby.leave();
    this.onlineStarted = false;
    this.pendingRelay = [];
    document.body.classList.remove('online-match');
    this.setNetStatus('');
  }

  setNetStatus(text) {
    this.netStatus.textContent = text;
    this.netStatus.classList.toggle('show', text !== '');
  }

  // Volatile messages are dropped, not queued, while either player is offline
  relay(data, volatile = false) {
    if (this.lobby && this.lobby.room) this.lobby.room.relay(data, { volatile });
  }

  // Ball fields only online play reads, kept on every ball so the court code needn't check
  netBallState(local) {
    return {
      local,          // This device launched the ball's current flight
      held: false,    // Waiting at the rival's end for their hit or miss
      passing: false, // Already past the rival's paddle on this screen
      ox: 0,          // Drawing offset that glides away after a correction
      oy: 0
    };
  }

  // In this device's view of the court; the receiver mirrors it
  packBall(b) {
    const r = (v) => Math.round(v * 10) / 10;
    return {
      id: b.id,
      x: r(b.x),
      y: r(b.y),
      vx: r(b.vx),
      vy: r(b.vy),
      speed: r(b.speed),
      smash: b.isSmash,
      mine: b.lastHitter === this.p1
    };
  }

  isBallState(s) {
    return Boolean(s) && Number.isInteger(s.id) && [s.x, s.y, s.vx, s.vy, s.speed].every(Number.isFinite);
  }

  // Takes a ball as the rival's device launched it: mirrored onto this side of
  // the court and moved on by the time the message spent travelling. Updates
  // the ball with the same id, or adds it when create is set.
  adoptBall(s, create = false) {
    if (!this.isBallState(s)) return null;
    let b = this.balls.find((ball) => ball.id === s.id);
    if (!b && !create) return null;

    const lastHitter = s.mine ? this.p2 : this.p1;
    const next = {
      radius: 9,
      x: this.width - s.x,
      y: s.y,
      vx: -s.vx,
      vy: s.vy,
      speed: s.speed,
      isSmash: Boolean(s.smash),
      lastHitter,
      color: lastHitter.color
    };
    this.advanceBall(next, Math.min(this.netLatency, NET_MAX_LEAD_SECONDS));

    if (b) {
      // Glide from where the ball was drawn rather than jumping
      const ox = b.x + b.ox - next.x;
      const oy = b.y + b.oy - next.y;
      const glide = Math.hypot(ox, oy) < NET_GLIDE_LIMIT ? { ox, oy } : {};
      Object.assign(b, next, this.netBallState(false), glide);
    } else {
      b = { id: s.id, trail: [], ...next, ...this.netBallState(false) };
      this.balls.push(b);
    }
    return b;
  }

  // Straight-line flight with wall bounces, to catch a ball up after its trip
  advanceBall(b, seconds) {
    const top = this.topBound + b.radius;
    const span = this.bottomBound - b.radius - top;
    const travel = (b.y + b.vy * seconds - top) / span;
    const bounces = Math.floor(travel);
    const along = (travel - bounces) * span;

    b.x += b.vx * seconds;
    if (bounces % 2 === 0) {
      b.y = top + along;
    } else {
      b.y = top + span - along;
      b.vy = -b.vy;
    }
  }

  // The rival's device decides their hits. Until it says, a ball waits where it
  // meets their paddle, or at their goal line once it's clearly past, so it
  // never runs on ahead of what really happened over there.
  holdAtRivalEnd(b) {
    if (b.vx <= 0) return;
    const p = this.p2;
    const face = p.x - b.radius;

    if (!b.passing && b.x >= face) {
      if (b.y >= p.y - NET_HOLD_MARGIN && b.y <= p.y + p.h + NET_HOLD_MARGIN) {
        b.x = face;
        b.held = true;
        return;
      }
      b.passing = true;
    }
    if (b.x > this.width + 20) {
      b.x = this.width + 20;
      b.held = true;
    }
  }

  // The guest only reports its misses; the host keeps the score
  reportMiss(index) {
    const [ball] = this.balls.splice(index, 1);
    this.relay({ k: 'miss', id: ball.id });
  }

  sendPowerUp(type, ball, extraBall) {
    this.relay({
      k: 'collect',
      type,
      ball: this.packBall(ball),
      extra: extraBall ? this.packBall(extraBall) : null
    });
  }

  updateRivalPaddle(dt) {
    const p = this.p2;
    if (p.powerTimer > 0) p.powerTimer -= dt;

    const report = this.rivalPad;
    if (!report) return;

    // Reports are a trip old, so lead them by the way the paddle was moving
    p.h = report.h;
    const lead = Math.min(this.netLatency, NET_MAX_LEAD_SECONDS);
    const target = Math.max(this.topBound, Math.min(this.bottomBound - p.h, report.y + report.vy * lead));
    const prevY = p.y;
    p.y += (target - p.y) * Math.min(1, dt * 20);
    p.vy = dt > 0 ? (p.y - prevY) / dt : 0;
  }

  updateNetSync(dt) {
    this.pingTimer -= dt;
    if (this.pingTimer <= 0) {
      this.pingTimer = NET_PING_SECONDS;
      this.relay({ k: 'ping', t: performance.now() }, true);
      this.lastPadSent = ''; // Resend the paddle now and then, in case a report was dropped
    }

    this.padSendTimer -= dt;
    if (this.padSendTimer <= 0) {
      this.padSendTimer = NET_PADDLE_SEND_SECONDS;
      const pad = { k: 'pad', y: Math.round(this.p1.y * 10) / 10, vy: Math.round(this.p1.vy), h: this.p1.h };
      const key = `${pad.y}|${pad.vy}|${pad.h}`;
      if (key !== this.lastPadSent) {
        this.lastPadSent = key;
        this.relay(pad, true);
      }
    }
  }

  measureLatency(sentAt) {
    const oneWay = Math.max(0, (performance.now() - sentAt) / 2000);
    if (oneWay > 2) return; // An echo held up by a reconnect says nothing about play
    this.netLatency = this.latencyMeasured ? this.netLatency * 0.75 + oneWay * 0.25 : oneWay;
    this.latencyMeasured = true;
  }

  handleRivalData(d) {
    if (!d || typeof d.k !== 'string') return;

    // Play that beats this side's countdown waits for it; play after the match is ignored
    if (NET_QUEUED_KINDS.includes(d.k)) {
      if (!this.onlineStarted) {
        if (this.lobby && this.lobby.matchActive) this.pendingRelay.push(d);
        return;
      }
      if (this.state !== 'playing') return;
    }

    switch (d.k) {
      case 'pad':
        if ([d.y, d.vy, d.h].every(Number.isFinite)) {
          this.rivalPad = { y: d.y, vy: d.vy, h: Math.max(40, Math.min(200, d.h)) };
        }
        break;
      case 'ping':
        this.relay({ k: 'pong', t: d.t }, true);
        break;
      case 'pong':
        if (Number.isFinite(d.t)) this.measureLatency(d.t);
        break;
      case 'setup':
        if (!this.isHost && [5, 7, 11].includes(d.target)) this.setTargetScore(d.target);
        break;
      case 'serve':
        if (!this.isHost) this.adoptBall(d.ball, true);
        break;
      case 'hit':
        this.applyRivalHit(d);
        break;
      case 'miss':
        if (this.isHost) this.applyRivalMiss(d);
        break;
      case 'point':
        if (!this.isHost) this.applyHostPoint(d);
        break;
      case 'orb':
        if (!this.isHost) this.applyHostOrb(d);
        break;
      case 'collect':
        this.applyRivalPowerUp(d);
        break;
    }
  }

  applyRivalHit(d) {
    const b = this.adoptBall(d.ball);
    if (!b) return; // From a rally that's already over

    const y = d.ball.y;
    const isSmash = Boolean(d.smash);
    this.rally = Math.max(this.rally + 1, Number.isInteger(d.rally) ? d.rally : 0);
    this.audio.playPaddleHit(Number.isFinite(d.offset) ? d.offset : 0, isSmash);
    this.particles.emit(this.p2.x, y, isSmash ? 18 : 10, this.p2.color, 200, 0.35);
    if (isSmash) {
      this.shake = 8;
      this.showBanner('★ HYPER SMASH ★');
      this.particles.emitSmashBurst(this.p2.x, y, this.p2.color);
    }
    this.maybeSpawnPowerUp();
  }

  applyRivalMiss(d) {
    const b = this.balls.find((ball) => ball.id === d.id);
    if (!b) return; // From a rally that's already over
    this.particles.emit(this.width, b.y, 25, '#00f3ff', 300, 0.6);
    this.scorePoint(this.p1, b.y);
  }

  applyHostPoint(d) {
    if (!Number.isInteger(d.h) || !Number.isInteger(d.g)) return;
    const mine = d.by === 'guest';
    this.p1Score = d.g;
    this.p2Score = d.h;

    // A miss on this side already burst at this goal when it happened
    if (mine) {
      this.particles.emit(this.width, Number.isFinite(d.y) ? d.y : this.height / 2, 25, '#00f3ff', 300, 0.6);
    }
    this.settlePoint(mine);
  }

  applyHostOrb(d) {
    if (!POWER_UP_TYPES.includes(d.type) || !Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
    this.powerUp = { x: this.width - d.x, y: d.y, radius: 18, type: d.type, life: 14 };
  }

  applyRivalPowerUp(d) {
    if (!POWER_UP_TYPES.includes(d.type) || !this.isBallState(d.ball)) return;
    if (!this.balls.some((ball) => ball.id === d.ball.id)) return; // From a rally that's already over

    const recipient = d.ball.mine ? this.p2 : this.p1;
    this.audio.playPowerup();
    if (this.powerUp) {
      this.particles.emit(this.powerUp.x, this.powerUp.y, 25, '#ffe600', 250, 0.5);
      this.powerUp = null;
    }
    this.showBanner(this.powerUpBanner(d.type, recipient));

    this.adoptBall(d.ball); // Turbo changed its speed
    if (d.type === 'expand') {
      recipient.h = 145;
      recipient.powerTimer = 10;
    } else if (d.type === 'multiball') {
      this.adoptBall(d.extra, true);
    }
  }

  // The loser tells the room, which then gives both players the result
  awaitOnlineResult(won) {
    this.state = 'decided';
    this.audio.stopMusic();
    this.showBanner(won ? 'MATCH WON' : 'MATCH LOST');
    if (!won && this.lobby.room) this.lobby.reportLoss();
  }

  showOnlineResult(won, reason) {
    this.state = 'gameover';
    this.audio.stopMusic();
    this.audio.playMatchWin();
    this.setNetStatus('');

    const subtitles = won
      ? { lost: 'Rival Circuit Overloaded', forfeit: 'Rival Disconnected', away: 'Rival Left The Arena' }
      : { lost: 'Rival Took The Match', forfeit: 'Connection Lost', away: 'You Were Away Too Long' };
    this.winnerTitle.textContent = won ? 'VICTORY!' : 'DEFEAT';
    this.winnerTitle.style.color = won ? 'var(--neon-cyan)' : 'var(--neon-pink)';
    this.winnerSub.textContent = subtitles[reason] || 'Match Over';

    this.resP1Score.textContent = this.p1Score;
    this.resP2Score.textContent = this.p2Score;
    this.resMaxRally.textContent = this.maxRallyInMatch;
    this.resBestRally.textContent = this.allTimeBestRally;
    this.resP1Label.textContent = 'YOU';
    this.resP2Label.textContent = 'RIVAL';

    this.gameoverScreen.classList.add('active');
    this.updateHUD();
  }

  loop(currentTime) {
    if (this.state !== 'playing') return;

    const elapsed = Math.max(0, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    if (this.mode === 'online') {
      // The rival's game didn't stall with this one, so a long frame is made up
      // in short steps. Dropping that time would leave this side's ball behind theirs.
      let remaining = Math.min(elapsed, NET_MAX_CATCH_UP_SECONDS);
      do {
        const step = Math.min(remaining, MAX_STEP_SECONDS);
        this.update(step);
        remaining -= step;
      } while (remaining > 0 && this.state === 'playing');
    } else {
      // Offline, a long frame just plays a little slow
      this.update(Math.min(elapsed, MAX_STEP_SECONDS));
    }
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.pongGame = new NeonPong();
});
