import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { safeEqual, sessionCookie, assertLoginAllowed, recordLoginFailure, clearLoginFailures } from '../../_lib/auth.js';
import { useDb } from '../../_lib/queries.js';

export const onRequestPost = onRequestHandler(async (context) => {
  const { request, env } = context;
  if (!env.FUEL_ADMIN_PASSWORD) {
    throw new HttpError(503, 'Admin password is not set. Add the FUEL_ADMIN_PASSWORD secret, then redeploy.');
  }
  const db = await useDb(env);
  const attempt = await assertLoginAllowed(db, request);
  let body;
  try {
    body = await request.json();
  } catch {
    throw new HttpError(400, 'Enter the admin password.');
  }
  const password = String(body?.password || '');
  if (!password || !safeEqual(password, env.FUEL_ADMIN_PASSWORD)) {
    await recordLoginFailure(db, attempt.ip, attempt.failures);
    throw new HttpError(401, 'That password was not accepted.');
  }
  await clearLoginFailures(db, attempt.ip);
  return json({ ok: true }, 200, { 'set-cookie': await sessionCookie(request, env) });
});
