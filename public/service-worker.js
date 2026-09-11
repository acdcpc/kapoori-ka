// Kapoori Ka — versioned, app-shell-only service worker.
// Bump VERSION on each deploy to invalidate stale caches.
const CACHE_PREFIX = 'kapoori-ka';
const VERSION = 'v3'; // v3: merged Web Push handling (single root worker)
const CACHE = `${CACHE_PREFIX}-${VERSION}`;

// App shell to pre-cache.
const SHELL = ['/', '/index.html', '/manifest.json'];

// Only cache the app shell and versioned static assets. Never cache auth
// callbacks, API responses, or anything that could leak child health data.
function isCacheable(request) {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (/^\/(auth|api|rest|graphql)(\/|$)/.test(url.pathname)) return false;
  if (SHELL.includes(url.pathname)) return true;
  return (
    url.pathname.startsWith('/_expo/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/register-sw.js'
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheable(request)) return; // let the network handle it
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ── Web Push (vaccine reminders) ─────────────────────────────────────────────
// Merged into this single root-scoped worker so caching and push never fight
// over the same registration scope.
self.addEventListener('push', (event) => {
  let payload = { title: 'Kapoori Ka', body: '', data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    try { payload.body = event.data ? event.data.text() : ''; } catch { /* ignore */ }
  }
  event.waitUntil(self.registration.showNotification(payload.title || 'Kapoori Ka', {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    vibrate: [0, 250, 250, 250],
    tag: payload.tag || undefined,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) return client.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  })());
});
