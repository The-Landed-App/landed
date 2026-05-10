const CACHE = 'landed-v4';

const PRECACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: precache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch handler
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Never cache external APIs or third-party resources
  if (
    url.hostname === 'api.anthropic.com' ||
    url.hostname === 'microotter.github.io' ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname.includes('supabase.co')
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for navigation (prevents broken routes on refresh)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/'))
    );
    return;
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();

        caches.open(CACHE).then(cache => {
          cache.put(request, responseToCache);
        });

        return response;
      });
    })
  );
});
