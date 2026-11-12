import { json, onRequestHandler, HttpError } from '../../../_lib/http.js';
import { requireTripsAuth } from '../../../_lib/trips-auth.js';
import { parseTrip } from '../../../_lib/trips-logic.js';
import { deleteTrip, getTrip, listTrips, setPaidStatus, tripId, updateTrip, useTripsDb } from '../../../_lib/trips-db.js';

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, 'The trip could not be read.');
  }
}

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const db = await useTripsDb(context.env);
  const trip = await getTrip(db, id);
  if (!trip) throw new HttpError(404, 'That trip was not found.');
  return json(trip);
});

export const onRequestPut = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const fields = await readJson(context.request);
  const db = await useTripsDb(context.env);
  const { trips } = await listTrips(db, {});
  const record = parseTrip(fields, trips.filter((trip) => trip.id !== id));
  const trip = await updateTrip(db, id, record);
  if (!trip) throw new HttpError(404, 'That trip was not found.');
  return json(trip);
});

export const onRequestPatch = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const body = await readJson(context.request);
  const db = await useTripsDb(context.env);
  const trip = await setPaidStatus(db, id, body?.paid_status);
  if (!trip) throw new HttpError(404, 'That trip was not found.');
  return json(trip);
});

export const onRequestDelete = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const id = tripId(context.params);
  const db = await useTripsDb(context.env);
  const removed = await deleteTrip(db, id);
  if (!removed) throw new HttpError(404, 'That trip was not found.');
  return json({ ok: true, id });
});
