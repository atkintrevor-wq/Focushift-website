import { roundGal, roundMoney } from './http.js';

export function quarterKey(dateStr) {
  const month = Number(String(dateStr).slice(5, 7));
  if (month < 1 || month > 12) return null;
  return {
    year: String(dateStr).slice(0, 4),
    quarter: `Q${Math.ceil(month / 3)}`,
  };
}

export function aggregate(rows) {
  const byState = new Map();
  const byQuarter = new Map();
  let gallons = 0;
  let totalPrice = 0;

  for (const row of rows) {
    const g = Number(row.gallons) || 0;
    const dollars = Number(row.total_price) || 0;
    gallons += g;
    totalPrice += dollars;

    if (!byState.has(row.state)) byState.set(row.state, { state: row.state, count: 0, gallons: 0, total_price: 0 });
    const state = byState.get(row.state);
    state.count += 1;
    state.gallons += g;
    state.total_price += dollars;

    const quarter = quarterKey(row.purchase_date);
    if (!quarter) continue;
    const key = `${quarter.year}-${quarter.quarter}`;
    if (!byQuarter.has(key)) {
      byQuarter.set(key, { year: quarter.year, quarter: quarter.quarter, count: 0, gallons: 0, total_price: 0 });
    }
    const bucket = byQuarter.get(key);
    bucket.count += 1;
    bucket.gallons += g;
    bucket.total_price += dollars;
  }

  const finish = (row) => ({
    ...row,
    gallons: roundGal(row.gallons),
    total_price: roundMoney(row.total_price),
  });

  return {
    totals: {
      count: rows.length,
      gallons: roundGal(gallons),
      total_price: roundMoney(totalPrice),
    },
    byState: [...byState.values()].map(finish).sort((a, b) => a.state.localeCompare(b.state)),
    byQuarter: [...byQuarter.values()]
      .map(finish)
      .sort((a, b) => `${b.year}${b.quarter}`.localeCompare(`${a.year}${a.quarter}`)),
  };
}
