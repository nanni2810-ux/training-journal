const CACHE='training-journal-v0.1.9';
const CORE=['./','./index.html','./styles.css?v=0.1.1','./db.js','./app.js?v=0.1.1','./v012.js?v=0.1.2','./v013.js?v=0.1.3','./v014.js?v=0.1.4','./v018_guard.js?v=0.1.8','./v016.js?v=0.1.6','./v017.js?v=0.1.7','./v019_wod_library.js?v=0.1.9','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
const LIBRARY=['./wod_library_01.js','./wod_library_02.js','./wod_library_03.js','./wod_library_04.js','./wod_library_05.js','./wod_library_06.js','./wod_library_07.js','./wod_library_08.js','./wod_library_09.js','./wod_library_10.js'];
const ASSETS=[...CORE,...LIBRARY];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url),isCore=e.request.mode==='navigate'||/\/(?:index\.html|styles\.css|app\.js|v012\.js|v013\.js|v014\.js|v018_guard\.js|v016\.js|v017\.js|v019_wod_library\.js|db\.js|manifest\.webmanifest)$/.test(url.pathname);
  if(isCore){
    e.respondWith(fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return resp}).catch(()=>caches.match('./index.html'))));
});
