/* X-Finance: работа без сети и push-уведомления */
/* область работы: «/» или «/<BASE_PATH>/»; от неё считаются пути API и имена кэшей (несколько приложений на одном домене не мешают друг другу) */
const SC=new URL(self.registration.scope).pathname,SUF=SC==='/'?'':SC.replace(/[^\w]+/g,'_');
const CACHE='xfinance-v76'.replace('xfinance','xfinance'+SUF);
// пути относительные: приложение работает и в корне сайта, и в папке (например, GitHub Pages)
const FILES=['./','index.html','shell.js','app.js','manifest.json','icon-192.png','icon-512.png','apple-touch-icon.png','favicon-32.png'];
const HOME=new URL('index.html',self.registration.scope).href;
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).catch(()=>{}).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('xfinance'+SUF+'-v')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==self.location.origin||!u.pathname.startsWith(SC))return;
  const rel=u.pathname.slice(SC.length-1);if(rel.startsWith('/api/')||rel.startsWith('/admin')||rel.endsWith('/version.json'))return;
  const key=e.request.mode==='navigate'?HOME:e.request;
  const net=fetch(e.request).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(key,cp))}return r});
  e.respondWith(caches.match(key).then(h=>{if(h){e.waitUntil(net.catch(()=>{}));return h}return net.catch(()=>Response.error())}));
});
/* настройки уведомлений этого устройства (пишет приложение: Настройки → Уведомления) */
const prefs=()=>caches.open('xf-prefs'+SUF).then(c=>c.match('/__xf_prefs')).then(r=>r?r.json():{}).catch(()=>({}));
const badge=n=>{try{if(self.navigator&&self.navigator.setAppBadge)return n>0?self.navigator.setAppBadge(n):self.navigator.clearAppBadge()}catch(x){}};
self.addEventListener('push',e=>{
  let d={};try{d=e.data.json()}catch(x){}
  e.waitUntil((async()=>{
    const p=await prefs();if(p.badge!==false&&d.badge!=null)await badge(d.badge);
    // приложение открыто и на экране — покажет красивый баннер само, системное уведомление не нужно
    const l=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const vis=l.find(c=>c.visibilityState==='visible'&&c.focused);
    if(vis&&p.inapp!==false&&d.kind!=='test'){l.forEach(c=>c.postMessage({type:'push',d}));return}
    l.forEach(c=>c.postMessage({type:'push',d}));
    return self.registration.showNotification(d.title||'X-Finance',{body:d.body||'',icon:'icon-192.png',badge:'icon-192.png',tag:d.tag||undefined,renotify:!!d.tag,
      silent:!!p.silent,requireInteraction:!!p.sticky,vibrate:p.silent?undefined:[60,40,60],timestamp:Date.now(),data:{url:d.url||self.registration.scope}});
  })());
});
/* фоновое обновление (Chrome, установленное приложение): проверить новое, обновить значок и файлы приложения */
self.addEventListener('periodicsync',e=>{if(e.tag!=='xf-refresh')return;
  e.waitUntil((async()=>{try{const r=await fetch('/api/notes',{credentials:'same-origin'});if(r.ok){const j=await r.json();const p=await prefs();if(p.badge!==false)await badge(j.unread||0)}}catch(x){}
    try{const c=await caches.open(CACHE);await Promise.all(FILES.map(f=>fetch(f,{cache:'no-store'}).then(r=>r.ok&&c.put(f==='./'?HOME:f,r)).catch(()=>{})))}catch(x){}})())});
self.addEventListener('notificationclick',e=>{
  e.notification.close();const url=e.notification.data&&e.notification.data.url||self.registration.scope;
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(l=>{for(const c of l){if(c.url.includes(url.replace('/#',''))&&'focus' in c)return c.focus()}return self.clients.openWindow(url)}));
});
