/**
 * NEON RUNNER - Cyberpunk Synthwave Endless Runner
 * Pure Vanilla HTML5 Canvas & Web Audio API
 */

// ============================================================================
// AUDIO SYSTEM (Web Audio API Synthesizer)
// ============================================================================
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmPlaying = false;
    this.bgmTimer = null;
    this.step = 0;
    this.baseTempo = 130; // BPM

    // Synthwave Arpeggio Frequencies (Am - F - C - G progression)
    this.bassline = [
      110, 110, 220, 110,  // A2
      87.3, 87.3, 174.6, 87.3, // F2
      130.8, 130.8, 261.6, 130.8, // C3
      98, 98, 196, 98 // G2
    ];

    this.melody = [
      440, 523.25, 659.25, 523.25,
      349.23, 440, 523.25, 440,
      523.25, 659.25, 783.99, 659.25,
      392, 493.88, 587.33, 493.88
    ];
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
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
    return this.isMuted;
  }

  playJump() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(560, now + 0.18);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playDoubleJump() {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);
  }

  playSlide() {
    if (this.isMuted || !this.ctx) return;
    // White noise burst filtered
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
    filter.Q.value = 3;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    whiteNoise.start(now);
  }

  playShard(combo = 1) {
    if (this.isMuted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = 587.33; // D5
    const pitchMultiplier = 1 + ((combo - 1) % 6) * 0.15;
    const now = this.ctx.currentTime;

    osc.frequency.setValueAtTime(baseFreq * pitchMultiplier, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * pitchMultiplier * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.14);
  }

  playPowerup() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880]; // A major arpeggio
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.18, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.22);
    });
  }

  playSmash() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Resonant smash
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.7);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.75);
  }

  startBGM() {
    if (this.isMuted || this.bgmPlaying || !this.ctx) return;
    this.bgmPlaying = true;
    this.step = 0;
    this.scheduleBeat();
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmTimer) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  scheduleBeat() {
    if (!this.bgmPlaying || this.isMuted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const sixteenth = (60 / this.baseTempo) / 4; // 16th note duration

    // Bass synth pulse
    const bassFreq = this.bassline[this.step % this.bassline.length];
    const bassOsc = this.ctx.createOscillator();
    const bassFilter = this.ctx.createBiquadFilter();
    const bassGain = this.ctx.createGain();

    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(bassFreq, now);

    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(600, now);
    bassFilter.frequency.exponentialRampToValueAtTime(150, now + sixteenth * 0.9);

    bassGain.gain.setValueAtTime(0.12, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenth * 0.9);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(this.ctx.destination);

    bassOsc.start(now);
    bassOsc.stop(now + sixteenth * 0.9);

    // Synth Melody on every 2nd 16th note
    if (this.step % 2 === 0) {
      const melIdx = Math.floor(this.step / 2) % this.melody.length;
      const melFreq = this.melody[melIdx];

      const melOsc = this.ctx.createOscillator();
      const melGain = this.ctx.createGain();
      melOsc.type = 'triangle';
      melOsc.frequency.setValueAtTime(melFreq, now);

      melGain.gain.setValueAtTime(0.07, now);
      melGain.gain.exponentialRampToValueAtTime(0.001, now + sixteenth * 1.8);

      melOsc.connect(melGain);
      melGain.connect(this.ctx.destination);

      melOsc.start(now);
      melOsc.stop(now + sixteenth * 1.8);
    }

    // Hi-hat noise on off-beats
    if (this.step % 2 === 1) {
      const hatOsc = this.ctx.createOscillator();
      const hatGain = this.ctx.createGain();
      hatOsc.type = 'square';
      hatOsc.frequency.setValueAtTime(3200 + Math.random() * 800, now);

      hatGain.gain.setValueAtTime(0.03, now);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      hatOsc.connect(hatGain);
      hatGain.connect(this.ctx.destination);

      hatOsc.start(now);
      hatOsc.stop(now + 0.04);
    }

    this.step++;
    const nextInterval = sixteenth * 1000;
    this.bgmTimer = setTimeout(() => this.scheduleBeat(), nextInterval);
  }
}

// ============================================================================
// PARTICLE SYSTEM
// ============================================================================
class Particle {
  constructor(x, y, vx, vy, color, size, life, shape = 'rect') {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.size = size;
    this.life = life;
    this.maxLife = life;
    this.shape = shape;
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.life -= dt * 60;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;

    if (this.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.shape === 'spark') {
      ctx.fillRect(this.x, this.y, this.size * 2, this.size * 0.5);
    } else {
      ctx.fillRect(this.x, this.y, this.size, this.size);
    }
    ctx.restore();
  }
}

