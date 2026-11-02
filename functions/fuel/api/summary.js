import { json, onRequestHandler } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { parseFilters } from '../../_lib/validate.js';
import { aggregate } from '../../_lib/aggregate.js';
import { useDb, loadRows, loadOptions } from '../../_lib/queries.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireAdmin(context);
  const filters = parseFilters(new URL(context.request.url).searchParams);
  const db = await useDb(context.env);
  const [{ rows, truncated }, options] = await Promise.all([loadRows(db, filters), loadOptions(db)]);
  return json({ ...aggregate(rows), options, truncated });
});
