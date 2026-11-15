const DEFAULT_RATES = { sunrise_pay: 240, sunrise_miles: 260, mtv_pay: 260, mtv_miles: 300, load_unload_pay: 60 };

let editingId = null;
let draftClientId = null;
let knownTrips = [];
let rates = { ...DEFAULT_RATES };
let listGen = 0;

function $(id) { return document.getElementById(id); }

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function money(n) {
  if (n == null || n === '') return '';
  return `$${Number(n).toFixed(2)}`;
}

function setStatus(el, message, ok) {
  el.textContent = message || '';
  el.className = 'status' + (message ? ' show ' + (ok ? 'ok' : 'err') : '');
}

function newClientId() {
  if (crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function draftId() {
  if (!draftClientId) draftClientId = newClientId();
  return draftClientId;
}

function selectedRun() {
  const button = document.querySelector('.run-btn.selected');
  return button ? button.dataset.run : '';
}

function setRun(run) {
  document.querySelectorAll('.run-btn').forEach((button) => {
    const on = button.dataset.run === run;
    button.classList.toggle('selected', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const mtv = run === 'MTV/SH';
  $('alsoWrap').hidden = !mtv;
  if (!mtv) $('also_sunrise').checked = false;
  showExpected();
}

function showExpected() {
  const run = selectedRun();
  const hint = $('expectedHint');
  if (!hint) return;
  if (run === 'Sunrise') {
    hint.textContent = `Expected gross ${money(rates.sunrise_pay)} · about ${rates.sunrise_miles} miles`;
  } else if (run === 'MTV/SH') {
    hint.textContent = `Expected gross ${money(rates.mtv_pay)} + ${money(rates.load_unload_pay)} load/unload · about ${rates.mtv_miles} miles`;
  } else {
    hint.textContent = '';
  }
}

function applySuggestion(suggestion, force) {
  const input = $('load_number');
  if (!force && input.dataset.auto !== '1') return;
  input.value = suggestion.load_number || '';
  input.dataset.auto = '1';
  const hint = $('loadHint');
  if (suggestion.source === 'week') {
    hint.textContent = `This week is already ${suggestion.load_number}. It counts in ${window.TripWeek.formatPayMonth(suggestion.pay_month)}.`;
  } else if (suggestion.source === 'next') {
    hint.textContent = `New week, so this suggests the latest load number plus 1. Change it if this week should use a different number. It counts in ${window.TripWeek.formatPayMonth(suggestion.pay_month)}.`;
  } else if (suggestion.source === 'anchor') {
    hint.textContent = `The week of Nov 9, 2026 is ${suggestion.load_number}. Change it if you need a different number.`;
  } else if (suggestion.pay_month) {
    hint.textContent = `Enter the load number for this week. It counts in ${window.TripWeek.formatPayMonth(suggestion.pay_month)}.`;
  } else {
    hint.textContent = 'Enter a load number like TA-6043.';
  }
}

async function refreshLoadNumber(force) {
  const date = $('trip_date').value;
  if (!date) return;
  if (navigator.onLine) {
    try {
      const res = await fetch(`/trips/api/suggest?date=${encodeURIComponent(date)}`, { cache: 'no-store' });
      if (res.ok) {
        applySuggestion(await res.json(), force);
        return;
      }
    } catch {
      // Fall back to the trips already on this phone.
    }
  }
  applySuggestion(window.TripWeek.suggestLoadNumber(date, knownTrips), force);
}

function resetForm() {
  editingId = null;
  draftClientId = null;
  $('formTitle').textContent = 'Log a trip';
  $('submitBtn').textContent = 'Log trip';
  $('cancelBtn').hidden = true;
  $('deleteBtn').hidden = true;
  $('trip_date').value = todayISO();
  $('notes').value = '';
  $('pay_amount').value = '';
  $('also_sunrise').checked = false;
  const remembered = localStorage.getItem('trips_run_type') || '';
  setRun(remembered);
  $('load_number').dataset.auto = '1';
  refreshLoadNumber(true);
}

function fillForm(trip) {
  editingId = trip.id;
  draftClientId = null;
  $('formTitle').textContent = `Edit ${window.TripWeek.formatTripDate(trip.trip_date)}`;
  $('submitBtn').textContent = 'Save changes';
  $('cancelBtn').hidden = false;
  $('deleteBtn').hidden = false;
  $('trip_date').value = trip.trip_date;
  setRun(trip.run_type);
  $('also_sunrise').checked = Boolean(trip.also_sunrise);
  $('notes').value = trip.notes || '';
  $('pay_amount').value = trip.pay_amount == null ? '' : String(trip.pay_amount);
  $('load_number').value = trip.load_number;
  $('load_number').dataset.auto = '0';
  $('loadHint').textContent = `Week of ${window.TripWeek.formatWeek(trip.week_start, trip.week_end)}. Clear the number to use this week's load number again.`;
  $('formTitle').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function groupByWeek(trips) {
  const map = new Map();
  for (const trip of trips) {
    if (!map.has(trip.week_start)) map.set(trip.week_start, []);
    map.get(trip.week_start).push(trip);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function weekLoad(trips) {
  const counts = new Map();
  for (const trip of trips) counts.set(trip.load_number, (counts.get(trip.load_number) || 0) + 1);
  let best = trips[0]?.load_number || '';
  let bestCount = -1;
  for (const [load, count] of counts) {
    if (count > bestCount) {
      best = load;
      bestCount = count;
    }
  }
  return best;
}

function expectedSum(trips) {
  return trips.reduce((sum, trip) => ({
    gross: sum.gross + Number(trip.expected_gross || 0),
    load: sum.load + Number(trip.expected_load_unload || 0),
    total: sum.total + Number(trip.expected_total || 0),
  }), { gross: 0, load: 0, total: 0 });
}

function renderList(trips) {
  const root = $('recentList');
  root.replaceChildren();
  if (!trips.length) {
    const empty = document.createElement('p');
    empty.className = 'note empty';
    empty.textContent = 'No trips yet.';
    root.appendChild(empty);
    return;
  }
  for (const [start, weekTrips] of groupByWeek(trips)) {
    const block = document.createElement('section');
    block.className = 'week-block';
    const head = document.createElement('div');
    head.className = 'week-head';
    const title = document.createElement('h3');
    title.textContent = window.TripWeek.formatWeek(start, weekTrips[0].week_end);
    const pill = document.createElement('span');
    pill.className = 'load-pill';
    pill.textContent = weekLoad(weekTrips);
    head.append(title, pill);
    const expected = expectedSum(weekTrips);
    const meta = document.createElement('p');
    meta.className = 'week-meta';
    const sunrise = weekTrips.filter((trip) => trip.run_type === 'Sunrise').length;
    const mtv = weekTrips.filter((trip) => trip.run_type === 'MTV/SH').length;
    meta.textContent = `Sunrise ${sunrise} · MTV/SH ${mtv} · Expected gross ${money(expected.gross)}` +
      (expected.load ? ` + ${money(expected.load)} load/unload` : '');
    block.append(head, meta);
    for (const trip of weekTrips) {
      block.appendChild(renderTrip(trip, weekLoad(weekTrips)));
    }
    root.appendChild(block);
  }
}

function renderTrip(trip, weekLoadNumber) {
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
  const bits = [];
  if (trip.load_number !== weekLoadNumber) bits.push(`Load ${trip.load_number}`);
  if (trip.pay_amount != null) bits.push(money(trip.pay_amount));
  bits.push(trip.paid_status === 'paid' ? 'Paid' : trip.paid_status === 'disputed' ? 'Disputed' : 'Unpaid');
  extra.textContent = bits.join(' · ');
  main.appendChild(extra);
  if (trip.notes) {
    const notes = document.createElement('div');
    notes.className = 'trip-notes';
    notes.textContent = trip.notes;
    main.appendChild(notes);
  }
  const actions = document.createElement('div');
  actions.className = 'trip-actions';
  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'btn secondary';
  edit.textContent = 'Edit';
  edit.addEventListener('click', () => fillForm(trip));
  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'btn ghost danger';
  del.textContent = 'Delete';
  del.addEventListener('click', () => removeTrip(trip));
  actions.append(edit, del);
  row.append(main, actions);
  return row;
}

async function loadList() {
  const gen = ++listGen;
  const res = await fetch('/trips/api/trips', { cache: 'no-store' });
  if (gen !== listGen) return;
  if (res.status === 401) {
    window.TripSession.remember(false);
    showLogin();
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  knownTrips = data.trips || [];
  if (data.settings) {
    rates = data.settings;
    localStorage.setItem('trips_rates', JSON.stringify(rates));
    showExpected();
  }
  renderList(knownTrips);
}

async function removeTrip(trip) {
  if (!navigator.onLine) {
    setStatus($('formStatus'), 'Connect to delete a trip. A new trip can wait on this phone.', false);
    return;
  }
  const label = `${window.TripWeek.formatTripDate(trip.trip_date)} ${trip.run_type}`;
  if (!confirm(`Delete the ${label} trip?`)) return;
  const res = await fetch(`/trips/api/trips/${trip.id}`, { method: 'DELETE' });
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus($('formStatus'), data.error || 'Could not delete that trip.', false);
    return;
  }
  if (editingId === trip.id) resetForm();
  setStatus($('formStatus'), 'Trip deleted.', true);
  await loadList();
}

function collectPayload() {
  const tripDate = $('trip_date').value;
  const run = selectedRun();
  const payRaw = $('pay_amount').value.trim();
  const load = $('load_number').value.trim();
  return {
    trip_date: tripDate,
    run_type: run,
    also_sunrise: run === 'MTV/SH' && $('also_sunrise').checked,
    notes: $('notes').value,
    pay_amount: payRaw === '' ? null : Number(payRaw),
    load_number: load || null,
  };
}

async function queueTrip(payload) {
  await window.TripQueue.enqueue(payload);
  const run = payload.run_type;
  if (run) localStorage.setItem('trips_run_type', run);
  resetForm();
  setStatus($('formStatus'), 'Saved on this phone. It sends the next time this page is open and online.', true);
  await refreshQueueBanner();
}

async function refreshQueueBanner(result) {
  const left = result && result.left != null ? result.left : await window.TripQueue.count().catch(() => 0);
  const banner = $('queueBanner');
  if (!left) {
    banner.hidden = true;
    return;
  }
  banner.hidden = false;
  const noun = left === 1 ? 'trip' : 'trips';
  $('queueText').textContent = result && result.needsAuth
    ? `${left} ${noun} on this phone. Sign in to send them.`
    : `${left} ${noun} saved on this phone, waiting to send.`;
  if (result && result.dropped && result.dropped.length) {
    setStatus($('formStatus'), result.dropped[0], false);
  }
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

async function bootApp() {
  try {
    rates = JSON.parse(localStorage.getItem('trips_rates') || '') || rates;
  } catch {
    rates = { ...DEFAULT_RATES };
  }
  showApp();
  const params = new URLSearchParams(location.search);
  const editId = params.get('edit');
  await loadList();
  if (editId) {
    const trip = knownTrips.find((item) => String(item.id) === editId);
    if (trip) fillForm(trip);
    else {
      const res = await fetch(`/trips/api/trips/${encodeURIComponent(editId)}`, { cache: 'no-store' });
      if (res.ok) fillForm(await res.json());
    }
  } else if (!editingId) {
    resetForm();
  }
  if (navigator.onLine) {
    const result = await window.TripQueue.flush();
    await refreshQueueBanner(result);
    if (result.sent) await loadList();
  }
}

function setOfflineNote() {
  $('offlineNote').hidden = navigator.onLine;
}

document.querySelectorAll('.run-btn').forEach((button) => {
  button.addEventListener('click', () => setRun(button.dataset.run));
});

$('trip_date').addEventListener('change', () => refreshLoadNumber(false));
$('load_number').addEventListener('input', () => {
  const date = $('trip_date').value;
  const suggested = window.TripWeek.suggestLoadNumber(date, knownTrips).load_number;
  const typed = window.TripWeek.normalizeLoadNumber($('load_number').value);
  $('load_number').dataset.auto = !typed || typed === suggested ? '1' : '0';
});
$('load_number').addEventListener('blur', () => {
  if (!$('load_number').value.trim()) {
    $('load_number').dataset.auto = '1';
    refreshLoadNumber(true);
  }
});

$('cancelBtn').addEventListener('click', () => {
  setStatus($('formStatus'), '', true);
  resetForm();
});
$('deleteBtn').addEventListener('click', () => {
  const trip = knownTrips.find((item) => item.id === editingId);
  if (trip) removeTrip(trip);
});

$('tripForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('submitBtn');
  const payload = collectPayload();
  if (!payload.trip_date) {
    setStatus($('formStatus'), 'Enter a date.', false);
    return;
  }
  if (!payload.run_type) {
    setStatus($('formStatus'), 'Choose Sunrise or MTV/SH.', false);
    return;
  }
  const pay = $('pay_amount');
  if (pay.value && !pay.checkValidity()) {
    setStatus($('formStatus'), 'Pay amount must be 0 or more.', false);
    return;
  }
  if (!editingId) payload.client_id = draftId();
  button.disabled = true;
  setStatus($('formStatus'), 'Saving…', true);
  try {
    if (editingId && !navigator.onLine) {
      setStatus($('formStatus'), 'Connect to save changes. A new trip can wait on this phone.', false);
      return;
    }
    if (!editingId && !navigator.onLine) {
      await queueTrip(payload);
      return;
    }
    const res = await fetch(editingId ? `/trips/api/trips/${editingId}` : '/trips/api/trips', {
      method: editingId ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      showLogin();
      return;
    }
    if (!editingId && (res.status === 503 || res.status >= 500)) {
      await queueTrip(payload);
      return;
    }
    if (!res.ok) throw new Error(data.error || 'Save failed');
    if (payload.run_type) localStorage.setItem('trips_run_type', payload.run_type);
    const wasEdit = Boolean(editingId);
    resetForm();
    if (location.search) history.replaceState(null, '', '/trips/');
    setStatus($('formStatus'), wasEdit ? `Saved ${data.load_number}.` : `Logged ${data.load_number}.`, true);
    await loadList();
  } catch (err) {
    if (!editingId && err instanceof TypeError) {
      try {
        await queueTrip(payload);
        return;
      } catch {
        setStatus($('formStatus'), 'Could not save on this phone.', false);
        return;
      }
    }
    setStatus($('formStatus'), err.message || 'Save failed', false);
  } finally {
    button.disabled = false;
  }
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = $('loginBtn');
  button.disabled = true;
  setStatus($('loginStatus'), '', true);
  try {
    await window.TripSession.login($('password').value);
    $('password').value = '';
    await bootApp();
  } catch (err) {
    if (err instanceof TypeError) setStatus($('loginStatus'), 'You are offline. Sign in once while this phone is online.', false);
    else setStatus($('loginStatus'), err.message || 'That password was not accepted.', false);
  } finally {
    button.disabled = false;
  }
});

$('logoutBtn').addEventListener('click', async () => {
  await window.TripSession.logout();
  showLogin();
});

$('retryQueue').addEventListener('click', async () => {
  const result = await window.TripQueue.flush();
  await refreshQueueBanner(result);
  if (result.sent) await loadList();
});

window.addEventListener('online', async () => {
  setOfflineNote();
  const result = await window.TripQueue.flush();
  await refreshQueueBanner(result);
  if (result.sent) await loadList();
});
window.addEventListener('offline', setOfflineNote);

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  $('installBanner').classList.add('show');
});
$('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $('installBanner').classList.remove('show');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/trips/sw.js', { scope: '/trips/' }).catch(() => {});
}

setOfflineNote();
refreshQueueBanner();
window.TripSession.check().then((ok) => {
  if (ok) bootApp();
  else showLogin();
});
