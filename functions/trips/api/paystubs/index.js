import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireTripsAuth } from '../../../_lib/trips-auth.js';
import { parsePaystub } from '../../../_lib/trips-logic.js';
import { createPaystub, listPaystubs, useTripsDb } from '../../../_lib/trips-db.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'The paystub could not be read.');
  }
}

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const db = await useTripsDb(context.env);
  return json({ paystubs: await listPaystubs(db) });
});

export const onRequestPost = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const record = parsePaystub(await readJson(context.request));
  const db = await useTripsDb(context.env);
  const paystub = await createPaystub(db, record);
  return json(paystub, 201);
});
