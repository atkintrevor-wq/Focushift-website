import { json, onRequestHandler } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  return json({ ok: true });
});
