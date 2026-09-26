const CACHE='exit-app-v1-20260926';
const ASSETS=['./','./index.html','./app.css?v=20260926-v1','./app.js?v=20260926-v1','./manifest.webmanifest','../exit-state.js','../assets/exit-mark.svg','../minimum-viable-day.html','../framework.html','../control-room.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('exit-app-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin)return;
  if(!(url.pathname.startsWith('/app/')||['/exit-state.js','/assets/exit-mark.svg','/minimum-viable-day.html','/framework.html','/control-room.html'].includes(url.pathname)))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));return response}).catch(()=>event.request.mode==='navigate'?caches.match('./index.html'):undefined)));
});
