import { onRequestHandler, roundGal, roundMoney } from '../../_lib/http.js';
import { requireAdmin } from '../../_lib/auth.js';
import { parseFilters } from '../../_lib/validate.js';
import { aggregate } from '../../_lib/aggregate.js';
import { useDb, loadRows } from '../../_lib/queries.js';
import { buildFuelWorkbook } from '../../_lib/xlsx.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireAdmin(context);
  const url = new URL(context.request.url);
  const filters = parseFilters(url.searchParams);
  const db = await useDb(context.env);
  const { rows } = await loadRows(db, filters);
  const summary = aggregate(rows);
  const entries = rows.map((row) => ({
    id: row.id,
    purchase_date: row.purchase_date,
    state: row.state,
    station_name: row.station_name,
    gallons: roundGal(row.gallons),
    total_price: roundMoney(row.total_price),
    truck_number: row.truck_number,
    driver_name: row.driver_name,
    receipt: row.receipt_key ? `${url.origin}/fuel/api/receipts/${row.id}` : '',
    created_at: row.created_at,
  }));
  const bytes = buildFuelWorkbook({ entries, byState: summary.byState, byQuarter: summary.byQuarter });
  const filename = `ifta-fuel-log-${new Date().toISOString().slice(0, 10)}.xlsx`;
  return new Response(bytes, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
});
