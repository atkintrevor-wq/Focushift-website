(function () {
  const DB_NAME = 'trips-log-queue';
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

  function enqueue(payload) {
    return withStore('readwrite', (store) => store.add({ payload }));
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

  let flushing = null;

  async function flushInner() {
    const items = await all();
    let sent = 0;
    const dropped = [];
    let needsAuth = false;
    for (const item of items) {
      if (!item.payload || !item.payload.client_id) {
        await remove(item.id);
        continue;
      }
      let res;
      try {
        res = await fetch('/trips/api/trips', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(item.payload),
        });
      } catch {
        break;
      }
      if (res.ok) {
        await remove(item.id);
        sent += 1;
        continue;
      }
      if (res.status === 401) {
        needsAuth = true;
        break;
      }
      if (res.status === 503 || res.status === 429 || res.status >= 500) break;
      const data = await res.json().catch(() => ({}));
      await remove(item.id);
      dropped.push(data.error || 'A saved trip was rejected.');
    }
    return { sent, left: await count(), dropped, needsAuth };
  }

  function flush() {
    if (!navigator.onLine) return Promise.resolve({ sent: 0, left: null, dropped: [], offline: true });
    if (!flushing) flushing = flushInner().finally(() => { flushing = null; });
    return flushing;
  }

  window.TripQueue = { enqueue, flush, count, all };
})();
