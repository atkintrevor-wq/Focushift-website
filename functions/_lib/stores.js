/** Rank store names this truck or driver already used. Frequency first, then most recent purchase. */
export function rankStores(rows, { state, limit = 12 } = {}) {
  const wanted = String(state || '').trim().toUpperCase();
  const groups = new Map();

  for (const row of rows) {
    const name = String(row.station_name || '').trim();
    const rowState = String(row.state || '').trim().toUpperCase();
    if (!name || !rowState) continue;
    if (wanted && rowState !== wanted) continue;

    const key = `${rowState}|${name.toLowerCase()}`;
    const date = String(row.purchase_date || '');
    const id = Number(row.id) || 0;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { name, state: rowState, uses: 1, last_used: date, last_id: id });
      continue;
    }
    existing.uses += 1;
    if (date > existing.last_used || (date === existing.last_used && id >= existing.last_id)) {
      existing.last_used = date;
      existing.last_id = id;
      existing.name = name;
    }
  }

  const ranked = [...groups.values()]
    .sort((a, b) => b.uses - a.uses || b.last_used.localeCompare(a.last_used) || a.name.localeCompare(b.name))
    .map(({ name, state: storeState, uses, last_used }) => ({
      name,
      state: storeState,
      uses,
      last_used,
    }));

  if (wanted) return ranked.slice(0, limit);

  const perState = new Map();
  const picked = [];
  for (const store of ranked) {
    const count = perState.get(store.state) || 0;
    if (count >= limit) continue;
    perState.set(store.state, count + 1);
    picked.push(store);
  }
  return picked;
}
