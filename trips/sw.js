const CACHE = 'trips-log-v2';
const ASSETS = [
  '/trips/',
  '/trips/index.html',
  '/trips/history/',
  '/trips/history/index.html',
  '/trips/reconcile/',
  '/trips/reconcile/index.html',
  '/trips/styles.css?v=2',
  '/trips/week.js?v=2',
  '/trips/session.js?v=1',
  '/trips/queue.js?v=1',
  '/trips/app.js?v=2',
  '/trips/history.js?v=2',
  '/trips/reconcile.js?v=2',
  '/trips/manifest.webmanifest',
  '/trips/icons/icon-192.png',
  '/trips/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: 'reload' });
        if (res.ok) await cache.put(url, res);
      } catch {
        // A missing asset should not block installing the rest of the shell.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/trips/')) return;
  if (url.pathname.startsWith('/trips/api/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          try { await cache.put(request, fresh.clone()); } catch { /* redirects are not cacheable */ }
        }
        return fresh;
      } catch {
        const history = url.pathname.startsWith('/trips/history');
        const reconcile = url.pathname.startsWith('/trips/reconcile');
        const shell = reconcile ? '/trips/reconcile/index.html' : history ? '/trips/history/index.html' : '/trips/index.html';
        const shellDir = reconcile ? '/trips/reconcile/' : history ? '/trips/history/' : '/trips/';
        return (await cache.match(request))
          || (await cache.match(shell))
          || (await cache.match(shellDir));
      }
    }
    const cached = await cache.match(request);
    if (cached) {
      event.waitUntil(fetch(request).then((res) => {
        if (res.ok) return cache.put(request, res);
      }).catch(() => {}));
      return cached;
    }
    const res = await fetch(request);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  })());
});
