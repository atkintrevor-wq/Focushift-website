import { HttpError, roundGal, roundMoney } from './http.js';
import { ensureSchema } from './db.js';

const MAX_ROWS = 20000;

export async function useDb(env) {
  if (!env.DB) {
    throw new HttpError(
      503,
      'The fuel database is not connected. Bind a D1 database as DB on the Pages project, then redeploy.'
    );
  }
  await ensureSchema(env.DB);
  return env.DB;
}

function whereClause(filters) {
  const clauses = [];
  const binds = [];
  if (filters.state) {
    clauses.push('state = ?');
    binds.push(filters.state);
  }
  if (filters.year) {
    clauses.push('substr(purchase_date, 1, 4) = ?');
    binds.push(filters.year);
  }
  if (filters.quarter) {
    const quarter = Number(filters.quarter);
    const start = String((quarter - 1) * 3 + 1).padStart(2, '0');
    const end = String(quarter * 3).padStart(2, '0');
    clauses.push('substr(purchase_date, 6, 2) BETWEEN ? AND ?');
    binds.push(start, end);
  }
  if (filters.driver) {
    const escaped = filters.driver.replace(/[\\%_]/g, (ch) => `\\${ch}`);
    clauses.push(`driver_name LIKE ? ESCAPE '\\'`);
    binds.push(`%${escaped}%`);
  }
  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    binds,
  };
}

async function all(db, sql, binds) {
  let stmt = db.prepare(sql);
  if (binds.length) stmt = stmt.bind(...binds);
  const result = await stmt.all();
  return result.results || [];
}

export async function loadRows(db, filters) {
  const { sql, binds } = whereClause(filters);
  const rows = await all(
    db,
    `SELECT id, client_id, purchase_date, state, station_name, gallons, total_price,
            truck_number, driver_name, receipt_key, created_at
     FROM fuel_entries
     ${sql}
     ORDER BY purchase_date ASC, id ASC
     LIMIT ?`,
    [...binds, MAX_ROWS + 1]
  );
  const truncated = rows.length > MAX_ROWS;
  return { rows: truncated ? rows.slice(0, MAX_ROWS) : rows, truncated };
}

export async function loadOptions(db) {
  const states = await all(db, 'SELECT DISTINCT state AS state FROM fuel_entries ORDER BY state', []);
  const years = await all(
    db,
    'SELECT DISTINCT substr(purchase_date, 1, 4) AS year FROM fuel_entries ORDER BY year DESC',
    []
  );
  return {
    states: states.map((row) => row.state),
    years: years.map((row) => row.year),
  };
}

export async function findByClientId(db, clientId) {
  if (!clientId) return null;
  return db.prepare('SELECT * FROM fuel_entries WHERE client_id = ?').bind(clientId).first();
}

export function toPublicEntry(row, extras = {}) {
  return {
    id: row.id,
    purchase_date: row.purchase_date,
    state: row.state,
    station_name: row.station_name,
    gallons: roundGal(row.gallons),
    total_price: roundMoney(row.total_price),
    truck_number: row.truck_number,
    driver_name: row.driver_name,
    has_receipt: Boolean(row.receipt_key),
    created_at: row.created_at,
    ...extras,
  };
}
