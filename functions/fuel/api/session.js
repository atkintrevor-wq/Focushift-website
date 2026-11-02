import { json, onRequestHandler } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireAdmin(context);
  return json({ ok: true });
});
