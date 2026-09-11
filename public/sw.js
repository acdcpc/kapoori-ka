// Kapoori Ka service worker — Web Push + notification click handling.
// Served from the site root so the PWA (incl. iOS 16.4+ home-screen apps)
// can receive vaccine reminders when the app is closed.

self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

self.addEventListener('push', (event) => {
  let payload = { title: 'Kapoori Ka', body: '', data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    try { payload.body = event.data ? event.data.text() : ''; } catch { /* ignore */ }
  }
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
    vibrate: [0, 250, 250, 250],
    tag: payload.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(payload.title || 'Kapoori Ka', options));
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
