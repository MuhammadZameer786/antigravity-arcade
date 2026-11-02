/**
 * STAR VOYAGER - 3D Procedural Space Flight Simulator
 * Built with Three.js & Web Audio API
 */

(function () {
  'use strict';

  // ============================================================================
  // AUDIO SYNTHESIZER ENGINE (Web Audio API)
  // ============================================================================
  class SpaceAudioEngine {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.engineOsc = null;
      this.engineGain = null;
      this.engineFilter = null;
      this.noiseNode = null;
      this.noiseGain = null;
      this.isInitialized = false;
    }

    init() {
      if (this.isInitialized) return;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        // 1. Continuous Sub-Light Engine Tone (Sawtooth + Lowpass Filter)
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
        this.engineFilter.Q.setValueAtTime(4, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.001, this.ctx.currentTime);

        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.ctx.destination);
        this.engineOsc.start();

        // 2. White Noise Thruster / Afterburner Generator
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        this.noiseNode = this.ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(350, this.ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

        this.noiseGain = this.ctx.createGain();
        this.noiseGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

        this.noiseNode.connect(noiseFilter);
        noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.ctx.destination);
        this.noiseNode.start();

        this.isInitialized = true;
      } catch (err) {
        console.warn('AudioContext not available yet:', err);
      }
    }

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    toggleMute() {
      this.isMuted = !this.isMuted;
      if (this.isMuted) {
        if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
        if (this.noiseGain) this.noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
      return this.isMuted;
    }

    updateEngineHum(speedRatio, isBoosting) {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;
      // Frequency rises with velocity
      const freq = 45 + speedRatio * 90 + (isBoosting ? 50 : 0);
      const filterFreq = 120 + speedRatio * 450 + (isBoosting ? 300 : 0);
      const gain = 0.04 + speedRatio * 0.08 + (isBoosting ? 0.05 : 0);

      this.engineOsc.frequency.setTargetAtTime(freq, t, 0.08);
      this.engineFilter.frequency.setTargetAtTime(filterFreq, t, 0.08);
      this.engineGain.gain.setTargetAtTime(gain, t, 0.08);

      const noiseVol = isBoosting ? 0.08 : (speedRatio > 0.1 ? 0.015 * speedRatio : 0.001);
      this.noiseGain.gain.setTargetAtTime(noiseVol, t, 0.05);
    }

    playLaser(isLeftWing) {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(950, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.14);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      if (panner) {
        panner.pan.setValueAtTime(isLeftWing ? -0.4 : 0.4, t);
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.ctx.destination);
      } else {
        osc.connect(gain);
        gain.connect(this.ctx.destination);
      }

      osc.start(t);
      osc.stop(t + 0.15);
    }

    playExplosion() {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;

      // 1. Sub Bass Punch
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + 0.4);
      oscGain.gain.setValueAtTime(0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.45);

      // 2. High Frequency Crunch / Noise
      const bufferSize = this.ctx.sampleRate * 0.35;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.frequency.linearRampToValueAtTime(150, t + 0.35);

      const nGain = this.ctx.createGain();
      nGain.gain.setValueAtTime(0.2, t);
      nGain.gain.linearRampToValueAtTime(0.001, t + 0.35);

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.ctx.destination);
      noise.start(t);
    }

    playOrePickup() {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const freq = notes[Math.floor(Math.random() * notes.length)];

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.18);

      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    }

    playWarpSound() {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;

      // Charge-up Pitch Rise
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(1800, t + 1.2);

      gain.gain.setValueAtTime(0.05, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 1.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.4);

      // Warp Exit Sonic Boom (delayed 1.2s)
      setTimeout(() => {
        if (!this.ctx || this.isMuted) return;
        const tb = this.ctx.currentTime;
        const boom = this.ctx.createOscillator();
        const boomGain = this.ctx.createGain();
        boom.type = 'sawtooth';
        boom.frequency.setValueAtTime(160, tb);
        boom.frequency.exponentialRampToValueAtTime(30, tb + 0.6);

        boomGain.gain.setValueAtTime(0.35, tb);
        boomGain.gain.exponentialRampToValueAtTime(0.001, tb + 0.7);

        boom.connect(boomGain);
        boomGain.connect(this.ctx.destination);
        boom.start(tb);
        boom.stop(tb + 0.75);
      }, 1200);
    }

    playShieldPing() {
      if (this.isMuted || !this.isInitialized || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.linearRampToValueAtTime(180, t + 0.1);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    }
  }

  // ============================================================================
  // PROCEDURAL TEXTURE GENERATORS
  // ============================================================================
  function createPlanetTexture(type) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    if (type === 'gas') {
      // Gas Giant Striations & Storm Swirls
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0.0, '#100a20');
      grad.addColorStop(0.2, '#3b1c66');
      grad.addColorStop(0.35, '#852d7e');
      grad.addColorStop(0.5, '#00d2ff');
      grad.addColorStop(0.65, '#6a188e');
      grad.addColorStop(0.85, '#2b094f');
      grad.addColorStop(1.0, '#0c0418');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Gas bands & turbulence
      ctx.globalAlpha = 0.25;
      for (let y = 0; y < 512; y += 4) {
        ctx.fillStyle = Math.random() > 0.5 ? '#00f3ff' : '#ff00aa';
        const wave = Math.sin(y * 0.05) * 40;
        ctx.fillRect(0, y + wave, 1024, 2 + Math.random() * 3);
      }

      // Great Storm Oval
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.ellipse(650, 310, 60, 32, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'moon') {
      // Cratered Terrestrial Moon
      ctx.fillStyle = '#141824';
      ctx.fillRect(0, 0, 1024, 512);

      // Noise speckles
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * 1024;
        const y = Math.random() * 512;
        const rad = Math.random() * 1.5;
        ctx.fillStyle = Math.random() > 0.5 ? '#33405c' : '#0a0d16';
        ctx.fillRect(x, y, rad, rad);
      }

      // Procedural craters
      for (let i = 0; i < 70; i++) {
        const cx = Math.random() * 1024;
        const cy = Math.random() * 512;
        const cr = 4 + Math.random() * 26;
        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0e1a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4a5b80';
        ctx.stroke();
      }
    } else {
      // Volcanic / Cyber Toxic World
      ctx.fillStyle = '#120308';
      ctx.fillRect(0, 0, 1024, 512);
      ctx.strokeStyle = '#ff3700';
      ctx.lineWidth = 3;
      // Glowing lava fissures
      for (let i = 0; i < 35; i++) {
        ctx.beginPath();
        let lx = Math.random() * 1024;
        let ly = Math.random() * 512;
        ctx.moveTo(lx, ly);
        for (let s = 0; s < 6; s++) {
          lx += (Math.random() - 0.5) * 90;
          ly += (Math.random() - 0.5) * 50;
          ctx.lineTo(lx, ly);
        }
        ctx.shadowColor = '#ff5500';
        ctx.shadowBlur = 10;
        ctx.stroke();
      }
    }

    return new THREE.CanvasTexture(canvas);
  }

  function createRingTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(512, 1);
    for (let i = 0; i < 512; i++) {
      const dist = i / 512; // 0 (inner) to 1 (outer)
      let alpha = 0;
      if (dist > 0.15 && dist < 0.95) {
        // Multi-frequency banded rings
        alpha = Math.sin(dist * Math.PI) * (0.4 + 0.6 * Math.sin(dist * 60));
        if (dist > 0.52 && dist < 0.58) alpha *= 0.1; // Cassini division gap
      }
      alpha = Math.max(0, Math.min(1, alpha));
      imgData.data[i * 4 + 0] = 0; // R
      imgData.data[i * 4 + 1] = 220; // G
      imgData.data[i * 4 + 2] = 255; // B
      imgData.data[i * 4 + 3] = Math.floor(alpha * 200);
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  // ============================================================================
  // PROCEDURAL 3D SPACESHIP BUILDER
  // ============================================================================
  function buildProceduralSpaceship() {
    const shipGroup = new THREE.Group();

    // High-tech stealth metallic materials
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      metalness: 0.85,
      roughness: 0.25,
      flatShading: true
    });

    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x00f3ff,
      emissive: 0x00a2cc,
      emissiveIntensity: 0.6,
      metalness: 0.5,
      roughness: 0.3
    });

    const darkTrimMat = new THREE.MeshStandardMaterial({
      color: 0x080a10,
      metalness: 0.9,
      roughness: 0.4
    });

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f3ff,
      metalness: 0.2,
      roughness: 0.1,
      transmission: 0.6,
      opacity: 0.9,
      transparent: true
    });

    // 1. Central Fuselage (Aerodynamic Arrow Wedge)
    const hullGeo = new THREE.ConeGeometry(1.6, 7.5, 5);
    hullGeo.rotateX(Math.PI / 2);
    hullGeo.scale(1, 0.45, 1);
    const fuselage = new THREE.Mesh(hullGeo, hullMat);
    shipGroup.add(fuselage);

    // 2. Cockpit Canopy Glass
    const canopyGeo = new THREE.SphereGeometry(0.7, 12, 10);
    canopyGeo.scale(0.7, 0.4, 2.2);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.45, 0.6);
    shipGroup.add(canopy);

    // 3. Main Swept Wings (Left & Right)
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(4.8, -2.4);
    wingShape.lineTo(4.4, -3.2);
    wingShape.lineTo(0.6, -1.8);
    wingShape.lineTo(0, -1.2);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.14, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);

    const rightWing = new THREE.Mesh(wingGeo, hullMat);
    rightWing.position.set(0.6, 0, 0.2);
    shipGroup.add(rightWing);

    const leftWing = rightWing.clone();
    leftWing.scale.set(-1, 1, 1);
    leftWing.position.set(-0.6, 0, 0.2);
    shipGroup.add(leftWing);

    // Wingtip Canards & Wing Trim Neon Accents
    const wingAccentGeo = new THREE.BoxGeometry(0.12, 0.1, 2.0);
    const rightTrim = new THREE.Mesh(wingAccentGeo, accentMat);
    rightTrim.position.set(4.6, 0.05, -2.6);
    rightTrim.rotation.y = 0.4;
    shipGroup.add(rightTrim);

    const leftTrim = rightTrim.clone();
    leftTrim.position.x = -4.6;
    leftTrim.rotation.y = -0.4;
    shipGroup.add(leftTrim);

    // 4. Twin Laser Cannons (Wing Emitters)
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.1, 2.2, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const rightCannon = new THREE.Mesh(cannonGeo, darkTrimMat);
    rightCannon.position.set(3.4, -0.05, -0.2);
    shipGroup.add(rightCannon);

    const leftCannon = rightCannon.clone();
    leftCannon.position.x = -3.4;
    shipGroup.add(leftCannon);

    // 5. Vertical Stabilizer Fins
    const finGeo = new THREE.BoxGeometry(0.1, 1.4, 1.8);
    finGeo.rotateX(0.2);
    const rightFin = new THREE.Mesh(finGeo, hullMat);
    rightFin.position.set(1.4, 0.8, -2.2);
    rightFin.rotation.z = -0.2;
    shipGroup.add(rightFin);

    const leftFin = new THREE.Mesh(finGeo, hullMat);
    leftFin.position.set(-1.4, 0.8, -2.2);
    leftFin.rotation.z = 0.2;
    shipGroup.add(leftFin);

    // 6. Dual Ion Engine Exhaust Nozzles
    const engineGeo = new THREE.CylinderGeometry(0.42, 0.55, 1.2, 12);
    engineGeo.rotateX(Math.PI / 2);
    const leftEngine = new THREE.Mesh(engineGeo, darkTrimMat);
    leftEngine.position.set(-0.85, 0, -3.2);
    shipGroup.add(leftEngine);

    const rightEngine = leftEngine.clone();
    rightEngine.position.x = 0.85;
    shipGroup.add(rightEngine);

    // 7. Dynamic Glowing Thruster Exhaust Flame Cones
    const flameGeo = new THREE.ConeGeometry(0.4, 2.4, 12);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-0.85, 0, -4.4);
    shipGroup.add(leftFlame);

    const rightFlame = leftFlame.clone();
    rightFlame.position.x = 0.85;
    shipGroup.add(rightFlame);

    // 8. Shield Impact Sphere (Visible during collision)
    const shieldGeo = new THREE.SphereGeometry(5.2, 16, 12);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00f3ff,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shipGroup.add(shieldMesh);

    return {
      group: shipGroup,
      leftFlame: leftFlame,
      rightFlame: rightFlame,
      flameMat: flameMat,
      shieldMesh: shieldMesh,
      shieldMat: shieldMat
    };
  }

  // ============================================================================
  // PROCEDURAL SPACE STATION (Starbase Alpha)
  // ============================================================================
  function buildSpaceStation() {
    const station = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x242e3d, metalness: 0.85, roughness: 0.25 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x05ffa1, blending: THREE.AdditiveBlending });
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x0044aa, metalness: 0.9, roughness: 0.1 });

    // Central Hub Spine
    const spineGeo = new THREE.CylinderGeometry(8, 8, 140, 16);
    const spine = new THREE.Mesh(spineGeo, metalMat);
    station.add(spine);

    // Huge Rotating Habitat Ring
    const torusGeo = new THREE.TorusGeometry(80, 5, 12, 48);
    const habitatRing = new THREE.Mesh(torusGeo, metalMat);
    habitatRing.rotation.x = Math.PI / 2;
    station.add(habitatRing);

    // 4 Connecting Spokes
    for (let i = 0; i < 4; i++) {
      const spokeGeo = new THREE.CylinderGeometry(2, 2, 80, 8);
      const spoke = new THREE.Mesh(spokeGeo, metalMat);
      spoke.rotation.z = (i * Math.PI) / 4;
      spoke.position.y = 0;
      station.add(spoke);
    }

    // Solar Panel Arrays
    for (let i = -1; i <= 1; i += 2) {
      const panelGeo = new THREE.BoxGeometry(45, 0.4, 18);
      const panel = new THREE.Mesh(panelGeo, solarMat);
      panel.position.set(i * 35, 50, 0);
      station.add(panel);
    }

    // Docking Bay Beacon Lights
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      const lightSphere = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), glowMat);
      lightSphere.position.set(Math.cos(a) * 80, 0, Math.sin(a) * 80);
      station.add(lightSphere);
    }

    station.position.set(300, 50, -600);
    return {
      group: station,
      ring: habitatRing
    };
  }

  // ============================================================================
  // MAIN SIMULATOR GAME CONTROLLER
  // ============================================================================
  class StarVoyagerSimulation {
    constructor() {
      this.container = document.getElementById('game-container');
      this.canvas = document.getElementById('webgl-canvas');
      this.radarCanvas = document.getElementById('radar-canvas');
      this.radarCtx = this.radarCanvas.getContext('2d');

      // Audio engine
      this.audio = new SpaceAudioEngine();

      // State
      this.isPlaying = false;
      this.isPaused = false;
      this.score = 0;
      this.oreHarvested = 0;
      this.sector = { x: 0, y: 0, z: 0 };
      this.cameraMode = 'chase'; // 'chase' or 'cockpit'
      this.shield = 100;

      // Flight Physics Variables
      this.speed = 0;
      this.maxCruiseSpeed = 120;
      this.maxBoostSpeed = 360;
      this.acceleration = 70;
      this.deceleration = 35;
      this.boostAvailable = 100;
      this.isBoosting = false;
      this.isThrottling = false;
      this.velocity = new THREE.Vector3();

      // Rotation inputs & rates
      this.pitchInput = 0;
      this.rollInput = 0;
      this.yawInput = 0;
      this.pitchRate = 1.35;
      this.rollRate = 1.85;
      this.yawRate = 0.95;

      // Weapons & Lasers
      this.lasers = [];
      this.lastFireTime = 0;
      this.fireRate = 160; // ms
      this.isLeftFire = false;

      // Hyperspace Warp
      this.warpCharge = 100;
      this.isWarping = false;
      this.warpTimer = 0;

      // Asteroids & Collectibles
      this.asteroids = [];
      this.oreCrystals = [];
      this.particles = [];

      // Target lock system
      this.targetedAsteroid = null;
      this.targetBracketEl = document.getElementById('target-bracket');
      this.targetLabelEl = document.getElementById('target-label');

      // Input Keys
      this.keys = {};

      // Setup Three.js
      this.initThree();
      this.buildWorld();
      this.initEvents();
      this.updateHUD();

      // Start loop
      this.lastFrameTime = performance.now();
      requestAnimationFrame((t) => this.animate(t));
    }

    initThree() {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;

      // Scene & Camera
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x020108, 0.00045);

      this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 10000);
      this.camera.position.set(0, 5, 14);

      // WebGL Renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;

      // Lighting: Warm Central Star Light + Deep Space Ambient
      const ambientLight = new THREE.AmbientLight(0x22334e, 1.2);
      this.scene.add(ambientLight);

      this.sunLight = new THREE.DirectionalLight(0xfff3d0, 2.2);
      this.sunLight.position.set(1000, 600, -1200);
      this.scene.add(this.sunLight);

      // Handle Resize
      window.addEventListener('resize', () => this.onWindowResize());
    }

    buildWorld() {
      // 1. Build Player Spaceship
      this.shipData = buildProceduralSpaceship();
      this.ship = this.shipData.group;
      this.scene.add(this.ship);

      // 2. Multi-Layered Infinite Starfield
      this.buildStarfield();

      // 3. High-Speed Space Dust Particle System
      this.buildSpaceDust();

      // 4. Volumetric Nebulae
      this.buildNebulae();

      // 5. Procedural Central Star (Sun)
      const sunGeo = new THREE.SphereGeometry(90, 32, 32);
      const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe899 });
      const sun = new THREE.Mesh(sunGeo, sunMat);
      sun.position.copy(this.sunLight.position);
      this.scene.add(sun);

      // Sun Corona Halo
      const coronaGeo = new THREE.SphereGeometry(120, 24, 24);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
      });
      const corona = new THREE.Mesh(coronaGeo, coronaMat);
      sun.add(corona);

      // 6. Procedural Celestial Planets
      this.buildPlanets();

      // 7. Procedural Space Station
      this.stationData = buildSpaceStation();
      this.scene.add(this.stationData.group);

      // 8. Procedural Asteroid Field
      this.populateAsteroidField(160);
    }

    buildStarfield() {
      const starGeo = new THREE.BufferGeometry();
      const starCount = 4500;
      const positions = new Float32Array(starCount * 3);
      const colors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount; i++) {
        // Distribute stars on a sphere far away
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);
        const r = 4000 + Math.random() * 800;

        const sinPhi = Math.sin(phi);
        positions[i * 3 + 0] = r * sinPhi * Math.cos(theta);
        positions[i * 3 + 1] = r * sinPhi * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        // Subtle color variations (cyan, electric blue, soft amber, white)
        const randColor = Math.random();
        if (randColor < 0.3) {
          colors[i * 3 + 0] = 0.5; colors[i * 3 + 1] = 0.85; colors[i * 3 + 2] = 1.0;
        } else if (randColor < 0.6) {
          colors[i * 3 + 0] = 1.0; colors[i * 3 + 1] = 0.8; colors[i * 3 + 2] = 0.6;
        } else {
          colors[i * 3 + 0] = 1.0; colors[i * 3 + 1] = 1.0; colors[i * 3 + 2] = 1.0;
        }
      }

      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const starMat = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: false
      });

      this.starField = new THREE.Points(starGeo, starMat);
      this.scene.add(this.starField);
    }

    buildSpaceDust() {
      const count = 1200;
      const dustGeo = new THREE.BufferGeometry();
      this.dustPositions = new Float32Array(count * 3);
      this.dustRange = 250;

      for (let i = 0; i < count; i++) {
        this.dustPositions[i * 3 + 0] = (Math.random() - 0.5) * this.dustRange;
        this.dustPositions[i * 3 + 1] = (Math.random() - 0.5) * this.dustRange;
        this.dustPositions[i * 3 + 2] = (Math.random() - 0.5) * this.dustRange;
      }

      dustGeo.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));

      const dustMat = new THREE.PointsMaterial({
        color: 0x00f3ff,
        size: 1.8,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.dustField = new THREE.Points(dustGeo, dustMat);
      this.scene.add(this.dustField);
    }

    buildNebulae() {
      // Create glowing colorful space cloud billboards
      const nebulaColors = [0x9d00ff, 0x0055ff, 0xff0066, 0x00f3ff];
      for (let i = 0; i < 4; i++) {
        const cloudGeo = new THREE.SphereGeometry(280 + Math.random() * 180, 16, 16);
        const cloudMat = new THREE.MeshBasicMaterial({
          color: nebulaColors[i],
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide
        });
        const cloud = new THREE.Mesh(cloudGeo, cloudMat);
        cloud.position.set(
          (Math.random() - 0.5) * 3000,
          (Math.random() - 0.5) * 1500,
          -1200 - Math.random() * 2000
        );
        this.scene.add(cloud);
      }
    }

    buildPlanets() {
      this.planets = [];

      // 1. Gas Giant with Planetary Rings (Planet Cygnus Prime)
      const gasGeo = new THREE.SphereGeometry(180, 36, 36);
      const gasTex = createPlanetTexture('gas');
      const gasMat = new THREE.MeshStandardMaterial({
        map: gasTex,
        roughness: 0.65,
        metalness: 0.1
      });
      const gasPlanet = new THREE.Mesh(gasGeo, gasMat);
      gasPlanet.position.set(-1100, 320, -1800);
      this.scene.add(gasPlanet);

      // Rings
      const ringGeo = new THREE.RingGeometry(220, 380, 64);
      const ringTex = createRingTexture();
      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2.3;
      ring.rotation.y = 0.2;
      gasPlanet.add(ring);

      this.planets.push({ mesh: gasPlanet, name: 'CYGNUS PRIME (GAS GIANT)', radius: 180 });

      // 2. Cratered Moon
      const moonGeo = new THREE.SphereGeometry(75, 28, 28);
      const moonTex = createPlanetTexture('moon');
      const moonMat = new THREE.MeshStandardMaterial({
        map: moonTex,
        roughness: 0.9,
        metalness: 0.15
      });
      const moon = new THREE.Mesh(moonGeo, moonMat);
      moon.position.set(750, -220, -1200);
      this.scene.add(moon);
      this.planets.push({ mesh: moon, name: 'AETHON-4 (BARREN MOON)', radius: 75 });
    }

    populateAsteroidField(count) {
      // Clear existing asteroids
      for (const ast of this.asteroids) {
        this.scene.remove(ast.mesh);
      }
      this.asteroids = [];

      const asteroidMats = [
        new THREE.MeshStandardMaterial({ color: 0x5a5460, roughness: 0.85, metalness: 0.25, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x3d4352, roughness: 0.7, metalness: 0.6, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: 0x463228, roughness: 0.95, metalness: 0.1, flatShading: true })
      ];

      for (let i = 0; i < count; i++) {
        // Procedural craggy rock geometry via perturbed icosahedron
        const radius = 5 + Math.random() * 24;
        const geo = new THREE.IcosahedronGeometry(radius, 1);
        const posAttr = geo.attributes.position;

        for (let v = 0; v < posAttr.count; v++) {
          const vx = posAttr.getX(v);
          const vy = posAttr.getY(v);
          const vz = posAttr.getZ(v);
          const noise = 1 + (Math.random() - 0.5) * 0.45;
          posAttr.setXYZ(v, vx * noise, vy * noise, vz * noise);
        }
        geo.computeVertexNormals();

        const mat = asteroidMats[Math.floor(Math.random() * asteroidMats.length)];
        const mesh = new THREE.Mesh(geo, mat);

        // Distribute in a toroidal ring around the center
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 950;
        const elevation = (Math.random() - 0.5) * 350;

        mesh.position.set(
          this.ship.position.x + Math.cos(angle) * dist,
          this.ship.position.y + elevation,
          this.ship.position.z + Math.sin(angle) * dist
        );

        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

        const rotSpeed = new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        );

        this.asteroids.push({
          mesh: mesh,
          radius: radius,
          hp: Math.ceil(radius / 8),
          maxHp: Math.ceil(radius / 8),
          rotSpeed: rotSpeed
        });

        this.scene.add(mesh);
      }
    }

    // ============================================================================
    // WEAPONS & LASERS
    // ============================================================================
    fireLasers() {
      const now = performance.now();
      if (now - this.lastFireTime < this.fireRate) return;
      this.lastFireTime = now;

      // Toggle between left and right wing cannons
      this.isLeftFire = !this.isLeftFire;
      const wingOffset = this.isLeftFire ? -3.4 : 3.4;

      // Laser Bolt Geometry & Glowing Material
      const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 6);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0xff007f,
        blending: THREE.AdditiveBlending
      });
      const bolt = new THREE.Mesh(laserGeo, laserMat);

      // Position at the active wing cannon tip in world space
      const localOrigin = new THREE.Vector3(wingOffset, -0.05, 1.8);
      localOrigin.applyQuaternion(this.ship.quaternion);
      bolt.position.copy(this.ship.position).add(localOrigin);
      bolt.quaternion.copy(this.ship.quaternion);

      // Projectile velocity: Forward along ship heading + ship velocity
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.quaternion);
      const boltVelocity = forward.multiplyScalar(450).add(this.velocity);

      this.lasers.push({
        mesh: bolt,
        velocity: boltVelocity,
        spawnTime: now,
        lifeTime: 1200 // ms
      });

      this.scene.add(bolt);
      this.audio.playLaser(this.isLeftFire);
    }

    destroyAsteroid(asteroid, index) {
      this.audio.playExplosion();
      this.showNotification('ASTEROID SHATTERED! +100 PTS');
      this.score += 100;

      // Explosion Debris Particles
      this.spawnDebris(asteroid.mesh.position, 18, 0xff7700);

      // Spawn Glowing Mineral Ore Crystals
      const oreCount = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < oreCount; i++) {
        this.spawnOreCrystal(asteroid.mesh.position);
      }

      // Remove asteroid from scene
      this.scene.remove(asteroid.mesh);
      this.asteroids.splice(index, 1);

      // Re-seed a distant asteroid to keep world populated
      setTimeout(() => {
        if (this.asteroids.length < 180) {
          this.populateAsteroidField(1);
        }
      }, 5000);
    }

    spawnDebris(pos, count, colorHex) {
      for (let i = 0; i < count; i++) {
        const pGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const pMat = new THREE.MeshBasicMaterial({
          color: colorHex || 0x00f3ff,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending
        });
        const p = new THREE.Mesh(pGeo, pMat);
        p.position.copy(pos);

        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * 45,
          (Math.random() - 0.5) * 45,
          (Math.random() - 0.5) * 45
        );

        this.particles.push({
          mesh: p,
          vel: vel,
          life: 0.8,
          maxLife: 0.8
        });
        this.scene.add(p);
      }
    }

    spawnOreCrystal(pos) {
      const oreGeo = new THREE.OctahedronGeometry(1.4, 0);
      const oreColors = [0x05ffa1, 0x00f3ff, 0xffd700, 0xff00ea];
      const color = oreColors[Math.floor(Math.random() * oreColors.length)];
      const oreMat = new THREE.MeshBasicMaterial({
        color: color,
        wireframe: false,
        blending: THREE.AdditiveBlending
      });
      const ore = new THREE.Mesh(oreGeo, oreMat);
      ore.position.copy(pos).add(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      ));

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );

      this.oreCrystals.push({
        mesh: ore,
        velocity: vel,
        value: 50
      });
      this.scene.add(ore);
    }

    // ============================================================================
    // HYPERSPACE WARP JUMP
    // ============================================================================
    triggerWarpJump() {
      if (this.isWarping || this.warpCharge < 100) return;
      this.isWarping = true;
      this.warpCharge = 0;
      this.audio.playWarpSound();
      this.showNotification('CHARGING HYPERDRIVE // FTL ENGAGED');

      const banner = document.getElementById('hud-alert');
      banner.style.borderColor = '#00f3ff';
      banner.style.boxShadow = '0 0 35px #00f3ff';

      // 1. Spool up phase (0s to 1.2s)
      let chargeTimer = 0;
      const chargeInterval = setInterval(() => {
        chargeTimer += 50;
        // FOV expands to warp vision
        if (this.camera.fov < 110) {
          this.camera.fov += 1.8;
          this.camera.updateProjectionMatrix();
        }
        if (chargeTimer >= 1200) {
          clearInterval(chargeInterval);
          this.executeWarpFlash();
        }
      }, 50);
    }

    executeWarpFlash() {
      // Warp forward by jumping coordinates into a new sector
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.quaternion);
      this.ship.position.add(forward.multiplyScalar(2200));

      // Increment sector coordinates
      this.sector.z += 1;
      this.sector.x += Math.floor((Math.random() - 0.5) * 3);
      this.sector.y += Math.floor((Math.random() - 0.5) * 2);

      // Re-populate new asteroid cluster for this sector
      this.populateAsteroidField(160);

      // Camera FOV smoothly returns to standard
      const fovReturn = setInterval(() => {
        if (this.camera.fov > 65) {
          this.camera.fov -= 2.5;
          this.camera.updateProjectionMatrix();
        } else {
          this.camera.fov = 65;
          this.camera.updateProjectionMatrix();
          this.isWarping = false;
          clearInterval(fovReturn);
          this.showNotification(`ENTERED SECTOR [${this.sector.x}, ${this.sector.y}, ${this.sector.z}]`);
        }
      }, 30);
    }

    // ============================================================================
    // FLIGHT PHYSICS & CONTROLS
    // ============================================================================
    updateFlight(delta) {
      if (!this.isPlaying || this.isPaused) return;

      // 1. Process Inputs
      let pitch = 0;
      let roll = 0;
      let yaw = 0;

      // Pitch (W / S or ArrowUp / ArrowDown)
      if (this.keys['KeyW'] || this.keys['ArrowDown']) pitch += 1; // Pull up
      if (this.keys['KeyS'] || this.keys['ArrowUp']) pitch -= 1;   // Push down

      // Roll (A / D or ArrowLeft / ArrowRight)
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) roll -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) roll += 1;

      // Yaw (Q / E)
      if (this.keys['KeyQ']) yaw += 1;
      if (this.keys['KeyE']) yaw -= 1;

      // Throttle (Spacebar / Shift)
      this.isThrottling = !!this.keys['Space'];
      this.isBoosting = !!this.keys['ShiftLeft'] || !!this.keys['ShiftRight'];

      if (this.isBoosting && this.boostAvailable > 5) {
        this.boostAvailable = Math.max(0, this.boostAvailable - delta * 35);
      } else {
        this.isBoosting = false;
        this.boostAvailable = Math.min(100, this.boostAvailable + delta * 20);
      }

      // Warp recharge
      if (this.warpCharge < 100 && !this.isWarping) {
        this.warpCharge = Math.min(100, this.warpCharge + delta * 8);
      }

      // 2. Angular Rotation with Quaternions (Gimbal-lock free)
      const qDelta = new THREE.Quaternion();
      const euler = new THREE.Euler(
        pitch * this.pitchRate * delta,
        yaw * this.yawRate * delta,
        -roll * this.rollRate * delta,
        'YXZ'
      );
      qDelta.setFromEuler(euler);
      this.ship.quaternion.multiply(qDelta);

      // 3. Velocity and Acceleration
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.quaternion);
      const targetMaxSpeed = this.isBoosting ? this.maxBoostSpeed : this.maxCruiseSpeed;

      if (this.isThrottling) {
        this.speed = Math.min(targetMaxSpeed, this.speed + this.acceleration * delta * (this.isBoosting ? 2.5 : 1));
      } else {
        // Space drift deceleration
        this.speed = Math.max(0, this.speed - this.deceleration * delta);
      }

      // Velocity smoothly follows ship orientation with subtle inertia drift
      const targetVelocity = forward.clone().multiplyScalar(this.speed);
      this.velocity.lerp(targetVelocity, delta * 3.5);
      this.ship.position.addScaledVector(this.velocity, delta);

      // 4. Thruster Visuals
      const flameScale = this.isBoosting ? 2.2 : (this.isThrottling ? 1.0 + Math.random() * 0.2 : 0.2);
      this.shipData.leftFlame.scale.set(1, 1, flameScale);
      this.shipData.rightFlame.scale.set(1, 1, flameScale);
      this.shipData.flameMat.color.setHex(this.isBoosting ? 0xff007f : 0x00f3ff);

      // Audio engine update
      this.audio.updateEngineHum(this.speed / this.maxCruiseSpeed, this.isBoosting);

      // 5. Fire lasers if F or Left Mouse held
      if (this.keys['KeyF'] || this.isMouseDown) {
        this.fireLasers();
      }
    }

    // ============================================================================
    // CAMERA & TARGETING
    // ============================================================================
    updateCamera(delta) {
      if (this.cameraMode === 'chase') {
        // Dynamic chase cam trailing behind ship with banking
        const offset = new THREE.Vector3(0, 4.2, -13.5);
        if (this.isBoosting) offset.z -= 3.0; // Pull back on afterburner

        offset.applyQuaternion(this.ship.quaternion);
        const targetCamPos = this.ship.position.clone().add(offset);
        this.camera.position.lerp(targetCamPos, delta * 8.0);

        // Look at a point slightly ahead of the ship
        const lookTarget = this.ship.position.clone().add(
          new THREE.Vector3(0, 0.8, 18).applyQuaternion(this.ship.quaternion)
        );
        this.camera.lookAt(lookTarget);
      } else {
        // 1st-Person Cockpit View
        const cockpitPos = this.ship.position.clone().add(
          new THREE.Vector3(0, 0.55, 0.8).applyQuaternion(this.ship.quaternion)
        );
        this.camera.position.copy(cockpitPos);

        const lookTarget = this.ship.position.clone().add(
          new THREE.Vector3(0, 0.55, 40).applyQuaternion(this.ship.quaternion)
        );
        this.camera.lookAt(lookTarget);
      }
    }

    updateTargetLock() {
      // Find nearest asteroid in front of the ship within view frustum
      let closestAst = null;
      let minDistance = 600; // max lock range
      const shipForward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ship.quaternion);

      for (const ast of this.asteroids) {
        const toAst = ast.mesh.position.clone().sub(this.ship.position);
        const dist = toAst.length();
        if (dist < minDistance) {
          toAst.normalize();
          const dot = shipForward.dot(toAst);
          if (dot > 0.82) { // In front of the ship
            minDistance = dist;
            closestAst = ast;
          }
        }
      }

      this.targetedAsteroid = closestAst;

      if (closestAst) {
        // Project 3D asteroid coordinates to 2D screen space
        const screenPos = closestAst.mesh.position.clone().project(this.camera);
        const widthHalf = this.container.clientWidth / 2;
        const heightHalf = this.container.clientHeight / 2;

        const x = screenPos.x * widthHalf + widthHalf;
        const y = -(screenPos.y * heightHalf) + heightHalf;

        if (screenPos.z < 1) { // In front of camera
          this.targetBracketEl.style.display = 'block';
          this.targetBracketEl.style.left = `${x}px`;
          this.targetBracketEl.style.top = `${y}px`;
          this.targetLabelEl.textContent = `TARGET // ${Math.round(minDistance)}m [HP ${closestAst.hp}/${closestAst.maxHp}]`;
        } else {
          this.targetBracketEl.style.display = 'none';
        }
      } else {
        this.targetBracketEl.style.display = 'none';
      }
    }

    // ============================================================================
    // PROJECTILES, COLLISIONS, & PARTICLES
    // ============================================================================
    updateProjectiles(delta) {
      const now = performance.now();

      // 1. Update Laser Bolts
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const laser = this.lasers[i];
        laser.mesh.position.addScaledVector(laser.velocity, delta);

        // Check collision against asteroids
        let hit = false;
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const ast = this.asteroids[j];
          const dist = laser.mesh.position.distanceTo(ast.mesh.position);
          if (dist < ast.radius + 1.5) {
            hit = true;
            ast.hp -= 1;
            this.spawnDebris(laser.mesh.position, 6, 0xff007f);
            if (ast.hp <= 0) {
              this.destroyAsteroid(ast, j);
            } else {
              this.audio.playShieldPing();
            }
            break;
          }
        }

        // Despawn laser after lifetime or hit
        if (hit || now - laser.spawnTime > laser.lifeTime) {
          this.scene.remove(laser.mesh);
          this.lasers.splice(i, 1);
        }
      }

      // 2. Update Space Dust Particles (Tied to ship coordinates)
      const dustPos = this.dustField.geometry.attributes.position.array;
      for (let i = 0; i < dustPos.length; i += 3) {
        // Check distance relative to ship
        const dx = dustPos[i] - this.ship.position.x;
        const dy = dustPos[i + 1] - this.ship.position.y;
        const dz = dustPos[i + 2] - this.ship.position.z;

        const halfRange = this.dustRange / 2;
        if (dx > halfRange) dustPos[i] -= this.dustRange;
        if (dx < -halfRange) dustPos[i] += this.dustRange;
        if (dy > halfRange) dustPos[i + 1] -= this.dustRange;
        if (dy < -halfRange) dustPos[i + 1] += this.dustRange;
        if (dz > halfRange) dustPos[i + 2] -= this.dustRange;
        if (dz < -halfRange) dustPos[i + 2] += this.dustRange;
      }
      this.dustField.geometry.attributes.position.needsUpdate = true;

      // Keep distant starfield centered on camera for infinite parallax
      this.starField.position.copy(this.camera.position);

      // 3. Update Asteroid Rotations
      for (const ast of this.asteroids) {
        ast.mesh.rotation.x += ast.rotSpeed.x * delta;
        ast.mesh.rotation.y += ast.rotSpeed.y * delta;
        ast.mesh.rotation.z += ast.rotSpeed.z * delta;

        // Player ship collision with asteroid
        const distToShip = ast.mesh.position.distanceTo(this.ship.position);
        if (distToShip < ast.radius + 3.2) {
          // Bounce ship back and deduct shield
          const bounce = this.ship.position.clone().sub(ast.mesh.position).normalize();
          this.ship.position.addScaledVector(bounce, 3.5);
          this.speed *= 0.35;
          this.shield = Math.max(0, this.shield - 15);
          this.audio.playExplosion();
          this.flashShield();
          this.showNotification('COLLISION DETECTED // SHIELDS IMPACTED');
        }
      }

      // 4. Update Space Station Rotation & Docking Proximity
      if (this.stationData) {
        this.stationData.ring.rotation.z += delta * 0.15;
        const distToStation = this.stationData.group.position.distanceTo(this.ship.position);
        if (distToStation < 90 && this.shield < 100) {
          this.shield = Math.min(100, this.shield + delta * 25);
          this.showNotification('ORBITAL STATION DOCK // SHIELDS RECHARGED');
        }
      }

      // 5. Update Ore Crystals (Tractor Beam Proximity)
      for (let i = this.oreCrystals.length - 1; i >= 0; i--) {
        const ore = this.oreCrystals[i];
        ore.mesh.rotation.x += delta * 2.0;
        ore.mesh.rotation.y += delta * 2.5;

        // Proximity tractor beam
        const dist = ore.mesh.position.distanceTo(this.ship.position);
        if (dist < 65) {
          // Magnetically pull towards ship
          const pull = this.ship.position.clone().sub(ore.mesh.position).normalize();
          ore.mesh.position.addScaledVector(pull, delta * 85);

          // Scoop up ore
          if (dist < 4.5) {
            this.oreHarvested += 1;
            this.score += ore.value;
            this.audio.playOrePickup();
            this.showNotification(`MINERAL RECOVERED +${ore.value} PTS`);
            this.scene.remove(ore.mesh);
            this.oreCrystals.splice(i, 1);
          }
        }
      }

      // 6. Update Debris Particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.life -= delta;
        p.mesh.position.addScaledVector(p.vel, delta);
        p.mesh.scale.setScalar(p.life / p.maxLife);
        if (p.life <= 0) {
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
        }
      }
    }

    flashShield() {
      this.shipData.shieldMat.opacity = 0.8;
      setTimeout(() => {
        if (this.shipData) this.shipData.shieldMat.opacity = 0.0;
      }, 180);
    }

    // ============================================================================
    // 2D RADAR DISPLAY
    // ============================================================================
    renderRadar() {
      const w = this.radarCanvas.width;
      const h = this.radarCanvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const radarScale = 0.09; // Scales 3D world to radar circle

      this.radarCtx.clearRect(0, 0, w, h);

      // Relative coordinates transform matrix to align with ship heading
      const shipInvRot = this.ship.quaternion.clone().invert();

      // 1. Draw Asteroids (Amber Blips)
      this.radarCtx.fillStyle = '#ffaa00';
      for (const ast of this.asteroids) {
        const relPos = ast.mesh.position.clone().sub(this.ship.position);
        relPos.applyQuaternion(shipInvRot);

        const rx = cx + relPos.x * radarScale;
        const ry = cy - relPos.z * radarScale;

        const dist = Math.hypot(rx - cx, ry - cy);
        if (dist < cx - 4) {
          this.radarCtx.beginPath();
          this.radarCtx.arc(rx, ry, 1.8, 0, Math.PI * 2);
          this.radarCtx.fill();
        }
      }

      // 2. Draw Ore Crystals (Magenta Blips)
      this.radarCtx.fillStyle = '#ff00ea';
      for (const ore of this.oreCrystals) {
        const relPos = ore.mesh.position.clone().sub(this.ship.position);
        relPos.applyQuaternion(shipInvRot);

        const rx = cx + relPos.x * radarScale;
        const ry = cy - relPos.z * radarScale;

        const dist = Math.hypot(rx - cx, ry - cy);
        if (dist < cx - 4) {
          this.radarCtx.beginPath();
          this.radarCtx.arc(rx, ry, 2.2, 0, Math.PI * 2);
          this.radarCtx.fill();
        }
      }

      // 3. Draw Celestial Bodies (Cyan Circles)
      this.radarCtx.strokeStyle = '#00f3ff';
      this.radarCtx.lineWidth = 1.5;
      for (const pl of this.planets) {
        const relPos = pl.mesh.position.clone().sub(this.ship.position);
        relPos.applyQuaternion(shipInvRot);

        const rx = cx + relPos.x * (radarScale * 0.12);
        const ry = cy - relPos.z * (radarScale * 0.12);

        const dist = Math.hypot(rx - cx, ry - cy);
        if (dist < cx - 4) {
          this.radarCtx.beginPath();
          this.radarCtx.arc(rx, ry, 4.5, 0, Math.PI * 2);
          this.radarCtx.stroke();
        }
      }

      // 4. Draw Space Station (Green Diamond)
      if (this.stationData) {
        const relPos = this.stationData.group.position.clone().sub(this.ship.position);
        relPos.applyQuaternion(shipInvRot);

        const rx = cx + relPos.x * (radarScale * 0.25);
        const ry = cy - relPos.z * (radarScale * 0.25);

        const dist = Math.hypot(rx - cx, ry - cy);
        if (dist < cx - 4) {
          this.radarCtx.fillStyle = '#05ffa1';
          this.radarCtx.beginPath();
          this.radarCtx.moveTo(rx, ry - 3);
          this.radarCtx.lineTo(rx + 3, ry);
          this.radarCtx.lineTo(rx, ry + 3);
          this.radarCtx.lineTo(rx - 3, ry);
          this.radarCtx.closePath();
          this.radarCtx.fill();
        }
      }
    }

    // ============================================================================
    // HUD TELEMETRY & UI
    // ============================================================================
    updateHUD() {
      // Velocity & Throttle Bar
      const speedVal = Math.round(this.speed);
      document.getElementById('val-speed').textContent = `${String(speedVal).padStart(3, '0')} KM/S`;
      const speedPct = Math.min(100, (this.speed / this.maxCruiseSpeed) * 100);
      document.getElementById('bar-speed').style.width = `${speedPct}%`;

      // Boost Bar
      document.getElementById('val-boost').textContent = `${Math.round(this.boostAvailable)}%`;
      document.getElementById('bar-boost').style.width = `${this.boostAvailable}%`;

      // Shields
      document.getElementById('val-shields').textContent = `${Math.round(this.shield)}%`;
      document.getElementById('val-shields').style.color = this.shield > 30 ? 'var(--neon-cyan)' : '#ff0055';

      // Sector & Cargo
      document.getElementById('hud-sector').textContent = `SEC [${this.sector.x}, ${this.sector.y}, ${this.sector.z}]`;
      document.getElementById('hud-ore').textContent = `${this.oreHarvested} CARGO`;
      document.getElementById('hud-score').textContent = `SCORE: ${String(this.score).padStart(5, '0')}`;

      // Warp Cooldown
      const warpStatusEl = document.getElementById('hud-warp-status');
      const warpCooldownEl = document.getElementById('hud-warp-cooldown');
      if (this.warpCharge >= 100) {
        warpStatusEl.textContent = 'READY [J]';
        warpStatusEl.style.color = 'var(--neon-cyan)';
        warpCooldownEl.textContent = '100% CHARGED';
      } else {
        warpStatusEl.textContent = 'CHARGING...';
        warpStatusEl.style.color = 'var(--neon-amber)';
        warpCooldownEl.textContent = `${Math.round(this.warpCharge)}% COMPLETE`;
      }

      // Camera Mode Indicator
      document.getElementById('val-cam-mode').textContent = this.cameraMode.toUpperCase();
    }

    showNotification(msg) {
      const alertEl = document.getElementById('hud-alert');
      alertEl.textContent = msg;
      alertEl.classList.add('visible');
      clearTimeout(this.alertTimeout);
      this.alertTimeout = setTimeout(() => {
        alertEl.classList.remove('visible');
      }, 2200);
    }

    // ============================================================================
    // INPUT HANDLERS & EVENTS
    // ============================================================================
    initEvents() {
      // Keyboard input
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;

        if (e.code === 'KeyM') {
          this.toggleAudio();
        } else if (e.code === 'KeyC') {
          this.toggleCamera();
        } else if (e.code === 'KeyJ') {
          this.triggerWarpJump();
        } else if (e.code === 'KeyP') {
          this.togglePause();
        }
      });

      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
      });

      // Mouse firing
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isMouseDown = true;
          this.fireLasers();
        }
      });

      window.addEventListener('mouseup', () => {
        this.isMouseDown = false;
      });

      // UI Buttons
      document.getElementById('btn-launch-game').addEventListener('click', () => {
        this.startGame();
      });

      document.getElementById('btn-resume-game').addEventListener('click', () => {
        this.togglePause();
      });

      document.getElementById('btn-pause').addEventListener('click', () => {
        this.togglePause();
      });

      document.getElementById('btn-camera').addEventListener('click', () => {
        this.toggleCamera();
      });

      document.getElementById('btn-audio').addEventListener('click', () => {
        this.toggleAudio();
      });

      document.getElementById('btn-pause-audio').addEventListener('click', () => {
        this.toggleAudio();
      });

      document.getElementById('btn-fullscreen').addEventListener('click', () => {
        this.toggleFullscreen();
      });

      // Mobile Touch Controls
      this.initTouchControls();
    }

    initTouchControls() {
      const stick = document.getElementById('touch-flight-stick');
      const btnFire = document.getElementById('touch-btn-fire');
      const btnBoost = document.getElementById('touch-btn-boost');
      const btnWarp = document.getElementById('touch-btn-warp');

      if (!stick) return;

      let touchStart = null;
      stick.addEventListener('touchstart', (e) => {
        touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        this.keys['Space'] = true; // Auto throttle on stick touch
      }, { passive: true });

      stick.addEventListener('touchmove', (e) => {
        if (!touchStart) return;
        const dx = e.touches[0].clientX - touchStart.x;
        const dy = e.touches[0].clientY - touchStart.y;
        this.keys['KeyA'] = dx < -20;
        this.keys['KeyD'] = dx > 20;
        this.keys['KeyW'] = dy < -20;
        this.keys['KeyS'] = dy > 20;
      }, { passive: true });

      stick.addEventListener('touchend', () => {
        touchStart = null;
        this.keys['KeyA'] = false;
        this.keys['KeyD'] = false;
        this.keys['KeyW'] = false;
        this.keys['KeyS'] = false;
        this.keys['Space'] = false;
      });

      if (btnFire) {
        btnFire.addEventListener('touchstart', () => { this.fireLasers(); }, { passive: true });
      }
      if (btnBoost) {
        btnBoost.addEventListener('touchstart', () => { this.keys['ShiftLeft'] = true; }, { passive: true });
        btnBoost.addEventListener('touchend', () => { this.keys['ShiftLeft'] = false; });
      }
      if (btnWarp) {
        btnWarp.addEventListener('touchstart', () => { this.triggerWarpJump(); }, { passive: true });
      }
    }

    startGame() {
      this.isPlaying = true;
      this.isPaused = false;
      this.audio.init();
      this.audio.resume();
      document.getElementById('modal-start').classList.remove('active');
      this.showNotification('SYSTEMS ONLINE // ENGINES ARMED');
    }

    togglePause() {
      if (!this.isPlaying) return;
      this.isPaused = !this.isPaused;
      const pauseModal = document.getElementById('modal-pause');
      if (this.isPaused) {
        pauseModal.classList.add('active');
      } else {
        pauseModal.classList.remove('active');
        this.audio.resume();
      }
    }

    toggleCamera() {
      this.cameraMode = this.cameraMode === 'chase' ? 'cockpit' : 'chase';
      this.showNotification(`CAMERA SWITCHED: ${this.cameraMode.toUpperCase()}`);
    }

    toggleAudio() {
      this.audio.init();
      const isMuted = this.audio.toggleMute();
      document.getElementById('btn-audio').textContent = isMuted ? '🔇' : '🔊';
      this.showNotification(isMuted ? 'AUDIO MUTED' : 'AUDIO ACTIVE');
    }

    toggleFullscreen() {
      if (!document.fullscreenElement) {
        this.container.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }

    onWindowResize() {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }

    // ============================================================================
    // MAIN SIMULATION LOOP
    // ============================================================================
    animate(timestamp) {
      requestAnimationFrame((t) => this.animate(t));

      const delta = Math.min(0.1, (timestamp - this.lastFrameTime) / 1000);
      this.lastFrameTime = timestamp;

      if (this.isPlaying && !this.isPaused) {
        this.updateFlight(delta);
        this.updateProjectiles(delta);
        this.updateCamera(delta);
        this.updateTargetLock();
        this.renderRadar();
        this.updateHUD();
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  // Auto-launch when page DOM is ready
  window.addEventListener('DOMContentLoaded', () => {
    window.game = new StarVoyagerSimulation();
  });
})();
