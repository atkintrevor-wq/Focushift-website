import { json, onRequestHandler } from '../../_lib/http.js';
import { requireTripsAuth } from '../../_lib/trips-auth.js';
import { parseTripQuery, reconcileLoads } from '../../_lib/trips-logic.js';
import { getSettings, listPaystubs, listTrips, useTripsDb } from '../../_lib/trips-db.js';

export const onRequestGet = onRequestHandler(async (context) => {
  await requireTripsAuth(context);
  const filters = parseTripQuery(new URL(context.request.url).searchParams);
  const db = await useTripsDb(context.env);
  const [{ trips }, paystubs, settings] = await Promise.all([
    listTrips(db, filters.month ? { month: filters.month } : {}),
    listPaystubs(db),
    getSettings(db),
  ]);
  const stubs = filters.month ? paystubs.filter((stub) => stub.pay_month === filters.month) : paystubs;
  const lines = stubs.flatMap((stub) => stub.lines || []);
  const rows = reconcileLoads(trips, lines, settings);
  return json({
    settings,
    paystubs: stubs,
    rows,
    month: filters.month || '',
  });
});
