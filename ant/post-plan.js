/* Posting plan: how many posts a week, on which days, and the time for each platform.
 * Saved on this phone. Used by the Social tab (index.html), Social Posts
 * (posts.html) and the SCHEDULE POST picker (slides-maker.js).
 */
(function () {
  'use strict';
  const PLANS = {
    1: {label: '1× a week', days: [3]},        // Wed
    2: {label: '2× a week', days: [2, 4]},     // Tue, Thu
    3: {label: '3× a week', days: [1, 3, 5]}   // Mon, Wed, Fri
  };
  const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_LONG = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (_) { return ''; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const pad = n => String(n).padStart(2, '0');

  const perWeek = () => PLANS[get('posts-per-week')] ? Number(get('posts-per-week')) : 1;
  // Best times checked 13 Oct 2026 (Malaysia): LinkedIn 5 PM, Facebook 8 PM, Instagram 9 PM.
  const TIMES = {facebook: '20:00', instagram: '21:00', linkedin: '17:00'};
  const time = pl => { const t = get('posts-time-' + (pl || 'facebook')); return /^\d{2}:\d{2}$/.test(t) ? t : TIMES[pl || 'facebook']; };

  // yyyy-mm-dd of the next `count` plan days, starting today.
  function nextDays(count, from) {
    const days = PLANS[perWeek()].days, out = [];
    const d = from ? new Date(from) : new Date();
    d.setHours(0, 0, 0, 0);
    for (let i = 0; out.length < count && i < 60; i++, d.setDate(d.getDate() + 1)) {
      if (days.includes(d.getDay())) out.push(iso(d));
    }
    return out;
  }
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function label(isoDate) {
    const [y, m, dd] = isoDate.split('-').map(Number), d = new Date(y, m - 1, dd);
    return DAY[d.getDay()] + ' ' + dd + ' ' + MON[m - 1];
  }
  const daysText = () => PLANS[perWeek()].days.map(n => DAY_LONG[n]).join(', ').replace(/, ([^,]*)$/, ' & $1');
  // Every 30 minutes, 06:00 to 23:30.
  const times = () => Array.from({length: 36}, (_, i) => pad(6 + Math.floor(i / 2)) + ':' + (i % 2 ? '30' : '00'));

  window.PostPlan = {
    PLANS, perWeek, time, nextDays, label, iso, daysText, times,
    setPerWeek: n => set('posts-per-week', String(n)),
    setTime: (pl, t) => set('posts-time-' + pl, t)
  };
})();
