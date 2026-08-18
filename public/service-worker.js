// Kapoori Ka — versioned, app-shell-only service worker.
// Bump VERSION on each deploy to invalidate stale caches.
const CACHE_PREFIX = 'kapoori-ka';
const VERSION = 'v2';
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
