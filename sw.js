// sw.js (network-first) — generated for fast updates
const SW_VERSION = 'v20250817a';
const CACHE_NAME = `radio-cache-${SW_VERSION}`;

// install & activate immediately
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
  })());
});

// network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const req = event.request;

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-store' });
      // Optionally cache successful GET responses
      if (req.method === 'GET' && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});

// support SKIP_WAITING message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
