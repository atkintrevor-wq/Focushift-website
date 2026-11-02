const CACHE = 'ifta-fuel-v1';
const ASSETS = [
  '/fuel/',
  '/fuel/index.html',
  '/fuel/admin/',
  '/fuel/admin/index.html',
  '/fuel/styles.css?v=1',
  '/fuel/app.js?v=1',
  '/fuel/admin.js?v=1',
  '/fuel/queue.js?v=1',
  '/fuel/manifest.webmanifest',
  '/fuel/icons/icon-192.png',
  '/fuel/icons/icon-512.png',
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
  if (!url.pathname.startsWith('/fuel/')) return;
  if (url.pathname.startsWith('/fuel/api/')) return;

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
        const admin = url.pathname.startsWith('/fuel/admin');
        return (await cache.match(request))
          || (await cache.match(admin ? '/fuel/admin/index.html' : '/fuel/index.html'))
          || (await cache.match(admin ? '/fuel/admin/' : '/fuel/'));
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
