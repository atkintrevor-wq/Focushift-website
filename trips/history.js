function $(id) { return document.getElementById(id); }

function money(n) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

function setStatus(message, ok) {
  const el = $('pageStatus');
  el.textContent = message || '';
  el.className = 'status' + (message ? ' show ' + (ok ? 'ok' : 'err') : '');
}

function showLogin() {
  $('loginView').hidden = false;
  $('appView').hidden = true;
  $('logoutBtn').hidden = true;
}

function showApp() {
  $('loginView').hidden = true;
  $('appView').hidden = false;
  $('logoutBtn').hidden = false;
}

function groupHistory(trips) {
  const months = new Map();
  for (const trip of trips) {
    if (!months.has(trip.pay_month)) months.set(trip.pay_month, new Map());
    const weeks = months.get(trip.pay_month);
    if (!weeks.has(trip.week_start)) weeks.set(trip.week_start, []);
    weeks.get(trip.week_start).push(trip);
  }
  return [...months.keys()].sort((a, b) => (a < b ? 1 : -1)).map((month) => {
    const weeks = months.get(month);
    return {
      pay_month: month,
      weeks: [...weeks.keys()].sort((a, b) => (a < b ? 1 : -1)).map((start) => ({
        week_start: start,
        trips: weeks.get(start),
      })),
    };
  });
}

function sumExpected(trips) {
  return trips.reduce((sum, trip) => ({
    sunrise: sum.sunrise + (trip.run_type === 'Sunrise' ? 1 : 0),
    mtv: sum.mtv + (trip.run_type === 'MTV/SH' ? 1 : 0),
    also: sum.also + (trip.also_sunrise ? 1 : 0),
    gross: sum.gross + Number(trip.expected_gross || 0),
    load: sum.load + Number(trip.expected_load_unload || 0),
    total: sum.total + Number(trip.expected_total || 0),
    paid: sum.paid + (trip.paid_status === 'paid' ? 1 : 0),
    unpaid: sum.unpaid + (trip.paid_status === 'unpaid' ? 1 : 0),
    disputed: sum.disputed + (trip.paid_status === 'disputed' ? 1 : 0),
  }), { sunrise: 0, mtv: 0, also: 0, gross: 0, load: 0, total: 0, paid: 0, unpaid: 0, disputed: 0 });
}

function weekLoad(trips) {
  const counts = new Map();
  for (const trip of trips) counts.set(trip.load_number, (counts.get(trip.load_number) || 0) + 1);
  let best = '';
  let n = -1;
  for (const [load, count] of counts) {
    if (count > n) {
      best = load;
      n = count;
    }
  }
  return best;
}

function render(trips) {
  const months = $('months');
  months.replaceChildren();
  const filtered = filterMonth(trips);
  const totals = sumExpected(filtered);
  $('totTrips').textContent = String(filtered.length);
  $('totSunrise').textContent = String(totals.sunrise);
  $('totMtv').textContent = String(totals.mtv);
  $('totPay').textContent = money(totals.total);
  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.className = 'note';
    empty.textContent = 'No trips for this pay month yet.';
    months.appendChild(empty);
    return;
  }
  for (const month of groupHistory(filtered)) {
    const all = month.weeks.flatMap((week) => week.trips);
    const counts = sumExpected(all);
    const card = document.createElement('section');
    card.className = 'card month-block';
    const h2 = document.createElement('h2');
    h2.textContent = window.TripWeek.formatPayMonth(month.pay_month);
    card.appendChild(h2);
    const summary = document.createElement('p');
    summary.className = 'counts';
    summary.textContent = `Sunrise ${counts.sunrise} · MTV/SH ${counts.mtv}` +
      (counts.also ? ` · also Sunrise ${counts.also}` : '') +
      ` · Expected gross ${money(counts.gross)}` +
      (counts.load ? ` + ${money(counts.load)} load/unload` : '') +
      ` · Paid ${counts.paid} · Unpaid ${counts.unpaid}` +
      (counts.disputed ? ` · Disputed ${counts.disputed}` : '');
    card.appendChild(summary);
    for (const week of month.weeks) {
      card.appendChild(renderWeek(week));
    }
    months.appendChild(card);
  }
}

function renderWeek(week) {
  const block = document.createElement('section');
  block.className = 'week-block';
  const head = document.createElement('div');
  head.className = 'week-head';
  const title = document.createElement('h3');
  title.textContent = window.TripWeek.formatWeek(week.week_start, week.trips[0].week_end);
  const pill = document.createElement('span');
  pill.className = 'load-pill';
  pill.textContent = weekLoad(week.trips);
  head.append(title, pill);
  const counts = sumExpected(week.trips);
  const meta = document.createElement('p');
  meta.className = 'week-meta';
  meta.textContent = `Sunrise ${counts.sunrise} · MTV/SH ${counts.mtv} · Expected ${money(counts.total)} · stub ${window.TripWeek.formatTripDate(window.TripWeek.addDays(week.trips[0].week_end, 1))}`;
  block.append(head, meta);
  for (const trip of week.trips) block.appendChild(renderTrip(trip));
  return block;
}

