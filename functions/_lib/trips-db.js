import { HttpError, roundMoney } from './http.js';
import {
  DEFAULT_SETTINGS,
  SEED_PAYSTUB,
  SEED_TRIPS,
  expectedForTrip,
  normalizePaidStatus,
  normalizeSettings,
  parseTrip,
} from './trips-logic.js';

const MAX_ROWS = 5000;
const schemaPromises = new WeakMap();

const COLUMNS = `id, client_id, trip_date, run_type, also_sunrise, notes, pay_amount,
  load_number, week_start, week_end, pay_month, paid_status, created_at, updated_at`;

export function ensureTripsSchema(db) {
  if (!schemaPromises.has(db)) {
    const pending = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS trips (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id TEXT UNIQUE,
          trip_date TEXT NOT NULL,
          run_type TEXT NOT NULL CHECK (run_type IN ('Sunrise', 'MTV/SH')),
          also_sunrise INTEGER NOT NULL DEFAULT 0 CHECK (also_sunrise IN (0, 1)),
          notes TEXT,
          pay_amount REAL,
          load_number TEXT NOT NULL,
          week_start TEXT NOT NULL,
          week_end TEXT NOT NULL,
          pay_month TEXT NOT NULL,
          paid_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (paid_status IN ('unpaid', 'paid', 'disputed')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_trips_date ON trips (trip_date)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_trips_pay_month ON trips (pay_month)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_trips_load ON trips (load_number)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS trip_settings (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          sunrise_pay REAL NOT NULL,
          sunrise_miles REAL NOT NULL,
          mtv_pay REAL NOT NULL,
          mtv_miles REAL NOT NULL,
          load_unload_pay REAL NOT NULL,
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`),
        db.prepare(`INSERT INTO trip_settings (id, sunrise_pay, sunrise_miles, mtv_pay, mtv_miles, load_unload_pay)
          VALUES (1, 240, 260, 260, 300, 60)
          ON CONFLICT(id) DO NOTHING`),
        db.prepare(`CREATE TABLE IF NOT EXISTS paystubs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pay_month TEXT NOT NULL UNIQUE,
          net_pay REAL,
          vacation_days REAL NOT NULL DEFAULT 0,
          vacation_pay REAL NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'disputed')),
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS paystub_lines (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          paystub_id INTEGER NOT NULL,
          line_date TEXT NOT NULL,
          load_number TEXT NOT NULL,
          mileage REAL,
          gross REAL,
          load_unload REAL NOT NULL DEFAULT 0,
          UNIQUE (paystub_id, load_number)
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS trips_auth_attempts (
          ip TEXT PRIMARY KEY,
          failures INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT
        )`),
      ])
      .catch((err) => {
        schemaPromises.delete(db);
        throw err;
      });
    schemaPromises.set(db, pending);
  }
  return schemaPromises.get(db);
}

export async function useTripsDb(env) {
  if (!env.DB) {
    throw new HttpError(
      503,
      'The database is not connected. Bind the existing D1 database as DB on the Pages project, then redeploy.'
    );
  }
  await ensureTripsSchema(env.DB);
  return env.DB;
}

export function toPublicTrip(row, settings = DEFAULT_SETTINGS, extra = {}) {
  const trip = {
    id: row.id,
    client_id: row.client_id || null,
    trip_date: row.trip_date,
    run_type: row.run_type,
    also_sunrise: Number(row.also_sunrise) === 1,
    notes: row.notes || '',
    pay_amount: row.pay_amount == null || row.pay_amount === '' ? null : roundMoney(row.pay_amount),
    load_number: row.load_number,
    week_start: row.week_start,
    week_end: row.week_end,
    pay_month: row.pay_month,
    paid_status: row.paid_status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
  const expected = expectedForTrip(trip, settings);
  return {
    ...trip,
    expected_gross: expected.gross,
    expected_load_unload: expected.load_unload,
    expected_miles: expected.miles,
    expected_total: expected.total,
    ...extra,
  };
}

async function all(db, sql, binds) {
  let stmt = db.prepare(sql);
  if (binds.length) stmt = stmt.bind(...binds);
  const result = await stmt.all();
  return result.results || [];
}

async function getRow(db, id) {
  return db.prepare(`SELECT ${COLUMNS} FROM trips WHERE id = ?`).bind(id).first();
}

export async function findByClientId(db, clientId) {
  if (!clientId) return null;
  return db.prepare(`SELECT ${COLUMNS} FROM trips WHERE client_id = ?`).bind(clientId).first();
}

export function tripId(params) {
  const id = Number(params?.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'That trip was not found.');
  return id;
}

export async function getSettings(db) {
  const row = await db.prepare('SELECT sunrise_pay, sunrise_miles, mtv_pay, mtv_miles, load_unload_pay FROM trip_settings WHERE id = 1').first();
  return normalizeSettings(row || DEFAULT_SETTINGS);
}

export async function saveSettings(db, fields) {
  const current = await getSettings(db);
  const next = normalizeSettings(fields, current);
  await db
    .prepare(
      `UPDATE trip_settings SET
        sunrise_pay = ?, sunrise_miles = ?, mtv_pay = ?, mtv_miles = ?, load_unload_pay = ?,
        updated_at = datetime('now')
      WHERE id = 1`
    )
    .bind(next.sunrise_pay, next.sunrise_miles, next.mtv_pay, next.mtv_miles, next.load_unload_pay)
    .run();
  return getSettings(db);
}

export async function getTrip(db, id) {
  const row = await getRow(db, id);
  if (!row) return null;
  return toPublicTrip(row, await getSettings(db));
}

export async function listTrips(db, filters) {
  const clauses = [];
  const binds = [];
  if (filters.month) {
    clauses.push('pay_month = ?');
    binds.push(filters.month);
  }
  if (filters.from) {
    clauses.push('trip_date >= ?');
    binds.push(filters.from);
  }
  if (filters.to) {
    clauses.push('trip_date <= ?');
    binds.push(filters.to);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const rows = await all(
    db,
    `SELECT ${COLUMNS} FROM trips ${where} ORDER BY trip_date DESC, id DESC LIMIT ?`,
    [...binds, MAX_ROWS + 1]
  );
  const truncated = rows.length > MAX_ROWS;
  const settings = await getSettings(db);
  const trips = (truncated ? rows.slice(0, MAX_ROWS) : rows).map((row) => toPublicTrip(row, settings));
  return { trips, truncated, settings };
}

export async function insertTrip(db, record) {
  if (record.client_id) {
    const existing = await findByClientId(db, record.client_id);
    if (existing) return { trip: toPublicTrip(existing, await getSettings(db)), duplicate: true };
  }
  const paid = normalizePaidStatus(record.paid_status) || 'unpaid';
  try {
    const result = await db
      .prepare(
        `INSERT INTO trips (
          client_id, trip_date, run_type, also_sunrise, notes, pay_amount,
          load_number, week_start, week_end, pay_month, paid_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        record.client_id,
        record.trip_date,
        record.run_type,
        record.also_sunrise,
        record.notes,
        record.pay_amount,
        record.load_number,
        record.week_start,
        record.week_end,
        record.pay_month,
        paid
      )
      .run();
    const id = Number(result.meta?.last_row_id);
    const saved = id ? await getRow(db, id) : await findByClientId(db, record.client_id);
    if (!saved) throw new Error('insert did not return a row');
    return { trip: toPublicTrip(saved, await getSettings(db)), duplicate: false };
  } catch (err) {
    if (record.client_id && /UNIQUE/i.test(String(err?.message || err))) {
      const existing = await findByClientId(db, record.client_id);
      if (existing) return { trip: toPublicTrip(existing, await getSettings(db)), duplicate: true };
    }
    throw err;
  }
}

export async function updateTrip(db, id, record) {
  const existing = await getRow(db, id);
  if (!existing) return null;
  await db
    .prepare(
      `UPDATE trips SET
        trip_date = ?, run_type = ?, also_sunrise = ?, notes = ?, pay_amount = ?,
        load_number = ?, week_start = ?, week_end = ?, pay_month = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    )
    .bind(
      record.trip_date,
      record.run_type,
      record.also_sunrise,
      record.notes,
      record.pay_amount,
      record.load_number,
      record.week_start,
      record.week_end,
      record.pay_month,
      id
    )
    .run();
  return toPublicTrip(await getRow(db, id), await getSettings(db));
}

export async function setPaidStatus(db, id, status) {
  const normalized = normalizePaidStatus(status);
  if (!normalized) throw new HttpError(400, 'Paid status must be unpaid, paid, or disputed.');
  const existing = await getRow(db, id);
  if (!existing) return null;
  await db.prepare(`UPDATE trips SET paid_status = ?, updated_at = datetime('now') WHERE id = ?`).bind(normalized, id).run();
  return toPublicTrip(await getRow(db, id), await getSettings(db));
}

export async function deleteTrip(db, id) {
  const existing = await getRow(db, id);
  if (!existing) return false;
  await db.prepare('DELETE FROM trips WHERE id = ?').bind(id).run();
  return true;
}

function publicLine(row) {
  return {
    id: row.id,
    line_date: row.line_date,
    load_number: row.load_number,
    mileage: row.mileage == null ? null : roundMoney(row.mileage),
    gross: row.gross == null ? null : roundMoney(row.gross),
    load_unload: roundMoney(row.load_unload || 0),
  };
}

function publicStub(row, lines) {
  return {
    id: row.id,
    pay_month: row.pay_month,
    net_pay: row.net_pay == null ? null : roundMoney(row.net_pay),
    vacation_days: roundMoney(row.vacation_days || 0),
    vacation_pay: roundMoney(row.vacation_pay || 0),
    status: row.status,
    notes: row.notes || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    lines,
  };
}

export async function listPaystubs(db) {
  const stubs = await all(db, 'SELECT * FROM paystubs ORDER BY pay_month DESC', []);
  const lines = await all(db, 'SELECT * FROM paystub_lines ORDER BY line_date ASC, id ASC', []);
  return stubs.map((stub) => publicStub(stub, lines.filter((line) => line.paystub_id === stub.id).map(publicLine)));
}

async function insertLines(db, paystubId, lines) {
  for (const line of lines) {
    await db
      .prepare(
        `INSERT INTO paystub_lines (paystub_id, line_date, load_number, mileage, gross, load_unload)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(paystubId, line.line_date, line.load_number, line.mileage, line.gross, line.load_unload)
      .run();
  }
}

export async function createPaystub(db, record) {
  const existing = await db.prepare('SELECT id FROM paystubs WHERE pay_month = ?').bind(record.pay_month).first();
  if (existing) throw new HttpError(409, `A paystub for ${record.pay_month} is already saved.`);
  const result = await db
    .prepare(
      `INSERT INTO paystubs (pay_month, net_pay, vacation_days, vacation_pay, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(record.pay_month, record.net_pay, record.vacation_days, record.vacation_pay, record.status, record.notes)
    .run();
  const id = Number(result.meta?.last_row_id);
  await insertLines(db, id, record.lines);
  const stubs = await listPaystubs(db);
  return stubs.find((stub) => stub.id === id) || null;
}

export async function updatePaystub(db, id, record) {
  const existing = await db.prepare('SELECT id FROM paystubs WHERE id = ?').bind(id).first();
  if (!existing) return null;
  const clash = await db.prepare('SELECT id FROM paystubs WHERE pay_month = ? AND id != ?').bind(record.pay_month, id).first();
  if (clash) throw new HttpError(409, `A paystub for ${record.pay_month} is already saved.`);
  await db
    .prepare(
      `UPDATE paystubs SET
        pay_month = ?, net_pay = ?, vacation_days = ?, vacation_pay = ?, status = ?, notes = ?,
        updated_at = datetime('now')
      WHERE id = ?`
    )
    .bind(record.pay_month, record.net_pay, record.vacation_days, record.vacation_pay, record.status, record.notes, id)
    .run();
  await db.prepare('DELETE FROM paystub_lines WHERE paystub_id = ?').bind(id).run();
  await insertLines(db, id, record.lines);
  const stubs = await listPaystubs(db);
  return stubs.find((stub) => stub.id === id) || null;
}

export async function deletePaystub(db, id) {
  const existing = await db.prepare('SELECT id FROM paystubs WHERE id = ?').bind(id).first();
  if (!existing) return false;
  await db.prepare('DELETE FROM paystub_lines WHERE paystub_id = ?').bind(id).run();
  await db.prepare('DELETE FROM paystubs WHERE id = ?').bind(id).run();
  return true;
}

export async function seedTrips(db) {
  let inserted = 0;
  let skipped = 0;
  for (const seed of SEED_TRIPS) {
    const byClient = await findByClientId(db, seed.client_id);
    if (byClient) {
      skipped += 1;
      continue;
    }
    const byDate = await db.prepare('SELECT id FROM trips WHERE trip_date = ?').bind(seed.trip_date).first();
    if (byDate) {
      skipped += 1;
      continue;
    }
    const record = parseTrip(seed);
    record.paid_status = normalizePaidStatus(seed.paid_status) || 'unpaid';
    const { duplicate } = await insertTrip(db, record);
    if (duplicate) skipped += 1;
    else inserted += 1;
  }

  let paystub = 'skipped';
  const existingStub = await db.prepare('SELECT id FROM paystubs WHERE pay_month = ?').bind(SEED_PAYSTUB.pay_month).first();
  if (!existingStub) {
    await createPaystub(db, {
      ...SEED_PAYSTUB,
      notes: null,
    });
    paystub = 'inserted';
  }

  return { inserted, skipped, total: SEED_TRIPS.length, paystub };
}
