const CACHE_NAME = 'vigil-offline-v6';
const OFFLINE_URL = '/offline.html';
const FONT_URL = '/fonts/poppins-semibold.ttf';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, FONT_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const isFont =
    event.request.url === new URL(FONT_URL, self.location.origin).href;
  if (event.request.mode !== 'navigate' && !isFont) return;

  const fallbackUrl = isFont ? FONT_URL : OFFLINE_URL;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE_NAME).then((cache) => cache.match(fallbackUrl)),
    ),
  );
});
