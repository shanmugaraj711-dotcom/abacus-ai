const CACHE='abacus-ai-phase5-shell-v23';
const ASSETS=[
  './','./index.html','./styles.css','./tutor.css','./onboarding.css','./boot.js','./runtimeGuards.js',
  './challengeApp.js','./abacusEngine.js','./experiencedAssessment.js','./playModes.js','./babiVoice.js','./audioFx.js','./kidUi.js','./practiceFocus.js','./sessionSummary.js','./manifest.json','./assets/mascot/babi.svg','./icons/icon-192.png','./icons/icon-512.png'
];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);await Promise.all(ASSETS.map(url=>cache.add(url).catch(()=>null)));await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('abacus-ai-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;event.respondWith((async()=>{const cached=await caches.match(event.request,{ignoreSearch:true});if(cached)return cached;try{const response=await fetch(event.request);if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(event.request,copy)).catch(()=>{}))}return response}catch{if(event.request.mode==='navigate')return caches.match('./index.html',{ignoreSearch:true});return Response.error()}})())});
