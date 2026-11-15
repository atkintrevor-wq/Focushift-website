import { json, onRequestHandler } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';
import { seedTrips, useTripsDb } from '../../_lib/trips-db.js';

export const onRequestPost = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const db = await useTripsDb(context.env);
  const result = await seedTrips(db);
  return json({ ok: true, ...result });
});
