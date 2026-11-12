import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
import { onRequestGet as health } from '../trips/api/health.js';
import { onRequestPost as login } from '../trips/api/login.js';
import { onRequestGet as session } from '../trips/api/session.js';
import { onRequestPost as seed } from '../trips/api/seed.js';
import { onRequestGet as listTripsRoute, onRequestPost as createTrip } from '../trips/api/trips/index.js';
import { onRequestPatch as patchTrip, onRequestPut as updateTrip } from '../trips/api/trips/[id].js';
import { onRequestGet as suggest } from '../trips/api/suggest.js';
import { onRequestGet as reconcile } from '../trips/api/reconcile.js';
import { onRequestPut as saveRates } from '../trips/api/settings.js';
import { onRequestGet as exportTrips } from '../trips/api/export.js';
import {
  SEED_TRIPS,
  expectedPay,
  payMonthForDate,
  suggestLoadNumber,
  weekOf,
} from './trips-logic.js';

const PASSWORD = 'trips-secret';

function createFakeDb() {
  const sqlite = new DatabaseSync(':memory:');
  function wrap(sql, params) {
    return {
      bind(...next) { return wrap(sql, next); },
      async run() {
        const info = sqlite.prepare(sql).run(...params);
        return { success: true, meta: { last_row_id: Number(info.lastInsertRowid), changes: info.changes } };
      },
      async first() {
        return sqlite.prepare(sql).get(...params) || null;
      },
      async all() {
        return { results: sqlite.prepare(sql).all(...params) };
      },
    };
  }
  return {
    prepare(sql) { return wrap(sql, []); },
    async batch(statements) {
      const out = [];
      for (const stmt of statements) out.push(await stmt.run());
      return out;
    },
  };
}

function env(db = createFakeDb()) {
  return { DB: db, TRIPS_PASSWORD: PASSWORD };
}

function call(handler, url, { method = 'GET', body, headers = {}, cookie } = {}, contextEnv = env()) {
  const request = new Request(url, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const id = url.split('/').pop().split('?')[0];
  return handler({ request, env: contextEnv, params: { id } });
}

function clientWeek() {
  const sandbox = { window: {}, Map, Date, Number, String, Object };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(new URL('../../trips/week.js', import.meta.url), 'utf8'), sandbox);
  return sandbox.window.TripWeek;
}

test('worked weeks are not numbered from the calendar', () => {
  assert.equal(weekOf('2026-10-04').week_end, '2026-10-04');
  assert.equal(weekOf('2026-09-30').stub_date, '2026-10-05');
  assert.equal(payMonthForDate('2026-09-30'), '2026-10');
  assert.equal(payMonthForDate('2026-10-27'), '2026-11');
  assert.equal(weekOf('2026-11-09').week_start, '2026-11-09');
  assert.equal('load_number' in weekOf('2026-11-09'), false);

  const seeded = SEED_TRIPS.map((trip) => ({ ...trip, ...weekOf(trip.trip_date) }));
  assert.equal(suggestLoadNumber('2026-11-03', seeded).load_number, 'TA-6042');
  assert.equal(suggestLoadNumber('2026-11-03', seeded).source, 'week');
  assert.equal(suggestLoadNumber('2026-11-09', seeded).load_number, 'TA-6043');
  assert.equal(suggestLoadNumber('2026-11-09', seeded).source, 'next');
  assert.equal(suggestLoadNumber('2026-09-22', seeded).load_number, 'TA-6043');
  assert.notEqual(suggestLoadNumber('2026-09-22', seeded).load_number, 'TA-6036');
  assert.equal(suggestLoadNumber('2026-11-09', []).load_number, 'TA-6043');
  assert.equal(suggestLoadNumber('2026-11-09', []).source, 'anchor');
  assert.equal(suggestLoadNumber('2026-09-14', []).load_number, '');

  const client = clientWeek();
  for (const trip of seeded) {
    assert.equal(client.suggestLoadNumber(trip.trip_date, seeded).load_number, trip.load_number, trip.trip_date);
    assert.equal(client.payMonthForDate(trip.trip_date), trip.pay_month);
  }
  assert.equal(client.suggestLoadNumber('2026-11-09', seeded).load_number, 'TA-6043');
  assert.equal(client.weekOf('2026-09-30').stub_date, '2026-10-05');
});

