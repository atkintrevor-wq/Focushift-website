(function () {
  const DB_NAME = 'ifta-fuel-queue';
  const STORE = 'pending';

  function withStore(mode, run) {
    return new Promise((resolve, reject) => {
      const open = indexedDB.open(DB_NAME, 1);
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains(STORE)) {
          open.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        }
      };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        let settled = false;
        const fail = (err) => {
          if (settled) return;
          settled = true;
          db.close();
          reject(err || new Error('Could not save on this phone.'));
        };
        tx.oncomplete = () => {
          if (settled) return;
          settled = true;
          const value = request.result;
          db.close();
          resolve(value);
        };
        tx.onerror = () => fail(tx.error);
        tx.onabort = () => fail(tx.error);
      };
    });
  }

  function enqueue(record) {
    return withStore('readwrite', (store) => store.add(record));
  }

  function all() {
    return withStore('readonly', (store) => store.getAll());
  }

  function count() {
    return withStore('readonly', (store) => store.count());
  }

  function remove(id) {
    return withStore('readwrite', (store) => store.delete(id));
  }

  function put(record) {
    return withStore('readwrite', (store) => store.put(record));
  }

  async function updatePin(pin) {
    if (!pin) return;
    const items = await all();
    for (const item of items) {
      if (item.driver_pin !== pin) {
        item.driver_pin = pin;
        await put(item);
      }
    }
  }

  let flushing = null;

  async function flushInner() {
    const items = await all();
    let sent = 0;
    const dropped = [];
    for (const item of items) {
      const body = new FormData();
      body.set('client_id', item.client_id);
      body.set('purchase_date', item.purchase_date);
      body.set('state', item.state);
      body.set('station_name', item.station_name);
      body.set('gallons', String(item.gallons));
      body.set('total_price', String(item.total_price));
      body.set('truck_number', item.truck_number);
      body.set('driver_name', item.driver_name);
      if (item.driver_pin) body.set('driver_pin', item.driver_pin);
      if (item.receipt_blob) body.set('receipt', item.receipt_blob, item.receipt_name || 'receipt.jpg');
      let res;
      try {
        res = await fetch('/fuel/api/entries', { method: 'POST', body });
      } catch {
        break;
      }
      if (res.ok) {
        await remove(item.id);
        sent += 1;
        continue;
      }
      if (res.status === 403 || res.status === 503 || res.status === 429 || res.status >= 500) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.error) dropped.push(data.error);
        break;
      }
      const data = await res.json().catch(() => ({}));
      await remove(item.id);
      dropped.push(data.error || 'A saved fuel stop was rejected.');
    }
    return { sent, left: await count(), dropped };
  }

  function flush() {
    if (!navigator.onLine) return Promise.resolve({ sent: 0, left: null, dropped: [], offline: true });
    if (!flushing) flushing = flushInner().finally(() => { flushing = null; });
    return flushing;
  }

  window.FuelQueue = { enqueue, flush, count, all, updatePin };
})();
