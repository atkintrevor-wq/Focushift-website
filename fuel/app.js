const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

const CA_PROVINCES = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
];

const STATE_CODES = new Set([...US_STATES, ...CA_PROVINCES].map(([code]) => code));

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fillStates() {
  const sel = document.getElementById('state');
  sel.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Select…';
  sel.appendChild(placeholder);

  const us = document.createElement('optgroup');
  us.label = 'United States';
  US_STATES.forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} — ${name}`;
    us.appendChild(option);
  });
  sel.appendChild(us);

  const ca = document.createElement('optgroup');
  ca.label = 'Canada';
  CA_PROVINCES.forEach(([code, name]) => {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${code} — ${name}`;
    ca.appendChild(option);
  });
  sel.appendChild(ca);
}

function readList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function rememberList(key, value) {
  const next = [value, ...readList(key).filter((item) => item !== value)].slice(0, 12);
  localStorage.setItem(key, JSON.stringify(next));
  return next;
}

function fillDatalist(id, values) {
  const list = document.getElementById(id);
  list.innerHTML = '';
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    list.appendChild(option);
  });
}

function setStatus(msg, ok) {
  const el = document.getElementById('formStatus');
  el.textContent = msg;
  el.className = 'status show ' + (ok ? 'ok' : 'err');
}

function newClientId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function showPin(required) {
  const wrap = document.getElementById('pinWrap');
  wrap.hidden = !required;
  if (required) {
    const saved = localStorage.getItem('ifta_driver_pin') || '';
    if (saved && !document.getElementById('driver_pin').value) {
      document.getElementById('driver_pin').value = saved;
    }
  }
}

async function configurePin() {
  try {
    const res = await fetch('/fuel/api/health');
    if (!res.ok) throw new Error('health');
    const data = await res.json();
    const required = Boolean(data.driver_pin);
    localStorage.setItem('ifta_driver_pin_required', required ? '1' : '0');
    showPin(required);
  } catch {
    showPin(localStorage.getItem('ifta_driver_pin_required') === '1');
  }
}

function setOfflineNote() {
  document.getElementById('offlineNote').hidden = navigator.onLine;
}

async function refreshQueueBanner(result) {
  const banner = document.getElementById('queueBanner');
  const left = result && result.left != null ? result.left : await window.FuelQueue.count();
  const sent = result?.sent || 0;
  const dropped = result?.dropped || [];
  if (!left && !sent && !dropped.length) {
    banner.hidden = true;
    return;
  }
  const parts = [];
  if (sent) parts.push(`Sent ${sent} fuel stop${sent === 1 ? '' : 's'} that ${sent === 1 ? 'was' : 'were'} saved on this phone.`);
  if (left) parts.push(`${left} fuel stop${left === 1 ? '' : 's'} still on this phone. Open this page while online and they will send.`);
  if (dropped.length) parts.push(dropped[0]);
  document.getElementById('queueText').textContent = parts.join(' ');
  banner.hidden = false;
  document.getElementById('retryQueue').hidden = !left;
}

