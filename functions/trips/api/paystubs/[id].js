import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireTripsAuth } from '../../../_lib/trips-auth.js';
import { parsePaystub } from '../../../_lib/trips-logic.js';
import { deletePaystub, tripId, updatePaystub, useTripsDb } from '../../../_lib/trips-db.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'The paystub could not be read.');
  }
}

export const onRequestPut = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const record = parsePaystub(await readJson(context.request));
  const db = await useTripsDb(context.env);
  const paystub = await updatePaystub(db, id, record);
  if (!paystub) throw new HttpError(404, 'That paystub was not found.');
  return json(paystub);
});

export const onRequestDelete = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const db = await useTripsDb(context.env);
  const removed = await deletePaystub(db, id);
  if (!removed) throw new HttpError(404, 'That paystub was not found.');
  return json({ ok: true, id });
});
