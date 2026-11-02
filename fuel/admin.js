const money = (n) => Number(n || 0).toLocaleString(undefined, { style: 'currency', currency: 'USD' });
const gal = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function queryString() {
  const params = new URLSearchParams();
  const state = document.getElementById('filterState').value;
  const year = document.getElementById('filterYear').value;
  const quarter = document.getElementById('filterQuarter').value;
  const driver = document.getElementById('filterDriver').value.trim();
  if (state) params.set('state', state);
  if (year) params.set('year', year);
  if (quarter) params.set('quarter', quarter);
  if (driver) params.set('driver', driver);
  const text = params.toString();
  return text ? `?${text}` : '';
}

function setLoginStatus(message, ok) {
  const el = document.getElementById('loginStatus');
  el.textContent = message;
  el.className = 'status show ' + (ok ? 'ok' : 'err');
}

function showLogin(status) {
  document.getElementById('loginView').hidden = false;
  document.getElementById('appView').hidden = true;
  document.getElementById('logoutBtn').hidden = true;
  const intro = document.getElementById('loginIntro');
  if (status === 503) {
    intro.textContent = 'The admin password is not set in Cloudflare yet. Add the FUEL_ADMIN_PASSWORD secret, redeploy, then sign in here.';
    document.getElementById('loginForm').hidden = true;
  } else {
    intro.textContent = 'Enter the admin password to see fuel totals and download the spreadsheet.';
    document.getElementById('loginForm').hidden = false;
  }
}

function showApp() {
  document.getElementById('loginView').hidden = true;
  document.getElementById('appView').hidden = false;
  document.getElementById('logoutBtn').hidden = false;
}

function fillSelect(id, values, current) {
  const select = document.getElementById(id);
  const placeholder = select.querySelector('option[value=""]');
  select.innerHTML = '';
  select.appendChild(placeholder || new Option('All', ''));
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
  select.value = values.includes(current) ? current : '';
}

async function loadSummary() {
  const res = await fetch('/fuel/api/summary' + queryString());
  if (res.status === 401 || res.status === 503) {
    showLogin(res.status);
    return null;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load totals');
  document.getElementById('totCount').textContent = data.totals.count;
  document.getElementById('totGal').textContent = gal(data.totals.gallons);
  document.getElementById('totDollars').textContent = money(data.totals.total_price);

  const stateBody = document.getElementById('byStateBody');
  stateBody.innerHTML = '';
  if (!data.byState.length) {
    stateBody.innerHTML = '<tr><td colspan="4">No data yet</td></tr>';
  } else {
    data.byState.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(row.state)}</td><td>${row.count}</td><td>${gal(row.gallons)}</td><td>${money(row.total_price)}</td>`;
      stateBody.appendChild(tr);
    });
  }

  const quarterBody = document.getElementById('byQuarterBody');
  quarterBody.innerHTML = '';
  if (!data.byQuarter.length) {
    quarterBody.innerHTML = '<tr><td colspan="5">No data yet</td></tr>';
  } else {
    data.byQuarter.forEach((row) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${escapeHtml(row.year)}</td><td>${escapeHtml(row.quarter)}</td><td>${row.count}</td><td>${gal(row.gallons)}</td><td>${money(row.total_price)}</td>`;
      quarterBody.appendChild(tr);
    });
  }

  fillSelect('filterState', data.options.states, document.getElementById('filterState').value);
  fillSelect('filterYear', data.options.years, document.getElementById('filterYear').value);
  return data;
}

async function loadEntries() {
  const res = await fetch('/fuel/api/entries' + queryString());
  if (res.status === 401 || res.status === 503) {
    showLogin(res.status);
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Could not load entries');
  const rows = data.entries || [];
  const body = document.getElementById('entriesBody');
  body.innerHTML = '';
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="9">No entries</td></tr>';
  } else {
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const id = Number(row.id);
      const receipt = row.has_receipt
        ? `<a href="/fuel/api/receipts/${id}" target="_blank" rel="noopener">View</a>`
        : '—';
      tr.innerHTML = `
        <td>${escapeHtml(row.purchase_date)}</td>
        <td>${escapeHtml(row.state)}</td>
        <td>${escapeHtml(row.station_name)}</td>
        <td>${gal(row.gallons)}</td>
        <td>${money(row.total_price)}</td>
        <td>${escapeHtml(row.truck_number)}</td>
        <td>${escapeHtml(row.driver_name)}</td>
        <td>${receipt}</td>
        <td><button type="button" class="btn ghost danger" data-delete="${id}">Delete</button></td>`;
      body.appendChild(tr);
    });
  }
  const suffix = data.truncated ? ' (list is capped)' : '';
  document.getElementById('entryCount').textContent = `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} shown${suffix}`;
}

async function refresh() {
  const error = document.getElementById('listError');
  error.classList.remove('show');
  error.textContent = '';
  try {
    await loadSummary();
    if (document.getElementById('appView').hidden) return;
    await loadEntries();
  } catch (err) {
    error.textContent = err.message || 'Could not load the fuel log.';
    error.classList.add('show');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('loginBtn');
  button.disabled = true;
  setLoginStatus('Signing in…', true);
  try {
    const res = await fetch('/fuel/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: document.getElementById('password').value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLoginStatus(data.error || 'Sign-in failed.', false);
      return;
    }
    document.getElementById('password').value = '';
    document.getElementById('loginStatus').className = 'status';
    showApp();
    await refresh();
  } catch {
    setLoginStatus('Sign-in failed.', false);
  } finally {
    button.disabled = false;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/fuel/api/logout', { method: 'POST' });
  showLogin(401);
});

document.getElementById('applyFilters').addEventListener('click', () => refresh());
document.getElementById('clearFilters').addEventListener('click', () => {
  document.getElementById('filterState').value = '';
  document.getElementById('filterYear').value = '';
  document.getElementById('filterQuarter').value = '';
  document.getElementById('filterDriver').value = '';
  refresh();
});
document.getElementById('filterDriver').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') refresh();
});

document.getElementById('entriesBody').addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete]');
  if (!button) return;
  const id = button.getAttribute('data-delete');
  if (!confirm('Delete this fuel entry? This cannot be undone.')) return;
  button.disabled = true;
  const res = await fetch(`/fuel/api/entries/${id}`, { method: 'DELETE' });
  if (res.status === 401 || res.status === 503) {
    showLogin(res.status);
    return;
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error || 'Could not delete that entry.');
    button.disabled = false;
    return;
  }
  await refresh();
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  const button = document.getElementById('exportBtn');
  button.disabled = true;
  try {
    const res = await fetch('/fuel/api/export' + queryString());
    if (res.status === 401 || res.status === 503) {
      showLogin(res.status);
      return;
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'Download failed.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const match = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '');
    link.href = url;
    link.download = match ? match[1] : 'ifta-fuel-log.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } finally {
    button.disabled = false;
  }
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/fuel/sw.js', { scope: '/fuel/' }).catch(() => {});
}

(async () => {
  const res = await fetch('/fuel/api/session');
  if (!res.ok) {
    showLogin(res.status);
    return;
  }
  showApp();
  await refresh();
})();
