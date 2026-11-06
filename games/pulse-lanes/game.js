/* ==========================================================================
   PULSE LANES // game.js
   Four lanes on a perspective highway. Hits are judged against the audio
   clock using each key press or touch's own timestamp, so a slow frame
   never costs a hit.
   ========================================================================== */
(function () {
  'use strict';

  const { Synth, Player, Composer, TRACKS, dailyTrack, mulberry32 } = window.PulseMusic;

  const LANE_RGB = ['0, 243, 255', '255, 43, 214', '255, 43, 214', '0, 243, 255'];
  const KEYS = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3, ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3 };
  const KEY_LABELS = ['D', 'F', 'J', 'K'];
  // Seconds either side of a note. A press up to `early` before a note
  // that is outside `good` counts as a miss, so mashing doesn't pay.
  const WIN = { perfect: 0.045, great: 0.09, good: 0.135, early: 0.18 };
  const JUDGE = {
    perfect: { pts: 300, acc: 1, energy: 1.6, label: 'PERFECT', color: '#ffe600' },
    great: { pts: 200, acc: 0.75, energy: 1, label: 'GREAT', color: '#05ffa1' },
    good: { pts: 100, acc: 0.4, energy: 0.3, label: 'GOOD', color: '#00f3ff' },
    miss: { label: 'MISS', color: '#ff3355' },
  };
  const MISS_DRAIN = { easy: 5, normal: 7, hard: 8 };
  const DROP_DRAIN = 4;
  const HOLD_GRACE = 0.14;
  const HOLD_PTS = 150;
  const START_ENERGY = 50;
  const DIFF_NAMES = { easy: 'EASY', normal: 'NORMAL', hard: 'HARD' };
  const GRADES = [['S', 95], ['A', 90], ['B', 80], ['C', 70], ['D', 0]];
  const GRADE_RANK = { F: 0, D: 1, C: 2, B: 3, A: 4, S: 5 };
  const PULSE = { drop: 1, build: 0.7, verse: 0.5, intro: 0.35, outro: 0.35, break: 0.15 };
  const STORE = {
    settings: 'pulse_lanes_settings',
    records: 'pulse_lanes_records',
    daily: 'pulse_lanes_daily',
    endless: 'pulse_lanes_endless',
    high: 'pulse_lanes_highscore',
  };
  const PERSPECTIVE = 1.8;
  const CAL_BEAT = 0.5;
  const CAL_CLICKS = 24;
  const CAL_NEEDED = 12;

  // Seconds a note is on screen at each speed setting.
  const lookahead = (speed) => 2.4 * Math.pow(0.86, speed - 1);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function load(key, fallback) {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v && typeof v === 'object' ? v : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {}
  }

  function today() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // An input event's own time, on the same clock as performance.now().
  function eventTime(e) {
    const now = performance.now();
    const ts = e && e.timeStamp;
    return ts > 0 && Math.abs(ts - now) < 1000 ? ts : now;
  }

  function gradeFor(acc) {
    for (const [g, min] of GRADES) if (acc >= min) return g;
    return 'D';
  }

  function fmtOffset(ms) {
    return (ms > 0 ? '+' : '') + ms + ' MS';
  }

  function roundRect(g, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    g.beginPath();
    g.moveTo(x + rr, y);
    g.lineTo(x + w - rr, y);
    g.quadraticCurveTo(x + w, y, x + w, y + rr);
    g.lineTo(x + w, y + h - rr);
    g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    g.lineTo(x + rr, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - rr);
    g.lineTo(x, y + rr);
    g.quadraticCurveTo(x, y, x + rr, y);
    g.closePath();
  }

  // Maps page time to song time. The audio clock only moves in small
  // jumps, so the highest audio-minus-page reading seen is the closest to
  // the truth. Song time is what the player hears: the audio clock minus
  // the output delay the browser reports, minus the player's own offset.
  class SongClock {
    constructor(synth) {
      this.synth = synth;
      this.d = null;
      this.startAt = 0;
      this.offset = 0;
    }

    reset(startAt, offset) {
      this.startAt = startAt;
      this.offset = offset;
      this.d = null;
    }

    sync(now) {
      const ctx = this.synth.ctx;
      if (!ctx) return;
      const d = ctx.currentTime - now / 1000;
      if (this.d === null || d > this.d + 0.03 || d < this.d - 0.06) this.d = d;
      else if (d > this.d) this.d = d;
      else this.d -= 0.00003;
    }

    time(at) {
      if (this.d === null) return -99;
      return at / 1000 + this.d - this.startAt - this.synth.latency - this.offset;
    }
  }

  class PulseLanes {
    constructor() {
      this.canvas = document.getElementById('stage');
      this.g = this.canvas.getContext('2d');
      this.synth = new Synth();
      this.player = new Player(this.synth);
      this.clock = new SongClock(this.synth);

      const s = Object.assign(
        { speed: 5, offset: 0, hitSounds: true, difficulty: 'normal', track: TRACKS[0].id },
        load(STORE.settings, {})
      );
      s.speed = clamp(Math.round(Number(s.speed)) || 5, 1, 9);
      s.offset = clamp(Math.round(Number(s.offset)) || 0, -300, 300);
      s.hitSounds = s.hitSounds !== false;
      if (!DIFF_NAMES[s.difficulty]) s.difficulty = 'normal';
      this.settings = s;

      this.records = load(STORE.records, {});
      this.endlessBest = load(STORE.endless, {});
      this.dailyFor = today();
      this.dailyDef = dailyTrack(this.dailyFor);
      this.daily = load(STORE.daily, {});
      if (this.daily.date !== this.dailyFor) this.daily = { date: this.dailyFor };

      const ids = TRACKS.map((t) => t.id).concat(['daily', 'endless']);
      this.selected = ids.includes(s.track) ? s.track : TRACKS[0].id;
      this.levels = {};
      this.previews = {};
      this.previewing = false;
      this.previewBpm = 110;

      this.state = 'MENU';
      this.song = null;
      this.notes = [];
      this.stats = null;
      this.t = 0;
      this.laneDown = [0, 0, 0, 0];
      this.pointers = new Map();
      this.keysHeld = new Map();
      this.flash = [-1e9, -1e9, -1e9, -1e9];
      this.bursts = [];
      this.sparks = [];
      this.judgement = null;
      this.comboPop = -1e9;
      this.dropFlash = -1e9;
      this.usingTouch = window.matchMedia('(pointer: coarse)').matches;
      this.menuT0 = performance.now();
      this.lastFrame = performance.now();

      this.el = {};
      [
        'hud', 'progress-fill', 'score', 'mult', 'run-label', 'acc', 'energy-fill', 'audio-icon',
        'start-modal', 'settings-modal', 'calibrate-modal', 'pause-modal', 'result-modal', 'track-list',
        'speed-val', 'offset-val', 'btn-hitsounds', 'cal-pad', 'cal-status', 'btn-cal-save',
        'result-title', 'result-sub', 'result-grade', 'result-score', 'result-best', 'res-acc', 'res-combo',
        'res-perfect', 'res-great', 'res-good', 'res-miss', 'res-holds', 'res-timing', 'result-note',
        'btn-apply-offset',
      ].forEach((id) => (this.el[id] = document.getElementById(id)));
      this.hudCache = {};

      this.bindMenus();
      this.bindInput();
      this.resize();
      this.buildTrackList();
      this.selectDifficulty(this.settings.difficulty, true);
      this.renderSettings();
      if (location.hash === '#daily') this.featureDaily();

      window.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => this.onVisibility());
      setInterval(() => this.player.pump(), 25);
      requestAnimationFrame(() => this.frame());
    }

    // ----------------------------------------------------------------------
    // Menus
    // ----------------------------------------------------------------------
    bindMenus() {
      const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
      document.querySelectorAll('.level-btn').forEach((b) =>
        b.addEventListener('click', () => this.selectDifficulty(b.dataset.level))
      );
      this.el['track-list'].addEventListener('click', (e) => {
        const b = e.target.closest('.track');
        if (b) this.selectTrack(b.dataset.id);
      });
      on('btn-play', () => this.startRun());
      on('btn-settings', () => this.openModal('settings-modal'));
      on('btn-settings-done', () => this.openModal('start-modal'));
      on('speed-down', () => this.changeSpeed(-1));
      on('speed-up', () => this.changeSpeed(1));
      on('offset-down', () => this.changeOffset(-5));
      on('offset-up', () => this.changeOffset(5));
      on('btn-hitsounds', () => {
        this.settings.hitSounds = !this.settings.hitSounds;
        this.saveSettings();
        this.renderSettings();
      });
      on('btn-calibrate', () => this.openCalibrate());
      on('btn-cal-retry', () => this.openCalibrate());
      on('btn-cal-cancel', () => this.closeCalibrate());
      on('btn-cal-save', () => {
        if (this.calResult === undefined) return;
        this.settings.offset = this.calResult;
        this.saveSettings();
        this.renderSettings();
        this.closeCalibrate();
      });
      this.el['cal-pad'].addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.calTap(eventTime(e));
      });
      on('btn-audio', () => this.toggleMute());
      on('btn-pause', () => this.pause());
      on('btn-resume', () => this.resumeRun());
      on('btn-restart', () => this.startRun());
      on('btn-quit', () => this.toMenu());
      on('btn-retry', () => this.startRun());
      on('btn-result-menu', () => this.toMenu());
      on('btn-apply-offset', () => {
        if (this.suggestedOffset === undefined) return;
        this.settings.offset = this.suggestedOffset;
        this.saveSettings();
        this.renderSettings();
        this.el['btn-apply-offset'].hidden = true;
        this.el['result-note'].textContent = 'Offset set to ' + fmtOffset(this.settings.offset) + '.';
      });
    }

    openModal(id) {
      ['start-modal', 'settings-modal', 'calibrate-modal', 'pause-modal', 'result-modal'].forEach((m) =>
        this.el[m].classList.toggle('active', m === id)
      );
    }

    saveSettings() {
      save(STORE.settings, this.settings);
    }

    renderSettings() {
      this.el['speed-val'].textContent = this.settings.speed;
      this.el['offset-val'].textContent = fmtOffset(this.settings.offset);
      const hs = this.el['btn-hitsounds'];
      hs.textContent = this.settings.hitSounds ? 'ON' : 'OFF';
      hs.setAttribute('aria-pressed', String(this.settings.hitSounds));
    }

    changeSpeed(d) {
      this.settings.speed = clamp(this.settings.speed + d, 1, 9);
      this.saveSettings();
      this.renderSettings();
    }

    changeOffset(d) {
      this.settings.offset = clamp(this.settings.offset + d, -300, 300);
      this.saveSettings();
      this.renderSettings();
    }

    selectDifficulty(level, quiet) {
      if (!DIFF_NAMES[level]) return;
      this.settings.difficulty = level;
      document.querySelectorAll('.level-btn').forEach((b) => {
        const on = b.dataset.level === level;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', String(on));
      });
      if (!quiet) {
        this.saveSettings();
        if (this.synth.ctx) this.synth.select();
      }
      this.refreshTrackList();
    }

    trackDef(id) {
      if (id === 'daily') return this.dailyDef;
      return TRACKS.find((t) => t.id === id) || null;
    }

    // A rough level number from how many notes there are and how tightly
    // they bunch up.
    level(id, diff) {
      const key = id + ':' + diff;
      if (this.levels[key] === undefined) {
        const s = new Composer(Object.assign({}, this.trackDef(id), { difficulty: diff })).build();
        const n = s.notes;
        let peak = 0;
        for (let i = 0, j = 0; i < n.length; i++) {
          while (j < n.length && n[j].t < n[i].t + 2) j++;
          peak = Math.max(peak, (j - i) / 2);
        }
        this.levels[key] = clamp(Math.round((n.length / s.length) * 2 + peak * 0.5), 1, 15);
      }
      return this.levels[key];
    }

    buildTrackList() {
      const list = this.el['track-list'];
      list.textContent = '';
      const items = TRACKS.map((t) => ({ id: t.id, name: t.name }));
      items.push({ id: 'daily', name: 'DAILY // ' + this.dailyDef.name, cls: 'daily' });
      items.push({ id: 'endless', name: 'ENDLESS', cls: 'endless' });
      for (const it of items) {
        const b = document.createElement('button');
        b.className = 'track' + (it.cls ? ' ' + it.cls : '');
        b.dataset.id = it.id;
        b.setAttribute('role', 'option');
        b.innerHTML =
          '<span class="track-main"><span class="track-name"></span><span class="track-meta"></span></span>' +
          '<span class="track-best"><b class="track-grade"></b><small class="track-score"></small></span>';
        b.querySelector('.track-name').textContent = it.name;
        list.appendChild(b);
      }
    }

    refreshTrackList() {
      const d = this.settings.difficulty;
      for (const b of this.el['track-list'].children) {
        const id = b.dataset.id;
        const meta = b.querySelector('.track-meta');
        const grade = b.querySelector('.track-grade');
        const score = b.querySelector('.track-score');
        if (id === 'endless') {
          const best = this.endlessBest[d] || 0;
          meta.textContent = 'TEMPO CLIMBS UNTIL YOU DROP';
          grade.textContent = '';
          score.textContent = best ? 'BEST ' + best.toLocaleString() : 'NEW';
        } else {
          const def = this.trackDef(id);
          meta.textContent = def.bpm + ' BPM · LV ' + this.level(id, d) + (id === 'daily' ? ' · NEW EACH DAY' : '');
          const rec = id === 'daily' ? this.daily[d] : this.records[id] && this.records[id][d];
          grade.textContent = rec && rec.grade !== 'F' ? rec.grade : '';
          grade.className = 'track-grade grade-' + (rec ? rec.grade : '');
          if (!rec) score.textContent = 'NEW';
          else if (rec.grade === 'F') score.textContent = 'NOT CLEARED';
          else score.textContent = (rec.fc ? 'FC · ' : '') + rec.acc.toFixed(1) + '%';
        }
        const sel = id === this.selected;
        b.classList.toggle('selected', sel);
        b.setAttribute('aria-selected', String(sel));
      }
    }

    // Opened from the hub's Today panel: pick the Daily Track. Browsers only
    // start sound after a tap on this page, so PLAY still needs one.
    featureDaily() {
      this.selected = 'daily';
      this.refreshTrackList();
      const b = this.el['track-list'].querySelector('[data-id="daily"]');
      if (b) b.scrollIntoView({ block: 'nearest' });
    }

    // Tapping a track plays a loop of its first drop. Tapping it again
    // starts it.
    selectTrack(id) {
      if (this.state !== 'MENU') return;
      const again = id === this.selected && this.previewing;
      this.selected = id;
      this.settings.track = id;
      this.saveSettings();
      this.refreshTrackList();
      if (again) {
        this.startRun();
        return;
      }
      if (!this.synth.ensure()) return;
      this.synth.resume();
      this.synth.select();
      this.startPreview();
    }

    previewSong(id) {
      if (!this.previews[id]) {
        let c;
        if (id === 'endless') {
          c = new Composer({ seed: 7, bpm: 112, key: 36, scale: 'minor', difficulty: 'normal', endless: true });
          while (c.time < 70) c.extend();
        } else {
          c = new Composer(Object.assign({}, this.trackDef(id), { difficulty: 'normal' })).build();
        }
        this.previews[id] = c;
      }
      return this.previews[id];
    }

    startPreview() {
      if (!this.synth.ctx || this.state !== 'MENU') return;
      const song = this.previewSong(this.selected);
      const drop = song.marks.find((m) => m.kind === 'drop');
      const from = drop ? drop.t : 0;
      const to = from + (8 * 4 * 60) / song.baseBpm;
      this.synth.powerUp();
      this.player.start(song, this.synth.now + 0.08, { loop: { from, to }, level: 0.55 });
      this.previewing = true;
      this.previewBpm = song.baseBpm;
      this.menuT0 = performance.now();
    }

    stopPreview() {
      if (this.previewing) this.player.stop(0.2);
      this.previewing = false;
    }

    toggleMute() {
      this.synth.setMuted(!this.synth.muted);
      this.el['audio-icon'].textContent = this.synth.muted ? '🔇' : '🔊';
    }

    onVisibility() {
      if (document.hidden) {
        if (this.state === 'PLAYING' || this.state === 'COUNTDOWN') this.pause();
        else if (this.state === 'CALIBRATE') this.closeCalibrate();
        this.synth.suspend();
      } else if (this.state === 'MENU' && this.previewing) {
        this.synth.resume();
      }
    }

    // ----------------------------------------------------------------------
    // Calibration: tap along to clicks and the median error becomes the
    // offset. The first two taps are ignored while you find the beat.
    // ----------------------------------------------------------------------
    openCalibrate() {
      if (!this.synth.ensure()) return;
      this.synth.resume();
      this.synth.powerUp();
      this.stopPreview();
      this.state = 'CALIBRATE';
      this.calTaps = [];
      this.calResult = undefined;
      const events = [];
      for (let i = 0; i < CAL_CLICKS; i++) events.push({ t: i * CAL_BEAT, k: 'click', accent: i % 4 === 0 });
      const song = { events, bpm: 120, baseBpm: 120 };
      const startAt = this.synth.now + 0.8;
      this.player.start(song, startAt);
      this.clock.reset(startAt, 0);
      this.renderCalibrate();
      this.openModal('calibrate-modal');
    }

    closeCalibrate() {
      this.player.stop(0.05);
      this.state = 'MENU';
      this.openModal('settings-modal');
    }

    calTap(ts) {
      if (this.state !== 'CALIBRATE') return;
      this.clock.sync(performance.now());
      const t = this.clock.time(ts);
      const pad = this.el['cal-pad'];
      pad.classList.remove('hit');
      void pad.offsetWidth;
      pad.classList.add('hit');
      const k = Math.round(t / CAL_BEAT);
      if (k < 2 || k >= CAL_CLICKS) return;
      this.calTaps.push(t - k * CAL_BEAT);
      if (this.calTaps.length >= CAL_NEEDED) {
        const sorted = this.calTaps.slice().sort((a, b) => a - b);
        const mid = sorted[Math.floor(sorted.length / 2)];
        this.calResult = clamp(Math.round((mid * 1000) / 5) * 5, -300, 300);
      }
      this.renderCalibrate();
    }

    renderCalibrate(ended) {
      const n = this.calTaps ? this.calTaps.length : 0;
      const save = this.el['btn-cal-save'];
      if (this.calResult !== undefined) {
        this.el['cal-status'].textContent = 'MEASURED ' + fmtOffset(this.calResult) + ' FROM ' + n + ' TAPS';
        save.disabled = false;
        save.textContent = 'USE ' + fmtOffset(this.calResult);
      } else {
        this.el['cal-status'].textContent = ended
          ? 'NOT ENOUGH TAPS · START AGAIN'
          : Math.min(n, CAL_NEEDED) + ' / ' + CAL_NEEDED + ' TAPS';
        save.disabled = true;
        save.textContent = 'USE THIS OFFSET';
      }
    }

    // ----------------------------------------------------------------------
    // A run
    // ----------------------------------------------------------------------
    startRun() {
      if (!this.synth.ensure()) {
        this.el['run-label'].textContent = 'NO AUDIO IN THIS BROWSER';
        return;
      }
      this.synth.resume();
      this.synth.powerUp();
      this.stopPreview();
      this.player.stop(0.05);

      const diff = this.settings.difficulty;
      const id = this.selected;
      this.mode = id === 'endless' ? 'endless' : id === 'daily' ? 'daily' : 'track';
      let def;
      let song;
      if (this.mode === 'endless') {
        const r = mulberry32((Math.random() * 4294967296) >>> 0);
        def = {
          id: 'endless',
          name: 'ENDLESS',
          bpm: 112,
          key: 33 + Math.floor(r() * 8),
          scale: ['minor', 'dorian', 'phrygian', 'harmonic'][Math.floor(r() * 4)],
          seed: (r() * 4294967296) >>> 0,
        };
        song = new Composer(Object.assign({}, def, { difficulty: diff, endless: true }));
        while (song.time < 40) song.extend();
      } else {
        def = this.trackDef(id);
        song = new Composer(Object.assign({}, def, { difficulty: diff })).build();
      }
      this.def = def;
      this.diff = diff;
      this.song = song;
      this.notes = song.notes;
      this.initNotes(0);
      this.first = 0;
      this.barIdx = 0;
      this.markIdx = 0;
      this.stats = {
        score: 0, combo: 0, maxCombo: 0, perfect: 0, great: 0, good: 0, miss: 0,
        holds: 0, holdOk: 0, holdDrop: 0, judged: 0, accSum: 0, early: 0, late: 0,
        offSum: 0, offN: 0, energy: START_ENERGY,
      };
      this.shownScore = 0;
      this.hudCache = {};
      this.releaseAll();
      this.bursts.length = 0;
      this.sparks.length = 0;
      this.judgement = null;
      this.comboPop = -1e9;
      this.dropFlash = -1e9;

      // Count in with four clicks, and start early enough that the first
      // notes have time to travel down the highway.
      this.La = lookahead(this.settings.speed);
      const beat = 60 / song.baseBpm;
      let beats = 4;
      while (beats * beat < this.La + 1.2) beats += 4;
      this.beat0 = beat;
      this.leadBeats = beats;
      const startAt = this.synth.now + 0.15 + beats * beat;
      this.player.start(song, startAt);
      for (let i = 0; i < 4; i++) {
        this.synth.play(this.player.s, { k: 'click', accent: i === 0 }, startAt - (4 - i) * beat);
      }
      this.clock.reset(startAt, this.settings.offset / 1000);
      this.t = -beats * beat;
      this.state = 'PLAYING';
      this.openModal(null);
      this.el.hud.hidden = false;
      this.el.hud.classList.toggle('endless', this.mode === 'endless');
      this.updateHud();
    }

    initNotes(from) {
      for (let i = from; i < this.notes.length; i++) this.notes[i].st = 0;
    }

    releaseAll() {
      this.laneDown.fill(0);
      this.pointers.clear();
      this.keysHeld.clear();
    }

    updatePlay(t) {
      if (this.mode === 'endless' && this.song.time - t < 24) {
        const from = this.notes.length;
        this.song.extend();
        this.initNotes(from);
      }
      this.expire(t);
      this.checkHolds(t);
      while (this.first < this.notes.length) {
        const n = this.notes[this.first];
        if (n.st >= 2 && n.t + n.dur < t - 0.6) this.first++;
        else break;
      }
      const marks = this.song.marks;
      while (this.markIdx < marks.length && marks[this.markIdx].t <= t) {
        const m = marks[this.markIdx++];
        if (m.kind === 'drop' && t - m.t < 0.25) this.dropFlash = performance.now();
      }
      if (this.mode !== 'endless' && t > this.song.length + 0.3) this.finish(false);
    }

    // Notes that went past without a press.
    expire(t) {
      for (let i = this.first; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (n.t >= t - WIN.good) break;
        if (n.st === 0) this.miss(n);
        if (this.state !== 'PLAYING') return;
      }
    }

    checkHolds(t) {
      for (let i = this.first; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (n.t > t) break;
        if (n.st !== 1) continue;
        if (!this.laneDown[n.lane]) {
          if (t >= n.t + n.dur - HOLD_GRACE) this.completeHold(n);
          else this.dropHold(n);
        } else if (t >= n.t + n.dur) {
          this.completeHold(n);
        }
        if (this.state !== 'PLAYING') return;
      }
    }

    press(lane, ts) {
      this.flash[lane] = performance.now();
      if (this.state !== 'PLAYING') return;
      this.clock.sync(performance.now());
      const t = this.clock.time(ts);
      this.expire(t);
      if (this.state !== 'PLAYING') return;
      for (let i = this.first; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (n.t - t > WIN.early) break;
        if (n.lane !== lane || n.st !== 0) continue;
        const diff = t - n.t;
        if (diff < -WIN.good) this.miss(n);
        else this.hit(n, diff);
        return;
      }
    }

    release(lane, ts) {
      if (this.state !== 'PLAYING' || this.laneDown[lane] > 0) return;
      this.clock.sync(performance.now());
      const t = this.clock.time(ts);
      for (let i = this.first; i < this.notes.length; i++) {
        const n = this.notes[i];
        if (n.t > t + 0.05) break;
        if (n.lane !== lane || n.st !== 1) continue;
        if (t >= n.t + n.dur - HOLD_GRACE) this.completeHold(n);
        else this.dropHold(n);
        if (this.state !== 'PLAYING') return;
      }
    }

    multiplier() {
      const c = this.stats.combo;
      return c >= 60 ? 4 : c >= 30 ? 3 : c >= 10 ? 2 : 1;
    }

    credit(acc, pts, energy) {
      const S = this.stats;
      S.combo++;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      S.judged++;
      S.accSum += acc;
      S.score += pts * this.multiplier();
      S.energy = Math.min(100, S.energy + energy);
      if (S.combo % 50 === 0) this.comboPop = performance.now();
    }

    hit(n, diff) {
      const S = this.stats;
      const a = Math.abs(diff);
      const j = a <= WIN.perfect ? 'perfect' : a <= WIN.great ? 'great' : 'good';
      const J = JUDGE[j];
      S[j]++;
      S.offSum += diff;
      S.offN++;
      if (j !== 'perfect') {
        if (diff < 0) S.early++;
        else S.late++;
      }
      this.credit(J.acc, J.pts, J.energy);
      if (n.dur > 0) {
        n.st = 1;
        S.holds++;
      } else {
        n.st = 2;
      }
      this.show(j, j === 'perfect' ? 0 : diff < 0 ? -1 : 1);
      this.burst(n.lane, J.color, j === 'perfect' ? 14 : 9);
      if (this.settings.hitSounds) this.synth.tick();
    }

    miss(n) {
      const S = this.stats;
      n.st = 3;
      S.miss++;
      S.judged++;
      if (n.dur > 0) {
        S.holds++;
        S.holdDrop++;
        S.judged++;
      }
      S.combo = 0;
      this.show('miss', 0);
      this.synth.duck(this.player.s);
      if (this.settings.hitSounds) this.synth.missSound();
      this.drain(MISS_DRAIN[this.diff]);
    }

    completeHold(n) {
      n.st = 2;
      this.stats.holdOk++;
      this.credit(1, HOLD_PTS, 1);
      this.burst(n.lane, '#ffffff', 10);
    }

    dropHold(n) {
      const S = this.stats;
      n.st = 4;
      S.holdDrop++;
      S.judged++;
      S.combo = 0;
      this.show('miss', 0);
      this.synth.duck(this.player.s);
      this.drain(DROP_DRAIN);
    }

    drain(amount) {
      const S = this.stats;
      S.energy -= amount;
      if (S.energy <= 0) {
        S.energy = 0;
        this.fail();
      }
    }

    show(j, side) {
      this.judgement = { j, side, t0: performance.now() };
    }

    burst(lane, color, count) {
      const L = this.L;
      const x = L.cx + (lane - 1.5) * L.laneW;
      const now = performance.now();
      this.bursts.push({ x, y: L.hitY, color, t0: now });
      for (let i = 0; i < count; i++) {
        this.sparks.push({
          x: x + (Math.random() - 0.5) * L.laneW * 0.6,
          y: L.hitY,
          vx: (Math.random() - 0.5) * 320,
          vy: -180 - Math.random() * 420,
          life: 0.35 + Math.random() * 0.3,
          age: 0,
          color,
        });
      }
    }

    fail() {
      if (this.state !== 'PLAYING') return;
      this.state = 'FAILING';
      this.failAt = performance.now();
      this.releaseAll();
      this.synth.powerDown();
      this.synth.failSound();
      setTimeout(() => {
        if (this.state === 'FAILING') this.finish(true);
      }, 1700);
    }

    pause() {
      if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN') return;
      if (this.state === 'PLAYING') {
        this.pausedT = this.t;
        // Opening the menu mid-hold shouldn't cost the hold.
        for (let i = this.first; i < this.notes.length; i++) {
          const n = this.notes[i];
          if (n.t > this.t) break;
          if (n.st === 1) this.completeHold(n);
        }
      }
      this.state = 'PAUSED';
      this.releaseAll();
      this.synth.suspend();
      this.openModal('pause-modal');
    }

    // Three beats of countdown before the music picks up again.
    resumeRun() {
      if (this.state !== 'PAUSED') return;
      this.openModal(null);
      this.state = 'COUNTDOWN';
      this.resumeAt = performance.now() + 1500;
    }

    finishResume() {
      this.state = 'RESUMING';
      this.synth.resume().then(() => {
        this.clock.d = null;
        if (this.state === 'RESUMING') this.state = 'PLAYING';
      });
    }

    toMenu() {
      this.player.stop(0.15);
      this.synth.powerUp();
      this.state = 'MENU';
      this.el.hud.hidden = true;
      this.releaseAll();
      this.refreshTrackList();
      this.openModal('start-modal');
      if (this.synth.ctx) {
        this.synth.resume();
        this.startPreview();
      }
    }

    finish(failed) {
      const S = this.stats;
      this.state = 'RESULT';
      this.player.stop(failed ? 0.3 : 1.5);
      if (!failed) this.synth.clearSound();
      this.el.hud.hidden = true;

      const endless = this.mode === 'endless';
      const acc = S.judged ? (S.accSum / S.judged) * 100 : 0;
      const cleared = !failed && !endless;
      const fc = cleared && S.miss === 0 && S.holdDrop === 0;
      const allPerfect = fc && S.great === 0 && S.good === 0;
      const grade = failed && !endless ? 'F' : gradeFor(acc);
      const best = this.saveRecord(acc, grade, fc, cleared);
      // The arcade's Today panel and daily streak read this shared log. A
      // cleared run beats a failed one, then the higher score wins.
      if (this.mode === 'daily' && window.ArcadeDaily) {
        window.ArcadeDaily.record(
          'pulse-lanes',
          { score: S.score, grade, acc: Math.round(acc * 100) / 100, diff: this.diff, cleared, fc, track: this.def.name, rank: (cleared ? 1e9 : 0) + S.score },
          this.dailyFor
        );
      }

      let title = 'TRACK CLEAR';
      if (endless) title = 'RUN OVER';
      else if (failed) title = 'SIGNAL LOST';
      else if (allPerfect) title = 'ALL PERFECT';
      else if (fc) title = 'FULL COMBO';
      const titleEl = this.el['result-title'];
      titleEl.textContent = title;
      titleEl.className = 'title ' + (failed && !endless ? 'lose' : 'win');

      const bar = this.song.bars[Math.min(this.barIdx, this.song.bars.length - 1)];
      this.el['result-sub'].textContent = endless
        ? DIFF_NAMES[this.diff] + ' // REACHED ' + bar.bpm + ' BPM'
        : this.def.name + ' // ' + DIFF_NAMES[this.diff];
      const gradeEl = this.el['result-grade'];
      gradeEl.textContent = grade;
      gradeEl.className = 'grade grade-' + grade;
      this.el['result-score'].textContent = S.score.toLocaleString();
      this.el['result-best'].hidden = !best;
      this.el['res-acc'].textContent = acc.toFixed(2) + '%';
      this.el['res-combo'].textContent = S.maxCombo;
      this.el['res-perfect'].textContent = S.perfect;
      this.el['res-great'].textContent = S.great;
      this.el['res-good'].textContent = S.good;
      this.el['res-miss'].textContent = S.miss;
      this.el['res-holds'].textContent = S.holdOk + ' / ' + S.holds;
      this.el['res-timing'].textContent = S.early + ' / ' + S.late;

      // If hits lean one way, offer to move the offset to match.
      let note = '';
      this.suggestedOffset = undefined;
      if (S.offN >= 20) {
        const mean = (S.offSum / S.offN) * 1000;
        if (Math.abs(mean) >= 15) {
          const next = clamp(this.settings.offset + Math.round(mean / 5) * 5, -300, 300);
          if (next !== this.settings.offset) {
            note = 'Your hits were ' + Math.round(Math.abs(mean)) + ' ms ' + (mean > 0 ? 'late' : 'early') + ' on average.';
            this.suggestedOffset = next;
          }
        }
      }
      this.el['result-note'].textContent = note;
      const apply = this.el['btn-apply-offset'];
      apply.hidden = this.suggestedOffset === undefined;
      if (!apply.hidden) apply.textContent = 'SET OFFSET TO ' + fmtOffset(this.suggestedOffset);
      this.openModal('result-modal');
    }

    saveRecord(acc, grade, fc, cleared) {
      const S = this.stats;
      const d = this.diff;
      let best = false;
      if (this.mode === 'endless') {
        const prev = this.endlessBest[d] || 0;
        if (S.score > prev) {
          this.endlessBest[d] = S.score;
          save(STORE.endless, this.endlessBest);
          best = true;
        }
      } else {
        let bucket;
        if (this.mode === 'daily') {
          if (this.daily.date !== this.dailyFor) this.daily = { date: this.dailyFor };
          bucket = this.daily;
        } else {
          bucket = this.records[this.def.id] = this.records[this.def.id] || {};
        }
        const rec = Object.assign({ score: 0, acc: 0, grade: 'F', fc: false }, bucket[d]);
        if (S.score > rec.score) {
          rec.score = S.score;
          best = true;
        }
        if (cleared && acc > rec.acc) rec.acc = acc;
        if (GRADE_RANK[grade] > GRADE_RANK[rec.grade]) rec.grade = grade;
        rec.fc = rec.fc || fc;
        bucket[d] = rec;
        save(this.mode === 'daily' ? STORE.daily : STORE.records, this.mode === 'daily' ? this.daily : this.records);
      }
      let high = 0;
      try {
        high = parseInt(localStorage.getItem(STORE.high) || '0', 10) || 0;
        if (S.score > high) localStorage.setItem(STORE.high, String(S.score));
      } catch (e) {}
      return best && S.score > 0;
    }

    // ----------------------------------------------------------------------
    // Input
    // ----------------------------------------------------------------------
    bindInput() {
      window.addEventListener('keydown', (e) => {
        if (e.code === 'Escape' || e.code === 'KeyP') {
          if (this.state === 'PLAYING' || this.state === 'COUNTDOWN') this.pause();
          else if (this.state === 'PAUSED') this.resumeRun();
          else if (this.state === 'CALIBRATE' && e.code === 'Escape') this.closeCalibrate();
          return;
        }
        if (e.code === 'KeyM') {
          this.toggleMute();
          return;
        }
        const lane = KEYS[e.code];
        if (this.state === 'CALIBRATE' && (lane !== undefined || e.code === 'Space')) {
          e.preventDefault();
          if (!e.repeat) this.calTap(eventTime(e));
          return;
        }
        if (lane === undefined) return;
        const playing = this.state === 'PLAYING' || this.state === 'FAILING' || this.state === 'COUNTDOWN';
        if (playing) e.preventDefault();
        if (e.repeat || this.keysHeld.has(e.code)) return;
        if (!playing && this.state !== 'MENU') return;
        this.keysHeld.set(e.code, lane);
        this.usingTouch = false;
        this.laneDown[lane]++;
        this.press(lane, eventTime(e));
      });
      window.addEventListener('keyup', (e) => {
        const lane = this.keysHeld.get(e.code);
        if (lane === undefined) return;
        this.keysHeld.delete(e.code);
        this.laneDown[lane] = Math.max(0, this.laneDown[lane] - 1);
        this.release(lane, eventTime(e));
      });
      window.addEventListener('blur', () => {
        if (this.state === 'PLAYING') this.pause();
        this.releaseAll();
      });

      const c = this.canvas;
      c.addEventListener('pointerdown', (e) => {
        if (this.state !== 'PLAYING' && this.state !== 'COUNTDOWN') return;
        e.preventDefault();
        this.usingTouch = e.pointerType !== 'mouse';
        const lane = this.laneAt(e.clientX, e.pointerType);
        this.pointers.set(e.pointerId, lane);
        this.laneDown[lane]++;
        try {
          c.setPointerCapture(e.pointerId);
        } catch (err) {}
        this.press(lane, eventTime(e));
      });
      const up = (e) => {
        const lane = this.pointers.get(e.pointerId);
        if (lane === undefined) return;
        this.pointers.delete(e.pointerId);
        this.laneDown[lane] = Math.max(0, this.laneDown[lane] - 1);
        this.release(lane, eventTime(e));
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Touches use four equal columns of the whole screen, which suits two
    // thumbs on a phone held either way. A mouse uses the lanes themselves.
    laneAt(x, type) {
      const L = this.L;
      if (type === 'mouse') return clamp(Math.floor((x - (L.cx - 2 * L.laneW)) / L.laneW), 0, 3);
      return clamp(Math.floor((x / L.W) * 4), 0, 3);
    }

    // ----------------------------------------------------------------------
    // Layout and pre-drawn pieces
    // ----------------------------------------------------------------------
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      this.dpr = dpr;
      this.canvas.width = Math.round(W * dpr);
      this.canvas.height = Math.round(H * dpr);
      this.canvas.style.width = W + 'px';
      this.canvas.style.height = H + 'px';
      const probe = document.getElementById('safe-probe').getBoundingClientRect();
      const safeT = probe.top;
      const safeB = Math.max(0, H - probe.bottom);
      const short = H < 520;
      const laneW = Math.min(130, W * 0.235, H * (short ? 0.2 : 0.16));
      const hitY = H - safeB - clamp(H * 0.13, 52, 110);
      const farY = safeT + (short ? 56 : Math.max(96, H * 0.2));
      const sFar = 1 / (1 + PERSPECTIVE);
      const vanishY = (farY - sFar * hitY) / (1 - sFar);
      this.L = { W, H, laneW, hitY, farY, vanishY, cx: W / 2, noteH: clamp(laneW * 0.24, 12, 26) };
      this.makeSprites();
      this.makeBackground();
      this.makeBeams();
    }

    sAt(z) {
      return 1 / (1 + PERSPECTIVE * Math.max(-0.3, z));
    }

    yAt(s) {
      const L = this.L;
      return L.vanishY + (L.hitY - L.vanishY) * s;
    }

    // Lane position at the bottom of the screen, for the highway's edges.
    sAtY(y) {
      const L = this.L;
      return (y - L.vanishY) / (L.hitY - L.vanishY);
    }

    makeSprites() {
      const { laneW, noteH } = this.L;
      const dpr = this.dpr;
      const w = laneW * 0.86;
      const h = noteH;
      const pad = 14;
      const make = (rgb, glow) => {
        const c = document.createElement('canvas');
        const cw = w + pad * 2;
        const ch = h + pad * 2;
        c.width = Math.ceil(cw * dpr);
        c.height = Math.ceil(ch * dpr);
        const g = c.getContext('2d');
        g.scale(dpr, dpr);
        if (glow) {
          g.shadowColor = 'rgba(' + rgb + ', 0.9)';
          g.shadowBlur = glow;
        }
        roundRect(g, pad, pad, w, h, h * 0.45);
        const grad = g.createLinearGradient(0, pad, 0, pad + h);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        grad.addColorStop(0.35, 'rgb(' + rgb + ')');
        grad.addColorStop(1, 'rgb(' + rgb + ')');
        g.fillStyle = grad;
        g.fill();
        g.shadowBlur = 0;
        g.fillStyle = 'rgba(255, 255, 255, 0.7)';
        roundRect(g, pad + w * 0.14, pad + h * 0.2, w * 0.72, h * 0.2, h * 0.1);
        g.fill();
        return { c, w: cw, h: ch };
      };
      this.sprites = { note: LANE_RGB.map((rgb) => make(rgb, 14)), dim: make('110, 110, 130', 0) };
    }

    makeBackground() {
      const L = this.L;
      const { W, H, farY, cx, laneW } = L;
      const c = document.createElement('canvas');
      c.width = Math.round(W * this.dpr);
      c.height = Math.round(H * this.dpr);
      const g = c.getContext('2d');
      g.scale(this.dpr, this.dpr);

      const sky = g.createLinearGradient(0, 0, 0, farY);
      sky.addColorStop(0, '#04010a');
      sky.addColorStop(0.65, '#13052a');
      sky.addColorStop(1, '#3d0c50');
      g.fillStyle = sky;
      g.fillRect(0, 0, W, farY);

      const r = mulberry32(7);
      for (let i = 0; i < 140; i++) {
        g.fillStyle = 'rgba(255, 255, 255, ' + (0.15 + r() * 0.6).toFixed(2) + ')';
        const s = r() < 0.9 ? 1 : 2;
        g.fillRect(r() * W, r() * farY * 0.92, s, s);
      }

      // A striped sun sitting on the horizon.
      const R = Math.min(W * 0.3, farY * 0.85, 210);
      this.sunR = R;
      g.save();
      g.beginPath();
      g.rect(0, 0, W, farY);
      g.clip();
      const sun = g.createLinearGradient(0, farY - R, 0, farY);
      sun.addColorStop(0, '#ffe600');
      sun.addColorStop(0.55, '#ff6a3d');
      sun.addColorStop(1, '#ff007f');
      g.fillStyle = sun;
      g.beginPath();
      g.arc(cx, farY, R, Math.PI, 0);
      g.fill();
      g.fillStyle = '#2a0840';
      for (let k = 0; k < 6; k++) {
        const y = farY - R * 0.45 + k * R * 0.09;
        g.fillRect(cx - R, y, R * 2, 1.5 + k * 1.2);
      }
      g.restore();

      g.fillStyle = '#07020f';
      g.fillRect(0, farY, W, H - farY);
      const glow = g.createLinearGradient(0, farY, 0, farY + 90);
      glow.addColorStop(0, 'rgba(255, 0, 127, 0.28)');
      glow.addColorStop(1, 'rgba(255, 0, 127, 0)');
      g.fillStyle = glow;
      g.fillRect(0, farY, W, 90);

      const sFar = this.sAtY(farY);
      const sBot = this.sAtY(H);
      g.strokeStyle = 'rgba(168, 36, 255, 0.26)';
      g.lineWidth = 1;
      g.beginPath();
      for (let i = -16; i <= 16; i++) {
        if (Math.abs(i) <= 2) continue;
        g.moveTo(cx + i * laneW * sFar, farY);
        g.lineTo(cx + i * laneW * sBot, H);
      }
      g.stroke();

      // The highway.
      const edge = (side, s) => cx + side * 2 * laneW * s;
      g.beginPath();
      g.moveTo(edge(-1, sFar), farY);
      g.lineTo(edge(1, sFar), farY);
      g.lineTo(edge(1, sBot), H);
      g.lineTo(edge(-1, sBot), H);
      g.closePath();
      const road = g.createLinearGradient(0, farY, 0, H);
      road.addColorStop(0, 'rgba(8, 3, 20, 0.85)');
      road.addColorStop(1, 'rgba(12, 5, 28, 0.97)');
      g.fillStyle = road;
      g.fill();

      g.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      g.beginPath();
      for (let i = -1; i <= 1; i++) {
        g.moveTo(cx + i * laneW * sFar, farY);
        g.lineTo(cx + i * laneW * sBot, H);
      }
      g.stroke();

      for (const [width, alpha] of [[7, 0.14], [2, 0.75]]) {
        g.strokeStyle = 'rgba(0, 243, 255, ' + alpha + ')';
        g.lineWidth = width;
        g.beginPath();
        for (const side of [-1, 1]) {
          g.moveTo(edge(side, sFar), farY);
          g.lineTo(edge(side, sBot), H);
        }
        g.stroke();
      }
      this.bg = c;
    }

    makeBeams() {
      const L = this.L;
      const top = this.yAt(this.sAt(0.45));
      this.beamTop = top;
      this.beams = LANE_RGB.map((rgb) => {
        const grad = this.g.createLinearGradient(0, L.hitY, 0, top);
        grad.addColorStop(0, 'rgba(' + rgb + ', 0.9)');
        grad.addColorStop(1, 'rgba(' + rgb + ', 0)');
        return grad;
      });
    }

    // ----------------------------------------------------------------------
    // Frame
    // ----------------------------------------------------------------------
    frame() {
      requestAnimationFrame(() => this.frame());
      const now = performance.now();
      const dt = Math.min(0.05, (now - this.lastFrame) / 1000);
      this.lastFrame = now;

      if (this.state === 'PLAYING' || this.state === 'FAILING') {
        this.clock.sync(now);
        this.t = this.clock.time(now);
        this.player.pump();
        if (this.state === 'PLAYING') this.updatePlay(this.t);
        const bars = this.song.bars;
        while (this.barIdx < bars.length - 1 && bars[this.barIdx + 1].t <= this.t) this.barIdx++;
      } else if (this.state === 'COUNTDOWN') {
        if (now >= this.resumeAt) this.finishResume();
      } else if (this.state === 'CALIBRATE') {
        this.clock.sync(now);
        if (this.clock.time(now) > CAL_CLICKS * CAL_BEAT + 0.4 && this.calResult === undefined) {
          this.renderCalibrate(true);
        }
      }

      for (const p of this.sparks) {
        p.age += dt;
        p.vy += 900 * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      this.sparks = this.sparks.filter((p) => p.age < p.life);
      this.bursts = this.bursts.filter((b) => now - b.t0 < 300);

      this.draw(now);
      if (this.stats && !this.el.hud.hidden) this.updateHud();
    }

    inRun() {
      return this.song && ['PLAYING', 'FAILING', 'PAUSED', 'COUNTDOWN', 'RESUMING'].includes(this.state);
    }

    draw(now) {
      const g = this.g;
      const L = this.L;
      g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      g.drawImage(this.bg, 0, 0, L.W, L.H);

      const run = this.inRun();
      const t = run ? this.t : (now - this.menuT0) / 1000;
      const La = run ? this.La : lookahead(this.settings.speed);
      const pulse = this.pulseAt(t, run);

      if (pulse > 0.01) {
        g.globalCompositeOperation = 'lighter';
        const glow = g.createRadialGradient(L.cx, L.farY, 0, L.cx, L.farY, this.sunR * 1.8);
        glow.addColorStop(0, 'rgba(255, 60, 160, ' + (0.28 * pulse).toFixed(3) + ')');
        glow.addColorStop(1, 'rgba(255, 60, 160, 0)');
        g.fillStyle = glow;
        g.fillRect(0, 0, L.W, L.farY + this.sunR);
        g.globalCompositeOperation = 'source-over';
      }

      this.drawBeats(t, La, run);
      if (this.usingTouch) this.drawTouchZones();
      this.drawBeamsAndLine(now, pulse);
      if (run) this.drawNotes(t, La);
      this.drawReceptors();
      this.drawEffects(now);
      if (run) this.drawText(now, t);
    }

    pulseAt(t, run) {
      if (!run) {
        if (!this.previewing) return 0;
        const beat = 60 / this.previewBpm;
        return Math.exp((-((t / beat) % 1)) * 6);
      }
      if (t < 0) return 0;
      const bar = this.song.bars[this.barIdx];
      if (!bar) return 0;
      const beat = 60 / bar.bpm;
      const phase = (((t - bar.t) / beat) % 1 + 1) % 1;
      return (PULSE[bar.kind] || 0) * Math.exp(-phase * 6);
    }

    gridLine(z, strong) {
      if (z < -0.06 || z > 1) return;
      const g = this.g;
      const L = this.L;
      const s = this.sAt(z);
      const y = this.yAt(s);
      const fade = z > 0.8 ? (1 - z) / 0.2 : 1;
      const half = 2 * L.laneW * s;
      g.fillStyle = 'rgba(168, 36, 255, ' + ((strong ? 0.36 : 0.12) * fade).toFixed(3) + ')';
      g.fillRect(L.cx - half, y - (strong ? 1 : 0.5), half * 2, strong ? 2 : 1);
      g.fillStyle = 'rgba(168, 36, 255, ' + ((strong ? 0.14 : 0.05) * fade).toFixed(3) + ')';
      g.fillRect(0, y, L.cx - half, 1);
      g.fillRect(L.cx + half, y, L.W - L.cx - half, 1);
    }

    drawBeats(t, La, run) {
      if (!run) {
        const beat = 60 / this.previewBpm;
        const first = Math.floor(t / beat);
        for (let k = first; k * beat < t + La; k++) this.gridLine((k * beat - t) / La, k % 4 === 0);
        return;
      }
      if (t < 0) {
        for (let k = -this.leadBeats; k < 0; k++) this.gridLine((k * this.beat0 - t) / La, k % 4 === 0);
      }
      const bars = this.song.bars;
      for (let i = this.barIdx; i < bars.length; i++) {
        const b = bars[i];
        if (b.t > t + La) break;
        const beat = 60 / b.bpm;
        for (let k = 0; k < 4; k++) this.gridLine((b.t + k * beat - t) / La, k === 0);
      }
    }

    drawTouchZones() {
      const g = this.g;
      const L = this.L;
      const top = L.hitY + L.noteH;
      const w = L.W / 4;
      for (let l = 0; l < 4; l++) {
        const down = this.laneDown[l] > 0 && this.inRun();
        const grad = g.createLinearGradient(0, top, 0, L.H);
        grad.addColorStop(0, 'rgba(' + LANE_RGB[l] + ', 0)');
        grad.addColorStop(1, 'rgba(' + LANE_RGB[l] + ', ' + (down ? 0.28 : 0.07) + ')');
        g.fillStyle = grad;
        g.fillRect(l * w + 1, top, w - 2, L.H - top);
      }
    }

    drawBeamsAndLine(now, pulse) {
      const g = this.g;
      const L = this.L;
      const s1 = this.sAt(0.45);
      for (let l = 0; l < 4; l++) {
        const down = this.laneDown[l] > 0;
        const age = (now - this.flash[l]) / 1000;
        const a = down ? 0.3 : Math.max(0, 0.3 * (1 - age / 0.18));
        if (a < 0.01) continue;
        const off = l - 1.5;
        g.globalAlpha = a;
        g.fillStyle = this.beams[l];
        g.beginPath();
        g.moveTo(L.cx + (off - 0.5) * L.laneW, L.hitY);
        g.lineTo(L.cx + (off + 0.5) * L.laneW, L.hitY);
        g.lineTo(L.cx + (off + 0.5) * L.laneW * s1, this.beamTop);
        g.lineTo(L.cx + (off - 0.5) * L.laneW * s1, this.beamTop);
        g.closePath();
        g.fill();
      }
      g.globalAlpha = 1;
      const half = 2 * L.laneW;
      g.fillStyle = 'rgba(255, 255, 255, ' + (0.08 + 0.12 * pulse).toFixed(3) + ')';
      g.fillRect(L.cx - half, L.hitY - 5, half * 2, 10);
      g.fillStyle = 'rgba(255, 255, 255, ' + (0.55 + 0.3 * pulse).toFixed(3) + ')';
      g.fillRect(L.cx - half, L.hitY - 1, half * 2, 2);
    }

    drawNotes(t, La) {
      const notes = this.notes;
      for (let i = this.first; i < notes.length; i++) {
        const n = notes[i];
        const z = (n.t - t) / La;
        if (z > 1.02) break;
        if (n.st === 2) continue;
        if (n.dur > 0) this.drawHold(n, t, La);
        else if (z > -0.25) this.drawNote(n.lane, z, n.st >= 3);
      }
    }

    drawNote(lane, z, dim) {
      const g = this.g;
      const L = this.L;
      const s = this.sAt(z);
      const y = this.yAt(s);
      const x = L.cx + (lane - 1.5) * L.laneW * s;
      const spr = dim ? this.sprites.dim : this.sprites.note[lane];
      const w = spr.w * s;
      const h = spr.h * s;
      const fade = z > 0.85 ? clamp((1.02 - z) / 0.17, 0, 1) : 1;
      g.globalAlpha = fade * (dim ? 0.45 : 1);
      g.drawImage(spr.c, x - w / 2, y - h / 2, w, h);
      g.globalAlpha = 1;
    }

    drawHold(n, t, La) {
      const g = this.g;
      const L = this.L;
      const held = n.st === 1;
      const dim = n.st >= 3;
      const zHead = held ? 0 : (n.t - t) / La;
      const zTail = Math.min(1.02, (n.t + n.dur - t) / La);
      if (zTail < -0.25) return;
      const z0 = Math.max(-0.25, zHead);
      if (zTail > z0) {
        const s0 = this.sAt(z0);
        const s1 = this.sAt(zTail);
        const y0 = this.yAt(s0);
        const y1 = this.yAt(s1);
        const off = n.lane - 1.5;
        const body = (width, fill) => {
          g.fillStyle = fill;
          g.beginPath();
          g.moveTo(L.cx + (off - width) * L.laneW * s0, y0);
          g.lineTo(L.cx + (off + width) * L.laneW * s0, y0);
          g.lineTo(L.cx + (off + width) * L.laneW * s1, y1);
          g.lineTo(L.cx + (off - width) * L.laneW * s1, y1);
          g.closePath();
          g.fill();
        };
        const rgb = LANE_RGB[n.lane];
        if (dim) {
          body(0.3, 'rgba(110, 110, 130, 0.22)');
        } else {
          const glow = held ? 0.5 + 0.2 * Math.sin(performance.now() / 60) : 0.3;
          body(0.3, 'rgba(' + rgb + ', ' + glow.toFixed(3) + ')');
          body(0.06, 'rgba(255, 255, 255, ' + (held ? 0.9 : 0.55) + ')');
        }
        // Tail cap.
        const capW = L.laneW * 0.6 * s1;
        const capH = Math.max(3, L.noteH * 0.4 * s1);
        g.fillStyle = dim ? 'rgba(110, 110, 130, 0.4)' : 'rgba(' + rgb + ', 0.95)';
        roundRect(g, L.cx + off * L.laneW * s1 - capW / 2, y1 - capH / 2, capW, capH, capH / 2);
        g.fill();
      }
      if (held) this.drawNote(n.lane, 0, false);
      else if (zHead > -0.25) this.drawNote(n.lane, zHead, dim);
    }

    drawReceptors() {
      const g = this.g;
      const L = this.L;
      const w = L.laneW * 0.86;
      const h = L.noteH * 1.15;
      g.lineWidth = 2;
      for (let l = 0; l < 4; l++) {
        const x = L.cx + (l - 1.5) * L.laneW;
        const down = this.laneDown[l] > 0;
        roundRect(g, x - w / 2, L.hitY - h / 2, w, h, h * 0.45);
        if (down) {
          g.fillStyle = 'rgba(' + LANE_RGB[l] + ', 0.35)';
          g.fill();
        }
        g.strokeStyle = 'rgba(' + LANE_RGB[l] + ', ' + (down ? 1 : 0.6) + ')';
        g.stroke();
      }
      if (!this.usingTouch) {
        g.font = '700 12px Orbitron, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillStyle = 'rgba(255, 255, 255, 0.4)';
        for (let l = 0; l < 4; l++) g.fillText(KEY_LABELS[l], L.cx + (l - 1.5) * L.laneW, L.hitY + h + 12);
      }
    }

    drawEffects(now) {
      const g = this.g;
      const L = this.L;
      g.globalCompositeOperation = 'lighter';
      for (const b of this.bursts) {
        const k = (now - b.t0) / 300;
        g.globalAlpha = 1 - k;
        g.strokeStyle = b.color;
        g.lineWidth = 3 * (1 - k) + 1;
        g.beginPath();
        g.ellipse(b.x, b.y, L.laneW * (0.3 + 0.45 * k), L.noteH * (0.8 + 1.4 * k), 0, 0, Math.PI * 2);
        g.stroke();
      }
      for (const p of this.sparks) {
        g.globalAlpha = 1 - p.age / p.life;
        g.fillStyle = p.color;
        g.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }

    drawText(now, t) {
      const g = this.g;
      const L = this.L;
      const span = L.hitY - L.farY;
      const yJ = L.hitY - span * 0.3;
      const yC = L.hitY - span * 0.55;
      const big = clamp(L.laneW * 0.5, 26, 58);
      g.textAlign = 'center';
      g.textBaseline = 'middle';

      const flash = (now - this.dropFlash) / 450;
      if (flash < 1) {
        g.fillStyle = 'rgba(255, 255, 255, ' + (0.16 * (1 - flash)).toFixed(3) + ')';
        g.fillRect(0, 0, L.W, L.H);
      }

      let center = null;
      if (this.state === 'COUNTDOWN' || this.state === 'RESUMING') {
        center = String(Math.max(1, Math.ceil((this.resumeAt - now) / 500)));
      } else if (t < 0) {
        const n = Math.ceil(-t / this.beat0);
        center = n > 3 ? 'READY' : String(n);
      } else if (t < 0.5) {
        center = 'GO!';
      }
      if (center) {
        g.font = '900 ' + Math.round(big * (center.length > 3 ? 0.8 : 1.2)) + 'px Orbitron, sans-serif';
        g.shadowColor = '#a824ff';
        g.shadowBlur = 18;
        g.fillStyle = '#ffffff';
        g.fillText(center, L.cx, yC);
        g.shadowBlur = 0;
      } else if (this.stats.combo >= 4) {
        const pop = clamp(1 - (now - this.comboPop) / 350, 0, 1);
        g.font = '900 ' + Math.round(big * (1 + 0.35 * pop)) + 'px Orbitron, sans-serif';
        // Faint enough that notes passing behind it stay readable.
        g.fillStyle = 'rgba(255, 255, 255, ' + (0.5 + 0.4 * pop).toFixed(2) + ')';
        g.shadowColor = pop > 0 ? '#ffe600' : '#a824ff';
        g.shadowBlur = 10 + 20 * pop;
        g.fillText(String(this.stats.combo), L.cx, yC);
        g.shadowBlur = 0;
        g.font = '700 ' + Math.round(big * 0.26) + 'px Orbitron, sans-serif';
        g.fillStyle = 'rgba(255, 255, 255, 0.5)';
        g.fillText('COMBO', L.cx, yC + big * 0.72);
      }

      const j = this.judgement;
      if (j) {
        const age = (now - j.t0) / 1000;
        if (age < 0.6) {
          const J = JUDGE[j.j];
          const pop = age < 0.08 ? 1.25 - (age / 0.08) * 0.25 : 1;
          g.globalAlpha = age > 0.4 ? (0.6 - age) / 0.2 : 1;
          g.font = '900 ' + Math.round(big * 0.62 * pop) + 'px Orbitron, sans-serif';
          g.fillStyle = J.color;
          g.shadowColor = J.color;
          g.shadowBlur = 12;
          g.fillText(J.label, L.cx, yJ);
          g.shadowBlur = 0;
          if (j.side) {
            g.font = '700 ' + Math.round(big * 0.26) + 'px Orbitron, sans-serif';
            g.fillStyle = j.side < 0 ? '#7fd8ff' : '#ff9a6b';
            g.fillText(j.side < 0 ? 'EARLY' : 'LATE', L.cx, yJ + big * 0.5);
          }
          g.globalAlpha = 1;
        }
      }

      if (this.state === 'FAILING') {
        const k = clamp((now - this.failAt) / 1200, 0, 1);
        g.fillStyle = 'rgba(40, 0, 12, ' + (0.6 * k).toFixed(3) + ')';
        g.fillRect(0, 0, L.W, L.H);
        g.font = '900 ' + Math.round(big * 0.8) + 'px Orbitron, sans-serif';
        g.fillStyle = 'rgba(255, 51, 85, ' + k.toFixed(3) + ')';
        g.shadowColor = '#ff3355';
        g.shadowBlur = 20;
        g.fillText('SIGNAL LOST', L.cx + (Math.random() - 0.5) * 6 * (1 - k), yC);
        g.shadowBlur = 0;
      }
    }

    updateHud() {
      const S = this.stats;
      const c = this.hudCache;
      const set = (key, value, fn) => {
        if (c[key] === value) return;
        c[key] = value;
        fn(value);
      };
      this.shownScore += (S.score - this.shownScore) * 0.3;
      if (Math.abs(S.score - this.shownScore) < 1) this.shownScore = S.score;
      set('score', Math.round(this.shownScore), (v) => (this.el.score.textContent = v.toLocaleString()));
      const mult = this.multiplier();
      set('mult', mult, (v) => {
        this.el.mult.textContent = 'x' + v;
        this.el.mult.className = 'mult m' + v;
      });
      const acc = S.judged ? (S.accSum / S.judged) * 100 : 100;
      set('acc', acc.toFixed(2), (v) => (this.el.acc.textContent = v + '%'));
      const energy = Math.round(S.energy);
      set('energy', energy, (v) => {
        this.el['energy-fill'].style.width = v + '%';
        this.el['energy-fill'].classList.toggle('low', v <= 25);
      });
      let label = this.def.name + ' · ' + DIFF_NAMES[this.diff];
      if (this.mode === 'endless') {
        const bar = this.song.bars[this.barIdx];
        label = 'ENDLESS · ' + DIFF_NAMES[this.diff] + ' · ' + (bar ? bar.bpm : this.song.baseBpm) + ' BPM';
      }
      set('label', label, (v) => (this.el['run-label'].textContent = v));
      if (this.mode !== 'endless') {
        const p = clamp(this.t / this.song.length, 0, 1);
        set('progress', Math.round(p * 400), (v) => (this.el['progress-fill'].style.width = v / 4 + '%'));
      }
    }
  }

  window.pulseLanes = new PulseLanes();
})();