class ParticleManager {
  constructor() {
    this.particles = [];
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].draw(ctx);
    }
  }

  emit(x, y, color, count, speed = 4, size = 4, life = 20, shape = 'circle') {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (Math.random() * 0.7 + 0.3) * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      this.particles.push(new Particle(x, y, vx, vy, color, size, life + Math.random() * 10, shape));
    }
  }

  emitTrail(x, y, color) {
    this.particles.push(
      new Particle(
        x + (Math.random() * 6 - 3),
        y + (Math.random() * 6 - 3),
        -(Math.random() * 2 + 1),
        Math.random() * 1.5 - 0.75,
        color,
        Math.random() * 3 + 2,
        15,
        'spark'
      )
    );
  }

  emitSlideSparks(x, y) {
    for (let i = 0; i < 2; i++) {
      this.particles.push(
        new Particle(
          x,
          y,
          -(Math.random() * 5 + 3),
          -(Math.random() * 2 + 1),
          '#ff007f',
          Math.random() * 3 + 2,
          16,
          'spark'
        )
      );
    }
  }

  clear() {
    this.particles = [];
  }
}

// ============================================================================
// PARALLAX BACKGROUND & SYNTHWAVE GRID
// ============================================================================
class BackgroundRenderer {
  constructor(canvasWidth, canvasHeight) {
    this.w = canvasWidth;
    this.h = canvasHeight;
    this.horizonY = this.h * 0.65;
    this.gridOffset = 0;

    // Distant Neon City Skyline
    this.buildings = [];
    let curX = 0;
    while (curX < this.w * 2) {
      const width = Math.random() * 45 + 30;
      const height = Math.random() * 120 + 40;
      const color = Math.random() > 0.5 ? '#170c32' : '#231248';
      const windowColor = Math.random() > 0.4 ? '#00f3ff' : '#ff007f';
      this.buildings.push({ x: curX, w: width, h: height, color, windowColor });
      curX += width + (Math.random() * 8 + 4);
    }

    // Stars
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * this.w,
        y: Math.random() * (this.horizonY - 20),
        size: Math.random() * 2 + 1,
        color: Math.random() > 0.5 ? '#00f3ff' : '#ffffff',
        blink: Math.random() * Math.PI * 2
      });
    }

    // Speed Lines for Overdrive
    this.speedLines = [];
    for (let i = 0; i < 35; i++) {
      this.speedLines.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        length: Math.random() * 80 + 40,
        speed: Math.random() * 15 + 20
      });
    }
  }

  update(speed, dt, isOverdrive) {
    // Parallax scrolling
    this.gridOffset = (this.gridOffset + speed * dt * 60) % 40;

    // Scroll city buildings
    const bldSpeed = speed * 0.15;
    for (const b of this.buildings) {
      b.x -= bldSpeed * dt * 60;
      if (b.x + b.w < 0) {
        b.x += this.w * 2;
      }
    }

    // Speed lines in overdrive
    if (isOverdrive) {
      for (const line of this.speedLines) {
        line.x -= (line.speed + speed * 1.5) * dt * 60;
        if (line.x + line.length < 0) {
          line.x = this.w + Math.random() * 50;
          line.y = Math.random() * this.h;
        }
      }
    }
  }

  draw(ctx, isOverdrive) {
    // 1. Deep synthwave sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.horizonY);
    skyGrad.addColorStop(0, '#06020c');
    skyGrad.addColorStop(0.5, '#1e053a');
    skyGrad.addColorStop(1, '#530b58');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.w, this.horizonY);

    // 2. Neon Stars
    const time = Date.now() * 0.003;
    for (const star of this.stars) {
      const alpha = 0.4 + 0.6 * Math.sin(star.blink + time);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = star.color;
      ctx.fillRect(star.x, star.y, star.size, star.size);
      ctx.restore();
    }

    // 3. Glowing Synthwave Sun (with Outrun-style horizontal slices)
    const sunRadius = 68;
    const sunX = this.w * 0.75;
    const sunY = this.horizonY - 35;

    // Sun outer aura
    ctx.save();
    const sunAura = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius * 1.6);
    sunAura.addColorStop(0, 'rgba(255, 0, 127, 0.55)');
    sunAura.addColorStop(0.6, 'rgba(255, 230, 0, 0.25)');
    sunAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunAura;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Sun disc gradient
    const sunGrad = ctx.createLinearGradient(sunX, sunY - sunRadius, sunX, sunY + sunRadius);
    sunGrad.addColorStop(0, '#ffe600');
    sunGrad.addColorStop(0.5, '#ff007f');
    sunGrad.addColorStop(1, '#9d00ff');

    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    // Sun horizontal sliced cuts
    ctx.fillStyle = '#06020c';
    for (let slice = 0; slice < 7; slice++) {
      const sliceY = sunY + slice * 9;
      const sliceHeight = 1.5 + slice * 0.9;
      if (sliceY < this.horizonY) {
        ctx.fillRect(sunX - sunRadius - 5, sliceY, sunRadius * 2 + 10, sliceHeight);
      }
    }
    ctx.restore();

    // 4. Skyline Buildings Silhouettes
    for (const b of this.buildings) {
      if (b.x < this.w && b.x + b.w > 0) {
        const by = this.horizonY - b.h;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, by, b.w, b.h);

        // Building neon antenna
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, by);
        ctx.lineTo(b.x + b.w / 2, by - 12);
        ctx.stroke();

        // Building window grid
        ctx.fillStyle = b.windowColor;
        for (let wy = by + 12; wy < this.horizonY - 8; wy += 14) {
          for (let wx = b.x + 6; wx < b.x + b.w - 6; wx += 9) {
            if ((wx + wy) % 3 === 0) {
              ctx.fillRect(wx, wy, 4, 6);
            }
          }
        }
      }
    }

    // 5. Horizon Glow Line
    ctx.save();
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, this.horizonY);
    ctx.lineTo(this.w, this.horizonY);
    ctx.stroke();
    ctx.restore();

    // 6. 3D Perspective Retro Grid Ground
    const groundGrad = ctx.createLinearGradient(0, this.horizonY, 0, this.h);
    groundGrad.addColorStop(0, '#0c021c');
    groundGrad.addColorStop(1, '#020005');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.horizonY, this.w, this.h - this.horizonY);

    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 5;

    // Moving horizontal grid lines (logarithmic spacing for 3D depth)
    const numHorizontal = 14;
    for (let i = 0; i < numHorizontal; i++) {
      const p = (i + (this.gridOffset / 40)) / numHorizontal;
      const y = this.horizonY + Math.pow(p, 2.5) * (this.h - this.horizonY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.w, y);
      ctx.stroke();
    }

    // Perspective diagonal rays converging towards vanishing point
    const vanishingX = this.w * 0.5;
    const numRays = 26;
    for (let i = -numRays / 2; i <= numRays / 2; i++) {
      const bottomX = vanishingX + i * 55;
      ctx.beginPath();
      ctx.moveTo(vanishingX + i * 4, this.horizonY);
      ctx.lineTo(bottomX, this.h);
      ctx.stroke();
    }
    ctx.restore();

    // 7. Overdrive Warp Speed Lines
    if (isOverdrive) {
      ctx.save();
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 12;
      for (const line of this.speedLines) {
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.length, line.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

// ============================================================================
// PLAYER CONTROLLER & ANIMATION
// ============================================================================
class Player {
  constructor(groundY) {
    this.groundY = groundY;
    this.x = 120;
    this.standH = 58;
    this.slideH = 28;
    this.w = 34;
    this.h = this.standH;
    this.y = this.groundY - this.h;

    this.vy = 0;
    this.gravity = 0.85;
    this.jumpForce = -14.2;
    this.doubleJumpForce = -12.5;

    this.jumpsLeft = 2;
    this.isGrounded = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.maxSlideTime = 38; // frames

    this.animTimer = 0;
    this.trail = [];
    this.hasShield = false;
  }

  jump(soundEngine) {
    if (this.jumpsLeft > 0) {
      if (this.jumpsLeft === 2) {
        this.vy = this.jumpForce;
        soundEngine.playJump();
      } else {
        this.vy = this.doubleJumpForce;
        soundEngine.playDoubleJump();
      }
      this.isGrounded = false;
      this.jumpsLeft--;
      this.isSliding = false;
      return true;
    }
    return false;
  }

  slide(soundEngine) {
    if (this.isGrounded && !this.isSliding) {
      this.isSliding = true;
      this.slideTimer = this.maxSlideTime;
      this.h = this.slideH;
      this.y = this.groundY - this.h;
      soundEngine.playSlide();
      return true;
    } else if (!this.isGrounded) {
      // Fast fall
      this.vy = Math.max(this.vy, 14);
    }
    return false;
  }

  update(dt, soundEngine, particleMgr, isOverdrive) {
    this.animTimer += dt * 60;

    // Sliding countdown
    if (this.isSliding) {
      this.slideTimer -= dt * 60;
      particleMgr.emitSlideSparks(this.x + 5, this.groundY - 2);
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.h = this.standH;
        this.y = this.groundY - this.h;
      }
    }

    // Apply vertical physics
    if (!this.isGrounded) {
      this.vy += this.gravity * dt * 60;
      this.y += this.vy * dt * 60;

      if (this.y + this.h >= this.groundY) {
        this.y = this.groundY - this.h;
        this.vy = 0;
        this.isGrounded = true;
        this.jumpsLeft = 2;
        particleMgr.emit(this.x + this.w / 2, this.groundY, '#00f3ff', 8, 3, 3, 12);
      }
    }

    // Store trail positions
    if (Math.floor(this.animTimer) % 2 === 0) {
      this.trail.push({
        x: this.x,
        y: this.y,
        w: this.w,
        h: this.h,
        sliding: this.isSliding,
        alpha: 0.65,
        color: isOverdrive ? '#ffe600' : '#00f3ff'
      });
      if (this.trail.length > 7) {
        this.trail.shift();
      }
    }

    // Decay trail alpha
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 2.2;
      this.trail[i].x -= 5 * dt * 60;
      if (this.trail[i].alpha <= 0) {
        this.trail.splice(i, 1);
      }
    }

    // Footstep sparks while running
    if (this.isGrounded && !this.isSliding && Math.random() < 0.35) {
      particleMgr.emitTrail(this.x, this.groundY - 2, '#00f3ff');
    }
  }

  draw(ctx, isOverdrive) {
    // 1. Draw Ghost Trail
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, t.alpha);
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.restore();
    }

    ctx.save();
    const mainColor = isOverdrive ? '#ffe600' : '#00f3ff';
    const accentColor = isOverdrive ? '#ff007f' : '#ff007f';

    ctx.shadowColor = mainColor;
    ctx.shadowBlur = isOverdrive ? 24 : 14;

    if (this.isSliding) {
      // -------------------------------------------------------------
      // SLIDING RUNNER AVATAR (Low sleek aerodynamic dash)
      // -------------------------------------------------------------
      // Body chassis
      ctx.fillStyle = '#120826';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x - 10, this.y + 4, this.w + 24, this.h - 6, 8);
      ctx.fill();
      ctx.stroke();

      // Glowing Cyber Visor
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.fillRect(this.x + this.w + 2, this.y + 8, 8, 6);

      // Jet exhaust thruster
      ctx.fillStyle = isOverdrive ? '#ffe600' : '#00f3ff';
      ctx.beginPath();
      ctx.moveTo(this.x - 12, this.y + 12);
      ctx.lineTo(this.x - 24, this.y + 15);
      ctx.lineTo(this.x - 12, this.y + 18);
      ctx.fill();

    } else {
      // -------------------------------------------------------------
      // UPRIGHT RUNNING / JUMPING CYBERPUNK RUNNER
      // -------------------------------------------------------------
      const runCycle = this.isGrounded ? Math.sin(this.animTimer * 0.35) : 0;
      const legOffset = runCycle * 14;

      // Torso / Suit
      ctx.fillStyle = '#120826';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x + 4, this.y + 14, this.w - 8, 24, 4);
      ctx.fill();
      ctx.stroke();

      // Chest Neon Core
      ctx.fillStyle = accentColor;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 12;
      ctx.fillRect(this.x + 10, this.y + 20, 14, 8);

      // Head / Cyber Helmet
      ctx.fillStyle = '#170c32';
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(this.x + 6, this.y, 22, 16, 5);
      ctx.fill();
      ctx.stroke();

      // Glowing Neon Visor
      ctx.fillStyle = isOverdrive ? '#ffe600' : '#00f3ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(this.x + 16, this.y + 4, 12, 6);

      // Cyber Scarf / Trail Ribbon streaming behind
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 8;
      const scarfWave = Math.sin(this.animTimer * 0.4) * 6;
      ctx.beginPath();
      ctx.moveTo(this.x + 8, this.y + 14);
      ctx.quadraticCurveTo(this.x - 16, this.y + 14 + scarfWave, this.x - 30, this.y + 18 - scarfWave);
      ctx.stroke();

      // Cybernetic Legs (Animated Stride Cycle)
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 3.5;
      ctx.shadowColor = mainColor;

      // Front Leg
      ctx.beginPath();
      ctx.moveTo(this.x + 10, this.y + 38);
      ctx.lineTo(this.x + 14 + legOffset, this.y + 48);
      ctx.lineTo(this.x + 16 + legOffset * 1.3, this.y + this.h);
      ctx.stroke();

      // Back Leg
      ctx.beginPath();
      ctx.moveTo(this.x + 22, this.y + 38);
      ctx.lineTo(this.x + 18 - legOffset, this.y + 48);
      ctx.lineTo(this.x + 20 - legOffset * 1.3, this.y + this.h);
      ctx.stroke();
    }

    // 2. Cyber Shield Aura
    if (this.hasShield) {
      ctx.strokeStyle = '#05ffa1';
      ctx.shadowColor = '#05ffa1';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      const shieldPulse = Math.sin(this.animTimer * 0.2) * 4;

      ctx.beginPath();
      ctx.arc(
        this.x + this.w / 2,
        this.y + this.h / 2,
        Math.max(this.w, this.h) * 0.75 + shieldPulse,
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.fillStyle = 'rgba(5, 255, 161, 0.12)';
      ctx.fill();
    }

    ctx.restore();
  }

  getHitbox() {
    // Generous padding for tighter, fairer collisions
    return {
      x: this.x + 4,
      y: this.y + 4,
      w: this.w - 8,
      h: this.h - 6
    };
  }

  reset() {
    this.h = this.standH;
    this.y = this.groundY - this.h;
    this.vy = 0;
    this.jumpsLeft = 2;
    this.isGrounded = true;
    this.isSliding = false;
    this.hasShield = false;
    this.trail = [];
  }
}

