import { HttpError, roundMoney } from './http.js';
import { isRealDate } from './validate.js';

/**
 * Work weeks run Monday through Sunday.
 * A week is paid in the month of its Sunday.
 * Load numbers are not computed from the calendar. A week that already
 * has trips keeps its number. A new worked week suggests the latest
 * number plus 1, and the driver can change it. Weeks off are skipped.
 * With an empty log, the week of Monday 2026-11-09 suggests TA-6043.
 */

export const RUN_TYPES = ['Sunrise', 'MTV/SH'];
export const PAID_STATUSES = ['unpaid', 'paid', 'disputed'];
export const ANCHOR_WEEK = '2026-11-09';
export const ANCHOR_LOAD = 'TA-6043';

export const DEFAULT_SETTINGS = {
  sunrise_pay: 240,
  sunrise_miles: 260,
  mtv_pay: 260,
  mtv_miles: 300,
  load_unload_pay: 60,
};

const DAY = 86400000;

function seedTrip(tripDate, code, loadNumber, paid) {
  const runType = code === 'M' ? 'MTV/SH' : 'Sunrise';
  return {
    trip_date: tripDate,
    run_type: runType,
    load_number: loadNumber,
    paid_status: paid ? 'paid' : 'unpaid',
    client_id: `seed-${tripDate}`,
  };
}

export const SEED_TRIPS = [
  seedTrip('2026-09-01', 'M', 'TA-6034'),
  seedTrip('2026-09-02', 'M', 'TA-6034'),
  seedTrip('2026-09-05', 'S', 'TA-6034'),
  seedTrip('2026-09-06', 'S', 'TA-6034'),
  seedTrip('2026-09-09', 'S', 'TA-6035'),
  seedTrip('2026-09-10', 'S', 'TA-6035'),
  seedTrip('2026-09-12', 'S', 'TA-6035'),
  seedTrip('2026-09-14', 'M', 'TA-6036'),
  seedTrip('2026-09-16', 'S', 'TA-6036'),
  seedTrip('2026-09-17', 'S', 'TA-6036'),
  seedTrip('2026-09-19', 'S', 'TA-6036'),
  seedTrip('2026-09-20', 'S', 'TA-6036'),
  seedTrip('2026-09-30', 'S', 'TA-6037', true),
  seedTrip('2026-10-01', 'S', 'TA-6037', true),
  seedTrip('2026-10-04', 'S', 'TA-6037', true),
  seedTrip('2026-10-05', 'S', 'TA-6038', true),
  seedTrip('2026-10-08', 'S', 'TA-6038', true),
  seedTrip('2026-10-10', 'S', 'TA-6038', true),
  seedTrip('2026-10-11', 'S', 'TA-6038', true),
  seedTrip('2026-10-14', 'S', 'TA-6039', true),
  seedTrip('2026-10-20', 'M', 'TA-6040', true),
  seedTrip('2026-10-21', 'M', 'TA-6040', true),
  seedTrip('2026-10-25', 'M', 'TA-6040', true),
  seedTrip('2026-10-27', 'S', 'TA-6041'),
  seedTrip('2026-10-29', 'S', 'TA-6041'),
  seedTrip('2026-11-01', 'S', 'TA-6041'),
  seedTrip('2026-11-02', 'S', 'TA-6042'),
  seedTrip('2026-11-03', 'S', 'TA-6042'),
  seedTrip('2026-11-07', 'M', 'TA-6042'),
];

export const SEED_PAYSTUB = {
  pay_month: '2026-10',
  net_pay: 2856.6,
  vacation_days: 3,
  vacation_pay: 720,
  status: 'paid',
  lines: [
    { line_date: '2026-10-05', load_number: 'TA-6037', mileage: 780, gross: 720, load_unload: 0 },
    { line_date: '2026-10-12', load_number: 'TA-6038', mileage: 1041, gross: 960, load_unload: 0 },
    { line_date: '2026-10-19', load_number: 'TA-6039', mileage: 260, gross: 240, load_unload: 0 },
    { line_date: '2026-10-26', load_number: 'TA-6040', mileage: 903, gross: 780, load_unload: 180 },
  ],
};