function renderTrip(trip) {
  const row = document.createElement('div');
  row.className = 'trip';
  const main = document.createElement('div');
  main.className = 'trip-main';
  const title = document.createElement('div');
  title.className = 'trip-title';
  title.textContent = `${window.TripWeek.formatTripDate(trip.trip_date)} · ${trip.run_type}`;
  if (trip.also_sunrise) title.textContent += ' · also Sunrise';
  main.appendChild(title);
  const extra = document.createElement('div');
  extra.className = 'trip-extra';
  extra.textContent = `Expected ${money(trip.expected_total)}` + (trip.notes ? '' : '');
  if (trip.notes) {
    const notes = document.createElement('div');
    notes.className = 'trip-notes';
    notes.textContent = trip.notes;
    main.appendChild(notes);
  }
  main.appendChild(extra);
  const select = document.createElement('select');
  select.className = 'paid-select';
  select.setAttribute('aria-label', `Paid status for ${trip.trip_date}`);
  for (const [value, label] of [['unpaid', 'Unpaid'], ['paid', 'Paid'], ['disputed', 'Disputed']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    if (trip.paid_status === value) option.selected = true;
    select.appendChild(option);
  }
  select.addEventListener('change', () => updatePaid(trip, select));
  const edit = document.createElement('a');
  edit.href = `/trips/?edit=${trip.id}`;
  edit.textContent = 'Edit';
  const actions = document.createElement('div');
  actions.className = 'trip-actions';
  actions.append(select, edit);
  row.append(main, actions);
  return row;
}

let allTrips = [];

function filterMonth(trips) {
  const month = $('month').value;
  if (!month) return trips;
  return trips.filter((trip) => trip.pay_month === month);
}

async function loadTrips() {
  const res = await fetch('/trips/api/trips', { cache: 'no-store' });
  if (res.status === 401) return showLogin();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(data.error || 'Could not load trips.', false);
    return;
  }
  const data = await res.json();
  allTrips = data.trips || [];
  render(allTrips);
}

async function updatePaid(trip, select) {
  const previous = trip.paid_status;
  select.disabled = true;
  const res = await fetch(`/trips/api/trips/${trip.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ paid_status: select.value }),
  });
  select.disabled = false;
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    select.value = previous;
    setStatus(data.error || 'Could not update paid status.', false);
    return;
  }
  trip.paid_status = data.paid_status;
  render(allTrips);
}

async function download(format) {
  const params = new URLSearchParams({ format });
  if ($('month').value) params.set('month', $('month').value);
  const res = await fetch(`/trips/api/export?${params}`);
  if (res.status === 401) return showLogin();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(data.error || 'Download failed.', false);
    return;
  }
  const blob = await res.blob();
  const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = match ? match[1] : `trips.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

$('month').addEventListener('change', () => render(allTrips));
$('allMonths').addEventListener('click', () => {
  $('month').value = '';
  render(allTrips);
});
$('xlsxBtn').addEventListener('click', () => download('xlsx'));
$('csvBtn').addEventListener('click', () => download('csv'));
$('seedBtn').addEventListener('click', async () => {
  $('seedBtn').disabled = true;
  try {
    const res = await fetch('/trips/api/seed', { method: 'POST' });
    if (res.status === 401) return showLogin();
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not load the notes.');
    const added = data.inserted ? `Added ${data.inserted} trips.` : 'Those trips are already in the log.';
    const stub = data.paystub === 'inserted' ? ' Added the October paystub.' : '';
    setStatus(added + stub, true);
    await loadTrips();
  } catch (err) {
    setStatus(err.message || 'Could not load the notes.', false);
  } finally {
    $('seedBtn').disabled = false;
  }
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('loginBtn').disabled = true;
  try {
    await window.TripSession.login($('password').value);
    $('password').value = '';
    showApp();
    await loadTrips();
  } catch (err) {
    const el = $('loginStatus');
    el.textContent = err instanceof TypeError ? 'You are offline. Sign in once while online.' : (err.message || 'That password was not accepted.');
    el.className = 'status show err';
  } finally {
    $('loginBtn').disabled = false;
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await window.TripSession.logout();
  showLogin();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/trips/sw.js', { scope: '/trips/' }).catch(() => {});
}

window.TripSession.check().then(async (ok) => {
  if (!ok) return showLogin();
  showApp();
  await loadTrips();
});
