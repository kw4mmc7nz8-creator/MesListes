// V17: reliable offline cache, versioned assets, bounded network navigation.
const CACHE='meslistes-v17bis-20261121';
const ASSETS=['./index.html','./style.css?v=17bis','./app.js?v=17bis','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith('meslistes-')&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  if(req.mode==='navigate'){
   // Local first for fast launch; refresh silently for the next navigation.
   const cached=await cache.match('./index.html');
   if(cached){event.waitUntil(fetch(req).then(r=>{if(r.ok)return cache.put('./index.html',r.clone())}).catch(()=>{}));return cached}
   try{return await fetch(req)}catch(e){return new Response('MesListes est indisponible hors ligne.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}
  }
  const cached=await cache.match(req);
  if(cached)return cached;
  const response=await fetch(req);
  if(response.ok&&new URL(req.url).pathname.startsWith(new URL(self.registration.scope).pathname))event.waitUntil(cache.put(req,response.clone()));
  return response;
 })());
});
