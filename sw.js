// V15: offline-first, atomic precache for reliable cold starts.
const CACHE='meslistes-v15-20261118';
const ASSETS=['./','./index.html','./style.css','./app.js','./icon-192.png','./icon-512.png','./manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith('meslistes-')&&key!==CACHE).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  // Serve installed app files from the local cache first. No network wait on cold start.
  const cached=await cache.match(request,{ignoreSearch:request.mode==='navigate'});
  if(cached)return cached;
  try{const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response}
  catch(error){if(request.mode==='navigate'){const fallback=await cache.match('./index.html');if(fallback)return fallback}throw error}
 })());
});
