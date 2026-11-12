function $(id) { return document.getElementById(id); }

function money(n) {
  if (n == null || n === '') return '—';
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

let stubs = [];
let activeId = null;

function fillRates(settings) {
  for (const key of ['sunrise_pay', 'sunrise_miles', 'mtv_pay', 'mtv_miles', 'load_unload_pay']) {
    if (settings && settings[key] != null) $(key).value = String(settings[key]);
  }
}

function addLine(line = {}) {
  const row = document.createElement('div');
  row.className = 'line-row';
  const date = document.createElement('input');
  date.type = 'date';
  date.value = line.line_date || '';
  date.required = true;
  date.setAttribute('aria-label', 'Line date');
  const load = document.createElement('input');
  load.type = 'text';
  load.value = line.load_number || '';
  load.placeholder = 'TA-6037';
  load.required = true;
  load.setAttribute('aria-label', 'Load number');
  const miles = document.createElement('input');
  miles.type = 'number';
  miles.min = '0';
  miles.step = '1';
  miles.placeholder = 'Miles';
  miles.value = line.mileage == null ? '' : String(line.mileage);
  miles.setAttribute('aria-label', 'Mileage');
  const gross = document.createElement('input');
  gross.type = 'number';
  gross.min = '0';
  gross.step = '0.01';
  gross.placeholder = 'Gross';
  gross.value = line.gross == null ? '' : String(line.gross);
  gross.setAttribute('aria-label', 'Gross');
  const unload = document.createElement('input');
  unload.type = 'number';
  unload.min = '0';
  unload.step = '0.01';
  unload.placeholder = 'Load/unload';
  unload.value = line.load_unload == null ? '' : String(line.load_unload);
  unload.setAttribute('aria-label', 'Load/unload');
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn ghost danger';
  remove.textContent = 'Remove';
  remove.addEventListener('click', () => row.remove());
  row.append(date, load, miles, gross, unload, remove);
  $('lines').appendChild(row);
}

function readLines() {
  return [...$('lines').querySelectorAll('.line-row')].map((row) => {
    const [date, load, miles, gross, unload] = row.querySelectorAll('input');
    return {
      line_date: date.value,
      load_number: load.value,
      mileage: miles.value === '' ? null : Number(miles.value),
      gross: gross.value === '' ? null : Number(gross.value),
      load_unload: unload.value === '' ? 0 : Number(unload.value),
    };
  });
}

function showStub(stub) {
  activeId = stub ? stub.id : null;
  $('deleteStub').hidden = !stub;
  $('pay_month').value = stub ? stub.pay_month : '';
  $('stub_status').value = stub ? stub.status : 'unpaid';
  $('net_pay').value = stub && stub.net_pay != null ? String(stub.net_pay) : '';
  $('vacation_days').value = stub ? String(stub.vacation_days || 0) : '';
  $('vacation_pay').value = stub ? String(stub.vacation_pay || 0) : '';
  $('lines').replaceChildren();
  (stub ? stub.lines : []).forEach(addLine);
}

function flagLabel(flag) {
  if (flag === 'missing') return 'Missing';
  if (flag === 'short') return 'Short';
  if (flag === 'extra') return 'Extra';
  return 'Match';
}

function renderRows(rows, paystubs) {
  const root = $('rows');
  root.replaceChildren();
  const month = $('month').value;
  const visible = month ? rows.filter((row) => row.pay_month === month) : rows;
  const stubList = month ? paystubs.filter((stub) => stub.pay_month === month) : paystubs;
  if (!visible.length && !stubList.length) {
    const empty = document.createElement('p');
    empty.className = 'note';
    empty.textContent = 'Nothing to reconcile yet.';
    root.appendChild(empty);
    return;
  }
  for (const stub of stubList) {
    const card = document.createElement('section');
    card.className = 'card';
    const h2 = document.createElement('h2');
    h2.textContent = `${window.TripWeek.formatPayMonth(stub.pay_month)} paystub`;
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn secondary';
    open.textContent = 'Edit';
    open.addEventListener('click', () => {
      showStub(stub);
      $('stubForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const head = document.createElement('div');
    head.className = 'week-head';
    head.append(h2, open);
    const note = document.createElement('p');
    note.className = 'counts';
    note.textContent = `${stub.status} · Vacation ${stub.vacation_days} days ${money(stub.vacation_pay)} · Net ${money(stub.net_pay)}`;
    card.append(head, note);
    root.appendChild(card);
  }
  const tableCard = document.createElement('section');
  tableCard.className = 'card';
  const title = document.createElement('h2');
  title.textContent = 'Paid vs expected';
  tableCard.appendChild(title);
  for (const row of visible) {
    const block = document.createElement('div');
    block.className = 'trip';
    const main = document.createElement('div');
    main.className = 'trip-main';
    const heading = document.createElement('div');
    heading.className = 'trip-title';
    heading.textContent = `${row.load_number} · ${row.week_start ? window.TripWeek.formatWeek(row.week_start, row.week_end) : 'Paystub only'}`;
    const detail = document.createElement('div');
    detail.className = 'trip-extra';
    const paidGross = row.paid ? money(row.paid.gross) : '—';
    const paidUnload = row.paid ? money(row.paid.load_unload) : '—';
    const paidMiles = row.paid && row.paid.miles != null ? `${row.paid.miles} mi` : '—';
    detail.textContent = `Expected ${money(row.expected.gross)} + ${money(row.expected.load_unload)} · ${row.expected.miles} mi. Paid ${paidGross} + ${paidUnload} · ${paidMiles}. Stub ${row.stub_date || '—'}.`;
    main.append(heading, detail);
    const flag = document.createElement('span');
    flag.className = `flag ${row.flag}`;
    flag.textContent = flagLabel(row.flag);
    block.append(main, flag);
    tableCard.appendChild(block);
  }
  root.appendChild(tableCard);
}

async function loadReconcile() {
  const params = new URLSearchParams();
  if ($('month').value) params.set('month', $('month').value);
  const res = await fetch(`/trips/api/reconcile?${params}`, { cache: 'no-store' });
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    setStatus(data.error || 'Could not load the reconcile view.', false);
    return;
  }
  fillRates(data.settings);
  stubs = data.paystubs || [];
  if (!activeId && stubs.length) showStub(stubs[0]);
  renderRows(data.rows || [], data.paystubs || []);
}

$('addLine').addEventListener('click', () => addLine());
$('ratesForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {};
  for (const key of ['sunrise_pay', 'sunrise_miles', 'mtv_pay', 'mtv_miles', 'load_unload_pay']) body[key] = Number($(key).value);
  const res = await fetch('/trips/api/settings', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return setStatus(data.error || 'Could not save rates.', false);
  setStatus('Saved pay rates.', true);
  await loadReconcile();
});

$('stubForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const body = {
    pay_month: $('pay_month').value,
    status: $('stub_status').value,
    net_pay: $('net_pay').value === '' ? null : Number($('net_pay').value),
    vacation_days: $('vacation_days').value === '' ? 0 : Number($('vacation_days').value),
    vacation_pay: $('vacation_pay').value === '' ? 0 : Number($('vacation_pay').value),
    lines: readLines(),
  };
  const res = await fetch(activeId ? `/trips/api/paystubs/${activeId}` : '/trips/api/paystubs', {
    method: activeId ? 'PUT' : 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.status === 401) return showLogin();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return setStatus(data.error || 'Could not save the paystub.', false);
  activeId = data.id;
  $('deleteStub').hidden = false;
  setStatus('Saved paystub.', true);
  await loadReconcile();
});

$('deleteStub').addEventListener('click', async () => {
  if (!activeId || !confirm('Delete this paystub?')) return;
  const res = await fetch(`/trips/api/paystubs/${activeId}`, { method: 'DELETE' });
  if (res.status === 401) return showLogin();
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    setStatus(data.error || 'Could not delete the paystub.', false);
    return;
  }
  activeId = null;
  showStub(null);
  setStatus('Paystub deleted.', true);
  await loadReconcile();
});

$('month').addEventListener('change', () => loadReconcile());
$('allMonths').addEventListener('click', () => {
  $('month').value = '';
  loadReconcile();
});

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await window.TripSession.login($('password').value);
    $('password').value = '';
    showApp();
    await loadReconcile();
  } catch (err) {
    const el = $('loginStatus');
    el.textContent = err.message || 'That password was not accepted.';
    el.className = 'status show err';
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
  await loadReconcile();
});