test('expected pay matches the October stub rates', () => {
  const threeMtv = expectedPay({ sunrise: 0, mtv: 3 });
  assert.equal(threeMtv.gross, 780);
  assert.equal(threeMtv.load_unload, 180);
  assert.equal(threeMtv.miles, 900);
  assert.equal(expectedPay({ sunrise: 3, mtv: 0 }).gross, 720);
  assert.equal(expectedPay({ sunrise: 3, mtv: 0 }).miles, 780);
  assert.equal(expectedPay({ sunrise: 4, mtv: 0 }).gross, 960);
  assert.equal(expectedPay({ sunrise: 1, mtv: 0 }).gross, 240);
});

test('seed, pay month, paystub, and reconcile', async () => {
  const db = createFakeDb();
  const contextEnv = env(db);
  const tables = await call(health, 'http://localhost/trips/api/health', {}, { DB: db });
  assert.equal((await tables.json()).password, false);
  const bare = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite%'").all();
  assert.deepEqual(bare.results, []);

  const seeded = await call(seed, 'http://localhost/trips/api/seed', {
    method: 'POST',
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  assert.equal(seeded.status, 200);
  const seedBody = await seeded.json();
  assert.equal(seedBody.inserted, SEED_TRIPS.length);
  assert.equal(seedBody.paystub, 'inserted');

  const again = await call(seed, 'http://localhost/trips/api/seed', {
    method: 'POST',
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const againBody = await again.json();
  assert.equal(againBody.inserted, 0);
  assert.equal(againBody.skipped, SEED_TRIPS.length);
  assert.equal(againBody.paystub, 'skipped');

  const october = await call(listTripsRoute, 'http://localhost/trips/api/trips?month=2026-10', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const octoberBody = await october.json();
  assert.equal(octoberBody.trips.length, 11);
  assert.ok(octoberBody.trips.every((trip) => trip.pay_month === '2026-10'));
  assert.ok(octoberBody.trips.every((trip) => trip.paid_status === 'paid'));
  assert.equal(octoberBody.trips.find((trip) => trip.trip_date === '2026-09-30').load_number, 'TA-6037');
  assert.equal(octoberBody.trips.find((trip) => trip.trip_date === '2026-10-20').expected_gross, 260);
  assert.equal(octoberBody.trips.find((trip) => trip.trip_date === '2026-10-20').expected_load_unload, 60);

  const september = await call(listTripsRoute, 'http://localhost/trips/api/trips?month=2026-09', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const septemberTrips = (await september.json()).trips;
  assert.equal(septemberTrips.length, 12);
  assert.ok(septemberTrips.every((trip) => trip.paid_status === 'unpaid'));

  const open = await call(listTripsRoute, 'http://localhost/trips/api/trips', {}, contextEnv);
  assert.equal(open.status, 401);

  const compared = await call(reconcile, 'http://localhost/trips/api/reconcile?month=2026-10', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const report = await compared.json();
  assert.equal(report.paystubs[0].net_pay, 2856.6);
  assert.equal(report.paystubs[0].vacation_days, 3);
  assert.equal(report.paystubs[0].vacation_pay, 720);
  assert.equal(report.paystubs[0].lines.find((line) => line.load_number === 'TA-6037').line_date, '2026-10-05');
  assert.deepEqual(report.rows.map((row) => `${row.load_number}:${row.flag}`), [
    'TA-6037:match',
    'TA-6038:match',
    'TA-6039:match',
    'TA-6040:match',
  ]);
  assert.equal(report.rows.find((row) => row.load_number === 'TA-6040').expected.load_unload, 180);
  assert.equal(report.rows.find((row) => row.load_number === 'TA-6038').paid.miles, 1041);

  const all = await call(reconcile, 'http://localhost/trips/api/reconcile', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const flags = new Map((await all.json()).rows.map((row) => [row.load_number, row.flag]));
  assert.equal(flags.get('TA-6036'), 'missing');
  assert.equal(flags.get('TA-6041'), 'missing');
  assert.equal(flags.get('TA-6042'), 'missing');

  const next = await call(suggest, 'http://localhost/trips/api/suggest?date=2026-11-10', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  const suggestion = await next.json();
  assert.equal(suggestion.load_number, 'TA-6043');
  assert.equal(suggestion.week_start, '2026-11-09');
  assert.equal(suggestion.source, 'next');

  const created = await call(createTrip, 'http://localhost/trips/api/trips', {
    method: 'POST',
    headers: { authorization: `Bearer ${PASSWORD}` },
    body: { trip_date: '2026-11-10', run_type: 'Sunrise', load_number: 'TA-6043', client_id: 'client-nov-10' },
  }, contextEnv);
  assert.equal(created.status, 201);
  const createdTrip = await created.json();
  assert.equal(createdTrip.load_number, 'TA-6043');
  assert.equal(createdTrip.expected_gross, 240);

  const sameWeek = await call(suggest, 'http://localhost/trips/api/suggest?date=2026-11-12', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  assert.equal((await sameWeek.json()).source, 'week');

  const patched = await call(patchTrip, `http://localhost/trips/api/trips/${createdTrip.id}`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${PASSWORD}` },
    body: { paid_status: 'disputed' },
  }, contextEnv);
  assert.equal((await patched.json()).paid_status, 'disputed');

  const edited = await call(updateTrip, `http://localhost/trips/api/trips/${createdTrip.id}`, {
    method: 'PUT',
    headers: { authorization: `Bearer ${PASSWORD}` },
    body: { trip_date: '2026-11-10', run_type: 'MTV/SH', also_sunrise: true, load_number: '6043' },
  }, contextEnv);
  const editedTrip = await edited.json();
  assert.equal(editedTrip.run_type, 'MTV/SH');
  assert.equal(editedTrip.also_sunrise, true);
  assert.equal(editedTrip.load_number, 'TA-6043');
  assert.equal(editedTrip.paid_status, 'disputed');
  assert.equal(editedTrip.expected_total, 320);

  const workbook = await call(exportTrips, 'http://localhost/trips/api/export?month=2026-10', {
    headers: { authorization: `Bearer ${PASSWORD}` },
  }, contextEnv);
  assert.equal(workbook.status, 200);
  const bytes = new Uint8Array(await workbook.arrayBuffer());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  const python = spawnSync('python3', ['-c', `
import io, sys, zipfile
z = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
book = z.read('xl/workbook.xml').decode()
for name in ('Trips', 'By Week', 'By Pay Month', 'Paystub', 'Reconcile'):
    if name not in book:
        raise SystemExit('missing ' + name)
if 'TA-6037' not in z.read('xl/worksheets/sheet5.xml').decode():
    raise SystemExit('reconcile missing load')
print('ok')
`], { input: Buffer.from(bytes) });
  assert.equal(python.status, 0, python.stderr?.toString() || python.stdout?.toString());

  const rates = await call(saveRates, 'http://localhost/trips/api/settings', {
    method: 'PUT',
    headers: { authorization: `Bearer ${PASSWORD}` },
    body: { sunrise_pay: 250 },
  }, contextEnv);
  assert.equal((await rates.json()).sunrise_pay, 250);

  const signed = await call(login, 'https://localhost/trips/api/login', { method: 'POST', body: { password: PASSWORD } }, contextEnv);
  assert.equal(signed.status, 200);
  const cookie = signed.headers.get('set-cookie');
  assert.match(cookie, /trips_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Path=\/trips/);
  assert.match(cookie, /Secure/);
  const token = cookie.split(';', 1)[0];
  const who = await call(session, 'https://localhost/trips/api/session', { cookie: token }, contextEnv);
  assert.equal(who.status, 200);
  const fuelish = await call(session, 'https://localhost/trips/api/session', {
    headers: { authorization: 'Bearer wrong-password' },
    cookie: token,
  }, contextEnv);
  assert.equal(fuelish.status, 401);
});

test('routes include the trip API without dropping fuel', () => {
  const routes = JSON.parse(readFileSync(new URL('../../_routes.json', import.meta.url), 'utf8'));
  assert.deepEqual(routes.include, ['/fuel/api/*', '/trips/api/*']);
  const logic = readFileSync(new URL('./trips-logic.js', import.meta.url), 'utf8');
  assert.equal(logic.includes('ANCHOR_NUMBER'), false);
});
