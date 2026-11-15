import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';
import { getSettings, saveSettings, useTripsDb } from '../../_lib/trips-db.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'The pay rates could not be read.');
  }
}

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const db = await useTripsDb(context.env);
  return json(await getSettings(db));
});

export const onRequestPut = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const fields = await readJson(context.request);
  const db = await useTripsDb(context.env);
  return json(await saveSettings(db, fields));
});
