import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireAdmin, assertDriverPin } from '../../../_lib/auth.js';
import { parseEntry, parseFilters } from '../../../_lib/validate.js';
import { useDb, loadRows, findByClientId, toPublicEntry } from '../../../_lib/queries.js';
import { storeReceipt, deleteReceipt } from '../../../_lib/receipts.js';

async function readFields(request) {
  const type = request.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    let body;
    try {
      body = await request.json();
    } catch {
      throw new HttpError(400, 'The fuel entry could not be read.');
    }
    return { fields: body || {}, file: null };
  }
  let form;
  try {
    form = await request.formData();
  } catch {
    throw new HttpError(400, 'The fuel entry could not be read.');
  }
  const fields = {};
  for (const key of [
    'purchase_date',
    'state',
    'station_name',
    'gallons',
    'total_price',
    'truck_number',
    'driver_name',
    'client_id',
    'driver_pin',
    'company_website',
  ]) {
    const value = form.get(key);
    if (typeof value === 'string') fields[key] = value;
  }
  const file = form.get('receipt');
  const hasFile = file && typeof file === 'object' && typeof file.arrayBuffer === 'function' && file.size > 0;
  return { fields, file: hasFile ? file : null };
}

export const onRequestGet = onRequestHandler(async (context) => {
  await requireAdmin(context);
  const filters = parseFilters(new URL(context.request.url).searchParams);
  const db = await useDb(context.env);
  const { rows, truncated } = await loadRows(db, filters);
  const entries = rows
    .map((row) => toPublicEntry(row))
    .sort((a, b) => {
      if (a.purchase_date !== b.purchase_date) return a.purchase_date < b.purchase_date ? 1 : -1;
      return b.id - a.id;
    });
  return json({ entries, truncated });
});

export const onRequestPost = onRequestHandler(async (context) => {
  const { request, env } = context;
  const { fields, file } = await readFields(request);
  const entry = parseEntry(fields);
  assertDriverPin(env, entry.driver_pin);

  const db = await useDb(env);
  const existing = await findByClientId(db, entry.client_id);
  if (existing) return json(toPublicEntry(existing, { duplicate: true, receipt_stored: Boolean(existing.receipt_key) }), 200);

  const stored = await storeReceipt(env, file);
  let receiptKey = stored.receiptKey;
  try {
    const result = await db
      .prepare(
        `INSERT INTO fuel_entries
         (client_id, purchase_date, state, station_name, gallons, total_price, truck_number, driver_name, receipt_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.client_id,
        entry.purchase_date,
        entry.state,
        entry.station_name,
        entry.gallons,
        entry.total_price,
        entry.truck_number,
        entry.driver_name,
        receiptKey
      )
      .run();
    const id = Number(result.meta?.last_row_id);
    const saved = id
      ? await db.prepare('SELECT * FROM fuel_entries WHERE id = ?').bind(id).first()
      : await findByClientId(db, entry.client_id);
    if (!saved) throw new Error('insert did not return a row');
    return json(
      toPublicEntry(saved, {
        receipt_stored: Boolean(saved.receipt_key),
        warning: stored.warning,
      }),
      201
    );
  } catch (err) {
    if (entry.client_id && /UNIQUE/i.test(String(err?.message || err))) {
      await deleteReceipt(env, receiptKey);
      const duplicate = await findByClientId(db, entry.client_id);
      if (duplicate) return json(toPublicEntry(duplicate, { duplicate: true }), 200);
    }
    await deleteReceipt(env, receiptKey);
    throw err;
  }
});
