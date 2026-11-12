import { json, onRequestHandler } from '../../_lib/http.js';
import { clearTripsSessionCookie } from '../../_lib/trips-auth.js';

export const onRequestPost = onRequestHandler(async ({ request }) => {
  return json({ ok: true }, 200, { 'set-cookie': clearTripsSessionCookie(request) });
});
