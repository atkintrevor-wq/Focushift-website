import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireAdmin } from '../../../_lib/auth.js';
import { useDb } from '../../../_lib/queries.js';
import { deleteReceipt } from '../../../_lib/receipts.js';

function entryId(params) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, 'That entry was not found.');
  return id;
}

export const onRequestDelete = onRequestHandler(async (context) => {
  await requireAdmin(context);
  const id = entryId(context.params);
  const db = await useDb(context.env);
  const row = await db.prepare('SELECT id, receipt_key FROM fuel_entries WHERE id = ?').bind(id).first();
  if (!row) throw new HttpError(404, 'That entry was not found.');
  await db.prepare('DELETE FROM fuel_entries WHERE id = ?').bind(id).run();
  await deleteReceipt(context.env, row.receipt_key);
  return json({ ok: true, id });
});
