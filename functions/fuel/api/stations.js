import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { assertDriverPin } from '../../_lib/auth.js';
import { useDb } from '../../_lib/queries.js';
import { isState } from '../../_lib/states.js';
import { rankStores } from '../../_lib/stores.js';

function clean(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

export const onRequestGet = onRequestHandler(async ({ request, env }) => {
  if (!env.FUEL_DRIVER_PIN) {
    throw new HttpError(403, 'Store suggestions need a driver PIN.');
  }
  const pin = request.headers.get('x-fuel-pin') || '';
  assertDriverPin(env, pin);

  const url = new URL(request.url);
  const truck = clean(url.searchParams.get('truck'), 40);
  const driver = clean(url.searchParams.get('driver'), 80);
  const state = clean(url.searchParams.get('state'), 8).toUpperCase();
  if (!truck && !driver) {
    throw new HttpError(400, 'Enter a truck number or a driver name.');
  }
  if (state && !isState(state)) throw new HttpError(400, 'That state is not valid.');

  const clauses = [];
  const binds = [];
  if (truck) {
    clauses.push('lower(truck_number) = lower(?)');
    binds.push(truck);
  }
  if (driver) {
    clauses.push('lower(driver_name) = lower(?)');
    binds.push(driver);
  }

  const db = await useDb(env);
  let stmt = db.prepare(
    `SELECT id, station_name, state, purchase_date
     FROM fuel_entries
     WHERE ${clauses.join(' OR ')}`
  );
  stmt = stmt.bind(...binds);
  const result = await stmt.all();
  const stores = rankStores(result.results || [], { state, limit: 12 });
  return json({ stores });
});
