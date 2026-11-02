/**
 * Antigravity Arcade - Game Template Starter
 * Ready-to-customize vanilla HTML5 Canvas + Web Audio game loop
 */

// Simple procedural sound effects engine
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
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

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  }

  playScore() { this.playTone(587.33, 'triangle', 0.12, 0.15); }
  playHit() { this.playTone(130.81, 'sawtooth', 0.2, 0.2); }
  playOver() { this.playTone(85.0, 'sawtooth', 0.4, 0.25); }
}

// Main Game Controller
class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.sfx = new SoundFX();

    this.state = 'start'; // 'start', 'playing', 'paused', 'gameover'
    this.score = 0;
    this.storageKey = 'antigravity_template_highscore';
    this.highScore = parseInt(localStorage.getItem(this.storageKey) || '0', 10);

    // Virtual resolution
    this.width = 960;
    this.height = 540;

    this.keys = {};
    this.lastTime = 0;

    this.initElements();
    this.bindEvents();
    this.updateHUD();
  }

  initElements() {
    this.scoreDisplay = document.getElementById('score-display');
    this.highScoreDisplay = document.getElementById('highscore-display');
    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.resScore = document.getElementById('res-score');
    this.resHighScore = document.getElementById('res-highscore');
    this.audioIcon = document.getElementById('audio-icon');
  }

  bindEvents() {
    // Buttons
    document.getElementById('btn-start').addEventListener('click', () => this.start());
    document.getElementById('btn-restart').addEventListener('click', () => this.start());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-pause-restart').addEventListener('click', () => this.start());

    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      const isMuted = this.sfx.toggleMute();
      this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (this.state === 'playing' || this.state === 'paused') {
          this.togglePause();
        }
      }

      if (e.code === 'KeyR' && this.state === 'gameover') {
        this.start();
      }

      if (e.code === 'KeyM') {
        const isMuted = this.sfx.toggleMute();
        this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  start() {
    this.sfx.init();
    this.score = 0;
    this.state = 'playing';

    this.startScreen.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');

    this.resetGameObjects();
    this.updateHUD();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.pauseScreen.classList.add('active');
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.pauseScreen.classList.remove('active');
      this.lastTime = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  gameOver() {
    this.state = 'gameover';
    this.sfx.playOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(this.storageKey, this.highScore.toString());
    }

    this.resScore.textContent = this.score;
    this.resHighScore.textContent = this.highScore;
    this.gameoverScreen.classList.add('active');
    this.updateHUD();
  }

  updateHUD() {
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.highScoreDisplay) this.highScoreDisplay.textContent = this.highScore;
  }

  resetGameObjects() {
    // Initialize your player and game state here
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      size: 30,
      color: '#00f3ff',
      speed: 300
    };
  }

  update(dt) {
    if (this.state !== 'playing') return;

    // Example basic movement
    if (this.keys['ArrowUp'] || this.keys['KeyW']) this.player.y -= this.player.speed * dt;
    if (this.keys['ArrowDown'] || this.keys['KeyS']) this.player.y += this.player.speed * dt;
    if (this.keys['ArrowLeft'] || this.keys['KeyA']) this.player.x -= this.player.speed * dt;
    if (this.keys['ArrowRight'] || this.keys['KeyD']) this.player.x += this.player.speed * dt;

    // Boundaries
    this.player.x = Math.max(15, Math.min(this.width - 15, this.player.x));
    this.player.y = Math.max(15, Math.min(this.height - 15, this.player.y));
  }

  render() {
    const { ctx, width, height } = this;
    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw Player
    if (this.player) {
      ctx.save();
      ctx.shadowColor = this.player.color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = this.player.color;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  loop(currentTime) {
    if (this.state !== 'playing') return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Boot game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.gameInstance = new Game();
});
