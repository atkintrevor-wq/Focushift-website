let schemaPromise = null;

export function ensureSchema(db) {
  if (!schemaPromise) {
    schemaPromise = db
      .batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS fuel_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          client_id TEXT UNIQUE,
          purchase_date TEXT NOT NULL,
          state TEXT NOT NULL,
          station_name TEXT NOT NULL,
          gallons REAL NOT NULL,
          total_price REAL NOT NULL,
          truck_number TEXT NOT NULL,
          driver_name TEXT NOT NULL,
          receipt_key TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_fuel_entries_date ON fuel_entries (purchase_date)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_fuel_entries_state ON fuel_entries (state)'),
        db.prepare(`CREATE TABLE IF NOT EXISTS auth_attempts (
          ip TEXT PRIMARY KEY,
          failures INTEGER NOT NULL DEFAULT 0,
          locked_until TEXT
        )`),
      ])
      .catch((err) => {
        schemaPromise = null;
        throw err;
      });
  }
  return schemaPromise;
}
