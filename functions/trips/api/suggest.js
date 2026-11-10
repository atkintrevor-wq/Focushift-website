import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';
import { isRealDate } from '../../_lib/validate.js';
import { suggestLoadNumber } from '../../_lib/trips-logic.js';
import { listTrips, useTripsDb } from '../../_lib/trips-db.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const date = new URL(context.request.url).searchParams.get('date') || '';
  if (!isRealDate(date)) throw new HttpError(400, 'Enter a real trip date.');
  const db = await useTripsDb(context.env);
  const { trips } = await listTrips(db, {});
  return json(suggestLoadNumber(date, trips));
});
