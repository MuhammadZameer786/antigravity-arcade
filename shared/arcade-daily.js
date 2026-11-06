/**
 * Arcade daily log: which daily challenges were played on which day, and
 * each one's best result for that day. Games call ArcadeDaily.record() when
 * a daily run ends, and the hub's Today panel reads it back.
 *
 * Days are local dates (YYYY-MM-DD), the same keys the games seed their
 * dailies from, so a day here is the same day the game used.
 *
 * Stored in localStorage as `arcade_daily_log`:
 *   { days: { '2026-11-06': { 'vector-siege': { score, runs, ... } } }, best }
 */
(function (root) {
  const KEY = 'arcade_daily_log';
  const KEEP_DAYS = 400;

  function dayKey(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // Building the date from its parts keeps this right across clock changes.
  function shiftDay(key, n) {
    const [y, m, d] = key.split('-').map(Number);
    return dayKey(new Date(y, m - 1, d + n));
  }

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v === 'object' && v.days && typeof v.days === 'object') return v;
    } catch (e) {}
    return { days: {}, best: 0 };
  }

  function save(log) {
    try {
      localStorage.setItem(KEY, JSON.stringify(log));
    } catch (e) {}
  }

  function played(log, day) {
    const entry = log.days[day];
    return !!entry && Object.keys(entry).length > 0;
  }

  // Days in a row with at least one daily played. A streak that reached
  // yesterday is still alive until today ends.
  function streak(log, today) {
    log = log || load();
    today = today || dayKey();
    const playedToday = played(log, today);
    let day = playedToday ? today : shiftDay(today, -1);
    let current = 0;
    while (played(log, day)) {
      current++;
      day = shiftDay(day, -1);
    }
    return { current, playedToday, best: Math.max(log.best || 0, current) };
  }

  // Saves a finished daily run. The day keeps the better run, judged by
  // `rank` when the game gives one and by score otherwise.
  function record(game, result, day) {
    day = day || dayKey();
    const log = load();
    const entry = (log.days[day] = log.days[day] || {});
    const prev = entry[game];
    const rank = (r) => (r ? (typeof r.rank === 'number' ? r.rank : r.score || 0) : -Infinity);
    const keep = prev && rank(prev) > rank(result) ? prev : result;
    entry[game] = Object.assign({}, keep, { runs: (prev ? prev.runs || 1 : 0) + 1 });

    const cutoff = shiftDay(dayKey(), -KEEP_DAYS);
    Object.keys(log.days).forEach((k) => {
      if (k < cutoff) delete log.days[k];
    });
    log.best = streak(log).best;
    save(log);
    return entry[game];
  }

  function results(day) {
    return load().days[day || dayKey()] || {};
  }

  // A 32-bit seed for one game's daily (FNV-1a of "game:day"), so every
  // player gets the same challenge on the same date.
  function seed(game, day) {
    const str = game + ':' + (day || dayKey());
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  root.ArcadeDaily = { dayKey, shiftDay, load, record, results, streak, seed };
})(window);
