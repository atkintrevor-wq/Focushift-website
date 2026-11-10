import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireTripsAuth } from '../../../_lib/trips-auth.js';
import { parseTrip, parseTripQuery } from '../../../_lib/trips-logic.js';
import { insertTrip, listTrips, useTripsDb } from '../../../_lib/trips-db.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'The trip could not be read.');
  }
}

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const filters = parseTripQuery(new URL(context.request.url).searchParams);
  const db = await useTripsDb(context.env);
  const { trips, truncated, settings } = await listTrips(db, filters);
  return json({ trips, truncated, settings });
});

export const onRequestPost = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const fields = await readJson(context.request);
  const db = await useTripsDb(context.env);
  const { trips } = await listTrips(db, {});
  const record = parseTrip(fields, trips);
  const { trip, duplicate } = await insertTrip(db, record);
  if (duplicate) return json({ ...trip, duplicate: true }, 200);
  return json(trip, 201);
});
