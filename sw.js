const CACHE_NAME = 'hamrah-nazer-v3';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
const CDN_ASSETS = [
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...STATIC_ASSETS, ...CDN_ASSETS])
    ).catch(err => {
      // اگه CDN در دسترس نبود، فقط static رو cache کن
      return caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // OSRM routing: همیشه از شبکه (نیاز به داده لحظه‌ای)
  if (e.request.url.includes('router.project-osrm.org')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // بقیه: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // CDN responses رو cache کن
        if (response.ok && (
          e.request.url.includes('unpkg.com') ||
          e.request.url.includes('cdnjs.cloudflare') ||
          e.request.url.includes('cdn.sheetjs') ||
          e.request.url.includes('fonts.googleapis')
        )) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        if (e.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
