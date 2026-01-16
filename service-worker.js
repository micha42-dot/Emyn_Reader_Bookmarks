const CACHE_NAME = 'emyn-reader-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com?plugins=typography'
];

// Install event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Network first for RSS data, Cache first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // If it's an API call (RSS proxy) or Gist, go network only (or network first)
  if (url.href.includes('api.rss2json.com') || url.href.includes('api.github.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else (App Shell), try cache first, then network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});