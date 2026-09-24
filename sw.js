// Offline support. Network-first for app files so updates arrive right away;
// cache is the fallback when offline.
const CACHE = 'abacus-buddy-v4';
const SHELL = ['./', './index.html', './css/app.css', './js/app.js', './js/engine.js', './js/store.js', './js/sound.js',
  './js/abacusView.js', './js/babi.js', './js/lessons.js', './js/i18n.js', './js/ui.js', './js/config.js', './js/games.js', './js/exams.js', './js/admin.js', './config.json', './manifest.json', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Do not cache authenticated API responses; bypass SW completely for /api/user-status and API endpoints
  if (url.pathname === '/api/user-status' || url.pathname.startsWith('/api/')) return;
  const isFont = url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com');
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch {
      return (await cache.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
    }
  })());
});
