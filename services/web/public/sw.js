const CACHE_NAME = 'vigil-offline-v8';
const ICON_URL = '/favicon.svg';
const OFFLINE_URL = '/offline.html';
const FONT_URL = '/fonts/poppins-semibold.ttf';
const COLORS_URL = '/colors.css';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([OFFLINE_URL, FONT_URL, COLORS_URL, ICON_URL]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isIcon =
    url.origin === self.location.origin &&
    (url.pathname === ICON_URL || url.pathname === '/favicon.ico');

  if (isIcon) {
    event.respondWith(
      caches
        .open(CACHE_NAME)
        .then((cache) => cache.match(ICON_URL))
        .then((response) => response || fetch(event.request)),
    );
    return;
  }
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