// ============================================================================
// OBSTACLES & PICKUPS (ENTITIES)
// ============================================================================
class Entity {
  constructor(x, y, w, h, type) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type; // 'SPIKE', 'LASER', 'DRONE', 'SHARD', 'SHIELD_ORB', 'DASH_ORB'
    this.markedForRemoval = false;
    this.animOffset = Math.random() * Math.PI * 2;
  }

  update(speed, dt) {
    this.x -= speed * dt * 60;
  }

  draw(ctx, time) {
    ctx.save();

    if (this.type === 'SPIKE') {
      // Neon Spikes on the ground (Jump over)
      ctx.strokeStyle = '#ff007f';
      ctx.fillStyle = '#260416';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;

      const numSpikes = 3;
      const spikeW = this.w / numSpikes;
      ctx.beginPath();
      for (let i = 0; i < numSpikes; i++) {
        const sx = this.x + i * spikeW;
        ctx.moveTo(sx, this.y + this.h);
        ctx.lineTo(sx + spikeW / 2, this.y);
        ctx.lineTo(sx + spikeW, this.y + this.h);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

    } else if (this.type === 'LASER') {
      // High Laser Beam (Slide under)
      const pulse = Math.sin(time * 0.01 + this.animOffset) * 0.3 + 0.7;
      ctx.strokeStyle = '#00f3ff';
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 16 * pulse;
      ctx.lineWidth = 4;

      // Laser emitters on sides
      ctx.fillRect(this.x - 6, this.y - 4, 8, this.h + 8);
      ctx.fillRect(this.x + this.w - 2, this.y - 4, 8, this.h + 8);

      // Energy beam
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.h / 2);
      ctx.lineTo(this.x + this.w, this.y + this.h / 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else if (this.type === 'DRONE') {
      // Flying Drone with laser scanner
      const bob = Math.sin(time * 0.006 + this.animOffset) * 8;
      const dy = this.y + bob;

      ctx.strokeStyle = '#ff7700';
      ctx.fillStyle = '#261204';
      ctx.shadowColor = '#ff7700';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;

      // Drone Hexagon Body
      ctx.beginPath();
      const cx = this.x + this.w / 2;
      const cy = dy + this.h / 2;
      const r = this.w / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = cx + r * Math.cos(angle);
        const hy = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Drone Red Eye
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'SHARD') {
      // Glowing Cyan Diamond Shard
      const bob = Math.sin(time * 0.008 + this.animOffset) * 5;
      const sy = this.y + bob;

      ctx.strokeStyle = '#00f3ff';
      ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.5;

      const cx = this.x + this.w / 2;
      const cy = sy + this.h / 2;

      ctx.beginPath();
      ctx.moveTo(cx, sy);
      ctx.lineTo(this.x + this.w, cy);
      ctx.lineTo(cx, sy + this.h);
      ctx.lineTo(this.x, cy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner sparkle
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();

    } else if (this.type === 'SHIELD_ORB') {
      // Green Shield Pickup
      const bob = Math.sin(time * 0.007 + this.animOffset) * 6;
      const cy = this.y + this.h / 2 + bob;
      const cx = this.x + this.w / 2;

      ctx.strokeStyle = '#05ffa1';
      ctx.fillStyle = 'rgba(5, 255, 161, 0.3)';
      ctx.shadowColor = '#05ffa1';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Shield crest
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 4);
      ctx.lineTo(cx + 5, cy - 4);
      ctx.lineTo(cx, cy + 6);
      ctx.closePath();
      ctx.stroke();

    } else if (this.type === 'DASH_ORB') {
      // Yellow Overdrive Lightning Orb
      const bob = Math.sin(time * 0.009 + this.animOffset) * 6;
      const cy = this.y + this.h / 2 + bob;
      const cx = this.x + this.w / 2;

      ctx.strokeStyle = '#ffe600';
      ctx.fillStyle = 'rgba(255, 230, 0, 0.35)';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.arc(cx, cy, this.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Lightning bolt icon
      ctx.fillStyle = '#ffe600';
      ctx.beginPath();
      ctx.moveTo(cx - 2, cy - 8);
      ctx.lineTo(cx + 4, cy - 1);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + 3, cy + 8);
      ctx.lineTo(cx - 4, cy + 1);
      ctx.lineTo(cx - 1, cy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  isObstacle() {
    return this.type === 'SPIKE' || this.type === 'LASER' || this.type === 'DRONE';
  }

  getHitbox() {
    return {
      x: this.x + 3,
      y: this.y + 3,
      w: this.w - 6,
      h: this.h - 6
    };
  }
}

// ============================================================================
// ENTITY SPAWNER / PATTERN GENERATOR
// ============================================================================
class EntitySpawner {
  constructor(canvasWidth, groundY) {
    this.w = canvasWidth;
    this.groundY = groundY;
    this.entities = [];
    this.spawnTimer = 0;
    this.minSpawnDist = 180;
  }

  update(speed, dt, particleMgr, soundEngine, player, isOverdrive) {
    // Move and prune entities
    for (let i = this.entities.length - 1; i >= 0; i--) {
      const e = this.entities[i];
      e.update(speed, dt);

      // Overdrive magnetizes shards towards player
      if (isOverdrive && e.type === 'SHARD') {
        const dx = (player.x + player.w / 2) - (e.x + e.w / 2);
        const dy = (player.y + player.h / 2) - (e.y + e.h / 2);
        const dist = Math.hypot(dx, dy);
        if (dist < 320) {
          e.x += (dx / dist) * 14 * dt * 60;
          e.y += (dy / dist) * 14 * dt * 60;
        }
      }

      if (e.x + e.w < -50 || e.markedForRemoval) {
        this.entities.splice(i, 1);
      }
    }

    // Procedural Generation Timing
    this.spawnTimer -= speed * dt * 60;
    if (this.spawnTimer <= 0) {
      this.generatePattern(speed);
    }
  }

  generatePattern(speed) {
    // Dynamic difficulty spacing
    const spacing = Math.max(340, 520 - speed * 12) + Math.random() * 180;
    this.spawnTimer = spacing;

    const patternType = Math.floor(Math.random() * 5);
    const startX = this.w + 40;

    switch (patternType) {
      case 0:
        // Spike jump with arc of shards overhead
        this.entities.push(new Entity(startX, this.groundY - 36, 42, 36, 'SPIKE'));
        for (let i = 0; i < 4; i++) {
          const arcY = this.groundY - 95 - Math.sin((i / 3) * Math.PI) * 45;
          this.entities.push(new Entity(startX + 20 + i * 40, arcY, 22, 22, 'SHARD'));
        }
        break;

      case 1:
        // High laser requiring slide, with floor shards under it
        this.entities.push(new Entity(startX, this.groundY - 72, 85, 20, 'LASER'));
        for (let i = 0; i < 3; i++) {
          this.entities.push(new Entity(startX + 15 + i * 30, this.groundY - 26, 20, 20, 'SHARD'));
        }
        break;

      case 2:
        // Flying Drone + Low Spike sequence
        this.entities.push(new Entity(startX, this.groundY - 105, 36, 36, 'DRONE'));
        this.entities.push(new Entity(startX + 180, this.groundY - 36, 40, 36, 'SPIKE'));
        // Chance for shield or dash orb
        if (Math.random() < 0.28) {
          const orbType = Math.random() > 0.5 ? 'SHIELD_ORB' : 'DASH_ORB';
          this.entities.push(new Entity(startX + 90, this.groundY - 80, 28, 28, orbType));
        }
        break;

      case 3:
        // Double jump test: high drone or double spikes
        this.entities.push(new Entity(startX, this.groundY - 36, 40, 36, 'SPIKE'));
        this.entities.push(new Entity(startX + 75, this.groundY - 36, 40, 36, 'SPIKE'));
        for (let i = 0; i < 3; i++) {
          this.entities.push(new Entity(startX + 30 + i * 35, this.groundY - 125, 22, 22, 'SHARD'));
        }
        break;

      case 4:
      default:
        // Shard runner trail
        for (let i = 0; i < 5; i++) {
          this.entities.push(new Entity(startX + i * 40, this.groundY - 35, 22, 22, 'SHARD'));
        }
        if (Math.random() < 0.3) {
          this.entities.push(new Entity(startX + 230, this.groundY - 65, 75, 18, 'LASER'));
        }
        break;
    }
  }

  draw(ctx, time) {
    for (const e of this.entities) {
      e.draw(ctx, time);
    }
  }

  clear() {
    this.entities = [];
    this.spawnTimer = 180;
  }
}

// ============================================================================
// MAIN GAME CONTROLLER
// ============================================================================
class NeonRunnerGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    // Dimensions
    this.width = 960;
    this.height = 540;
    this.groundY = this.height * 0.76;

    // Subsystems
    this.sound = new SoundEngine();
    this.particles = new ParticleManager();
    this.bg = new BackgroundRenderer(this.width, this.height);
    this.player = new Player(this.groundY);
    this.spawner = new EntitySpawner(this.width, this.groundY);

    // Game Variables
    this.state = 'START'; // 'START', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.score = 0;
    this.distance = 0;
    this.baseSpeed = 7.5;
    this.speed = this.baseSpeed;
    this.maxSpeed = 19;
    this.speedMultiplier = 1;
    this.multiplier = 1;
    this.shardsCollected = 0;
    this.comboCount = 0;
    this.comboTimer = 0;

    // Overdrive Mechanic
    this.overdrive = 0; // 0 - 100
    this.isOverdrive = false;
    this.overdriveDuration = 0;
    this.maxOverdriveDuration = 260; // frames (~4.5s)

    // High Score Persistence
    this.highScore = parseInt(localStorage.getItem('neonrunner_highscore') || '0', 10);
    this.lastTime = 0;
    this.speedMilestone = 500;

    // DOM UI Elements
    this.uiScore = document.getElementById('score-display');
    this.uiDist = document.getElementById('dist-display');
    this.uiMult = document.getElementById('mult-display');
    this.uiHighscore = document.getElementById('hud-highscore');
    this.uiOverdriveBar = document.getElementById('overdrive-bar-fill');
    this.uiOverdriveStatus = document.getElementById('overdrive-status');
    this.uiBanner = document.getElementById('banner-notification');
    this.startScreen = document.getElementById('start-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.resScore = document.getElementById('res-score');
    this.resDist = document.getElementById('res-distance');
    this.resShards = document.getElementById('res-shards');
    this.resHighscore = document.getElementById('res-highscore');
    this.badgeNewRecord = document.getElementById('new-record-badge');

    this.initDOM();
    this.bindEvents();
    this.updateHUD();

    // Start Animation Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initDOM() {
    this.uiHighscore.textContent = this.padZero(this.highScore, 6);
  }

  padZero(num, len) {
    return String(Math.floor(num)).padStart(len, '0');
  }

  showBanner(msg) {
    this.uiBanner.textContent = msg;
    this.uiBanner.classList.add('active');
    setTimeout(() => {
      this.uiBanner.classList.remove('active');
    }, 1500);
  }

  bindEvents() {
    // Don't run on while the phone is locked, or behind the rotate prompt
    const pauseIfPlaying = () => {
      if (this.state === 'PLAYING') this.togglePause();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseIfPlaying();
    });
    window.matchMedia('(orientation: portrait)').addEventListener('change', (e) => {
      if (e.matches) pauseIfPlaying();
    });

    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.sound.init(); // Unlock web audio

      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.player.jump(this.sound);
        } else if (this.state === 'START' || this.state === 'GAMEOVER') {
          this.startGame();
        }
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.player.slide(this.sound);
        }
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyE' || e.code === 'KeyX') {
        e.preventDefault();
        if (this.state === 'PLAYING') {
          this.triggerOverdrive();
        }
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        this.togglePause();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (this.state === 'GAMEOVER' || this.state === 'PAUSED') {
          this.startGame();
        }
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.toggleAudio();
      }
    });

    // Touch / Button UI bindings
    document.getElementById('btn-start').addEventListener('click', () => {
      this.sound.init();
      this.startGame();
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.togglePause();
    });

    document.getElementById('btn-pause-restart').addEventListener('click', () => {
      this.togglePause();
      this.startGame();
    });

    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      this.sound.init();
      this.toggleAudio();
    });

    document.getElementById('btn-pause').addEventListener('click', () => {
      this.togglePause();
    });

    // On-screen touch buttons
    const btnTouchJump = document.getElementById('btn-touch-jump');
    const btnTouchSlide = document.getElementById('btn-touch-slide');
    const btnTouchDash = document.getElementById('btn-touch-dash');

    btnTouchJump.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sound.init();
      if (this.state === 'PLAYING') this.player.jump(this.sound);
      else if (this.state === 'START' || this.state === 'GAMEOVER') this.startGame();
    });
    btnTouchJump.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.sound.init();
      if (this.state === 'PLAYING') this.player.jump(this.sound);
    });

    btnTouchSlide.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.sound.init();
      if (this.state === 'PLAYING') this.player.slide(this.sound);
    });
    btnTouchSlide.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.sound.init();
      if (this.state === 'PLAYING') this.player.slide(this.sound);
    });

    btnTouchDash.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING') this.triggerOverdrive();
    });
    btnTouchDash.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (this.state === 'PLAYING') this.triggerOverdrive();
    });

    // Tap on canvas as fallback jump
    this.canvas.addEventListener('pointerdown', (e) => {
      this.sound.init();
      if (this.state === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        if (clientX > rect.width * 0.45) {
          this.player.jump(this.sound);
        } else {
          this.player.slide(this.sound);
        }
      }
    });
  }

  toggleAudio() {
    const isMuted = this.sound.toggleMute();
    const icon = document.getElementById('audio-icon');
    icon.textContent = isMuted ? '🔇' : '🔊';
  }

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.sound.stopBGM();
      this.pauseScreen.classList.add('active');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.sound.startBGM();
      this.pauseScreen.classList.remove('active');
      this.lastTime = performance.now();
    }
  }

  triggerOverdrive() {
    if (this.overdrive >= 100 && !this.isOverdrive) {
      this.isOverdrive = true;
      this.overdriveDuration = this.maxOverdriveDuration;
      this.overdrive = 0;
      this.sound.playPowerup();
      this.showBanner('HYPER OVERDRIVE!!');
      this.particles.emit(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ffe600', 30, 8, 4, 30);
    }
  }

  startGame() {
    this.state = 'PLAYING';
    this.score = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.multiplier = 1;
    this.shardsCollected = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.overdrive = 0;
    this.isOverdrive = false;
    this.overdriveDuration = 0;
    this.speedMilestone = 500;

    this.player.reset();
    this.spawner.clear();
    this.particles.clear();

    this.startScreen.classList.remove('active');
    this.gameoverScreen.classList.remove('active');
    this.pauseScreen.classList.remove('active');

    this.sound.startBGM();
    this.updateHUD();
    this.lastTime = performance.now();
  }

  gameOver() {
    this.state = 'GAMEOVER';
    this.sound.stopBGM();
    this.sound.playGameOver();

    // Death burst
    this.particles.emit(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#ff007f', 40, 9, 5, 40);
    this.particles.emit(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#00f3ff', 30, 7, 4, 35);

    // Check High Score
    const isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      localStorage.setItem('neonrunner_highscore', this.highScore.toString());
      this.badgeNewRecord.classList.remove('hidden');
    } else {
      this.badgeNewRecord.classList.add('hidden');
    }

    // Populate Game Over Stats
    this.resScore.textContent = this.padZero(this.score, 6);
    this.resDist.textContent = `${Math.floor(this.distance)}m`;
    this.resShards.textContent = this.shardsCollected;
    this.resHighscore.textContent = this.padZero(this.highScore, 6);

    setTimeout(() => {
      this.gameoverScreen.classList.add('active');
    }, 600);
  }

  checkCollisions() {
    const pBox = this.player.getHitbox();

    for (let i = this.spawner.entities.length - 1; i >= 0; i--) {
      const e = this.spawner.entities[i];
      const eBox = e.getHitbox();

      // AABB overlap check
      if (
        pBox.x < eBox.x + eBox.w &&
        pBox.x + pBox.w > eBox.x &&
        pBox.y < eBox.y + eBox.h &&
        pBox.y + pBox.h > eBox.y
      ) {
        if (e.isObstacle()) {
          if (this.isOverdrive) {
            // Smash through obstacle!
            e.markedForRemoval = true;
            this.sound.playSmash();
            this.score += 250 * this.multiplier;
            this.particles.emit(e.x + e.w / 2, e.y + e.h / 2, '#ffe600', 25, 7, 4, 25);
          } else if (this.player.hasShield) {
            // Shield absorbs damage
            this.player.hasShield = false;
            e.markedForRemoval = true;
            this.sound.playSmash();
            this.particles.emit(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, '#05ffa1', 25, 6, 4, 25);
            this.showBanner('SHIELD BROKEN!');
          } else {
            // Collision death!
            this.gameOver();
            return;
          }
        } else if (e.type === 'SHARD') {
          e.markedForRemoval = true;
          this.shardsCollected++;
          this.comboCount++;
          this.comboTimer = 120; // 2 seconds
          this.multiplier = Math.min(4, 1 + Math.floor(this.comboCount / 5));

          const gain = 100 * this.multiplier;
          this.score += gain;
          this.overdrive = Math.min(100, this.overdrive + 8);
          this.sound.playShard(this.comboCount);
          this.particles.emit(e.x + e.w / 2, e.y + e.h / 2, '#00f3ff', 8, 3, 3, 14);

        } else if (e.type === 'SHIELD_ORB') {
          e.markedForRemoval = true;
          this.player.hasShield = true;
          this.sound.playPowerup();
          this.showBanner('CYBER SHIELD ACTIVE!');
          this.particles.emit(e.x + e.w / 2, e.y + e.h / 2, '#05ffa1', 20, 5, 4, 20);

        } else if (e.type === 'DASH_ORB') {
          e.markedForRemoval = true;
          this.overdrive = 100;
          this.triggerOverdrive();
        }
      }
    }
  }

  updateHUD() {
    this.uiScore.textContent = this.padZero(this.score, 6);
    this.uiDist.textContent = `${Math.floor(this.distance)}m`;
    this.uiMult.textContent = `x${this.multiplier}`;
    this.uiHighscore.textContent = this.padZero(this.highScore, 6);

    // Overdrive status bar
    if (this.isOverdrive) {
      const pct = (this.overdriveDuration / this.maxOverdriveDuration) * 100;
      this.uiOverdriveBar.style.width = `${pct}%`;
      this.uiOverdriveStatus.textContent = 'HYPER DASH ACTIVE!';
      this.uiOverdriveStatus.style.color = '#ffe600';
    } else {
      this.uiOverdriveBar.style.width = `${this.overdrive}%`;
      if (this.overdrive >= 100) {
        this.uiOverdriveStatus.textContent = 'READY! [PRESS SHIFT]';
        this.uiOverdriveStatus.style.color = '#00f3ff';
      } else {
        this.uiOverdriveStatus.textContent = `${Math.floor(this.overdrive)}%`;
        this.uiOverdriveStatus.style.color = '#aaa';
      }
    }
  }

  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Overdrive speed buff
    const currentEffectiveSpeed = this.isOverdrive ? this.speed * 1.55 : this.speed;

    // Distance & Score progression
    this.distance += (currentEffectiveSpeed * dt * 6) / 10;
    this.score += Math.floor(currentEffectiveSpeed * dt * 3) * this.multiplier;

    // Smooth speed progression
    if (this.speed < this.maxSpeed) {
      this.speed += dt * 0.08;
    }

    // Milestone announcement
    if (this.distance >= this.speedMilestone) {
      this.showBanner(`HYPER SPEED UP! [${Math.floor(this.distance)}m]`);
      this.speedMilestone += 500;
    }

    // Overdrive duration countdown
    if (this.isOverdrive) {
      this.overdriveDuration -= dt * 60;
      if (this.overdriveDuration <= 0) {
        this.isOverdrive = false;
        this.overdrive = 0;
      }
    }

    // Combo multiplier decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt * 60;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
        this.multiplier = 1;
      }
    }

    // Subsystem updates
    this.bg.update(currentEffectiveSpeed, dt, this.isOverdrive);
    this.player.update(dt, this.sound, this.particles, this.isOverdrive);
    this.spawner.update(currentEffectiveSpeed, dt, this.particles, this.sound, this.player, this.isOverdrive);
    this.particles.update(dt);

    this.checkCollisions();
    this.updateHUD();
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const now = Date.now();
    this.bg.draw(this.ctx, this.isOverdrive);
    this.spawner.draw(this.ctx, now);
    this.player.draw(this.ctx, this.isOverdrive);
    this.particles.draw(this.ctx);

    // Screen border glow on overdrive
    if (this.isOverdrive) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255, 230, 0, 0.45)';
      this.ctx.lineWidth = 6;
      this.ctx.strokeRect(0, 0, this.width, this.height);
      this.ctx.restore();
    }
  }

  loop(timestamp) {
    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Clamp delta time
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// Instantiate game once window is ready
window.addEventListener('DOMContentLoaded', () => {
  new NeonRunnerGame();
});
