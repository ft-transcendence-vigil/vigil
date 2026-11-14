const CACHE_NAME = 'vigil-offline-v7';
const OFFLINE_URL = '/offline.html';
const FONT_URL = '/fonts/poppins-semibold.ttf';
const COLORS_URL = '/colors.css';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, FONT_URL, COLORS_URL]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const isFont =
    event.request.url === new URL(FONT_URL, self.location.origin).href;
  const isColors =
    event.request.url === new URL(COLORS_URL, self.location.origin).href;
  if (event.request.mode !== 'navigate' && !isFont && !isColors) return;

  const fallbackUrl = isFont ? FONT_URL : isColors ? COLORS_URL : OFFLINE_URL;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE_NAME).then((cache) => cache.match(fallbackUrl)),
    ),
  );
});
