import { json, onRequestHandler } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';
import { parseExportFormat, parseTripQuery } from '../../_lib/trips-logic.js';
import { listPaystubs, listTrips, useTripsDb } from '../../_lib/trips-db.js';
import { exportFilename, tripsCsv, tripsWorkbook } from '../../_lib/trips-export.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const url = new URL(context.request.url);
  const filters = parseTripQuery(url.searchParams);
  const format = parseExportFormat(url.searchParams);
  const db = await useTripsDb(context.env);
  const { trips, truncated, settings } = await listTrips(db, filters);
  if (truncated) {
    return json({ error: 'Too many trips to export in one file. Narrow the month or the dates.' }, 400);
  }
  if (format === 'csv') {
    const filename = exportFilename(filters, 'csv');
    return new Response(tripsCsv(trips), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${filename}"`,
        'cache-control': 'no-store',
      },
    });
  }
  const paystubs = await listPaystubs(db);
  const filename = exportFilename(filters, 'xlsx');
  return new Response(tripsWorkbook(trips, paystubs, settings), {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
});
