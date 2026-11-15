import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { safeEqual } from '../../_lib/auth.js';
import {
  assertPasswordConfigured,
  assertLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
  tripsSessionCookie,
} from '../../_lib/trips-auth.js';
import { useTripsDb } from '../../_lib/trips-db.js';

export const onRequestPost = onRequestHandler(async (context) => {
  const { request, env } = context;
  assertPasswordConfigured(env);
  const db = await useTripsDb(env);
  const attempt = await assertLoginAllowed(db, request);
  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Enter the trip log password.');
  }
  const password = String(body?.password || '');
  if (!password || !safeEqual(password, env.TRIPS_PASSWORD)) {
    await recordLoginFailure(db, attempt.ip, attempt.failures);
    throw new HttpError(401, 'That password was not accepted.');
  }
  await clearLoginFailures(db, attempt.ip);
  return json({ ok: true }, 200, { 'set-cookie': await tripsSessionCookie(request, env) });
});
