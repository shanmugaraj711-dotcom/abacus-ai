const CACHE='abacus-ai-v9';
const ASSETS=['./','./index.html','./styles.css','./tutor.css','./challengeApp.js','./interactionFix.js','./abacusEngine.js','./sound.js','./manifest.json','./assets/mascot/babi.svg','./icons/icon-192.png','./icons/icon-512.png'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CACHE)
    .then(cache=>cache.addAll(ASSETS))
    .then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

// Network-first keeps the live app from being trapped on a broken/stale JS
// cache, while still falling back to the last good cached asset offline.
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    fetch(event.request)
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html')))
  );
});
