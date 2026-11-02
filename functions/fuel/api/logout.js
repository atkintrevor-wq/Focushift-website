import { json, onRequestHandler } from '../../_lib/http.js';
import { clearSessionCookie } from '../../_lib/auth.js';

export const onRequestPost = onRequestHandler(async ({ request }) => {
  return json({ ok: true }, 200, { 'set-cookie': clearSessionCookie(request) });
});
