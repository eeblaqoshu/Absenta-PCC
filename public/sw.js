// public/sw.js
const CACHE_NAME = 'absenta-pcc-v2';

const STATIC_ASSETS = [
  '/logo-pcc.png',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: Gagal pre-cache beberapa aset statis:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Jangan pernah meng-cache di localhost/127.0.0.1 agar HMR Turbopack selalu segar
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return;
  }

  // Jangan sentuh API requests atau HTTP selain GET
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Khusus aset statis produksi (immutable Next static, gambar, font): Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, toCache);
            });
            return response;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Untuk navigasi halaman (HTML): Network-first dengan cache fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const toCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, toCache);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
  }
});
