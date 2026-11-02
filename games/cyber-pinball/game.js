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
// 2. VECTOR MATH & GEOMETRY HELPERS
// ============================================================================
function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt(distSq(x1, y1, x2, y2));
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1, t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

function cubicBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

// ============================================================================
// 3. VISUAL FX: PARTICLES & FLOATING TEXT
// ============================================================================
class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatTexts = [];
  }

  emit(x, y, count, color, speed = 120, size = 3) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = (0.3 + Math.random() * 0.7) * speed;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        size: size * (0.6 + Math.random() * 0.8),
        alpha: 1,
        decay: 1.5 + Math.random() * 1.5
      });
    }
  }

  emitRing(x, y, color, maxRadius = 45) {
    this.particles.push({
      x, y,
      isRing: true,
      radius: 5,
      maxRadius,
      color,
      alpha: 1,
      decay: 2.5
    });
  }

  addFloatingText(x, y, text, color = '#00f3ff', size = 16) {
    this.floatTexts.push({
      x, y,
      text,
      color,
      size,
      alpha: 1,
      vy: -45,
      life: 1.2
    });
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      if (p.isRing) {
        p.radius += (p.maxRadius - p.radius) * 12 * dt;
        p.alpha -= p.decay * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha -= p.decay * dt;
      }
      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update float texts
    for (let i = this.floatTexts.length - 1; i >= 0; i--) {
      const ft = this.floatTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / 1.2);
      if (ft.life <= 0) {
        this.floatTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.isRing) {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw floating texts
    for (const ft of this.floatTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.font = `900 ${ft.size}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }
}

// ============================================================================
// 4. PINBALL BALL CLASS
// ============================================================================
class Pinball {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.radius = 9.5;
    this.mass = 1.0;
    this.state = 'FREE'; // 'FREE', 'PLUNGER', 'RAMP', 'LOCKED', 'DRAINED'
    this.rampProgress = 0;
    this.currentRamp = null;
    this.trail = [];
    this.trailMax = 12;

    // Glowing comet colors
    const colors = ['#00f3ff', '#ff007f', '#ffe600', '#05ffa1'];
    this.glowColor = colors[(id - 1) % colors.length];
  }

  reset(x, y, state = 'PLUNGER') {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.state = state;
    this.rampProgress = 0;
    this.currentRamp = null;
    this.trail = [];
  }

  updateTrail() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailMax) {
      this.trail.shift();
    }
  }

  draw(ctx) {
    if (this.state === 'DRAINED' || this.state === 'LOCKED') return;

    // Draw comet trail
    if (this.trail.length > 1) {
      for (let i = 0; i < this.trail.length - 1; i++) {
        const p1 = this.trail[i];
        const p2 = this.trail[i + 1];
        const ratio = (i + 1) / this.trail.length;
        ctx.save();
        ctx.strokeStyle = this.glowColor;
        ctx.globalAlpha = ratio * 0.45;
        ctx.lineWidth = this.radius * 2 * ratio;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Ball Elevation Shadow (if on ramp)
    if (this.state === 'RAMP') {
      ctx.save();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      ctx.arc(this.x + 8, this.y + 12, this.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Chrome Steel Ball with Cyber Neon Edge
    ctx.save();
    ctx.shadowColor = this.glowColor;
    ctx.shadowBlur = 14;

    // Outer neon glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = this.glowColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chrome spherical gradient
    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.35,
      this.y - this.radius * 0.35,
      this.radius * 0.1,
      this.x,
      this.y,
      this.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, '#d8e4f5');
    grad.addColorStop(0.7, '#64748b');
    grad.addColorStop(1, '#1e293b');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1.5, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Specular Glint
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.35, this.y - this.radius * 0.35, this.radius * 0.28, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();

    ctx.restore();
  }
}

// ============================================================================
// 5. FLIPPER CLASS
// ============================================================================
class Flipper {
  constructor(side, pivotX, pivotY, length, restAngle, maxAngle, upSpeed = 26, downSpeed = 16) {
    this.side = side; // 'left' or 'right'
    this.pivotX = pivotX;
    this.pivotY = pivotY;
    this.length = length;
    this.restAngle = restAngle;
    this.maxAngle = maxAngle;
    this.angle = restAngle;
    this.prevAngle = restAngle;
    this.angularVelocity = 0;
    this.isPressed = false;
    this.upSpeed = upSpeed;
    this.downSpeed = downSpeed;
    this.r0 = 12; // Radius at pivot
    this.r1 = 6;  // Radius at tip
  }

  press() {
    this.isPressed = true;
  }

  release() {
    this.isPressed = false;
  }

  update(dt) {
    this.prevAngle = this.angle;
    const targetAngle = this.isPressed ? this.maxAngle : this.restAngle;
    const diff = targetAngle - this.angle;

    if (Math.abs(diff) > 0.005) {
      const speed = this.isPressed ? this.upSpeed : this.downSpeed;
      const step = Math.sign(diff) * speed * dt;
      if (Math.abs(step) >= Math.abs(diff)) {
        this.angle = targetAngle;
      } else {
        this.angle += step;
      }
    } else {
      this.angle = targetAngle;
    }

    this.angularVelocity = (this.angle - this.prevAngle) / dt;
  }

  getTip() {
    return {
      x: this.pivotX + Math.cos(this.angle) * this.length,
      y: this.pivotY + Math.sin(this.angle) * this.length
    };
  }

  draw(ctx) {
    const tip = this.getTip();
    const perp = this.angle + Math.PI / 2;
    const cosP = Math.cos(perp);
    const sinP = Math.sin(perp);

    const p0A = { x: this.pivotX + cosP * this.r0, y: this.pivotY + sinP * this.r0 };
    const p0B = { x: this.pivotX - cosP * this.r0, y: this.pivotY - sinP * this.r0 };
    const p1A = { x: tip.x + cosP * this.r1, y: tip.y + sinP * this.r1 };
    const p1B = { x: tip.x - cosP * this.r1, y: tip.y - sinP * this.r1 };

    ctx.save();
    const color = this.side === 'left' ? '#00f3ff' : '#ff007f';
    ctx.shadowColor = color;
    ctx.shadowBlur = this.isPressed ? 18 : 10;

    // Tapered Flipper Body
    ctx.beginPath();
    ctx.moveTo(p0A.x, p0A.y);
    ctx.lineTo(p1A.x, p1A.y);
    ctx.arc(tip.x, tip.y, this.r1, perp, perp + Math.PI);
    ctx.lineTo(p0B.x, p0B.y);
    ctx.arc(this.pivotX, this.pivotY, this.r0, perp + Math.PI, perp);
    ctx.closePath();

    ctx.fillStyle = this.isPressed ? '#fff' : (this.side === 'left' ? 'rgba(0, 243, 255, 0.85)' : 'rgba(255, 0, 127, 0.85)');
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Center pivot bushing
    ctx.beginPath();
    ctx.arc(this.pivotX, this.pivotY, this.r0 * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#06020f';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }
}

// ============================================================================
// 6. MAIN CYBER PINBALL GAME ENGINE
// ============================================================================
class CyberPinballGame {
  constructor() {
    this.canvas = document.getElementById('pinballCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.audio = new CyberAudio();
    this.fx = new ParticleEngine();

    // Table dimensions
    this.width = 540;
    this.height = 880;

    // Table Physics Constants
    this.gravity = 760; // px / s^2 (downward table incline)
    this.airDamping = 0.9995;
    this.substeps = 10;

    // Game State
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('cyber_pinball_highscore') || '500000', 10);
    this.multiplier = 1;
    this.currentBall = 1;
    this.maxBalls = 3;
    this.lockedBallsCount = 0;
    this.isMultiballActive = false;
    this.multiballTimer = 0;
    this.jackpotLit = false;
    this.jackpotStreak = 0;
    this.ballSaveTimer = 0;
    this.tiltCount = 0;
    this.isTilted = false;
    this.tiltTimer = 0;
    this.state = 'MENU'; // 'MENU', 'PLAYING', 'PAUSED', 'GAMEOVER'
    this.stats = { jackpots: 0, rampLoops: 0, bumperHits: 0, spins: 0 };

    // Plunger
    this.plungerCharge = 0; // 0 to 1
    this.isChargingPlunger = false;
    this.plungerX = 515;
    this.plungerY = 850;

    // Ball Pool
    this.balls = [
      new Pinball(1, this.plungerX, this.plungerY),
      new Pinball(2, this.plungerX, this.plungerY),
      new Pinball(3, this.plungerX, this.plungerY)
    ];

    // Main Left and Right Flippers
    this.leftFlipper = new Flipper('left', 175, 770, 78, 0.46, -0.48);
    this.rightFlipper = new Flipper('right', 365, 770, 78, Math.PI - 0.46, Math.PI + 0.48);
    // Upper Auxiliary Flipper (controlled with right flipper key for nailing Left Warp Ramp!)
    this.upperFlipper = new Flipper('right', 445, 405, 52, Math.PI - 0.55, Math.PI + 0.35, 28, 18);

    // Dynamic Pop Bumpers (3 Cyber Cores)
    this.bumpers = [
      { id: 1, name: 'ALPHA', x: 200, y: 240, r: 25, color: '#00f3ff', pulse: 0 },
      { id: 2, name: 'BETA',  x: 325, y: 240, r: 25, color: '#ff007f', pulse: 0 },
      { id: 3, name: 'GAMMA', x: 262, y: 175, r: 25, color: '#ffe600', pulse: 0 }
    ];
    this.superBumpersTimer = 0;

    // Slingshots (Triangular electric kickers)
    this.leftSling = {
      p1: { x: 120, y: 730 },
      p2: { x: 168, y: 730 },
      p3: { x: 144, y: 630 },
      pulse: 0
    };
    this.rightSling = {
      p1: { x: 420, y: 730 },
      p2: { x: 372, y: 730 },
      p3: { x: 396, y: 630 },
      pulse: 0
    };

    // Drop Targets (3 'C-Y-B' Targets on left wall)
    this.dropTargets = [
      { id: 0, letter: 'C', x: 50, y: 260, w: 10, h: 22, dropped: false },
      { id: 1, letter: 'Y', x: 50, y: 290, w: 10, h: 22, dropped: false },
      { id: 2, letter: 'B', x: 50, y: 320, w: 10, h: 22, dropped: false }
    ];
    this.matrixLockLit = false;

    // Top Rollover Lanes ('C-Y-B' lanes at upper table)
    this.topLanes = [
      { id: 0, letter: 'C', x: 195, y: 100, r: 12, lit: false },
      { id: 1, letter: 'Y', x: 262, y: 92,  r: 12, lit: true },
      { id: 2, letter: 'B', x: 330, y: 100, r: 12, lit: false }
    ];
    this.skillShotLane = 1;

    // Turbine Spinner (right orbit lane)
    this.spinner = {
      x: 460, y: 290, w: 26, h: 6,
      angle: 0, angularSpeed: 0, pulse: 0
    };

    // Matrix Lock Scoop Chamber (Scoop vortex)
    this.scoop = {
      x: 262, y: 330, r: 20, active: true, pulse: 0
    };

    // Outlane Cyber-Save Kickback (left outlane)
    this.cyberSaveLit = true;

    // One-Way Shooter Lane Gate (spring flap that opens on launch, prevents ball from draining back into plunger)
    this.shooterGate = {
      x1: 495,
      y1: 195,
      x2: 535,
      y2: 180,
      swing: 0
    };

    // Ramps
    this.initRamps();

    // Table Boundary Walls & Guides
    this.initStaticWalls();

    // Setup User Controls & DOM Listeners
    this.initDOM();
    this.bindEvents();

    // Start Animation Loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  // ==========================================================================
  // INITIALIZATION: RAMPS & TABLE WALLS
  // ==========================================================================
  initRamps() {
    // Left Warp Loop Ramp: Bezier curve looping across top, exiting over right inlane
    this.leftRamp = {
      name: 'LEFT_WARP',
      entrance: { x1: 85, y1: 395, x2: 125, y2: 395 },
      // Cubic Bezier curve points
      p0: { x: 105, y: 395 },
      p1: { x: 95, y: 160 },
      p2: { x: 260, y: 55 },
      p3: { x: 440, y: 120 },
      p4: { x: 460, y: 320 },
      p5: { x: 450, y: 560 }, // Exit over right inlane wireform
      wireformExit: { x: 450, y: 580, vx: 20, vy: 260 },
      comboCount: 0
    };

    // Right Matrix Jackpot Ramp: Curves up into matrix lock chamber, exits over left inlane
    this.rightRamp = {
      name: 'RIGHT_MATRIX',
      entrance: { x1: 375, y1: 375, x2: 415, y2: 375 },
      p0: { x: 395, y: 375 },
      p1: { x: 405, y: 200 },
      p2: { x: 310, y: 120 },
      p3: { x: 190, y: 120 },
      p4: { x: 100, y: 250 },
      p5: { x: 90, y: 560 }, // Exit over left inlane wireform
      wireformExit: { x: 90, y: 580, vx: -20, vy: 260 }
    };
  }

  initStaticWalls() {
    this.walls = [];
    const addWall = (x1, y1, x2, y2, bounce = 0.5, isRubber = false) => {
      this.walls.push({ x1, y1, x2, y2, bounce, isRubber });
    };

    // Shooter Lane right wall & floor
    addWall(535, 140, 535, 875, 0.4);
    addWall(495, 875, 535, 875, 0.3);

    // Shooter Lane separator wall (from y=200 down to y=810)
    addWall(495, 200, 495, 810, 0.4);

    // Top-Right Curved Arch (routes plunger launch cleanly to top ceiling)
    // Center: (425, 140), Radius: 110. Theta goes monotonically from 0 to PI/2
    const archSegments = 16;
    let prevArchX = 535;
    let prevArchY = 140;
    for (let i = 1; i <= archSegments; i++) {
      const theta = (i / archSegments) * (Math.PI / 2);
      const archX = 425 + Math.cos(theta) * 110;
      const archY = 140 - Math.sin(theta) * 110;
      addWall(prevArchX, prevArchY, archX, archY, 0.6);
      prevArchX = archX;
      prevArchY = archY;
    }

    // Top table roof wall
    addWall(425, 30, 120, 30, 0.5);

    // Top-left curved corner
    // Center: (120, 105), Radius: 75. Theta goes from PI/2 to PI
    let prevTLX = 120;
    let prevTLY = 30;
    for (let i = 1; i <= 8; i++) {
      const theta = Math.PI / 2 + (i / 8) * (Math.PI / 2);
      const curX = 120 + Math.cos(theta) * 75;
      const curY = 105 - Math.sin(theta) * 75;
      addWall(prevTLX, prevTLY, curX, curY, 0.5);
      prevTLX = curX;
      prevTLY = curY;
    }

    // Left outer perimeter wall
    addWall(45, 105, 45, 620, 0.4);

    // Left Outlane & Inlane guides:
    addWall(45, 620, 45, 750, 0.4); // Left outlane outer wall
    addWall(45, 750, 65, 810, 0.4);
    addWall(65, 810, 120, 870, 0.4);

    addWall(75, 620, 75, 720, 0.4); // Left lane divider
    // Left inlane guide: curves down and connects directly onto top of left flipper pivot (170, 758)
    addWall(75, 720, 115, 745, 0.5);
    addWall(115, 745, 170, 758, 0.5);

    // Right Outlane & Inlane guides:
    addWall(495, 620, 495, 750, 0.4); // Right outlane outer wall
    addWall(495, 750, 475, 810, 0.4);
    addWall(475, 810, 420, 870, 0.4);

    addWall(465, 620, 465, 720, 0.4); // Right lane divider
    // Right inlane guide: curves down and connects directly onto top of right flipper pivot (370, 758)
    addWall(465, 720, 425, 745, 0.5);
    addWall(425, 745, 370, 758, 0.5);

    // Drain trough bottom floor guides (leads to drain gap between x=210 and x=330)
    addWall(120, 870, 210, 890, 0.4);
    addWall(420, 870, 330, 890, 0.4);

    // Left Slingshot solid rubber walls (Face A and Face C)
    addWall(120, 730, 144, 630, 0.7, true); // inlane side
    addWall(120, 730, 168, 730, 0.7, true); // bottom side

    // Right Slingshot solid rubber walls (Face A and Face C)
    addWall(420, 730, 396, 630, 0.7, true); // inlane side
    addWall(372, 730, 420, 730, 0.7, true); // bottom side

    // Upper table guide posts & lane dividers (open ceiling channel from y=30 to y=65)
    addWall(155, 65, 170, 115, 0.6, true);
    addWall(365, 65, 355, 115, 0.6, true);
    addWall(228, 65, 228, 115, 0.6, true);
    addWall(296, 65, 296, 115, 0.6, true);

    // Left ramp entrance funnels (funnels ball UP from flippers into ramp at y=395)
    addWall(65, 450, 85, 395, 0.5);
    addWall(145, 450, 125, 395, 0.5);

    // Right ramp entrance funnels (funnels ball UP from flippers into ramp at y=375)
    addWall(355, 430, 375, 375, 0.5);
    addWall(435, 430, 415, 375, 0.5);

    // Right orbit guide walls
    addWall(450, 200, 450, 360, 0.4);
    // Smooth transition from right orbit down onto upper flipper
    addWall(495, 360, 445, 405, 0.5);
  }

  // ==========================================================================
  // DOM & CONTROLS BINDING
  // ==========================================================================
  initDOM() {
    this.dmdScore = document.getElementById('dmd-score');
    this.dmdMult = document.getElementById('dmd-mult');
    this.dmdBall = document.getElementById('dmd-ball');
    this.dmdHigh = document.getElementById('dmd-high');
    this.dmdTicker = document.getElementById('dmd-ticker');

    this.lockInd1 = document.getElementById('lock-ind-1');
    this.lockInd2 = document.getElementById('lock-ind-2');
    this.lockInd3 = document.getElementById('lock-ind-3');
    this.multiballInd = document.getElementById('multiball-ind');
    this.jackpotInd = document.getElementById('jackpot-ind');
    this.saveInd = document.getElementById('save-ind');

    this.plungerFill = document.getElementById('plunger-meter-fill');
    this.flashOverlay = document.getElementById('flash-overlay');
    this.crtOverlay = document.getElementById('crt-overlay');

    this.startModal = document.getElementById('start-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('gameover-modal');

    this.dmdHigh.textContent = this.formatScore(this.highScore);
    this.updateLeaderboardUI();
  }

  bindEvents() {
    // Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.handleKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });

    // Touch Zones
    const touchLeft = document.getElementById('touch-left-flipper');
    const touchRight = document.getElementById('touch-right-flipper');

    const bindTouchZone = (el, pressFn, releaseFn) => {
      el.addEventListener('touchstart', (e) => {
        e.preventDefault();
        el.classList.add('active');
        pressFn();
      });
      el.addEventListener('touchend', (e) => {
        e.preventDefault();
        el.classList.remove('active');
        releaseFn();
      });
      el.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        el.classList.remove('active');
        releaseFn();
      });
    };

    bindTouchZone(touchLeft, () => this.leftFlipperPress(), () => this.leftFlipperRelease());
    bindTouchZone(touchRight, () => this.rightFlipperPress(), () => this.rightFlipperRelease());

    // Plunger Touch / Click UI
    const plungerBtn = document.getElementById('plunger-tap-btn');
    plungerBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startChargingPlunger();
    });
    window.addEventListener('mouseup', () => {
      if (this.isChargingPlunger) this.releasePlunger();
    });
    plungerBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startChargingPlunger();
    });
    plungerBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.releasePlunger();
    });

    // Nudge Buttons
    document.getElementById('btn-nudge-left').addEventListener('click', () => this.nudge(-1, 0));
    document.getElementById('btn-nudge-up').addEventListener('click', () => this.nudge(0, -1));
    document.getElementById('btn-nudge-right').addEventListener('click', () => this.nudge(1, 0));

    // Cabinet Bar Buttons
    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
    });

    document.getElementById('btn-crt-toggle').addEventListener('click', () => {
      this.crtOverlay.classList.toggle('active');
    });

    document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());

    // Modal Buttons
    document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
    document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.pauseModal.classList.remove('active');
      this.startGame();
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.gameOverModal.classList.remove('active');
      this.startGame();
    });
  }

  handleKeyDown(code) {
    if (this.state === 'MENU' || this.state === 'GAMEOVER') {
      if (code === 'Space' || code === 'Enter') {
        this.startGame();
        return;
      }
    }

    if (code === 'KeyP' || code === 'Escape') {
      this.togglePause();
      return;
    }

    if (code === 'KeyM') {
      const isMuted = this.audio.toggleMute();
      document.getElementById('audio-icon').textContent = isMuted ? '🔇' : '🔊';
      return;
    }

    if (code === 'KeyC') {
      this.crtOverlay.classList.toggle('active');
      return;
    }

    if (this.state !== 'PLAYING' || this.isTilted) return;

    // Flippers
    if (code === 'KeyA' || code === 'KeyZ' || code === 'ArrowLeft') {
      this.leftFlipperPress();
    }
    if (code === 'KeyD' || code === 'Slash' || code === 'Period' || code === 'ArrowRight') {
      this.rightFlipperPress();
    }

    // Plunger
    if (code === 'Space' || code === 'ArrowDown') {
      // If any ball is in plunger lane, charge plunger
      const ballInPlunger = this.balls.some(b => b.state === 'PLUNGER');
      if (ballInPlunger) {
        this.startChargingPlunger();
      } else {
        // Space nudges if ball already in play
        this.nudge(0, -1);
      }
    }

    // Nudge Keys
    if (code === 'KeyX') this.nudge(-1, 0);
    if (code === 'KeyN') this.nudge(1, 0);
    if (code === 'ArrowUp') this.nudge(0, -1);
  }

  handleKeyUp(code) {
    if (code === 'KeyA' || code === 'KeyZ' || code === 'ArrowLeft') {
      this.leftFlipperRelease();
    }
    if (code === 'KeyD' || code === 'Slash' || code === 'Period' || code === 'ArrowRight') {
      this.rightFlipperRelease();
    }
    if (code === 'Space' || code === 'ArrowDown') {
      if (this.isChargingPlunger) {
        this.releasePlunger();
      }
    }
  }

  leftFlipperPress() {
    if (this.isTilted) return;
    this.leftFlipper.press();
    this.audio.playFlipperUp();
    this.cycleTopLanes(-1);
  }

  leftFlipperRelease() {
    this.leftFlipper.release();
    this.audio.playFlipperDown();
  }

  rightFlipperPress() {
    if (this.isTilted) return;
    this.rightFlipper.press();
    this.upperFlipper.press();
    this.audio.playFlipperUp();
    this.cycleTopLanes(1);
  }

  rightFlipperRelease() {
    this.rightFlipper.release();
    this.upperFlipper.release();
    this.audio.playFlipperDown();
  }

  startChargingPlunger() {
    if (this.isChargingPlunger) return;
    this.isChargingPlunger = true;
    this.plungerCharge = 0;
    this.audio.startPlungerCharge();
  }

  releasePlunger() {
    if (!this.isChargingPlunger) return;
    this.isChargingPlunger = false;
    const power = Math.max(0.2, this.plungerCharge);
    this.audio.stopPlungerCharge(true);

    // Launch ball in shooter lane
    const ball = this.balls.find(b => b.state === 'PLUNGER');
    if (ball) {
      ball.state = 'FREE';
      // Impulse upwards: 1150 to 2000 px/s (ensures ball glides smoothly around the arch even on quick tap)
      ball.vy = -(1150 + power * 850);
      ball.vx = 0;
      this.fx.emit(ball.x, ball.y, 16, '#00f3ff', 120);

      // Start Ball Save on fresh launch
      if (this.ballSaveTimer <= 0) {
        this.ballSaveTimer = 10;
        this.setTickerText('BALL SAVE ACTIVE // 10 SECONDS');
      }
    }

    this.plungerCharge = 0;
    this.plungerFill.style.height = '0%';
  }

  cycleTopLanes(dir) {
    // Lane change system
    const states = this.topLanes.map(l => l.lit);
    if (dir > 0) {
      // Shift right
      this.topLanes[0].lit = states[2];
      this.topLanes[1].lit = states[0];
      this.topLanes[2].lit = states[1];
    } else {
      // Shift left
      this.topLanes[0].lit = states[1];
      this.topLanes[1].lit = states[2];
      this.topLanes[2].lit = states[0];
    }
  }

  nudge(dx, dy) {
    if (this.state !== 'PLAYING' || this.isTilted) return;
    this.tiltCount++;
    this.audio.playNudge();

    // Table screen jolt
    this.canvas.style.transform = `translate(${dx * 5}px, ${dy * 5}px)`;
    setTimeout(() => { this.canvas.style.transform = 'translate(0, 0)'; }, 80);

    // Apply slight impulse to active balls
    for (const b of this.balls) {
      if (b.state === 'FREE') {
        b.vx += dx * 90;
        b.vy += dy * 90;
      }
    }

    if (this.tiltCount >= 3) {
      this.triggerTilt();
    } else {
      this.setTickerText(`WARNING: TILT ${this.tiltCount} / 3`);
    }
  }

  triggerTilt() {
    this.isTilted = true;
    this.tiltTimer = 4.0;
    this.audio.playTilt();
    this.leftFlipper.release();
    this.rightFlipper.release();
    this.upperFlipper.release();
    this.setTickerText('💥 TILT! SYSTEM OFFLINE 💥');
    this.flashScreen('rgba(255, 0, 80, 0.45)');
  }

  togglePause() {
    if (this.state === 'MENU' || this.state === 'GAMEOVER') return;
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      this.pauseModal.classList.add('active');
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.pauseModal.classList.remove('active');
      this.lastTime = performance.now();
    }
  }

  // ==========================================================================
  // GAME PROGRESSION & RULES
  // ==========================================================================
  startGame() {
    this.startModal.classList.remove('active');
    this.gameOverModal.classList.remove('active');
    this.pauseModal.classList.remove('active');

    this.score = 0;
    this.multiplier = 1;
    this.currentBall = 1;
    this.lockedBallsCount = 0;
    this.isMultiballActive = false;
    this.multiballTimer = 0;
    this.jackpotLit = false;
    this.jackpotStreak = 0;
    this.ballSaveTimer = 10;
    this.tiltCount = 0;
    this.isTilted = false;
    this.stats = { jackpots: 0, rampLoops: 0, bumperHits: 0, spins: 0 };
    this.state = 'PLAYING';

    this.resetTargets();
    this.resetBallsForPlunge();

    this.audio.startMusic();
    this.audio.setMultiballMode(false);
    this.updateHUD();
    this.setTickerText('MISSION: LOCK 3 BALLS TO UNLEASH MULTI-BALL!');
  }

  resetBallsForPlunge() {
    for (let i = 0; i < this.balls.length; i++) {
      if (i === 0) {
        this.balls[i].reset(this.plungerX, this.plungerY, 'PLUNGER');
      } else {
        this.balls[i].reset(this.plungerX, this.plungerY, 'DRAINED');
      }
    }
    this.ballSaveTimer = 10;
  }

  resetTargets() {
    for (const dt of this.dropTargets) {
      dt.dropped = false;
    }
    this.matrixLockLit = false;
  }

  addScore(pts, popupX, popupY, popupText) {
    const finalPts = pts * this.multiplier;
    this.score += finalPts;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('cyber_pinball_highscore', this.highScore.toString());
      this.dmdHigh.textContent = this.formatScore(this.highScore);
    }
    this.dmdScore.textContent = this.formatScore(this.score);

    if (popupX && popupY) {
      const txt = popupText || `+${this.formatScore(finalPts)}`;
      this.fx.addFloatingText(popupX, popupY, txt, pts >= 100000 ? '#ffe600' : '#00f3ff');
    }
  }

  flashScreen(color) {
    this.flashOverlay.style.background = color;
    setTimeout(() => {
      this.flashOverlay.style.background = 'rgba(255, 255, 255, 0)';
    }, 90);
  }

  setTickerText(txt) {
    this.dmdTicker.textContent = txt;
  }

  // --- DROP TARGETS & LOCKS ---
  hitDropTarget(dt) {
    if (dt.dropped) return;
    dt.dropped = true;
    this.audio.playDropTarget();
    this.fx.emit(dt.x + dt.w / 2, dt.y + dt.h / 2, 10, '#00f3ff', 100);
    this.addScore(10000, dt.x + 35, dt.y, `TARGET ${dt.letter}!`);

    // Check if entire bank is down
    const allDropped = this.dropTargets.every(t => t.dropped);
    if (allDropped) {
      this.matrixLockLit = true;
      this.audio.playTargetBankReset();
      this.addScore(50000, 180, 290, 'MATRIX LOCK LIT!');
      this.setTickerText('★ MATRIX LOCK LIT! SHOOT CENTER SCOOP ★');
      this.flashScreen('rgba(0, 243, 255, 0.25)');

      setTimeout(() => {
        for (const t of this.dropTargets) t.dropped = false;
      }, 1200);
    }
  }

  // --- CENTER SCOOP & BALL LOCK ---
  handleScoopCapture(ball) {
    if (this.isMultiballActive) {
      this.audio.playJackpot();
      this.addScore(100000, ball.x, ball.y, 'SCOOP JACKPOT: 100,000!');
      this.fx.emitRing(this.scoop.x, this.scoop.y, '#ffe600', 70);
      ball.x = this.scoop.x;
      ball.y = this.scoop.y + this.scoop.r + ball.radius + 8;
      ball.vy = 420;
      ball.vx = (Math.random() - 0.5) * 180;
      return;
    }

    if (!this.matrixLockLit) {
      // Normal scoop bounce award
      this.audio.playSlingshot();
      this.addScore(15000, ball.x, ball.y, 'CYBER SCOOP: 15,000');
      ball.x = this.scoop.x;
      ball.y = this.scoop.y + this.scoop.r + ball.radius + 8;
      ball.vy = 360;
      ball.vx = (Math.random() - 0.5) * 120;
      return;
    }

    if (this.matrixLockLit) {
      ball.state = 'LOCKED';
      ball.vx = 0;
      ball.vy = 0;
      this.lockedBallsCount++;
      this.audio.playBallLockChime(this.lockedBallsCount);
      this.fx.emitRing(this.scoop.x, this.scoop.y, '#00f3ff', 65);
      this.addScore(50000, this.scoop.x, this.scoop.y, `BALL ${this.lockedBallsCount} LOCKED!`);

      if (this.lockedBallsCount === 1) {
        this.setTickerText('BALL 1 LOCKED! RELAUNCH PLUNGER');
        this.launchNewPlungerBall();
      } else if (this.lockedBallsCount === 2) {
        this.setTickerText('BALL 2 LOCKED! ONE MORE FOR MULTI-BALL');
        this.launchNewPlungerBall();
      } else if (this.lockedBallsCount >= 3) {
        // TRIGGER CYBER MULTI-BALL!
        this.triggerMultiball();
      }
    }
  }

  launchNewPlungerBall() {
    setTimeout(() => {
      if (this.state !== 'PLAYING') return;
      const freeBall = this.balls.find(b => b.state === 'DRAINED');
      if (freeBall) {
        freeBall.reset(this.plungerX, this.plungerY, 'PLUNGER');
        this.ballSaveTimer = 10;
      }
    }, 800);
  }

  triggerMultiball() {
    this.isMultiballActive = true;
    this.multiballTimer = 25; // 25s multi-ball
    this.ballSaveTimer = 15; // 15s ball save during multi-ball
    this.jackpotLit = true;
    this.jackpotStreak = 0;

    this.audio.setMultiballMode(true);
    this.audio.playMultiballSiren();
    this.flashScreen('rgba(255, 0, 127, 0.45)');
    this.fx.emitRing(this.width / 2, this.height / 2, '#ff007f', 120);
    this.addScore(250000, this.width / 2, 400, '⚡ CYBER MULTI-BALL! ⚡');
    this.setTickerText('🚨 CYBER MULTI-BALL ACTIVATED! JACKPOTS LIT! 🚨');

    // Eject all 3 locked balls from scoop with high speed spread!
    setTimeout(() => {
      let angle = -Math.PI / 2 - 0.4;
      for (const b of this.balls) {
        b.state = 'FREE';
        b.x = this.scoop.x + (Math.random() - 0.5) * 20;
        b.y = this.scoop.y + 10;
        b.vx = Math.cos(angle) * 380;
        b.vy = Math.sin(angle) * 380;
        angle += 0.4;
      }
    }, 400);
  }

  // --- JACKPOT MECHANIC ---
  awardJackpot(rampName) {
    this.stats.jackpots++;
    this.jackpotStreak++;

    let pts = 500000;
    let title = '★ JACKPOT! 500,000 ★';

    if (this.jackpotStreak >= 2) {
      pts = 1000000;
      title = '🔥 SUPER JACKPOT! 1,000,000! 🔥';
      this.audio.playSuperJackpot();
      this.flashScreen('rgba(255, 230, 0, 0.6)');
      this.fx.emitRing(this.width / 2, 300, '#ffe600', 140);
    } else {
      this.audio.playJackpot();
      this.flashScreen('rgba(0, 243, 255, 0.45)');
      this.fx.emitRing(this.width / 2, 300, '#00f3ff', 90);
    }

    this.addScore(pts, this.width / 2, 300, title);
    this.setTickerText(`💥 ${title} 💥`);
  }

  // --- RAMPS ---
  handleRampEntry(ball, ramp) {
    if (ball.state === 'RAMP') return;
    ball.state = 'RAMP';
    ball.currentRamp = ramp;
    ball.rampProgress = 0;
    this.audio.playRampWhoosh();
    this.stats.rampLoops++;

    if (ramp.name === 'LEFT_WARP') {
      this.leftRamp.comboCount++;
      const comboMult = Math.min(this.leftRamp.comboCount, 5);
      this.addScore(30000 * comboMult, 105, 380, `WARP LOOP x${comboMult}!`);
    } else if (ramp.name === 'RIGHT_MATRIX') {
      if (this.isMultiballActive && this.jackpotLit) {
        this.awardJackpot('RIGHT_MATRIX');
      } else {
        this.addScore(35000, 395, 360, 'MATRIX OVERDRIVE: 35,000');
      }
    }
  }

  updateRampBall(ball, dt) {
    const ramp = ball.currentRamp;
    if (!ramp) {
      ball.state = 'FREE';
      return;
    }

    // Advance smoothly along ramp spline (duration approx 0.8s)
    ball.rampProgress += dt * 1.35;

    if (ball.rampProgress >= 1.0) {
      // Exit ramp cleanly into inlane wireform
      ball.state = 'FREE';
      ball.x = ramp.wireformExit.x;
      ball.y = ramp.wireformExit.y;
      ball.vx = ramp.wireformExit.vx;
      ball.vy = ramp.wireformExit.vy;
      ball.currentRamp = null;
      ball.rampProgress = 0;
      this.fx.emit(ball.x, ball.y, 8, '#00f3ff', 80);
      return;
    }

    // Spline curve interpolation
    const t = ball.rampProgress;
    let pos;
    if (t < 0.5) {
      pos = cubicBezier(ramp.p0, ramp.p1, ramp.p2, ramp.p3, t * 2);
    } else {
      pos = cubicBezier(ramp.p3, ramp.p4, ramp.p5, ramp.p5, (t - 0.5) * 2);
    }

    ball.x = pos.x;
    ball.y = pos.y;
    ball.vx = 0;
    ball.vy = 0;
  }

  // --- DRAIN & BALL LOSS ---
  handleBallDrain(ball) {
    if (ball.state === 'DRAINED') return;

    // Check if Ball Save is active
    if (this.ballSaveTimer > 0) {
      this.audio.playBallSaved();
      this.fx.emit(ball.x, ball.y, 18, '#05ffa1', 140);
      ball.reset(this.plungerX, this.plungerY, 'PLUNGER');
      this.setTickerText('🛡️ BALL SAVED! RELAUNCH PLUNGER 🛡️');
      return;
    }

    ball.state = 'DRAINED';
    this.audio.playBallDrain();

    // Count remaining active balls
    const activeBalls = this.balls.filter(b => b.state === 'FREE' || b.state === 'RAMP' || b.state === 'PLUNGER');

    if (this.isMultiballActive) {
      if (activeBalls.length <= 1) {
        // Multi-ball ended
        this.isMultiballActive = false;
        this.audio.setMultiballMode(false);
        this.lockedBallsCount = 0;
        this.jackpotLit = false;
        this.setTickerText('MULTI-BALL TERMINATED // RESUME NORMAL PROTOCOLS');
      }
      return;
    }

    // Standard single-ball play drain
    if (activeBalls.length === 0) {
      this.endBall();
    }
  }

  endBall() {
    // End of Ball Bonus Rollup
    const baseBonus = this.stats.bumperHits * 500 + this.stats.rampLoops * 2500 + this.stats.spins * 200;
    const finalBonus = baseBonus * this.multiplier;
    this.addScore(finalBonus, this.width / 2, 450, `BALL ${this.currentBall} BONUS: +${this.formatScore(finalBonus)}`);

    if (this.currentBall < this.maxBalls) {
      this.currentBall++;
      this.tiltCount = 0;
      this.isTilted = false;
      this.setTickerText(`BALL ${this.currentBall} OF ${this.maxBalls} // LAUNCH WHEN READY`);
      setTimeout(() => {
        if (this.state === 'PLAYING') {
          this.resetBallsForPlunge();
          this.updateHUD();
        }
      }, 1500);
    } else {
      // GAME OVER
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.state = 'GAMEOVER';
    this.audio.stopMusic();
    this.saveScoreToLeaderboard(this.score);

    document.getElementById('final-score-val').textContent = this.formatScore(this.score);
    document.getElementById('final-jackpots').textContent = this.stats.jackpots.toString();
    document.getElementById('final-loops').textContent = this.stats.rampLoops.toString();
    document.getElementById('final-bumpers').textContent = this.stats.bumperHits.toString();
    document.getElementById('final-spins').textContent = this.stats.spins.toString();

    this.updateLeaderboardUI();
    this.gameOverModal.classList.add('active');
  }

  saveScoreToLeaderboard(score) {
    try {
      const records = JSON.parse(localStorage.getItem('cyber_pinball_records') || '[]');
      records.push({
        score,
        date: new Date().toLocaleDateString()
      });
      records.sort((a, b) => b.score - a.score);
      const top5 = records.slice(0, 5);
      localStorage.setItem('cyber_pinball_records', JSON.stringify(top5));
    } catch (e) {}
  }

  updateLeaderboardUI() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    const records = JSON.parse(localStorage.getItem('cyber_pinball_records') || '[]');
    if (records.length === 0) {
      records.push(
        { score: 1000000, date: 'CYBER-ACE' },
        { score: 750000, date: 'MATRIX-99' },
        { score: 500000, date: 'NEO-PILOT' }
      );
    }
    records.slice(0, 5).forEach((rec, idx) => {
      const li = document.createElement('li');
      li.className = 'leaderboard-item';
      li.innerHTML = `<span>#${idx + 1} AGENT ${rec.date}</span> <strong>${this.formatScore(rec.score)} PTS</strong>`;
      list.appendChild(li);
    });
  }

  // ==========================================================================
  // PHYSICS UPDATE & COLLISION DETECTION
  // ==========================================================================
  update(dt) {
    if (this.state !== 'PLAYING') return;

    // Plunger charging
    if (this.isChargingPlunger) {
      this.plungerCharge = Math.min(1.0, this.plungerCharge + dt * 0.85);
      this.plungerFill.style.height = `${this.plungerCharge * 100}%`;
    }

    // Timers
    if (this.ballSaveTimer > 0) {
      this.ballSaveTimer -= dt;
      if (this.ballSaveTimer <= 0) {
        this.saveInd.classList.remove('active');
      } else {
        this.saveInd.classList.add('active');
      }
    }

    if (this.superBumpersTimer > 0) {
      this.superBumpersTimer -= dt;
    }

    if (this.isMultiballActive) {
      this.multiballTimer -= dt;
      if (this.multiballTimer <= 0) {
        // Multi-ball time expired, finish out active balls
        this.jackpotLit = false;
      }
    }

    if (this.isTilted) {
      this.tiltTimer -= dt;
      if (this.tiltTimer <= 0) {
        this.isTilted = false;
        this.tiltCount = 0;
      }
    }

    // Anti-Stuck Ball Watchdog
    for (const ball of this.balls) {
      if (ball.state === 'FREE') {
        const speedSq = ball.vx * ball.vx + ball.vy * ball.vy;
        if (speedSq < 400) { // moving very slowly (< 20 px/s)
          ball.stuckTime = (ball.stuckTime || 0) + dt;
          if (ball.stuckTime > 1.8) {
            // Apply gentle dislodge jiggle pulse
            ball.vx += (Math.random() - 0.5) * 220;
            ball.vy -= 180 + Math.random() * 100;
            this.fx.emit(ball.x, ball.y, 8, '#ffe600', 80);
            if (ball.stuckTime > 3.8) {
              // Full safe recovery to mid table
              ball.x = 270;
              ball.y = 580;
              ball.vx = (Math.random() - 0.5) * 100;
              ball.vy = 120;
              ball.stuckTime = 0;
              this.setTickerText('⚡ ANTI-STUCK DISLODGE PULSE ACTIVATED ⚡');
            }
          }
        } else {
          ball.stuckTime = 0;
        }
      } else {
        ball.stuckTime = 0;
      }
    }

    // Update Shooter Gate Flap Swing
    if (this.shooterGate.swing > 0) {
      this.shooterGate.swing = Math.max(0, this.shooterGate.swing - dt * 3.5);
    }

    // Update Spinner Rotation
    if (this.spinner.angularSpeed > 0) {
      const prevRev = Math.floor(this.spinner.angle / Math.PI);
      this.spinner.angle += this.spinner.angularSpeed * dt;
      const curRev = Math.floor(this.spinner.angle / Math.PI);
      if (curRev > prevRev) {
        this.stats.spins++;
        this.addScore(500);
        this.audio.playSpinnerTick(Math.min(1.5, this.spinner.angularSpeed / 30));
      }
      this.spinner.angularSpeed = Math.max(0, this.spinner.angularSpeed - dt * 25);
    }

    // Substep Physics Integration
    const subDt = dt / this.substeps;
    for (let step = 0; step < this.substeps; step++) {
      this.physicsSubstep(subDt);
    }

    // Update Particles
    this.fx.update(dt);

    // Update HUD
    this.updateHUD();
  }

  physicsSubstep(dt) {
    // Substep flipper angular rotation in lockstep with ball physics
    this.leftFlipper.update(dt);
    this.rightFlipper.update(dt);
    this.upperFlipper.update(dt);

    for (const ball of this.balls) {
      if (ball.state === 'DRAINED' || ball.state === 'LOCKED' || ball.state === 'PLUNGER') {
        continue;
      }

      if (ball.state === 'RAMP') {
        this.updateRampBall(ball, dt);
        ball.updateTrail();
        continue;
      }

      // 1. Gravity & Drag
      ball.vy += this.gravity * dt;
      ball.vx *= Math.pow(this.airDamping, dt * 60);
      ball.vy *= Math.pow(this.airDamping, dt * 60);

      // 2. Position Integration
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.updateTrail();

      // 3. Static Wall Collisions
      for (const wall of this.walls) {
        this.checkWallCollision(ball, wall);
      }

      // 3b. One-Way Shooter Lane Gate:
      // When ball is launched UP (vy < 0), it opens freely with zero resistance.
      // If a ball in play tries to fall back DOWN (vy > 0) into the shooter lane from above,
      // the spring gate deflects it leftwards into the active playfield.
      if (ball.x >= 492 && ball.x <= 538 && ball.y >= 165 && ball.y <= 215) {
        if (ball.vy < 0) {
          this.shooterGate.swing = 1.0;
        } else if (ball.vy > 0 && ball.y >= 175) {
          ball.x = 488;
          ball.vx = -Math.abs(ball.vx || 60) - 70;
          ball.vy = Math.max(80, ball.vy);
        }
      }

      // 4. Flipper Collisions
      this.checkFlipperCollision(ball, this.leftFlipper);
      this.checkFlipperCollision(ball, this.rightFlipper);
      this.checkFlipperCollision(ball, this.upperFlipper);

      // 5. Pop Bumpers
      for (const bumper of this.bumpers) {
        this.checkBumperCollision(ball, bumper);
      }

      // 6. Slingshots
      this.checkSlingshotCollision(ball, this.leftSling, 1);
      this.checkSlingshotCollision(ball, this.rightSling, -1);

      // 7. Drop Targets
      for (const dt of this.dropTargets) {
        if (!dt.dropped) {
          this.checkDropTargetCollision(ball, dt);
        }
      }

      // 8. Rollover Lanes
      for (const lane of this.topLanes) {
        this.checkTopLaneCollision(ball, lane);
      }

      // 9. Spinner Target
      this.checkSpinnerCollision(ball);

      // 10. Center Scoop Portal
      const scoopDist = dist(ball.x, ball.y, this.scoop.x, this.scoop.y);
      if (scoopDist < this.scoop.r + ball.radius && Math.abs(ball.vy) < 400) {
        this.handleScoopCapture(ball);
      }

      // 11. Ramp Entrances
      if (ball.vy < -40) {
        // Left ramp entrance check
        if (ball.x >= this.leftRamp.entrance.x1 && ball.x <= this.leftRamp.entrance.x2 &&
            Math.abs(ball.y - this.leftRamp.entrance.y1) < 22) {
          this.handleRampEntry(ball, this.leftRamp);
        }
        // Right ramp entrance check
        if (ball.x >= this.rightRamp.entrance.x1 && ball.x <= this.rightRamp.entrance.x2 &&
            Math.abs(ball.y - this.rightRamp.entrance.y1) < 22) {
          this.handleRampEntry(ball, this.rightRamp);
        }
      }

      // 12. Left Outlane Cyber-Save Kickback
      if (this.cyberSaveLit && ball.x < 70 && ball.y > 780 && ball.vy > 0) {
        this.audio.playBallSaved();
        this.flashScreen('rgba(5, 255, 161, 0.35)');
        this.fx.emit(ball.x, ball.y, 16, '#05ffa1', 150);
        this.addScore(25000, ball.x, ball.y, 'CYBER KICKBACK!');
        ball.vy = -680;
        ball.vx = 120;
        this.cyberSaveLit = false;
      }

      // 13. Drain Pit check
      if (ball.y > this.height + ball.radius * 2) {
        this.handleBallDrain(ball);
      }
    }
  }

  // --- COLLISION RESOLUTION FUNCTIONS ---

  checkWallCollision(ball, wall) {
    const cp = closestPointOnSegment(ball.x, ball.y, wall.x1, wall.y1, wall.x2, wall.y2);
    const d = dist(ball.x, ball.y, cp.x, cp.y);

    if (d < ball.radius) {
      let nx = (ball.x - cp.x) / (d || 1);
      let ny = (ball.y - cp.y) / (d || 1);

      // Positional fix
      const pen = ball.radius - d;
      ball.x += nx * pen;
      ball.y += ny * pen;

      // Normal and tangential velocities
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const bounce = wall.isRubber ? 0.72 : wall.bounce;
        ball.vx -= (1 + bounce) * vn * nx;
        ball.vy -= (1 + bounce) * vn * ny;
        if (wall.isRubber && Math.abs(vn) > 120) {
          this.audio.playSlingshot();
        }
      }
    }
  }

  checkFlipperCollision(ball, flipper) {
    const tip = flipper.getTip();
    const cp = closestPointOnSegment(ball.x, ball.y, flipper.pivotX, flipper.pivotY, tip.x, tip.y);
    const flipperR = flipper.r0 + (flipper.r1 - flipper.r0) * cp.t;
    const Rtotal = ball.radius + flipperR;

    // Normal pointing UPWARDS towards the playfield
    // For left flipper: (sin theta, -cos theta) has ny < 0
    // For right flippers: (-sin theta, cos theta) has ny < 0
    let nTopX, nTopY;
    if (flipper.side === 'left') {
      nTopX = Math.sin(flipper.angle);
      nTopY = -Math.cos(flipper.angle);
    } else {
      nTopX = -Math.sin(flipper.angle);
      nTopY = Math.cos(flipper.angle);
    }

    // Signed distance along the upward-facing normal from the flipper centerline
    const h = (ball.x - cp.x) * nTopX + (ball.y - cp.y) * nTopY;

    // Ball is touching or penetrating the flipper top surface (protected from falling through down into drain)
    if (h < Rtotal && h > -Rtotal * 2.2 && ball.y < 835) {
      // Positional fix: push ball cleanly onto the top surface
      const pen = Rtotal - h;
      ball.x += nTopX * pen;
      ball.y += nTopY * pen;

      // Contact point linear velocity from flipper rotation: V = omega x r
      const rx = cp.x - flipper.pivotX;
      const ry = cp.y - flipper.pivotY;
      const vFlipperX = -flipper.angularVelocity * ry;
      const vFlipperY = flipper.angularVelocity * rx;

      const vRelX = ball.vx - vFlipperX;
      const vRelY = ball.vy - vFlipperY;
      const vn = vRelX * nTopX + vRelY * nTopY;

      if (vn < 0) {
        const restitution = 0.5;
        ball.vx = vFlipperX + (vRelX - (1 + restitution) * vn * nTopX);
        ball.vy = vFlipperY + (vRelY - (1 + restitution) * vn * nTopY);

        // Active stroke boost when flipper flips up
        const isFlippingUp = (flipper.side === 'left' && flipper.angularVelocity < -2) ||
                             (flipper.side === 'right' && flipper.angularVelocity > 2);
        if (isFlippingUp) {
          const strokeSpeed = Math.abs(flipper.angularVelocity) * dist(0, 0, rx, ry);
          ball.vx += nTopX * strokeSpeed * 0.55;
          ball.vy += nTopY * strokeSpeed * 0.85;

          this.audio.playFlipperUp();
          this.fx.emit(cp.x, cp.y, 8, flipper.side === 'left' ? '#00f3ff' : '#ff007f', 110);
        }
      }
      return true;
    }
    return false;
  }

  checkBumperCollision(ball, bumper) {
    const d = dist(ball.x, ball.y, bumper.x, bumper.y);
    if (d < ball.radius + bumper.r) {
      let nx = (ball.x - bumper.x) / (d || 1);
      let ny = (ball.y - bumper.y) / (d || 1);

      // Positional separation
      const pen = (ball.radius + bumper.r) - d;
      ball.x += nx * pen;
      ball.y += ny * pen;

      // High explosive radial rebound
      const isSuper = this.superBumpersTimer > 0;
      const kickSpeed = isSuper ? 620 : 490;
      ball.vx = nx * kickSpeed;
      ball.vy = ny * kickSpeed;

      // Effects & Score
      bumper.pulse = 1.0;
      this.stats.bumperHits++;
      const pts = isSuper ? 5000 : 1000;
      this.addScore(pts, bumper.x, bumper.y, isSuper ? 'SUPER BUMPER: 5,000' : 'CORE HIT: 1,000');
      this.audio.playBumperHit(isSuper);
      this.fx.emit(bumper.x, bumper.y, 14, bumper.color, 140);
      this.fx.emitRing(bumper.x, bumper.y, bumper.color, 45);

      if (this.stats.bumperHits % 15 === 0) {
        this.superBumpersTimer = 20;
        this.setTickerText('⚡ SUPER BUMPERS ACTIVE (5,000 PTS) ⚡');
      }
    }
  }

  checkSlingshotCollision(ball, sling, dir) {
    // Face p3 -> p2 is the active front kicking surface
    const cp = closestPointOnSegment(ball.x, ball.y, sling.p3.x, sling.p3.y, sling.p2.x, sling.p2.y);
    const d = dist(ball.x, ball.y, cp.x, cp.y);

    if (d < ball.radius + 6) {
      // Slingshot outward normal (points up and towards table center)
      const nx = dir * 0.97;
      const ny = -0.24;

      // Positional fix to prevent clipping
      ball.x = cp.x + nx * (ball.radius + 8);
      ball.y = cp.y + ny * (ball.radius + 8);

      ball.vx = nx * 580;
      ball.vy = ny * 580;

      sling.pulse = 1.0;
      this.audio.playSlingshot();
      this.addScore(500, cp.x, cp.y);
      this.fx.emit(cp.x, cp.y, 10, '#ffe600', 120);
    }
  }

  checkDropTargetCollision(ball, dt) {
    if (dt.dropped) return;
    const targetRight = dt.x + dt.w;
    if (ball.x <= targetRight + ball.radius && ball.x >= dt.x - ball.radius &&
        ball.y >= dt.y - 2 && ball.y <= dt.y + dt.h + 2) {
      this.hitDropTarget(dt);
      ball.x = targetRight + ball.radius + 2;
      ball.vx = Math.abs(ball.vx) * 0.7 + 90;
    }
  }

  checkTopLaneCollision(ball, lane) {
    if (dist(ball.x, ball.y, lane.x, lane.y) < ball.radius + lane.r) {
      if (!lane.lit) {
        lane.lit = true;
        this.audio.playSlingshot();
        this.fx.emit(lane.x, lane.y, 8, '#ffe600', 70);

        // Check skill shot
        if (lane.id === this.skillShotLane && ball.vy > 0 && this.ballSaveTimer > 8) {
          this.addScore(50000, lane.x, lane.y, '🎯 SKILL SHOT! 50,000!');
          this.setTickerText('🎯 SKILL SHOT COMPLETED! 50,000 PTS 🎯');
          this.audio.playJackpot();
        } else {
          this.addScore(5000, lane.x, lane.y, `LANE ${lane.letter}`);
        }

        // Check if all lanes lit
        if (this.topLanes.every(l => l.lit)) {
          this.multiplier = Math.min(10, this.multiplier + 1);
          this.addScore(25000, 262, 100, `MULTIPLIER x${this.multiplier}!`);
          this.setTickerText(`★ MULTIPLIER ADVANCED TO x${this.multiplier}! ★`);
          setTimeout(() => {
            for (const l of this.topLanes) l.lit = false;
          }, 800);
        }
      }
    }
  }

  checkSpinnerCollision(ball) {
    if (ball.x >= this.spinner.x - this.spinner.w / 2 && ball.x <= this.spinner.x + this.spinner.w / 2 &&
        Math.abs(ball.y - this.spinner.y) < 14) {
      const speed = Math.abs(ball.vy);
      if (speed > 100) {
        this.spinner.angularSpeed = Math.min(65, this.spinner.angularSpeed + speed * 0.08);
      }
    }
  }

  updateHUD() {
    this.dmdScore.textContent = this.formatScore(this.score);
    this.dmdMult.textContent = `x${this.multiplier}`;
    this.dmdBall.textContent = `${this.currentBall} / ${this.maxBalls}`;

    // Update Indicators
    this.lockInd1.className = `dmd-pill lock-pill ${this.lockedBallsCount >= 1 ? 'active' : ''}`;
    this.lockInd2.className = `dmd-pill lock-pill ${this.lockedBallsCount >= 2 ? 'active' : ''}`;
    this.lockInd3.className = `dmd-pill lock-pill ${this.lockedBallsCount >= 3 ? 'active' : ''}`;

    this.multiballInd.className = `dmd-pill mode-pill ${this.isMultiballActive ? 'active' : ''}`;
    this.jackpotInd.className = `dmd-pill jackpot-pill ${this.jackpotLit ? 'active' : ''}`;
    this.saveInd.className = `dmd-pill save-pill ${this.ballSaveTimer > 0 ? 'active' : ''}`;
  }

  formatScore(val) {
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ==========================================================================
  // RENDERING PIPELINE
  // ==========================================================================
  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Table Floor Art (Neon PCB Traces & Cyber Grid)
    this.drawPlayfieldArt(ctx);

    // 2. Static Walls & Outer Guides
    this.drawWalls(ctx);
    this.drawShooterGate(ctx);

    // 3. Drop Targets & Rollovers
    this.drawDropTargets(ctx);
    this.drawTopLanes(ctx);

    // 4. Center Matrix Scoop
    this.drawScoop(ctx);

    // 5. Turbine Spinner
    this.drawSpinner(ctx);

    // 6. Pop Bumpers
    this.drawBumpers(ctx);

    // 7. Slingshots
    this.drawSlingshots(ctx);

    // 8. Elevated Ramps (with glowing rails and moving energy pulses)
    this.drawRamps(ctx);

    // 9. Flippers
    this.leftFlipper.draw(ctx);
    this.rightFlipper.draw(ctx);
    this.upperFlipper.draw(ctx);

    // 10. Plunger Spring Visual
    this.drawPlunger(ctx);

    // 11. Balls (with chromatic glow & comet trails)
    for (const ball of this.balls) {
      ball.draw(ctx);
    }

    // 12. Particles & Floating Scores
    this.fx.draw(ctx);

    // 13. Tilt Screen Strobe
    if (this.isTilted) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 80, 0.25)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.font = '900 36px Orbitron';
      ctx.fillStyle = '#ff0055';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 20;
      ctx.fillText('TILT!', this.width / 2, this.height / 2);
      ctx.restore();
    }
  }

  drawPlayfieldArt(ctx) {
    // Subtle background cyber grid
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Glowing Cyber PCB Traces on floor
    const pulseTime = performance.now() * 0.002;
    const glowAlpha = 0.3 + 0.15 * Math.sin(pulseTime);
    ctx.strokeStyle = `rgba(0, 243, 255, ${glowAlpha})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 8;

    // Left circuit trace
    ctx.beginPath();
    ctx.moveTo(60, 480);
    ctx.lineTo(120, 540);
    ctx.lineTo(120, 620);
    ctx.stroke();

    // Right circuit trace
    ctx.beginPath();
    ctx.moveTo(480, 480);
    ctx.lineTo(420, 540);
    ctx.lineTo(420, 620);
    ctx.stroke();

    // Center table emblem: Cyber Skull / Matrix Overdrive Octagon
    ctx.beginPath();
    ctx.arc(this.width / 2, 490, 45, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 0, 127, 0.3)';
    ctx.stroke();

    ctx.font = '700 10px Orbitron';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 0, 127, 0.6)';
    ctx.fillText('MATRIX CORE', this.width / 2, 494);

    ctx.restore();
  }

  drawWalls(ctx) {
    ctx.save();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;

    for (const wall of this.walls) {
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawBumpers(ctx) {
    for (const b of this.bumpers) {
      if (b.pulse > 0) b.pulse = Math.max(0, b.pulse - 0.05);

      ctx.save();
      const radius = b.r * (1 + b.pulse * 0.25);
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 15 + b.pulse * 25;

      // Outer ring
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = b.pulse > 0 ? '#fff' : 'rgba(15, 8, 30, 0.9)';
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3 + b.pulse * 3;
      ctx.stroke();

      // Inner glowing core
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();

      // Bumper name / Core indicator
      ctx.font = '900 8px Orbitron';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.name, b.x, b.y);

      ctx.restore();
    }
  }

  drawSlingshots(ctx) {
    const drawSling = (sling, color) => {
      if (sling.pulse > 0) sling.pulse = Math.max(0, sling.pulse - 0.05);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 + sling.pulse * 20;

      ctx.beginPath();
      ctx.moveTo(sling.p1.x, sling.p1.y);
      ctx.lineTo(sling.p2.x, sling.p2.y);
      ctx.lineTo(sling.p3.x, sling.p3.y);
      ctx.closePath();

      ctx.fillStyle = sling.pulse > 0 ? '#fff' : 'rgba(255, 230, 0, 0.15)';
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3 + sling.pulse * 2;
      ctx.stroke();

      ctx.restore();
    };

    drawSling(this.leftSling, '#ffe600');
    drawSling(this.rightSling, '#ffe600');
  }

  drawDropTargets(ctx) {
    for (const dt of this.dropTargets) {
      if (dt.dropped) continue;
      ctx.save();
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(dt.x, dt.y, dt.w, dt.h);

      ctx.font = '900 11px Orbitron';
      ctx.fillStyle = '#06020f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(dt.letter, dt.x + dt.w / 2, dt.y + dt.h / 2);
      ctx.restore();
    }
  }

  drawTopLanes(ctx) {
    for (const lane of this.topLanes) {
      ctx.save();
      const isLit = lane.lit;
      const color = isLit ? '#ffe600' : 'rgba(255, 230, 0, 0.25)';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = isLit ? 16 : 4;

      ctx.beginPath();
      ctx.arc(lane.x, lane.y, lane.r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.fillStyle = isLit ? 'rgba(255, 230, 0, 0.25)' : 'rgba(0, 0, 0, 0.4)';
      ctx.fill();
      ctx.stroke();

      ctx.font = '900 10px Orbitron';
      ctx.fillStyle = isLit ? '#fff' : '#888';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lane.letter, lane.x, lane.y);
      ctx.restore();
    }
  }

  drawScoop(ctx) {
    ctx.save();
    const isLit = this.matrixLockLit;
    const color = isLit ? '#00f3ff' : '#ff007f';
    const time = performance.now() * 0.003;

    ctx.shadowColor = color;
    ctx.shadowBlur = isLit ? 22 : 10;

    // Glowing Scoop Ring
    ctx.beginPath();
    ctx.arc(this.scoop.x, this.scoop.y, this.scoop.r, 0, Math.PI * 2);
    ctx.fillStyle = '#06020f';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Rotating neon vortex aperture
    ctx.beginPath();
    ctx.arc(this.scoop.x, this.scoop.y, this.scoop.r * 0.6, time, time + Math.PI * 1.5);
    ctx.strokeStyle = isLit ? '#fff' : color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text label
    ctx.font = '700 8px Orbitron';
    ctx.fillStyle = isLit ? '#00f3ff' : '#666';
    ctx.textAlign = 'center';
    ctx.fillText(isLit ? 'LOCK LIT' : 'SCOOP', this.scoop.x, this.scoop.y + 32);

    ctx.restore();
  }

  drawSpinner(ctx) {
    ctx.save();
    const w = this.spinner.w;
    const cosAngle = Math.cos(this.spinner.angle);
    const renderH = Math.max(2, Math.abs(cosAngle) * 16);

    ctx.translate(this.spinner.x, this.spinner.y);
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 10;

    ctx.fillStyle = cosAngle >= 0 ? '#00f3ff' : '#ff007f';
    ctx.fillRect(-w / 2, -renderH / 2, w, renderH);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2, -renderH / 2, w, renderH);

    ctx.restore();
  }

  drawRamps(ctx) {
    const drawRampTrack = (ramp, color) => {
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;

      // Draw wire rails
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.05) {
        let p;
        if (t < 0.5) p = cubicBezier(ramp.p0, ramp.p1, ramp.p2, ramp.p3, t * 2);
        else p = cubicBezier(ramp.p3, ramp.p4, ramp.p5, ramp.p5, (t - 0.5) * 2);

        if (t === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      // Moving energy pulses along ramp
      const time = (performance.now() * 0.0015) % 1.0;
      let pulsePos;
      if (time < 0.5) pulsePos = cubicBezier(ramp.p0, ramp.p1, ramp.p2, ramp.p3, time * 2);
      else pulsePos = cubicBezier(ramp.p3, ramp.p4, ramp.p5, ramp.p5, (time - 0.5) * 2);

      ctx.beginPath();
      ctx.arc(pulsePos.x, pulsePos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 16;
      ctx.fill();

      ctx.restore();
    };

    drawRampTrack(this.leftRamp, '#00f3ff');
    drawRampTrack(this.rightRamp, this.isMultiballActive ? '#ffe600' : '#ff007f');
  }

  drawPlunger(ctx) {
    ctx.save();
    const springLen = 35 + this.plungerCharge * 25;
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 8;

    // Coiled spring rendering
    ctx.beginPath();
    ctx.moveTo(this.plungerX, this.plungerY + springLen);
    const coils = 6;
    for (let i = 0; i < coils; i++) {
      const cy = this.plungerY + (i / coils) * springLen;
      const offset = (i % 2 === 0 ? 6 : -6);
      ctx.lineTo(this.plungerX + offset, cy);
    }
    ctx.lineTo(this.plungerX, this.plungerY);
    ctx.stroke();

    // Plunger head cap
    ctx.beginPath();
    ctx.arc(this.plungerX, this.plungerY, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.restore();
  }

  drawShooterGate(ctx) {
    ctx.save();
    const g = this.shooterGate;
    const swingAngle = -this.shooterGate.swing * 0.75; // swings upward when ball launches

    ctx.translate(g.x1, g.y1);
    ctx.rotate(swingAngle);

    ctx.strokeStyle = '#05ffa1';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#05ffa1';
    ctx.shadowBlur = 10;

    // Gate flap wire
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(40, -15);
    ctx.stroke();

    // Hinge pivot
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // One-way neon arrow icon
    if (this.shooterGate.swing < 0.25) {
      ctx.font = '700 9px Orbitron';
      ctx.fillStyle = '#05ffa1';
      ctx.textAlign = 'center';
      ctx.fillText('▲', 20, -10);
    }

    ctx.restore();
  }

  // ==========================================================================
  // MAIN ANIMATION LOOP
  // ==========================================================================
  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    requestAnimationFrame((t) => this.loop(t));
  }
}

// ============================================================================
// BOOTSTRAP INITIALIZATION ON PAGE LOAD
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  window.cyberPinball = new CyberPinballGame();
});
