import { onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireAdmin } from '../../../_lib/auth.js';
import { useDb } from '../../../_lib/queries.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireAdmin(context);
  const id = Number(context.params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, 'That receipt was not found.');
  const db = await useDb(context.env);
  const row = await db.prepare('SELECT receipt_key FROM fuel_entries WHERE id = ?').bind(id).first();
  if (!row?.receipt_key) throw new HttpError(404, 'That entry has no receipt photo.');
  if (!context.env.RECEIPTS || typeof context.env.RECEIPTS.get !== 'function') {
    throw new HttpError(503, 'Receipt storage is not connected. Bind an R2 bucket as RECEIPTS, then redeploy.');
  }
  const object = await context.env.RECEIPTS.get(row.receipt_key);
  if (!object) throw new HttpError(404, 'The receipt photo is missing from storage.');
  const ext = row.receipt_key.includes('.') ? row.receipt_key.slice(row.receipt_key.lastIndexOf('.')) : '';
  const headers = new Headers();
  headers.set('content-type', object.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('content-disposition', `inline; filename="receipt-${id}${ext}"`);
  headers.set('cache-control', 'private, max-age=3600');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(object.body, { headers });
});
