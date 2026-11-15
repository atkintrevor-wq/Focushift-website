(function () {
  // Keep in step with functions/_lib/trips-logic.js.
  // Load numbers are not computed from the calendar.
  const ANCHOR_WEEK = '2026-11-09';
  const ANCHOR_LOAD = 'TA-6043';
  const DAY = 86400000;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function parseIso(iso) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const utc = Date.UTC(year, month - 1, day);
    const date = new Date(utc);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return utc;
  }

  function formatIso(utc) {
    const date = new Date(utc);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function mondayUtc(utc) {
    const day = new Date(utc).getUTCDay();
    const sinceMonday = day === 0 ? 6 : day - 1;
    return utc - sinceMonday * DAY;
  }

  function weekOf(iso) {
    const utc = parseIso(iso);
    if (utc == null) return null;
    const monday = mondayUtc(utc);
    const sunday = monday + 6 * DAY;
    return {
      week_start: formatIso(monday),
      week_end: formatIso(sunday),
      pay_month: formatIso(sunday).slice(0, 7),
      stub_date: formatIso(sunday + DAY),
    };
  }

  function payMonthForDate(iso) {
    const week = weekOf(iso);
    return week ? week.pay_month : '';
  }

  function weekRange(iso) {
    const week = weekOf(iso);
    if (!week) return null;
    return { week_start: week.week_start, week_end: week.week_end };
  }

  function addDays(iso, days) {
    const utc = parseIso(iso);
    if (utc == null) return '';
    return formatIso(utc + days * DAY);
  }

  function normalizeLoadNumber(value) {
    const raw = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
    if (!raw) return '';
    const match = /^(?:TA-?)?(\d{1,6})$/.exec(raw);
    if (!match) return '';
    const n = Number(match[1]);
    if (!Number.isInteger(n) || n < 1) return '';
    return `TA-${String(n).padStart(4, '0')}`;
  }

  function suggestLoadNumber(iso, trips) {
    const week = weekOf(iso);
    if (!week) return { load_number: '', source: 'blank', week_start: '', week_end: '', pay_month: '', stub_date: '' };
    const same = [];
    let latest = null;
    for (const trip of trips || []) {
      const start = trip.week_start || weekOf(trip.trip_date)?.week_start || '';
      const load = normalizeLoadNumber(trip.load_number);
      if (!start || !load) continue;
      if (start === week.week_start) same.push(load);
      if (!latest || start > latest.start) latest = { start, load };
    }
    if (same.length) {
      const counts = new Map();
      for (const load of same) counts.set(load, (counts.get(load) || 0) + 1);
      let best = '';
      let bestCount = -1;
      for (const [load, count] of counts) {
        if (count > bestCount || (count === bestCount && load > best)) {
          best = load;
          bestCount = count;
        }
      }
      return Object.assign({}, week, { load_number: best, source: 'week' });
    }
    if (latest) {
      return Object.assign({}, week, {
        load_number: `TA-${String(Number(latest.load.slice(3)) + 1).padStart(4, '0')}`,
        source: 'next',
      });
    }
    if (week.week_start === ANCHOR_WEEK) return Object.assign({}, week, { load_number: ANCHOR_LOAD, source: 'anchor' });
    return Object.assign({}, week, { load_number: '', source: 'blank' });
  }

  function parts(iso) {
    const utc = parseIso(iso);
    if (utc == null) return null;
    const date = new Date(utc);
    return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate(), w: date.getUTCDay() };
  }

  function formatWeek(start, end) {
    const a = parts(start);
    const b = parts(end);
    if (!a || !b) return '';
    return `${MONTHS[a.m]} ${a.d} – ${MONTHS[b.m]} ${b.d}, ${b.y}`;
  }

  function formatTripDate(iso) {
    const p = parts(iso);
    if (!p) return iso || '';
    return `${WEEKDAYS[p.w]}, ${MONTHS[p.m]} ${p.d}`;
  }

  function formatPayMonth(ym) {
    const match = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!match) return ym || '';
    return `${MONTHS_LONG[Number(match[2]) - 1]} ${match[1]}`;
  }

  window.TripWeek = {
    payMonthForDate,
    weekRange,
    weekOf,
    addDays,
    suggestLoadNumber,
    normalizeLoadNumber,
    formatWeek,
    formatTripDate,
    formatPayMonth,
  };
})();