export function parseIso(iso) {
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

export function formatIso(utc) {
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

export function formatLoad(n) {
  return `TA-${String(n).padStart(4, '0')}`;
}

export function weekOf(iso) {
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

export function payMonthForDate(iso) {
  const week = weekOf(iso);
  return week ? week.pay_month : '';
}

export function addDays(iso, days) {
  const utc = parseIso(iso);
  if (utc == null) return '';
  return formatIso(utc + days * DAY);
}

export function normalizeRunType(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  if (raw === 'sunrise') return 'Sunrise';
  if (raw === 'mtv/sh') return 'MTV/SH';
  return '';
}

export function normalizePaidStatus(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return PAID_STATUSES.includes(raw) ? raw : '';
}

export function normalizeLoadNumber(value) {
  const raw = String(value ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (!raw) return '';
  const match = /^(?:TA-?)?(\d{1,6})$/.exec(raw);
  if (!match) return null;
  const n = Number(match[1]);
  if (!Number.isInteger(n) || n < 1) return null;
  return formatLoad(n);
}

function weekStartOf(trip) {
  if (trip?.week_start && parseIso(trip.week_start)) return trip.week_start;
  return weekOf(trip?.trip_date)?.week_start || '';
}

export function suggestLoadNumber(iso, trips) {
  const week = weekOf(iso);
  if (!week) return { load_number: '', source: 'blank', week_start: '', week_end: '', pay_month: '', stub_date: '' };
  const same = [];
  let latest = null;
  for (const trip of trips || []) {
    const start = weekStartOf(trip);
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
    return { ...week, load_number: best, source: 'week' };
  }
  if (latest) {
    return { ...week, load_number: formatLoad(Number(latest.load.slice(3)) + 1), source: 'next' };
  }
  if (week.week_start === ANCHOR_WEEK) return { ...week, load_number: ANCHOR_LOAD, source: 'anchor' };
  return { ...week, load_number: '', source: 'blank' };
}

function cleanNotes(value) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 2000);
}

export function parsePayAmount(value, label = 'Pay amount') {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = roundMoney(value);
  if (!Number.isFinite(n) || n < 0 || n > 100000) {
    throw new HttpError(400, `${label} must be 0 or more, and at most 100,000.`);
  }
  return n;
}

function truthyFlag(value) {
  if (value === true || value === 1) return true;
  const raw = String(value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export function parseTrip(fields, existingTrips = []) {
  const tripDate = String(fields?.trip_date ?? '').trim();
  if (!isRealDate(tripDate)) throw new HttpError(400, 'Enter a real trip date.');

  const runType = normalizeRunType(fields?.run_type);
  if (!runType) throw new HttpError(400, 'Choose Sunrise or MTV/SH.');

  const week = weekOf(tripDate);
  let loadNumber = '';
  if (fields?.load_number != null && String(fields.load_number).trim() !== '') {
    const normalized = normalizeLoadNumber(fields.load_number);
    if (!normalized) throw new HttpError(400, 'Load number should look like TA-6043.');
    loadNumber = normalized;
  } else {
    loadNumber = suggestLoadNumber(tripDate, existingTrips).load_number;
  }
  if (!loadNumber) throw new HttpError(400, 'Enter a load number like TA-6043.');

  let clientId = String(fields?.client_id ?? '').trim();
  if (clientId && !/^[A-Za-z0-9_-]{8,80}$/.test(clientId)) {
    throw new HttpError(400, 'That trip id is not valid.');
  }

  const notes = cleanNotes(fields?.notes);
  return {
    client_id: clientId || null,
    trip_date: tripDate,
    run_type: runType,
    also_sunrise: runType === 'MTV/SH' && truthyFlag(fields?.also_sunrise) ? 1 : 0,
    notes: notes || null,
    pay_amount: parsePayAmount(fields?.pay_amount),
    load_number: loadNumber,
    week_start: week.week_start,
    week_end: week.week_end,
    pay_month: week.pay_month,
    paid_status: 'unpaid',
  };
}

export function parseTripQuery(searchParams) {
  const filters = {};
  const month = String(searchParams.get('month') || '').trim();
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, 'Month should look like 2026-11.');
    filters.month = month;
  }
  for (const key of ['from', 'to']) {
    const value = String(searchParams.get(key) || '').trim();
    if (!value) continue;
    if (!isRealDate(value)) throw new HttpError(400, 'Use real dates for from and to.');
    filters[key] = value;
  }
  if (filters.from && filters.to && filters.from > filters.to) {
    throw new HttpError(400, 'The from date is after the to date.');
  }
  return filters;
}

export function parseExportFormat(searchParams) {
  const format = String(searchParams.get('format') || 'xlsx').trim().toLowerCase();
  if (format !== 'xlsx' && format !== 'csv') throw new HttpError(400, 'Format should be xlsx or csv.');
  return format;
}

function settingNumber(value, fallback, label, max) {
  if (value == null || value === '') return fallback;
  const n = roundMoney(value);
  if (!Number.isFinite(n) || n < 0 || n > max) throw new HttpError(400, `${label} must be 0 or more, and at most ${max}.`);
  return n;
}

export function normalizeSettings(fields, current = DEFAULT_SETTINGS) {
  const source = fields || {};
  return {
    sunrise_pay: settingNumber(source.sunrise_pay ?? current.sunrise_pay, DEFAULT_SETTINGS.sunrise_pay, 'Sunrise pay', 100000),
    sunrise_miles: settingNumber(source.sunrise_miles ?? current.sunrise_miles, DEFAULT_SETTINGS.sunrise_miles, 'Sunrise miles', 100000),
    mtv_pay: settingNumber(source.mtv_pay ?? current.mtv_pay, DEFAULT_SETTINGS.mtv_pay, 'MTV/SH pay', 100000),
    mtv_miles: settingNumber(source.mtv_miles ?? current.mtv_miles, DEFAULT_SETTINGS.mtv_miles, 'MTV/SH miles', 100000),
    load_unload_pay: settingNumber(source.load_unload_pay ?? current.load_unload_pay, DEFAULT_SETTINGS.load_unload_pay, 'Load/unload pay', 100000),
  };
}

export function countRuns(trips) {
  let sunrise = 0;
  let mtv = 0;
  let alsoSunrise = 0;
  for (const trip of trips || []) {
    if (trip.run_type === 'Sunrise') sunrise += 1;
    else if (trip.run_type === 'MTV/SH') mtv += 1;
    if (trip.also_sunrise) alsoSunrise += 1;
  }
  return { sunrise, mtv, also_sunrise: alsoSunrise, trips: (trips || []).length };
}

export function expectedPay(counts, settings = DEFAULT_SETTINGS) {
  const rates = normalizeSettings(settings);
  const gross = roundMoney(counts.sunrise * rates.sunrise_pay + counts.mtv * rates.mtv_pay);
  const loadUnload = roundMoney(counts.mtv * rates.load_unload_pay);
  const miles = roundMoney(counts.sunrise * rates.sunrise_miles + counts.mtv * rates.mtv_miles);
  return {
    gross,
    load_unload: loadUnload,
    total: roundMoney(gross + loadUnload),
    miles,
  };
}

export function expectedForTrip(trip, settings = DEFAULT_SETTINGS) {
  return expectedPay(countRuns([trip]), settings);
}

function modeLoad(trips) {
  const counts = new Map();
  for (const trip of trips) {
    const load = normalizeLoadNumber(trip.load_number) || trip.load_number;
    if (!load) continue;
    counts.set(load, (counts.get(load) || 0) + 1);
  }
  let best = '';
  let bestCount = -1;
  for (const [load, count] of counts) {
    if (count > bestCount || (count === bestCount && load > best)) {
      best = load;
      bestCount = count;
    }
  }
  return best;
}

export function summarizeTrips(trips, settings = DEFAULT_SETTINGS) {
  const totals = { ...countRuns([]), ...expectedPay(countRuns([]), settings), paid: 0, unpaid: 0, disputed: 0, pay_total: 0, pay_count: 0 };
  const weeks = new Map();
  const months = new Map();
  for (const trip of trips) {
    const counts = countRuns([trip]);
    const expected = expectedForTrip(trip, settings);
    const pay = trip.pay_amount == null || trip.pay_amount === '' ? null : Number(trip.pay_amount);
    const add = (bucket) => {
      bucket.trips += counts.trips;
      bucket.sunrise += counts.sunrise;
      bucket.mtv += counts.mtv;
      bucket.also_sunrise += counts.also_sunrise;
      bucket.gross = roundMoney(bucket.gross + expected.gross);
      bucket.load_unload = roundMoney(bucket.load_unload + expected.load_unload);
      bucket.total = roundMoney(bucket.total + expected.total);
      bucket.miles = roundMoney(bucket.miles + expected.miles);
      if (pay != null && Number.isFinite(pay)) {
        bucket.pay_total = roundMoney(bucket.pay_total + pay);
        bucket.pay_count += 1;
      }
      if (trip.paid_status === 'paid' || trip.paid_status === 'unpaid' || trip.paid_status === 'disputed') {
        bucket[trip.paid_status] += 1;
      }
    };
    add(totals);
    if (!weeks.has(trip.week_start)) {
      weeks.set(trip.week_start, {
        week_start: trip.week_start,
        week_end: trip.week_end,
        pay_month: trip.pay_month,
        stub_date: addDays(trip.week_end, 1),
        members: [],
        ...countRuns([]),
        ...expectedPay(countRuns([]), settings),
        paid: 0,
        unpaid: 0,
        disputed: 0,
        pay_total: 0,
        pay_count: 0,
      });
    }
    const week = weeks.get(trip.week_start);
    week.members.push(trip);
    add(week);
    if (!months.has(trip.pay_month)) {
      months.set(trip.pay_month, {
        pay_month: trip.pay_month,
        ...countRuns([]),
        ...expectedPay(countRuns([]), settings),
        paid: 0,
        unpaid: 0,
        disputed: 0,
        pay_total: 0,
        pay_count: 0,
      });
    }
    add(months.get(trip.pay_month));
  }
  const byWeek = [...weeks.values()]
    .map((week) => {
      const loadNumber = modeLoad(week.members);
      const { members, ...rest } = week;
      return { ...rest, load_number: loadNumber, trip_count: members.length };
    })
    .sort((a, b) => (a.week_start < b.week_start ? -1 : 1));
  const byMonth = [...months.values()].sort((a, b) => (a.pay_month < b.pay_month ? -1 : 1));
  return { totals, byWeek, byMonth };
}

function moneyOrNull(value) {
  if (value == null || value === '') return null;
  const n = roundMoney(value);
  return Number.isFinite(n) ? n : null;
}

export function reconcileLoads(trips, lines, settings = DEFAULT_SETTINGS) {
  const byLoad = new Map();
  for (const trip of trips || []) {
    const load = normalizeLoadNumber(trip.load_number) || trip.load_number;
    if (!load) continue;
    if (!byLoad.has(load)) byLoad.set(load, []);
    byLoad.get(load).push(trip);
  }
  const lineByLoad = new Map();
  for (const line of lines || []) {
    const load = normalizeLoadNumber(line.load_number) || line.load_number;
    if (!load) continue;
    lineByLoad.set(load, line);
  }
  const loads = new Set([...byLoad.keys(), ...lineByLoad.keys()]);
  const rows = [];
  for (const load of loads) {
    const group = byLoad.get(load) || [];
    const line = lineByLoad.get(load) || null;
    const counts = countRuns(group);
    const expected = expectedPay(counts, settings);
    const paid = line
      ? {
          gross: moneyOrNull(line.gross) || 0,
          load_unload: moneyOrNull(line.load_unload) || 0,
          miles: moneyOrNull(line.mileage),
          line_date: line.line_date || '',
        }
      : null;
    if (paid) paid.total = roundMoney(paid.gross + paid.load_unload);
    let flag = 'match';
    if (group.length && !line) flag = 'missing';
    else if (!group.length && line) flag = 'extra';
    else if (paid && paid.total + 0.009 < expected.total) flag = 'short';
    else if (paid && paid.total > expected.total + 0.009) flag = 'extra';
    const sample = group[0];
    let weekStart = sample?.week_start || '';
    let weekEnd = sample?.week_end || '';
    let payMonth = sample?.pay_month || '';
    if (!weekEnd && paid?.line_date) {
      weekEnd = addDays(paid.line_date, -1);
      weekStart = addDays(weekEnd, -6);
      payMonth = payMonthForDate(weekEnd);
    }
    rows.push({
      load_number: load,
      week_start: weekStart,
      week_end: weekEnd,
      pay_month: payMonth,
      stub_date: paid?.line_date || (weekEnd ? addDays(weekEnd, 1) : ''),
      trips: counts.trips,
      sunrise: counts.sunrise,
      mtv: counts.mtv,
      expected,
      paid,
      flag,
    });
  }
  rows.sort((a, b) => (a.week_start === b.week_start ? (a.load_number < b.load_number ? -1 : 1) : a.week_start < b.week_start ? -1 : 1));
  return rows;
}

function parseLine(raw) {
  const lineDate = String(raw?.line_date ?? '').trim();
  if (!isRealDate(lineDate)) throw new HttpError(400, 'Each paystub line needs a real date.');
  const load = normalizeLoadNumber(raw?.load_number);
  if (!load) throw new HttpError(400, 'Each paystub line needs a load number like TA-6037.');
  const mileage = raw?.mileage == null || raw?.mileage === '' ? null : parsePayAmount(raw.mileage, 'Mileage');
  const gross = raw?.gross == null || raw?.gross === '' ? null : parsePayAmount(raw.gross, 'Gross');
  const loadUnload = raw?.load_unload == null || raw?.load_unload === '' ? 0 : parsePayAmount(raw.load_unload, 'Load/unload');
  return { line_date: lineDate, load_number: load, mileage, gross, load_unload: loadUnload };
}

export function parsePaystub(fields) {
  const payMonth = String(fields?.pay_month ?? '').trim();
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(payMonth)) throw new HttpError(400, 'Pay month should look like 2026-10.');
  const status = normalizePaidStatus(fields?.status || 'unpaid');
  if (!status) throw new HttpError(400, 'Paid status must be unpaid, paid, or disputed.');
  const vacationDays = fields?.vacation_days == null || fields?.vacation_days === '' ? 0 : parsePayAmount(fields.vacation_days, 'Vacation days');
  const vacationPay = fields?.vacation_pay == null || fields?.vacation_pay === '' ? 0 : parsePayAmount(fields.vacation_pay, 'Vacation pay');
  const netPay = fields?.net_pay == null || fields?.net_pay === '' ? null : parsePayAmount(fields.net_pay, 'Net pay');
  const linesIn = Array.isArray(fields?.lines) ? fields.lines : [];
  const lines = linesIn.map(parseLine);
  const seen = new Set();
  for (const line of lines) {
    if (seen.has(line.load_number)) throw new HttpError(400, `Load ${line.load_number} is on this paystub twice.`);
    seen.add(line.load_number);
  }
  const notes = cleanNotes(fields?.notes);
  return {
    pay_month: payMonth,
    net_pay: netPay,
    vacation_days: vacationDays,
    vacation_pay: vacationPay,
    status,
    notes: notes || null,
    lines,
  };
}