async function stateFromLocation(lat, lon) {
  try {
    const res = await fetch(`/fuel/api/geocode?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.state && STATE_CODES.has(data.state)) return data.state;
    }
  } catch {
    // Fall through to the direct lookup below.
  }
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('lookup failed');
  const data = await res.json();
  const code = String(data.principalSubdivisionCode || '').split('-').pop().toUpperCase();
  if (STATE_CODES.has(code)) return code;
  throw new Error('unmapped');
}

function formRecord(form) {
  const file = document.getElementById('receipt').files[0] || null;
  return {
    client_id: newClientId(),
    purchase_date: form.purchase_date.value,
    state: form.state.value,
    station_name: form.station_name.value.trim(),
    gallons: form.gallons.value,
    total_price: form.total_price.value,
    truck_number: form.truck_number.value.trim(),
    driver_name: form.driver_name.value.trim(),
    driver_pin: document.getElementById('pinWrap').hidden ? '' : form.driver_pin.value,
    receipt_blob: file ? file.slice(0, file.size, file.type) : null,
    receipt_type: file ? file.type : '',
    receipt_name: file ? file.name : '',
    queued_at: Date.now(),
  };
}

function toFormData(record) {
  const body = new FormData();
  body.set('client_id', record.client_id);
  body.set('purchase_date', record.purchase_date);
  body.set('state', record.state);
  body.set('station_name', record.station_name);
  body.set('gallons', record.gallons);
  body.set('total_price', record.total_price);
  body.set('truck_number', record.truck_number);
  body.set('driver_name', record.driver_name);
  if (record.driver_pin) body.set('driver_pin', record.driver_pin);
  const honeypot = document.getElementById('company_website').value;
  if (honeypot) body.set('company_website', honeypot);
  if (record.receipt_blob) body.set('receipt', record.receipt_blob, record.receipt_name || 'receipt.jpg');
  return body;
}

function rememberEntry(record) {
  localStorage.setItem('ifta_last_driver', record.driver_name);
  localStorage.setItem('ifta_last_truck', record.truck_number);
  if (record.driver_pin) localStorage.setItem('ifta_driver_pin', record.driver_pin);
  fillDatalist('driverList', rememberList('ifta_drivers', record.driver_name));
  fillDatalist('truckList', rememberList('ifta_trucks', record.truck_number));
}

function resetForm(form) {
  form.reset();
  document.getElementById('purchase_date').value = todayISO();
  const preview = document.getElementById('receiptPreview');
  preview.classList.remove('show');
  preview.removeAttribute('src');
  document.getElementById('driver_name').value = localStorage.getItem('ifta_last_driver') || '';
  document.getElementById('truck_number').value = localStorage.getItem('ifta_last_truck') || '';
  if (!document.getElementById('pinWrap').hidden) {
    document.getElementById('driver_pin').value = localStorage.getItem('ifta_driver_pin') || '';
  }
}

async function queueEntry(record) {
  await window.FuelQueue.enqueue(record);
  rememberEntry(record);
  const form = document.getElementById('fuelForm');
  resetForm(form);
  setStatus(`Saved on this phone: ${record.gallons} gal at ${record.station_name}. It sends the next time this page is open and online.`, true);
  await refreshQueueBanner();
}

function initForm() {
  fillStates();
  document.getElementById('purchase_date').value = todayISO();
  document.getElementById('driver_name').value = localStorage.getItem('ifta_last_driver') || '';
  document.getElementById('truck_number').value = localStorage.getItem('ifta_last_truck') || '';
  fillDatalist('driverList', readList('ifta_drivers'));
  fillDatalist('truckList', readList('ifta_trucks'));
  setOfflineNote();

  document.getElementById('receipt').addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    const img = document.getElementById('receiptPreview');
    if (!file) {
      img.classList.remove('show');
      img.removeAttribute('src');
      return;
    }
    img.src = URL.createObjectURL(file);
    img.classList.add('show');
  });

  document.getElementById('geoBtn').addEventListener('click', () => {
    const status = document.getElementById('geoStatus');
    if (!navigator.geolocation) {
      status.textContent = 'Location is not available on this phone.';
      return;
    }
    status.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const code = await stateFromLocation(pos.coords.latitude, pos.coords.longitude);
          document.getElementById('state').value = code;
          status.textContent = `Detected ${code}`;
        } catch {
          status.textContent = 'Lookup failed. Pick the state yourself.';
        }
      },
      () => {
        status.textContent = 'Location denied. Pick the state yourself.';
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  });

  document.getElementById('fuelForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const button = document.getElementById('submitBtn');
    const record = formRecord(form);
    button.disabled = true;
    setStatus('Saving…', true);
    try {
      if (!navigator.onLine) {
        await queueEntry(record);
        return;
      }
      const res = await fetch('/fuel/api/entries', { method: 'POST', body: toFormData(record) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        await queueEntry(record);
        return;
      }
      if (res.status === 403) {
        localStorage.setItem('ifta_driver_pin_required', '1');
        showPin(true);
        throw new Error(data.error || 'Driver PIN was not accepted.');
      }
      if (!res.ok) throw new Error(data.error || 'Save failed');
      rememberEntry(record);
      resetForm(form);
      const extra = data.warning ? ` ${data.warning}` : '';
      setStatus(`Saved entry #${data.id} — ${data.gallons} gal in ${data.state}.${extra}`, true);
    } catch (err) {
      if (err instanceof TypeError) {
        try {
          await queueEntry(record);
          return;
        } catch {
          setStatus('Could not save on this phone.', false);
          return;
        }
      }
      setStatus(err.message || 'Save failed', false);
    } finally {
      button.disabled = false;
    }
  });
}

document.getElementById('retryQueue').addEventListener('click', async () => {
  const pin = document.getElementById('driver_pin').value;
  if (pin) await window.FuelQueue.updatePin(pin);
  const result = await window.FuelQueue.flush();
  await refreshQueueBanner(result);
});

window.addEventListener('online', async () => {
  setOfflineNote();
  const result = await window.FuelQueue.flush();
  await refreshQueueBanner(result);
});
window.addEventListener('offline', setOfflineNote);
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && navigator.onLine) {
    const result = await window.FuelQueue.flush();
    await refreshQueueBanner(result);
  }
});

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  document.getElementById('installBanner').classList.add('show');
});
document.getElementById('installBtn').addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  document.getElementById('installBanner').classList.remove('show');
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/fuel/sw.js', { scope: '/fuel/' }).catch(() => {});
}

initForm();
configurePin();
refreshQueueBanner();
window.FuelQueue.flush().then((result) => refreshQueueBanner(result)).catch(() => {});
