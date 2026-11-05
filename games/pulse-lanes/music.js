/* ==========================================================================
   PULSE LANES // music.js
   Synth: every sound is built live with Web Audio, nothing is loaded.
   Composer: turns a seed into a song, as two lists that share one clock:
   the sounds to play and the notes to hit. The notes come from the lead
   melody, so playing the chart is playing the tune.
   Player: schedules a song's sounds a little ahead on the audio clock.
   ========================================================================== */
(function (root) {
  'use strict';

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  const SCALES = {
    minor: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    major: [0, 2, 4, 5, 7, 9, 11],
  };

  // Chord roots as scale degrees, one chord per bar.
  const PROGRESSIONS = {
    minor: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 5, 6], [5, 6, 0, 0], [0, 5, 3, 4], [0, 2, 5, 6], [0, 3, 6, 2]],
    major: [[0, 4, 5, 3], [0, 5, 3, 4], [3, 4, 0, 5], [0, 3, 4, 3]],
  };

  const TRACKS = [
    { id: 'night-drive', name: 'NIGHT DRIVE', bpm: 100, key: 33, scale: 'minor', seed: 11021 },
    { id: 'glass-circuit', name: 'GLASS CIRCUIT', bpm: 112, key: 38, scale: 'dorian', seed: 22093 },
    { id: 'afterglow', name: 'AFTERGLOW', bpm: 118, key: 36, scale: 'major', seed: 33151 },
    { id: 'ultraviolet', name: 'ULTRAVIOLET', bpm: 126, key: 35, scale: 'minor', seed: 44267 },
    { id: 'static-bloom', name: 'STATIC BLOOM', bpm: 136, key: 40, scale: 'phrygian', seed: 55331 },
    { id: 'overclock', name: 'OVERCLOCK', bpm: 148, key: 37, scale: 'harmonic', seed: 66449 },
  ];

  const DAILY_WORDS = [
    ['NEON', 'CHROME', 'VELVET', 'SOLAR', 'HOLLOW', 'ELECTRIC', 'MIDNIGHT', 'CRYSTAL', 'PHANTOM', 'LUNAR', 'PRISM', 'DIGITAL'],
    ['TIDE', 'ECHO', 'DRIVE', 'HORIZON', 'SIGNAL', 'PULSE', 'MIRAGE', 'CASCADE', 'ORBIT', 'RUSH', 'DREAM', 'STATIC'],
  ];

  // The same track for everyone on a given date.
  function dailyTrack(dateStr) {
    const seed = hashString('pulse-lanes:' + dateStr);
    const r = mulberry32(seed);
    const pick = (list) => list[Math.floor(r() * list.length)];
    return {
      id: 'daily',
      name: pick(DAILY_WORDS[0]) + ' ' + pick(DAILY_WORDS[1]),
      bpm: 104 + Math.floor(r() * 36),
      key: 33 + Math.floor(r() * 12),
      scale: pick(['minor', 'dorian', 'phrygian', 'harmonic', 'minor', 'major']),
      seed: (seed ^ 0xa5a5a5) >>> 0,
    };
  }

  // How busy the melody is in each part of a song, which voice plays it,
  // and how often a long gap becomes a held note.
  const SECTION = {
    intro: { density: 0.15, voice: 'pluck', hold: 0.3 },
    verse: { density: 0.45, voice: 'lead', hold: 0.25 },
    build: { density: 0, voice: 'lead', hold: 0 },
    drop: { density: 0.85, voice: 'lead', hold: 0.15 },
    break: { density: 0.22, voice: 'pluck', hold: 0.6 },
    outro: { density: 0.25, voice: 'pluck', hold: 0.4 },
  };

  const FORM = [['intro', 4], ['verse', 8], ['build', 4], ['drop', 8], ['break', 4], ['drop', 8], ['outro', 4]];
  const ENDLESS_FORM = [['verse', 8], ['build', 4], ['drop', 8], ['break', 4]];

  // What each difficulty keeps from the melody.
  // grid: only notes on every Nth sixteenth. minGap: seconds between notes.
  // jack: seconds before the same lane can be used again.
  const DIFFS = {
    easy: { grid: 4, minGap: 0.4, jack: 0.55, minHold: 0.55, afterHold: 0.3, doubles: () => false },
    normal: { grid: 2, minGap: 0.2, jack: 0.3, minHold: 0.4, afterHold: 0.18, doubles: (s, k) => k === 'drop' && s % 16 === 0 },
    hard: {
      grid: 1, minGap: 0.095, jack: 0.19, minHold: 0.32, afterHold: 0.1,
      doubles: (s, k) => (k === 'drop' && s % 8 === 0) || (k === 'verse' && s % 16 === 0),
    },
  };

  const CHORD_TONES = [-3, 0, 2, 4, 7];
  const STEPS = [-2, -1, -1, 1, 1, 2, 3, -3, 0];
  const ROLL = [0, 1, 2, 3, 2, 1];

  function sortTail(arr, from) {
    const part = arr.splice(from).sort((a, b) => a.t - b.t);
    for (const x of part) arr.push(x);
  }

  class Composer {
    constructor(opts) {
      this.seed = opts.seed >>> 0;
      this.rng = mulberry32(this.seed);
      this.bpm = opts.bpm;
      this.baseBpm = opts.bpm;
      this.key = opts.key;
      this.baseKey = opts.key;
      this.scale = SCALES[opts.scale] || SCALES.minor;
      this.family = opts.scale === 'major' ? 'major' : 'minor';
      this.progression = this.pick(PROGRESSIONS[this.family]);
      this.diff = DIFFS[opts.difficulty] || DIFFS.normal;
      this.endless = !!opts.endless;
      this.events = [];
      this.notes = [];
      this.bars = [];
      this.marks = [];
      this.time = 0;
      this.bar = 0;
      this.cycle = 0;
      this.formIndex = 0;
      this.motifs = {};
      this.used = {};
      this.boost = 0;
      this.laneEnd = [-9, -9, -9, -9];
      this.lastT = -9;
      this.lastEnd = -9;
      this.lastMidi = 0;
      this.lastLane = 1;
      this.length = 0;
    }

    pick(list) {
      return list[Math.floor(this.rng() * list.length)];
    }

    get stepDur() {
      return 60 / this.bpm / 4;
    }

    // Semitones above the key for a scale degree (any integer).
    note(deg) {
      const o = Math.floor(deg / 7);
      return 12 * o + this.scale[((deg % 7) + 7) % 7];
    }

    // Chords on the 5th degree and up are voiced below the key instead.
    near(chord) {
      return chord >= 4 ? chord - 7 : chord;
    }

    bassMidi(chord) {
      let m = this.key + this.note(this.near(chord));
      while (m < 36) m += 12;
      while (m > 48) m -= 12;
      return m;
    }

    padMidi(deg) {
      let m = this.key + 24 + this.note(deg);
      while (m < 52) m += 12;
      while (m > 72) m -= 12;
      return m;
    }

    leadMidi(chord, deg) {
      const base = 60 + ((((this.key - 60) % 12) + 12) % 12);
      let m = base + this.note(this.near(chord) + deg);
      while (m < 55) m += 12;
      while (m > 88) m -= 12;
      return m;
    }

    build() {
      for (const [kind, bars] of FORM) this.section(kind, bars);
      this.length = this.time;
      return this;
    }

    // Endless runs add a section at a time. Every full cycle the tempo
    // rises, the key moves and the melodies are written again, busier.
    extend() {
      if (this.bar === 0) {
        this.section('intro', 4);
      } else {
        const [kind, bars] = ENDLESS_FORM[this.formIndex];
        this.section(kind, bars);
        this.formIndex++;
        if (this.formIndex >= ENDLESS_FORM.length) {
          this.formIndex = 0;
          this.cycle++;
          this.bpm = Math.min(this.baseBpm + 48, this.bpm + 6);
          this.key = this.baseKey + [0, 3, -2, 5, 2, -3][this.cycle % 6];
          this.progression = this.pick(PROGRESSIONS[this.family]);
          this.motifs = {};
          this.used = {};
          this.boost = Math.min(0.24, this.cycle * 0.06);
          this.events.push({ t: this.time, k: 'tempo', bpm: this.bpm });
        }
      }
      this.length = this.time;
      return this;
    }

    section(kind, bars) {
      const cfg = SECTION[kind];
      const sd = this.stepDur;
      const uses = (this.used[kind] = (this.used[kind] || 0) + 1);
      const e0 = this.events.length;
      const n0 = this.notes.length;
      this.marks.push({ t: this.time, kind, bar: this.bar });
      const barTimes = [];
      const chords = [];
      for (let b = 0; b < bars; b++) {
        const t = this.time;
        // A song ends on its home chord.
        const chord = kind === 'outro' && b === bars - 1 ? 0 : this.progression[this.bar % 4];
        barTimes.push(t);
        chords.push(chord);
        this.bars.push({ t, bpm: this.bpm, kind, n: this.bar, first: b === 0 });
        this.drumBar(kind, b, bars, t, sd);
        this.bassBar(kind, b, bars, chord, t, sd);
        this.padBar(kind, b, bars, chord, t, sd);
        this.time += sd * 16;
        this.bar++;
      }
      if (kind === 'build') this.buildLead(barTimes, chords, sd);
      else this.motifLead(kind, cfg, bars, uses, barTimes, chords, sd);
      sortTail(this.events, e0);
      sortTail(this.notes, n0);
    }

    drumBar(kind, b, bars, t, sd) {
      const ev = this.events;
      const last = b === bars - 1;
      const hit = (s, k, v, extra) => ev.push(Object.assign({ t: t + s * sd, k, v }, extra));
      switch (kind) {
        case 'intro':
          hit(0, 'kick', 0.8);
          for (let s = 2; s < 16; s += 4) hit(s, 'hat', 0.25);
          if (b >= bars - 2) hit(8, 'kick', 0.7);
          if (last) {
            hit(12, 'snare', 0.45);
            hit(14, 'snare', 0.6);
          }
          break;
        case 'verse':
          hit(0, 'kick', 0.9);
          hit(8, 'kick', 0.85);
          if (b % 2 === 1) hit(10, 'kick', 0.6);
          hit(4, 'snare', 0.7);
          hit(12, 'snare', 0.7);
          for (let s = 0; s < 16; s += 2) hit(s, 'hat', s % 4 === 2 ? 0.32 : 0.18);
          if (b % 2 === 1 && !last) hit(14, 'ohat', 0.25);
          if (last) {
            hit(14, 'snare', 0.5);
            hit(15, 'snare', 0.6);
          }
          break;
        case 'build': {
          const every = [4, 4, 2, 1][Math.min(3, Math.floor((b * 4) / bars))];
          for (let s = 0; s < 16; s += every) hit(s, 'snare', 0.3 + (0.45 * (b * 16 + s)) / (bars * 16));
          for (let s = 0; s < (last ? 12 : 16); s += 4) hit(s, 'kick', 0.85);
          for (let s = 0; s < 16; s += 2) hit(s, 'hat', 0.18);
          if (b === 0) hit(0, 'riser', 1, { d: bars * 16 * sd });
          break;
        }
        case 'drop':
          if (b === 0) hit(0, 'crash', 0.55);
          for (let s = 0; s < 16; s += 4) hit(s, 'kick', 1, { pump: true });
          hit(4, 'clap', 0.75);
          hit(12, 'clap', 0.75);
          for (let s = 0; s < 16; s++) {
            if (s % 4 === 2) hit(s, 'ohat', 0.26);
            else if (s % 4 !== 0) hit(s, 'hat', 0.15);
          }
          if (last) {
            hit(13, 'snare', 0.45);
            hit(14, 'snare', 0.55);
            hit(15, 'snare', 0.65);
          }
          break;
        case 'break':
          if (b === 0) hit(0, 'crash', 0.35);
          for (let s = 0; s < 16; s += 4) hit(s, 'hat', 0.14);
          if (last) [8, 10, 12, 13, 14, 15].forEach((s, i) => hit(s, 'snare', 0.3 + i * 0.07));
          break;
        case 'outro':
          if (last) {
            hit(0, 'kick', 0.9);
            hit(0, 'crash', 0.5);
            break;
          }
          hit(0, 'kick', 0.8);
          hit(8, 'kick', 0.7);
          hit(4, 'clap', 0.5);
          hit(12, 'clap', 0.5);
          for (let s = 2; s < 16; s += 4) hit(s, 'hat', 0.25);
          break;
      }
    }

    bassBar(kind, b, bars, chord, t, sd) {
      const root = this.bassMidi(chord);
      const play = (s, len, m, v) => this.events.push({ t: t + s * sd, k: 'bass', m, d: len * sd, v });
      switch (kind) {
        case 'intro':
          if (b >= bars / 2) {
            play(0, 7, root, 0.55);
            play(8, 7, root, 0.55);
          }
          break;
        case 'verse':
          for (let s = 0; s < 16; s += 2) play(s, 1.6, s % 8 === 6 ? root + 12 : root, 0.6);
          break;
        case 'build':
          for (let s = 0; s < (b === bars - 1 ? 12 : 16); s += 2) play(s, 1.4, root, 0.5 + (0.12 * b) / bars);
          break;
        case 'drop':
          // Rests on the kicks give the pumping synthwave bass.
          for (let s = 0; s < 16; s++) if (s % 4 !== 0) play(s, 0.85, s % 4 === 3 ? root + 12 : root, 0.62);
          break;
        case 'break':
          if (b === 0) play(0, 15, root, 0.4);
          break;
        case 'outro':
          if (b === bars - 1) play(0, 14, root, 0.65);
          else for (let s = 0; s < 16; s += 4) play(s, 3, root, 0.55);
          break;
      }
    }

    padBar(kind, b, bars, chord, t, sd) {
      const tones = [0, 2, 4].map((i) => this.padMidi(this.near(chord) + i));
      const ring = kind === 'outro' && b === bars - 1;
      const v = { intro: 0.75, verse: 0.6, build: 0.6, drop: 0.75, break: 0.95, outro: 0.7 }[kind];
      this.events.push({ t, k: 'pad', ms: tones, d: 16 * sd * (ring ? 1.6 : 1), v });
    }

    // A two-bar melody: strong beats almost always play and land on chord
    // tones, weaker steps fill in as the section gets busier.
    makeMotif(cfg) {
      const r = this.rng;
      const d = Math.min(0.97, cfg.density + this.boost);
      const steps = [];
      for (let s = 0; s < 32; s++) {
        let p;
        if (s % 16 === 0) p = 1;
        else if (s % 8 === 0) p = 0.55 + 0.4 * d;
        else if (s % 4 === 0) p = 0.3 + 0.6 * d;
        else if (s % 2 === 0) p = 0.65 * d - 0.05;
        else p = (d - 0.55) * 1.2;
        if (r() < p) steps.push(s);
      }
      const notes = [];
      let deg = [0, 2, 4][Math.floor(r() * 3)];
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        const gap = (i + 1 < steps.length ? steps[i + 1] : 32) - s;
        let len = Math.min(gap, 2);
        let hold = false;
        if (gap >= 6 && r() < cfg.hold) {
          len = gap - 2;
          hold = true;
        }
        if (i > 0) {
          const target = deg + STEPS[Math.floor(r() * STEPS.length)];
          if (s % 8 === 0) {
            let best = CHORD_TONES[0];
            for (const c of CHORD_TONES) if (Math.abs(c - target) < Math.abs(best - target)) best = c;
            deg = best;
          } else {
            deg = target;
          }
        }
        deg = Math.max(-2, Math.min(7, deg));
        notes.push({ s, len, hold, deg });
      }
      return notes;
    }

    // Repeats change a few weak notes so a phrase stays familiar but alive.
    vary(motif, amount) {
      const r = this.rng;
      return motif.map((n) => {
        if (n.s % 8 === 0 || r() > amount) return n;
        const shift = (r() < 0.5 ? -1 : 1) * (1 + Math.floor(r() * 2));
        return Object.assign({}, n, { deg: Math.max(-2, Math.min(7, n.deg + shift)) });
      });
    }

    motifLead(kind, cfg, bars, uses, barTimes, chords, sd) {
      let motif = this.motifs[kind];
      if (!motif) motif = this.motifs[kind] = this.makeMotif(cfg);
      const phrases = bars / 2;
      for (let p = 0; p < phrases; p++) {
        let m = motif;
        if (uses > 1) m = this.vary(m, 0.25);
        if (phrases > 1 && p === phrases - 1) m = this.vary(m, 0.5);
        const items = [];
        for (const n of m) {
          const bi = 2 * p + (n.s >= 16 ? 1 : 0);
          if (kind === 'outro' && bi === bars - 1) continue;
          items.push({
            t: barTimes[bi] + (n.s % 16) * sd,
            s: n.s % 16,
            midi: this.leadMidi(chords[bi], n.deg),
            dur: n.len * sd,
            hold: n.hold,
          });
        }
        if (kind === 'outro' && p === phrases - 1) {
          items.push({ t: barTimes[bars - 1], s: 0, midi: this.leadMidi(0, 0), dur: 12 * sd, hold: true, final: true });
        }
        for (const it of items) this.events.push({ t: it.t, k: cfg.voice, m: it.midi, d: it.dur, v: 1 });
        this.chart(items, kind);
      }
    }

    // Builds climb the chord in quarters, then eighths, then sixteenths,
    // and stop a beat early to leave a gap before the drop.
    buildLead(barTimes, chords, sd) {
      const bars = barTimes.length;
      const items = [];
      let i = 0;
      for (let b = 0; b < bars; b++) {
        const every = [4, 4, 2, 1][Math.min(3, Math.floor((b * 4) / bars))];
        for (let s = 0; s < 16; s += every) {
          if (b === bars - 1 && s >= 12) break;
          const deg = [0, 2, 4, 7][i % 4] + (Math.floor(i / 4) % 2) * 7;
          items.push({
            t: barTimes[b] + s * sd,
            s,
            midi: this.leadMidi(chords[b], deg),
            dur: Math.min(every, 2) * sd,
            hold: false,
            lane: every === 1 ? ROLL[i % ROLL.length] : i % 4,
          });
          i++;
        }
      }
      for (const it of items) this.events.push({ t: it.t, k: 'lead', m: it.midi, d: it.dur, v: 0.85 });
      this.chart(items, 'build');
    }

    // Turns melody notes into lane notes for the chosen difficulty. Higher
    // notes sit further right, and a lane is never asked for twice faster
    // than the difficulty allows.
    chart(items, kind) {
      const D = this.diff;
      if (!items.length) return;
      let lo = Infinity;
      let hi = -Infinity;
      for (const it of items) {
        lo = Math.min(lo, it.midi);
        hi = Math.max(hi, it.midi);
      }
      for (const it of items) {
        if (it.final) {
          const lanes = D === DIFFS.easy ? [1] : [1, 2];
          for (const l of lanes) this.pushNote(it.t, l, it.dur);
          this.lastT = it.t;
          continue;
        }
        if (it.s % D.grid !== 0) continue;
        if (it.t - this.lastT < D.minGap) continue;
        if (it.t - this.lastEnd < D.afterHold) continue;
        let base;
        if (it.lane !== undefined) base = it.lane;
        else if (hi > lo) base = Math.min(3, Math.floor(((it.midi - lo) / (hi - lo + 1)) * 4));
        else base = this.lastLane === 1 ? 2 : 1;
        let dir = it.midi > this.lastMidi ? 1 : it.midi < this.lastMidi ? -1 : 0;
        if (dir === 0) dir = base >= 2 ? -1 : 1;
        const lane = this.pickLane(base, dir, it.t, D.jack);
        if (lane < 0) continue;
        const dur = it.hold && it.dur >= D.minHold ? it.dur : 0;
        this.pushNote(it.t, lane, dur);
        if (dur > 0) this.lastEnd = it.t + dur;
        if (!dur && D.doubles(it.s, kind)) {
          const m = 3 - lane;
          if (it.t - this.laneEnd[m] >= D.jack) this.pushNote(it.t, m, 0);
        }
        this.lastT = it.t;
        this.lastMidi = it.midi;
        this.lastLane = lane;
      }
    }

    pickLane(base, dir, t, jack) {
      for (let k = 0; k < 4; k++) {
        const tries = k === 0 ? [base] : [base + dir * k, base - dir * k];
        for (const l of tries) if (l >= 0 && l < 4 && t - this.laneEnd[l] >= jack) return l;
      }
      return -1;
    }

    pushNote(t, lane, dur) {
      this.notes.push({ t, lane, dur });
      this.laneEnd[lane] = Math.max(this.laneEnd[lane], t + dur);
    }
  }

  // ------------------------------------------------------------------------
  // Synth
  // ------------------------------------------------------------------------
  class Synth {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.volume = 0.9;
    }

    ensure() {
      if (!this.ctx) {
        const AC = root.AudioContext || root.webkitAudioContext;
        if (!AC) return false;
        try {
          this.ctx = new AC({ latencyHint: 'interactive' });
        } catch (e) {
          this.ctx = new AC();
        }
        const c = this.ctx;
        this.master = c.createGain();
        this.master.gain.value = this.muted ? 0 : this.volume;
        this.tone = c.createBiquadFilter();
        this.tone.type = 'lowpass';
        this.tone.frequency.value = 20000;
        this.tone.Q.value = 0.5;
        this.comp = c.createDynamicsCompressor();
        this.comp.threshold.value = -16;
        this.comp.knee.value = 10;
        this.comp.ratio.value = 4;
        this.comp.attack.value = 0.004;
        this.comp.release.value = 0.2;
        this.master.connect(this.tone);
        this.tone.connect(this.comp);
        this.comp.connect(c.destination);
        this.sfx = c.createGain();
        this.sfx.gain.value = 0.8;
        this.sfx.connect(this.master);
        const buf = c.createBuffer(1, c.sampleRate, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
      }
      return true;
    }

    resume() {
      if (this.ctx && this.ctx.state !== 'running') return this.ctx.resume().catch(() => {});
      return Promise.resolve();
    }

    suspend() {
      if (this.ctx && this.ctx.state === 'running') return this.ctx.suspend().catch(() => {});
      return Promise.resolve();
    }

    get now() {
      return this.ctx ? this.ctx.currentTime : 0;
    }

    // Time from the audio clock to the speaker, as the browser reports it.
    get latency() {
      const c = this.ctx;
      if (!c) return 0;
      return (c.baseLatency || 0) + (c.outputLatency || 0);
    }

    setMuted(muted) {
      this.muted = muted;
      if (!this.master) return;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, t, 0.02);
    }

    powerDown() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const f = this.tone.frequency;
      f.cancelScheduledValues(t);
      f.setValueAtTime(f.value, t);
      f.exponentialRampToValueAtTime(110, t + 1.3);
    }

    powerUp() {
      if (!this.ctx) return;
      const f = this.tone.frequency;
      f.cancelScheduledValues(this.ctx.currentTime);
      f.value = 20000;
    }

    gain(v, dest) {
      const g = this.ctx.createGain();
      g.gain.value = v;
      if (dest) g.connect(dest);
      return g;
    }

    filter(type, freq, q, dest) {
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      if (dest) f.connect(dest);
      return f;
    }

    osc(type, freq, dest, detune) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      if (detune) o.detune.value = detune;
      if (dest) o.connect(dest);
      return o;
    }

    // One song's mixer. Ending a session fades it out and drops anything
    // it still had scheduled, so songs never overlap.
    session(bpm, level) {
      const out = this.gain(level === undefined ? 1 : level, this.master);
      const s = {
        out,
        drums: this.gain(0.9, out),
        bass: this.gain(0.5, out),
        pump: this.gain(1, out),
        duck: this.gain(1, out),
      };
      s.pad = this.gain(0.22, s.pump);
      s.lead = this.gain(0.34, s.duck);
      s.delay = this.ctx.createDelay(2);
      s.delay.delayTime.value = (0.75 * 60) / bpm;
      const tone = this.filter('lowpass', 2600, 0.3);
      const fb = this.gain(0.3);
      const wet = this.gain(0.3, out);
      s.duck.connect(s.delay);
      s.delay.connect(tone);
      tone.connect(fb);
      fb.connect(s.delay);
      tone.connect(wet);
      return s;
    }

    endSession(s, fade) {
      if (!s || !this.ctx) return;
      const t = this.ctx.currentTime;
      const f = fade === undefined ? 0.08 : fade;
      s.out.gain.cancelScheduledValues(t);
      s.out.gain.setValueAtTime(s.out.gain.value, t);
      s.out.gain.linearRampToValueAtTime(0, t + f);
      setTimeout(() => {
        try {
          s.out.disconnect();
        } catch (e) {}
      }, (f + 0.4) * 1000);
    }

    play(s, e, t) {
      switch (e.k) {
        case 'kick':
          this.kick(s.drums, t, e.v);
          if (e.pump) this.pumpAt(s, t);
          break;
        case 'snare':
          this.snare(s.drums, t, e.v);
          break;
        case 'clap':
          this.clap(s.drums, t, e.v);
          break;
        case 'hat':
          this.noiseHit(s.drums, t, 0.045, e.v * 0.6, 'highpass', 7800, 0.8);
          break;
        case 'ohat':
          this.noiseHit(s.drums, t, 0.26, e.v * 0.5, 'highpass', 7000, 0.8);
          break;
        case 'crash':
          this.noiseHit(s.drums, t, 1.7, e.v * 0.55, 'highpass', 4200, 0.6);
          break;
        case 'riser':
          this.riser(s.drums, t, e.d);
          break;
        case 'bass':
          this.bass(s.bass, t, e.m, e.d, e.v);
          break;
        case 'pad':
          this.pad(s.pad, t, e.ms, e.d, e.v);
          break;
        case 'lead':
          this.lead(s.lead, t, e.m, e.d, e.v);
          break;
        case 'pluck':
          this.pluck(s.lead, t, e.m, e.d, e.v);
          break;
        case 'click':
          this.click(s.drums, t, e.accent);
          break;
        case 'tempo':
          s.delay.delayTime.setValueAtTime((0.75 * 60) / e.bpm, t);
          break;
      }
    }

    noiseHit(dest, t, dur, v, type, freq, q) {
      const c = this.ctx;
      const n = c.createBufferSource();
      n.buffer = this.noiseBuf;
      const f = this.filter(type, freq, q);
      const g = this.gain(0);
      g.gain.setValueAtTime(v, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      n.connect(f);
      f.connect(g);
      g.connect(dest);
      n.start(t, Math.random() * 0.5);
      n.stop(t + dur + 0.02);
    }

    kick(dest, t, v) {
      const g = this.gain(0, dest);
      const o = this.osc('sine', 150, g);
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.11);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      o.start(t);
      o.stop(t + 0.36);
      this.noiseHit(dest, t, 0.014, v * 0.35, 'highpass', 1800, 1);
    }

    snare(dest, t, v) {
      this.noiseHit(dest, t, 0.18, v * 0.75, 'bandpass', 1900, 0.7);
      const g = this.gain(0, dest);
      const o = this.osc('triangle', 185, g);
      g.gain.setValueAtTime(v * 0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      o.start(t);
      o.stop(t + 0.1);
    }

    clap(dest, t, v) {
      const c = this.ctx;
      const n = c.createBufferSource();
      n.buffer = this.noiseBuf;
      const f = this.filter('bandpass', 1300, 1.1);
      const g = this.gain(0);
      for (let i = 0; i < 3; i++) {
        g.gain.setValueAtTime(v * 0.8, t + i * 0.011);
        g.gain.exponentialRampToValueAtTime(v * 0.1, t + i * 0.011 + 0.009);
      }
      g.gain.setValueAtTime(v * 0.7, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      n.connect(f);
      f.connect(g);
      g.connect(dest);
      n.start(t, Math.random() * 0.5);
      n.stop(t + 0.25);
    }

    riser(dest, t, dur) {
      const c = this.ctx;
      const n = c.createBufferSource();
      n.buffer = this.noiseBuf;
      n.loop = true;
      const f = this.filter('bandpass', 300, 3);
      f.frequency.setValueAtTime(300, t);
      f.frequency.exponentialRampToValueAtTime(7000, t + dur);
      const g = this.gain(0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + dur);
      g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
      n.connect(f);
      f.connect(g);
      g.connect(dest);
      n.start(t);
      n.stop(t + dur + 0.08);
    }

    bass(dest, t, m, d, v) {
      const f = mtof(m);
      const g = this.gain(0, dest);
      const lp = this.filter('lowpass', 1600, 4, g);
      lp.frequency.setValueAtTime(1600, t);
      lp.frequency.exponentialRampToValueAtTime(320, t + Math.min(0.18, d + 0.02));
      const saw = this.osc('sawtooth', f, lp);
      const subGain = this.gain(0.6, g);
      const sub = this.osc('sine', f, subGain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.setValueAtTime(v * 0.85, t + d);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.06);
      const end = t + d + 0.08;
      saw.start(t);
      sub.start(t);
      saw.stop(end);
      sub.stop(end);
    }

    pad(dest, t, ms, d, v) {
      const g = this.gain(0, dest);
      const lp = this.filter('lowpass', 1100, 0.4, g);
      const end = t + d + 0.7;
      for (const m of ms) {
        for (const det of [-9, 9]) {
          const o = this.osc('sawtooth', mtof(m), lp, det);
          o.start(t);
          o.stop(end);
        }
      }
      const peak = v * 0.16;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + 0.35);
      g.gain.setValueAtTime(peak, t + d);
      g.gain.exponentialRampToValueAtTime(0.001, end);
    }

    lead(dest, t, m, d, v) {
      const f = mtof(m);
      const g = this.gain(0, dest);
      const lp = this.filter('lowpass', 700, 2.5, g);
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.exponentialRampToValueAtTime(4200, t + 0.012);
      lp.frequency.exponentialRampToValueAtTime(1700, t + 0.25);
      const o1 = this.osc('sawtooth', f, lp, -6);
      const o2 = this.osc('sawtooth', f, lp, 6);
      const sqGain = this.gain(0.3, lp);
      const o3 = this.osc('square', f / 2, sqGain);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v, t + 0.006);
      g.gain.linearRampToValueAtTime(v * 0.7, t + Math.min(0.15, d));
      g.gain.setValueAtTime(v * 0.7, t + d);
      g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.09);
      const end = t + d + 0.1;
      const oscs = [o1, o2, o3];
      if (d > 0.35) {
        const lfo = this.osc('sine', 5.6);
        const depth = this.gain(0);
        depth.gain.setValueAtTime(0, t + 0.2);
        depth.gain.linearRampToValueAtTime(10, t + 0.45);
        lfo.connect(depth);
        depth.connect(o1.detune);
        depth.connect(o2.detune);
        oscs.push(lfo);
      }
      for (const o of oscs) {
        o.start(t);
        o.stop(end);
      }
    }

    pluck(dest, t, m, d, v) {
      const f = mtof(m);
      const g = this.gain(0, dest);
      const lp = this.filter('lowpass', 3200, 1, g);
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.3);
      const o1 = this.osc('triangle', f, lp);
      const shine = this.gain(0.18, lp);
      const o2 = this.osc('square', f * 2, shine);
      const ring = Math.max(0.32, Math.min(d + 0.25, 1.6));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(v * 1.1, t + 0.004);
      if (d > 0.4) {
        g.gain.exponentialRampToValueAtTime(v * 0.4, t + d);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25);
      } else {
        g.gain.exponentialRampToValueAtTime(0.001, t + ring);
      }
      const end = t + Math.max(ring, d + 0.27);
      o1.start(t);
      o2.start(t);
      o1.stop(end);
      o2.stop(end);
    }

    click(dest, t, accent) {
      const g = this.gain(0, dest);
      const o = this.osc('sine', accent ? 1760 : 1320, g);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      o.start(t);
      o.stop(t + 0.05);
    }

    pumpAt(s, t) {
      const p = s.pump.gain;
      p.setValueAtTime(0.35, t);
      p.linearRampToValueAtTime(1, t + 0.2);
    }

    // A miss cuts the melody out for a moment.
    duck(s) {
      if (!s || !this.ctx) return;
      const t = this.ctx.currentTime;
      const g = s.duck.gain;
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.12, t, 0.015);
      g.setTargetAtTime(1, t + 0.3, 0.08);
    }

    // Sounds that play now, outside any song.
    tick() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const g = this.gain(0, this.sfx);
      const o = this.osc('sine', 2400, g);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.025);
      o.start(t);
      o.stop(t + 0.03);
    }

    missSound() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const g = this.gain(0, this.sfx);
      const lp = this.filter('lowpass', 600, 1, g);
      const o = this.osc('sawtooth', 110, lp);
      o.frequency.exponentialRampToValueAtTime(70, t + 0.12);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.start(t);
      o.stop(t + 0.14);
    }

    select() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const g = this.gain(0, this.sfx);
      const o = this.osc('square', 880, g);
      o.frequency.setValueAtTime(880, t);
      o.frequency.setValueAtTime(1320, t + 0.03);
      g.gain.setValueAtTime(0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      o.start(t);
      o.stop(t + 0.09);
    }

    failSound() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const g = this.gain(0, this.sfx);
      const o = this.osc('sawtooth', 420, g);
      o.frequency.exponentialRampToValueAtTime(40, t + 1.1);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.start(t);
      o.stop(t + 1.25);
    }

    clearSound() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      [72, 76, 79, 84, 88].forEach((m, i) => {
        const g = this.gain(0, this.sfx);
        const o = this.osc('triangle', mtof(m), g);
        const at = t + i * 0.08;
        g.gain.setValueAtTime(0.0001, at);
        g.gain.linearRampToValueAtTime(0.16, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
        o.start(at);
        o.stop(at + 0.55);
      });
    }
  }

  // ------------------------------------------------------------------------
  // Player
  // ------------------------------------------------------------------------
  const LOOKAHEAD = 0.25;

  class Player {
    constructor(synth) {
      this.synth = synth;
      this.s = null;
      this.song = null;
      this.idx = 0;
      this.startAt = 0;
      this.loop = null;
    }

    // startAt is the audio-clock time of song time 0. A loop {from, to}
    // replays that stretch of the song, for menu previews.
    start(song, startAt, opts) {
      const o = opts || {};
      this.stop(0.05);
      this.song = song;
      this.startAt = startAt;
      this.loop = o.loop || null;
      this.s = this.synth.session(song.baseBpm || song.bpm, o.level);
      this.idx = this.loop ? this.indexAt(this.loop.from) : 0;
      if (this.loop) this.startAt -= this.loop.from;
      this.pump();
    }

    indexAt(t) {
      const ev = this.song.events;
      let lo = 0;
      let hi = ev.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (ev[mid].t < t) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    }

    pump() {
      if (!this.song || !this.s) return;
      const c = this.synth.ctx;
      const now = c.currentTime;
      const horizon = now + LOOKAHEAD;
      const ev = this.song.events;
      for (let guard = 0; guard < 4000; guard++) {
        if (this.loop && (this.idx >= ev.length || ev[this.idx].t >= this.loop.to)) {
          this.startAt += this.loop.to - this.loop.from;
          this.idx = this.indexAt(this.loop.from);
        }
        if (this.idx >= ev.length) break;
        const e = ev[this.idx];
        const when = this.startAt + e.t;
        if (when > horizon) break;
        if (when >= now - 0.03) this.synth.play(this.s, e, Math.max(when, now));
        this.idx++;
      }
    }

    stop(fade) {
      if (this.s) this.synth.endSession(this.s, fade);
      this.s = null;
      this.song = null;
      this.loop = null;
    }
  }

  const api = { Synth, Player, Composer, TRACKS, DIFFS, dailyTrack, hashString, mulberry32 };
  root.PulseMusic = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
