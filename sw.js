/* X-Finance: работа без сети и push-уведомления */
const CACHE='xfinance-v31';
const FILES=['/','/index.html','/shell.js','/app.js','/manifest.json','/icon-192.png','/icon-512.png','/apple-touch-icon.png','/favicon-32.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('xfinance')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin||u.pathname.startsWith('/api/')||u.pathname.startsWith('/admin'))return;
  const key=e.request.mode==='navigate'?'/index.html':e.request;
  const net=fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp))}return r});
  e.respondWith(caches.match(key).then(h=>{if(h){e.waitUntil(net.catch(()=>{}));return h}return net.catch(()=>Response.error())}));
});
self.addEventListener('push',e=>{
  let d={};try{d=e.data.json()}catch(x){}
  e.waitUntil(self.registration.showNotification(d.title||'X-Finance',{body:d.body||'',icon:'/icon-192.png',badge:'/icon-192.png',data:{url:d.url||'/'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=e.notification.data&&e.notification.data.url||'/';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url.includes(url.replace('/#',''))&&'focus' in c)return c.focus()}return self.clients.openWindow(url)}));
});
