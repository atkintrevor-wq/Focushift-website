/* FocusShift web app service worker. Scope: /app/
   Caches the app shell so /app/ can open offline, and serves audio the user
   explicitly saved under /app/offline-media/. Never caches Firebase auth,
   Firestore, Functions, or Storage API traffic. */
const SHELL_CACHE = "focusshift-app-shell-v1";
const AUDIO_CACHE = "focusshift-app-offline-audio-v1";

const SHELL_ASSETS = [
  "/app/",
  "/app/index.html",
  "/app/app.css?v=106",
  "/app/app.js?v=298",
  "/app/legacy-background-aliases.js?v=1",
  "/app/premade-script-texts.js?v=1",
  "/app/quick-start-chips.js?v=11",
  "/app/personal-questions.js?v=3",
  "/styles.css?v=12",
  "/login/auth.css?v=6",
  "/js/firebase-config.js",
  "/js/user-profile-doc.js?v=1",
  "/images/logo.png?v=8",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-functions-compat.js",
];

const SHELL_PATHS = {
  "/app/app.js": true,
  "/app/app.css": true,
  "/app/legacy-background-aliases.js": true,
  "/app/premade-script-texts.js": true,
  "/app/quick-start-chips.js": true,
  "/app/personal-questions.js": true,
  "/styles.css": true,
  "/login/auth.css": true,
  "/js/firebase-config.js": true,
  "/js/user-profile-doc.js": true,
  "/images/logo.png": true,
};

function isFirebaseApiHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host || host === "www.gstatic.com") return false;
  return (
    host === "googleapis.com" ||
    host.endsWith(".googleapis.com") ||
    host.endsWith(".cloudfunctions.net") ||
    host.endsWith(".firebaseio.com") ||
    host.endsWith(".firebasestorage.app") ||
    host.endsWith(".firebaseapp.com")
  );
}

function isFirebaseSdkScript(url) {
  return url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0;
}

function isAppNavigation(url) {
  return url.pathname === "/app" || url.pathname === "/app/" || url.pathname === "/app/index.html";
}

function isAppShellAsset(url) {
  return !!SHELL_PATHS[url.pathname];
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      try {
        await cache.put(request, fresh.clone());
      } catch (_e) {
        /* Some cross-origin responses cannot be stored. */
      }
    }
    return fresh;
  } catch (_err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw _err;
  }
}

async function navigateFallback(request) {
  try {
    return await networkFirst(request);
  } catch (_err) {
    const cache = await caches.open(SHELL_CACHE);
    return (
      (await cache.match("/app/index.html")) ||
      (await cache.match("/app/")) ||
      (await cache.match(request)) ||
      new Response("FocusShift is offline and this page is not saved on this device yet.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function serveOfflineAudio(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (!cached) return new Response("", { status: 404 });
  const range = request.headers.get("range");
  if (!range) return cached;
  const buf = await cached.arrayBuffer();
  const match = /bytes=(\d+)-(\d*)/.exec(range);
  if (!match) return cached;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : buf.byteLength - 1;
  if (!Number.isFinite(start) || start < 0 || start >= buf.byteLength) {
    return new Response("", {
      status: 416,
      headers: { "Content-Range": "bytes */" + buf.byteLength },
    });
  }
  const safeEnd = Math.min(end, buf.byteLength - 1);
  const slice = buf.slice(start, safeEnd + 1);
  const headers = new Headers(cached.headers);
  headers.set("Content-Range", "bytes " + start + "-" + safeEnd + "/" + buf.byteLength);
  headers.set("Content-Length", String(slice.byteLength));
  headers.set("Accept-Ranges", "bytes");
  if (!headers.get("Content-Type")) headers.set("Content-Type", "audio/mpeg");
  return new Response(slice, { status: 206, headers: headers });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.all(SHELL_ASSETS.map(async (url) => {
      try {
        const res = await fetch(url, { cache: "reload" });
        if (res && res.ok) await cache.put(url, res);
      } catch (_e) {
        /* A missing shell file should not block the rest. */
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("focusshift-app-shell-") && key !== SHELL_CACHE)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  let url;
  try {
    url = new URL(request.url);
  } catch (_e) {
    return;
  }

  // Auth, Firestore, Functions, and Storage stay on the network. Do not cache them.
  if (isFirebaseApiHost(url.hostname)) return;

  if (url.origin === self.location.origin && url.pathname.startsWith("/app/offline-media/")) {
    event.respondWith(serveOfflineAudio(request));
    return;
  }

  if (isFirebaseSdkScript(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && isAppNavigation(url)) {
    event.respondWith(navigateFallback(request));
    return;
  }
  if (isAppShellAsset(url)) {
    event.respondWith(networkFirst(request));
  }
});
