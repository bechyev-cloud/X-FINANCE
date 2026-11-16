'use strict';
/* X-Finance 2.0 — клиентская часть */
/* ---------- состояние ---------- */
const LKEY='xfinance_v2';
let db={clients:[],contracts:[],debts:[],investors:[]};
const SDEF={inst:true,debt:true,sign:'',green:{},lastBackup:null,pin:{}};
const pinned=k=>!!(S.pin&&S.pin[k]);   // категории экрана открыты всегда (без свайпа вниз)
let linked=new Set(),NI={unread:0,shared:0,notes:null},shared=null,itab='notes',PROPS=[];
let S={...SDEF},me=null,info={},LOCAL=false,offline=false,pub=null,pubData=null,inv=null,mem=false;

/* ---------- помощники ---------- */
/* BASE_PATH (например, «/xfinance»): сервер подставляет window.XF_BASE в страницу. Без него — корень сайта, как раньше.
   XB — префикс, U(путь) — адрес API с префиксом, PTH — путь страницы без префикса, SELF — адрес этого сервера с префиксом. */
const XB=String(window.XF_BASE||'').replace(/\/+$/,''),U=u=>typeof u==='string'&&u[0]==='/'&&u[1]!=='/'?XB+u:u;
const PTH=XB&&location.pathname.startsWith(XB)?location.pathname.slice(XB.length)||'/':location.pathname,SELF=location.origin+XB;
const SUF=XB?(XB+'/').replace(/[^\w]+/g,'_'):'';
const $=(s,r=document)=>r.querySelector(s);
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2});
const r2=n=>Math.round(n*100)/100;
const money=n=>nf.format(r2(n))+' ₽';
const num=s=>{const v=parseFloat(String(s??'').replace(/\s/g,'').replace(',','.'));return isFinite(v)?r2(v):0};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const today=()=>iso(new Date());
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const MON=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const fdate=s=>{if(!s)return'';const[y,m,d]=s.split('-').map(Number);return d+' '+MON[m-1]+(y!==new Date().getFullYear()?' '+y:'')};
const addMonths=(s,n)=>{const d=parse(s),day=d.getDate(),r=new Date(d.getFullYear(),d.getMonth()+n,1),last=new Date(r.getFullYear(),r.getMonth()+1,0).getDate();r.setDate(Math.min(day,last));return iso(r)};
const days=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const plural=(n,f)=>{const a=Math.abs(n)%100,b=a%10;return n+' '+(a>10&&a<20?f[2]:b===1?f[0]:b>=2&&b<=4?f[1]:f[2])};
const pdays=n=>plural(n,['день','дня','дней']);
const sumBy=(a,f)=>a.reduce((s,x)=>s+f(x),0);
const fio=x=>[x.last,x.first,x.middle].filter(Boolean).join(' ')||'Без имени';
const hello=x=>[x.first,x.middle].filter(Boolean).join(' ')||x.last||'';
const ini=x=>((x.last||x.first||'?')[0]+((x.last&&x.first)?x.first[0]:'')).toUpperCase();
const client=id=>(typeof cIdx==='function'?cIdx().cl.get(id):db.clients.find(c=>c.id===id))||{last:'Без клиента',phone:''};
const investor=id=>db.investors.find(c=>c.id===id);
const waPhone=p=>{let d=String(p||'').replace(/\D/g,'');if(d.length===11&&d[0]==='8')d='7'+d.slice(1);if(d.length===10)d='7'+d;return d};
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const linkOf=x=>x.token&&!LOCAL?SELF+'/p/'+x.token:'';
const sv=(p,w=1.8)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.3"/></svg>',eyeOff:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.2 4.1M6.4 6.5C3.9 8.2 2.5 12 2.5 12s3.5 7 9.5 7a9.6 9.6 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',img:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5"/></svg>',cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.8"/></svg>',
home:sv('<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
doc:sv('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>'),
users:sv('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.500 3.200-5.500 6.500-5.500s5.900 2 6.500 5.500M16 4.800a3.500 3.500 0 0 1 0 6.400M18 14.800c1.900.700 3.100 2.500 3.500 5.200"/>'),
coin:sv('<path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M3 7a3 3 0 0 1 3-3h10M16.500 13.500h.010"/>'),
gear:sv('<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>'),
chart:sv('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
plus:sv('<path d="M12 5v14M5 12h14"/>',2.2),minus:sv('<path d="M5 12h14"/>',2.2),
back:sv('<path d="m15 6-6 6 6 6"/>',2),x:sv('<path d="M6 6l12 12M18 6 6 18"/>',2),
wa:sv('<path d="M4 20l1.300-4.200A8 8 0 1 1 8.400 19z"/><path d="M9 9.500c0 3 2.500 5.500 5.500 5.500l1-1.500-2-1-1 .800c-.800-.400-1.400-1-1.800-1.800l.800-1-1-2z"/>'),
phone:sv('<path d="M6 3h3l1.500 4.500-2 1.500a12 12 0 0 0 6.500 6.500l1.500-2L21 15v3a3 3 0 0 1-3 3A15 15 0 0 1 3 6a3 3 0 0 1 3-3z"/>'),
check:sv('<path d="m5 12.500 4.500 4.500L19 7.500"/>',2.2),
star:sv('<path d="m12 3.500 2.600 5.400 5.900.800-4.300 4.100 1 5.800-5.200-2.800-5.200 2.800 1-5.800-4.300-4.100 5.900-.800z"/>'),
copy:sv('<rect x="8" y="8" width="12" height="12" rx="2.500"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
share:sv('<path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'),
bell:sv('<path d="M6 16V11a6 6 0 1 1 12 0v5l1.500 2h-15zM10 20.500h4"/>'),
ban:sv('<circle cx="12" cy="12" r="8.500"/><path d="m6 6 12 12"/>'),
xmark:sv('<path d="M7 7l10 10M17 7 7 17"/>',2.400),
tg:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.5 4.3 18.4 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.6 12.9 2 11.5c-1-.3-1-1 .2-1.5l18-6.9c.8-.3 1.6.2 1.3 1.2z"/></svg>',gift:sv('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.500 8a2.500 2.500 0 0 1 0-5C10 3 12 8 12 8s2-5 4.500-5a2.500 2.500 0 0 1 0 5"/>'),link:sv('<path d="M10 14a4.500 4.500 0 0 0 6.400 0l3-3a4.500 4.500 0 0 0-6.400-6.400l-1 1"/><path d="M14 10a4.500 4.500 0 0 0-6.400 0l-3 3a4.500 4.500 0 0 0 6.400 6.400l1-1"/>'),eye:sv('<path d="M2.5 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>'),send:sv('<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>'),
search:sv('<circle cx="11" cy="11" r="6.500"/><path d="m20 20-4.200-4.200"/>'),
undo:sv('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.500a5.500 5.500 0 0 1 0 11H11"/>'),
trash:sv('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
edit:sv('<path d="M4 20h4L19 9a2.800 2.800 0 0 0-4-4L4 16z"/><path d="m13.500 6.500 4 4"/>'),
list:sv('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.500" cy="6" r="1"/><circle cx="4.500" cy="12" r="1"/><circle cx="4.500" cy="18" r="1"/>'),
box:sv('<path d="M12 3 4 7.500v9L12 21l8-4.500v-9z"/><path d="M4 7.500 12 12l8-4.500M12 12v9"/>'),
cal:sv('<rect x="4" y="5.500" width="16" height="14.500" rx="2.500"/><path d="M4 10h16M8.500 3.500v4M15.500 3.500v4"/>'),
alert:sv('<path d="M12 4 3 19.500h18z"/><path d="M12 10v4.500M12 17h.010"/>'),
card:sv('<rect x="3" y="5.500" width="18" height="13" rx="3"/><path d="M3 10h18M7 14.500h3"/>'),
rub:sv('<path d="M8 20V5h5a4 4 0 0 1 0 8H6M6 16.500h8"/>',2),
cash:sv('<rect x="3" y="6" width="18" height="12" rx="2.500"/><circle cx="12" cy="12" r="2.600"/><path d="M6.500 9.500v.010M17.500 14.500v.010"/>'),
trend:sv('<path d="M4 17l5.500-5.500 3.500 3.500L20 8M15 8h5v5"/>'),
sync:sv('<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20.5V16h-4.5"/>',2),
upl:sv('<path d="M12 19V6"/><path d="m6 11 6-6 6 6"/>',2.2),
cloud:sv('<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.75 4.75 0 0 1-.5 9.5z"/><path d="m9.5 13.5 2 2 3.5-4"/>'),
grid:sv('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>'),
file:sv('<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5"/>')
};

/* ---------- сервер и хранение ---------- */
async function api(method,url,body,rawType){
  const o={method,credentials:'same-origin',headers:{}};
  if(rawType){o.headers['Content-Type']=rawType;o.body=body}else if(body){o.headers['Content-Type']='application/json';o.body=JSON.stringify(body)}
  let r;try{r=await fetch(U(url),o)}catch(e){const x=new Error('Нет связи с сервером');x.net=true;throw x}
  const j=await r.json().catch(()=>null);
  if(!j&&r.status>=500){const x=new Error('Сервер недоступен ('+r.status+')');x.net=true;throw x}
  if(!r.ok||!j){if(r.status===401&&me&&!url.includes('/login')){me=null;render()}throw new Error(j&&j.error||'Ошибка сервера ('+r.status+')')}
  return j;
}
const KIND={client:'clients',contract:'contracts',debt:'debts',investor:'investors'};
function saveLocal(){try{localStorage.setItem(LKEY,JSON.stringify({db,S}))}catch(e){mem=true}kvs('put','local',{db,S,at:new Date().toISOString()}).catch(()=>{})}
/* копия данных аккаунта на устройстве (IndexedDB): без связи приложение открывается с ней, изменения уходят из очереди */
let snapT=0,stale=null;
function snapSoon(){if(LOCAL||!me||me.role!=='owner')return;clearTimeout(snapT);snapT=setTimeout(snapNow,700)}
async function snapNow(){if(!me||me.role!=='owner')return;try{await kvs('put','snap:'+me.id,{me,db,S,props:PROPS,at:new Date().toISOString()});localStorage.setItem('xf_last_uid',me.id)}catch(e){}}
async function snapLoad(){try{const id=localStorage.getItem('xf_last_uid');return id?await kvs('get','snap:'+id):null}catch(e){return null}}
function useSnap(sn){me=sn.me;db=normalize(sn.db);S={...SDEF,...sn.S};PROPS=sn.props||[];stale=sn.at||new Date().toISOString();obLoad();obApply()}
async function reconnect(){if(!stale)return;try{const r=await fetch(U('/api/me'),{credentials:'same-origin'});if(!r.ok)return;const j=await r.json();if(!('user' in j))return;info=j;
  if(!j.user){stale=null;me=null;render();return}me=j.user;stale=null;offline=false;await obFlush(true);await loadData();render();toast('Связь восстановлена — данные синхронизированы')}catch(e){}}
setInterval(()=>{if(stale&&!document.hidden)reconnect()},15000);
let svTried=0;async function svFailover(){if(!svAuto()||!stale||Date.now()-svTried<60000)return;svTried=Date.now();
  const l=svList().filter(s=>s.url!==SELF);for(const s of l){const p=await svPing1(s);if(p.ms!=null){toast('Основной сервер не отвечает — переключаюсь на «'+s.name+'»');setTimeout(()=>{location.href=s.url+'/#/'},1200);return}}}
setInterval(()=>{if(stale&&!document.hidden)svFailover()},20000);addEventListener('online',()=>reconnect());
const staleBar=()=>stale?`<div class="stale">${I.cloud}<span><b>Нет связи с сервером</b> · работаете с копией на устройстве от ${new Date(stale).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}. Изменения сохранятся и отправятся сами.</span><button class="btn sm soft" data-a="reconnect">Проверить</button></div>`:'';
function normalize(d){
  DV++;  d.investors=d.investors||[];d.clients=d.clients||[];d.contracts=d.contracts||[];d.debts=d.debts||[];
  d.clients.forEach(c=>{if(c.name&&!c.first&&!c.last)c.first=c.name;delete c.name;c.files=c.files||[]});
  d.debts.forEach(x=>{
    if(!x.ops){x.ops=[{id:uid(),kind:'add',amount:x.amount||0,date:x.date||today(),note:''},...(x.payments||[]).map(p=>({id:p.id||uid(),kind:'pay',amount:p.amount,date:p.date,note:p.note||''}))];delete x.amount;delete x.payments}
    if(x.person&&!x.first&&!x.last)x.first=x.person;delete x.person});
  d.contracts.forEach(c=>{c.payments=c.payments||[]});
  return{clients:d.clients,contracts:d.contracts,debts:d.debts,investors:d.investors};
}
function loadLocal(){
  try{
    const s=localStorage.getItem(LKEY),old=localStorage.getItem('xfinance_v1');
    if(s){const j=JSON.parse(s);db=normalize(j.db);S={...SDEF,...j.S}}
    else if(old){const j=JSON.parse(old);db=normalize(j);S.sign=j.sign||'';saveLocal()}
  }catch(e){mem=true}
}
async function loadData(){
  const d=await api('GET','/api/data');syncAt=new Date().toISOString();stats=null;
  if(me.role==='investor')inv=d;else{db=normalize(d);obApply();stale=null;snapSoon();S={...SDEF,...(me.settings||{})};linked=new Set(d.links||[]);PROPS=d.props||[];linkU={};(d.linkUsers||[]).forEach(x=>linkU[x.clientId]=x.uid);fetchNotes()}
  /* адрес сервера для ссылок в автонапоминаниях WhatsApp: после переезда (например, в /xfinance/) обновляется сам */
  if(me.role!=='investor'&&S.wa&&S.wa.origin&&S.wa.origin!==SELF&&location.protocol.startsWith('http'))setTimeout(()=>saveWa({}).catch(()=>{}),1500);
}
async function put(kind,item){
  DV++;  const arr=db[KIND[kind]];if(!arr.includes(item))arr.push(item);
  if(LOCAL){saveLocal();autoBackupSoon();return item}
  const e=obAdd('put',kind,item);
  try{const r=await api('PUT',`/api/items/${kind}/${item.id}`,item);Object.assign(item,r.item);syncAt=new Date().toISOString();stats=null;obMark(e,'ok')}
  catch(x){if(x.net){obMark(e,'wait',x.message);netNote();snapSoon();autoBackupSoon();return item}
    obMark(e,'err',x.message);await loadData().catch(()=>{});render();throw x}
  snapSoon();autoBackupSoon();return item;
}
async function del(kind,id){
  DV++;  const old=db[KIND[kind]].find(x=>x.id===id);db[KIND[kind]]=db[KIND[kind]].filter(x=>x.id!==id);
  if(LOCAL)saveLocal();else{
    OB=OB.filter(x=>!(x.t==='put'&&x.kind===kind&&x.iid===id&&x.st!=='ok'));
    const e=obAdd('del',kind,id,{title:obTitle(kind,old)});
    try{await api('DELETE',`/api/items/${kind}/${id}`);obMark(e,'ok');syncAt=new Date().toISOString();stats=null}
    catch(x){if(x.net){obMark(e,'wait',x.message);netNote()}else{obMark(e,'err',x.message);throw x}}snapSoon()}
  autoBackupSoon();
}
let netT=0;function netNote(){if(Date.now()-netT>6000){netT=Date.now();setTimeout(()=>toast('Нет связи — сохранено на устройстве, отправится автоматически'),400)}}
async function saveS(patch){Object.assign(S,patch);if(LOCAL)saveLocal();else{const r=await api('POST','/api/account',{settings:patch});me=r.user}}

/* ---------- журнал отправки на сервер (очередь с повтором) ----------
   Каждое сохранение/удаление/фото попадает в OB. Нет связи — запись остаётся «не отправлено» (красная точка),
   изменение хранится на устройстве и уходит само при появлении сети, по кнопке «Обновить» или круглой кнопкой «Отправить». */
let OB=[],obBusy=false;
const obKey=()=>'xf_ob_'+(me&&me.id||0);
function obLoad(){try{OB=JSON.parse(localStorage.getItem(obKey())||'[]')}catch(e){OB=[]}}
function obSave(){const keep=[],ok=[];OB.forEach(e=>(e.st==='ok'?ok:keep).push(e));OB=[...keep,...ok.slice(-60)].sort((a,b)=>a.ts-b.ts);try{localStorage.setItem(obKey(),JSON.stringify(OB))}catch(e){}}
const obPend=()=>OB.filter(e=>e.st!=='ok').length;
function kvs(op,key,val){return new Promise((res,rej)=>{let r;try{r=indexedDB.open('xfinance',1)}catch(e){return rej(e)}
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{const t=r.result.transaction('kv',op==='get'?'readonly':'readwrite'),s=t.objectStore('kv'),q=op==='get'?s.get(key):op==='del'?s.delete(key):s.put(val,key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}})}
function obTitle(kind,x){
  if(!x)return'Запись';
  if(kind==='client')return'Контакт · '+fio(x);
  if(kind==='contract'){const c=db.clients.find(y=>y.id===x.clientId);return'Договор'+(x.no?' №'+x.no:'')+(c?' · '+fio(c):x.item?' · '+x.item:'')}
  if(kind==='debt')return(x.type==='out'?'Мой долг':'Долг')+' · '+fio(x);
  if(kind==='investor')return'Инвестор · '+fio(x);
  return'Запись';
}
function obAdd(t,kind,item,extra){
  const iid=item&&item.id||item;let e=t==='put'&&OB.find(x=>x.t==='put'&&x.kind===kind&&x.iid===iid&&x.st!=='ok');
  if(!e){e={id:uid(),t,kind,iid,ts:Date.now()};OB.push(e)}
  Object.assign(e,{st:'go',err:'',at:Date.now(),title:extra&&extra.title||obTitle(kind,typeof item==='object'?item:db[KIND[kind]]&&db[KIND[kind]].find(x=>x.id===iid))},extra||{});
  if(t==='put')e.data=JSON.parse(JSON.stringify(item));
  obSave();return e;
}
function obMark(e,st,err){e.st=st;e.err=err||'';e.at=Date.now();if(st!=='ok')e.n=(e.n||0)+1;obSave();bell();if(npOpen&&ntab==='out')npRender()}
const obLog=(title,sub)=>{const e={id:uid(),t:'log',title,sub,ts:Date.now(),at:Date.now(),st:'ok'};OB.push(e);obSave();if(npOpen&&ntab==='out')npRender()};
/* после загрузки с сервера вернуть поверх свои ещё не отправленные изменения */
function obApply(){
  for(const e of OB){if(e.st==='ok'||e.st==='err')continue;const k=KIND[e.kind];if(!k||!db[k])continue;
    if(e.t==='put'){const i=db[k].findIndex(x=>x.id===e.iid);if(i<0)db[k].push(e.data);else db[k][i]=e.data}
    else if(e.t==='del')db[k]=db[k].filter(x=>x.id!==e.iid)}
  DV++;
}
async function obSend(e){
  if(e.t==='put'){const arr=db[KIND[e.kind]];let it=arr.find(x=>x.id===e.iid);if(!it){it=e.data;arr.push(it)}
    const r=await api('PUT',`/api/items/${e.kind}/${e.iid}`,it);Object.assign(it,r.item)}
  else if(e.t==='del')await api('DELETE',`/api/items/${e.kind}/${e.iid}`).catch(x=>{if(!/не найден/i.test(x.message))throw x});
  else if(e.t==='file'){const blob=await kvs('get','ob:'+e.id);if(!blob)throw new Error('Файл не найден на устройстве — добавьте его заново');
    const c=db.clients.find(x=>x.id===e.iid);if(!c)throw new Error('Контакт удалён');
    const r=await api('POST',`/api/files?item=${c.id}&name=${encodeURIComponent(e.name||'photo.jpg')}`,blob,e.type);c.files=c.files||[];c.files.push(r.file);
    if(!c.mainPhoto&&r.file.type!=='application/pdf')c.mainPhoto=r.file.id;kvs('del','ob:'+e.id).catch(()=>{});await put('client',c)}
  syncAt=new Date().toISOString();stats=null;
}
async function obRun(e){
  obMark(e,'go');try{await obSend(e);obMark(e,'ok');return true}
  catch(x){obMark(e,x.net?'wait':'err',x.message);return false}
}
async function obFlush(quiet){
  if(LOCAL||obBusy||!me)return 0;const list=OB.filter(e=>e.st!=='ok'&&e.st!=='go');if(!list.length)return 0;obBusy=true;let ok=0;
  for(const e of list.sort((a,b)=>a.ts-b.ts)){if(await obRun(e))ok++;else if(e.st==='wait')break}
  obBusy=false;DV++;if(ok&&!quiet)toast(ok===1?'Изменение отправлено на сервер':`Отправлено на сервер: ${ok}`);
  if(ok&&!$('#layer .ov'))render();return ok;
}
addEventListener('online',()=>obFlush());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&obPend())obFlush(true)});

/* ---------- расчёты ---------- */
let DV=0;const CC=new WeakMap(),DC=new WeakMap();
function calc(c){const h=CC.get(c);if(h&&h.v===DV)return h.r;const r=calcRaw(c);CC.set(c,{v:DV,r});return r}
function dcalc(d){const h=DC.get(d);if(h&&h.v===DV)return h.r;const r=dcalcRaw(d);DC.set(d,{v:DV,r});return r}
function calcRaw(c){
  const total=c.cost+c.markup,fin=Math.max(0,total-c.down),n=Math.max(1,c.months|0);
  const paid=sumBy(c.payments,p=>p.amount),t=today();
  const base=Math.floor(fin/n);let pool=paid,overdue=0,firstOver=null,next=null;const rows=[];
  if(fin>0)for(let i=0;i<n;i++){
    const amount=i===n-1?r2(fin-base*(n-1)):base,date=addMonths(c.first,i+sumBy((c.shifts||[]).filter(z=>i>=z.from),z=>z.months)),got=Math.min(pool,amount);pool=r2(pool-got);
    const rest=r2(amount-got),st=rest<=0?'paid':date<t?'overdue':'due',r={n:i+1,date,amount,got,rest,st};
    if(st==='overdue'){overdue+=rest;firstOver=firstOver||date}
    if(rest>0&&!next)next=r;rows.push(r);
  }
  const left=Math.max(0,r2(fin-paid)),pct=c.investorId?(+c.invPct||0):0,exp=r2(c.markup*pct/100),ratio=total?Math.min(1,(c.down+paid)/total):0;
  return{total,fin,paid,left,rows,overdue,days:firstOver?days(firstOver,t):0,next,monthly:base,
    status:left<=0?'done':overdue>0?'overdue':'active',pct:fin?Math.min(100,paid/fin*100):100,
    invExp:exp,invGot:r2(exp*ratio),compExp:r2(c.markup-exp)};
}
function dcalcRaw(d){
  const add=sumBy(d.ops.filter(o=>o.kind==='add'),o=>o.amount),paid=sumBy(d.ops.filter(o=>o.kind==='pay'),o=>o.amount),left=Math.max(0,r2(add-paid)),t=today();
  const over=left>0&&d.due&&d.due<t;
  return{add,paid,left,status:left<=0?'done':over?'overdue':'active',days:over?days(d.due,t):0,pct:add?Math.min(100,paid/add*100):100};
}
function invSum(list){
  const ks=list.map(calc);
  return{n:list.length,invested:sumBy(list,c=>c.cost),work:sumBy(ks,k=>k.left),exp:sumBy(ks,k=>k.invExp),got:sumBy(ks,k=>k.invGot)};
}

/* ---------- анимация чисел ---------- */
const shown={};
const N=(v,k,z)=>`<span class="num" data-n="${v}" data-k="${k}"${z?' data-z':''}>${money(k in shown?shown[k]:z?0:v)}</span>`;
function runCounts(){
  document.querySelectorAll('[data-n]').forEach(el=>{
    const to=+el.dataset.n,k=el.dataset.k,from=k in shown?shown[k]:el.hasAttribute('data-z')?0:to;shown[k]=to;el.removeAttribute('data-n');
    if(from===to||matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=money(to);return}
    const t0=performance.now(),D=900;el.classList.add(to>from?'up':'down');
    (function step(t){const p=Math.min(1,(t-t0)/D),e=1-Math.pow(1-p,4);el.textContent=money(Math.round(from+(to-from)*e));
      if(p<1&&el.isConnected)requestAnimationFrame(step);else{el.textContent=money(to);el.classList.remove('up','down')}})(t0);
  });
}

/* ---------- общие блоки ---------- */
function chipC(k){
  if(k.status==='done')return'<span class="chip ok">Завершён</span>';
  if(k.status==='overdue')return`<span class="chip warn">Просрочка ${pdays(k.days)}</span>`;
  const d=days(today(),k.next.date);
  return`<span class="chip${d<=3?' gold':''}">${d===0?'Платёж сегодня':d===1?'Платёж завтра':'Платёж '+fdate(k.next.date)}</span>`;
}
const chipD=(d,k)=>k.status==='done'?'<span class="chip ok">Закрыт</span>':k.status==='overdue'?`<span class="chip warn">Просрочка ${pdays(k.days)}</span>`:d.due?`<span class="chip">до ${fdate(d.due)}</span>`:'<span class="chip">Без срока</span>';
function cCard(c,k,name){
  k=k||calc(c);
  return`<a class="card item" ${name?'':`href="${cHref(c.id)}"`}>
    <div class="h"><div class="t">${esc(name||fio(client(c.clientId)))}</div><div class="a num">${money(k.left)}</div></div>
    <div class="s">№${c.no} · ${esc(c.item)}</div>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="f">${chipC(k)}<span class="num">${name?'ваша прибыль '+money(k.invExp):k.status==='overdue'?'долг '+money(k.overdue):k.status==='done'?money(k.total):'оплачено '+money(k.paid)}</span></div>
  </a>`;
}
function dCard(d,k){
  k=k||dcalc(d);
  return`<a class="card item with-ava" href="#/debt/${d.id}"><div class="ava">${esc(ini(d))}</div><div>
    <div class="h"><div class="t">${esc(fio(d))}</div><div class="a num">${money(k.status==='done'?k.add:k.left)}</div></div>
    <div class="f" style="margin-top:4px">${chipD(d,k)}<span>${d.type==='in'?'должен мне':'я должен'}</span></div></div></a>`;
}
const empty=(icon,title,text,btn)=>`<div class="empty">${icon}<b>${title}</b>${text||''}${btn?'<br>'+btn:''}</div>`;
function linkCard(x,who){
  const l=linkOf(x);if(!l)return'';
  return`<h2>Ссылка для ${who}</h2><div class="card link"><code>${esc(l.replace(/^https?:\/\//,''))}</code>
    <button class="btn sm soft" data-a="copy" data-v="${esc(l)}">${I.copy}Копировать</button>${navigator.share?`<button class="x" data-a="share" data-v="${esc(l)}" aria-label="Поделиться">${I.share}</button>`:''}</div>
    <div class="note" style="margin:8px 4px 0">По ссылке ${who==='должника'?'должник':'клиент'} видит свою страницу с остатком и историей и может включить уведомления.</div>`;
}
function filesBlock(c){
  if(!(c.files||[]).length)return'';
  return`<h2>Документы</h2><div class="files">${c.files.map(f=>`<button class="tile" data-a="view" data-c="${c.id}" data-id="${f.id}" data-t="${f.type}" data-l="${f.local?1:''}">${f.type==='application/pdf'?I.file+'PDF':`<img src="${fileUrl(f)}" alt="${esc(f.name)}" loading="lazy">`}</button>`).join('')}</div>`;
}

/* ---------- страницы владельца ---------- */
let ctab='all',catOpen=false,pendingCat=false,dtab='in',q='',flashId=null;
const MONF=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const dmy=s=>s?s.split('-').reverse().join('.'):'';
function kpi(icon,tone,label,val,key,o={}){
  const tag=o.href?'a':o.a?'button':'div';
  return`<${tag} class="card kpi ${tone}"${o.href?` href="${o.href}"`:''}${o.a?` data-a="${o.a}"`:''}${o.t?` data-t="${o.t}"`:''}><span class="ic">${icon}</span>${o.href||o.a?`<span class="go">${I.back}</span>`:''}
    <div class="kb"><div class="l">${label}</div><div class="v">${N(val,key,1)}</div><div class="s">${o.sub||'&nbsp;'}</div></div></${tag}>`;
}
function monthRows(kind){
  const ym=today().slice(0,7),out=[];
  for(const c of db.contracts){const n=fio(client(c.clientId));
    if(kind==='got')c.payments.filter(p=>p.date.slice(0,7)===ym).forEach(p=>out.push({id:c.id,name:n,sub:c.item,date:p.date,amount:p.amount}));
    else calc(c).rows.filter(r=>r.date.slice(0,7)===ym&&r.rest>0).forEach(r=>out.push({id:c.id,name:n,sub:c.item,date:r.date,amount:r.rest,over:r.st==='overdue'}));}
  return out.sort((a,b)=>a.date<b.date?-1:1);
}
function monthSheet(kind){
  const rows=monthRows(kind);
  sheet((kind==='got'?'Получено: ':'Ожидается: ')+MONF[new Date().getMonth()],rows.length?`<div class="card rows" style="margin-bottom:6px">${rows.map(r=>`<a class="rw" href="#/contract/${r.id}"><div class="g"><b>${esc(r.name)}</b><small${r.over?' style="color:var(--warn)"':''}>${dmy(r.date)} · ${esc(r.sub)}${r.over?' · просрочен':''}</small></div><div class="am num">${money(r.amount)}</div></a>`).join('')}</div>`
    :empty(I.cal,kind==='got'?'В этом месяце платежей не было':'В этом месяце платежей не ждём',''),null,null);
}
/* ---------- главная → «Платежи»: сегодня, завтра, неделя, месяц, календарь ---------- */
/* ---------- совместный доступ к инвестору ----------
   Владелец: на странице инвестора приглашает другого пользователя X-Finance (ФИО + телефон) и задаёт права.
   Получатель: после «Принять» инвестор появляется на главной отдельной плашкой с переливающейся рамкой («извне»).
   «Все» у получателя — только его личные данные; внешние данные видны только при выборе этой плашки.
   Данные берутся с сервера (/api/shares/:id/data), изменения уходят туда же — в базу владельца. */
const SHP=[['pay',I.check,'ok','Принимать платежи'],['create',I.plus,'gold','Оформлять договоры'],['edit',I.edit,'sky','Изменять и переносить'],['del',I.trash,'warn','Удалять договоры'],['contacts',I.phone,'ink','Видеть контакты клиентов']];
let SHR={in:null,out:null,data:{},busy:{},at:0},XSID=null,DB0=null;
const isExt=a=>String(a||acct).startsWith('x:');
const extId=()=>isExt()?+acct.slice(2):null;
const cHref=id=>XSID?`#/xc/${XSID}/${id}`:'#/contract/'+id;
async function loadShares(){if(LOCAL||!me||me.role!=='owner')return;SHR.at=Date.now();try{const r=await api('GET','/api/shares');SHR.in=r.in;SHR.out=r.out}catch(e){SHR.in=SHR.in||[];SHR.out=SHR.out||[]}
  if(isExt()&&!SHR.in.some(x=>x.id===extId())){acct='all';try{localStorage.setItem('xf_acct','all')}catch(e){}}
  if(!$('#layer .ov')&&/^#\/?$|^#\/investor\/|^#\/xc\//.test(location.hash||'#/'))render()}
async function loadShareData(id,force){if(SHR.busy[id]||(!force&&SHR.data[id]&&Date.now()-SHR.data[id].at<15000))return;SHR.busy[id]=1;
  try{const d=await api('GET',`/api/shares/${id}/data`);d.at=Date.now();SHR.data[id]=d}catch(e){SHR.data[id]={error:e.message,at:Date.now()};if(/закрыт|удал/i.test(e.message))loadShares()}
  SHR.busy[id]=0;if(!$('#layer .ov')&&(/^#\/?$/.test(location.hash||'#/')||location.hash.startsWith('#/xc/'+id)))render()}
/* временно подставить данные внешнего инвестора вместо своих — для расчётов и отрисовки */
function withShare(sd,fn){const keep=db,ks=XSID;if(!XSID)DB0=keep;db={clients:sd.clients,contracts:sd.contracts,debts:[],investors:[{...sd.investor,isDefault:false}]};XSID=sd.id;
  try{return fn()}finally{db=keep;XSID=ks}}
const extName=x=>fio(x.investor).split(' ').slice(0,2).join(' ');
function extHead(sd){const p=sd.perms,c=sd.owner.company||sd.owner.name;
  return`<div class="card xhead"><div class="xh"><span class="xav">${esc(ini(sd.investor))}</span><div class="g"><small>Инвестор извне · ${esc(c)}</small><b>${esc(fio(sd.investor))}</b><span>Владелец: ${esc(sd.owner.name||c)}${sd.owner.phone?' · '+esc(sd.owner.phone):''}</span></div>
    ${sd.owner.phone?`<a class="x" href="https://wa.me/${waPhone(sd.owner.phone)}" target="_blank" rel="noopener" aria-label="Написать владельцу">${I.wa}</a>`:''}</div>
    <div class="xperm"><span class="xp on">${I.eye}Просмотр</span>${SHP.map(([k,ic,,l])=>`<span class="xp${p[k]?' on':''}">${p[k]?ic:I.x}${l}</span>`).join('')}</div>
    <div class="row-btns">${p.create?`<button class="btn primary sm" data-a="xNew" data-s="${sd.id}">${I.plus}Оформить договор</button>`:''}<button class="btn sm ghost" data-a="xLeave" data-s="${sd.id}">Отключиться</button></div></div>`}
function extContract(sid,cid){
  sid=+sid;const sd=SHR.data[sid];if(!sd){loadShareData(sid);return`<a class="back" href="#/">${I.back}Главная</a><div class="card pad muted small">Загрузка…</div>`}
  if(sd.error)return`<a class="back" href="#/">${I.back}Главная</a><div class="card">${empty(I.alert,'Нет доступа',esc(sd.error))}</div>`;
  if(Date.now()-sd.at>15000)loadShareData(sid);
  return withShare(sd,()=>{const c=db.contracts.find(x=>x.id===cid);if(!c)return`<a class="back" href="#/">${I.back}Главная</a>`+notFound();
    const k=calc(c),cl=client(c.clientId)||{last:'Клиент'},p=sd.perms;
    return`<a class="back" href="#/">${I.back}Главная</a>
    <div class="top"><div><h1>${esc(fio(cl))}</h1><div class="sub">Договор №${c.no} · ${esc(c.item)} · <span class="xtag">${I.chart}${esc(extName(sd))}</span></div></div>${chipC(k)}</div>
    <div class="card hero"><div class="l">${k.status==='done'?'Рассрочка выплачена':'Остаток по рассрочке'}</div><div class="v">${N(k.left,'xc'+c.id)}</div>
      <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
      <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>Оплачено ${money(k.paid)} из ${money(k.fin)}</span><span>${k.overdue?`<b style="color:var(--warn)">просрочено ${money(k.overdue)}</b>`:k.next?'платёж '+fdate(k.next.date):''}</span></div></div>
    ${p.pay||p.edit?`<div class="acts">${p.pay&&k.left>0?`<button class="card act" data-a="xPay" data-s="${sid}" data-id="${c.id}"><span>${I.check}</span>Принять платёж</button>`:''}${p.edit&&k.left>0?`<button class="card act w" data-a="xShift" data-s="${sid}" data-id="${c.id}"><span>${I.cal}</span>Перенести</button>`:''}</div>`:''}
    <h2>Условия</h2><div class="card facts"><div><span>Цена товара</span><b>${money(c.cost)}</b></div><div><span>Наценка</span><b>${money(c.markup)}</b></div><div><span>Первый взнос</span><b>${money(c.down)}</b></div><div><span>Срок</span><b>${c.months} мес.</b></div>
      <div><span>Платёж в месяц</span><b>${money(k.monthly)}</b></div><div><span>Прибыль инвестора</span><b>${money(k.invExp)}</b></div></div>
    <h2>Клиент</h2><div class="card crows"><div class="crow"><span class="ci">${I.users}</span><div class="cv"><small>ФИО</small><b>${esc(fio(cl))}</b></div></div>
      ${p.contacts?`<div class="crow"><span class="ci">${I.phone}</span><div class="cv"><small>Телефон</small><b class="num">${cl.phone?`<a href="tel:${esc(cl.phone)}">${esc(cl.phone)}</a>`:'—'}</b></div>${cl.phone?`<a class="x" href="https://wa.me/${waPhone(cl.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>`:''}</div>${cl.address?`<div class="crow"><span class="ci">${I.home}</span><div class="cv"><small>Адрес</small><b>${esc(cl.address)}</b></div></div>`:''}`
        :`<div class="crow"><span class="ci">${I.phone}</span><div class="cv"><small>Телефон</small><b class="muted">скрыт владельцем</b></div></div>`}</div>
    <h2>График платежей</h2><div class="card rows">${k.rows.map(r=>`<div class="rw ${r.st}"><div class="n">${r.st==='paid'?I.check:r.n}</div><div class="g"><b>${dmy(r.date)}</b><small>${r.st==='paid'?'Оплачен':r.st==='overdue'?'Просрочен':r.got?'Внесено '+money(r.got):'Ожидается'}</small></div><div class="am num">${money(r.amount)}</div></div>`).join('')}</div>
    <h2>Платежи</h2><div class="card rows">${c.payments.length?c.payments.slice().reverse().map(x=>`<div class="rw pay"><div class="n">${I.check}</div><div class="g"><b>${money(x.amount)}</b><small>${fdate(x.date)}${x.note?' · '+esc(x.note):''}${x.by?' · '+esc(x.by):''}</small></div></div>`).join(''):'<div class="pad muted small">Платежей пока нет.</div>'}</div>
    ${p.edit||p.del?`<div class="row-btns" style="margin-top:22px">${p.edit?`<button class="btn" data-a="xEdit" data-s="${sid}" data-id="${c.id}">Изменить</button>`:''}${p.del?`<button class="btn danger" data-a="xDel" data-s="${sid}" data-id="${c.id}">Удалить</button>`:''}</div>`:''}`});
}
function xContractForm(sd,c){
  const e=c||{clientId:sd.clients.length?'':'new',item:'',cost:'',markup:'',down:'',months:sd.investor.months||6,date:today(),first:addMonths(today(),1),note:''};
  const opts=sd.clients.slice().sort((a,b)=>fio(a).localeCompare(fio(b),'ru')).map(x=>`<option value="${x.id}"${x.id===e.clientId?' selected':''}>${esc(fio(x))}</option>`).join('');
  sheet(c?'Изменить договор':'Новый договор',`<div class="xsheet">${I.chart}<span>Инвестор <b>${esc(fio(sd.investor))}</b> · ${esc(sd.owner.company||sd.owner.name)}. Договор сохранится у владельца.</span></div>
  <label class="field"><span>Клиент</span><select name="clientId" onchange="document.getElementById('xnewcl').hidden=this.value!=='new'"><option value="" disabled${e.clientId?'':' selected'}>Выберите клиента</option>${opts}<option value="new"${e.clientId==='new'?' selected':''}>+ Новый клиент</option></select></label>
  <div id="xnewcl" ${e.clientId==='new'?'':'hidden'}>${fioFields({},'cfio')}${fld('Телефон','cphone','','inputmode="tel" placeholder="8 928 000-00-00"')}</div>
  ${fld('Товар','item',e.item,'placeholder="iPhone 16 Pro"')}<div class="g2">${mfld('Цена товара','cost',e.cost)}${mfld('Наценка','markup',e.markup)}</div>
  <div class="g2">${mfld('Первый взнос','down',e.down)}${fld('Срок, мес.','months',e.months,'inputmode="numeric"')}</div>
  <div class="g2">${fld('Дата договора','date',e.date,'type="date"')}${fld('Первый платёж','first',e.first,'type="date"')}</div>${fld('Заметка','note',e.note||'')}`,
  async f=>{const n=fioOf(f,'cfio');if(!f.clientId)return'Выберите клиента.';
    try{const r=await api('PUT',`/api/shares/${sd.id}/contract`,{id:c?c.id:undefined,clientId:f.clientId,client:f.clientId==='new'?{...n,phone:(f.cphone||'').trim()}:null,item:f.item,cost:num(f.cost),markup:num(f.markup),down:num(f.down),months:parseInt(f.months)||0,date:f.date,first:f.first,note:f.note});
      await loadShareData(sd.id,true);closeSheet();nav(`#/xc/${sd.id}/${r.id}`);toast(c?'Договор изменён':'Договор оформлен')}catch(x){return x.message}},c?'Сохранить':'Оформить')}
/* владелец: блок «Совместный доступ» на странице инвестора */
function shareBlock(i){
  if(LOCAL)return'';if(SHR.out&&Date.now()-SHR.at>10000)setTimeout(loadShares,0);if(!SHR.out){loadShares();return`<h2>Совместный доступ</h2><div class="card pad muted small">Загрузка…</div>`}
  const list=SHR.out.filter(s=>s.investorId===i.id);
  return`<h2>Совместный доступ</h2>
  <div class="card shc"><div class="shh"><span class="sic gold">${I.users}</span><span class="st"><b>Пользователи X-Finance</b><small>Видят договоры и прибыль этого инвестора у себя на главной. Права можно менять в любой момент.</small></span></div>
    ${list.map(s=>`<div class="shu"><div class="shr"><span class="xav sm">${esc(ini({last:(s.userName||s.name).split(' ')[0],first:(s.userName||s.name).split(' ')[1]||''}))}</span><span class="g"><b>${esc(s.userName||s.name)}</b><small>${esc(s.phone||'')}</small></span>
      <i class="schip ${s.status==='accepted'?'ok':'gold'}">${s.status==='accepted'?'Доступ открыт':'Ждёт ответа'}</i><button class="x" data-a="shOff" data-id="${s.id}" aria-label="Отключить" title="Отключить">${I.x}</button></div>
      <div class="shps"><span class="shp on lock">${I.eye}Просмотр</span>${SHP.map(([k,ic,t,l])=>`<button class="shp${s.perms[k]?' on':''}" data-a="shPerm" data-id="${s.id}" data-k="${k}">${s.perms[k]?ic:I.plus}${l}</button>`).join('')}</div></div>`).join('')}
    <div class="shf"><button class="btn primary" data-a="shInvite" data-id="${i.id}">${I.send}Пригласить пользователя</button></div></div>`;
}
function shInvite(i){
  sheet('Доступ к инвестору',`<div class="xsheet">${I.chart}<span>Инвестор <b>${esc(fio(i))}</b>. Пользователь получит запрос в уведомлениях и после согласия увидит этого инвестора у себя на главной.</span></div>
  ${fioFields({},'name')}${fld('Телефон пользователя','phone','','inputmode="tel" placeholder="8 928 000-00-00"')}
  <div class="field"><span>Что ему можно</span><div class="shpick"><label class="shpk on lock"><input type="checkbox" checked disabled><span>${I.eye}<b>Просмотр</b><small>договоры, платежи, прибыль</small></span></label>
    ${SHP.map(([k,ic,t,l])=>`<label class="shpk"><input type="checkbox" name="p_${k}"${k==='pay'?' checked':''}><span>${ic}<b>${l}</b></span></label>`).join('')}</div></div>
  <div class="note" style="margin:2px 2px 12px">Пользователь видит только договоры этого инвестора и их клиентов — ваши остальные данные ему не видны.</div>`,
  async f=>{const perms=Object.fromEntries(SHP.map(([k])=>[k,!!f['p_'+k]]));
    try{await api('POST','/api/shares',{investorId:i.id,name:f.name,phone:f.phone,perms});SHR.out=null;await loadShares();closeSheet();render();toast('Запрос отправлен')}catch(x){return x.message}},'Отправить запрос')}
/* ---------- главная: счёт — все, основной (свои деньги и личные долги) или конкретный инвестор ---------- */
let acct=lsGet('xf_acct')||'all';
const accOk=()=>{if(XSID)return acct;if(isExt()){if(SHR.in&&!SHR.in.some(x=>x.id===extId()))acct='all';return acct}if(acct!=='all'&&acct!=='main'&&!investor(acct))acct='all';return acct};
const accC=c=>{const a=accOk();if(XSID)return true;return a==='all'||(a==='main'?!(c.investorId&&investor(c.investorId)):c.investorId===a)};
const accD=()=>{if(XSID)return false;const a=accOk();return a==='all'||a==='main'};
function accCats(){
  const D=XSID&&DB0?DB0:db;if(!S.inst&&!(SHR.in||[]).length)return'';const a=accOk(),open=catOpen||a!=='all'||pinned('home');
  const act=c=>calc(c).status!=='done',dn=S.debt?D.debts.filter(d=>dcalc(d).left>0).length:0;
  const n={all:D.contracts.filter(act).length+dn,main:D.contracts.filter(c=>act(c)&&!(c.investorId&&D.investors.some(i=>i.id===c.investorId))).length+dn};
  const inv=D.investors.slice().sort((x,y)=>(y.isDefault|0)-(x.isDefault|0)||fio(x).localeCompare(fio(y),'ru'));
  const pill=(k,l,ic,cls,cnt,t)=>`<button class="cat acat${a===k?' on':''}" data-a="acc" data-t="${k}"><span class="xl ${cls}">${ic}</span><span>${esc(l)}</span><i></i><b class="${t}">${cnt}</b></button>`;
  return`<div class="cats acats${open?' open':''}" id="cats"><div class="catw"><div class="catr">${pill('all','Все',I.grid,'',n.all,'ok')}${pill('main','Основной счёт',I.cash,'own',n.main,'ok')}
    ${inv.map(i=>pill(i.id,fio(i).split(' ').slice(0,2).join(' '),`<em>${esc(ini(i))}</em>`,'inv',D.contracts.filter(c=>c.investorId===i.id&&act(c)).length,'gold')).join('')}
    ${(SHR.in||[]).map(x=>{const sd=SHR.data[x.id];if(!sd)setTimeout(()=>loadShareData(x.id),0);const n=sd&&!sd.error?withShare(sd,()=>db.contracts.filter(c=>calc(c).status!=='done').length):'·';return`<button class="cat acat ext${a==='x:'+x.id?' on':''}" data-a="acc" data-t="x:${x.id}" title="Инвестор извне · ${esc(x.company||x.ownerName)}"><span class="xl ext"><em>${esc(ini(x.investor))}</em></span><span>${esc(extName(x))}</span><i></i><b class="gold">${n}</b></button>`}).join('')}
    ${inv.length||(SHR.in||[]).length?'':`<button class="cat acat add" data-a="newInvestor"><span class="xl ghost">${I.plus}</span><span>Инвестор</span></button>`}</div></div></div>
  ${open?'':`<div class="pullhint" id="pullhint">${I.back}Потяните вниз — счета и инвесторы</div>`}`;
}
let htab=['pay','ops'].includes(lsGet('xf_htab'))?lsGet('xf_htab'):'dash',ptab=lsGet('xf_ptab')||'all',calM=today().slice(0,7),calD=today();
const addD=(s,n)=>{const d=new Date(s+'T12:00:00');d.setDate(d.getDate()+n);return iso(d)};
function payEvents(){
  const ev=[];
  if(S.inst||XSID)for(const c of db.contracts){if(!accC(c))continue;const k=calc(c);if(k.status==='done')continue;const cl=client(c.clientId)||{last:'Клиент'};
    for(const r of k.rows)if(r.st!=='paid')ev.push({date:r.date,amount:r.rest,who:fio(cl),ini:ini(cl),what:`${c.item} · №${c.no} · платёж ${r.n} из ${k.rows.length}`,href:cHref(c.id),kind:'inst',over:r.st==='overdue',btn:XSID?(SHR.data[XSID].perms.pay?`data-a="xPay" data-s="${XSID}" data-id="${c.id}" data-v="${r.rest}"`:''):`data-a="pay" data-id="${c.id}" data-v="${r.rest}"`})}
  if(S.debt&&accD())for(const d of db.debts){if(!d.due)continue;const k=dcalc(d);if(k.left<=0)continue;
    ev.push({date:d.due,amount:k.left,who:fio(d),ini:ini(d),what:d.type==='in'?'Срок возврата долга':'Мне вернуть долг',href:'#/debt/'+d.id,kind:d.type==='in'?'din':'dout',over:d.due<today(),btn:`data-a="op" data-k="pay" data-id="${d.id}"`})}
  return ev.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:b.amount-a.amount);
}
const PT=[['all','Все должники'],['today','Сегодня'],['tomorrow','Завтра'],['week','Неделя'],['month','Месяц'],['cal','Календарь']];
function payRange(){const t=today();
  if(ptab==='today')return[t,t,'на сегодня'];if(ptab==='tomorrow'){const z=addD(t,1);return[z,z,'на завтра']}
  if(ptab==='week')return[t,addD(t,6),'на 7 дней'];if(ptab==='month'){const[y,m]=t.split('-').map(Number);return[t,iso(new Date(y,m,0)),'до конца месяца']}
  return[calD,calD,dlong(calD)]}
const relDay=s=>{const t=today();return s===t?'Сегодня':s===addD(t,1)?'Завтра':s===addD(t,-1)?'Вчера':fdate(s)};
function payRow(e){const inn=e.kind!=='dout';
  return`<div class="prw${e.over?' over':''}"><a class="pav ${e.kind}" href="${e.href}">${esc(e.ini)}</a><a class="g" href="${e.href}"><b>${esc(e.who)}</b><small>${esc(e.what)}</small><small class="pd">${e.over?`Просрочен с ${fdate(e.date)}`:relDay(e.date)}</small></a>
    <div class="pam"><b class="num ${inn?'':'out'}">${inn?'':'−'}${money(e.amount)}</b>${inn?(e.btn?`<button class="btn sm take" ${e.btn}>${I.check}Принять</button>`:''):`<button class="btn sm" ${e.btn}>Отдать</button>`}</div></div>`}
function payGroups(list){let last='',h='';for(const e of list){if(e.date!==last){last=e.date;h+=`<div class="pgd">${relDay(e.date)}${e.date===today()||e.date===addD(today(),1)?' · '+fdate(e.date):''}</div>`}h+=payRow(e)}return h}
function calGrid(ev){
  const[y,m]=calM.split('-').map(Number),first=new Date(y,m-1,1),start=(first.getDay()+6)%7,dim=new Date(y,m,0).getDate(),t=today(),by={};
  for(const e of ev)if(e.date.startsWith(calM)){const x=by[e.date]=by[e.date]||{n:0,s:0,o:0,over:0};x.n++;if(e.kind==='dout')x.o+=e.amount;else x.s+=e.amount;if(e.over)x.over=1}
  const cm=v=>v>=1e6?(v/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})+' млн':Math.round(v).toLocaleString('ru-RU'),mt=sumBy(Object.values(by),x=>x.s),mo=sumBy(Object.values(by),x=>x.o);
  let cells='';for(let i=0;i<start;i++)cells+='<span></span>';
  for(let dd=1;dd<=dim;dd++){const ds=`${calM}-${String(dd).padStart(2,'0')}`,x=by[ds];
    cells+=`<button class="cd${ds===t?' td':''}${ds===calD?' on':''}${x?' has':''}${x&&x.over?' odue':''}${x&&!x.s?' onlyout':''}" data-a="calDay" data-d="${ds}"${x?` aria-label="${dd}: ${x.s?money(x.s):'−'+money(x.o)}"`:''}><span>${dd}</span>${x?`<em>${x.s?cm(x.s):'−'+cm(x.o)}</em>`:''}</button>`}
  return`<div class="card cal"><div class="calh"><button class="x" data-a="calMon" data-v="-1" aria-label="Предыдущий месяц">${I.back}</button><b>${MONF[m-1]} ${y}</b><button class="x nx" data-a="calMon" data-v="1" aria-label="Следующий месяц">${I.back}</button></div>
    <div class="calw">${['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w=>`<span>${w}</span>`).join('')}</div><div class="calg">${cells}</div>
    <div class="calt"><span>Ожидается за месяц</span><b class="num">${money(mt)}</b></div>${mo?`<div class="calt out"><span>Мне отдать за месяц</span><b class="num">${money(mo)}</b></div>`:''}
    <div class="calf"><span><i class="dt ok"></i>платежи</span><span><i class="dt od"></i>просрочка</span><button class="btn sm soft" data-a="calToday">Сегодня</button></div></div>`}
function debtors(){
  const m=new Map(),get=(id,o)=>{if(!m.has(id))m.set(id,{id,who:fio(o),ini:ini(o),phone:o.phone||'',href:'#/client/'+id,left:0,over:0,days:0,inst:0,debts:0,next:null,out:0});return m.get(id)};
  if(S.inst||XSID)for(const c of db.contracts){if(!accC(c))continue;const k=calc(c);if(k.left<=0)continue;const cl=db.clients.find(x=>x.id===c.clientId)||{last:'Без клиента'},x=get(c.clientId||'c'+c.id,cl);if(XSID)x.href=cHref(c.id);
    x.inst++;x.left+=k.left;x.over+=k.overdue;x.days=Math.max(x.days,k.days||0);if(k.next&&(!x.next||k.next.date<x.next.date))x.next={date:k.next.date,amount:k.next.rest}}
  if(S.debt&&accD())for(const d of db.debts){const k=dcalc(d);if(k.left<=0)continue;const cl=db.clients.find(x=>x.id===d.contactId)||d,x=get(d.contactId||'d'+d.id,cl);
    if(!d.contactId)x.href='#/debt/'+d.id;
    if(d.type==='out'){x.out+=k.left;continue}x.debts++;x.left+=k.left;if(k.status==='overdue'){x.over+=k.left;x.days=Math.max(x.days,d.due?days(d.due,today()):0)}
    if(d.due&&(!x.next||d.due<x.next.date))x.next={date:d.due,amount:k.left}}
  return[...m.values()];
}
function debtorRow(x,out){const n=[x.inst?plural(x.inst,['рассрочка','рассрочки','рассрочек']):'',x.debts?plural(x.debts,['долг','долга','долгов']):''].filter(Boolean).join(' · ');
  return`<a class="prw drw${x.over&&!out?' over':''}" href="${x.href}"><span class="pav ${out?'dout':x.over?'':'inst'}">${esc(x.ini)}</span><span class="g"><b>${esc(x.who)}</b><small>${out?'Я должен':n}${x.phone?' · '+esc(x.phone):''}</small>
    <small class="pd">${out?'':x.over?`Просрочено ${money(x.over)}${x.days?' · '+pdays(x.days):''}`:x.next?`Следующий платёж ${relDay(x.next.date).toLowerCase()} · ${money(x.next.amount)}`:'Без срока'}</small></span>
    <span class="pam"><b class="num ${out?'out':''}">${out?'−'+money(x.out):money(x.left)}</b><span class="dgo">${I.back}</span></span></a>`}
function debtorsView(){
  const all=debtors(),list=all.filter(x=>x.left>0).sort((a,b)=>(b.over>0)-(a.over>0)||b.days-a.days||(((a.next&&a.next.date)||'9')<((b.next&&b.next.date)||'9')?-1:((a.next&&a.next.date)||'9')>((b.next&&b.next.date)||'9')?1:b.left-a.left)),mine=all.filter(x=>x.out>0);
  const tot=sumBy(list,x=>x.left),ov=list.filter(x=>x.over>0);
  const sum=`<div class="card ptot"><div><small>Вам должны</small><div class="v">${N(tot,'ps-all',1)}</div><span>${list.length?plural(list.length,['должник','должника','должников']):'Должников нет'}${mine.length?` · я должен ${money(sumBy(mine,x=>x.out))}`:''}</span></div>${ov.length?`<div class="pso"><small>Просрочено</small><b class="num">${money(sumBy(ov,x=>x.over))}</b><span>${plural(ov.length,['человек','человека','человек'])}</span></div>`:''}</div>`;
  const body=list.length?`<div class="card plist">${list.map(x=>debtorRow(x)).join('')}</div>`:`<div class="card">${empty(I.users,'Должников нет','Здесь будут все, у кого есть рассрочка или долг: сколько должен, просрочка и ближайший платёж.')}</div>`;
  return sum+`<div class="pcols"><div>${body}</div>${mine.length?`<div><h2>Я должен</h2><div class="card plist">${mine.map(x=>debtorRow(x,1)).join('')}</div></div>`:''}</div>`;
}
function paysView(){
  const ev=payEvents(),t=today(),[a,b,label]=payRange();
  const over=ev.filter(e=>e.over),list=ev.filter(e=>e.date>=a&&e.date<=b&&(ptab==='cal'||!e.over)),inc=sumBy(list.filter(e=>e.kind!=='dout'),e=>e.amount),out=sumBy(list.filter(e=>e.kind==='dout'),e=>e.amount);
  const chips=`<div class="pchips">${PT.map(([k,l])=>{if(k==='all'){const n=debtors().filter(x=>x.left>0).length;return`<button class="pch${ptab===k?' on':''}" data-a="ptab" data-t="all">${I.users}${l}${n?`<em>${n}</em>`:''}</button>`}const[x,y]=k==='cal'?[0,0]:(()=>{const o=ptab;ptab=k;const r=payRange();ptab=o;return r})();const n=k==='cal'?0:ev.filter(e=>!e.over&&e.date>=x&&e.date<=y).length;
    return`<button class="pch${ptab===k?' on':''}" data-a="ptab" data-t="${k}">${k==='cal'?I.cal:''}${l}${n?`<em>${n}</em>`:''}</button>`}).join('')}</div>`;
  const sum=`<div class="card ptot"><div><small>Ожидается ${esc(label)}</small><div class="v">${N(inc,'ps-'+ptab+(ptab==='cal'?calD:''),1)}</div><span>${list.length?plural(list.length,['платёж','платежа','платежей']):'Платежей нет'}${out?` · мне отдать ${money(out)}`:''}</span></div>${over.length?`<div class="pso"><small>Просрочено</small><b class="num">${money(sumBy(over.filter(e=>e.kind!=='dout'),e=>e.amount))}</b><span>${plural(over.length,['платёж','платежа','платежей'])}</span></div>`:''}</div>`;
  const body=list.length?`<div class="card plist">${payGroups(list)}</div>`:`<div class="card">${empty(I.cal,ptab==='cal'?'В этот день платежей нет':'Платежей нет','Здесь появятся платежи по графикам рассрочки и сроки возврата долгов.')}</div>`;
  const overB=over.length?`<h2>Просрочено</h2><div class="card plist">${over.map(payRow).join('')}</div>`:'';
  if(ptab==='all')return`<div class="pays">${chips}${debtorsView()}</div>`;
  return`<div class="pays">${chips}${ptab==='cal'?`<div class="pcal">${calGrid(ev)}<div>${sum}${body}</div></div>${overB}`:`${sum}<div class="pcols"><div>${body}</div>${over.length?`<div>${overB}</div>`:''}</div>`}</div>`;
}
function home(){
  if(!LOCAL&&SHR.in==null)setTimeout(loadShares,0);
  if(isExt()&&!XSID){const id=extId(),sd=SHR.data[id];
    if(!sd||sd.error){if(!sd)loadShareData(id);const d=new Date();return`<div class="top"><div><h1>${esc(me.company||'X-Finance')}</h1><div class="sub">Инвестор извне · ${d.getDate()} ${MON[d.getMonth()]}</div></div></div>${accCats()}<div class="card${sd?'':' pad muted small'}">${sd?empty(I.alert,'Нет доступа',esc(sd.error)):'Загрузка данных инвестора…'}</div>`}
    if(Date.now()-sd.at>15000)loadShareData(id);
    return withShare(sd,home)}
  const ks=S.inst||XSID?db.contracts.filter(accC).map(c=>({c,k:calc(c)})):[],ds=S.debt&&accD()?db.debts.map(d=>({d,k:dcalc(d)})):[],t=today(),ai=XSID?db.investors[0]:acct!=='all'&&acct!=='main'?investor(acct):null,sd=XSID?SHR.data[XSID]:null,hx=o=>XSID?{...o,href:null,a:null,t:null}:o,ym=t.slice(0,7),mon=MONF[new Date().getMonth()];
  const act=ks.filter(x=>x.k.status!=='done');
  const recv=sumBy(ks,x=>x.k.left),din=sumBy(ds.filter(x=>x.d.type==='in'),x=>x.k.left),dout=sumBy(ds.filter(x=>x.d.type==='out'),x=>x.k.left);
  const dover=ds.filter(x=>x.d.type==='in'&&x.k.status==='overdue'),over=sumBy(ks,x=>x.k.overdue),dov=sumBy(dover,x=>x.k.left);
  const exp=sumBy(ks,x=>sumBy(x.k.rows.filter(r=>r.date.slice(0,7)===ym),r=>r.rest));
  const got=sumBy(ks,x=>sumBy(x.c.payments.filter(p=>p.date.slice(0,7)===ym),p=>p.amount));
  const dgot=sumBy(ds.filter(x=>x.d.type==='in'),x=>sumBy(x.d.ops.filter(o=>o.kind==='pay'&&o.date.slice(0,7)===ym),o=>o.amount));
  const overdue=ks.filter(x=>x.k.status==='overdue').sort((a,b)=>b.k.days-a.k.days),lim=iso(new Date(Date.now()+14*864e5));
  const soon=ks.filter(x=>x.k.status==='active'&&x.k.next.date<=lim).sort((a,b)=>a.k.next.date<b.k.next.date?-1:1),d=new Date();
  const title=S.inst&&S.debt?'Рассрочка и долги':S.inst?'Исламская рассрочка':'Учёт долгов';
  const pc=payEvents().filter(e=>e.date<=t).length,opn=LOCAL||XSID?0:OB.filter(e=>e.st!=='ok'&&e.t!=='log').length;
  let h=`<div class="top"><div><h1>${esc(me.company||'X-Finance')}</h1><div class="sub">${XSID?'Инвестор извне · '+esc(sd.owner.company||sd.owner.name):ai?'Инвестор · '+esc(fio(ai)):acct==='main'?'Основной счёт':title} · ${d.getDate()} ${MON[d.getMonth()]}</div></div></div>${accCats()}${instBanner()}
  <div class="htabs" role="tablist"><i class="hthumb${htab==='pay'?' r':htab==='ops'?' m':''}"></i><button class="${htab==='dash'?'on':''}" data-a="htab" data-t="dash" role="tab">${I.grid}<span>Дашборд</span></button><button class="${htab==='ops'?'on':''}" data-a="htab" data-t="ops" role="tab">${I.list}<span class="hl">Все операции</span><span class="hs">Операции</span>${opn?`<em class="up">${opn}</em>`:''}</button><button class="${htab==='pay'?'on':''}" data-a="htab" data-t="pay" role="tab">${I.cal}<span>Платежи</span>${pc?`<em>${pc}</em>`:''}</button></div>`;
  if(XSID)h+=extHead(sd);
  if(htab==='pay')return h+`<div id="hbody" class="hbody">${paysView()}</div>`;
  if(htab==='ops')return h+`<div id="hbody" class="hbody">${homeOps()}</div>`;
  h+=`<div id="hbody" class="hbody"><div class="home"><div>
  ${me.tariff&&me.tariff.status==='expired'?`<a class="card tbanner" href="#/tariff">${I.cal}<div><b>Тариф закончился</b><span>Продлите тариф, чтобы продолжить работу</span></div>${I.back}</a>`:''}
  <div class="kpis" style="margin-top:0">`;
  if(S.inst||XSID)h+=kpi(I.cash,'gold','Долг клиентов',recv,'k-recv',hx({href:'#/contracts',a:'tab',t:'active'}))+
    kpi(I.alert,'warn'+(over?' hot':''),'Просрочено',over,'k-over',hx({href:'#/contracts',a:'tab',t:'overdue'}))+
    kpi(I.card,'sky','В обороте',sumBy(act,x=>x.c.cost),'k-turn',{sub:'активные договоры'})+
    kpi(I.rub,'ok','Собрано',sumBy(ks,x=>x.k.paid),'k-coll',{sub:'без первых взносов'})+
    kpi(I.box,'ink','Закуп',sumBy(ks,x=>x.c.cost),'k-cost')+
    kpi(I.box,'sky solid','Продажи',sumBy(ks,x=>x.k.total),'k-sale')+
    kpi(I.chart,'gold','Ожидаемая прибыль',sumBy(ks,x=>x.c.markup),'k-pexp',{sub:'наценка по договорам'})+
    kpi(I.check,'ok','Полученная прибыль',sumBy(ks,x=>x.k.total>0?Math.round(x.c.markup*Math.min(1,(x.k.paid+(+x.c.down||0))/x.k.total)):0),'k-pgot',{sub:'с оплаченной части'})+
    kpi(I.cal,'gold','Ожидаемые платежи',exp,'k-exp',hx({a:'monthExp',sub:mon}))+
    kpi(I.check,'ok','Получено платежей',got,'k-got',hx({a:'monthGot',sub:mon}));
  if(ai)h+=kpi(I.chart,'gold','Прибыль инвестора',sumBy(ks,x=>x.k.invExp),'k-iexp',hx({href:'#/investor/'+ai.id,sub:'ожидается · доля '+nf.format(ai.pct)+'%'}))+
    kpi(I.check,'ok','Прибыль получена',sumBy(ks,x=>x.k.invGot),'k-igot',hx({href:'#/investor/'+ai.id,sub:'по оплаченным платежам'}));
  if(S.debt&&accD()){const dmv=sumBy(ds.filter(x=>x.d.type==='in'&&(x.d.moves||[]).length&&x.k.left>0),x=>x.k.left);
    if(S.inst||XSID)h+=`</div><div class="ksep"><span>Долги</span></div><div class="kpis kdebt">`;
    h+=kpi(I.coin,'gold','Мне должны',din,'k-din',{href:'#/debts',a:'dtab',t:'in',sub:'личные долги'})+
    kpi(I.coin,'ink','Я должен',dout,'k-dout',{href:'#/debts',a:'dtab',t:'out'})+
    kpi(I.cal,'sky','Перенесённый долг',dmv,'k-dmv',{href:'#/debts',a:'dtab',t:'in',sub:'срок возврата сдвинут'})+
    kpi(I.alert,'warn'+(dov?' hot':''),'Просроченный долг',dov,'k-dov',{href:'#/debts',a:'dtab',t:'in',sub:dover.length?plural(dover.length,['должник','должника','должников']):'просрочек нет'})}
  h+=`</div></div><div>`;
  if(!db.contracts.length&&!db.debts.length&&!XSID)h+=`<div class="card" style="margin-top:10px">${empty(I.doc,'Начнём?','Добавьте первый договор или долг: остатки, графики и просрочки приложение посчитает само.')}</div>`;
  else if(!ks.length&&!ds.length&&!XSID)h+=`<div class="card" style="margin-top:10px">${empty(I.chart,ai?'У инвестора пока нет договоров':'На основном счёте пока пусто',ai?'Выберите этого инвестора при оформлении договора — его данные появятся здесь.':'Договоры без инвестора и личные долги будут считаться здесь.')}</div>`;
  if(XSID)h+=`<section class="hsec"><h2>Договоры инвестора</h2>${ks.length?`<div class="list">${ks.slice().sort((a,b)=>(a.k.status==='done')-(b.k.status==='done')||b.c.no-a.c.no).map(x=>cCard(x.c,x.k)).join('')}</div>`:`<div class="card">${empty(I.doc,'Договоров пока нет',sd.perms.create?'Нажмите «Оформить договор» — он сохранится у владельца.':'')}</div>`}</section>`;
  return h+'</div></div></div>';
}
const CK={inst:[['all','Все','ok'],['active','Активные','ok'],['overdue','Просроченные','warn'],['moved','Перенесённые','gold'],['done','Завершённые','ink']],
  cl:[['x','X-контакты','ok'],['all','Все','ok'],['debtors','Должники','gold'],['overdue','Просроченные','warn'],['moved','Перенесённые','gold'],['black','Чёрный список','warn'],['deleted','Удалённые','ink']]};
function catsHtml(kind,counts,cur){const open=catOpen||pinned(kind==='inst'?'contracts':'clients');
  return`<div class="cats${open?' open':''}" id="cats"><div class="catw"><div class="catr">${CK[kind].map(([k,l,t])=>`<button class="cat${cur===k?' on':''}${k==='x'?' xcat':''}" data-a="cat" data-k="${kind}" data-t="${k}">${k==='x'?`<span class="xl">${I.xmark}</span>`:''}<span>${l}</span><i></i><b class="${t}">${counts[k]||0}</b>${k==='x'&&XC.unread?`<em class="xu">${XC.unread}</em>`:''}</button>`).join('')}</div></div></div>
  ${open?'':`<div class="pullhint" id="pullhint">${I.back}Потяните вниз — категории</div>`}`;
}
const CF={all:()=>1,active:x=>x.k.status!=='done',overdue:x=>x.k.status==='overdue',moved:x=>(x.c.shifts||[]).length&&x.k.status!=='done',done:x=>x.k.status==='done'};
function contractsList(){
  const s=q.trim().toLowerCase();
  const ks=db.contracts.map(c=>({c,k:calc(c)})).filter(x=>!s||(fio(client(x.c.clientId))+' '+x.c.item+' '+x.c.no).toLowerCase().includes(s));
  const list=ks.filter(CF[ctab]).sort((a,b)=>ctab==='done'?(b.c.no-a.c.no):((a.k.status==='done')-(b.k.status==='done'))||(b.k.days-a.k.days)||((a.k.next?.date||'')<(b.k.next?.date||'')?-1:1));
  const txt={all:'Договоров пока нет',active:'Активных договоров нет',overdue:'Просрочек нет. Альхамдулиллях!',moved:'Перенесённых договоров нет',done:'Завершённых договоров пока нет'}[ctab];
  return list.length?`<div class="list grid">${list.map(x=>cCard(x.c,x.k)).join('')}</div>`:`<div class="card">${empty(I.doc,s?'Ничего не найдено':txt)}</div>`;
}
function contractCats(){const ks=db.contracts.map(c=>({c,k:calc(c)})),n={};for(const k in CF)n[k]=ks.filter(CF[k]).length;return catsHtml('inst',n,ctab)}
const contracts=()=>`<div class="top"><h1>Договоры</h1><div class="row-btns" style="flex-wrap:nowrap"><button class="btn primary only-desk" data-a="newContract">${I.plus}Договор</button></div></div>${contractCats()}
  <input class="search" id="q" placeholder="Поиск по клиенту или товару" value="${esc(q)}"><div id="list">${contractsList()}</div>`;
const kv=(l,v,cls='')=>`<div class="kv"><span>${l}</span><b class="num ${cls}">${v}</b></div>`;
/* заявки «клиент сообщил об оплате» — у владельца на странице долга/договора */
function propBox(itemId){
  const ps=PROPS.filter(p=>p.itemId===itemId);if(!ps.length)return'';
  return`<div class="props">${ps.map(p=>`<div class="card prop" data-prop="${p.id}"><span class="ci">${I.card}</span>
    <div class="g"><b>${esc(p.who||'Клиент')} сообщил об оплате</b><div class="pv num">${money(p.amount)}</div><small>${fdate(p.date)}${p.note?' · '+esc(p.note):''}</small></div>
    <div class="pa"><button class="btn sm primary" data-a="propAcc" data-id="${p.id}">${I.check}Принять</button><button class="btn sm" data-a="propDec" data-id="${p.id}">Отклонить</button></div></div>`).join('')}</div>`;
}
function contract(id){
  const c=db.contracts.find(x=>x.id===id);if(!c)return notFound();
  const k=calc(c),cl=client(c.clientId),iv=investor(c.investorId),t=today(),paidRows=k.rows.filter(r=>r.st==='paid').length;
  return`<a class="back" href="#/contracts">${I.back}Договоры</a>
  <div class="top"><div><h1>${esc(c.item)}</h1><div class="sub">Договор №${c.no} от ${dmy(c.date)}</div></div>${chipC(k)}</div>
  ${propBox(c.id)}<div class="card hero"><div class="l">${k.status==='done'?'Выплачено полностью':'Остаток долга'}</div>
    <div class="v">${N(k.status==='done'?k.total:k.left,'c'+c.id)}</div>
    ${k.overdue?`<div class="s" style="color:var(--warn)">Из них просрочено ${money(k.overdue)} · ${pdays(k.days)}</div>`:''}
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>Оплачено ${money(k.paid)}</span><span>${Math.round(k.pct)}% из ${money(k.fin)}</span></div></div>
  ${k.status!=='done'?`<div class="row-btns" style="margin-top:12px"><button class="btn primary" data-a="pay" data-id="${c.id}">${I.check}Принять платёж</button><button class="btn soft" data-a="waC" data-id="${c.id}">${I.wa}Напомнить</button></div>
  <button class="btn block" style="margin-top:10px" data-a="shift" data-id="${c.id}">${I.cal}Перенести график</button>`:''}
  <div class="card kvs" style="margin-top:12px">
    ${kv('Первый платёж',dmy(c.first))}${kv('Цена закупа',money(c.cost))}
    ${kv('Наценка',money(c.markup)+(c.cost?` <i>${nf.format(Math.round(c.markup/c.cost*1000)/10)}%</i>`:''))}
    ${kv('Цена в рассрочку',money(k.total))}${c.down?kv('Первый взнос',money(c.down)):''}${kv('Срок',c.months+' мес.')}
    ${kv('Ежемесячный платёж',money(k.monthly),'c-acc')}${kv('Остаток долга',money(k.left),'c-gold')}${kv('Оплачено клиентом',money(k.paid),'c-ok')}
    ${c.guarantor?kv('Поручитель',esc(c.guarantor)):''}
    ${(c.shifts||[]).length?kv('Перенос графика',`${plural(c.shifts.length,['раз','раза','раз'])}, +${sumBy(c.shifts,z=>z.months)} мес.`,'c-gold'):''}
    <div class="ptiles"><div class="pt ok"><span>Прибыль общая</span><b class="num">${money(c.markup)}</b></div><div class="pt sky"><span>Прибыль в месяц</span><b class="num">~${money(Math.round(c.markup/Math.max(1,c.months)))}</b></div></div>
  </div>
  ${c.note?`<div class="card pad small" style="margin-top:10px">${esc(c.note)}</div>`:''}
  <button class="btn block soft dbtn" style="margin-top:10px" data-a="docImg" data-k="c" data-id="${c.id}">${I.file}Документ А4 (картинка)</button>
  <h2>Клиент</h2>
  <a class="card item with-ava" href="#/client/${c.clientId}"><div class="ava">${esc(ini(cl))}</div><div><div class="t">${esc(fio(cl))}</div><div class="s">${esc(cl.phone||'Телефон не указан')}</div></div></a>
  ${iv?`<h2>Инвестор</h2><a class="card item with-ava" href="#/investor/${iv.id}"><div class="ava" style="background:var(--gold-soft);color:var(--gold)">${esc(ini(iv))}</div><div><div class="t">${esc(fio(iv))}</div>
    <div class="s">Доля ${nf.format(+c.invPct||0)}% · инвестору ${money(k.invExp)} · компании ${money(k.compExp)}</div></div></a>`:''}
  <div class="card sched" style="margin-top:22px"><div class="sh ok"><b>История поступлений</b><span class="cnt">${c.payments.length}</span></div>
  ${c.payments.length?c.payments.slice().reverse().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0).map(p=>`<div class="rw pay${p.id===flashId?' flash':''}" data-row="${p.id}"><div class="n">${I.check}</div><div class="g"><b class="num">${money(p.amount)}</b><small>${dmy(p.date)}${p.note?' · '+esc(p.note):''}</small></div><button class="x" data-a="delPay" data-id="${c.id}" data-p="${p.id}" aria-label="Удалить платёж">${I.x}</button></div>`).join(''):'<div class="none">Нет поступлений</div>'}</div>
  <div class="card sched" style="margin-top:12px"><div class="sh"><b>График платежей</b><span class="cnt">${paidRows}/${k.rows.length}</span></div>
  ${k.rows.length?`<div class="tr th"><span>Дата</span><span>Осталось</span><span>Действие</span></div>`+k.rows.map(r=>`<div class="tr ${r.st}"><span>${dmy(r.date)}${r.st==='overdue'?`<small>просрочен ${pdays(days(r.date,t))}</small>`:r.got&&r.rest?`<small>внесено ${money(r.got)}</small>`:''}</span>
    <b class="num">${money(r.st==='paid'?r.amount:r.rest)}</b><span>${r.st==='paid'?`<span class="chip ok">${I.check}Оплачен</span>`:`<button class="btn sm take" data-a="pay" data-id="${c.id}" data-v="${r.rest}">Принять</button>`}</span></div>`).join(''):'<div class="none">Оплачено первым взносом</div>'}</div>
  ${linkCard(c,'клиента')}
  <div class="row-btns" style="margin-top:22px"><button class="btn" data-a="editContract" data-id="${c.id}">Изменить</button><button class="btn danger" data-a="delContract" data-id="${c.id}">Удалить</button></div>`;
}
const alive=()=>db.clients.filter(c=>!c.deleted);
/* индекс «клиент → договоры/долги» на текущую версию данных: списки контактов без перебора всех договоров для каждого */
let CIX={v:-1,db:null};
function cIdx(){if(CIX.v===DV&&CIX.db===db)return CIX;const c=new Map(),d=new Map(),inf=new Map();
  const cl=new Map();for(const x of db.clients)cl.set(x.id,x);
  for(const x of db.contracts){const a=c.get(x.clientId);a?a.push(x):c.set(x.clientId,[x])}
  for(const x of db.debts){const a=d.get(x.contactId);a?a.push(x):d.set(x.contactId,[x])}
  return CIX={v:DV,db,c,d,inf,cl}}
const cOf=id=>cIdx().c.get(id)||[],dOf=id=>cIdx().d.get(id)||[];
function clientInfo(c){const X=cIdx(),h=X.inf.get(c.id);if(h)return h;const r=clientInfoRaw(c);X.inf.set(c.id,r);return r}
function clientInfoRaw(c){
  const cs=cOf(c.id),ks=cs.map(calc),ds=dOf(c.id).filter(x=>x.type==='in').map(dcalc);
  return{left:sumBy(ks,k=>k.left)+sumBy(ds,k=>k.left),over:sumBy(ks,k=>k.overdue)+sumBy(ds.filter(k=>k.status==='overdue'),k=>k.left),moved:cs.some((x,i)=>(x.shifts||[]).length&&ks[i].status!=='done')};
}
const KF={all:c=>!c.deleted,debtors:(c,i)=>!c.deleted&&i.left>0,overdue:(c,i)=>!c.deleted&&i.over>0,moved:(c,i)=>!c.deleted&&i.moved,black:c=>!c.deleted&&c.black,deleted:c=>c.deleted};
function clientCats(){const xs=db.clients.map(c=>[c,clientInfo(c)]),n={};for(const k in KF)n[k]=xs.filter(([c,i])=>KF[k](c,i)).length;n.x=XC.list?XC.list.length:linked.size;if(!XC.list&&!LOCAL)fetchX();return catsHtml('cl',n,ktab)}
function clientsList(){
  if(ktab==='x')return xList();
  const s=q.trim().toLowerCase();
  const list=db.clients.filter(c=>KF[ktab](c,clientInfo(c))&&(!s||(fio(c)+' '+c.phone+' '+(c.phone2||'')+' '+(c.address||'')).toLowerCase().includes(s))).sort((a,b)=>fio(a).localeCompare(fio(b),'ru'));
  if(!list.length)return`<div class="card">${empty(I.users,s?'Ничего не найдено':ktab==='all'?'Контактов пока нет':'В этой категории пусто',s||ktab!=='all'?'':'Добавьте клиентов, должников и поручителей: телефоны, адрес и фото документов будут под рукой.',s||ktab!=='all'?'':'<button class="btn primary" data-a="newClient">Добавить контакт</button>')}</div>`;
  return`<div class="list grid">${list.map(c=>{
    const ks=S.inst?cOf(c.id).map(calc):[],ds=S.debt?dOf(c.id).filter(x=>x.type==='in').map(dcalc):[];
    const left=sumBy(ks,k=>k.left)+sumBy(ds,k=>k.left),over=sumBy(ks,k=>k.overdue)+sumBy(ds.filter(k=>k.status==='overdue'),k=>k.left);
    const tags=[ks.length?plural(ks.length,['договор','договора','договоров']):'',ds.length?plural(ds.length,['долг','долга','долгов']):'',(c.files||[]).length?`${c.files.length} фото`:''].filter(Boolean).join(' · ');
    return`<a class="card item with-ava${c.black?' black':''}${c.deleted?' gone':''}" href="#/client/${c.id}">${avaHtml(c)}<div><div class="h"><div class="t">${esc(fio(c))}</div><div class="a num">${left?money(left):''}</div></div>
    <div class="s">${esc(c.phone||'Телефон не указан')}${linked.has(c.id)?' · <span style="color:var(--accent)">в X-Finance</span>':''}</div>
    ${c.deleted?`<div class="f" style="margin-top:6px"><span class="chip">Удалён ${dmy(c.deleted)}</span><span></span></div>`:c.black||over||left||tags?`<div class="f" style="margin-top:6px">${c.black?`<span class="chip warn">${I.ban}Чёрный список</span>`:over?`<span class="chip warn">Просрочено ${money(over)}</span>`:left?'<span class="chip ok">Платит вовремя</span>':'<span></span>'}<span>${tags}</span></div>`:''}</div></a>`}).join('')}</div>`;
}
const clients=()=>`<div class="top"><div><h1>Контакты</h1><div class="sub">${plural(alive().length,['контакт','контакта','контактов'])}</div></div><button class="btn primary only-desk" data-a="newClient">${I.plus}Контакт</button></div>${clientCats()}
  <input class="search" id="q" placeholder="Поиск по имени, телефону, адресу" value="${esc(q)}"><div id="list">${clientsList()}</div>`;
function avaHtml(c,cls='ava',style=''){
  const f=c.mainPhoto&&(c.files||[]).find(x=>x.id===c.mainPhoto&&x.type!=='application/pdf');
  return f?`<div class="${cls} ph"${style}><img src="${fileUrl(f)}" alt="" loading="lazy" decoding="async"></div>`:`<div class="${cls}${c.black?' bad':''}"${style}>${esc(ini(c))}</div>`;
}
/* график по долгу: все операции с остатком после каждой и срок возврата */
function debtSchedule(d,k){
  let bal=0;const ops=d.ops.slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0)).map(o=>{bal=r2(bal+(o.kind==='add'?o.amount:-o.amount));return{...o,bal}});
  const t=today();
  return`<div class="gsch"><div class="gh"><span>Дата</span><span>Операция</span><span>Остаток</span></div>
    ${ops.map(o=>`<div class="gr ${o.kind}"><span>${dmy(o.date)}</span><b class="num">${o.kind==='add'?'+':'−'}${money(o.amount)}</b><span class="num">${money(Math.max(0,o.bal))}</span></div>`).join('')}
    ${d.due?`<div class="gr ddue${k.status==='overdue'?' over':k.status==='done'?' ok':''}"><span>${dmy(d.due)}</span><b>${k.status==='done'?'Закрыт':k.status==='overdue'?'Срок прошёл · '+pdays(days(d.due,t)):'Срок возврата'}</b><span class="num">${money(k.left)}</span></div>`:''}</div>`;
}
function contractSchedule(c,k){
  return`<div class="gsch"><div class="gh"><span>Дата</span><span>Платёж</span><span>Статус</span></div>
    ${k.rows.map(r=>`<div class="gr ${r.st}"><span>${dmy(r.date)}</span><b class="num">${money(r.st==='paid'?r.amount:r.rest)}</b>
      <span>${r.st==='paid'?`<i class="gs ok">${I.check}Оплачен</i>`:r===k.next||r.st==='overdue'&&r===k.rows.find(x=>x.st==='overdue')?`<button class="gs take" data-a="pay" data-id="${c.id}" data-v="${r.rest}">Принять</button>`:r.st==='overdue'?`<i class="gs warn">Просрочен</i>`:`<i class="gs">Ожидается</i>`}</span></div>`).join('')}</div>`;
}
function debtPanel(c,dl,suf){
  const din=dl.filter(x=>x.d.type==='in'),dout=dl.filter(x=>x.d.type==='out');
  return`<div class="psum card"><div><small>Должен мне</small><b>${N(sumBy(din,x=>x.k.left),'pd'+suf+c.id)}</b></div><div><small>Я должен</small><b class="num">${money(sumBy(dout,x=>x.k.left))}</b></div>
    <button class="btn sm soft" data-a="newDebt" data-client="${c.id}">${I.plus}Долг</button></div>
  ${dl.length?dl.map(({d,k})=>`<div class="card pcard"><a class="pch" href="#/debt/${d.id}"><div><small>${d.type==='in'?'Должен мне':'Я должен'} · с ${dmy(d.date)}${d.note?' · '+esc(d.note):''}</small><b class="num">${money(k.left)}</b></div>${chipD(d,k)}</a>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="psub"><span>Возвращено ${money(k.paid)} из ${money(k.add)}</span>${k.left>0?`<button class="gs take" data-a="op" data-k="pay" data-id="${d.id}">${d.type==='in'?'Принять оплату':'Отдал'}</button>`:''}</div>
    <div class="pgt">График платежей</div>${debtSchedule(d,k)}</div>`).join(''):`<div class="card pad muted small">Долгов пока нет.</div>`}`;
}
function instPanel(c,cs,suf){
  return`<div class="psum card"><div><small>Остаток</small><b>${N(sumBy(cs,x=>x.k.left),'pi'+suf+c.id)}</b></div><div class="${sumBy(cs,x=>x.k.overdue)?'hot':''}"><small>Просрочено</small><b class="num">${money(sumBy(cs,x=>x.k.overdue))}</b></div>
    <button class="btn sm soft" data-a="newContract" data-client="${c.id}">${I.plus}Рассрочка</button></div>
  ${cs.length?cs.map(({c:x,k})=>`<div class="card pcard"><a class="pch" href="#/contract/${x.id}"><div><small>№${x.no} · ${esc(x.item)}</small><b class="num">${money(k.left)}</b></div>${chipC(k)}</a>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="psub"><span>Оплачено ${money(k.paid)} из ${money(k.fin)}</span><span>${money(k.monthly)}/мес</span></div>
    <div class="pgt">График платежей <span>${k.rows.filter(r=>r.st==='paid').length}/${k.rows.length}</span></div>${contractSchedule(x,k)}</div>`).join(''):`<div class="card pad muted small">Рассрочек пока нет.</div>`}`;
}
function galleryHtml(c){
  const fs=c.files||[];
  return`<h2>Фото документов <span class="num" style="text-transform:none;letter-spacing:0">${fs.length}/5</span></h2>
  <div class="gal" id="gal">${fs.map(f=>`<div class="gt${c.mainPhoto===f.id?' main':''}" data-f="${f.id}">
      <button class="gimg" data-a="view" data-c="${c.id}" data-id="${f.id}" data-t="${f.type}" data-l="${f.local?1:''}" aria-label="Открыть">${f.type==='application/pdf'?`<span class="pdf">${I.file}PDF</span>`:`<img src="${fileUrl(f)}" alt="${esc(f.name)}" loading="lazy" decoding="async">`}</button>
      ${f.type!=='application/pdf'?`<button class="gb star${c.mainPhoto===f.id?' on':''}" data-a="fStar" data-id="${c.id}" data-f="${f.id}" aria-label="Сделать главной">${I.star}</button>`:''}
      <button class="gb del" data-a="fDel" data-id="${c.id}" data-f="${f.id}" aria-label="Удалить">${I.trash}</button>${dkSel(f.kind,`data-gk="${f.id}" data-id="${c.id}"`)}</div>`).join('')}
    ${fs.length<5?`<button class="gt add" data-a="fAdd" data-id="${c.id}" aria-label="Добавить фото">${I.plus}<small>Добавить</small></button>`:''}</div>
  <div class="note" style="margin:8px 2px 0">Паспорт, права, СНИЛС, договор — фото или PDF, можно выбрать сразу несколько (на компьютере — перетащить сюда). Вид документа меняется внизу фото. ★ — главное фото на карточке контакта. Удаление — двойное нажатие на корзину.</div>`;
}
function clientPage(id){
  const c=db.clients.find(x=>x.id===id);if(!c)return notFound();
  const cs=S.inst?db.contracts.filter(x=>x.clientId===id).sort((a,b)=>b.no-a.no).map(x=>({c:x,k:calc(x)})):[],dl=S.debt?db.debts.filter(x=>x.contactId===id).map(d=>({d,k:dcalc(d)})):[];
  const left=sumBy(cs,x=>x.k.left)+sumBy(dl.filter(x=>x.d.type==='in'),x=>x.k.left),over=sumBy(cs,x=>x.k.overdue)+sumBy(dl.filter(x=>x.d.type==='in'&&x.k.status==='overdue'),x=>x.k.left);
  const iOwe=sumBy(dl.filter(x=>x.d.type==='out'),x=>x.k.left),link=linkOf(c);
  const row=(icon,l,v,act='')=>`<div class="crow"><span class="ci">${icon}</span><div class="cv"><small>${l}</small><b>${v}</b></div>${act}</div>`;
  const phAct=n=>`<a class="x" href="tel:${esc(n)}" aria-label="Позвонить">${I.phone}</a><button class="x" data-a="waNum" data-v="${esc(n)}" data-who="${esc(hello(c))}" aria-label="WhatsApp">${I.wa}</button>`;
  /* вид «Обложка» (V30): обложка с главным фото, 4 цифры, ближайшие платежи, рассрочки и долги, документы */
  const t=today(),din=dl.filter(x=>x.d.type==='in'),act=cs.filter(x=>x.k.status!=='done'),dAct=dl.filter(x=>x.k.left>0);
  const tot=sumBy(cs,x=>x.k.fin)+sumBy(din,x=>x.k.add),paidAll=sumBy(cs,x=>x.k.paid)+sumBy(din,x=>x.k.paid),pct=tot?Math.min(100,Math.round(paidAll/tot*100)):100;
  const maxDays=Math.max(0,...cs.filter(x=>x.k.status==='overdue').map(x=>x.k.days),...din.filter(x=>x.k.status==='overdue').map(x=>x.k.days));
  const mv=act.filter(x=>(x.c.shifts||[]).length).length+din.filter(x=>x.k.left>0&&(x.d.moves||[]).length).length;
  let sc=100;if(c.black)sc-=45;if(over>0)sc-=25+Math.min(40,Math.round(maxDays/2.5));sc-=8*Math.min(2,mv);if(left>0&&!over)sc-=Math.round(22*(1-pct/100));sc=Math.max(3,Math.min(100,sc));
  const risk=c.black||over>0&&sc<45?'bad':over>0?'warn':left>0?'mid':'ok',relL=sc>=80?'Высокая':sc>=50?'Средняя':'Низкая',relC=sc>=80?'var(--accent)':sc>=50?'var(--gold)':'var(--warn)';
  const MN=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
  const ev=[];
  for(const{c:x,k}of act){let fut=0;for(const r of k.rows){if(r.st==='paid')continue;if(r.st!=='overdue'&&fut>=2)break;
    ev.push({date:r.date,ti:`Рассрочка №${x.no} · ${esc(x.item)}`,amt:r.rest,st:r.st==='overdue'?'over':r.date===t?'today':'fut',a:`data-a="pay" data-id="${x.id}" data-v="${r.rest}"`});if(r.st!=='overdue')fut++}}
  for(const{d,k}of dAct)if(d.due)ev.push({date:d.due,ti:d.type==='in'?'Долг · срок возврата':'Я должен · срок',amt:k.left,st:k.status==='overdue'?'over':d.due===t?'today':'fut',out:d.type==='out',a:`data-a="op" data-k="pay" data-id="${d.id}"`});
  ev.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  const evSub=e=>e.st==='over'?'просрочено '+pdays(days(e.date,t)):e.st==='today'?'сегодня':days(t,e.date)<=7?'через '+pdays(days(t,e.date)):'по графику';
  const mp=c.mainPhoto&&(c.files||[]).find(f=>f.id===c.mainPhoto&&f.type!=='application/pdf'),mpu=mp&&fileUrl(mp);
  const chipR={bad:['warn','Высокий риск'],warn:['warn','Есть просрочка'],mid:['gold','Платит'],ok:['ok','Нет долгов']}[risk];
  const tel=c.phone?`<a class="btn soft cvb" href="tel:${esc(c.phone)}">${I.phone}Позвонить</a><button class="btn cvb wa" data-a="waCl" data-id="${c.id}">${I.wa}WhatsApp</button>`:`<button class="btn soft cvb" data-a="editClient" data-id="${c.id}">${I.phone}Добавить номер</button>`;
  const newBtns=[S.inst?`<button class="cvn" data-a="newContract" data-client="${c.id}">${I.plus}Рассрочка</button>`:'',S.debt?`<button class="cvn" data-a="newDebt" data-client="${c.id}">${I.plus}Долг</button>`:''].join('');
  const cCard=({c:x,k})=>`<div class="card cvi${k.status==='overdue'?' over':''}"><a class="cvt" href="#/contract/${x.id}"><small>№${x.no} · ${esc(x.item)}</small>${chipC(k)}</a>
    <a class="cvm num" href="#/contract/${x.id}">${N(k.left,'cvc'+x.id)}</a><div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="cvf"><span>Оплачено ${k.rows.filter(r=>r.st==='paid').length} из ${k.rows.length}</span><span>${money(k.monthly)}/мес</span></div>
    <details class="cvd"><summary>График платежей<span>${money(k.paid)} из ${money(k.fin)}</span></summary>${contractSchedule(x,k)}</details></div>`;
  const dCard=({d,k})=>`<div class="card cvi${k.status==='overdue'?' over':''}"><a class="cvt" href="#/debt/${d.id}"><small>Долг · ${d.type==='in'?'должен мне':'я должен'}${d.note?' · '+esc(d.note):''}</small>${chipD(d,k)}</a>
    <a class="cvm num" href="#/debt/${d.id}">${N(k.left,'cvd'+d.id)}</a><div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="cvf"><span>${d.type==='in'?'Вернул':'Отдал'} ${money(k.paid)} из ${money(k.add)}</span><button class="gs take" data-a="op" data-k="pay" data-id="${d.id}">${d.type==='in'?'Принять оплату':'Отдал'}</button></div>
    <details class="cvd"><summary>Операции<span>${d.due?'до '+dmy(d.due):'без срока'}</span></summary>${debtSchedule(d,k)}</details></div>`;
  const closed=[...cs.filter(x=>x.k.status==='done').map(({c:x,k})=>`<a class="card cvi done" href="#/contract/${x.id}"><span class="cvt"><small>№${x.no} · ${esc(x.item)}</small><span class="chip ok">Выплачено</span></span><span class="cvf"><span>${money(k.fin)} · ${k.rows.length} из ${k.rows.length}</span><span>${x.payments.length?'закрыт '+dmy(x.payments[x.payments.length-1].date):''}</span></span></a>`),
    ...dl.filter(x=>x.k.left<=0).map(({d,k})=>`<a class="card cvi done" href="#/debt/${d.id}"><span class="cvt"><small>Долг · ${d.type==='in'?'должен мне':'я должен'}</small><span class="chip ok">Закрыт</span></span><span class="cvf"><span>${money(k.add)}</span><span></span></span></a>`)];
  const items=act.length||dAct.length||closed.length?act.map(cCard).join('')+dAct.map(dCard).join('')+closed.join('')
    :`<div class="card cvi cve">${I.doc}<b>Рассрочек и долгов пока нет</b><small>Оформите рассрочку или запишите долг — здесь появятся суммы, график и прогресс.</small><div class="cvnb">${newBtns}</div></div>`;
  const tl=ev.length?`<div class="card cvtl">${ev.slice(0,6).map(e=>{const[y,mo,da]=e.date.split('-');return`<button class="cvr" ${e.a}><span class="cvdt"><b>${+da}</b><small>${MN[+mo-1]}</small></span><i class="cvdot ${e.st}"></i><span class="g"><b>${e.ti}</b><small>${evSub(e)}</small></span><span class="cva num ${e.st==='over'?'hot':''}">${e.out?'−':''}${money(e.amt)}</span></button>`}).join('')}</div>`
    :`<div class="card pad muted small">${left?'Ближайших платежей по графику нет.':'Платежей не ожидается — долгов нет.'}</div>`;
  const dataBlock=`<div class="card crows">
    ${row(I.users,'Фамилия, имя, отчество',esc(fio(c)))}
    ${row(I.phone,'Номер телефона',c.phone?`<span class="num">${esc(c.phone)}</span>`:'<span class="muted">не указан</span>',c.phone?phAct(c.phone):'')}
    ${c.phone2?row(I.phone,'Дополнительный номер',`<span class="num">${esc(c.phone2)}</span>`,phAct(c.phone2)):''}
    ${row(I.home,'Проживание',c.address?esc(c.address):'<span class="muted">не указано</span>')}
    ${c.note?row(I.file,'Заметка',esc(c.note)):''}</div>`;
  const linkBlock=link?`<div class="card clink"><div class="cl1"><span class="ci">${I.share}</span><div><b>Страница клиента</b><small>По ссылке ${esc(hello(c)||'клиент')} видит все свои долги и рассрочки, подтверждает операции и может включить уведомления.</small></div></div>
    <div class="link" style="padding:0"><code>${esc(link.replace(/^https?:\/\//,''))}</code></div>
    <div class="row-btns"><button class="btn sm primary" data-a="copy" data-v="${esc(link)}">${I.copy}Копировать</button>${c.phone?`<button class="btn sm soft" data-a="waLink" data-id="${c.id}">${I.wa}Отправить</button>`:''}${navigator.share?`<button class="btn sm" data-a="share" data-v="${esc(link)}">${I.share}</button>`:''}</div></div>`:'';
  return`<div class="cbar"><a class="back" href="#/clients" style="margin:0">${I.back}Контакты</a><div class="rbtns">${c.deleted?`<button class="rbtn" data-a="restoreClient" data-id="${c.id}" aria-label="Восстановить" title="Восстановить">${I.undo}</button>`:`<button class="rbtn red" data-a="delClient" data-id="${c.id}" aria-label="Удалить контакт" title="Удалить">${I.trash}</button>`}<button class="rbtn" data-a="editClient" data-id="${c.id}" aria-label="Изменить контакт" title="Изменить">${I.edit}</button></div></div>
  <div class="cvw ${risk}">
  <div class="cvcov">${mpu?`<img src="${mpu}" alt="">`:''}</div>
  <div class="cvh">${mp?`<button class="cvavb" data-a="view" data-c="${c.id}" data-id="${mp.id}" aria-label="Открыть фото">${avaHtml(c,'cvav')}</button>`:avaHtml(c,'cvav')}
    <div class="g"><h1>${esc(fio(c))}</h1><div class="m"><span>${I.phone}${c.phone?esc(c.phone):'нет телефона'}</span>${c.address?`<span>${I.home}${esc(c.address)}</span>`:''}</div>
      <div class="cvch">${cs.length||dl.length?`<span class="chip ${chipR[0]}">${chipR[1]}</span>`:''}${c.black?`<span class="chip warn">${I.ban}Чёрный список</span>`:''}${linked.has(c.id)?`<span class="chip ok">${I.check}В X-Finance</span>`:''}${iOwe?`<span class="chip">Я должен ${money(iOwe)}</span>`:''}${c.deleted?`<span class="chip">Удалён ${dmy(c.deleted)}</span>`:''}</div></div>
    <div class="ac">${tel}${linkU[c.id]?`<a class="btn soft cvb" href="#/chat/${linkU[c.id]}">${I.send}Написать</a>`:''}</div></div>
  <div class="cvk"><div class="card"><small>Должен</small><b>${N(left,'cl'+id)}</b></div><div class="card"><small>Просрочено</small><b class="num${over?' hot':''}">${money(over)}</b></div>
    <div class="card"><small>Оплачено</small><b class="num ok">${tot?pct+'%':'—'}</b></div><div class="card rel"><small>Надёжность</small><b class="num" style="color:${relC}">${sc} <em>из 100</em></b><span>${relL}</span></div></div>
  ${linkU[c.id]?`<a class="btn soft cvxw" href="#/chat/${linkU[c.id]}">${I.send}Написать в X-Finance</a>`:''}
  ${c.deleted?`<div class="card pad note" style="margin-top:12px">Контакт удалён ${dmy(c.deleted)}. Он и все его данные остаются на сервере — его можно восстановить.</div>`:''}
  ${c.black?`<div class="card bnote"><span class="ci">${I.ban}</span><div><b>В чёрном списке</b><p>${esc(c.blackNote||'Причина не указана')}</p></div></div>`:''}
  ${linked.has(c.id)?`<div class="card pad note lnote">${I.check}<span>${esc(hello(c)||'Клиент')} зарегистрирован в X-Finance и принял ваше приглашение: он видит свои долги и рассрочки у вас и получает уведомления.</span></div>`:''}
  <div class="cvc"><div class="cvl">
    <section class="cvs" style="--o:1"><h2>Ближайшие платежи</h2>${tl}</section>
    <section class="cvs" style="--o:3">${galleryHtml(c)}</section>
    <section class="cvs" style="--o:4"><h2>Данные</h2>${dataBlock}</section>
    ${link?`<section class="cvs" style="--o:5"><h2>Личная ссылка</h2>${linkBlock}</section>`:''}
  </div><div class="cvrr">
    <section class="cvs" style="--o:2"><h2 class="cvh2">Рассрочки и долги${cs.length||dl.length?`<span class="cvnb">${newBtns}</span>`:''}</h2>${items}</section>
  </div></div>
  ${c.deleted?`<div class="row-btns" style="margin-top:26px"><button class="btn primary" data-a="restoreClient" data-id="${c.id}">${I.check}Восстановить</button><button class="btn danger" data-a="purgeClient" data-id="${c.id}">${I.x}Удалить навсегда</button></div>`:''}
  </div>
  <div class="cdock">${c.phone?`<a class="dk call" href="tel:${esc(c.phone)}"><span>${I.phone}</span>Позвонить</a><button class="dk wa" data-a="waCl" data-id="${c.id}"><span>${I.wa}</span>WhatsApp</button>`
    :`<button class="dk call" data-a="editClient" data-id="${c.id}"><span>${I.phone}</span>Добавить номер</button>`}</div>`;
}
/* перелистывание панелей контакта */
function pagerInit(){
  const p=$('#pager');if(!p||p.classList.contains('solo'))return;
  const ind=$('#pind'),tabs=[...document.querySelectorAll('#ptabs button')];
  const wide=()=>matchMedia('(min-width:960px)').matches;
  const sync=()=>{if(wide())return;const w=p.clientWidth||1,x=p.scrollLeft/w;if(ind)ind.style.transform=`translateX(${x*100}%)`;const i=Math.round(x);tabs.forEach((b,j)=>b.classList.toggle('on',j===i))};
  if(!wide()){p.style.scrollBehavior='auto';p.scrollLeft=p.clientWidth;p.style.scrollBehavior=''}
  sync();p.addEventListener('scroll',()=>requestAnimationFrame(sync),{passive:true});
}
function debtsList(){
  const ds=db.debts.map(d=>({d,k:dcalc(d)}));
  const f={in:x=>x.d.type==='in'&&x.k.status!=='done',out:x=>x.d.type==='out'&&x.k.status!=='done',done:x=>x.k.status==='done'};
  const tabs=[['in','Мне должны','ok'],['out','Я должен','gold'],['done','Закрытые','ink']].map(([k,l,t])=>`<button class="cat${dtab===k?' on':''}" data-a="dtab" data-t="${k}">${l}<i></i><b class="${t}">${ds.filter(f[k]).length}</b></button>`).join('');
  const list=ds.filter(f[dtab]).sort((a,b)=>(a.d.due||'9')<(b.d.due||'9')?-1:1);
  return`<div class="dcats"><div class="catr">${tabs}</div></div>
  ${dtab!=='done'&&list.length?`<div class="card hero" style="margin-bottom:10px"><div class="l">${dtab==='in'?'Всего должны мне':'Всего должен я'}</div><div class="v">${N(sumBy(list,x=>x.k.left),'dl-'+dtab,1)}</div></div>`:''}
  ${list.length?`<div class="list grid">${list.map(x=>dCard(x.d,x.k)).join('')}</div>`:`<div class="card">${empty(I.coin,{in:'Вам никто не должен',out:'Вы никому не должны',done:'Закрытых долгов нет'}[dtab])}</div>`}`;
}
const debts=()=>`<div class="top"><h1>Долги</h1><button class="btn primary only-desk" data-a="newDebt">${I.plus}Долг</button></div>
  <div id="list">${debtsList()}</div>`;
function debtPage(id){
  const d=db.debts.find(x=>x.id===id);if(!d)return notFound();
  const k=dcalc(d),isIn=d.type==='in';
  return`<a class="back" href="#/debts">${I.back}Долги</a>
  <div class="top"><div><h1>${esc(fio(d))}</h1><div class="sub">${isIn?'Должен мне':'Я должен'} · с ${fdate(d.date)}${d.phone?' · '+esc(d.phone):''}</div></div>${k.status!=='active'?chipD(d,k):`<div class="ava">${esc(ini(d))}</div>`}</div>
  ${propBox(d.id)}<div class="card hero"><div class="l">${k.status==='done'?'Долг закрыт':isIn?'Осталось вернуть':'Осталось отдать'}</div><div class="v">${N(k.left,'d'+d.id)}</div>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>Всего ${money(k.add)} · возвращено ${money(k.paid)}</span><span>${d.due?'до '+fdate(d.due):'без срока'}</span></div></div>
  <div class="acts"><button class="card act" data-a="op" data-k="pay" data-id="${d.id}"${k.left<=0?' disabled style="opacity:.45"':''}><span>${I.minus}</span>${isIn?'Принять оплату':'Отдал часть'}</button>
    <button class="card act w" data-a="op" data-k="add" data-id="${d.id}"><span>${I.plus}</span>${isIn?'Добавить долг':'Взял ещё'}</button>
    ${isIn&&d.phone?`<button class="card act g" data-a="waD" data-id="${d.id}"><span>${I.wa}</span>Напомнить</button>`:''}</div>
  ${d.note?`<div class="card pad small" style="margin-top:10px">${esc(d.note)}</div>`:''}
  ${isIn?linkCard(d,'должника'):''}
  <h2>История</h2>
  <div class="card rows">${d.ops.length?d.ops.slice().reverse().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:0).map(o=>`<div class="rw ${o.kind}${o.id===flashId?' flash':''}" data-row="${o.id}"><div class="n">${o.kind==='add'?I.plus:I.minus}</div>
    <div class="g"><b>${o.kind==='add'?'Долг':'Оплата'}</b><small>${fdate(o.date)}${o.note?' · '+esc(o.note):''}${o.srv?' · по заявке клиента':''}${o.confirmed?' · подтверждено должником':o.disputed?' · <b style="color:var(--warn)">должник не согласен</b>':''}</small></div>
    <div class="am num">${o.kind==='add'?'+':'−'}${money(o.amount)}</div><button class="x" data-a="delOp" data-id="${d.id}" data-p="${o.id}" aria-label="Удалить">${I.x}</button></div>`).join(''):'<div class="pad muted small">Операций пока нет.</div>'}</div>
  <button class="btn block soft dbtn" style="margin-top:14px" data-a="docImg" data-k="d" data-id="${d.id}">${I.file}Документ А4 (картинка)</button>
  <div class="row-btns" style="margin-top:12px"><button class="btn" data-a="editDebt" data-id="${d.id}">Изменить</button><button class="btn danger" data-a="delDebt" data-id="${d.id}">Удалить</button></div>`;
}
function investors(){
  const list=db.investors.slice().sort((a,b)=>(b.isDefault|0)-(a.isDefault|0)||fio(a).localeCompare(fio(b),'ru'));
  return`<a class="back" href="#/settings">${I.back}Настройки</a><div class="top"><h1>Инвесторы</h1><button class="btn primary only-desk" data-a="newInvestor">${I.plus}Инвестор</button></div>
  ${list.length?`<div class="list grid">${list.map(i=>{const s=invSum(db.contracts.filter(c=>c.investorId===i.id));
    return`<a class="card item with-ava" href="#/investor/${i.id}"><div class="ava" style="background:var(--gold-soft);color:var(--gold)">${esc(ini(i))}</div><div><div class="h"><div class="t">${esc(fio(i))}</div><div class="a num">${money(s.invested)}</div></div>
    <div class="f" style="margin-top:4px">${i.isDefault?`<span class="chip gold">${I.star}По умолчанию</span>`:`<span class="chip">Доля ${nf.format(i.pct)}%</span>`}<span>${plural(s.n,['договор','договора','договоров'])}</span></div></div></a>`}).join('')}</div>`
  :`<div class="card">${empty(I.chart,'Инвесторов пока нет','Добавьте инвестора, чтобы привязывать к нему договоры и считать его долю прибыли.','<button class="btn primary" data-a="newInvestor">Добавить инвестора</button>')}</div>`}
  <button class="fab" data-a="newInvestor" aria-label="Новый инвестор">${I.plus}</button>`;
}
const invStats=(s,key)=>`<div class="stats" style="margin:0"><div class="card stat"><div class="l">Вложено всего</div><div class="v">${N(s.invested,key+'i')}</div></div>
  <div class="card stat"><div class="l">В обороте</div><div class="v">${N(s.work,key+'w')}</div></div>
  <div class="card stat"><div class="l">Прибыль ожидается</div><div class="v">${N(s.exp,key+'e')}</div></div>
  <div class="card stat"><div class="l">Прибыль получена</div><div class="v" style="color:var(--accent)">${N(s.got,key+'g')}</div></div></div>`;
function investorPage(id){
  const i=investor(id);if(!i)return notFound();
  const cs=db.contracts.filter(c=>c.investorId===id),s=invSum(cs);
  return`<a class="back" href="#/investors">${I.back}Инвесторы</a>
  <div class="top"><div><h1>${esc(fio(i))}</h1><div class="sub">${esc(i.phone||'Телефон не указан')}</div></div>
    <button class="x star${i.isDefault?' on':''}" data-a="defInvestor" data-id="${i.id}" aria-label="По умолчанию" style="width:44px;height:44px">${I.star}</button></div>
  ${invStats(s,'iv'+id)}
  <h2>Условия</h2><div class="card facts">
    <div><span>Срок по умолчанию</span><b>${i.months} мес.</b></div><div><span>Статус</span><b>${i.isDefault?'По умолчанию':'Обычный'}</b></div>
    <div><span>Прибыль инвестору</span><b>${nf.format(i.pct)}%</b></div><div><span>Прибыль компании</span><b>${nf.format(100-i.pct)}%</b></div></div>
  ${i.note?`<div class="card pad small" style="margin-top:10px">${esc(i.note)}</div>`:''}
  <h2>Доступ инвестора</h2>
  <div class="card pad">${LOCAL?'<div class="note">Личный кабинет инвестора работает, когда приложение установлено на сервер.</div>':i.login?`<div class="note" style="margin-bottom:12px">Инвестор входит на этом же сайте с логином <b style="color:var(--ink)">${esc(i.login)}</b> и видит только свои договоры и прибыль.</div>
    <div class="row-btns"><button class="btn" data-a="access" data-id="${i.id}">Сменить пароль</button><button class="btn danger" data-a="noAccess" data-id="${i.id}">Закрыть доступ</button></div>`
    :`<div class="note" style="margin-bottom:12px">Создайте инвестору логин и пароль: он увидит только свои договоры, вложения и прибыль, без права что-либо менять.</div><button class="btn primary block" data-a="access" data-id="${i.id}">Дать доступ</button>`}</div>
  ${shareBlock(i)}
  <h2>Договоры</h2>
  ${cs.length?`<div class="list">${cs.sort((a,b)=>b.no-a.no).map(c=>cCard(c)).join('')}</div>`:'<div class="card pad muted small">К инвестору пока не привязан ни один договор.</div>'}
  <div class="row-btns" style="margin-top:22px"><button class="btn" data-a="editInvestor" data-id="${i.id}">Изменить</button><button class="btn danger" data-a="delInvestor" data-id="${i.id}">Удалить</button></div>`;
}
/* ---------- Настройки: единый стиль — карточки-группы со строками «значок · текст · управление» ---------- */
const sRow=(ic,tone,title,sub,right='',attr='')=>`<${attr?'button':'div'} class="srow"${attr?' '+attr:''}><span class="sic ${tone}">${ic}</span><span class="st"><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span>${right}</${attr?'button':'div'}>`;
const sTog=(on,a,k,lbl)=>`<button class="tog${on?' on':''}" data-a="${a}"${k?` data-k="${k}"`:''} aria-label="${lbl}"></button>`;
const sGo=v=>`<span class="sgo">${v?`<em>${v}</em>`:''}${I.back}</span>`;
const vcmp=(a,b)=>{const x=String(a||'0').split('.').map(Number),y=String(b||'0').split('.').map(Number);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]||0)-(y[i]||0);if(d)return d}return 0};
/* ---------- версии: номер сборки V15, V16 … (растёт при каждом изменении) ---------- */
const BV=b=>b?'V'+b:'—';
function verInfo(){
  const web=location.protocol.startsWith('http'),last=VER.build||null,sb=LOCAL?null:(VER.sbuild||(SRV&&SRV.build)||null);
  const appOld=!!(last&&last>BUILD),srvOld=!!(sb&&Math.max(BUILD,last||0)>sb),srvNew=!!(sb&&sb>Math.max(BUILD,last||0));
  let st;
  if(!web)st=['ink','Проверочный файл','Обновления приходят в приложение, открытое с сервера'];
  else if(VER.at===0)st=['ink','Проверяю обновления…',''];
  else if(appOld||srvNew)st=['gold','Нужно обновить приложение',`Доступна сборка ${BV(Math.max(last||0,sb||0))}`];
  else if(srvOld)st=['gold','Нужно обновить сервер',`На сервере ${BV(sb)}, приложение ${BV(BUILD)}`];
  else if(last)st=['ok','Обновлять не нужно',`Установлена последняя сборка ${BV(BUILD)}`];
  else st=['ink','Не удалось проверить','Нет связи с сервером приложения'];
  return{web,last,sb,appOld,srvOld,srvNew,st};
}
let VER={build:null,sbuild:null,notes:null,date:null,at:0,busy:false};
async function loadVer(force){if(VER.busy||(!force&&Date.now()-VER.at<60000))return;VER.busy=true;
  try{const r=await fetch('version.json?_='+Date.now(),{cache:'no-store'});const j=r.ok?await r.json():{};VER.build=+j.build||null;VER.notes=j.notes||null;VER.date=j.date||null}catch(e){VER.build=null}
  if(!LOCAL&&!stale)try{const s=await api('GET','/api/server');VER.sbuild=+s.build||null;VER.server=s.version||null;SRV=s}catch(e){}
  VER.at=Date.now();VER.busy=false;const b=$('#aboutv');if(b)b.innerHTML=aboutRows();const t=$('#habout');if(t)t.outerHTML=hubAbout();const w=$('#wnew');if(w)w.innerHTML=wnew()}
function aboutRows(){
  const v=verInfo(),[tone,t,s]=v.st,cmd='cd ~/x-finance && git pull && sudo bash server/install.sh';
  const tips=[];
  if(!v.web)tips.push(['ink',I.file,'Это проверочный файл','X-Finance.html нужен для просмотра дизайна. Рабочее приложение открывайте с адреса вашего сервера https://…']);
  else{
    if(v.appOld||v.srvNew)tips.push(['gold',I.upl,'Обновите приложение',`Вышла сборка ${BV(Math.max(v.last||0,v.sb||0))}, у вас ${BV(BUILD)}. Нажмите «Обновить» — данные на устройстве и на сервере сохранятся, приложение перезапустится.`,`<button class="btn sm primary" data-a="appUpd">${I.upl}Обновить</button>`]);
    if(v.srvOld)tips.push(['gold',I.cloud,'Обновите серверную часть',`На сервере сборка ${BV(v.sb)}. Подключитесь к серверу по SSH и выполните команду — база данных сохранится:`,`<button class="x" data-a="copyCmd" data-v="${esc(cmd)}" aria-label="Скопировать">${I.copy}</button>`,cmd]);
    if(!LOCAL&&!v.sb&&VER.at&&!stale)tips.push(['ink',I.cloud,'Сервер старой версии',`Сервер не сообщает номер сборки — значит, он старше ${BV(BUILD)}. Обновите его командой:`,`<button class="x" data-a="copyCmd" data-v="${esc(cmd)}" aria-label="Скопировать">${I.copy}</button>`,cmd]);
    if(stale)tips.push(['warn',I.alert,'Нет связи с сервером','Версию сервера проверим, когда связь появится. Данные сейчас берутся из копии на устройстве.']);
    if(!tips.length&&v.last)tips.push(['ok',I.check,'Всё актуально',(LOCAL?`Приложение последней сборки ${BV(BUILD)}, сервер не используется.`:`Приложение и сервер — последней сборки ${BV(BUILD)}.`)+' Новые сборки проверяются сами при каждом открытии: когда выйдет следующая, здесь появится кнопка «Обновить» и подсказка, что обновить — приложение или сервер.']);
  }
  return`<div class="vgrid"><div class="vb"><small>На устройстве</small><b>${BV(BUILD)}</b><span>это приложение</span></div>
    <div class="vb"><small>Последняя сборка</small><b class="${v.appOld?'gold':''}">${v.web?BV(v.last):'—'}</b><span>${VER.date&&v.last?'от '+dmy(VER.date):v.web?'на сервере приложения':'—'}</span></div>
    <div class="vb"><small>Серверная часть</small><b class="${v.srvOld?'gold':''}">${LOCAL?'нет':v.sb?BV(v.sb):VER.server||'—'}</b><span>${LOCAL?'работа без сервера':SRV&&SRV.os?esc(SRV.os):'X-Finance сервер'}</span></div></div>
  <div class="vst ${tone}"><span class="sic ${tone==='gold'?'gold':tone==='ok'?'ok':'ink'}">${tone==='ok'?I.check:tone==='gold'?I.upl:I.sync}</span><span class="st"><b>${t}</b>${s?`<small>${s}</small>`:''}</span>
    ${v.web?`<button class="btn sm soft" data-a="verCheck">${I.sync}Проверить</button>`:''}</div>
  <h3 class="vtip-h">Совет</h3><div class="vtips">${tips.map(([tn,ic,h,x,btn,code])=>`<div class="vtip ${tn}"><span class="sic ${tn==='warn'?'warn':tn}">${ic}</span><div class="st"><b>${h}</b><small>${x}</small>${code?`<code class="sel">${esc(code)}</code>`:''}</div>${btn||''}</div>`).join('')}</div>`;
}
const NOTES=["Широкий экран: левое меню уже на 20% (178 px вместо 222), пункты выровнены", "Чёткость на компьютере: убраны постоянные слои, из-за которых текст выглядел «мыльно» (3D-наклон всех карточек, размытие фона у меню, кнопок и поиска, анимации появления) — текст и значки рисуются резко", "Текст на компьютере контрастнее: серые подписи темнее, карточки плотнее"];
/* ---------- Настройки: главный экран — карточки разделов; каждый раздел открывается отдельной страницей ---------- */
const SSUB={page:'Моя страница',dev:'Разработчик',admin:'Администратор',server:'Серверы',app:'Приложение',view:'Отображение',sections:'Отображение',wa:'WhatsApp',notify:'Уведомления и WhatsApp',backup:'Резервная копия',about:'О приложении'};
const tile=(h,cls,ic,tone,t,s,extra='',i=0,id='')=>`<a class="card stile ${cls}" href="${h}" style="--i:${i}"${id?` id="${id}"`:''}><span class="stic ${tone}">${ic}</span><span class="sgo">${I.back}</span><span class="stx"><b>${t}</b><small>${s}</small></span>${extra}</a>`;
function hubSrv(){const l=svList(),act=l.find(s=>s.url===SELF);
  const ms=LOCAL?null:PG.ms,dots=l.slice(0,6).map(s=>{const p=SVP[s.id];return`<i class="${!p?'wait':p.ms==null?'off':pq(p.ms)}" title="${esc(s.name)}"></i>`}).join('');
  return`<span class="stx"><b>Серверы</b><small>${LOCAL?'Работа без сервера':stale?'Нет связи с сервером':ms!=null?`Активный · ${ms} мс · ${pqName(ms).toLowerCase()}`:'Проверяю связь…'}</small></span>
    <span class="stm"><span class="sdots">${dots}</span><em>${l.length?plural(l.length,['сервер','сервера','серверов']):'не добавлены'}${act?'':''}</em></span>`}
function hubAbout(){const v=verInfo(),[tone,t]=v.st;
  return`<a class="card stile about" href="#/settings/about" style="--i:8" id="habout"><span class="stic brand"><img src="icon-192.png" alt=""></span><span class="sgo">${I.back}</span>
    <span class="stx"><b>О приложении</b><small>X-Finance · сборка ${BV(BUILD)}</small></span><span class="stm"><i class="schip ${tone==='ok'?'ok':tone==='gold'?'gold':''}">${t}</i></span></a>`}
let meAt=0;
function meRefresh(){if(LOCAL||stale||Date.now()-meAt<20000)return;meAt=Date.now();   // статус «Разработчик/Администратор» и настройки проверки могли поменяться в админ-панели
  fetch(U('/api/me'),{credentials:'same-origin'}).then(r=>r.json()).then(j=>{if(!j.user)return;const ch=(j.user.staff||'')!==(me.staff||'');me.staff=j.user.staff||'';if(info)info.checkCfg=j.checkCfg;if(ch&&location.hash.startsWith('#/settings')&&!$('#layer .ov'))render()}).catch(()=>{})}
function settingsHub(){
  setTimeout(meRefresh,0);
  loadVer();if(!LOCAL&&!TF&&!stale)loadTariff();if(!LOCAL&&PG.ms==null&&!PG.busy&&Date.now()-PG.at>3000)setTimeout(pingNow,50);setTimeout(svPingAll,80);
  const t=curTariff(),[tc,tl]=tStat(t),total=Math.max(1,Math.round((new Date(t.until)-new Date('2026-01-01'))/864e5)),pct=Math.min(100,t.daysLeft/total*100);
  const g=S.green||{},gOn=!!(g.id&&g.token),pushOn=lsGet('xf_push_me')==='1',ab=AB.get(),[ik,itl]=XS.state(),zl=(ZS.find(z=>Math.abs(XS.f-z[0])<.01)||[0,'Обычный'])[1];
  const name=LOCAL?'Без сервера':me.name||me.login;
  const acc=`<a class="card stile acc" href="#/account" style="--i:0">${LOCAL?`<span class="stic ink">${I.cloud}</span>`:`<span class="pava">${esc(ini({last:(me.name||me.login||'?').split(' ')[0],first:(me.name||'').split(' ')[1]||''}))}</span>`}<span class="sgo">${I.back}</span>
    <span class="stx"><small class="sov">Аккаунт</small><b>${esc(name)}</b><small>${LOCAL?'Данные хранятся на этом устройстве':esc(me.login)+(me.phone?' · '+esc(me.phone):'')+(me.company?' · '+esc(me.company):'')}</small></span>
    <span class="stm"><i class="schip ${LOCAL?'':stale?'warn':'ok'}">${LOCAL?'Локально':stale?'Нет связи':'Синхронизировано'}</i><em>Профиль · вход · синхронизация</em></span></a>`;
  return`<div class="top"><div><h1>Настройки</h1><div class="sub">${LOCAL?'Работа без сервера':esc(me.company||me.name||'')}</div></div></div>
  ${LOCAL?`<div class="card defsv"><span class="sic ok">${I.cloud}</span><span class="st"><b>Работать через сервер</b><small>Вход, ссылки для клиентов, уведомления и фото — на сервере ${esc(defSrv().replace(/^https?:\/\//,''))}</small></span><a class="btn sm primary" href="${esc(defSrv())}/">Открыть</a></div>`:''}
  ${mem?'<div class="card pad small" style="color:var(--warn);margin-bottom:12px">Браузер не разрешает сохранять данные в этом режиме. Установите приложение на сервер, чтобы записи не пропадали.</div>':''}
  <div class="shub">${acc}
    ${tile('#/tariff','tar',I.star||I.check,'gold','Тарифы',`«${esc(t.name)}» · ${t.status==='expired'?'закончился':t.status==='free'?'бесплатно до '+fdate(t.until):'оплачен до '+fdate(t.until)}`,`<span class="stm"><span class="sbar"><b style="width:${pct}%"></b></span><em>${t.status==='expired'?'продлите':'ещё '+plural(t.daysLeft,['день','дня','дней'])}</em></span>`,1)}
    <a class="card stile srv" href="#/settings/server" style="--i:2"><span class="stic ok">${I.cloud}</span><span class="sgo">${I.back}</span><span id="hsrv" class="hsrv">${hubSrv()}</span></a>
    ${tile('#/settings/app','',I.share,'sky','Приложение',`${itl} · размер «${zl}»`,`<span class="stm"><em>Установка · размер интерфейса</em></span>`,3)}
    ${tile('#/settings/view','',I.grid,'gold','Отображение',[S.inst&&'Рассрочка',S.debt&&'Долги'].filter(Boolean).join(' · ')||'Выключены',`<span class="stm"><em>${(()=>{const ks=pinKeys(),n=ks.filter(k=>pinned(k[0])).length;return n?`Всегда открыты: ${n} из ${ks.length}`:'Категории — свайпом вниз'})()}</em></span>`,4)}
    ${tile('#/settings/wa','',I.wa,'wa','WhatsApp',LOCAL?'Отправка вручную':gOn?'Green API подключён':'Green API не подключён',`<span class="stm"><i class="schip ${gOn?'ok':''}">${gOn?'Подключено':'Не подключено'}</i><em>${(()=>{const n=WT.filter(x=>wtpl(x[0]).on).length;return n+' из '+WT.length+' сообщений'})()}</em></span>`,5)}
    ${tile('#/settings/notify','',I.bell,'ok','Уведомления',(()=>{const[,st]=ntState();return PLN[PLAT]+' · '+st.toLowerCase()})(),`<span class="stm"><i class="schip ${ntS().inapp?'ok':''}">${ntS().inapp?'Баннер вкл.':'Баннер выкл.'}</i><em>${ntS().sound?'со звуком':'без звука'}</em></span>`,6)}
    ${tile('#/settings/backup','',I.file,'sky','Резервная копия',ab.on?'Автокопия включена':'Автокопия выключена',`<span class="stm"><em>${ab.last?'Последняя: '+tfmt(ab.last):'Копий ещё не было'}</em></span>`,6)}
    ${me&&me.staff==='dev'?tile('#/settings/dev','',I.gear,'ink','Разработчик','Проверка клиента: тарифы',`<span class="stm"><i class="schip ok">Статус</i><em>доп. возможности</em></span>`,8):''}
    ${me&&me.staff==='admin'?tile('#/settings/admin','',I.chart,'gold','Администратор','Сводка и настройки проверки',`<span class="stm"><i class="schip gold">Статус</i><em>доп. возможности</em></span>`,8):''}
    ${hubAbout()}</div>`;
}
const wnew=()=>{const nb=VER.build&&VER.build>BUILD,n=VER.notes&&VER.notes.length?VER.notes:NOTES;return`<div class="wnh"><span class="bvv">${BV(nb?VER.build:BUILD)}</span><small>${nb?'новая сборка — нажмите «Обновить»':'установлена у вас'}</small></div><ul class="wnew">${n.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`};
const pinKeys=()=>[S.inst&&['home',I.home,'ok','Главная','Счета: все, основной, инвесторы'],S.inst&&['contracts',I.doc,'gold','Договоры','Активные, просроченные, завершённые'],['clients',I.users,'sky','Контакты','X-контакты, должники, чёрный список']].filter(Boolean);
function settings(sub){
  if(!sub||!SSUB[sub])return settingsHub();
  const g=S.green||{},gOn=!!(g.id&&g.token),pushOn=lsGet('xf_push_me')==='1';
  const head=(t,s)=>`<a class="back" href="#/settings">${I.back}Настройки</a><div class="top"><div><h1>${t}</h1><div class="sub">${s}</div></div></div>`;
  if(sub==='page')return myPage();
  if(sub==='server')return head('Серверы','Активный, основной, резервный и домашний сервер')+serverBlock();
  if(sub==='app')return head('Приложение','Установка, обновление и размер интерфейса')+`<h2>Установка</h2>${instCard()}<h2>Размер интерфейса</h2>${zoomCard()}`;
  if(sub==='sections'||sub==='view')return head('Отображение','Разделы приложения и категории на экранах')+`<h2>Разделы</h2>
    <div class="card sgrp">${sRow(I.doc,'gold','Рассрочка','Договоры, графики платежей, инвесторы',sTog(S.inst,'mode','inst','Показывать рассрочку'))}
    ${sRow(I.coin,'warn','Долги','Кто должен мне и кому должен я',sTog(S.debt,'mode','debt','Показывать долги'))}
    ${S.inst?sRow(I.chart,'sky','Инвесторы',db.investors.length?plural(db.investors.length,['инвестор','инвестора','инвесторов']):'Доли прибыли и личные кабинеты',sGo(),'data-a="goInv"'):''}</div>
    <h2>Категории всегда открыты</h2>
    <div class="card sgrp">${pinKeys().map(([k,ic,tone,t,x])=>sRow(ic,tone,t,x,sTog(pinned(k),'pinTog',k,t+': всегда открыты'))).join('')}</div>
    <p class="note" style="margin:8px 4px 0">Включено — категории видны сразу, свайп вниз не нужен. Выключено — открываются свайпом вниз по экрану. На компьютере категории видны всегда.</p>`;
  if(sub==='dev'||sub==='admin'){if(!me||me.staff!==sub)return head(SSUB[sub],'')+`<div class="card">${empty(I.lock||I.alert,'Нет доступа','Этот раздел открывается статусом из админ-панели.')}</div>`;
    return head(sub==='dev'?'Разработчик':'Администратор',sub==='dev'?'Дополнительные возможности по статусу':'Сводка по сервису и настройки')+staffPage(sub)}
  if(sub==='wa')return head('WhatsApp','Green API: сообщения и напоминания клиентам')+waPage();
  if(sub==='notify')return head('Уведомления','Windows, Android и уведомления внутри приложения')+notifyPage();
  if(sub==='backup')return head('Резервная копия','JSON для восстановления и Excel')+backupBlock().replace('<h2>Резервная копия</h2>','');
  /* о приложении */
  loadVer();if(!LOCAL&&!stale)loadServer();
  return head('О приложении','Сборка, обновления и документы')+`
  <div class="card sabout"><div class="sbrand"><img src="icon-192.png" alt=""><div><b>X-Finance <span class="bvv">${BV(BUILD)}</span></b><small>Исламская рассрочка и учёт долгов · XStore 95</small></div></div>
    <div id="aboutv">${aboutRows()}</div></div>
  <h2>Что нового</h2>
  <div class="card pad" id="wnew">${wnew()}</div>
  <h2>Документы</h2>
  <div class="card sgrp"><a class="srow" href="#/policy"><span class="sic ink">${I.file}</span><span class="st"><b>Политика обработки персональных данных</b></span>${sGo()}</a>
    <a class="srow" href="#/terms"><span class="sic ink">${I.doc}</span><span class="st"><b>Пользовательское соглашение</b></span>${sGo()}</a></div>
  <p class="note" style="margin:12px 4px 0">Рассрочка по правилам мурабаха: цена фиксируется при заключении договора, за просрочку нет ни пени, ни штрафов.</p>`;
}
/* ---------- уведомления и связи ---------- */
let lastNote=0;
async function fetchNotes(){if(LOCAL||!me||me.role!=='owner')return;fetchX();try{const r=await api('GET','/api/notes');NI=r;bell();ntBadge(r.unread||0);
    const top=r.notes&&r.notes[0]?r.notes[0].id:0,fresh=lastNote&&r.notes.filter(n=>n.id>lastNote);lastNote=Math.max(lastNote,top);
    if(fresh&&fresh.length&&document.visibilityState==='visible')fresh.slice(0,3).reverse().forEach((n,i)=>setTimeout(()=>banner(n),i*450));
    if(fresh&&fresh.length){   // ответ другой стороны меняет суммы — подтянуть данные, чтобы остаток обновился у обоих
      if(fresh.some(n=>['share','shx','shok','shno'].includes(n.kind))){SHR.data={};loadShares()}
      if(fresh.some(n=>n.kind==='ref')){REFD=null;loadRef();loadTariff()}
      if(fresh.some(n=>n.kind==='staff'))fetch(U('/api/me'),{credentials:'same-origin'}).then(r=>r.json()).then(j=>{if(j.user){me=j.user;info.checkCfg=j.checkCfg;if(!$('#layer .ov'))render()}}).catch(()=>{});
      if(fresh.some(n=>['confirm','dispute','prop','linked','shop'].includes(n.kind)))loadData().then(()=>{if(!$('#layer .ov'))render()}).catch(()=>{});
      if(fresh.some(n=>['op','propok','propno','link'].includes(n.kind))){shared=null;if(location.hash.startsWith('#/inbox'))loadShared()}}if(npOpen)npRender();if(location.hash.startsWith('#/inbox')&&!$('#layer .ov'))render()}catch(e){}}
let rBusy=false;
function bell(){
  let b=$('#bell'),rf=$('#rfr');const show=!!me&&me.role==='owner'&&!pub&&!$('#app').classList.contains('bare');
  if(!show){if(b)b.remove();if(rf)rf.remove();return}
  if(!rf){rf=document.createElement('button');rf.id='rfr';rf.dataset.a='refresh';rf.setAttribute('aria-label','Обновить');document.body.append(rf)}
  const pn=obPend(),pgOn=PG.on&&!LOCAL&&!rBusy,html=pgOn?`<span class="pgb"><b${PG.ms!=null&&PG.ms>=100?' class="l3"':''}>${PG.ms==null?(PG.at?'—':'…'):PG.ms>999?'1k+':PG.ms}</b><small>${PG.ms==null&&PG.at?'нет':'мс'}</small></span>${I.sync}<i></i>`:I.sync+'<i></i>';
  if(rf.dataset.h!==html){rf.innerHTML=html;rf.dataset.h=html}
  rf.className='bellbtn rfr'+(rBusy?' rolling':'')+(pn?' pend':'')+(pgOn?' pg '+pq(PG.ms):'');rf.style.setProperty('--pq',PG.ms==null?0:Math.max(.08,Math.min(1,1-PG.ms/400)));rf.title=pn?`Не отправлено: ${pn}. Нажмите, чтобы отправить и обновить`:'Обновить данные';
  if(!b){b=document.createElement('button');b.id='bell';b.dataset.a='bellOpen';b.setAttribute('aria-label','Уведомления');document.body.append(b)}
  const n=NI.unread||0,on=npOpen||location.hash.startsWith('#/inbox');
  b.className='bellbtn'+(on?' on':'')+(n?' ring':'');b.innerHTML=I.bell+(n?`<i>${n>99?'99+':n}</i>`:'');
}
const ago=s=>{const m=Math.round((Date.now()-new Date(s))/6e4);if(m<1)return'только что';if(m<60)return m+' мин назад';const h=Math.round(m/60);if(h<24)return h+' ч назад';const d=Math.round(h/24);return d===1?'вчера':d<7?pdays(d)+' назад':dmy(s.slice(0,10))};
const NK={staff:['gear','ok'],ref:['gift','gold'],share:['chart','gold'],shok:['check','ok'],shno:['ban','ink'],shx:['chart','ink'],shop:['coin','sky'],prop:['card','gold'],propok:['check','ok'],propno:['ban','warn'],dispute:['alert','warn'],pay:['check','ok'],msg:['send','sky'],link:['users','gold'],linked:['check','ok'],confirm:['check','ok'],op:['coin','sky']};
let NIat=0;
function inboxPage(sub){
  if(Date.now()-NIat>5000){NIat=Date.now();setTimeout(fetchNotes,0)}
  if(sub==='shared')itab='shared';
  const n=NI.notes;
  const tabs=`<div class="seg"><button class="${itab==='notes'?'on':''}" data-a="itab" data-t="notes">Уведомления${NI.unread?`<em>${NI.unread}</em>`:''}</button><button class="${itab==='shared'?'on':''}" data-a="itab" data-t="shared">Мои долги у других${NI.shared?`<em>${NI.shared}</em>`:''}</button></div>`;
  let body;
  if(itab==='notes'){
    if(!n)body=`<div class="card pad muted small">Загрузка…</div>`;
    else if(!n.length)body=`<div class="card">${empty(I.bell,'Уведомлений пока нет','Здесь будут приглашения от других пользователей X-Finance, подтверждения от должников и операции по вашим общим долгам.')}</div>`;
    else body=`${NI.unread?`<div style="display:flex;justify-content:flex-end;margin:-4px 0 8px"><button class="btn sm soft" data-a="noteAll">${I.check}Отметить всё прочитанным</button></div>`:''}<div class="card rows">${n.map(x=>noteItem(x)).join('')}</div>`;
  }else{
    if(!shared){loadShared();body=`<div class="card pad muted small">Загрузка…</div>`}
    else if(!shared.length)body=`<div class="card">${empty(I.users,'Пока пусто','Если другой пользователь X-Finance добавит вас в контакты и вы примете приглашение, здесь будут ваши долги и рассрочки у него.')}</div>`;
    else body=shared.map(x=>{const p=x.view,cs=p.contracts.map(c=>({c,k:calc({cost:c.total,markup:0,down:c.down,months:c.months,first:c.first_pay,payments:c.payments,shifts:c.shifts})}));
      const owe=sumBy(cs,y=>y.k.left)+sumBy(p.debts.filter(d=>d.type==='in'),d=>dcalc(d).left),back=sumBy(p.debts.filter(d=>d.type==='out'),d=>dcalc(d).left);
      return`<div class="card shh"><div class="ava" style="background:var(--gold-soft);color:var(--gold)">${esc((p.company||'?')[0].toUpperCase())}</div><div class="g"><b>${esc(p.company)}</b><small>Я должен ${money(owe)}${back?` · мне должны ${money(back)}`:''}</small></div>
        ${p.ownerPhone?`<a class="x" href="https://wa.me/${waPhone(p.ownerPhone)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I.wa}</a>`:''}<button class="x" data-a="linkLeave" data-id="${x.id}" aria-label="Отключить">${I.x}</button></div>
        <div class="list" style="margin:10px 0 22px" data-link="${x.id}">${cs.map(y=>pubContractBlock(y.c,'sc'+y.c.id,0,x.id,(x.props||[]).filter(q=>q.itemId===y.c.id))).join('')}${p.debts.map(d=>pubDebtBlock(d,'sd'+d.id,0,x.id,(x.props||[]).filter(q=>q.itemId===d.id))).join('')}${!cs.length&&!p.debts.length?'<div class="card pad muted small">Записей пока нет.</div>':''}</div>`}).join('');
  }
  return`<div class="top"><div><h1>Уведомления</h1><div class="sub">Приглашения, подтверждения и общие долги</div></div></div>${tabs}<div id="ibody">${body}</div>
  <a class="card menu" href="#/ops" style="margin-top:14px;border-radius:var(--r)"><span>Все операции<br><small>Полный журнал оформлений и платежей</small></span>${I.back}</a>`;
}
let sharedLoading=false;
async function loadShared(){if(sharedLoading)return;sharedLoading=true;try{shared=(await api('GET','/api/shared')).shared}catch(e){shared=[]}sharedLoading=false;if(location.hash.startsWith('#/inbox'))render()}
setInterval(()=>{if(!document.hidden)fetchNotes()},45000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)fetchNotes()});
/* «Защита от удаления»: проверять картинки при возврате в приложение и каждые 5 минут */
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&AB.get().guard)imgSoon(1500)});setInterval(()=>{if(AB.get().guard&&!document.hidden)imgSoon(100)},300000);

/* ---------- свайп вниз: категории ---------- */
let pull=null;
const pullPage=()=>{const n=location.hash.split('/')[1]||'';if(location.hash.split('/')[2]||pinned(n||'home'))return false;return n==='contracts'||n==='clients'||(n===''&&(S.inst||(SHR.in||[]).length))};
document.addEventListener('touchstart',e=>{if(catOpen||!pullPage()||window.scrollY>2||$('#layer .ov')||$('#pm')||e.touches.length>1)return;pull={y:e.touches[0].clientY,x:e.touches[0].clientX,d:0}},{passive:true});
document.addEventListener('touchmove',e=>{if(!pull)return;const dy=e.touches[0].clientY-pull.y,dx=Math.abs(e.touches[0].clientX-pull.x);
  if(dy<0||dx>dy){pull=null;$('#main').style.transform='';return}
  pull.d=dy;const m=$('#main');m.style.transition='none';m.style.transform=`translateY(${Math.min(70,dy*.35)}px)`;
  const h=$('#pullhint');if(h)h.classList.toggle('ready',dy>70)},{passive:true});
document.addEventListener('touchend',()=>{if(!pull)return;const m=$('#main');m.style.transition='transform .35s var(--ease)';m.style.transform='';
  if(pull.d>70&&!catOpen){catOpen=true;const c=$('#cats');if(c)c.classList.add('open');const h=$('#pullhint');if(h){h.classList.add('gone');setTimeout(()=>h.remove(),300)}try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}}
  pull=null;setTimeout(()=>{m.style.transition=''},400)});

/* ---------- аккаунт и синхронизация ---------- */
let syncAt=null,stats=null,statsAt=0,statsBusy=false;
function appCounts(){const al=db.clients.filter(c=>!c.deleted);return{clients:al.length,deleted:db.clients.length-al.length,contracts:db.contracts.length,debts:db.debts.length,investors:db.investors.length,files:sumBy(db.clients,c=>(c.files||[]).length),payments:sumBy(db.contracts,c=>c.payments.length)+sumBy(db.debts,d=>d.ops.length)}}
const lastCopy=()=>{const a=AB.get();return a.copy||null};
function noteCopy(where){AB.set({copy:{at:new Date().toISOString(),where,counts:appCounts()}})}
async function loadStats(force){if(LOCAL||statsBusy||(!force&&stats&&Date.now()-statsAt<8000))return;statsBusy=true;try{stats=await api('GET','/api/stats');statsAt=Date.now()}catch(e){stats={error:e.message}}statsBusy=false;if(location.hash.startsWith('#/account'))render()}
const tfmt=s=>{if(!s)return'—';const d=new Date(s),t=today(),dd=iso(d);return(dd===t?'сегодня':dd===iso(new Date(Date.now()-864e5))?'вчера':dmy(dd))+' в '+pad(d.getHours())+':'+pad(d.getMinutes())};
/* ---- «Моя страница»: что видят клиенты на личной странице /p/<токен> (настройки S.page, применяет сервер) ---- */
const PGK=[['phone','phone','green','Мой номер телефона','Показывать номер и кнопку «Позвонить»'],['wa','wa','green','Кнопка «Написать в WhatsApp»','Клиент пишет вам в один клик (только если номер показан)'],
  ['sched','cal','sky','График платежей','Даты и суммы каждого платежа рассрочки'],['confirm','check','gold','Подтверждение операций','Клиент принимает новые долги и оплаты (✓)'],
  ['push','bell','sky','Уведомления','Кнопка «Получать уведомления» о платежах'],['hello','star','gold','Приветствие','«Ассаляму алейкум, Имя Отчество!» сверху']].map(([k,ic,t,a,b])=>[k,I[ic],t,a,b]);
const PGT=[['title','Название на странице','Что клиент видит сверху вместо названия компании. Пусто — название компании из профиля.',''],
  ['pay','Как оплатить','Реквизиты для перевода: номер карты или телефона, банк, получатель. Клиент увидит их с кнопкой «Скопировать».','Сбербанк · 8 928 739-00-92 · Идрис Б.'],
  ['note','Сообщение для клиентов','Короткий текст внизу страницы: часы работы, адрес магазина, правила.','Магазин XStore 95, г. Ойсхар. Работаем с 9:00 до 20:00.']];
const pgCfg=()=>({phone:true,wa:true,sched:true,confirm:true,push:true,hello:true,title:'',pay:'',note:'',...(S.page||{})});
const pgOnCount=()=>{const g=pgCfg();return PGK.filter(x=>g[x[0]]).length+'/'+PGK.length};
function myPage(){const g=pgCfg(),title=g.title||me.company||me.name||'X-Finance',ph=g.phone&&me.phone;
  const prev=`<div class="pgph"><div class="pgsc"><div class="pgb"><span class="pglogo">${I.xmark}</span><b>${esc(title)}</b></div>
    ${g.hello?'<p class="pghi">Ассаляму алейкум, Ахмед Магомедович!</p>':''}
    <div class="pgcard"><small>Ваш долг всего</small><b>90 000 ₽</b><span>1 рассрочка · ближайший 16 дек</span><i><em style="width:17%"></em></i></div>
    ${g.sched?`<div class="pgrows"><span><i class="ok">✓</i>16.10 · 18 000 ₽</span><span><i>2</i>16.11 · 18 000 ₽</span><span><i>3</i>16.12 · 18 000 ₽</span></div>`:''}
    ${g.confirm?'<div class="pgop"><span>+ 15 000 ₽ · долг</span><em>✓ Принять</em></div>':''}
    ${g.pay?`<div class="pgpay"><small>Как оплатить</small><b>${esc(g.pay)}</b><em>Скопировать</em></div>`:''}
    <div class="pgbt">${g.push?'<span class="p">Уведомления</span>':''}${ph?'<span>Позвонить</span>':''}${g.wa&&ph?'<span class="w">WhatsApp</span>':''}</div>
    ${g.note?`<p class="pgnote">${esc(g.note)}</p>`:''}</div></div>`;
  return`<a class="back" href="#/account">${I.back}Аккаунт</a><div class="top"><div><h1>Моя страница</h1><div class="sub">Что видят клиенты по своей личной ссылке</div></div></div>
  <div class="pgw"><div class="pgl"><h2>Показывать клиентам</h2>
    <div class="card sgrp">${PGK.map(([k,ic,t,a,b])=>sRow(ic,t,a,k==='phone'&&!me.phone?'Номер не указан в профиле':b,sTog(g[k],'pgTog',k,a))).join('')}</div>
    <h2>Тексты</h2><div class="card sgrp">${PGT.map(([k,t,x])=>sRow(k==='pay'?I.card:k==='title'?I.edit:I.file,k==='pay'?'gold':'green',t,g[k]?esc(g[k].length>70?g[k].slice(0,70)+'…':g[k]):'<span class="muted">не задано</span>',sGo(),`data-a="pgText" data-k="${k}"`)).join('')}</div>
    <p class="note" style="margin:8px 4px 0">Изменения сразу действуют на всех страницах клиентов (личная ссылка контакта, ссылки договоров и долгов) . ${g.confirm?'':'Подтверждение выключено — сервер не примет ✓ от клиента.'}</p></div>
  <div class="pgr"><h2>Как видит клиент</h2>${prev}</div></div>`;
}
function accountPage(){
  if(!LOCAL&&!stats)loadStats();
  const A_=appCounts(),cp=lastCopy(),sv=stats&&!stats.error?stats:null,C=cp&&cp.counts;
  const rows=[['clients','Контакты'],['deleted','Удалённые контакты'],['contracts','Договоры (рассрочки)'],['payments','Платежи и операции'],['debts','Долги'],['investors','Инвесторы'],['files','Фото документов']];
  const same=sv&&rows.every(([k])=>k==='files'||sv[k]===A_[k]);
  const cell=(v,ref,k)=>v==null?'<td class="na">—</td>':`<td class="${ref!=null&&v!==ref&&k!=='files'?'diff':''}">${v}</td>`;
  const st=LOCAL?['ink','Работа без сервера','Данные хранятся только на этом устройстве.']:!sv?['ink',stats&&stats.error?'Нет связи с сервером':'Проверяю сервер…',stats&&stats.error?stats.error:'']
    :same?['ok','Всё синхронизировано','Данные в приложении совпадают с сервером.']:['warn','Есть расхождение','Нажмите «Синхронизировать», чтобы загрузить данные с сервера заново.'];
  return`<a class="back" href="#/settings">${I.back}Настройки</a>
  <div class="top"><div><h1>Аккаунт</h1><div class="sub">Профиль, синхронизация и вход</div></div></div>
  ${LOCAL?'':`<div class="card acc"><div class="cav sm">${esc(ini({last:(me.name||me.login).split(' ')[0],first:(me.name||'').split(' ')[1]||''}))}</div>
    <div class="ag"><b>${esc(me.name||'Без имени')}</b>${me.company?`<small>${esc(me.company)}</small>`:''}</div><button class="rbtn" data-a="account" aria-label="Изменить профиль">${I.edit}</button></div>
  <div class="card crows" style="margin-top:10px">
    <div class="crow"><span class="ci">${I.users}</span><div class="cv"><small>Фамилия, имя, отчество</small><b>${esc(me.name||'—')}</b></div></div>
    <div class="crow"><span class="ci">${I.phone}</span><div class="cv"><small>Номер телефона</small><b class="num">${esc(me.phone||'—')}</b></div></div>
    <div class="crow"><span class="ci">${I.gear}</span><div class="cv"><small>Логин</small><b>${esc(me.login)}</b></div></div>
    ${me.company?`<div class="crow"><span class="ci">${I.home}</span><div class="cv"><small>Компания</small><b>${esc(me.company)}</b></div></div>`:''}
  </div>`}
  ${LOCAL?'':`<div class="card sgrp" style="margin-top:10px">${sRow(I.share,'green','Моя страница','Что видят клиенты по личной ссылке: телефон, кнопки, реквизиты',sGo(pgOnCount()),'data-a="goPage"')}</div>`}
  ${refBlock()}
  <h2>Синхронизация данных</h2>
  <div class="card sync">
    <div class="ss ${st[0]}"><span class="sd"></span><div><b>${st[1]}</b>${st[2]?`<small>${esc(st[2])}</small>`:''}</div></div>
    <div class="stbl"><table><thead><tr><th></th><th>${I.gear}<span>Сервер</span></th><th>${I.home}<span>Приложение</span></th><th>${I.file}<span>Копия</span></th></tr></thead><tbody>
      ${rows.map(([k,l])=>`<tr><th>${l}</th>${LOCAL?'<td class="na">—</td>':cell(sv?sv[k]:null,null,k)}${cell(A_[k],sv?sv[k]:null,k)}${cell(C?C[k]:null,null,k)}</tr>`).join('')}
      <tr class="tm"><th>Обновлено</th><td>${LOCAL?'—':sv?tfmt(sv.lastChange):'…'}</td><td>${LOCAL?'на устройстве':tfmt(syncAt)}</td><td>${cp?tfmt(cp.at):'не было'}</td></tr>
    </tbody></table></div>
    <div class="snote">${LOCAL?'':'<b>Сервер</b> — база на вашем сервере. '}<b>Приложение</b> — что загружено сейчас на этом устройстве${LOCAL?' (хранится в браузере)':''}. <b>Копия</b> — последняя резервная копия JSON/Excel${cp?` (${esc(cp.where)})`:''}. Фото документов хранятся только на сервере.</div>
    <div class="row-btns" style="padding:0 14px 14px">${LOCAL?'':`<button class="btn sm primary" data-a="syncNow">${I.undo}Синхронизировать</button>`}<button class="btn sm soft" data-a="copyNow">${I.file}Сделать копию</button></div>
  </div>
  <h2>Вход и регистрация</h2>
  ${LOCAL?`<div class="card pad note">Вход и регистрация работают, когда приложение открыто с вашего сервера. Сейчас данные хранятся только на этом устройстве.</div>`
  :`<div class="aut">
    <button class="card autb" data-a="authSwitch" data-m="login"><span class="ci">${I.users}</span><b>Вход</b><small>Войти в другой аккаунт по логину и паролю</small></button>
    <button class="card autb" data-a="authSwitch" data-m="reg"><span class="ci gold">${I.plus}</span><b>Регистрация</b><small>Создать новый аккаунт X-Finance</small></button></div>
  <div class="card rows" style="margin-top:10px"><button class="menu" data-a="password">Сменить пароль${I.back}</button><button class="menu" data-a="logout" style="color:var(--warn)">Выйти из аккаунта</button></div>`}
  <div style="margin-top:22px"><button class="btn danger block" data-a="${LOCAL?'wipe':'delAccount'}">${LOCAL?'Удалить все данные с устройства':'Удалить аккаунт и все данные'}</button></div>`;
}

/* ---------- уведомления: системные (Windows, Android), баннер в приложении, работа в фоне ----------
   Настройки устройства — localStorage.xf_nt (+ копия в Cache 'xf-prefs', её читает service worker). */
const NTD={inapp:true,sound:true,vib:true,dur:6,silent:false,sticky:false,badge:true,bg:false};
const ntS=()=>{try{return{...NTD,...JSON.parse(localStorage.getItem('xf_nt')||'{}')}}catch(e){return{...NTD}}};
async function ntSave(p){const v={...ntS(),...p};try{localStorage.setItem('xf_nt',JSON.stringify(v))}catch(e){}
  try{if(window.caches){const c=await caches.open('xf-prefs'+SUF);await c.put('/__xf_prefs',new Response(JSON.stringify(v),{headers:{'Content-Type':'application/json'}}))}}catch(e){}return v}
const PLAT=(()=>{const u=navigator.userAgent;return window.XS&&window.XS.ios?'ios':/Android/i.test(u)?'android':/Windows/i.test(u)?'windows':/Macintosh|Mac OS/i.test(u)?'mac':'other'})();
const BROW=(()=>{const u=navigator.userAgent;return/Edg\//.test(u)?'Edge':/YaBrowser/.test(u)?'Яндекс Браузер':/OPR\//.test(u)?'Opera':/Firefox/.test(u)?'Firefox':/SamsungBrowser/.test(u)?'Samsung Internet':/Chrome/.test(u)?'Chrome':/Safari/.test(u)?'Safari':'браузер'})();
const PLN={windows:'Windows',android:'Android',ios:'iPhone / iPad',mac:'macOS',other:'Компьютер'};
let NTST={sub:null,ps:null,at:0};
async function ntCheck(){NTST.at=Date.now();
  try{const reg='serviceWorker' in navigator&&await navigator.serviceWorker.getRegistration();NTST.sub=reg&&reg.pushManager?!!(await reg.pushManager.getSubscription()):false;
    NTST.ps=reg&&'periodicSync' in reg?((await reg.periodicSync.getTags()).includes('xf-refresh')):null}catch(e){NTST.sub=false}
  if(location.hash==='#/settings/notify'&&!$('#layer .ov'))render()}
const ntPerm=()=>!('Notification' in window)||!('serviceWorker' in navigator)?'unsupported':Notification.permission;
function ntState(){const p=ntPerm(),on=p==='granted'&&(NTST.sub??lsGet('xf_push_me')==='1');
  return p==='unsupported'?['ink','Не поддерживается',XS.ios?'На iPhone установите приложение на экран «Домой» (iOS 16.4+)':'Этот браузер не умеет показывать уведомления']
    :p==='denied'?['warn','Запрещены в браузере','Разрешите уведомления для этого сайта — инструкция ниже']
    :on?['ok','Включены','Приходят, даже когда приложение свёрнуто или закрыто']:['gold','Выключены','Включите — и не пропустите оплату или подтверждение долга']}
/* баннер вверху приложения */
let ntAc=null;
function chime(){try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;const a=ntAc||(ntAc=new C());if(a.state==='suspended')a.resume();const t=a.currentTime;
  [[987.8,0],[1318.5,.11]].forEach(([f,d])=>{const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.11,t+d+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d+.42);o.connect(g);g.connect(a.destination);o.start(t+d);o.stop(t+d+.45)})}catch(e){}}
function banner(n,force){const s=ntS();if(!s.inapp&&!force)return;
  let box=$('#bnr');if(!box){box=document.createElement('div');box.id='bnr';box.setAttribute('aria-live','polite');document.body.append(box)}
  const [ic,tone]=NK[n.kind]||['bell','ok'],el=document.createElement('div');el.className='bn';
  el.innerHTML=`<span class="bni ${tone}">${I[ic]||I.bell}</span><div class="bnt"><b>${esc(n.title||'X-Finance')}</b>${n.body?`<small>${esc(n.body)}</small>`:''}</div><span class="bnw">сейчас</span><button class="bnx" aria-label="Закрыть">${I.x}</button><i class="bnp" style="animation-duration:${s.dur}s"></i>`;
  let tm=0,y0=null,dy=0;const close=()=>{clearTimeout(tm);if(el.classList.contains('out'))return;el.classList.add('out');setTimeout(()=>el.remove(),380)};
  const arm=()=>{clearTimeout(tm);tm=setTimeout(close,s.dur*1000)};
  el.addEventListener('click',e=>{if(Math.abs(dy)>6)return;close();if(e.target.closest('.bnx'))return;const h=String(n.url||'').replace(/^[^#]*/,'');if(h&&h!=='#/inbox')nav(h);else if(!npOpen)npToggle(true)});
  el.addEventListener('mouseenter',()=>{clearTimeout(tm);el.classList.add('hold')});el.addEventListener('mouseleave',()=>{el.classList.remove('hold');arm()});
  el.addEventListener('touchstart',e=>{y0=e.touches[0].clientY;dy=0;clearTimeout(tm);el.classList.add('hold')},{passive:true});
  el.addEventListener('touchmove',e=>{if(y0==null)return;dy=Math.min(0,e.touches[0].clientY-y0);el.style.transform=`translateY(${dy}px)`;el.style.opacity=1+dy/120},{passive:true});
  el.addEventListener('touchend',()=>{el.classList.remove('hold');if(dy<-40)close();else{el.style.transform='';el.style.opacity='';arm()}y0=null;setTimeout(()=>dy=0,50)});
  box.prepend(el);while(box.children.length>3)box.lastChild.remove();arm();
  if(s.sound)chime();if(s.vib&&navigator.vibrate)try{navigator.vibrate([16,60,16])}catch(e){}}
function ntBadge(n){if(!ntS().badge||!('setAppBadge' in navigator))return;try{n>0?navigator.setAppBadge(n):navigator.clearAppBadge()}catch(e){}}
const NTHOW={
  windows:['Windows',[['Разрешите сайту','В адресной строке нажмите значок замка → «Уведомления» → «Разрешить».'],['Включите в Windows','Пуск → Параметры → Система → Уведомления → включите <b>'+BROW+'</b> (или X-Finance, если приложение установлено).'],['Отключите «Не беспокоить»','В том же разделе выключите «Не беспокоить» / «Фокусировку внимания», иначе уведомления уходят без показа.'],['Работа в фоне','В '+BROW+': Настройки → Система → включите «Продолжать работу фоновых приложений после закрытия браузера» — тогда уведомления придут и при закрытом браузере.']]],
  android:['Android',[['Разрешите сайту','Нажмите «Включить» выше и выберите «Разрешить». Если уже запретили: ⋮ → Настройки → Настройки сайтов → Уведомления.'],['Включите в Android','Настройки → Приложения → <b>'+BROW+'</b> (или X-Finance) → Уведомления → «Разрешить», звук и всплывающие окна — включены.'],['Без ограничений батареи','Настройки → Приложения → '+BROW+' → Батарея → «Без ограничений». Иначе Android может задерживать уведомления в фоне.'],['Установите приложение','⋮ → «Установить приложение» — X-Finance появится отдельной иконкой со своими уведомлениями и значком с числом.']]],
  ios:['iPhone',[['Установите на экран «Домой»','Safari → «Поделиться» → «На экран „Домой“». Уведомления на iPhone работают только у установленного приложения (iOS 16.4+).'],['Разрешите','Откройте X-Finance с экрана «Домой» → Настройки → Уведомления → «Включить» → «Разрешить».'],['Проверьте в iOS','Настройки iPhone → Уведомления → X-Finance → «Допуск уведомлений».']]]};
let ntHow=PLAT==='android'||PLAT==='ios'?PLAT:'windows';
function notifyPage(){
  if(!LOCAL&&Date.now()-NTST.at>8000)setTimeout(ntCheck,0);
  const s=ntS(),[tone,st,sub]=ntState(),p=ntPerm(),on=tone==='ok',mob=PLAT==='android'||PLAT==='ios',psOk='serviceWorker' in navigator&&'periodicSync' in ServiceWorkerRegistration.prototype,bdOk='setAppBadge' in navigator;
  const dev=`<div class="card ntdev"><div class="ntd"><span class="ntdi ${PLAT}">${PLAT==='windows'?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 5.5 10.2 4.5v7H3zM11.2 4.4 21 3v8.5h-9.8zM3 12.5h7.2v7L3 18.5zM11.2 12.5H21V21l-9.8-1.4z"/></svg>':PLAT==='android'?'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18a1 1 0 0 0 1 1h1v3a1.5 1.5 0 0 0 3 0v-3h2v3a1.5 1.5 0 0 0 3 0v-3h1a1 1 0 0 0 1-1V8H6zm-2.5-10A1.5 1.5 0 0 0 2 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 3.5 8zm17 0A1.5 1.5 0 0 0 19 9.5v7a1.5 1.5 0 0 0 3 0v-7A1.5 1.5 0 0 0 20.5 8zM15.5 2.2l1.3-1.3-.7-.7-1.5 1.5A6 6 0 0 0 12 1a6 6 0 0 0-2.6.6L7.9.2l-.7.7 1.3 1.3A5.9 5.9 0 0 0 6 7h12a5.9 5.9 0 0 0-2.5-4.8zM10 5H9V4h1zm5 0h-1V4h1z"/></svg>':I.phone}</span>
      <div class="g"><small>Это устройство</small><b>${PLN[PLAT]} · ${BROW}${XS.standalone?' · приложение':''}</b><span class="ntst ${tone}"><i></i>${st}</span></div></div>
    <p class="ntsub">${sub}</p>
    ${LOCAL?`<div class="note">Системные уведомления приходят с сервера — откройте приложение по адресу вашего сервера и войдите в аккаунт.</div>`
      :p==='unsupported'?'':`<div class="row-btns">${on?`<button class="btn soft" data-a="ntTest">${I.bell}Проверить</button><button class="btn ghost" data-a="pushMe">Выключить</button>`:p==='denied'?`<button class="btn soft" data-a="ntHowGo">Как разрешить</button>`:`<button class="btn primary" data-a="pushMe">${I.bell}Включить уведомления</button>`}</div>`}</div>`;
  return`${dev}
  <h2>Системные уведомления</h2>
  <div class="card sgrp">${sRow(I.bell,'ink','Без звука','Уведомление появится тихо, без сигнала',sTog(s.silent,'ntTog','silent','Без звука'))}
    ${mob?'':sRow(I.pin||I.check,'sky','Не скрывать, пока не закрою','Уведомление Windows остаётся на экране до нажатия',sTog(s.sticky,'ntTog','sticky','Не скрывать'))}
    ${sRow(I.alert,'gold','Число на значке приложения',bdOk?'Сколько непрочитанных — на иконке X-Finance':'Работает у установленного приложения в Chrome и Edge',sTog(s.badge,'ntTog','badge','Значок с числом'))}</div>
  <h2>Как настроить · ${NTHOW[ntHow][0]}</h2>
  <div class="card nthow" id="nthow"><div class="seg ntseg">${Object.entries(NTHOW).map(([k,[l]])=>`<button class="${k===ntHow?'on':''}" data-a="ntHow" data-k="${k}">${l}</button>`).join('')}</div>
    <ol class="gsteps">${NTHOW[ntHow][1].map(([b,t])=>`<li><b>${b}.</b> ${t}</li>`).join('')}</ol></div>
  <h2>В приложении</h2>
  <div class="card sgrp">${sRow(I.bell,'ok','Баннер вверху экрана','Красивое уведомление поверх приложения, когда оно открыто',sTog(s.inapp,'ntTog','inapp','Баннер в приложении'))}
    ${sRow(I.wa&&'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>','sky','Звук','Короткий мягкий сигнал',sTog(s.sound,'ntTog','sound','Звук'))}
    ${'vibrate' in navigator?sRow(I.phone,'gold','Вибрация','Лёгкая вибрация на телефоне',sTog(s.vib,'ntTog','vib','Вибрация')):''}
    <div class="srow"><span class="sic ink">${I.cal}</span><span class="st"><b>Сколько показывать</b><small>Потом баннер скроется сам</small></span><div class="seg ntdur">${[4,6,10].map(v=>`<button class="${s.dur===v?'on':''}" data-a="ntDur" data-v="${v}">${v} с</button>`).join('')}</div></div>
    <div class="ntprev"><button class="btn soft block" data-a="ntDemo">${I.eye}Показать пример</button></div></div>
  <h2>Работа в фоне</h2>
  <div class="card sgrp">${sRow(I.bell,on?'ok':'ink','Уведомления при закрытом приложении',on?'Работает — сервер присылает их через систему':'Включите системные уведомления выше',`<i class="schip ${on?'ok':''}">${on?'Работает':'Выключено'}</i>`)}
    ${sRow(I.sync,'sky','Фоновое обновление',psOk?(XS.standalone?'Раз в несколько часов X-Finance сам проверяет новое и обновляет значок':'Доступно после установки приложения'):'Этот браузер не поддерживает (работает в Chrome и Edge)',psOk&&XS.standalone&&!LOCAL?sTog(s.bg&&NTST.ps!==false,'ntBg','','Фоновое обновление'):`<i class="schip">Недоступно</i>`)}
    ${sRow(I.share,XS.standalone?'ok':'gold','Установлено как приложение',XS.standalone?'Отдельное окно, свой значок и уведомления':'Установите — в фоне приложение работает надёжнее',XS.standalone?'<i class="schip ok">Да</i>':sGo(),XS.standalone?'':'data-a="goApp"')}</div>
  <p class="note" style="margin:8px 4px 0">${PLAT==='android'?'На Android уберите ограничение батареи для '+BROW+' (Настройки → Приложения → '+BROW+' → Батарея → «Без ограничений») — так уведомления в фоне не задерживаются.':PLAT==='ios'?'На iPhone фоновая работа ограничена системой: уведомления приходят, а обновление данных — при открытии приложения.':'В Windows уведомления приходят, пока '+BROW+' работает в фоне: Настройки браузера → Система → «Продолжать работу фоновых приложений после закрытия браузера».'}</p>`;
}

/* ---------- приглашения: личная ссылка /r/<код>, бонусные дни за каждого зарегистрированного ---------- */
let REFD=null,REFI=null;
const refLink=()=>REFD?SELF+'/r/'+REFD.code:'';
async function loadRef(){if(LOCAL||!me||me.role!=='owner')return;try{REFD=await api('GET','/api/ref')}catch(e){REFD={error:e.message}}
  if(REFD&&REFD.bonusDays&&!(curTariff().bonusDays>=REFD.bonusDays))loadTariff();
  if(location.hash.startsWith('#/account')&&!$('#layer .ov'))render();const b=$('#refsh');if(b)b.innerHTML=refPanel(!b.classList.contains('refin'))}
const refMsg=()=>`Ассаляму алейкум! Веду учёт рассрочек и долгов в X-Finance — удобно и по правилам мурабаха. Регистрируйтесь по моей ссылке и получите +${REFD.friend} дней бесплатно: ${refLink()}`;
function refPanel(inSheet){
  if(!REFD)return`<div class="pad muted small">Загрузка…</div>`;if(REFD.error)return`<div class="pad muted small">${esc(REFD.error)}</div>`;
  const l=refLink();
  return`${inSheet?'':'<b class="rsh">Поделиться ссылкой</b>'}<div class="rlnk"><span class="sel">${I.link||I.share}${esc(l.replace(/^https?:\/\//,''))}</span><button type="button" data-a="refCopy" aria-label="Скопировать">${I.copy}</button></div>
  <div class="rapps"><button type="button" class="rapp" data-a="refWa"><span class="rai wa">${I.wa}</span><small>WhatsApp</small></button><button type="button" class="rapp" data-a="refTg"><span class="rai tg">${I.tg||I.send}</span><small>Telegram</small></button>
    <button type="button" class="rapp" data-a="refCopy"><span class="rai cp">${I.copy}</span><small>Копировать</small></button><button type="button" class="rapp" data-a="refMore"><span class="rai mo">${I.share}</span><small>Ещё</small></button></div>
  <div class="rinv"><small>Приглашённые${REFD.clicks?` · переходов по ссылке: ${REFD.clicks}`:''}</small>
    ${REFD.list.length?REFD.list.map(x=>`<div class="rir"><span class="riav">${esc(ini({last:x.name.split(' ')[0],first:x.name.split(' ')[1]||''}))}</span><span class="rig"><b>${esc(x.name)}</b><small>зарегистрировался ${fdate(x.created.slice(0,10))}</small></span><i class="schip ok">+${x.days} дней</i></div>`).join('')
      :`<div class="rie">${I.users}<span>Пока никого. Отправьте ссылку клиентам и коллегам — за каждого, кто зарегистрируется, вам <b>+${REFD.bonus} дней</b>, а ему <b>+${REFD.friend} дней</b>.</span></div>`}</div>`;
}
function refBlock(){
  if(LOCAL)return'';if(!REFD)setTimeout(loadRef,0);
  const t=curTariff(),b=REFD&&!REFD.error?REFD:null;
  return`<h2>Пригласить друзей</h2>
  <div class="card sgrp">${sRow(I.gift||I.star,'gold',`Пригласить и получить +${b?b.bonus:30} дней`,b?`Приглашено ${b.list.length} · бонус +${b.bonusDays} дней`:'Личная ссылка для регистрации',`<span class="sgo"><i class="schip gold">+${b?b.bonus:30}</i>${I.back}</span>`,'data-a="refOpen"')}
    ${sRow(I.cal,'ok',`Тариф «${esc(t.name)}»`,`${t.status==='expired'?'Закончился':t.status==='free'?'Бесплатно до '+fdate(t.until):'Оплачен до '+fdate(t.until)}${t.bonusDays?' с бонусом':''}`,sGo(),'data-a="goTariff"')}</div>
  <div class="card refin" id="refsh">${refPanel()}</div>`;
}

/* ---------- X-контакты и личные сообщения ---------- */
let XC={list:null,unread:0},chat=null,chatUid=null,linkU={};
async function fetchX(){if(LOCAL||!me||me.role!=='owner')return;try{XC=await api('GET','/api/xcontacts');const c=$('#cats');if(c&&location.hash==='#/clients'&&!$('#layer .ov'))$('#list')&&ktab==='x'&&($('#list').innerHTML=clientsList())}catch(e){}}
const xName=x=>x.name||'Пользователь X-Finance';
function xList(){
  if(LOCAL)return`<div class="card pad note">X-контакты работают, когда приложение открыто с сервера.</div>`;
  if(!XC.list){fetchX().then(()=>{if(ktab==='x'&&$('#list'))$('#list').innerHTML=clientsList()});return`<div class="card pad muted small">Загрузка…</div>`}
  if(!XC.list.length)return`<div class="card">${empty(I.xmark,'X-контактов пока нет','Здесь появятся люди, которые пользуются X-Finance и связаны с вами: вы добавили их в контакты и они приняли приглашение — или наоборот. С ними можно переписываться прямо в приложении.')}</div>`;
  return`<div class="list grid">${XC.list.map(x=>{const c=x.clientId&&db.clients.find(y=>y.id===x.clientId);
    return`<a class="card item with-ava xc" href="#/chat/${x.uid}">${c?avaHtml(c):`<div class="ava xa">${esc(ini({last:xName(x).split(' ')[0],first:xName(x).split(' ')[1]||''}))}</div>`}
    <div><div class="h"><div class="t">${esc(c?fio(c):xName(x))}</div>${x.unread?`<span class="ubadge">${x.unread}</span>`:''}</div>
    <div class="s">${x.last?`${x.last.mine?'Вы: ':''}${esc(x.last.text)}`:`<span style="color:var(--accent)">Написать сообщение</span>`}</div>
    <div class="f" style="margin-top:6px"><span class="chip ok">${I.xmark}X-Finance${x.company?' · '+esc(x.company):''}</span><span>${x.last?ago(x.last.at):''}</span></div></div></a>`}).join('')}</div>`;
}
const QUICK=['Ассаляму алейкум!','Напоминаю о платеже 🙏','Когда сможете оплатить?','Платёж получил, спасибо!','Можно перенести платёж?'];
function bubbles(){
  if(!chat)return`<div class="muted small" style="text-align:center;padding:30px">Загрузка…</div>`;
  if(!chat.msgs.length)return`<div class="chempty">${I.wa}<b>Начните переписку</b><span>Сообщения видите только вы и ${esc(xName(chat.partner))}. Можно напомнить о платеже, договориться о сроках или попросить подтвердить оплату.</span></div>`;
  let h='',day='';
  for(const m of chat.msgs){const d=m.at.slice(0,10),loc=iso(new Date(m.at));if(loc!==day){day=loc;const dd=days(loc,today());h+=`<div class="chday"><span>${dd===0?'Сегодня':dd===1?'Вчера':dlong(loc)}</span></div>`}
    const t=new Date(m.at);h+=`<div class="bub ${m.mine?'me':'them'}${m.id===chat.fresh?' fresh':''}"><p>${esc(m.text).replace(/\n/g,'<br>')}</p><small>${pad(t.getHours())}:${pad(t.getMinutes())}${m.mine?(m.read?' ✓✓':' ✓'):''}</small></div>`}
  return h;
}
function chatPage(uid){
  uid=+uid;if(chatUid!==uid){chat=null;chatUid=uid;loadChat()}
  const x=(XC.list||[]).find(y=>y.uid===uid)||(chat&&chat.partner)||{name:''},c=x.clientId&&db.clients.find(y=>y.id===x.clientId);
  return`<div class="cbar"><a class="back" href="#/clients" data-a="toX" style="margin:0">${I.back}X-контакты</a>${c?`<a class="rbtn" href="#/client/${c.id}" aria-label="Открыть контакт">${I.users}</a>`:''}</div>
  <div class="card chhead">${c?avaHtml(c,'ava'):`<div class="ava xa">${esc(ini({last:xName(x).split(' ')[0],first:xName(x).split(' ')[1]||''}))}</div>`}
    <div><b>${esc(c?fio(c):xName(x))}</b><small>${I.xmark}Пользователь X-Finance${x.company?' · '+esc(x.company):''}</small></div></div>
  <div class="msgs" id="msgs">${bubbles()}</div>
  <form class="chatbar" id="chatf" autocomplete="off"><div class="qk">${QUICK.map(q=>`<button type="button" data-a="qk" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    <div class="cin"><textarea name="text" rows="1" placeholder="Сообщение…" maxlength="2000"></textarea><button class="snd" type="submit" aria-label="Отправить">${I.send}</button></div></form>`;
}
async function loadChat(quiet){
  if(!chatUid)return;const uid=chatUid;
  try{const r=await api('GET','/api/chat/'+uid);if(uid!==chatUid)return;const was=chat?chat.msgs.length:-1;chat=r;
    if(location.hash==='#/chat/'+uid){const m=$('#msgs');if(m&&(!quiet||r.msgs.length!==was)){m.innerHTML=bubbles();scrollChat()}}
    if(!quiet)fetchNotes()}
  catch(e){chat={partner:{name:''},msgs:[]};toast(e.message)}
}
const scrollChat=()=>requestAnimationFrame(()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}));
async function sendChat(f){
  const ta=f.text,t=ta.value.trim();if(!t||!chatUid)return;ta.value='';ta.style.height='';
  const tmp={id:'t'+Date.now(),mine:true,text:t,at:new Date().toISOString(),read:false};chat.msgs.push(tmp);chat.fresh=tmp.id;$('#msgs').innerHTML=bubbles();scrollChat();
  try{const r=await api('POST','/api/chat/'+chatUid,{text:t});Object.assign(tmp,r.msg);chat.fresh=null}catch(e){chat.msgs=chat.msgs.filter(m=>m!==tmp);$('#msgs').innerHTML=bubbles();ta.value=t;toast(e.message)}
}
setInterval(()=>{if(!document.hidden&&location.hash.startsWith('#/chat/'))loadChat(true)},4000);

/* ---------- проверка клиента (по своей базе, включая удалённые контакты) ---------- */
let cq='';
const digits=s=>String(s||'').replace(/\D/g,'');
const normPh=s=>{let d=digits(s);if(d.length===11&&(d[0]==='8'||d[0]==='7'))d=d.slice(1);return d};
function checkFind(qs){
  const t=qs.trim().toLowerCase().replace(/ё/g,'е');if(t.length<2)return null;
  const d=normPh(t),isPh=digits(t).length>=3&&digits(t).length>=t.replace(/[\s()+-]/g,'').length*0.7;
  return db.clients.filter(c=>{
    if(isPh){const raw=digits(t);return[c.phone,c.phone2].some(p=>p&&(normPh(p).includes(d)||digits(p).includes(raw)||('7'+normPh(p)).includes(raw)))}
    const n=fioRaw(c).toLowerCase().replace(/ё/g,'е');return t.split(/\s+/).every(w=>n.includes(w));
  }).map(c=>{
    const cs=db.contracts.filter(x=>x.clientId===c.id).map(x=>({c:x,k:calc(x)})),ds=db.debts.filter(x=>x.contactId===c.id).map(x=>({d:x,k:dcalc(x)}));
    const act=cs.filter(x=>x.k.status!=='done'),over=cs.filter(x=>x.k.status==='overdue'),dIn=ds.filter(x=>x.d.type==='in'&&x.k.left>0),dOver=dIn.filter(x=>x.k.status==='overdue');
    const left=sumBy(act,x=>x.k.left)+sumBy(dIn,x=>x.k.left),oSum=sumBy(over,x=>x.k.overdue)+sumBy(dOver,x=>x.k.left),maxDays=Math.max(0,...over.map(x=>x.k.days),...dOver.map(x=>x.k.days));
    const risk=c.black||oSum>0&&maxDays>30?'bad':oSum>0?'warn':left>0?'mid':'ok',mvC=act.filter(x=>(x.c.shifts||[]).length),mvD=dIn.filter(x=>(x.d.moves||[]).length);
    const tot=sumBy(cs,x=>x.k.fin)+sumBy(ds.filter(x=>x.d.type==='in'),x=>x.k.add),paidAll=sumBy(cs,x=>x.k.paid)+sumBy(ds.filter(x=>x.d.type==='in'),x=>x.k.paid),pct=tot?Math.round(paidAll/tot*100):100;
    /* надёжность 0–100: просрочки (сумма и дни), чёрный список, переносы, доля уже оплаченного */
    let sc=100;if(c.black)sc-=45;if(oSum>0)sc-=25+Math.min(40,Math.round(maxDays/2.5));sc-=8*Math.min(2,mvC.length+mvD.length);if(left>0&&!oSum)sc-=Math.round(22*(1-pct/100));
    return{c,cs,ds,act,over,dIn,dOver,left,oSum,maxDays,risk,mvC,mvD,pct,score:Math.max(3,Math.min(100,sc))};
  }).sort((a,b)=>({bad:0,warn:1,mid:2,ok:3}[a.risk]-{bad:0,warn:1,mid:2,ok:3}[b.risk]));
}
const RISK={bad:['warn','Высокий риск'],warn:['warn','Есть просрочка'],mid:['gold','Платит, есть долг'],ok:['ok','Нет долгов']};
/* карточки «Разработчик» и «Администратор» (статус выдаёт админ-панель) */
const CHKN=[['has','Есть ли долг','Метка «Есть долг» / «Нет долгов»'],['amount','Сумма долга','Сколько человек должен сейчас'],['overdue','Просрочка','Есть ли просрочка по рассрочке или долгу'],
  ['overAmt','Сумма и дни просрочки','Сколько просрочено и самая долгая просрочка'],['moved','Перенос','Перенесённые рассрочки и долги'],['black','Чёрный список','Отметка и причина'],
  ['risk','Оценка риска','«Высокий риск», «Есть просрочка», «Платит»'],['counts','Число рассрочек и долгов','Сколько всего, активных и просроченных']];
let STS=null;
async function loadStaff(sub){try{CHKC=(await api('GET','/api/checkcfg')).cfg}catch(e){}if(sub==='admin')try{STS=await api('GET','/api/staff/stats')}catch(e){STS={error:e.message}}if(location.hash==='#/settings/'+sub&&!$('#layer .ov'))render()}
function staffPage(sub){
  if(!CHKC||sub==='admin'&&!STS)setTimeout(()=>loadStaff(sub),0);
  const cf=chkCfg(),pv=lsGet('xf_chkas')||'';
  const tbl=`<h2>Проверка клиента · что видно</h2>
  <div class="card chkt"><div class="chkth"><span>Показывать</span><b><i class="lg">Бесплатный</i><i class="sh">Беспл.</i></b><b><i class="lg">Платный</i><i class="sh">Платн.</i></b></div>
    ${CHKN.map(([k,t,d])=>`<div class="chktr"><span class="g"><b>${t}</b><small>${d}</small></span><span class="c">${sTog(!!cf.free[k],'chkTog','free:'+k,t+' — бесплатный')}</span><span class="c">${sTog(!!cf.paid[k],'chkTog','paid:'+k,t+' — платный')}</span></div>`).join('')}
    <p class="note" style="margin:10px 14px 14px">Настройки хранятся на сервере и действуют у всех пользователей сразу. Проверка ищет только по своей базе пользователя.</p></div>
  <h2>Посмотреть как</h2>
  <div class="card pad"><div class="seg" style="margin:0">${[['','Мой тариф'],['free','Бесплатный'],['paid','Платный']].map(([v,l])=>`<button class="${pv===v?'on':''}" data-a="chkAs" data-v="${v}">${l}</button>`).join('')}</div>
    <button class="btn soft block" style="margin-top:12px" data-a="goCheck">${I.search}Открыть проверку клиента</button></div>`;
  if(sub==='dev')return tbl+`<h2>Инструменты</h2><div class="card sgrp">${sRow(I.info||I.check,'ink','Сборка',`${BV(BUILD)} · сервер ${VER.sbuild?BV(VER.sbuild):'—'}`,'')}
    ${sRow(I.sync,'sky','Очистить кэш приложения','Скачать файлы заново и перезапустить',sGo(),'data-a="devCache"')}
    ${sRow(I.bell,'ok','Показать баннер уведомления','Проверка анимации и звука',sGo(),'data-a="ntDemo"')}
    ${sRow(I.upl,'gold','Журнал отправки',`Не отправлено: ${obPend()}`,sGo(),'data-a="devOb"')}</div>`;
  const st=STS&&!STS.error?STS:null;
  return`${STS&&STS.error?`<div class="card pad note">${esc(STS.error)}</div>`:''}
  <div class="kpis astat">${st?[[I.users,'sky','Пользователей',st.users,'зарегистрировано'],[I.plus,'ok','Новых за 7 дней',st.new7,''],[I.check,'gold','Платных',st.paid,'оплачено сейчас'],
    [I.card||I.coin,'warn'+(st.payments?' hot':''),'Заявок на оплату',st.payments,'ждут проверки'],[I.lock||I.alert,'ink','Восстановление',st.recovery,'запросов доступа'],[I.doc,'gold','Договоров',st.contracts,'во всех аккаунтах']]
    .map(([ic,t,l,v,sb],i)=>`<div class="card kpi ${t}" style="--i:${i}"><div class="ic">${ic}</div><div class="kb"><div class="l">${l}</div><div class="v">${v}</div>${sb?`<div class="s">${sb}</div>`:''}</div></div>`).join(''):'<div class="card pad muted small">Загрузка…</div>'}</div>
  <div class="row-btns" style="margin:14px 0 0"><a class="btn primary" href="${XB}/admin/" target="_blank" rel="noopener">${I.share}Открыть админ-панель</a><a class="btn soft" href="${XB}/admin/#/base" target="_blank" rel="noopener">${I.doc}База X-Finance</a><a class="btn soft" href="${XB}/admin/#/users" target="_blank" rel="noopener">${I.users}Пользователи и копии</a></div>
  ${st&&st.staff.length?`<h2>Статусы</h2><div class="card rows">${st.staff.map(x=>`<div class="rw"><div class="g"><b>${esc(x.name)}</b></div><span class="chip ${x.staff==='admin'?'gold':'ok'}">${x.staff==='admin'?'Администратор':'Разработчик'}</span></div>`).join('')}</div>`:''}
  ${tbl}`;
}
/* что видно в проверке — по тарифу (настраивают «Разработчик» и «Администратор»: Настройки → карточка, сервер /api/checkcfg) */
const CHK_DEF={free:{has:true,amount:false,overdue:true,overAmt:false,moved:true,black:true,risk:true,counts:true},paid:{has:true,amount:true,overdue:true,overAmt:true,moved:true,black:true,risk:true,counts:true}};
let CHKC=null;
const chkCfg=()=>CHKC||(info&&info.checkCfg)||CHK_DEF;
const chkPlan=()=>{const pv=me&&me.staff&&lsGet('xf_chkas');if(pv==='free'||pv==='paid')return pv;return!LOCAL&&curTariff().status==='paid'?'paid':'free'};
let CKR=[];
/* подробная карточка клиента из проверки: телефон — снизу, компьютер — окно по центру */
function ckDetail(x){
  const plan=chkPlan(),f={...CHK_DEF[plan],...(chkCfg()[plan]||{})},[t,l]=RISK[x.risk],c=x.c,ph=c.phone||c.phone2||'';
  const st=k=>({done:['ok','Выплачено'],overdue:['warn','Просрочка'],active:['gold','Платит']}[k]||['gold','Платит']);
  const row=(href,ic,title,sub,k,amt)=>{const[ct,cl]=st(k.status);return`<a class="ckl" href="${href}" data-a="close"><span class="ci">${ic}</span><span class="g"><b>${title}</b><small>${sub}</small><span class="bar"><i style="width:${Math.round(k.pct||0)}%"></i></span></span><span class="r">${f.amount?`<b>${money(amt)}</b>`:''}${f.overdue||k.status!=='overdue'?`<i class="chip ${ct}">${cl}</i>`:''}</span></a>`};
  const fs=(c.files||[]).filter(z=>fileUrl(z)),mp=fs.find(z=>z.id===c.mainPhoto&&z.type!=='application/pdf');
  return`<div class="ckd ${x.risk}"><div class="ckdh">${mp?`<button type="button" class="ckr big ph" style="--p:${f.risk?x.score:100}" data-a="view" data-c="${c.id}" data-id="${mp.id}" aria-label="Открыть фото"><span><img src="${fileUrl(mp)}" alt=""></span>${f.risk?`<b class="ckb">${x.score}</b>`:''}</button>`:`<span class="ckr big" style="--p:${f.risk?x.score:100}"><span>${f.risk?`${x.score}<small>из 100</small>`:esc(ini(c))}</span></span>`}
    <div class="g"><b>${esc(fio(c))}</b><small>${esc(ph||'телефон не указан')}${c.deleted?' · удалён':''}</small>${f.risk||f.has?`<i class="chip ${t}">${f.risk?l:x.left>0?'Есть долг':'Нет долгов'}</i>`:''}</div></div>
    <div class="ckda">${ph?`<a class="btn soft" href="tel:${esc(ph)}">${I.phone}Позвонить</a><a class="btn wa" href="https://wa.me/${waPhone(ph)}" target="_blank" rel="noopener">${I.wa}WhatsApp</a>`:''}<a class="btn primary" href="#/client/${c.id}" data-a="close">${I.users}Карточка клиента</a></div>
    ${f.black&&c.black?`<div class="bw">${I.ban}<div><b>В чёрном списке</b><span>${esc(c.blackNote||'Причина не указана')}</span></div></div>`:''}
    <div class="ckm"><div><small>Должен сейчас</small><b>${f.amount?money(x.left):x.left>0?'Есть долг':'Нет'}</b></div>
      <div><small>Просрочено</small><b class="${x.oSum?'xr':''}">${f.overdue?(x.oSum?(f.overAmt?money(x.oSum):'Есть'):'Нет'):'—'}</b></div>
      <div><small>Самая долгая</small><b class="${x.maxDays?'xr':''}">${f.overdue&&f.overAmt&&x.maxDays?pdays(x.maxDays):'—'}</b></div>
      <div><small>Оплачено</small><b>${x.pct}%</b><span class="bar"><i style="width:${x.pct}%"></i></span></div></div>
    ${fs.length?`<h3 class="ckh">Документы · ${fs.length}</h3><div class="ckdocs">${fs.map(z=>`<button type="button" class="${z.id===c.mainPhoto?'m':''}" data-a="view" data-c="${c.id}" data-id="${z.id}">${z.type==='application/pdf'?`<span class="pdf">${I.file}PDF</span>`:`<img src="${fileUrl(z)}" alt="" loading="lazy">`}<small>${esc(dkName(z.kind))}</small>${z.id===c.mainPhoto?`<i>${I.star}</i>`:''}</button>`).join('')}</div>`:''}
    ${f.moved&&(x.mvC.length+x.mvD.length)?`<div class="chkn chkmv">${I.cal}Перенос: ${[x.mvC.length&&plural(x.mvC.length,['рассрочка','рассрочки','рассрочек']),x.mvD.length&&plural(x.mvD.length,['долг','долга','долгов'])].filter(Boolean).join(' · ')}</div>`:''}
    ${x.cs.length?`<h3 class="ckh">Рассрочки · ${x.cs.length}</h3><div class="card rows">${x.cs.map(({c:k,k:kk})=>row('#/contract/'+k.id,I.doc,`№${k.no} · ${esc(k.item)}`,`${dmy(k.date)} · ${k.months} мес.`,kk,kk.left)).join('')}</div>`:''}
    ${x.ds.length?`<h3 class="ckh">Долги · ${x.ds.length}</h3><div class="card rows">${x.ds.map(({d,k})=>row('#/debt/'+d.id,I.coin,d.type==='in'?'Должен мне':'Я должен',d.due?'срок '+dmy(d.due):'без срока',k,k.left)).join('')}</div>`:''}
    ${!x.cs.length&&!x.ds.length?`<div class="card pad muted small">Рассрочек и долгов с этим человеком пока не было.</div>`:''}</div>`;
}
function checkResults(){
  const r=checkFind(cq),plan=chkPlan(),f={...CHK_DEF[plan],...(chkCfg()[plan]||{})};
  if(!r)return`<div class="chkhint">${I.search}<b>Проверка клиента</b><span>Введите номер телефона или фамилию, имя, отчество. Приложение покажет все рассрочки, долги и просрочки этого человека в вашей базе.</span></div>`;
  if(!r.length)return`<div class="card">${empty(I.search,'Не найден','В вашей базе нет человека с такими данными. Значит, у вас с ним ещё не было рассрочек и долгов.')}</div>`;
  const hid=!f.amount||!f.overAmt;CKR=r;
  return(hid&&plan==='free'?`<div class="card chkfree">${I.star||I.check}<span><b>Бесплатный тариф</b><small>${!f.amount?'Суммы долга скрыты':'Суммы просрочки скрыты'} — видно, есть ли долг, просрочка и перенос.</small></span><a class="btn sm soft" href="#/tariff">Тарифы</a></div>`:'')+
  `<div class="cksum">${['bad','warn','mid','ok'].map(k=>{const n=r.filter(x=>x.risk===k).length;return n?`<span class="${k}"><i></i>${{bad:'Высокий риск',warn:'Просрочка',mid:'Платит',ok:'Без долгов'}[k]} · ${n}</span>`:''}).join('')}</div>
  <div class="ckq">${r.map((x,i)=>{const[t,l]=RISK[x.risk],mv=f.moved&&(x.mvC.length+x.mvD.length),bl=f.black&&x.c.black,hasD=x.left>0;
    return`<button class="card ckt ${x.risk}" data-a="ckOpen" data-id="${x.c.id}" style="--i:${i}"><span class="ckf">${bl?`<i class="k" title="Чёрный список">${I.ban}</i>`:''}${mv?`<i class="v" title="Перенос">${I.cal}</i>`:''}</span>
      <span class="ckr" style="--p:${f.risk?x.score:100}"><span>${f.risk?`${x.score}<small>из 100</small>`:esc(ini(x.c))}</span></span>
      <b class="nm">${esc(fio(x.c))}</b><span class="st">${f.risk?l:f.has?(hasD?'Есть долг':'Нет долгов'):''}</span>
      <span class="am"><b>${f.amount?money(x.left):hasD?'Есть долг':'Нет долга'}</b><small>${f.overdue&&x.oSum?(f.overAmt?'просрочка '+pdays(x.maxDays):'есть просрочка'):hasD?'без просрочек':'всё оплачено'}</small></span></button>`}).join('')}</div>`;
}
const checkPage=()=>`<div class="top"><div><h1>Проверка клиента</h1><div class="sub">Поиск по вашей базе: рассрочки, долги, просрочки</div></div></div>
  <div class="chks">${I.search}<input class="search" id="cq" placeholder="Телефон или ФИО" value="${esc(cq)}" inputmode="search" autocomplete="off" enterkeyhint="search"></div>
  <div id="ckr">${checkResults()}</div>`;

/* ---------- панель уведомлений (колокольчик) ---------- */
let npOpen=false,ntab='notes';
function noteItem(x,compact){
  const[ic,t]=NK[x.kind]||['bell','ink'];
  const act=x.kind==='share'?(x.status==='pending'?`<div class="nact"><button class="btn sm primary" data-a="shAcc" data-id="${x.ref}">${I.check}Принять</button><button class="btn sm" data-a="shDec" data-id="${x.ref}">Отклонить</button></div>`
    :`<span class="chip ${x.status==='accepted'?'ok':''}" style="margin-top:8px">${x.status==='accepted'?'Доступ открыт':x.status==='declined'?'Отклонено':'Закрыто'}</span>`):x.kind==='prop'?(x.status==='pending'?`<div class="nact"><button class="btn sm primary" data-a="propAcc" data-id="${x.ref}">${I.check}Принять</button><button class="btn sm" data-a="propDec" data-id="${x.ref}">Отклонить</button></div>`
    :`<span class="chip ${x.status==='accepted'?'ok':''}" style="margin-top:8px">${x.status==='accepted'?'Оплата принята':x.status==='declined'?'Отклонено':'Закрыто'}</span>`):x.kind==='link'?(x.status==='pending'?`<div class="nact"><button class="btn sm primary" data-a="linkAcc" data-id="${x.ref}">${I.check}Принять</button><button class="btn sm" data-a="linkDec" data-id="${x.ref}">Отклонить</button></div>`
    :`<span class="chip ${x.status==='accepted'?'ok':''}" style="margin-top:8px">${x.status==='accepted'?'Принято':'Отклонено'}</span>`):'';
  return`<div class="rw nt${x.read?'':' new'}" data-note="${x.id}"><div class="n ${t}">${I[ic]}</div>
    <div class="g"${x.url&&x.kind!=='link'?` data-a="noteGo" data-id="${x.id}" data-u="${esc(x.url)}" style="cursor:pointer"`:''}><b>${esc(x.title)}</b><small class="nb">${esc(x.body)}</small><small>${x.read?'':'<i class="dotn"></i>'}${ago(x.created)}</small>${act}</div>
    <button class="x nx" data-a="noteDel" data-id="${x.id}" aria-label="Закрыть уведомление">${I.x}</button></div>`;
}
const tm=t=>{const d=new Date(t),n=new Date();return(d.toDateString()===n.toDateString()?'':d.toLocaleDateString('ru-RU',{day:'numeric',month:'short'})+' ')+d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})};
function obRow(e){
  const pend=e.st!=='ok',go=e.st==='go',ic=e.t==='file'?I.file:e.t==='del'?I.trash:e.t==='log'?I.card:e.kind==='client'?I.users:e.kind==='contract'?I.doc:e.kind==='debt'?I.rub:I.chart;
  const what=e.t==='file'?'Документ':e.t==='del'?'Удаление':e.t==='log'?(e.sub||'Отчёт'):'Сохранение';
  const st=go?'Отправляется…':e.st==='ok'?'Отправлено':e.st==='wait'?'Не отправлено — нет связи':'Ошибка: '+e.err;
  return`<div class="rw ob ${e.st}" data-ob="${e.id}">${pend?'<i class="obdot"></i>':''}<div class="n">${ic}</div>
    <div class="g"><b>${esc(e.title)}</b><small>${esc(what)} · ${tm(e.at||e.ts)}</small><small class="obs">${e.st==='ok'?I.check:''}${esc(st)}</small></div>
    ${pend?`<button class="obb${go?' go':''}" data-a="obGo" data-id="${e.id}" aria-label="${e.st==='err'?'Повторить':'Отправить'}" title="${e.st==='err'?'Повторить':'Отправить'}">${e.st==='err'?I.sync:I.upl}</button>`:'<span class="obok">'+I.cloud+'</span>'}</div>`;
}
function npBody(){
  if(LOCAL&&ntab!=='ops')return`<div class="obh">${I.cloud}<div><b>${ntab==='out'?'Данные хранятся на этом устройстве':'Локальный режим'}</b><small>${ntab==='out'?'Без сервера ничего не отправляется. Резервная копия — в Настройках.':'Уведомления, приглашения и отправка на сервер работают, когда приложение открыто с сервера и вы вошли в аккаунт.'}</small></div></div>`+(ntab==='notes'?`<button class="npall" data-a="ntab" data-t="ops">Посмотреть все операции${I.back}</button>`:'');
  if(ntab==='out'){const pn=obPend(),list=OB.slice().sort((a,b)=>(b.st!=='ok')-(a.st!=='ok')||(b.at||b.ts)-(a.at||a.ts));
    return`<div class="obh ${pn?'warn':''}">${pn?I.alert:I.cloud}<div><b>${pn?plural(pn,['изменение не отправлено','изменения не отправлены','изменений не отправлено']):'Всё отправлено на сервер'}</b><small>${pn?'Хранятся на устройстве и уйдут сами, когда появится связь':syncAt?'Последняя синхронизация '+tm(syncAt):'Изменения, документы и отчёты'}</small></div>${pn?`<button class="btn sm primary" data-a="obAll">${I.upl}Отправить всё</button>`:''}</div>`
      +(list.length?list.map(obRow).join(''):empty(I.cloud,'Пока ничего не отправлялось','Здесь появится каждое изменение: контакты, договоры, долги, платежи, фото документов и заявки.'));}
  if(ntab==='ops'){const ops=allOps().slice(0,25);
    return ops.length?ops.map(o=>`<a class="rw op ${o.tone}" href="${o.href}" data-a="npClose"><div class="n">${o.icon}</div><div class="g"><b>${esc(o.who)}</b><small>${esc(o.title)} · ${dmy(o.date)}</small></div><div class="am num">${o.kind==='shift'?'':o.sign+money(o.amount)}</div></a>`).join('')
      +`<a class="npall" href="#/ops" data-a="npClose">Все операции${I.back}</a>`:empty(I.list,'Операций пока нет');}
  const n=NI.notes;if(!n)return`<div class="pad muted small">Загрузка…</div>`;
  return n.length?n.slice(0,40).map(x=>noteItem(x,1)).join('')+`<a class="npall" href="#/inbox" data-a="npClose">Все уведомления и общие долги${I.back}</a>`
    :empty(I.bell,'Уведомлений нет','Здесь будут приглашения, подтверждения от должников, ответы на оплату тарифа и сообщения.');
}
function npRender(){
  const p=$('#np');if(!p)return;const u=NI.unread||0;
  p.querySelector('.nph').innerHTML=`<div><b>Уведомления</b><small>${u?plural(u,['непрочитанное','непрочитанных','непрочитанных']):'Всё прочитано'}</small></div>
    ${u?`<button class="btn sm soft" data-a="noteAll">${I.check}Прочитано</button>`:''}<button class="x" data-a="npClose" aria-label="Закрыть">${I.x}</button>`;
  const pn=obPend();
  p.querySelector('.npt').innerHTML=`<button class="${ntab==='notes'?'on':''}" data-a="ntab" data-t="notes">Уведомления${u?`<em>${u}</em>`:''}</button><button class="${ntab==='ops'?'on':''}" data-a="ntab" data-t="ops">Операции</button><button class="${ntab==='out'?'on':''}" data-a="ntab" data-t="out">Отправка${pn?`<em>${pn}</em>`:''}</button>`;
  p.querySelector('.npl').innerHTML=npBody();
}
function npToggle(open,silent){
  npOpen=open;const old=$('#npw');
  if(!open){document.removeEventListener('keydown',pmKey);if(old){old.classList.add('closing');setTimeout(()=>old.remove(),200)}bell();if(!silent)ovDone('np');return}
  ovOpen('np',()=>npToggle(false,true));
  if(old)old.remove();
  const w=document.createElement('div');w.id='npw';w.className='npw';w.dataset.a='npOut';
  w.innerHTML=`<div class="np" id="np"><div class="nph"></div><div class="seg npt"></div><div class="npl rows"></div></div>`;document.body.append(w);npRender();bell();fetchNotes();
}
/* ---------- установка и размер интерфейса ---------- */
const XS=window.XS||{state:()=>['info','',''],f:1,setZoom(){},install:async()=>false};
const APP_VER='2.6',BUILD=46;   // BUILD — номер сборки (V15): +1 при каждом выпуске, вместе с version.json, server/package.json и CACHE в sw.js
async function appUpdate(){
  if(!navigator.onLine)return toast('Нет интернета — обновить сейчас нельзя');
  try{const r=await fetch('index.html?_='+Date.now(),{cache:'no-store'});if(!r.ok)throw 0}catch(e){return toast('Сервер с приложением недоступен — попробуйте позже')}
  toast('Загружаю свежую версию…');
  try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg)await reg.update().catch(()=>{});
    const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('xfinance')).map(k=>caches.delete(k)))}catch(e){}
  setTimeout(()=>location.reload(),500)}
const ZS=[[.9,'Меньше'],[1,'Обычный'],[1.1,'Крупнее'],[1.2,'Крупный']];
function instCard(){
  const[k,t,x]=XS.state(),ic=k==='ok'?I.check:k==='warn'?I.alert:I.share;
  return`<div class="card inst ${k}"><span class="ci">${ic}</span><div><b>${t}</b><small>${esc(x)}</small>${location.protocol.startsWith('http')?`<div class="iver"><span>Сборка ${BV(BUILD)}</span><button class="btn sm soft" data-a="appUpd">${I.sync}Обновить приложение</button></div>`:''}
    ${k==='go'?`<button class="btn primary sm" data-a="install" style="margin-top:10px">${I.plus}Установить</button>`:''}</div></div>`;
}
function zoomCard(){
  return`<div class="card pad"><div class="zh"><b>Размер интерфейса</b><small>Только на этом устройстве · на компьютере также Ctrl + / Ctrl −</small></div>
  <div class="seg zs" style="margin:10px 0 0">${ZS.map(([v,l])=>`<button class="${Math.abs(XS.f-v)<.01?'on':''}" data-a="zoom" data-v="${v}">${l}</button>`).join('')}</div></div>`;
}
const instBanner=()=>{let off=false;try{off=localStorage.getItem('xf_inst_x')==='1'}catch(e){}
  const k=XS.state()[0];if(off||!(k==='go'||k==='ios'))return'';
  return`<div class="card ibn"><img src="icon-192.png" alt=""><div><b>X-Finance на ${XS.ios?'экран «Домой»':'рабочий стол'}</b><span>${k==='go'?'Открывается в своём окне, работает без сети':'«Поделиться» → «На экран „Домой“»'}</span></div>
  ${k==='go'?`<button class="btn primary sm" data-a="install">Установить</button>`:''}<button class="x" data-a="instX" aria-label="Скрыть">${I.xmark}</button></div>`};
/* ---------- сервер: пинг в кнопке «Обновить» и раздел «Сервер» в Настройках ---------- */
const PG={on:lsGet('xf_ping')==='1',ms:null,hist:[],at:0,busy:false};let SRV=null,srvAt=0;
const pq=ms=>ms==null?'off':ms<100?'good':ms<250?'mid':'bad';
const pqName=ms=>ms==null?'Нет связи':ms<100?'Отлично':ms<250?'Нормально':'Медленно';
async function pingNow(){if(LOCAL||PG.busy)return PG.ms;PG.busy=true;let best=null;
  for(let i=0;i<2;i++){const t0=performance.now();try{const r=await fetch(U('/api/ping?_='+Date.now()),{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw 0;await r.json();const ms=Math.round(performance.now()-t0);best=best==null?ms:Math.min(best,ms)}catch(e){best=null;break}}
  PG.ms=best;PG.at=Date.now();PG.hist=[...PG.hist,best].slice(-24);PG.busy=false;bell();
  const v=$('#pgv');if(v){v.className='pgv '+pq(best);v.innerHTML=best==null?'нет связи':best+' <small>мс</small>';const n=$('#pgq');if(n)n.textContent=pqName(best);const sp=$('#pgs');if(sp)sp.innerHTML=spark()}const hs=$('#hsrv');if(hs)hs.innerHTML=hubSrv();
  return best}
setInterval(()=>{if(document.hidden)return;if(PG.on||location.hash.startsWith('#/settings'))pingNow();if(location.hash.startsWith('#/settings')&&!$('#layer .ov'))svPingAll()},8000);
async function loadServer(force){if(LOCAL||(!force&&SRV&&Date.now()-srvAt<20000))return;srvAt=Date.now();try{SRV=await api('GET','/api/server')}catch(e){SRV={error:e.message}}if(location.hash.startsWith('#/settings')&&!$('#layer .ov')){const b=$('#srvb');if(b)b.innerHTML=serverRows()}}
const dur=s=>{s=+s||0;const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return d?`${d} д ${h} ч`:h?`${h} ч ${m} мин`:`${m} мин`};
const gb=b=>(b/1073741824).toLocaleString('ru-RU',{maximumFractionDigits:1})+' ГБ';
function spark(){const h=PG.hist.filter(x=>x!=null);if(h.length<2)return'';const mx=Math.max(...h,120),w=120,hh=26;
  return`<svg viewBox="0 0 ${w} ${hh}" class="spk"><polyline fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${PG.hist.map((v,i)=>`${Math.round(i*w/(PG.hist.length-1||1))},${v==null?hh-1:Math.round(hh-2-(v/mx)*(hh-6))}`).join(' ')}"/></svg>`}
function serverRows(){
  const r=SRV||{},err=r.error;
  return kv('Адрес',`<span class="sel">${esc(location.host+XB)}</span>`)+
    kv('Состояние',stale?'<span class="warn">Нет связи — копия на устройстве</span>':err?'<span class="warn">'+esc(err)+'</span>':'<span class="okc">В сети</span>')+
    kv('Защищённое соединение',location.protocol==='https:'?'<span class="okc">Да, https</span>':'<span class="warn">Нет — нужен https</span>')+
    (r.os?kv('Система сервера',esc(r.os)+(r.arch?' · '+esc(r.arch):'')):'')+
    (r.build||r.version?kv('Сборка сервера',r.build?BV(r.build):esc(r.version)):'')+(r.node?kv('Node.js',esc(r.node)):'')+
    (r.uptime!=null?kv('Сервер работает',dur(r.uptime)):'')+
    (r.mem?kv('Память',`свободно ${gb(r.mem.free)} из ${gb(r.mem.total)}`):'')+
    (r.cpus?kv('Нагрузка',`${String(r.load).replace('.',',')} · ядер: ${r.cpus}`):'')+
    kv('Синхронизация',syncAt?new Date(syncAt).toLocaleString('ru-RU',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—');
}
const CMDS=[['Состояние службы','sudo systemctl status xfinance'],['Перезапустить','sudo systemctl restart xfinance'],['Журнал (последние 100 строк)','sudo journalctl -u xfinance -n 100 --no-pager'],
  ['Обновить с GitHub','cd ~/x-finance && git pull && sudo bash server/install.sh'],['Копия всех данных','sudo tar czf ~/xfinance-$(date +%F).tar.gz -C /opt/xfinance data'],
  ['Код создания администратора','sudo cat /opt/xfinance/data/ADMIN-SETUP-CODE.txt'],['Обновить систему Ubuntu','sudo apt update && sudo apt upgrade -y']];
/* ---------- несколько серверов: основной, резервный, домашний; приоритет, пинг, автопереключение ----------
   Список хранится на устройстве (localStorage.xf_srv), порядок = приоритет. Каждый сервер — отдельная база X-Finance
   (своя установка на Ubuntu); резервный сервер получает данные из резервной копии основного. */
const SROLE={main:['Основной','ok'],backup:['Резервный','gold'],home:['Домашний','sky']};
const sNorm=u=>{try{u=String(u||'').trim();if(!/^https?:\/\//i.test(u))u='https://'+u;const x=new URL(u);return x.origin+x.pathname.replace(/\/(index\.html)?$/,'').replace(/\/+$/,'')}catch(e){return''}};
/* сервер по умолчанию: на этом устройстве (xf_def) → адрес сервиса от сервера (админ-панель / PUBLIC_URL) → https://xstoreapps.ru/xfinance */
const DEF_SRV='https://xstoreapps.ru/xfinance';
const defSrv=()=>sNorm(lsGet('xf_def'))||sNorm(info&&info.publicUrl)||DEF_SRV;
function svList(){let l=[];try{l=JSON.parse(localStorage.getItem('xf_srv')||'[]')}catch(e){}
  if(!Array.isArray(l))l=[];const cur=location.protocol.startsWith('http')&&!LOCAL?SELF:'';
  const df=defSrv();if(lsGet('xf_def_add')!==df&&!l.some(s=>s.url===df)){l.push({id:uid(),name:'X-Finance · '+df.replace(/^https?:\/\//,''),url:df,role:l.some(s=>s.role==='main')||cur&&cur!==df?'backup':'main'});svSave(l);try{localStorage.setItem('xf_def_add',df)}catch(e){}}
  if(cur&&!l.some(s=>s.url===cur)){l.unshift({id:uid(),name:'Основной сервер',url:cur,role:l.some(s=>s.role==='main')?'backup':'main'});svSave(l)}
  return l}
function svSave(l){try{localStorage.setItem('xf_srv',JSON.stringify(l))}catch(e){}}
const SVP={};let svBusy=false;
async function svPing1(s){
  if(location.protocol==='https:'&&s.url.startsWith('http:'))return SVP[s.id]={ms:null,why:'https',at:Date.now()};
  const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),5000),t0=performance.now();
  try{const r=await fetch(s.url+'/api/ping?_='+Date.now(),{cache:'no-store',mode:'cors',signal:ac.signal});if(!r.ok)throw 0;const j=await r.json();
    return SVP[s.id]={ms:Math.round(performance.now()-t0),v:j.v||'',b:j.b||0,os:j.os||'',at:Date.now()}}
  catch(e){return SVP[s.id]={ms:null,why:'off',at:Date.now()}}finally{clearTimeout(tm)}}
async function svPingAll(){if(svBusy)return;svBusy=true;const l=svList();await Promise.all(l.map(svPing1));svBusy=false;const b=$('#svl');if(b)b.innerHTML=svRows();const h=$('#hsrv');if(h)h.innerHTML=hubSrv()}
const svAuto=()=>lsGet('xf_srv_auto')==='1';
function svRows(){
  const l=svList(),cur=!LOCAL&&location.protocol.startsWith('http')?SELF:'';
  if(!l.length)return`<div class="sve">${I.cloud}<b>Серверов пока нет</b><small>Добавьте адрес вашего сервера X-Finance — основного, резервного или домашнего.</small></div>`;
  return l.map((s,i)=>{const[rn,rt]=SROLE[s.role]||SROLE.backup,p=SVP[s.id],on=s.url===cur,ms=p&&p.ms,q=!p?'wait':ms==null?'off':pq(ms);
    const pt=!p?'…':ms!=null?`${ms} мс`:p.why==='https'?'нужен https':'нет связи';
    return`<div class="svr${on?' cur':''}"><span class="svn">${i+1}</span>
      <span class="svd ${q}"><i></i></span>
      <span class="st"><b>${esc(s.name)}<em class="svrole ${rt}">${rn}</em>${on?'<em class="svrole cur">Активный</em>':''}</b><small class="sel">${esc(s.url.replace(/^https?:\/\//,''))}</small>
        <small class="svq ${q}">${pt}${p&&(p.b||p.v)?` · ${p.b?'сборка V'+p.b:'версия '+esc(p.v)}`:''}${p&&p.os?` · ${esc(p.os)}`:''}</small></span>
      <span class="sva">${i?`<button class="x" data-a="svUp" data-id="${s.id}" aria-label="Повысить приоритет">${I.back}</button>`:''}${i<l.length-1?`<button class="x dn" data-a="svDn" data-id="${s.id}" aria-label="Понизить приоритет">${I.back}</button>`:''}
        ${on?'':`<button class="btn sm ${ms!=null?'primary':'soft'}" data-a="svGo" data-id="${s.id}">Подключиться</button>`}<button class="x" data-a="svEdit" data-id="${s.id}" aria-label="Изменить">${I.edit}</button></span></div>`}).join('');
}
function svForm(s){const e=!!s;s=s||{role:svList().some(x=>x.role==='main')?'backup':'main'};
  sheet(e?'Сервер':'Добавить сервер',`<div class="svroles">${Object.entries(SROLE).map(([k,[n,t]])=>`<label class="svro ${t}"><input type="radio" name="role" value="${k}"${s.role===k?' checked':''}><span>${k==='main'?I.cloud:k==='backup'?I.sync:I.home}<b>${n}</b><small>${k==='main'?'Рабочий, приоритет 1':k==='backup'?'На случай сбоя':'Дома, свой компьютер'}</small></span></label>`).join('')}</div>
    ${fld('Название','name',s.name||'','placeholder="Например: Сервер в Грозном"')}${fld('Адрес','url',s.url||'','inputmode="url" autocapitalize="none" spellcheck="false" placeholder="https://xfinance.tuna.am"')}
    <div class="gstate" id="svst">После ввода адреса нажмите «Проверить связь»</div>
    <div class="row-btns" style="margin-bottom:12px"><button type="button" class="btn soft" data-a="svTest">${I.sync}Проверить связь</button>${e?`<button type="button" class="btn danger" data-a="svDel" data-id="${s.id}">Удалить</button>`:''}</div>`,
    f=>{const url=sNorm(f.url);if(!url)return'Укажите адрес сервера';const l=svList();if(l.some(x=>x.url===url&&x.id!==s.id))return'Этот адрес уже есть в списке';
      const it={id:s.id||uid(),name:(f.name||'').trim()||SROLE[f.role][0]+' сервер',url,role:f.role||'backup'};
      if(e)l[l.findIndex(x=>x.id===s.id)]=it;else if(it.role==='main')l.unshift(it);else l.push(it);svSave(l);render();toast(e?'Сервер сохранён':'Сервер добавлен')},e?'Сохранить':'Добавить')}
const SETUP=[['Подключитесь к серверу по SSH','ssh имя@адрес-сервера'],['Скачайте X-Finance','sudo apt update && sudo apt install -y git && git clone https://github.com/ВАШ-АККАУНТ/x-finance.git && cd x-finance'],
  ['Установите (Node.js 22, база, служба)','sudo bash server/install.sh'],['Откройте доступ по https через Tuna','tuna http 3000'],
  ['Перенести базу с основного сервера (для резервного)','sudo systemctl stop xfinance && sudo cp ~/xfinance-*.db /opt/xfinance/data/xfinance.db && sudo systemctl start xfinance']];
function serversCard(){
  const l=svList();setTimeout(svPingAll,60);
  return`<h2>Серверы</h2>
  <div class="card svc"><div class="svh"><span class="sic ok">${I.cloud}</span><span class="st"><b>Основной, резервный и домашний</b><small>Номер в списке — приоритет. Стрелками ↑↓ меняйте порядок</small></span>
    <button class="btn sm primary" data-a="svAdd">${I.plus}Добавить</button></div>
    <div id="svl" class="svl">${svRows()}</div>
    ${sRow(I.home,'ok','Сервер по умолчанию',esc(defSrv().replace(/^https?:\/\//,''))+(lsGet('xf_def')?' · задан на этом устройстве':info&&info.publicUrl?' · адрес от сервера':''),`<span class="svdb">${SELF===defSrv()?'':`<a class="btn sm soft" href="${esc(defSrv())}/">Открыть</a>`}<button class="btn sm" data-a="defSrv">${I.edit}Изменить</button></span>`)}
    ${sRow(I.sync,'gold','Автопереключение на резервный','Если активный сервер не отвечает, открыть следующий по приоритету',sTog(svAuto(),'svAutoTog','','Автопереключение'))}
    <div class="svf"><button class="btn sm soft" data-a="svCheck">${I.sync}Проверить все</button><span>Пинг обновляется каждые 8 секунд</span></div></div>
  <h2>Установка сервера · Ubuntu 24.04</h2>
  <div class="card svsetup">${SETUP.map(([t,c],i)=>`<div class="sst"><span class="ssn">${i+1}</span><div class="g"><b>${t}</b><code class="sel">${esc(c)}</code></div><button class="x" data-a="copyCmd" data-v="${esc(c)}" aria-label="Скопировать">${I.copy}</button></div>`).join('')}
    <p class="note" style="margin:6px 4px 4px">Резервный и домашний сервер — отдельная установка X-Finance со своей базой. Чтобы данные совпадали, скачайте копию базы в админ-панели основного сервера («Система» → «Резервные копии») и перенесите её командой 5. Домашний сервер (например, ТВ-приставка с Armbian) подключается так же; из приложения по https он доступен через Tuna.</p></div>`;
}
function serverBlock(){
  if(LOCAL)return`<h2>Сервер</h2><div class="card pad note">Сейчас приложение работает без сервера X-Finance (открыто с диска или со статического хостинга, например GitHub Pages): данные хранятся только на этом устройстве, вход, синхронизация и уведомления недоступны. Чтобы всё это работало, установите сервер на Ubuntu 24.04 (инструкция в README.md) и откройте его адрес https://…</div>`+serversCard();
  loadServer();if(PG.ms==null&&!PG.busy&&Date.now()-PG.at>3000)setTimeout(pingNow,50);
  return`<h2>Активный сервер</h2>
  <div class="card pgc"><div class="pgh"><div><small>Пинг до сервера</small><div id="pgv" class="pgv ${pq(PG.ms)}">${PG.ms==null?(PG.at?'нет связи':'…'):PG.ms+' <small>мс</small>'}</div><span id="pgq" class="pgq">${PG.at?pqName(PG.ms):'Проверяю…'}</span></div>
    <div class="pgr"><span id="pgs">${spark()}</span><button class="btn sm soft" data-a="pingNow">${I.sync}Проверить</button></div></div>
    <div class="sw" style="border-top:1px solid var(--line)"><div>Показывать пинг на главном экране<small>В кружке кнопки «Обновить» вверху справа</small></div><button class="tog${PG.on?' on':''}" data-a="pingTog" aria-label="Показывать пинг"></button></div></div>
  <div class="card kvs" id="srvb" style="margin-top:10px">${serverRows()}</div>
  <h2>Обслуживание сервера · Ubuntu 24.04</h2>
  <div class="card rows cmds">${CMDS.map(([l,c])=>`<div class="cmd"><div class="g"><b>${l}</b><code class="sel">${esc(c)}</code></div><button class="x" data-a="copyCmd" data-v="${esc(c)}" aria-label="Скопировать">${I.copy}</button></div>`).join('')}</div>
  <p class="note" style="margin:8px 4px 0">Команды вводятся в терминале сервера (SSH). Сервер работает на Ubuntu 24.04 и новее; установка и обновление — <code>sudo bash server/install.sh</code> из папки проекта.</p>`+serversCard();
}
/* ---------- тарифы (встроены в приложение; сервер их обновляет) ---------- */
const TDEF={name:'Старт',freeUntil:'2027-03-18',price:0,features:'Все функции X-Finance без ограничений: рассрочки, долги, контакты, инвесторы, уведомления, резервные копии',pay:''};
function tPlan(){let t=null;try{t=JSON.parse(localStorage.getItem('xf_tariff')||'null')}catch(e){}return{...TDEF,...(t||{})}}
function tSave(t){if(!t||!t.freeUntil)return;const{name,freeUntil,price,features,pay}=t;try{localStorage.setItem('xf_tariff',JSON.stringify({name,freeUntil,price,features,pay}))}catch(e){}}
function tCalc(p,paid){const d=today(),until=paid&&paid>p.freeUntil?paid:p.freeUntil;
  return{...p,paidUntil:paid||'',until,status:d<=p.freeUntil&&!(paid>p.freeUntil)?'free':d<=until?'paid':'expired',daysLeft:Math.max(0,Math.round((new Date(until)-new Date(d))/864e5))}}
function curTariff(){const s=(TF&&TF.tariff)||(me&&me.tariff);if(s){tSave(s);return s}return tCalc(tPlan(),'')}
let TF=null;
async function loadTariff(){if(LOCAL)return;try{TF=await api('GET','/api/tariff');if(location.hash.startsWith('#/account'))setTimeout(()=>{if(!$('#layer .ov'))render()},0);if(me)me.tariff=TF.tariff;tSave(TF.tariff)}catch(e){TF={error:e.message}}if(/^#\/(tariff|settings)/.test(location.hash)&&!$('#layer .ov'))render()}
const tStat=t=>t.status==='free'?['ok','Бесплатно']:t.status==='paid'?['ok','Оплачен']:['warn','Закончился'];
function tariffCard(){
  if(!LOCAL&&!TF&&!stale)loadTariff();const t=curTariff();
  const[c,l]=tStat(t),total=Math.max(1,Math.round((new Date(t.until)-new Date('2026-01-01'))/864e5)),pct=Math.min(100,t.daysLeft/total*100);
  return`<a class="card tcard" href="#/tariff"><div class="tch"><div><small>Текущий тариф</small><b>${esc(t.name)}</b></div><span class="chip ${c}">${l}</span></div>
    <div class="tcv">${t.status==='expired'?'Продлите тариф':t.status==='free'?'Бесплатно до '+fdate(t.until):'Оплачен до '+fdate(t.until)}</div>
    <div class="bar"><b style="width:${pct}%"></b></div><div class="tcs"><span>${t.status==='expired'?'Доступ ограничен':'Осталось '+plural(t.daysLeft,['день','дня','дней'])}</span><span>Подробнее${I.back}</span></div></a>`;
}
function tariffPage(){
  if(!TF&&!LOCAL&&!stale)loadTariff();const t=curTariff();
  const[c,l]=tStat(t),ps=TF&&TF.payments||[];
  return`<a class="back" href="#/settings">${I.back}Настройки</a><div class="top"><div><h1>Тарифы</h1><div class="sub">Один тариф — все функции</div></div></div>
  <div class="card tbig"><div class="tch"><div><small>Тариф</small><b>${esc(t.name)}</b></div><span class="chip ${c}">${l}</span></div>
    <div class="tprice"><b>${t.status==='free'?'0 ₽':t.price?money(t.price):'—'}</b><span>${t.status==='free'?'до '+fdate(t.freeUntil):t.price?'в месяц':'цена будет объявлена'}</span></div>
    <p class="note" style="margin:8px 0 0">${esc(t.features)}</p>
    <div class="tfree">${I.check}<span>До <b>${fdate(t.freeUntil)}</b> все пользователи пользуются X-Finance бесплатно${t.price?`, затем — ${money(t.price)} в месяц`:''}.</span></div>
    <div class="kvs" style="padding:0;margin-top:10px">${kv('Действует до',dmy(t.until))}${kv('Осталось',plural(t.daysLeft,['день','дня','дней']))}${t.paidUntil?kv('Оплачено до',dmy(t.paidUntil)):''}</div>
  </div>
  ${LOCAL||stale?`<div class="card pad note" style="margin-top:12px">${LOCAL?'Оплата тарифа и её подтверждение работают, когда вы вошли в аккаунт на сервере.':'Нет связи с сервером — оплату можно отправить, когда связь появится.'}</div>`
    :`<button class="btn primary block" style="margin-top:12px" data-a="payTariff">${I.check}${t.status==='free'?'Оплатить заранее':'Сообщить об оплате'}</button>`}
  ${t.pay?`<h2>Реквизиты для оплаты</h2><div class="card pad" style="white-space:pre-line;font-size:14.5px">${esc(t.pay)}</div>`:''}
  <h2>Мои оплаты</h2>
  <div class="card rows">${ps.length?ps.map(p=>`<div class="rw"><div class="g"><b>${money(p.amount)} · ${plural(p.months,['месяц','месяца','месяцев'])}</b><small>${dmy(p.created.slice(0,10))}${p.method?' · '+esc(p.method):''}${p.note?' · '+esc(p.note):''}</small></div>${p.status==='pending'?'<span class="chip gold">На проверке</span>':p.status==='confirmed'?'<span class="chip ok">Подтверждена</span>':'<span class="chip warn">Отклонена</span>'}</div>`).join(''):'<div class="pad muted small">Оплат пока не было.</div>'}</div>`;
}
/* ---------- соглашение ---------- */
function terms(){
  const o=info.operator||{},op=esc(o.name||'администратор сервиса X-Finance');
  return`<a class="back" href="#/" onclick="history.length>1&&(history.back(),event.preventDefault())">${I.back}Назад</a><div class="top"><h1>Пользовательское соглашение</h1></div>
  <div class="card pad policy">
  <h3 style="margin-top:0">1. Предмет</h3><p>Сервис X-Finance (далее — Сервис) предоставляется ${op} (далее — Администрация) для учёта договоров рассрочки, долгов, платежей и контактов. Регистрируясь, вы принимаете условия этого соглашения (ст. 437, 438 ГК РФ).</p>
  <h3>2. Аккаунт</h3><p>Регистрация доступна лицам, достигшим 18 лет. Вы обязуетесь указывать достоверные данные, хранить пароль в тайне и отвечаете за действия, совершённые под вашим логином.</p>
  <h3>3. Данные третьих лиц</h3><p>Внося в Сервис персональные данные клиентов, должников, поручителей и инвесторов, вы действуете как оператор этих данных и обязуетесь получить их согласие на обработку в соответствии с Федеральным законом № 152-ФЗ «О персональных данных».</p>
  <h3>4. Тариф и оплата</h3><p>До ${fdate((me&&me.tariff&&me.tariff.freeUntil)||'2027-03-18')} Сервис предоставляется бесплатно. Далее — по тарифу, опубликованному в разделе «Тарифы». Оплата подтверждается Администрацией.</p>
  <h3>5. Ограничения</h3><p>Запрещено использовать Сервис для деятельности, противоречащей законодательству РФ, в том числе для взимания процентов или штрафов, запрещённых законом, и для раскрытия чужих персональных данных. Администрация вправе заблокировать аккаунт при нарушении.</p>
  <h3>6. Ответственность</h3><p>Сервис предоставляется «как есть». Администрация обеспечивает ежедневное резервное копирование, но не отвечает за убытки, вызванные действиями пользователя или третьих лиц. Рекомендуем регулярно сохранять резервные копии.</p>
  <h3>7. Прекращение</h3><p>Вы можете удалить аккаунт в любой момент в Настройках → Аккаунт; данные будут удалены с сервера. Вопросы направляйте Администрации.</p></div>`;
}

/* ---------- все операции ---------- */
let otab='all',oLimit=60,ktab='all',upClient=null;
const MONG=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const dlong=s=>{const[y,m,d]=s.split('-').map(Number);return d+' '+MONG[m-1]+' '+y};
/* карточки дашборда на широком экране: столько колонок, чтобы ряды были полными; последний ряд растягивается на всю ширину */
function kfit(){const g=[...document.querySelectorAll('.kpis')];if(!g.length)return;kfit1(g[0]);
  for(const k of g.slice(1)){[...k.children].forEach(c=>c.style.gridColumn='');k.style.gridTemplateColumns=innerWidth<960?'':g[0].style.gridTemplateColumns}}   // все карточки одного размера
function kfit1(k){const n=k.children.length;if(innerWidth<960||!n){k.style.gridTemplateColumns='';[...k.children].forEach(c=>c.style.gridColumn='');return}
  const max=Math.max(2,Math.min(6,Math.floor(k.clientWidth/175)));let best=max;
  for(let c=max;c>=3;c--)if(n%c===0){best=c;break}
  k.style.gridTemplateColumns=`repeat(${best},minmax(0,1fr))`;[...k.children].forEach(c=>c.style.gridColumn='');
}
addEventListener('resize',()=>{clearTimeout(kfit.t);kfit.t=setTimeout(kfit,120)});
let acctOps=false;
function allOps(){
  const out=[];
  if(S.inst||XSID)for(const c of db.contracts){if(acctOps&&!accC(c))continue;
    const cl=client(c.clientId)||{last:'Клиент'},who=fio(cl),total=c.cost+c.markup,pk='contract',pid=c.id;
    out.push({id:'c'+c.id,date:c.date,ts:c.ts||0,ord:0,grp:'inst',kind:'new',tone:'gold',icon:I.doc,title:'Оформлена рассрочка',who,sub:`№${c.no} · ${c.item}`+(c.down?` · взнос ${money(c.down)}`:''),amount:total,sign:'',href:cHref(c.id),pk,pid});
    (c.shifts||[]).forEach((z,i)=>out.push({id:z.id,date:z.date,ts:z.ts||0,ord:50+i,grp:'inst',kind:'shift',tone:'gold',icon:I.cal,title:'График перенесён',who,sub:`№${c.no} · ${c.item} · +${z.months} мес.`+(z.note?' · '+z.note:''),amount:0,sign:'',href:cHref(c.id),pk,pid}));
    c.payments.forEach((p,i)=>out.push({id:p.id,date:p.date,ts:p.ts||0,ord:1+i,grp:'inst',kind:'pay',tone:'ok',icon:I.check,title:'Платёж по рассрочке',who,sub:`№${c.no} · ${c.item}`+(p.note?' · '+p.note:''),amount:p.amount,sign:'+',href:cHref(c.id),pk,pid}));
  }
  if(S.debt&&!(acctOps&&!accD()))for(const d of db.debts){
    const who=fio(d),isIn=d.type==='in',pk='debt',pid=d.id;
    d.ops.forEach((o,i)=>{
      const add=o.kind==='add',first=add&&i===0;
      out.push({id:o.id,date:o.date,ts:o.ts||0,ord:i,grp:'debt',kind:add?'new':'pay',tone:add?(isIn?'warn':'ink'):(isIn?'ok':'ink'),icon:add?I.plus:I.minus,
        title:add?(isIn?(first?'Оформлен долг':'Долг увеличен'):(first?'Я взял в долг':'Взял ещё в долг')):(isIn?'Возврат долга':'Я вернул долг'),
        who,sub:(isIn?'Должен мне':'Я должен')+(o.note?' · '+o.note:'')+(o.confirmed?' · подтверждено':''),amount:o.amount,sign:add?(isIn?'':'−'):(isIn?'+':'−'),href:'#/debt/'+d.id,pk,pid});
    });
  }
  return out.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts-a.ts)||(b.ord-a.ord));
}
/* главная → «Все операции»: лента всех платежей, договоров и долгов; неотправленные на сервер — с кружком «Отправить» */
function opUnsent(o){if(LOCAL||XSID)return null;const e=OB.find(x=>x.st!=='ok'&&x.t==='put'&&x.kind===o.pk&&x.iid===o.pid);return e&&((o.ts||0)>=e.ts-3000||o.kind==='new'&&e.ts-3000<=(o.ts||e.ts))?e:null}
let hoLimit=40;
function homeOps(){
  acctOps=true;let all;try{all=allOps()}finally{acctOps=false}
  const f={all:()=>1,pay:o=>o.kind==='pay',new:o=>o.kind==='new',debt:o=>o.pk==='debt'};if(!f[otab])otab='all';
  const pn=LOCAL||XSID?0:all.filter(o=>opUnsent(o)).length,list=all.filter(f[otab]);
  const tabs=[['all','Все'],['pay','Платежи'],['new','Оформления'],...(S.debt&&(S.inst||XSID)&&!XSID?[['debt','Долги']]:[])].map(([k,l])=>`<button class="pch${otab===k?' on':''}" data-a="otab" data-t="${k}">${l}<em>${all.filter(f[k]).length}</em></button>`).join('');
  const inc=sumBy(list.filter(o=>o.sign==='+'),o=>o.amount),iss=sumBy(list.filter(o=>o.kind==='new'&&o.sign===''),o=>o.amount);
  let h=`<div class="hops"><div class="pchips">${tabs}</div>
    ${pn?`<div class="card obbar"><span class="obbi">${I.upl}</span><div class="g"><b>Не отправлено на сервер: ${pn}</b><small>Сохранено на устройстве. Нажмите кружок у операции или отправьте всё сразу.</small></div><button class="btn sm primary" data-a="obAll">${I.upl}Отправить всё</button></div>`:''}
    <div class="card ptot"><div><small>Поступило${otab==='all'?' · все операции':''}</small><div class="v">${N(inc,'ho-in-'+otab,1)}</div><span>${plural(list.length,['операция','операции','операций'])}</span></div>
      ${iss?`<div class="pov ok"><small>Оформлено</small><b>${money(iss)}</b><span>${plural(list.filter(o=>o.kind==='new').length,['договор','договора','договоров'])}</span></div>`:''}</div>`;
  if(!list.length)return h+`<div class="card">${empty(I.list,'Операций пока нет','Здесь появятся все оформленные рассрочки, долги и платежи.')}</div></div>`;
  let day='',cols='';
  for(const o of list.slice(0,hoLimit)){
    if(o.date!==day){if(day)cols+='</div></div>';day=o.date;const dd=days(o.date,today());const dp=sumBy(list.filter(x=>x.date===day&&x.sign==='+'),x=>x.amount);
      cols+=`<div class="hday"><h2>${dd===0?'Сегодня':dd===1?'Вчера':dlong(o.date)}${dp?`<span class="num">+${money(dp)}</span>`:''}</h2><div class="card rows">`}
    const un=opUnsent(o);
    cols+=`<div class="rw op ${o.tone}${un?' un':''}"><a class="opl" href="${o.href}"><div class="n">${o.icon}</div><div class="g"><b>${esc(o.who)}</b><small>${esc(o.title)} · ${esc(o.sub)}</small>${un?`<small class="ops">${un.st==='err'?'Ошибка отправки':'Не отправлено на сервер'}</small>`:''}</div><div class="am num">${o.kind==='shift'?'':o.sign+money(o.amount)}</div></a>
      ${un?`<button class="obb${un.st==='go'?' go':''}" data-a="obGo" data-id="${un.id}" aria-label="Отправить на сервер" title="Отправить на сервер">${un.st==='err'?I.sync:I.upl}</button>`:''}</div>`;
  }
  cols+='</div></div>';
  h+=`<div class="hopl">${cols}</div>`;
  if(list.length>hoLimit)h+=`<button class="btn block" style="margin-top:12px" data-a="hoMore">Показать ещё ${Math.min(100,list.length-hoLimit)}</button>`;
  return h+'</div>';
}
function opsList(){
  const s=q.trim().toLowerCase(),all=allOps().filter(o=>!s||(o.who+' '+o.title+' '+o.sub).toLowerCase().includes(s));
  const f={all:()=>1,pay:o=>o.kind==='pay',new:o=>o.kind==='new',debt:o=>o.grp==='debt'};
  const tabs=[['all','Все'],['pay','Платежи'],['new','Оформления'],...(S.debt&&S.inst?[['debt','Долги']]:[])].map(([k,l])=>`<button class="${otab===k?'on':''}" data-a="otab" data-t="${k}">${l}<em>${all.filter(f[k]).length}</em></button>`).join('');
  const list=all.filter(f[otab]);
  const inc=sumBy(list.filter(o=>o.sign==='+'),o=>o.amount),iss=sumBy(list.filter(o=>o.kind==='new'&&o.sign===''),o=>o.amount);
  let h=`<div class="seg">${tabs}</div>`;
  if(!list.length)return h+`<div class="card">${empty(I.list,s?'Ничего не найдено':'Операций пока нет','Здесь появятся все оформленные рассрочки, долги и платежи.')}</div>`;
  h+=`<div class="stats" style="grid-template-columns:repeat(2,minmax(0,1fr));margin:0 0 4px"><div class="card stat"><div class="l">Поступило</div><div class="v" style="color:var(--accent)">${N(inc,'o-in-'+otab+s)}</div></div>
    ${otab==='pay'?`<div class="card stat"><div class="l">Платежей</div><div class="v">${list.length}</div></div>`:`<div class="card stat"><div class="l">Оформлено</div><div class="v">${N(iss,'o-out-'+otab+s)}</div></div>`}</div>`;
  let day='';
  for(const o of list.slice(0,oLimit)){
    if(o.date!==day){if(day)h+='</div>';day=o.date;const dd=days(o.date,today());
      h+=`<h2>${dd===0?'Сегодня':dd===1?'Вчера':dlong(o.date)}${(v=>v?`<span class="num" style="text-transform:none;letter-spacing:0;color:var(--accent)">+${money(v)}</span>`:'')(sumBy(list.filter(x=>x.date===day&&x.sign==='+'),x=>x.amount))}</h2><div class="card rows">`}
    h+=`<a class="rw op ${o.tone}" href="${o.href}"><div class="n">${o.icon}</div><div class="g"><b>${esc(o.who)}</b><small>${esc(o.title)} · ${esc(o.sub)}</small></div><div class="am num">${o.kind==='shift'?'':o.sign+money(o.amount)}</div></a>`;
  }
  h+='</div>';
  if(list.length>oLimit)h+=`<button class="btn block" style="margin-top:12px" data-a="oMore">Показать ещё ${Math.min(100,list.length-oLimit)}</button>`;
  return h;
}
const opsPage=()=>`<div class="top"><div><h1>Все операции</h1><div class="sub">Оформления, платежи и долги</div></div></div>
  <input class="search" id="q" placeholder="Поиск по имени или товару" value="${esc(q)}"><div id="list">${opsList()}</div>`;
const notFound=()=>`<div class="card">${empty(I.doc,'Запись не найдена','','<a class="btn" href="#/">На главную</a>')}</div>`;

/* ---------- вход, политика, кабинет инвестора, страница должника ---------- */
let authMode='login';
const brand=(t)=>`<div class="brand"><img src="icon-192.png" alt="" onerror="this.remove()">${esc(t||'X-Finance')}</div>`;
function authPage(){
  const reg=authMode==='reg';
  const tp=info.tariff?(tSave(info.tariff),{...TDEF,...info.tariff}):tPlan();
  const rc=lsGet('xf_ref');if(rc&&!REFI){REFI={};api('GET','/api/ref/'+rc).then(r=>{REFI=r;if(!me)render()}).catch(()=>{REFI={bad:1}})}
  return`<div class="auth">${brand()}${rc&&REFI&&REFI.name?`<div class="refban">${I.gift}<span>Вас пригласил <b>${esc(REFI.name)}</b>${REFI.company?' · '+esc(REFI.company):''}<br><small>Зарегистрируйтесь — и получите <b>+${REFI.friend} дней</b> бесплатно</small></span></div>`:''}<div class="tstrip">${I.check}<span>Тариф «${esc(tp.name)}» — <b>бесплатно до ${fdate(tp.freeUntil)}</b></span></div><div class="seg"><button class="${reg?'':'on'}" data-a="authMode" data-m="login">Вход</button><button class="${reg?'on':''}" data-a="authMode" data-m="reg">Регистрация</button></div>
  <form class="card pad" id="auth" novalidate>
  ${reg?fld('Фамилия, имя, отчество','name','','autocomplete="name"')+fld('Название компании (необязательно)','company')+fld('Номер телефона','phone','','inputmode="tel" autocomplete="tel" placeholder="8 928 000-00-00"'):''}
  ${fld('Логин','login','','autocomplete="username" autocapitalize="none" spellcheck="false"')}${fld('Пароль'+(reg?' (не короче 8 символов)':''),'password','',`type="password" autocomplete="${reg?'new-password':'current-password'}"`)}
  ${reg?`<div class="agree"><label class="chk"><input type="checkbox" name="consent"><span>Даю <b>согласие на обработку персональных данных</b> в соответствии с Федеральным законом № 152-ФЗ и принимаю <a href="#/policy">Политику обработки персональных данных</a>.</span></label>
    <label class="chk"><input type="checkbox" name="terms"><span>Принимаю <a href="#/terms">Пользовательское соглашение</a>.</span></label>
    <label class="chk"><input type="checkbox" name="adult"><span>Мне исполнилось 18 лет.</span></label></div>`:''}
  <p class="err" id="aerr"></p><button class="btn primary block" type="submit">${reg?'Зарегистрироваться':'Войти'}</button>
  ${reg?'':`<button type="button" class="forgot" data-a="forgot">Забыли логин или пароль?</button>`}</form>
  <p class="note" style="text-align:center;margin-top:14px">Учёт исламской рассрочки и долгов</p>${['warn','go','ios'].includes(XS.state()[0])?`<div style="margin-top:14px">${instCard()}</div>`:''}</div>`;
}
function policy(){
  const o=info.operator||{},op=esc(o.name||'администратор сервиса X-Finance'),ct=esc(o.contact||(me&&me.phone)||'контакты указаны на сайте');
  return`<a class="back" href="#/" onclick="history.length>1&&(history.back(),event.preventDefault())">${I.back}Назад</a><div class="top"><h1>Политика обработки персональных данных</h1></div>
  <div class="card pad policy">
  <h3 style="margin-top:0">1. Общие положения</h3><p>Политика составлена в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки и защиты персональных данных в сервисе X-Finance. Оператор: ${op}. Контакт для обращений: ${ct}.</p>
  <h3>2. Какие данные обрабатываются</h3><p>Данные пользователя сервиса: фамилия, имя, отчество, номер телефона, логин, название компании. Данные клиентов, должников и инвесторов, которые вносит пользователь: фамилия, имя, отчество, номер телефона, сведения о договорах, долгах и платежах, а также копии документов, если пользователь их загружает.</p>
  <h3>3. Цели обработки</h3><p>Регистрация и вход в сервис; учёт договоров рассрочки, долгов и платежей; информирование клиентов и должников о состоянии их обязательств; расчёт долей инвесторов.</p>
  <h3>4. Правовые основания</h3><p>Согласие субъекта персональных данных (ст. 6, 9 закона № 152-ФЗ) и исполнение договора, стороной которого является субъект. Пользователь, вносящий данные третьих лиц, обязан заранее получить их согласие на обработку и отвечает за его наличие.</p>
  <h3>5. Хранение и защита</h3><p>Данные хранятся в базе данных на сервере оператора, расположенном на территории Российской Федерации. Пароли хранятся только в виде необратимых хешей. Доступ к данным имеет только владелец учётной записи; инвестор видит только свои договоры; клиент или должник по личной ссылке видит только свою страницу. Данные не передаются третьим лицам, кроме случаев, предусмотренных законом, и отправки уведомлений по поручению пользователя.</p>
  <h3>6. Сроки</h3><p>Данные обрабатываются до удаления учётной записи или отзыва согласия. При удалении учётной записи все связанные данные и загруженные документы удаляются с сервера.</p>
  <h3>7. Права субъекта</h3><p>Вы вправе получить сведения об обработке своих данных, потребовать их уточнения, блокирования или удаления, отозвать согласие, обратившись к оператору по указанному контакту, а также обжаловать действия оператора в Роскомнадзор.</p></div>`;
}
function cabinet(){
  const s=invSum(inv.contracts),i=inv.investor;
  return`<div class="top"><div><h1>${esc(hello(i)||'Кабинет инвестора')}</h1><div class="sub">Кабинет инвестора · ${esc(inv.company||'X-Finance')}</div></div><button class="btn sm" data-a="logout">Выйти</button></div>
  <div class="card hero" style="margin-bottom:10px"><div class="l">Моя прибыль получена</div><div class="v" style="color:var(--accent)">${N(s.got,'cab',1)}</div><div class="s">Ожидается всего ${money(s.exp)} · доля ${nf.format(i.pct)}%</div></div>
  ${invStats(s,'cb')}
  <h2>Мои договоры</h2>${inv.contracts.length?`<div class="list grid">${inv.contracts.sort((a,b)=>b.no-a.no).map(c=>cCard(c,null,c.clientName)).join('')}</div>`:'<div class="card pad muted small">Договоров пока нет.</div>'}
  <div class="row-btns" style="margin-top:22px"><button class="btn" data-a="password">Сменить пароль</button>${inv.ownerPhone?`<a class="btn soft" href="https://wa.me/${waPhone(inv.ownerPhone)}" target="_blank" rel="noopener">${I.wa}Написать</a>`:''}</div>`;
}
const sortD=a=>a.slice().reverse().sort((x,y)=>x.date<y.date?1:x.date>y.date?-1:0);
const propList=(ps)=>ps&&ps.length?`<div class="myprops">${ps.map(p=>`<div class="mp ${p.status}"><i></i><span>${p.status==='pending'?'Ждёт подтверждения':p.status==='accepted'?'Принято':'Не подтверждено'} · <b class="num">${money(p.amount)}</b> · ${fdate(p.date)}</span></div>`).join('')}</div>`:'';
function pubDebtBlock(d,key,big,lk,ps){
  const k=dcalc(d),mine=d.type==='in',cf=!(PGF()&&PGF().confirm===false);
  return`<div class="card ${big?'hero':'pubc'}"><div class="l">${k.status==='done'?'Долг закрыт. Баракаллаху фикум!':mine?'Ваш долг':'Вам должны'}${d.note&&!big?' · '+esc(d.note):''}</div><div class="v">${N(k.left,key,1)}</div>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>Возвращено ${money(k.paid)} из ${money(k.add)}</span><span${k.status==='overdue'?' style="color:var(--warn)"':''}>${d.due?'до '+fdate(d.due):''}</span></div>
  ${big?'</div><h2>История</h2><div class="card rows">':'<div class="rows inner">'}${sortD(d.ops).map(o=>`<div class="rw ${o.kind}"><div class="n">${o.kind==='add'?I.plus:I.minus}</div>
    <div class="g"><b>${o.kind==='add'?'Долг':'Оплата'} <span class="num">${money(o.amount)}</span></b><small>${fdate(o.date)}${o.note?' · '+esc(o.note):''}</small></div>
    ${o.confirmed?`<span class="chip ok">${I.check}Подтверждено</span>`:!cf?'':`<div class="oa">${o.disputed?'<span class="chip warn">Оспорено</span>':''}<button class="btn sm soft" data-a="confirmOp" data-id="${o.id}" data-d="${d.id}">${I.check}Принять</button>${lk&&!o.disputed?`<button class="btn sm ghost" data-a="dispute" data-lk="${lk}" data-id="${o.id}" data-d="${d.id}">Не согласен</button>`:''}</div>`}</div>`).join('')}</div>
  ${lk?propList(ps)+(k.left>0?`<div class="pact"><button class="btn primary block" data-a="propose" data-lk="${lk}" data-item="${d.id}" data-left="${k.left}" data-out="${mine?'':'1'}">${I.card}${mine?'Сообщить об оплате':'Мне вернули'}</button></div>`:''):''}${big?'':'</div>'}`;
}
const PGF=()=>pub&&pubData&&pubData.page||null;
function pubContractBlock(p,key,big,lk,ps){
  const shS=!(PGF()&&PGF().sched===false);
  const c={cost:p.total,markup:0,down:p.down,months:p.months,first:p.first_pay,payments:p.payments,shifts:p.shifts},k=calc(c);
  const sched=k.rows.map(r=>`<div class="rw ${r.st}"><div class="n">${r.st==='paid'?I.check:r.n}</div><div class="g"><b>${dmy(r.date)}</b><small>${r.st==='paid'?'Оплачен':r.st==='overdue'?'Просрочен':r.got?'Внесено '+money(r.got):'Ожидается'}</small></div><div class="am num">${money(r.amount)}</div></div>`).join('');
  return`<div class="card ${big?'hero':'pubc'}"><div class="l">${k.status==='done'?'Рассрочка выплачена. Баракаллаху фикум!':big?'Остаток по рассрочке':esc(p.item)+' · №'+p.no}</div><div class="v">${N(k.left,key,1)}</div>
    ${k.overdue?`<div class="s" style="color:var(--warn)">Просрочено ${money(k.overdue)} · ${pdays(k.days)}</div>`:k.next?`<div class="s">Ближайший платёж ${money(k.next.rest)} до ${fdate(k.next.date)}</div>`:''}
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>${big?esc(p.item)+' · договор №'+p.no:'Оплачено '+money(k.paid)}</span><span>${big?'оплачено '+money(k.paid):'из '+money(k.fin)}</span></div>
  ${big?`</div>${shS?`<h2>График платежей</h2><div class="card rows">${sched}</div>`:''}`:`${shS?`<details class="sch"><summary>График платежей <span>${k.rows.filter(r=>r.st==='paid').length}/${k.rows.length}</span></summary><div class="rows inner">${sched}</div></details>`:''}${lk?propList(ps)+(k.left>0?`<div class="pact"><button class="btn primary block" data-a="propose" data-lk="${lk}" data-item="${p.id}" data-left="${k.left}" data-next="${k.next?k.next.rest:''}">${I.card}Сообщить об оплате</button></div>`:''):''}</div>`}`;
}
function pubPage(){
  if(!pubData)return`<div class="auth">${brand()}<div class="card">${empty(I.doc,'Страница не найдена','Ссылка устарела или была удалена. Попросите прислать новую.')}</div></div>`;
  const p=pubData,pushOn=lsGet('xf_push_'+pub)==='1';
  let body;
  if(p.kind==='client'){
    const cs=p.contracts.map(c=>({c,k:calc({cost:c.total,markup:0,down:c.down,months:c.months,first:c.first_pay,payments:c.payments,shifts:c.shifts})}));
    const dIn=p.debts.filter(d=>d.type==='in'),dOut=p.debts.filter(d=>d.type==='out');
    const owe=sumBy(cs,x=>x.k.left)+sumBy(dIn,d=>dcalc(d).left),over=sumBy(cs,x=>x.k.overdue)+sumBy(dIn.filter(d=>dcalc(d).status==='overdue'),d=>dcalc(d).left),back=sumBy(dOut,d=>dcalc(d).left);
    body=`<div class="card hero"><div class="l">${owe?'Ваш долг всего':'У вас нет долгов. Баракаллаху фикум!'}</div><div class="v">${N(owe,'pub',1)}</div>
      <div class="s">${[cs.length?plural(cs.length,['рассрочка','рассрочки','рассрочек']):'',dIn.length?plural(dIn.length,['долг','долга','долгов']):''].filter(Boolean).join(' · ')||'Записей пока нет'}${over?` · <span style="color:var(--warn)">просрочено ${money(over)}</span>`:''}${back?` · вам должны ${money(back)}`:''}</div></div>
      ${cs.length?`<h2>Рассрочки</h2><div class="list">${cs.map(x=>pubContractBlock(x.c,'pc'+x.c.id)).join('')}</div>`:''}
      ${p.debts.length?`<h2>Долги</h2><div class="list">${p.debts.map(d=>pubDebtBlock(d,'pd'+d.id)).join('')}</div>`:''}`;
  }
  else if(p.kind==='debt')body=pubDebtBlock(p,'pub',1);
  else body=pubContractBlock(p,'pub',1);
  const pg=p.page||{},on=k=>pg[k]!==false;
  return`<div class="auth" style="margin-top:2vh">${brand(p.company)}${on('hello')?`<p class="muted" style="margin:-8px 2px 16px">Ассаляму алейкум${p.first?', '+esc([p.first,p.middle].filter(Boolean).join(' ')):''}!</p>`:''}${body}
  ${pg.pay?`<div class="card pubpay"><small>Как оплатить</small><b class="sel">${esc(pg.pay)}</b><button class="btn sm soft" data-a="copy" data-v="${esc(pg.pay)}">${I.copy}Скопировать</button></div>`:''}
  <div class="row-btns" style="margin-top:14px">${on('push')?pushOn?`<span class="chip ok" style="height:48px;flex:1;justify-content:center;border-radius:16px;font-size:14px">${I.bell}Уведомления включены</span>`:`<button class="btn primary" data-a="pushPub">${I.bell}Получать уведомления</button>`:''}
    ${p.ownerPhone?`<a class="btn soft" href="tel:${esc(p.ownerPhone)}">${I.phone}Позвонить</a>`:''}${p.ownerPhone&&on('wa')?`<a class="btn soft" href="https://wa.me/${waPhone(p.ownerPhone)}" target="_blank" rel="noopener">${I.wa}Написать</a>`:''}</div>
  ${pg.note?`<p class="pubnote">${esc(pg.note)}</p>`:''}
  <p class="note" style="text-align:center;margin-top:18px">Страница обновляется автоматически. <a href="#/policy" style="text-decoration:underline">Политика обработки данных</a></p></div>`;
}
const offlinePage=()=>`<div class="auth">${brand()}<div class="card">${empty(I.gear,'Нет связи с сервером','Проверьте интернет и попробуйте ещё раз.','<button class="btn primary" onclick="location.reload()">Повторить</button>')}</div></div>`;

/* ---------- отрисовка ---------- */
let lastRoute=null;
/* длинные страницы: каждый раздел (заголовок + его карточки) — отдельный блок; на широком экране блоки встают в две колонки */
/* страницы договора/долга/инвестора: слева сводка и данные, справа история и график (на широком экране) */
function splitPage(m){const kids=[...m.children],i=kids.findIndex(k=>k.tagName==='H2');if(i<0)return;
  const head=kids.filter((k,j)=>j<i&&(k.classList.contains('back')||k.classList.contains('top'))),L=document.createElement('div'),R=document.createElement('div'),g=document.createElement('div');
  g.className='split';L.className='spl';R.className='spr';kids.forEach((k,j)=>{if(head.includes(k))return;(j<i?L:R).append(k)});g.append(L,R);m.append(g)}
function secGroup(m){const kids=[...m.children];if(!kids.some(k=>k.tagName==='H2'))return;const w=document.createElement('div');w.className='secs';let cur=null;
  for(const k of kids){if(k.tagName==='H2'){cur=document.createElement('section');cur.className='sec';w.append(cur)}if(cur)cur.append(k)}m.append(w)}
function render(){renderCore();try{backLabels()}catch(e){}if(LOCAL)lfLoad()}
function renderCore(){
  DV++;
  const route=location.hash.replace(/^#\/?/,''),[name,id]=route.split('/'),m=$('#main'),nv=$('#nav');
  let html,bare=true;
  if(offline)html=offlinePage();
  else if(name==='policy')html=policy();
  else if(name==='terms')html=terms();
  else if(pub)html=pubPage();
  else if(!me)html=authPage();
  else if(me.role==='investor')html=cabinet();
  else{
    bare=false;
    const pages={'':home,xc:()=>extContract(id,route.split('/')[2]),tariff:tariffPage,check:checkPage,chat:()=>chatPage(id),account:accountPage,settings:()=>settings(id),inbox:()=>inboxPage(id),ops:opsPage,contracts,contract:()=>contract(id),clients,client:()=>clientPage(id),debts,debt:()=>debtPage(id),investors,investor:()=>investorPage(id)};
    html=staleBar()+(pages[name]||home)();
  }
  m.className=(bare||['contract','xc','debt','investor','settings','ops','inbox','account','chat','check','tariff'].includes(name)||(name==='client'&&!id)?'narrow':'')+(!bare&&!name?' homew':'')+(route!==lastRoute?' enter':'');lastRoute=route;
  m.innerHTML=html;$('#app').classList.toggle('bare',bare);nv.hidden=bare;
  if(!bare&&['settings','account','tariff'].includes(name))secGroup(m);
  else if(!bare&&id&&['contract','xc','debt','investor'].includes(name))splitPage(m);
  m.querySelectorAll('.list>*,.kpis>*').forEach((e,i,a)=>e.style.setProperty('--i',Math.min([...e.parentNode.children].indexOf(e),12)));
  if(!bare){
    const sec={contract:'contracts',client:'clients',debt:'debts',investor:'investors'}[name]||name||'',over=S.inst?db.contracts.filter(c=>calc(c).status==='overdue').length:0;
    const both=S.inst&&S.debt,items=[['','Главная',I.home,1,''],['contracts','Договоры',I.doc,S.inst,''],['debts','Долги',I.coin,S.debt&&!S.inst,''],['plus'],['debts','Долги',I.coin,both,''],
      ['clients','Контакты',I.users,1,''],['investors','Инвесторы',I.chart,S.inst,S.debt?'desk tail':'tail'],['ops','Все операции',I.list,1,'desk tail'],['settings','Настройки',I.gear,1,'desk tail']].filter(x=>x[0]==='plus'||x[3]);
    nv.innerHTML=`<div class="logo"><img src="icon-192.png" alt="" onerror="this.remove()">X-Finance</div>`+items.map(([h,l,i,,cl])=>h==='plus'
      ?`<button class="pl${plusOpen?' open':''}" data-a="plus" aria-label="Действие" aria-expanded="${plusOpen}"><span>${I.plus}</span><b>Действие</b></button>`
      :`<a href="#/${h}" class="${cl}${sec===h||(h==='settings'&&sec==='investors')||false?' on':''}">${i}<span>${l}${h==='contracts'&&over?`<i>${over}</i>`:''}</span></a>`).join('');
  }
  $('#app').classList.toggle('full',!bare&&(name==='client'||name==='chat')&&!!id);if(name!=='chat')chatUid=null;if(name==='client'&&id)pagerInit();
  document.querySelectorAll('body>.cdock,body>.chatbar').forEach(e=>e.remove());m.querySelectorAll('.cdock,.chatbar').forEach(dk=>document.body.append(dk));if(name==='chat')scrollChat();  // нижние кнопки вне анимируемого main, чтобы всегда были прижаты к низу экрана
  {const ao=!name&&$('#cats .acat.on');if(ao&&acct!=='all'){const r=ao.parentNode;r.scrollLeft=ao.offsetLeft-(r.clientWidth-ao.offsetWidth)/2}}
  runCounts();flashId=null;bell();kfit();
}
/* ---------- кнопка «Назад»: одно нажатие = одно действие ----------
   Каждое окно (лист, подтверждение, меню «+», панель уведомлений, просмотр фото) добавляет один шаг в историю.
   «Назад» (кнопка телефона, жест, браузер, Esc, «← …» в приложении) закрывает только верхнее окно,
   а если окон нет — возвращает на предыдущий экран. Переходы между экранами — через nav(). */
const OV=[];let backing=0,pendingNav=null,pushLater=0,HS=[location.hash||'#/'],replacing=false;
function hb(n){backing++;history.go(-n)}
function ovOpen(id,close){if(OV.some(o=>o.id===id))return;OV.push({id,close});if(backing)pushLater++;else history.pushState({xo:OV.length},'',location.href)}
function ovDone(id){const i=OV.findIndex(o=>o.id===id);if(i<0)return;OV.splice(i,1);if(pushLater){pushLater--;return}hb(1)}
function nav(h){
  if(OV.length){const n=OV.length-pushLater;OV.splice(0).reverse().forEach(o=>o.close(true));pushLater=0;pendingNav=h;if(n>0)hb(n);else{pendingNav=null;nav(h)}return}
  if(backing){pendingNav=h;return}
  if(location.hash===h)render();else location.hash=h;
}
function navBack(fallback){if(OV.length)return history.back();if(HS.length>1)history.back();else{replacing=true;location.replace(fallback||'#/')}}
addEventListener('popstate',()=>{
  if(backing){backing--;if(backing)return;
    while(pushLater){pushLater--;history.pushState({xo:1},'',location.href)}
    if(pendingNav!=null){const h=pendingNav;pendingNav=null;nav(h)}return}
  if(OV.length){const o=OV.pop();o.close(true)}
});
addEventListener('keydown',e=>{if(e.key==='Escape'&&OV.length){e.preventDefault();history.back()}});
const SECN={'':'Главная',contracts:'Договоры',debts:'Долги',clients:'Контакты',settings:'Настройки',ops:'Все операции',inbox:'Уведомления',account:'Аккаунт',check:'Проверка клиента',tariff:'Тарифы',investors:'Инвесторы',policy:'Политика',terms:'Соглашение'};
function secName(h){const[,a='',b]=(h||'#/').split('/');
  if(a==='client'){const c=db.clients.find(x=>x.id===b);return c?fio(c):'Контакт'}
  if(a==='contract'){const c=db.contracts.find(x=>x.id===b);return c?'Договор №'+c.no:'Договор'}
  if(a==='debt'){const d=db.debts.find(x=>x.id===b);return d?fio(d):'Долг'}
  if(a==='investor')return'Инвестор';if(a==='xc')return'Договор';if(a==='settings'&&SSUB[b])return SSUB[b];if(a==='chat')return'Переписка';return SECN[a]||'Назад'}
function backLabels(){const prev=HS.length>1?HS[HS.length-2]:null;if(!prev)return;document.querySelectorAll('#app a.back').forEach(a=>{a.innerHTML=I.back+esc(secName(prev))})}
/* ---------- меню «плюс» ---------- */
let plusOpen=false;
function plusMenu(open,silent){
  plusOpen=open;const b=$('#nav .pl');if(b){b.classList.toggle('open',open);b.setAttribute('aria-expanded',open)}
  const old=$('#pm');
  if(!open){if(old){old.classList.add('closing');setTimeout(()=>old.remove(),230)}if(!silent)ovDone('plus');return}
  ovOpen('plus',()=>plusMenu(false,true));
  if(old)old.remove();
  const w=document.createElement('div');w.id='pm';w.className='pm';w.dataset.a='plusOut';
  if(matchMedia('(min-width:960px)').matches){   // широкий экран — окно «Бенто» по центру
    w.className='pm pmx';w.innerHTML=`<div class="pmc pbn" id="pmc">${plusBento()}</div>`;document.body.append(w);
    {const z=+(getComputedStyle(document.documentElement).getPropertyValue('--z')||1)||1,nv=$('#nav'),vw=innerWidth/z,r=nv?nv.getBoundingClientRect().right/z:0,c=$('#pmc');   // по центру рабочей области справа от меню
      c.style.left=((r+vw)/2)+'px';c.style.width=Math.min(900,vw-r-64)+'px'}
    document.removeEventListener('keydown',pmKey);document.addEventListener('keydown',pmKey);return}
  w.innerHTML=`<div class="pmc" id="pmc">${plusMain()}</div>`;document.body.append(w);
  if(matchMedia('(min-width:960px)').matches){const b=$('#nav .pl'),c=$('#pmc');if(b&&c){const z=+(getComputedStyle(document.documentElement).getPropertyValue('--z')||1)||1,
    r=b.getBoundingClientRect(),vh=innerHeight/z,ch=c.offsetHeight;c.style.setProperty('--pmt',Math.max(14,Math.min(r.top/z-12,vh-ch-14))+'px')}}
}
function pmKey(e){if(!$('#pm.pmx')||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||''))return;
  const t=$(`#pm .pbt[data-k="${e.key}"]`);if(t){e.preventDefault();t.click()}}
function plusBento(){
  const anyOpen=(S.inst&&db.contracts.some(c=>calc(c).status!=='done'))||(S.debt&&db.debts.some(d=>d.type==='in'&&dcalc(d).left>0));
  const it=[S.inst&&['pmInst',I.doc,'gold','Оформить рассрочку','Договор с наценкой и графиком платежей'],
    ['pmPay',I.check,'ok','Добавить платёж',anyOpen?(S.inst&&S.debt?'По рассрочке или долгу':S.inst?'По договору рассрочки':'По долгу'):'Нет открытых договоров и долгов'],
    S.debt&&['pmDebt',I.coin,'warn','Оформить в долг','Мне должны или я должен'],
    ['pmCheck',I.search,'sky','Проверка клиента','Долги и просрочки по телефону или ФИО'],
    ['pmContact',I.users,'sky','Добавить контакт','ФИО, телефоны, адрес, фото']].filter(Boolean);
  const [b0,...rest]=it;
  return`<button class="pbx" data-a="plusClose" aria-label="Закрыть">${I.x}</button><div class="pbh"><h3>Что сделать?</h3><small>Главное — крупно · цифры 1–${it.length} · Esc — закрыть</small></div>
  <div class="pbg n${rest.length}"><button class="pbt big ${b0[2]}" data-a="${b0[0]}" data-k="1" style="--i:0"><i class="kn">1</i><span class="ic">${b0[1]}</span><b>${b0[3]}</b><small>${b0[4]}</small><span class="cta">Начать${I.back}</span></button>
    ${rest.map(([a,ic,t,b,sub],i)=>`<button class="pbt ${t}" data-a="${a}" data-k="${i+2}" style="--i:${i+1}"><i class="kn">${i+2}</i><span class="ic">${ic}</span><b>${b}</b><small>${sub}</small></button>`).join('')}</div>`;
}
const pmItem=(a,icon,tone,t,sub,extra='')=>`<button class="pmi ${tone}" data-a="${a}"${extra}><span class="ic">${icon}</span><span class="tx"><b>${t}</b><small>${sub}</small></span><span class="go">${I.back}</span></button>`;
function plusMain(){
  const anyOpen=(S.inst&&db.contracts.some(c=>calc(c).status!=='done'))||(S.debt&&db.debts.some(d=>d.type==='in'&&dcalc(d).left>0));
  const n=allOps().length;
  return`<div class="pmh">Что сделать?</div>`+
    pmItem('pmCheck',I.search,'sky','Проверка клиента','Долги и просрочки по телефону или ФИО')+
    pmItem('pmPay',I.check,'ok','Добавить платёж',anyOpen?(S.inst&&S.debt?'По рассрочке или долгу':S.inst?'По договору рассрочки':'По долгу'):'Нет открытых договоров и долгов')+
    (S.inst?pmItem('pmInst',I.doc,'gold','Оформить рассрочку','Договор с наценкой и графиком'):'')+
    (S.debt?pmItem('pmDebt',I.coin,'warn','Оформить в долг','Мне должны или я должен'):'')+
    pmItem('pmContact',I.users,'sky','Добавить контакт','ФИО, телефоны, адрес, фото')+
    `<div class="pmsep"></div>`+
    pmItem('pmOps',I.list,'ink','Все операции',n?plural(n,['операция','операции','операций']):'Пока пусто')+
    pmItem('pmSet',I.gear,'ink','Настройки','Аккаунт, разделы, копия');
}
function plusSwap(html,back){const c=$('#pmc');if(!c)return;c.classList.remove('fwd','bwd');void c.offsetWidth;c.innerHTML=html;c.classList.add(back?'bwd':'fwd')}
let lastSec=null,skipClose=false;
function go(h){if(location.hash===h&&!OV.length&&!backing)render();else{skipClose=true;nav(h)}}
addEventListener('hashchange',()=>{const p=location.hash.split('/')[1]||'';if(p!==lastSec){q='';if(pendingCat){catOpen=true;pendingCat=false}else{catOpen=false;ctab='all';ktab='all'}}lastSec=p;
  const h=location.hash||'#/';if(replacing){replacing=false;HS[HS.length-1]=h}else if(HS.length>1&&HS[HS.length-2]===h)HS.pop();else if(HS[HS.length-1]!==h)HS.push(h);if(HS.length>60)HS.shift();
  if(skipClose)skipClose=false;else if(OV.length){OV.splice(0).reverse().forEach(o=>o.close(true));pushLater=0}
  if(plusOpen)plusMenu(false,true);if(npOpen)npToggle(false,true);render();scrollTo(0,0)});

/* ---------- окна ---------- */
let onSubmit=null,gen=0,busy=false;
function sheet(title,body,submit,okLabel='Сохранить'){
  gen++;onSubmit=submit;ovOpen('sheet',()=>closeSheet(true,true));
  $('#layer').innerHTML=`<div class="ov" data-a="closeOv"><form class="sheet" id="form" novalidate autocomplete="off">
  <div class="hd"><b>${title}</b><button type="button" class="x" data-a="close" aria-label="Закрыть">${I.x}</button></div>
  ${body}${okLabel?`<p class="err" id="err"></p><button class="btn primary block" type="submit">${okLabel}</button>`:''}</form></div>`;
  const f=$('#form input:not([type=hidden]):not([type=checkbox]),#form select');if(f&&matchMedia('(min-width:960px)').matches)f.focus();
}
function confirmBox(title,text,ok,cb,danger=true){
  gen++;onSubmit=cb;ovOpen('sheet',()=>closeSheet(true,true));
  $('#layer').innerHTML=`<div class="ov" data-a="closeOv"><form class="sheet" id="form"><div class="hd"><b>${title}</b><button type="button" class="x" data-a="close">${I.x}</button></div>
  <p class="note" style="font-size:15px;margin:0 0 16px">${text}</p><p class="err" id="err"></p><div class="row-btns"><button type="button" class="btn" data-a="close">Отмена</button><button class="btn ${danger?'danger':'primary'}" type="submit">${ok}</button></div></form></div>`;
}
function dangerBox(title,text,ok,cb){
  gen++;onSubmit=async()=>{await cb()};ovOpen('sheet',()=>closeSheet(true,true));
  $('#layer').innerHTML=`<div class="ov" data-a="closeOv"><form class="sheet cfm" id="form">
    <div class="cfi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g class="lid"><path d="M4 7h16"/><path d="M9 7V4.500h6V7"/></g><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"/></svg></div>
    <b>${title}</b><p>${text}</p><p class="err" id="err"></p>
    <div class="row-btns"><button type="button" class="btn" data-a="close">Отмена</button><button class="btn dng" type="submit">${I.trash}${ok}</button></div></form></div>`;
}
function closeSheet(now,silent){
  if(!silent)ovDone('sheet');
  const ov=$('#layer .ov');onSubmit=null;pend=[];delF=[];if(!ov)return;
  if(now===true){$('#layer').innerHTML='';return}
  const g=gen;ov.classList.add('closing');setTimeout(()=>{if(g===gen)$('#layer').innerHTML=''},190);
}
let lastWa=null;
function doneSheet(title,text,r,phone,waText,link,file){
  gen++;onSubmit=null;lastWa={phone,text:waText,file};ovOpen('sheet',()=>closeSheet(true,true));
  $('#layer').innerHTML=`<div class="ov" data-a="closeOv"><div class="sheet"><div class="done">
  <svg class="ok" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg><b>${title}</b><p>${esc(text)}</p>
  ${r.wa?`<span class="chip ok">${I.wa}Отправлено в WhatsApp${r.file?' · '+(r.file==='pdf'?'PDF':'картинка'):''}</span>`:''}${r.push?`<span class="chip ok">${I.bell}Уведомление доставлено</span>`:''}
  ${link?`<div class="card link" style="text-align:left;margin-bottom:12px"><code>${esc(link.replace(/^https?:\/\//,''))}</code><button class="btn sm soft" data-a="copy" data-v="${esc(link)}">${I.copy}Копировать</button></div>`:''}
  <div class="row-btns">${phone&&!r.wa?`<button class="btn soft" data-a="waSend">${I.wa}Отправить в WhatsApp</button>`:''}<button class="btn primary" data-a="close">Готово</button></div></div></div></div>`;
}
function toast(t){document.querySelectorAll('.toast').forEach(e=>e.remove());const e=document.createElement('div');e.className='toast';e.textContent=t;document.body.append(e);setTimeout(()=>e.remove(),2500)}
const fld=(l,n,v='',a='')=>`<label class="field"><span>${l}</span><input name="${n}" value="${esc(v)}" ${a}></label>`;
const mfld=(l,n,v)=>fld(l,n,v?String(v).replace('.',','):'','inputmode="decimal" placeholder="0"');
const fioRaw=x=>[x.last,x.first,x.middle].filter(Boolean).join(' ');
const fioFields=(e,n='fio')=>fld('Фамилия, имя, отчество',n,fioRaw(e),'autocomplete="off" autocapitalize="words" placeholder="Исаев Ахмед Магомедович"');
const formData=()=>Object.fromEntries(new FormData($('#form')));
const fioOf=(f,n='fio')=>{const p=String(f[n]||'').trim().split(/\s+/).filter(Boolean);return{last:p[0]||'',first:p[1]||'',middle:p.slice(2).join(' ')}};
function wa(phone,text){window.open('https://wa.me/'+waPhone(phone)+'?text='+encodeURIComponent(text),'_blank')}
async function copy(t){try{await navigator.clipboard.writeText(t)}catch(e){const a=document.createElement('textarea');a.value=t;document.body.append(a);a.select();document.execCommand('copy');a.remove()}toast('Ссылка скопирована')}
const withSign=t=>t+(S.sign?'\n\n'+S.sign:'');
async function announce(kind,item,title,body,phone,file){
  const link=linkOf(item),waText=withSign(body+(link?'\nВаша страница: '+link:''));let r={push:0,wa:false};
  if(!LOCAL)try{const q={kind,id:item.id,body,wa:waText};if(file&&gOn())Object.assign(q,{file:await blob64(file.blob),fname:file.name,ftype:file.type});r=await api('POST','/api/notify',q)}catch(e){}
  doneSheet(title,body,r,phone,waText,kind==='debt'&&item.ops.length===1?link:'',file);
}
async function remind(kind,item,body,phone){
  const link=linkOf(item),text=withSign(body+(link?'\nВаша страница: '+link:''));
  if(LOCAL||!(S.green&&S.green.id)){wa(phone,text);if(!LOCAL)api('POST','/api/notify',{kind,id:item.id,body}).catch(()=>{});return}
  const r=await api('POST','/api/notify',{kind,id:item.id,body,wa:text});
  if(r.wa)toast('Напоминание отправлено в WhatsApp');else doneSheet('Шлюз не ответил','Отправьте напоминание вручную.',r,phone,text);
}

/* ---------- WhatsApp (Green API): шаблоны сообщений, автонапоминания ----------
   S.wa = { tpl:{ключ:{on,text}}, due:{before,day}, time:'09:00', over:{every}, tz, origin }.
   Сообщения при действиях (договор, долг, платёж, перенос) отправляет приложение через /api/notify;
   «День оплаты» и «Просрочку» отправляет сервер сам по расписанию (waTick в server.js). */
const WT=[
  ['new','doc','gold','Оформление рассрочки','Когда вы создаёте договор','Ассаляму алейкум, {имя}!\nОформлена рассрочка «{товар}»: {сумма} на {срок} мес., платёж {платёж} в месяц, первый платёж {дата}.'],
  ['debt','coin','warn','Новый долг','Когда записываете или увеличиваете долг','Ассаляму алейкум, {имя}!\nЗаписан долг: {сумма}. Всего к возврату: {остаток}, срок — {дата}.'],
  ['pay','check','ok','Принят платёж','Когда вы отмечаете оплату','Ассаляму алейкум, {имя}!\nПринят платёж {сумма} по «{товар}».\nОстаток: {остаток}. Баракаллаху фикум!'],
  ['shift','cal','sky','Перенос графика','Когда переносите платежи','Ассаляму алейкум, {имя}!\nГрафик по рассрочке «{товар}» перенесён на {срок} мес. Ближайший платёж: {сумма} до {дата}. Сумма не изменилась.'],
  ['due','bell','gold','День оплаты','Сам, по расписанию','🔔 *Напоминание об оплате*\n\n*{фио}!*\n\n📅 *{Когда}*, *{дата_полная}* — день оплаты!\n\n🔸 *{товар}*\n   • К оплате: *{сумма}*\n\n`И будьте верны своим обещаниям, ибо за обещания вас призовут к ответу. Quran(17:34)`'],
  ['over','alert','warn','Просрочка','Сам, если платёж не внесён','Ассаляму алейкум, {имя}!\nПо «{товар}» не оплачен платёж {сумма} от {дата} ({дней}). Пожалуйста, оплатите, когда сможете.\nОстаток: {остаток}.']];
const WTK=Object.fromEntries(WT.map(x=>[x[0],x]));
const WVARS=[['имя','Имя Отчество'],['фио','ФИО полностью'],['товар','Товар'],['сумма','Сумма'],['остаток','Остаток'],['дата','Дата'],['платёж','Платёж в месяц'],['срок','Срок, мес.'],['номер','№ договора'],['когда','завтра / сегодня'],['Когда','Завтра / Сегодня'],['дата_полная','Дата с годом'],['дней','Дней просрочки'],['компания','Компания']];
const WEX=()=>({фио:'Исаев Ахмед Магомедович',Когда:'Сегодня',дата_полная:'20 ноября 2026 г.',имя:'Ахмед Магомедович',товар:'iPhone 16 Pro',сумма:'15 000 ₽',остаток:'75 000 ₽',дата:'20 ноября',платёж:'15 000 ₽',срок:'6',номер:'12',когда:'завтра',дней:'3 дня',компания:(me&&me.company)||'XStore 95'});
const WTIMES=['08:00','08:30','09:00','09:30'];
const waS=()=>S.wa||{};
const WFK=['new','debt','pay','shift'];   // у этих сообщений можно выбрать формат
const WFMT={png:['PNG','img','Картинка PNG','Бланк договора картинкой, текст — подписью под ней'],pdf:['PDF','file','Документ PDF','Бланк файлом PDF (формат А4), текст — подписью'],text:['Текст','wa','Только текст','Обычное сообщение без вложений']};
const wtpl=k=>{const t=(waS().tpl||{})[k]||{};return{on:t.on!=null?!!t.on:!['due','over'].includes(k),text:t.text||WTK[k][5],fmt:WFK.includes(k)?(WFMT[t.fmt]?t.fmt:'png'):'text'}};
const waFill=(t,v)=>String(t).replace(/\{([^{}\s]+)\}/g,(m,k)=>v[k]!=null?v[k]:m).replace(/,\s*!/g,'!');
const gOn=()=>{const g=S.green||{};return!!(g.id&&g.token)};
async function saveWa(p){const w={...waS(),...p};try{w.tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Moscow'}catch(e){}if(location.protocol.startsWith('http'))w.origin=SELF;await saveS({wa:w})}
async function saveTpl(k,p){const tp={...(waS().tpl||{})},cur=wtpl(k);tp[k]={on:cur.on,text:cur.text,fmt:cur.fmt,...p};await saveWa({tpl:tp})}
/* отправка клиенту по шаблону: шаблон выключен — только push на его страницу, без WhatsApp */
/* вложение к сообщению по формату шаблона: картинка бланка (PNG) или PDF */
async function waFile(key,kind,item,fmt){if(!fmt||fmt==='text'||!['contract','debt'].includes(kind))return null;
  const k=kind==='contract'?'c':'d',o={mode:key==='shift'?'shift':key==='pay'?'pay':''},nm=imgName(k,item);
  try{return fmt==='pdf'?{blob:await pdfOf(k,item,o),name:nm.replace(/\.png$/,'.pdf'),type:'application/pdf'}:{blob:await docOf(k,item,o),name:nm,type:'image/png'}}catch(e){return null}}
const blob64=async b=>{const a=new Uint8Array(await b.arrayBuffer());let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s)};
async function announceT(key,kind,item,title,vars,phone){
  const t=wtpl(key),body=waFill(t.text,{компания:me&&me.company||'',фио:kind==='contract'?fio(client(item.clientId)||{}):fio(item),...vars});
  if(t.on)return announce(kind,item,title,body,phone,await waFile(key,kind,item,t.fmt));
  let r={push:0,wa:false};if(!LOCAL)try{r=await api('POST','/api/notify',{kind,id:item.id,body})}catch(e){}
  doneSheet(title,body,r,null,'');
}
const waBub=(text,who,att)=>`<div class="wachat"><div class="wahd"><span class="wava">${esc(ini({last:(who||'А М').split(' ')[0],first:(who||'А М').split(' ')[1]||''}))}</span><div><b>${esc(who||'Клиент')}</b><small>в сети</small></div>${I.wa}</div>
  <div class="wabody"><div class="waday">Сегодня</div><div class="wabub${att?' att':''}">${att||''}${text?`<p>${waMd(text)}</p>`:''}<small>${esc(waS().time||'09:00')} ✓✓</small></div></div></div>`;
let WVB=null;
/* разметка WhatsApp в просмотре: *жирный*, _курсив_, ~зачёркнутый~, `моноширинный` */
const waMd=t=>esc(t).replace(/```([\s\S]+?)```/g,'<code>$1</code>').replace(/`([^`\n]+)`/g,'<code>$1</code>').replace(/(^|[\s(«])\*([^*\n]+)\*(?=$|[\s.,!?:;)»—])/g,'$1<b>$2</b>')
  .replace(/(^|[\s(«])_([^_\n]+)_(?=$|[\s.,!?:;)»—])/g,'$1<i>$2</i>').replace(/(^|[\s(«])~([^~\n]+)~(?=$|[\s.,!?:;)»—])/g,'$1<s>$2</s>').replace(/\n/g,'<br>');
/* пример для просмотра шаблона: настоящий договор/долг, если есть (с платежом / переносом), иначе — пример */
function wSample(k){const t=today(),o={mode:k==='shift'?'shift':k==='pay'?'pay':''};
  if(k==='debt'){const d=db.debts.find(x=>x.type==='in'&&x.ops.length);if(d)return{kind:'d',x:d,o};
    return{kind:'d',o:{...o,cl:{address:'г. Ойсхар'}},x:{id:'demo-d',type:'in',last:'Исаев',first:'Ахмед',middle:'Магомедович',phone:'8 928 000-11-22',date:t,due:addMonths(t,2),note:'на ремонт',ops:[{id:'o1',kind:'add',amount:40000,date:t,ts:1}]}}}
  const has=c=>k==='shift'?(c.shifts||[]).length:k==='pay'?(c.payments||[]).length:1,c=db.contracts.find(has);if(c)return{kind:'c',x:c,o};
  const pays=[{id:'p1',amount:16333,date:addMonths(t,-1),ts:1,note:''}];if(k==='pay')pays.push({id:'p2',amount:16333,date:t,ts:2,note:''});
  return{kind:'c',o:{...o,cl:{last:'Исаев',first:'Ахмед',middle:'Магомедович',phone:'8 928 000-11-22',address:'г. Ойсхар, ул. Кадырова, 12'}},
    x:{id:'demo-'+k,no:12,clientId:'',item:'iPhone 16 Pro 256 ГБ',cost:90000,markup:18000,down:10000,months:6,date:addMonths(t,-2),first:addMonths(t,-1),guarantor:'',note:'',ts:1,
      payments:k==='new'?[]:pays,shifts:k==='shift'?[{id:'s1',date:t,months:1,from:1,note:''}]:[]}}}
const waSample=t=>waFill(t,WEX())+'\nВаша страница: '+(location.host?location.host+XB:'xfinance.ru')+'/p/…'+(S.sign?'\n\n'+S.sign:'');
let WLOG=null;
async function loadWaLog(){if(LOCAL||!gOn())return;try{WLOG=await api('GET','/api/wa/log')}catch(e){WLOG={log:[],plan:[],error:e.message}}const b=$('#walog');if(b)b.innerHTML=waLogHtml()}
function waLogHtml(){
  if(!WLOG)return`<div class="pad muted small">Загрузка…</div>`;
  const pl=WLOG.plan||[],lg=WLOG.log||[];
  return`${pl.length?`<div class="waplan">${I.cal}<span>Сегодня в ${esc(waS().time||'09:00')} уйдёт: <b>${plural(pl.length,['напоминание','напоминания','напоминаний'])}</b></span></div>`:''}
  ${lg.length?lg.slice(0,8).map(x=>`<div class="rw"><div class="n ${x.kind==='over'?'warn':'gold'}">${x.kind==='over'?I.alert:I.bell}</div><div class="g"><b>${esc(x.who)}</b><small>${x.kind==='over'?'Просрочка':'День оплаты'} · ${tm(x.created)}</small></div>${x.ok?`<span class="chip ok">${I.check}Отправлено</span>`:`<span class="chip warn" title="${esc(x.err)}">Ошибка</span>`}</div>`).join('')
    :`<div class="pad muted small">Автонапоминаний ещё не было.</div>`}`;
}
function waRow(k){const[,ic,tone,t,sub]=WTK[k],w=wtpl(k);
  return`<div class="wtr${w.on?'':' off'}"><span class="sic ${tone}">${I[ic]}</span><span class="st"><b>${t}</b><small>${sub}</small>
    <span class="wexr"><button class="wex" data-a="wtView" data-k="${k}" title="Просмотр">${esc(waFill(w.text,WEX()).replace(/[*_~`]/g,'').replace(/\s*\n\s*/g,' '))}</button><button class="x" data-a="wtView" data-k="${k}" aria-label="Как будет выглядеть" title="Просмотр">${I.eye}</button><button class="x" data-a="wtEdit" data-k="${k}" aria-label="Изменить текст" title="Изменить текст">${I.edit}</button>${WFK.includes(k)?`<button class="wfm f-${w.fmt}" data-a="wtFmt" data-k="${k}" aria-label="Формат сообщения" title="Формат: ${WFMT[w.fmt][2]}">${WFMT[w.fmt][0]}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg></button>`:''}</span></span>
    ${sTog(w.on,'wtTog',k,t)}</div>`}
function waPage(){
  const g=S.green||{},on=gOn(),w=waS(),due=w.due||{},bef=due.before!==false,day=due.day!==false,time=w.time||'09:00',every=+((w.over||{}).every)||0;
  if(!WLOG&&on)setTimeout(loadWaLog,50);
  const conn=LOCAL?`<div class="card pad note">WhatsApp через Green API работает, когда приложение открыто с вашего сервера и вы вошли в аккаунт. Без сервера сообщения можно отправлять вручную кнопкой «WhatsApp».</div>`
  :`<form class="card wac" id="waf" autocomplete="off" onsubmit="return false">
    <div class="gwh"><span class="gwi">${I.wa}</span><div><b>${on?'Green API подключён':'Подключите Green API'}</b><small>${on?'Сообщения уходят клиентам сами — с вашего номера WhatsApp.':'Вставьте ключи из кабинета green-api.com — и сообщения будут уходить клиентам сами.'}</small><i class="schip ${on?'ok':''}">${on?'Подключено':'Не подключено'}</i></div></div>
    ${fld('Адрес API · apiUrl','url',g.url||'https://api.green-api.com','autocapitalize="none" spellcheck="false" inputmode="url"')}
    <div class="g2">${fld('ID инстанса · idInstance','id',g.id||'','inputmode="numeric" spellcheck="false" placeholder="1101000000"')}
      <label class="field"><span>Ключ · apiTokenInstance</span><span class="pwf"><input name="token" type="password" value="${esc(g.token||'')}" autocapitalize="none" spellcheck="false" placeholder="токен из кабинета"><button type="button" class="x" data-a="pwEye" aria-label="Показать ключ">${I.eye||I.search}</button></span></label></div>
    <div class="gstate" id="gst">${on?'Нажмите «Проверить», чтобы узнать состояние номера':'После ввода ключей нажмите «Проверить», затем «Сохранить»'}</div>
    <div class="row-btns wabtn"><button type="button" class="btn soft" data-a="greenCheck">${I.sync}Проверить</button><button type="button" class="btn primary" data-a="waKeys">${I.check}Сохранить</button>${on?`<button type="button" class="btn danger" data-a="greenOff">Отключить</button>`:''}</div>
    <details class="wahow"><summary>Где взять ключи${I.back}</summary><ol class="gsteps"><li><b>Зарегистрируйтесь</b> на <a href="https://green-api.com" target="_blank" rel="noopener">green-api.com</a> и создайте инстанс.</li><li><b>Подключите номер:</b> в кабинете отсканируйте QR-код в WhatsApp → «Связанные устройства».</li><li><b>Скопируйте</b> apiUrl, idInstance и apiTokenInstance в поля выше. Логин и пароль от кабинета вводить не нужно — только эти ключи.</li></ol></details></form>`;
  return`${conn}
  <h2>Сообщения клиентам</h2>
  <div class="card wtl">${['new','debt','pay','shift'].map(waRow).join('')}</div>
  <h2>Напоминания по расписанию</h2>
  <div class="card wtl">${waRow('due')}
    <div class="wasch"><div class="wsl">Когда напомнить</div><div class="wchips"><button class="wch${bef?' on':''}" data-a="waDue" data-k="before">${I.cal}За день до оплаты</button><button class="wch${day?' on':''}" data-a="waDue" data-k="day">${I.bell}В день оплаты</button></div></div>
    ${waRow('over')}
    <div class="wasch"><div class="wsl">Повторять при просрочке</div><div class="seg wseg">${[[0,'Один раз'],[3,'Каждые 3 дня'],[7,'Раз в неделю']].map(([v,l])=>`<button class="${every===v?'on':''}" data-a="waEvery" data-v="${v}">${l}</button>`).join('')}</div></div>
    <div class="wasch wtime"><div class="wsl">Время отправки</div><div class="wchips">${WTIMES.map(t=>`<button class="wch tm${time===t?' on':''}" data-a="waTime" data-v="${t}">${t.replace(/^0/,'')}</button>`).join('')}
      <label class="wch tin${WTIMES.includes(time)?'':' on'}">${I.edit}<input type="time" value="${esc(time)}" onchange="waTimeSet(this.value)" aria-label="Своё время"></label></div>
      <small class="wnote">По вашему времени (${esc((()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone}catch(e){return'Europe/Moscow'}})())}). Каждое напоминание уходит один раз — повторов в тот же день не будет.</small></div></div>
  <h2>Подпись и журнал</h2>
  <div class="card sgrp">${sRow(I.edit,'ink','Подпись в сообщениях',S.sign?esc(S.sign):'Не задана — добавляется в конце каждого сообщения',sGo(),'data-a="signForm"')}
    ${!LOCAL&&on?sRow(I.send,'wa','Отправить тест себе',`На ваш номер ${esc(me.phone||'— укажите его в аккаунте')}`,sGo(),'data-a="waTest" data-k="pay"'):''}</div>
  ${!LOCAL&&on?`<div class="card rows walog" id="walog" style="margin-top:10px">${waLogHtml()}</div>`:''}`;
}
function wtLive(){const ta=$('#wtta'),p=$('#wtpv');if(ta&&p)p.innerHTML=waBub(waSample(ta.value),WEX().имя)}
function waTimeSet(v){if(!/^\d\d:\d\d$/.test(v))return;saveWa({time:v}).then(()=>{render();toast('Напоминания будут уходить в '+v)})}

/* ---------- формы ---------- */
function contractForm(c,presetClient){
  const dv=db.investors.find(i=>i.isDefault);
  const e=c||{clientId:presetClient||(db.clients.length?'':'new'),investorId:dv?dv.id:'',invPct:dv?dv.pct:'',item:'',cost:'',markup:'',down:'',months:dv?dv.months:6,date:today(),first:addMonths(today(),1),note:''};
  const opts=alive().sort((a,b)=>fio(a).localeCompare(fio(b),'ru')).map(x=>`<option value="${x.id}"${x.id===e.clientId?' selected':''}>${esc(fio(x))}${x.black?' ⛔':''}</option>`).join('');
  const iopts=db.investors.map(x=>`<option value="${x.id}"${x.id===e.investorId?' selected':''}>${esc(fio(x))}${x.isDefault?' ★':''}</option>`).join('');
  sheet(c?'Изменить договор':'Новый договор',`
  <label class="field"><span>Клиент</span><select name="clientId"><option value="" disabled${e.clientId?'':' selected'}>Выберите контакт</option>${opts}<option value="new"${e.clientId==='new'?' selected':''}>+ Новый контакт</option></select></label>
  <div class="bwarn" id="bwarn"></div>
  <div id="newcl" ${e.clientId==='new'?'':'hidden'}>${fioFields({},'cfio')}${fld('Телефон','cphone','','inputmode="tel" placeholder="8 928 000-00-00"')}</div>
  ${fld('Товар','item',e.item,'placeholder="Например: iPhone 16 Pro"')}
  <div class="two">${mfld('Цена товара, ₽','cost',e.cost)}
  <label class="field"><span>Наценка</span><div class="combo"><input name="markup" inputmode="decimal" placeholder="0" value="${e.markup?String(e.markup).replace('.',','):''}"><div class="tg"><button type="button" data-a="mk" data-m="p">%</button><button type="button" class="on" data-a="mk" data-m="r">₽</button></div></div><input type="hidden" name="mmode" value="r"></label></div>
  <div class="two">${mfld('Первый взнос, ₽','down',e.down)}${fld('Срок, месяцев','months',e.months,'inputmode="numeric"')}</div>
  <div class="two">${fld('Дата договора','date',e.date,'type="date"')}${fld('Первый платёж','first',e.first,'type="date"')}</div>
  <div class="two"><label class="field"><span>Инвестор</span><select name="investorId"><option value="">Без инвестора</option>${iopts}<option value="new">+ Новый инвестор</option></select></label>
  <div id="ipct" ${e.investorId?'':'hidden'}>${fld('Доля инвестора, %','invPct',e.invPct,'inputmode="decimal"')}</div></div>
  <div id="newinv" class="two" hidden>${fld('Фамилия инвестора','ilast')}${fld('Имя инвестора','ifirst')}</div>
  <div class="sum" id="sum"></div>
  ${fld('Поручитель','guarantor',e.guarantor||'','placeholder="Фамилия и имя поручителя"')}
  <label class="field"><span>Заметка</span><textarea name="note" rows="2" placeholder="Залог, условия">${esc(e.note)}</textarea></label>`,
  async f=>{
    const v=readContract(f);
    if(!f.clientId)return'Выберите клиента.';
    if(f.clientId==='new'&&!f.cfio.trim())return'Укажите ФИО клиента.';
    if(!f.item.trim())return'Укажите товар.';
    if(v.cost<=0)return'Укажите цену товара.';
    if(v.months<1||v.months>120)return'Срок: от 1 до 120 месяцев.';
    if(v.down>v.cost+v.markup)return'Первый взнос больше цены в рассрочку.';
    if(!f.date||!f.first)return'Укажите даты.';
    if(f.investorId&&(v.invPct<0||v.invPct>100))return'Доля инвестора: от 0 до 100%.';
    if(f.investorId==='new'&&!f.ilast.trim()&&!f.ifirst.trim())return'Укажите фамилию или имя инвестора.';
    if(c&&sumBy(c.payments,p=>p.amount)>v.cost+v.markup-v.down)return'Уже получено больше, чем остаток по новым условиям.';
    let cid=f.clientId,iid=f.investorId;
    if(cid==='new'){const n={id:uid(),...fioOf(f,'cfio'),phone:f.cphone.trim(),phone2:'',address:'',note:'',files:[]};await put('client',n);cid=n.id}
    if(iid==='new'){const n={id:uid(),last:f.ilast.trim(),first:f.ifirst.trim(),middle:'',phone:'',months:v.months,pct:v.invPct,isDefault:!db.investors.length,note:''};await put('investor',n);iid=n.id}
    const data={clientId:cid,investorId:iid,invPct:iid?v.invPct:0,item:f.item.trim(),cost:v.cost,markup:v.markup,down:v.down,months:v.months,date:f.date,first:f.first,guarantor:f.guarantor.trim(),note:f.note.trim()};
    const isNew=!c;if(c)Object.assign(c,data);else c={id:uid(),no:Math.max(0,...db.contracts.map(x=>x.no||0))+1,payments:[],ts:Date.now(),...data};
    await put('contract',c);
    go('#/contract/'+c.id);
    if(isNew&&!LOCAL){const cl=client(cid),k=calc(c);
      await announceT('new','contract',c,'Договор создан',{имя:hello(cl),товар:c.item,сумма:money(k.fin),срок:c.months,платёж:money(k.monthly),дата:fdate(c.first),номер:c.no,остаток:money(k.left)},cl.phone);return'keep'}
    toast('Договор сохранён');
  });
  updSum();blackWarn(e.clientId);
}
function blackWarn(id){const w=$('#bwarn');if(!w)return;const c=db.clients.find(x=>x.id===id);
  w.innerHTML=c&&c.black?`<div class="bw">${I.ban}<div><b>Контакт в чёрном списке</b><span>${esc(c.blackNote||'Причина не указана')}</span></div></div>`:''}
function readContract(f){
  const cost=num(f.cost),m=num(f.markup);
  return{cost,markup:f.mmode==='p'?r2(cost*m/100):m,down:num(f.down),months:parseInt(f.months)||0,invPct:num(f.invPct)};
}
function updSum(){
  const s=$('#sum');if(!s)return;const f=formData(),v=readContract(f),total=v.cost+v.markup,fin=Math.max(0,total-v.down),n=Math.max(1,v.months),ip=f.investorId?r2(v.markup*v.invPct/100):0;
  s.innerHTML=`<div>Наценка<b class="num">${money(v.markup)}</b></div><div>Цена в рассрочку<b class="num">${money(total)}</b></div><div>Остаток после взноса<b class="num">${money(fin)}</b></div>
  ${f.investorId?`<div>Прибыль инвестора<b class="num">${money(ip)}</b></div><div>Прибыль компании<b class="num">${money(v.markup-ip)}</b></div>`:''}<div class="m">Платёж в месяц<b class="num">${money(Math.floor(fin/n))}</b></div>`;
}
/* файлы контакта */
let pend=[],delF=[],curFiles=[],fKind={};
/* виды документов у фото контакта */
const DOCK=[['pass','Паспорт'],['reg','Прописка'],['lic','Права'],['snils','СНИЛС'],['inn','ИНН'],['sts','СТС / ПТС'],['dog','Договор'],['ras','Расписка'],['other','Другое']];
const dkName=k=>(DOCK.find(x=>x[0]===k)||[0,'Документ'])[1];
const dkGuess=(name,used)=>{const n=(name||'').toLowerCase();for(const[k,re]of[['pass',/паспорт|passport|pasport/],['lic',/прав|prava|vodit|license|licen/],['snils',/снилс|snils/],['inn',/инн|inn\b/],['dog',/договор|dogovor|contract/],['ras',/расписк|raspis/],['sts',/стс|птс|sts|pts/],['reg',/пропис|registr|propis/]])if(re.test(n))return k;
  return['pass','reg','lic','snils','other'].find(k=>!used.includes(k))||'other'};
const dkSel=(k,attr)=>`<select class="dksel" ${attr} aria-label="Вид документа">${DOCK.map(([v,l])=>`<option value="${v}"${v===(k||'other')?' selected':''}>${l}</option>`).join('')}</select>`;
/* локальный режим: файлы в IndexedDB (lf:<id>), ссылки на них — LF */
const LF={};let lfBusy=false;
const fileUrl=f=>f.local?(LF[f.id]||''):XB+'/api/files/'+f.id;
/* ---- просмотр фото документов: листание, главная, удаление ---- */
let PV=null;
function pvList(mode,cid){
  if(mode==='form'){const cur=curFiles.filter(f=>!delF.includes(f.id)).map(f=>({id:f.id,url:fileUrl(f),type:f.type,kind:fKind[f.id]||f.kind,name:f.name,local:f.local}));
    return cur.concat(pend.map((f,i)=>({id:'p'+i,pi:i,url:f.url,type:f.type,kind:f.kind,name:f.name})))}
  const c=db.clients.find(x=>x.id===cid);return(c&&c.files||[]).map(f=>({id:f.id,url:fileUrl(f),type:f.type,kind:f.kind,name:f.name,local:f.local}))}
function pvMain(){if(!PV)return'';if(PV.mode==='form')return fMainF;const c=db.clients.find(x=>x.id===PV.cid);return c&&c.mainPhoto||''}
function pvOpen(mode,cid,id){const list=pvList(mode,cid);if(!list.length)return;PV={mode,cid,list,i:Math.max(0,list.findIndex(f=>f.id===id)),arm:false};
  let v=$('#pv');if(!v){v=document.createElement('div');v.id='pv';v.className='pv';document.body.append(v)}
  v.innerHTML='<div class="pvt"></div><div class="pvs" id="pvs"></div><div class="pvb"></div>';ovOpen('view',()=>pvClose(true));pvDraw(0);
  const st=$('#pvs');let x0=null;st.onpointerdown=e=>{x0=e.clientX};st.onpointerup=e=>{if(x0==null)return;const dx=e.clientX-x0;x0=null;if(Math.abs(dx)>50)pvGo(dx<0?1:-1);else if(e.target===st)pvExit()};}
function pvExit(){pvClose();ovDone('view')}
function pvClose(){const v=$('#pv');if(v){v.classList.add('out');setTimeout(()=>v.remove(),220)}PV=null}
function pvGo(n){if(!PV)return;const L=PV.list.length;if(L<2)return;PV.i=(PV.i+n+L)%L;PV.arm=false;pvDraw(n)}
function pvDraw(dir){const v=$('#pv');if(!v||!PV)return;const f=PV.list[PV.i],L=PV.list.length,main=pvMain()===f.id,ro=PV.mode==='ro',pdf=f.type==='application/pdf';
  v.querySelector('.pvt').innerHTML=`<span class="pvc">${PV.i+1} / ${L}</span><b>${esc(dkName(f.kind))}</b>${main?`<i class="pvm">${I.star}Главное</i>`:''}<button class="pvx" data-a="pvX" aria-label="Закрыть">${I.x}</button>`;
  v.querySelector('.pvs').innerHTML=(L>1?`<button class="pva l" data-a="pvPrev" aria-label="Назад">${I.back}</button>`:'')+
    (pdf?`<div class="pvpdf" style="--d:${dir||0}">${I.file}<b>PDF-документ</b><small>${esc(f.name||'')}</small><button class="btn primary" data-a="pvOrig">Открыть PDF</button></div>`:`<img src="${f.url}" alt="" style="--d:${dir||0}" draggable="false">`)+
    (L>1?`<button class="pva r" data-a="pvNext" aria-label="Дальше">${I.back}</button>`:'');
  v.querySelector('.pvb').innerHTML=(L>1?`<div class="pvth">${PV.list.map((x,i)=>`<button class="${i===PV.i?'on':''}${pvMain()===x.id?' m':''}" data-a="pvTo" data-i="${i}">${x.type==='application/pdf'?I.file:`<img src="${x.url}" alt="">`}</button>`).join('')}</div>`:'')+
    `<div class="pvac">${!ro&&!pdf?`<button class="pvbt${main?' on':''}" data-a="pvStar">${I.star}<span>Главное фото</span></button>`:''}
      <button class="pvbt" data-a="pvOrig">${I.eye}<span>Оригинал</span></button>
      ${!ro?`<button class="pvbt del${PV.arm?' arm':''}" data-a="pvDel">${I.trash}<span>${PV.arm?'Точно удалить?':'Удалить'}</span></button>`:''}</div>`;
}
document.addEventListener('keydown',e=>{if(!PV)return;if(e.key==='ArrowRight')pvGo(1);else if(e.key==='ArrowLeft')pvGo(-1)});
let fMainF='';
/* перерисовать то, что под просмотром (страница контакта, окно проверки) */
function pvBg(){const ck=$('#form.ckds');if(ck&&PV){const x=CKR.find(y=>y.c.id===PV.cid);if(x){const w=ck.querySelector('.ckd');if(w)w.outerHTML=ckDetail(x)}}else if(!$('#pf'))render()}
async function lfLoad(){if(lfBusy)return;const need=db.clients.flatMap(c=>(c.files||[]).filter(f=>f.local&&!LF[f.id]));if(!need.length)return;lfBusy=true;let n=0;
  for(const f of need){try{const b=await kvs('get','lf:'+f.id);if(b){LF[f.id]=URL.createObjectURL(b);n++}else LF[f.id]=''}catch(e){LF[f.id]=''}}lfBusy=false;if(n)render()}
async function filesAdd(list,cnt,push){ /* общий разбор выбранных файлов: проверка вида, размера, сжатие */
  let room=5-cnt,skip=0;const out=[];
  for(const file of list){if(!/^image\/|^application\/pdf$/.test(file.type)){toast('Можно добавить фото или PDF');continue}
    if(room<=0){skip++;continue}const blob=await shrink(file);if(blob.size>8e6){toast('Файл больше 8 МБ: '+file.name);continue}
    out.push({blob,name:file.name||'photo.jpg',type:blob.type==='application/pdf'?blob.type:(blob===file?file.type:'image/jpeg')});room--}
  if(skip)toast(`Не больше 5 файлов — пропущено: ${skip}`);return out}
function filesHtml(){
  const cur=curFiles.filter(f=>!delF.includes(f.id)),n=cur.length+pend.length;
  const pv=(t,u)=>t==='application/pdf'?`<span class="pdf">${I.file}PDF</span>`:`<img src="${u}" alt="">`;
  if(!fMainF||![...cur.map(f=>f.id),...pend.map((_,i)=>'p'+i)].includes(fMainF))fMainF=(cur.find(f=>f.type!=='application/pdf')||{}).id||(pend.findIndex(f=>f.type!=='application/pdf')>=0?'p'+pend.findIndex(f=>f.type!=='application/pdf'):'');
  const mk=id=>fMainF===id?`<i class="dmain">${I.star}</i>`:'',op=id=>`data-a="view" data-m="form" data-id="${id}"`;
  const tiles=cur.map((f,i)=>`<div class="dtile${fMainF===f.id?' main':''}" style="--i:${i}"><div class="dimg"><button type="button" class="dop" ${op(f.id)} aria-label="Открыть">${pv(f.type,fileUrl(f))}</button>${mk(f.id)}<button type="button" class="rm" data-a="rmFile" data-f="${f.id}" aria-label="Убрать">${I.x}</button></div>${dkSel(fKind[f.id]||f.kind,`data-fk="${f.id}"`)}</div>`).join('')+
    pend.map((f,i)=>`<div class="dtile${fMainF==='p'+i?' main':''}" style="--i:${cur.length+i}"><div class="dimg"><button type="button" class="dop" ${op('p'+i)} aria-label="Открыть">${pv(f.type,f.url)}</button>${mk('p'+i)}<button type="button" class="rm" data-a="rmFile" data-i="${i}" aria-label="Убрать">${I.x}</button></div>${dkSel(f.kind,`data-pk="${i}"`)}</div>`).join('')+
    Array.from({length:5-n},(_,j)=>`<button type="button" class="dtile empty${j?'':' first'}" data-a="addFile" aria-label="Добавить файл"><span class="dimg">${I.plus}</span><small>${j?'Пусто':'Добавить'}</small></button>`).join('');
  const c=$('#fcnt');if(c)c.textContent=n+'/5';const z=$('#dz');if(z)z.classList.toggle('full',n>=5);
  return tiles;
}
function docBox(){return`<div class="field docs"><span class="dhd"><span>Документы · до 5 файлов</span><b id="fcnt">0/5</b></span>
  <div class="dz" id="dz"><div class="dzt">${I.upl}<div><b class="pc">Перетащите сюда фото или PDF</b><b class="mb">Паспорт, права, СНИЛС, договор</b><small class="pc">или нажмите «Выбрать файлы» · можно сразу несколько · Ctrl+V — вставить снимок</small><small class="mb">Можно выбрать сразу несколько файлов</small></div></div>
    <div class="dzb"><button type="button" class="btn soft cam" data-a="camFile">${I.cam}Камера</button><button type="button" class="btn soft" data-a="addFile">${I.file}Выбрать файлы</button></div></div>
  <div class="dtiles" id="pf">${filesHtml()}</div>
  <div class="note" style="margin:8px 2px 0">Под каждым фото выберите, что это: паспорт, прописка, права… Большие фото сжимаются автоматически.</div></div>`}
async function shrink(file){
  if(!file.type.startsWith('image/'))return file;
  try{const bm=await createImageBitmap(file),k=Math.min(1,1600/Math.max(bm.width,bm.height)),cv=document.createElement('canvas');cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);
    cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);return await new Promise(r=>cv.toBlob(b=>r(b||file),'image/jpeg',.82))}catch(e){return file}
}
function clientForm(c,after){
  const e=c||{last:'',first:'',middle:'',phone:'',phone2:'',address:'',note:'',files:[]};curFiles=(e.files||[]).slice();pend=[];delF=[];fKind={};fMainF=e.mainPhoto||'';
  sheet(c?'Изменить контакт':'Новый контакт',fioFields(e)+
  fld('Номер телефона','phone',e.phone,'inputmode="tel" autocomplete="off" placeholder="8 928 000-00-00"')+
  fld('Дополнительный номер','phone2',e.phone2||'','inputmode="tel" autocomplete="off" placeholder="Необязательно"')+
  fld('Проживание','address',e.address||'','placeholder="Город, улица, дом"')+
  `<div class="blk${e.black?' on':''}" id="blk"><div class="sw"><div><b>Чёрный список</b><small>Отметка для ненадёжных клиентов</small></div>
    <button type="button" class="tog${e.black?' on':''}" data-a="blackTog" aria-label="Чёрный список"></button></div><input type="hidden" name="black" value="${e.black?1:''}">
    <div class="blw"><div><label class="field" style="margin:0"><span>Причина добавления в чёрный список</span><textarea name="blackNote" rows="3" placeholder="Например: не платит третий месяц, не выходит на связь">${esc(e.blackNote||'')}</textarea></label></div></div></div>`+
  docBox()+`<label class="chk"><input type="checkbox" name="consent"${e.consent?' checked':''}><span>Человек дал согласие на обработку персональных данных и хранение копий документов</span></label>`,async f=>{
    const n=fioOf(f);if(!n.last)return'Укажите фамилию, имя и отчество.';
    const hasFiles=curFiles.filter(x=>!delF.includes(x.id)).length+pend.length>0;
    if(hasFiles&&!f.consent)return'Чтобы хранить документы, отметьте согласие.';
    if(f.black&&!(f.blackNote||'').trim())return'Укажите причину добавления в чёрный список.';
    const data={...n,phone:(f.phone||'').trim(),phone2:(f.phone2||'').trim(),address:(f.address||'').trim(),consent:f.consent?(e.consent||today()):'',black:!!f.black,blackNote:f.black?(f.blackNote||'').trim():''};
    if(c)Object.assign(c,data);else c={id:uid(),files:[],note:'',...data};
    const up=pend.slice(),rm=delF.slice(),fm=fMainF;for(const x of c.files||[])if(fKind[x.id])x.kind=fKind[x.id];if(fm&&!fm.startsWith('p'))c.mainPhoto=fm;await put('client',c);
    if(LOCAL&&(up.length||rm.length)){
      for(const id of rm){await kvs('del','lf:'+id).catch(()=>{});if(LF[id])URL.revokeObjectURL(LF[id]);delete LF[id];c.files=c.files.filter(x=>x.id!==id)}
      for(const[j,p]of up.entries()){const id=uid();try{await kvs('put','lf:'+id,p.blob);LF[id]=URL.createObjectURL(p.blob);c.files.push({id,name:p.name,type:p.type,size:p.blob.size,kind:p.kind,local:1});if(fm==='p'+j)c.mainPhoto=id}catch(x){toast('Не удалось сохранить фото на устройстве')}}
      if(c.mainPhoto&&!c.files.some(x=>x.id===c.mainPhoto))c.mainPhoto='';
      if(!c.mainPhoto){const m=c.files.find(x=>x.type!=='application/pdf');if(m)c.mainPhoto=m.id}
      await put('client',c);
    }
    if(!LOCAL&&(up.length||rm.length)){
      for(const id of rm){await api('DELETE','/api/files/'+id).catch(()=>{});c.files=c.files.filter(x=>x.id!==id)}
      let i=0;for(const p of up){i++;const b=$('#form [type=submit]');if(b)b.textContent=`Загрузка фото ${i} из ${up.length}…`;
        try{const r=await api('POST',`/api/files?item=${c.id}&name=${encodeURIComponent(p.name)}`,p.blob,p.type);c.files.push({...r.file,kind:p.kind});if(fm==='p'+(i-1))c.mainPhoto=r.file.id}
        catch(x){if(!x.net)throw x;const q=obAdd('file','client',c.id,{name:p.name,type:p.type,title:'Фото · '+fio(c)});await kvs('put','ob:'+q.id,p.blob);obMark(q,'wait',x.message);netNote()}}
      if(c.mainPhoto&&!c.files.some(x=>x.id===c.mainPhoto))c.mainPhoto='';
      if(!c.mainPhoto){const m=c.files.find(x=>x.type!=='application/pdf');if(m)c.mainPhoto=m.id}
      await put('client',c);
    }
    for(const d of db.debts.filter(x=>x.contactId===c.id)){const ch=d.last!==c.last||d.first!==c.first||d.middle!==c.middle||d.phone!==c.phone;if(ch){Object.assign(d,{last:c.last,first:c.first,middle:c.middle,phone:c.phone});await put('debt',d)}}
    toast(LOCAL?'Контакт сохранён':'Контакт сохранён, ссылка создана');if(after)return after(c);go('#/client/'+c.id);
  });
}
function investorForm(i){
  const e=i||{last:'',first:'',middle:'',phone:'',months:12,pct:50,note:''};
  sheet(i?'Изменить инвестора':'Новый инвестор',fioFields(e)+fld('Телефон','phone',e.phone,'inputmode="tel" placeholder="8 928 000-00-00"')+
  `<div class="three">${fld('Срок, мес.','months',e.months,'inputmode="numeric"')}${fld('Инвестору, %','pct',e.pct,'inputmode="decimal"')}${fld('Компании, %','cpct',r2(100-e.pct),'inputmode="decimal"')}</div>
  <div class="note" style="margin:-4px 2px 12px">Проценты делят наценку по договору между инвестором и компанией. Срок подставляется в новый договор.</div>
  ${fld('Заметка','note',e.note)}${i?'':`<label class="chk"><input type="checkbox" name="def"${db.investors.length?'':' checked'}><span>Выбирать этого инвестора по умолчанию в новых договорах</span></label>`}`,async f=>{
    const n=fioOf(f),pct=num(f.pct),months=parseInt(f.months)||0;
    if(!n.last&&!n.first)return'Укажите фамилию или имя.';
    if(pct<0||pct>100)return'Доля инвестора: от 0 до 100%.';
    if(months<1||months>120)return'Срок: от 1 до 120 месяцев.';
    const data={...n,phone:f.phone.trim(),months,pct,note:f.note.trim()};
    if(i)Object.assign(i,data);else i={id:uid(),isDefault:false,...data};
    await put('investor',i);if(f.def)await setDefault(i.id,true);
    toast('Инвестор сохранён');go('#/investor/'+i.id);
  });
}
async function setDefault(id,on){
  for(const x of db.investors){const v=on&&x.id===id;if(!!x.isDefault!==v){x.isDefault=v;await put('investor',x)}}
}
function debtForm(d,preset){
  const e=d||{type:dtab==='out'?'out':'in',contactId:preset||'',last:'',first:'',middle:'',phone:'',date:today(),due:'',note:''};
  const opts=alive().sort((a,b)=>fio(a).localeCompare(fio(b),'ru')).map(c=>`<option value="${c.id}"${c.id===e.contactId?' selected':''}>${esc(fio(c))}${c.black?' ⛔':''}</option>`).join('');
  const cur=e.contactId?'':'new';
  sheet(d?'Изменить долг':'Новый долг',`<div class="seg" style="margin-bottom:14px"><button type="button" class="${e.type==='in'?'on':''}" data-a="dtype" data-t="in">Мне должны</button><button type="button" class="${e.type==='out'?'on':''}" data-a="dtype" data-t="out">Я должен</button></div>
  <input type="hidden" name="type" value="${e.type}">
  <label class="field"><span>Контакт</span><select name="contactId"><option value="new"${cur?' selected':''}>+ Новый контакт</option>${opts}</select></label>
  <div class="bwarn" id="bwarn"></div>
  <div id="newdc" ${cur?'':'hidden'}>${fioFields(e)}${fld('Номер телефона (WhatsApp)','phone',e.phone,'inputmode="tel" autocomplete="off" placeholder="8 928 000-00-00"')}</div>
  ${d?'':mfld('Сумма долга, ₽','amount','')}
  <div class="two">${fld('Дата','date',e.date,'type="date"')}${fld('Вернуть до','due',e.due,'type="date"')}</div>${fld('Заметка','note',e.note)}`,async f=>{
    let ct=db.clients.find(c=>c.id===f.contactId);
    if(!ct){const n=fioOf(f);if(!n.last)return'Укажите ФИО или выберите контакт.';}
    const a=num(f.amount);if(!d&&a<=0)return'Укажите сумму.';
    if(!ct){ct={id:uid(),...fioOf(f),phone:(f.phone||'').trim(),phone2:'',address:'',note:'',files:[]};await put('client',ct)}
    const data={type:f.type,contactId:ct.id,last:ct.last,first:ct.first,middle:ct.middle,phone:ct.phone,date:f.date||today(),due:f.due||'',note:f.note.trim()},isNew=!d;
    if(d){if(d.due&&data.due&&data.due>d.due)d.moves=[...(d.moves||[]),{from:d.due,to:data.due,date:today(),ts:Date.now()}];Object.assign(d,data)}else{d={id:uid(),ops:[{id:uid(),kind:'add',amount:a,date:data.date,note:'',ts:Date.now()}],...data};dtab=d.type}
    await put('debt',d);
    go('#/debt/'+d.id);
    if(isNew&&d.type==='in'){await announceT('debt','debt',d,'Долг добавлен',{имя:hello(d),товар:'долг',сумма:money(a),остаток:money(a),дата:d.due?fdate(d.due):'без срока'},d.phone);return'keep'}
    toast('Долг сохранён');
  });
}
function amountForm(title,max,def,quick,ok,done){
  sheet(title,`${mfld('Сумма, ₽','amount',def)}${quick.length?`<div class="quick">${quick.map(([l,v])=>`<button type="button" class="btn sm" data-a="setAmt" data-v="${v}">${l} · ${money(v)}</button>`).join('')}</div>`:''}
  ${fld('Дата','date',today(),'type="date"')}${fld('Заметка','note','','placeholder="Наличные, перевод"')}`,async f=>{
    const a=num(f.amount);if(a<=0)return'Укажите сумму.';
    if(max!=null&&a>max)return'Сумма больше остатка ('+money(max)+').';
    return done({id:uid(),amount:a,date:f.date||today(),note:f.note.trim(),ts:Date.now()});
  },ok);
}
function payContract(c,amt){
  const k=calc(c),def=Math.min(k.left,+amt||k.overdue||k.next.rest),qk=[[k.overdue?'Просрочка':'Платёж',def]];if(k.left!==def)qk.push(['Весь остаток',k.left]);
  amountForm('Принять платёж',k.left,def,qk,'Принять',async p=>{
    c.payments.push(p);await put('contract',c);flashId=p.id;
    go('#/contract/'+c.id);
    const k2=calc(c),cl=client(c.clientId);
    await announceT('pay','contract',c,k2.left<=0?'Рассрочка закрыта':'Платёж принят',{имя:hello(cl),товар:c.item,сумма:money(p.amount),остаток:k2.left<=0?'0 ₽ — рассрочка выплачена полностью':money(k2.left),номер:c.no,дата:fdate(p.date),платёж:money(k2.monthly),срок:c.months},cl.phone);return'keep';
  });
}
function opDebt(d,kind){
  const k=dcalc(d),isIn=d.type==='in',pay=kind==='pay';
  amountForm(pay?(isIn?'Принять оплату':'Отдал часть'):(isIn?'Добавить долг':'Взял ещё'),pay?k.left:null,pay?k.left:'',pay?[['Весь долг',k.left]]:[],pay?'Принять':'Добавить',async o=>{
    o.kind=kind;d.ops.push(o);await put('debt',d);flashId=o.id;
    go('#/debt/'+d.id);
    if(!isIn){toast(pay?'Возврат записан':'Долг увеличен');return}
    const k2=dcalc(d);
    await announceT(pay?'pay':'debt','debt',d,pay?(k2.left<=0?'Долг закрыт':'Оплата принята'):'Долг добавлен',{имя:hello(d),товар:'долг',сумма:money(o.amount),остаток:k2.left<=0?'0 ₽ — долг закрыт полностью':money(k2.left),дата:d.due?fdate(d.due):'без срока'},d.phone);return'keep';
  });
}
function pickPay(){
  const rows=[...(S.inst?db.contracts.map(c=>({c,k:calc(c)})).filter(x=>x.k.status!=='done').map(x=>({a:'pay',id:x.c.id,name:fio(client(x.c.clientId)),sub:'№'+x.c.no+' · '+x.c.item,left:x.k.left,over:x.k.status==='overdue'})):[]),
    ...(S.debt?db.debts.map(d=>({d,k:dcalc(d)})).filter(x=>x.d.type==='in'&&x.k.status!=='done').map(x=>({a:'op',id:x.d.id,name:fio(x.d),sub:'Долг',left:x.k.left,over:x.k.status==='overdue'})):[])];
  sheet('От кого оплата?',rows.length?`<input class="search" id="pq" placeholder="Поиск"><div class="card rows" id="plist" style="margin-bottom:6px">${rows.map(r=>`<button type="button" class="rw" style="width:100%;text-align:left" data-a="${r.a}" data-k="pay" data-id="${r.id}" data-s="${esc((r.name+' '+r.sub).toLowerCase())}">
    <div class="g"><b>${esc(r.name)}</b><small${r.over?' style="color:var(--warn)"':''}>${esc(r.sub)}${r.over?' · просрочка':''}</small></div><div class="am num">${money(r.left)}</div></button>`).join('')}</div>`:empty(I.check,'Пока некому платить','Нет открытых договоров и долгов.'),null,null);
}
async function vanish(id){const el=document.querySelector(`[data-row="${id}"]`);if(el){el.classList.add('out');await new Promise(r=>setTimeout(r,270))}}
const b64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function subscribePush(token){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)||!info.vapidKey)throw new Error('Браузер не поддерживает уведомления. На iPhone сначала добавьте страницу на экран «Домой».');
  if(await Notification.requestPermission()!=='granted')throw new Error('Уведомления запрещены в настройках браузера');
  const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(info.vapidKey)});
  await api('POST','/api/subscribe',{token,sub:sub.toJSON()});localStorage.setItem('xf_push_'+(token||'me'),'1');
}

/* ---------- действия ---------- */
const A={
  close:()=>closeSheet(),
  closeOv:(d,el,ev)=>{if(ev.target===el)closeSheet()},
  authMode:d=>{authMode=d.m;render()},
  tab:d=>{ctab=d.t;pendingCat=true},
  cat:(d,el)=>{if(d.k==='inst')ctab=d.t;else ktab=d.t;const r=el.parentNode,x=r.scrollLeft;
    $('#cats').outerHTML=d.k==='inst'?contractCats().replace(/<div class="pullhint"[\s\S]*$/,''):clientCats().replace(/<div class="pullhint"[\s\S]*$/,'');
    const nr=$('#cats .catr');nr.scrollLeft=x;const on=nr.querySelector('.on');if(on)on.scrollIntoView({inline:'nearest',block:'nearest',behavior:'smooth'});
    $('#list').innerHTML=d.k==='inst'?contractsList():clientsList();$('#list').classList.remove('swap');void $('#list').offsetWidth;$('#list').classList.add('swap')},
  acc:(d,el)=>{acct=d.t;try{localStorage.setItem('xf_acct',acct)}catch(e){}const x=el.parentNode.scrollLeft;catOpen=true;render();
    const r=$('#cats .catr');if(r){r.scrollLeft=x;const on=r.querySelector('.on');if(on)r.scrollTo({left:on.offsetLeft-(r.clientWidth-on.offsetWidth)/2,behavior:'smooth'})}
    const b=$('#hbody');if(b){b.classList.remove('swap');void b.offsetWidth;b.classList.add('swap')}},
  dtab:d=>{dtab=d.t;if(location.hash.startsWith('#/debts')){$('#list').innerHTML=debtsList();runCounts()}},
  pickPay,
  plus:()=>plusMenu(!plusOpen),
  plusOut:(d,el,ev)=>{if(ev.target===el)plusMenu(false)},
  plusClose:()=>plusMenu(false),
  pmPay:()=>{plusMenu(false);setTimeout(pickPay,120)},
  pmCheck:()=>{plusMenu(false);nav('#/check');setTimeout(()=>{const i=$('#cq');if(i)i.focus()},350)},
  pmContact:()=>{plusMenu(false);setTimeout(()=>clientForm(),120)},
  pmOps:()=>{plusMenu(false);nav('#/ops')},
  otab:d=>{otab=d.t;oLimit=60;if(!$('#list')){hoLimit=40;render();return}$('#list').innerHTML=opsList();runCounts()},
  oMore:()=>{oLimit+=100;$('#list').innerHTML=opsList()},
  pmInst:()=>{plusMenu(false);setTimeout(()=>contractForm(),120)},
  pmDebt:()=>{plusMenu(false);setTimeout(()=>debtForm(),120)},
  newContract:d=>contractForm(null,d.client),
  editContract:d=>contractForm(db.contracts.find(c=>c.id===d.id)),
  delContract:d=>confirmBox('Удалить договор?','Договор и все его платежи будут удалены без возможности восстановления.','Удалить',async()=>{await del('contract',d.id);nav('#/contracts')}),
  mk:(d,el)=>{$('#form').mmode.value=d.m;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));updSum()},
  shift:d=>{const c=db.contracts.find(x=>x.id===d.id),k=calc(c),from=k.rows.findIndex(r=>r.rest>0);if(from<0)return;
    sheet('Перенести график',`<div class="note" style="margin:-4px 2px 14px">Все неоплаченные платежи, начиная с ${dmy(k.rows[from].date)}, сдвинутся на выбранный срок. Сумма договора не меняется — без доплат и штрафов.</div>
      <div class="field"><span>На сколько месяцев</span><div class="seg" style="margin:0">${[1,2,3,6].map(m=>`<button type="button" class="${m===1?'on':''}" data-a="shm" data-v="${m}">${m} мес.</button>`).join('')}</div><input type="hidden" name="months" value="1"></div>
      ${fld('Причина','note','','placeholder="Например: болезнь, задержка зарплаты"')}`,async f=>{
      const m=parseInt(f.months)||1;c.shifts=c.shifts||[];c.shifts.push({id:uid(),date:today(),months:m,from,note:f.note.trim(),ts:Date.now()});await put('contract',c);go('#/contract/'+c.id);
      const k2=calc(c),cl=client(c.clientId);
      await announceT('shift','contract',c,'График перенесён',{имя:hello(cl),товар:c.item,срок:m,сумма:money(k2.next.rest),дата:fdate(k2.next.date),остаток:money(k2.left),номер:c.no,платёж:money(k2.monthly)},cl.phone);return'keep'},'Перенести')},
  shm:(d,el)=>{$('#form').months.value=d.v;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el))},
  pgo:d=>{const p=$('#pager');if(p)p.scrollTo({left:p.clientWidth*(+d.p),behavior:'smooth'})},
  fStar:async d=>{const c=db.clients.find(x=>x.id===d.id);c.mainPhoto=c.mainPhoto===d.f?'':d.f;await put('client',c);render();toast(c.mainPhoto?'Главное фото контакта':'Главное фото снято')},
  fDel:async(d,el)=>{
    if(!el.classList.contains('arm')){document.querySelectorAll('.gb.del.arm').forEach(b=>b.classList.remove('arm'));el.classList.add('arm');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('arm'),3500);toast('Нажмите ещё раз, чтобы удалить');return}
    const c=db.clients.find(x=>x.id===d.id),t=el.closest('.gt');t.classList.add('out');
    if((c.files||[]).find(x=>x.id===d.f&&x.local)){await kvs('del','lf:'+d.f).catch(()=>{});if(LF[d.f])URL.revokeObjectURL(LF[d.f]);delete LF[d.f]}else await api('DELETE','/api/files/'+d.f);c.files=(c.files||[]).filter(x=>x.id!==d.f);if(c.mainPhoto===d.f)c.mainPhoto='';await put('client',c);
    setTimeout(()=>{if(location.hash==='#/client/'+c.id)render()},260);toast('Фото удалено')},
  fAdd:d=>{const c=db.clients.find(x=>x.id===d.id);upClient=c.id;
    if(!c.consent)return confirmBox('Согласие на хранение документов','Человек дал согласие на обработку персональных данных и хранение копий его документов?','Да, согласие есть',async()=>{c.consent=today();await put('client',c);$('#fpick2').click()},false);
    $('#fpick2').click()},
  pay:d=>payContract(db.contracts.find(x=>x.id===d.id),d.v),
  monthExp:()=>monthSheet('exp'),monthGot:()=>monthSheet('got'),
  delPay:d=>confirmBox('Удалить платёж?','Сумма вернётся в остаток долга.','Удалить',async()=>{const c=db.contracts.find(x=>x.id===d.id);closeSheet(true);await vanish(d.p);if((c.payments.find(p=>p.id===d.p)||{}).srv)c.dropped=[...(c.dropped||[]),d.p];c.payments=c.payments.filter(p=>p.id!==d.p);await put('contract',c);render();return'keep'}),
  setAmt:d=>{$('#form').amount.value=String(d.v).replace('.',',')},
  newClient:()=>clientForm(),
  editClient:d=>clientForm(db.clients.find(c=>c.id===d.id)),
  delClient:d=>{const c=db.clients.find(x=>x.id===d.id),n=db.contracts.filter(x=>x.clientId===c.id).length+db.debts.filter(x=>x.contactId===c.id).length;
    dangerBox('Удалить контакт?',`<b>${esc(fio(c))}</b> переместится в «Удалённые».<br>Все данные${n?`, договоры и долги (${n})`:''} останутся на сервере — контакт можно восстановить в любой момент.`,'Удалить',async()=>{
      const m=$('#main');m.classList.add('leave');await new Promise(r=>setTimeout(r,260));
      c.deleted=today();await put('client',c);toast('Контакт перемещён в «Удалённые»');nav('#/clients');setTimeout(()=>m.classList.remove('leave'),50)})},
  restoreClient:async d=>{const c=db.clients.find(x=>x.id===d.id);delete c.deleted;c.deleted='';await put('client',c);toast('Контакт восстановлен');render()},
  purgeClient:d=>{if(db.contracts.some(c=>c.clientId===d.id)||db.debts.some(x=>x.contactId===d.id))return toast('У контакта есть договоры или долги — навсегда удалить нельзя, можно только хранить в «Удалённых»');confirmBox('Удалить навсегда?','Контакт и фото его документов будут удалены без возможности восстановления.','Удалить навсегда',async()=>{await del('client',d.id);ktab='deleted';catOpen=true;pendingCat=true;nav('#/clients')})},
  addFile:()=>$('#fpick').click(),
  pvX:()=>pvExit(),pvPrev:()=>pvGo(-1),pvNext:()=>pvGo(1),pvTo:d=>{if(PV){const n=+d.i-PV.i;PV.i=+d.i;PV.arm=false;pvDraw(n)}},
  pvOrig:()=>{const f=PV&&PV.list[PV.i];if(f)window.open(f.url,'_blank')},
  pvStar:async()=>{if(!PV)return;const f=PV.list[PV.i];
    if(PV.mode==='form'){fMainF=fMainF===f.id?'':f.id;const p=$('#pf');if(p)p.innerHTML=filesHtml();pvDraw(0);return}
    const c=db.clients.find(x=>x.id===PV.cid);c.mainPhoto=c.mainPhoto===f.id?'':f.id;await put('client',c);pvDraw(0);toast(c.mainPhoto?'Главное фото контакта':'Главное фото снято');pvBg()},
  pvDel:async()=>{if(!PV)return;if(!PV.arm){PV.arm=true;pvDraw(0);return}const f=PV.list[PV.i];
    if(PV.mode==='form'){if(f.pi!=null){URL.revokeObjectURL(pend[f.pi].url);pend.splice(f.pi,1)}else delF.push(f.id);if(fMainF===f.id)fMainF='';const p=$('#pf');if(p)p.innerHTML=filesHtml()}
    else{const c=db.clients.find(x=>x.id===PV.cid);
      if(f.local){await kvs('del','lf:'+f.id).catch(()=>{});if(LF[f.id])URL.revokeObjectURL(LF[f.id]);delete LF[f.id]}else{try{await api('DELETE','/api/files/'+f.id)}catch(e){return toast(e.net?'Нет связи — удалить можно, когда сервер доступен':e.message)}}
      c.files=(c.files||[]).filter(x=>x.id!==f.id);if(c.mainPhoto===f.id)c.mainPhoto='';if(!c.mainPhoto){const m=c.files.find(x=>x.type!=='application/pdf');if(m)c.mainPhoto=m.id}await put('client',c);pvBg()}
    toast('Фото удалено');PV.list=pvList(PV.mode,PV.cid);PV.arm=false;if(!PV.list.length)return pvExit();PV.i=Math.min(PV.i,PV.list.length-1);pvDraw(0)},
  camFile:()=>$('#fcam').click(),
  rmFile:async(d,el)=>{el.parentNode.classList.add('out');await new Promise(r=>setTimeout(r,250));if(d.f)delF.push(d.f);else{URL.revokeObjectURL(pend[d.i].url);pend.splice(+d.i,1)}const p=$('#pf');if(p)p.innerHTML=filesHtml()},
  view:d=>{if(d.c||d.m)return pvOpen(d.m||'client',d.c,d.id);const u=d.l?LF[d.id]:XB+'/api/files/'+d.id;if(!u)return toast('Файл не найден на этом устройстве');if(d.t==='application/pdf')return window.open(u,'_blank');const v=document.createElement('div');v.className='view';v.innerHTML=`<img src="${u}" alt="">`;v.onclick=()=>{v.remove();ovDone('view')};ovOpen('view',()=>v.remove());document.body.append(v)},
  newInvestor:()=>investorForm(),
  editInvestor:d=>investorForm(investor(d.id)),
  defInvestor:async d=>{const i=investor(d.id);await setDefault(d.id,!i.isDefault);render();toast(i.isDefault?'Инвестор выбран по умолчанию':'Инвестор по умолчанию снят')},
  delInvestor:d=>{if(db.contracts.some(c=>c.investorId===d.id))return toast('К инвестору привязаны договоры');
    confirmBox('Удалить инвестора?','Инвестор и его доступ в кабинет будут удалены.','Удалить',async()=>{await del('investor',d.id);nav('#/investors')})},
  access:d=>{const i=investor(d.id);sheet('Доступ инвестора',`<div class="note" style="margin-bottom:12px">Передайте инвестору адрес сайта, логин и пароль. Он увидит только свои договоры и прибыль.</div>${fld('Логин','login',i.login||'','autocapitalize="none" spellcheck="false"')}${fld('Пароль (не короче 8 символов)','password','','type="text" autocomplete="off"')}`,
    async f=>{const r=await api('POST','/api/investor-access',{investorId:i.id,login:f.login,password:f.password});Object.assign(i,r.item);render();toast('Доступ открыт')},i.login?'Сохранить':'Дать доступ')},
  noAccess:d=>confirmBox('Закрыть доступ?','Инвестор больше не сможет войти в кабинет.','Закрыть',async()=>{const i=investor(d.id);await api('DELETE','/api/investor-access/'+i.id);delete i.login;render()}),
  newDebt:d=>debtForm(null,d&&d.client),
  dtype:(d,el)=>{$('#form').type.value=d.t;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el))},
  waLink:d=>{const c=db.clients.find(x=>x.id===d.id),l=linkOf(c);if(!l)return;wa(c.phone,withSign(`Ассаляму алейкум${hello(c)?', '+hello(c):''}!\nВаша личная страница: ${l}\nЗдесь видно все ваши долги и рассрочки, можно подтвердить операции и включить уведомления.`))},
  syncNow:async()=>{await loadData();await loadStats(true);render();toast('Данные загружены с сервера')},
  copyNow:async()=>{if(canDir&&dirH&&AB.get().on){await runAuto(true)}else{download(jsonBackup(),bName('json'));await new Promise(r=>setTimeout(r,600));download(excelBackup(),bName('xlsx'));noteCopy('«Загрузки», вручную')}render();toast('Копия сохранена: JSON и Excel')},
  authSwitch:async d=>{await api('POST','/api/logout').catch(()=>{});me=null;inv=null;db={clients:[],contracts:[],debts:[],investors:[]};NI={unread:0,shared:0,notes:null};authMode=d.m;nav('#/');render()},
  qk:d=>{const t=$('#chatf textarea');t.value=(t.value?t.value+' ':'')+d.v;t.focus()},
  toX:()=>{ktab='x';catOpen=true;pendingCat=true},
  refresh:async(d,el)=>{if(rBusy)return;rBusy=true;bell();const t0=Date.now();let err='';
    if(LOCAL){loadLocal();DV++;await new Promise(r=>setTimeout(r,800));rBusy=false;bell();const b=$('#rfr');if(b){b.classList.add('ok');setTimeout(()=>b.classList.remove('ok'),900)}if(!$('#layer .ov'))render();if(npOpen)npRender();return toast('Данные обновлены')}
    if(stale){await reconnect();if(stale){rBusy=false;bell();return toast('Сервер недоступен — данные в безопасности на устройстве')}}
    try{await obFlush(true);await loadData();fetchNotes();if(TF)loadTariff();stats=null}catch(x){err=x.message}
    await new Promise(r=>setTimeout(r,Math.max(0,900-(Date.now()-t0))));rBusy=false;bell();
    const b=$('#rfr');if(b&&!err){b.classList.add('ok');setTimeout(()=>b.classList.remove('ok'),900)}
    if(!$('#layer .ov'))render();if(npOpen)npRender();
    const pn=obPend();toast(err?err:pn?`Обновлено. Не отправлено: ${pn} — нет связи`:'Всё обновлено и отправлено')},
  obGo:async d=>{const e=OB.find(x=>x.id===d.id);if(!e||e.st==='go')return;const ok=await obRun(e);DV++;
    toast(ok?'Отправлено на сервер':e.err||'Не удалось отправить');if(ok&&!$('#layer .ov'))render();if(npOpen)npRender()},
  propose:d=>{const left=+d.left,def=+d.next||left;
    sheet(d.out?'Мне вернули':'Сообщить об оплате',`<p class="note" style="margin:-4px 2px 14px">${d.out?'Укажите, сколько вам вернули.':'Укажите, сколько вы оплатили.'} Он получит уведомление и подтвердит — после этого остаток изменится у вас обоих.</p>
      ${mfld('Сумма, ₽','amount',Math.min(def,left))}${fld('Дата','date',today(),'type="date"')}${fld('Комментарий','note','','placeholder="Например: перевод на карту"')}
      <p class="note" style="margin:-2px 2px 12px">Остаток сейчас: <b>${money(left)}</b></p>`,
      async f=>{const a=num(f.amount);if(!(a>0))return'Укажите сумму';if(a>left+.001)return'Сумма больше остатка ('+money(left)+')';
        await api('POST',`/api/links/${d.lk}/propose`,{itemId:d.item,amount:a,date:f.date,note:f.note});
        obLog((d.out?'Возврат долга':'Сообщение об оплате')+' · '+money(a),'Ждёт подтверждения');shared=null;loadShared();
        closeSheet();setTimeout(()=>doneSheet('Отправлено','Как только он подтвердит, остаток уменьшится у вас обоих. Ответ придёт в уведомления.',{},'','',''),200);return'keep'},'Отправить')},
  dispute:d=>sheet('Не согласны с операцией?',`<p class="note" style="margin:-4px 2px 14px">Он получит уведомление, что вы не согласны. Операция будет отмечена как оспоренная, пока вы её не примете.</p>${fld('Что не так (необязательно)','note','','placeholder="Например: сумма другая"')}`,
    async f=>{await api('POST',`/api/links/${d.lk}/dispute`,{debtId:d.d,opId:d.id,note:f.note});obLog('Операция оспорена','Отправлено');shared=null;loadShared();toast('Отправлено')},'Отправить'),
  propAcc:async(d,el)=>{const r=await api('POST',`/api/props/${d.id}/accept`);const p=PROPS.find(x=>x.id==d.id);PROPS=PROPS.filter(x=>x.id!=d.id);
    const arr=db[KIND[r.kind]],i=arr.findIndex(x=>x.id===r.item.id);if(i<0)arr.push(r.item);else arr[i]=r.item;DV++;
    const c=el.closest('.prop');if(c){c.classList.add('ok');await new Promise(z=>setTimeout(z,350))}
    obLog('Оплата клиента принята · '+money(p?p.amount:0),'Остаток пересчитан у обоих');fetchNotes();if(npOpen)npRender();if(!$('#layer .ov'))render();toast('Оплата принята — остаток пересчитан у вас обоих')},
  propDec:d=>confirmBox('Отклонить оплату?','Клиент получит уведомление, что оплата не подтверждена.','Отклонить',async()=>{await api('POST',`/api/props/${d.id}/decline`);PROPS=PROPS.filter(x=>x.id!=d.id);obLog('Оплата клиента отклонена','Отправлено');fetchNotes();render();toast('Оплата отклонена')}),
  reconnect:async()=>{toast('Проверяю связь…');await reconnect();if(stale)toast('Сервер пока недоступен — данные в безопасности на устройстве')},
  pingNow:async(d,el)=>{const s=el.querySelector('svg');if(s)s.style.animation='rspin .8s linear infinite';await pingNow();if(s)s.style.animation='';loadServer(true)},
  pingTog:(d,el)=>{PG.on=!PG.on;try{localStorage.setItem('xf_ping',PG.on?'1':'0')}catch(e){}el.classList.toggle('on',PG.on);if(PG.on)pingNow();bell();toast(PG.on?'Пинг показывается в кнопке «Обновить»':'Пинг скрыт')},
  copyCmd:async d=>{try{await navigator.clipboard.writeText(d.v)}catch(e){const a=document.createElement('textarea');a.value=d.v;document.body.append(a);a.select();document.execCommand('copy');a.remove()}toast('Команда скопирована')},
  htab:(d,el)=>{if(htab===d.t)return;htab=d.t;try{localStorage.setItem('xf_htab',htab)}catch(e){}const th=$('.hthumb');if(th){th.classList.toggle('r',htab==='pay');th.classList.toggle('m',htab==='ops')}document.querySelectorAll('.htabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===htab));setTimeout(()=>{render();scrollTo({top:0,behavior:'smooth'})},180)},
  hoMore:()=>{hoLimit+=100;render()},
  obAll:async()=>{const n=await obFlush();if(!n)toast(obPend()?'Нет связи с сервером — отправим позже':'Всё уже отправлено');render();if(npOpen)npRender()},
  ptab:d=>{ptab=d.t;try{localStorage.setItem('xf_ptab',ptab)}catch(e){}if(ptab==='cal'){calM=calD.slice(0,7)}render()},
  calDay:d=>{calD=d.d;render()},
  calMon:d=>{const[y,m]=calM.split('-').map(Number),n=new Date(y,m-1+(+d.v),1);calM=iso(n).slice(0,7);render()},
  calToday:()=>{calD=today();calM=calD.slice(0,7);render()},
  appUpd:()=>appUpdate(),
  svTest:async(d,el)=>{const f=formData(),url=sNorm(f.url),st=$('#svst');if(!url){st.className='gstate warn';st.textContent='Укажите адрес сервера';return}
    st.className='gstate';st.textContent='Проверяю…';const p=await svPing1({id:'t',url});delete SVP.t;
    if(p.ms!=null){st.className='gstate ok';st.textContent=`Сервер X-Finance отвечает · ${p.ms} мс${p.v?' · версия '+p.v:''}${p.os?' · '+p.os:''}`}
    else{st.className='gstate warn';st.textContent=p.why==='https'?'Адрес http не открыть из приложения по https — используйте адрес https (Tuna)':'Сервер не отвечает. Проверьте адрес и что X-Finance запущен (sudo systemctl status xfinance)'}},
  svAdd:()=>svForm(),svEdit:d=>svForm(svList().find(s=>s.id===d.id)),
  defSrv:()=>sheet('Сервер по умолчанию',`<label class="field"><span>Адрес X-Finance</span><input name="url" value="${esc(defSrv())}" inputmode="url" autocapitalize="none" spellcheck="false" placeholder="${DEF_SRV}"></label>
    <p class="note" style="margin:-4px 2px 12px">Этот адрес приложение использует по умолчанию на этом устройстве: в списке серверов, для кнопки «Работать через сервер» в версии без сервера. Для всех пользователей адрес меняет администратор в админ-панели → Система. Пусто — ${esc(info&&info.publicUrl||DEF_SRV)}.</p>`,
    f=>{const u=(f.url||'').trim(),n=sNorm(u);if(u&&!n)return'Неверный адрес. Пример: '+DEF_SRV;try{if(n&&n!==(sNorm(info&&info.publicUrl)||DEF_SRV))localStorage.setItem('xf_def',n);else localStorage.removeItem('xf_def')}catch(e){}render();toast('Сервер по умолчанию: '+defSrv().replace(/^https?:\/\//,''))}),
  svUp:d=>{const l=svList(),i=l.findIndex(s=>s.id===d.id);if(i>0){[l[i-1],l[i]]=[l[i],l[i-1]];svSave(l);const b=$('#svl');if(b)b.innerHTML=svRows();const h=$('#hsrv');if(h)h.innerHTML=hubSrv()}},
  svDn:d=>{const l=svList(),i=l.findIndex(s=>s.id===d.id);if(i>=0&&i<l.length-1){[l[i+1],l[i]]=[l[i],l[i+1]];svSave(l);const b=$('#svl');if(b)b.innerHTML=svRows();const h=$('#hsrv');if(h)h.innerHTML=hubSrv()}},
  svGo:async d=>{const s=svList().find(x=>x.id===d.id);if(!s)return;const p=await svPing1(s);
    if(p.ms==null)return toast(p.why==='https'?'Этот сервер открыт по http — нужен адрес https (например, через Tuna)':'Сервер «'+s.name+'» сейчас не отвечает');
    confirmBox('Подключиться к «'+esc(s.name)+'»?','Откроется X-Finance на этом сервере. У каждого сервера своя база и свой вход — войдите тем же логином, если ваш аккаунт там есть.','Подключиться',()=>{location.href=s.url+'/#/'},false)},
  svAutoTog:(d,el)=>{const on=!svAuto();try{localStorage.setItem('xf_srv_auto',on?'1':'0')}catch(e){}el.classList.toggle('on',on);toast(on?'Автопереключение включено':'Автопереключение выключено')},
  svCheck:async(d,el)=>{const s=el.querySelector('svg');if(s)s.style.animation='rspin .8s linear infinite';await svPingAll();if(s)s.style.animation='';const l=svList(),ok=l.filter(x=>SVP[x.id]&&SVP[x.id].ms!=null).length;toast(`На связи: ${ok} из ${l.length}`)},
  svDel:d=>confirmBox('Удалить сервер из списка?','Сам сервер и его данные не пострадают — он просто пропадёт из списка на этом устройстве.','Удалить',()=>{svSave(svList().filter(s=>s.id!==d.id));render()}),
  bellOpen:()=>npToggle(!npOpen),npClose:()=>npToggle(false),npOut:(d,el,ev)=>{if(ev.target===el)npToggle(false)},
  ntab:d=>{ntab=d.t;npRender()},
  noteGo:async d=>{const x=(NI.notes||[]).find(y=>y.id==d.id);if(x&&!x.read){x.read=1;NI.unread=Math.max(0,NI.unread-1);api('POST',`/api/notes/${x.id}/read`).catch(()=>{})}npToggle(false);nav(d.u.replace(/^\/?#/,'#'))},
  noteDel:async(d,el)=>{const r=el.closest('.rw');r.classList.add('out');const x=(NI.notes||[]).find(y=>y.id==d.id);
    await new Promise(z=>setTimeout(z,260));NI.notes=NI.notes.filter(y=>y.id!=d.id);if(x&&!x.read)NI.unread=Math.max(0,NI.unread-1);bell();if(npOpen)npRender();else if(location.hash.startsWith('#/inbox'))render();
    api('DELETE','/api/notes/'+d.id).catch(e=>toast(e.message))},
  noteAll:async()=>{(NI.notes||[]).forEach(x=>x.read=1);NI.unread=0;bell();if(npOpen)npRender();if(location.hash.startsWith('#/inbox'))render();await api('POST','/api/notes/read');toast('Все уведомления прочитаны')},
  forgot:()=>sheet('Восстановление доступа',`<p class="note" style="margin:-4px 2px 14px">Укажите логин или номер телефона, с которым регистрировались. Администратор проверит данные и пришлёт новый пароль.</p>
    ${fld('Логин','login','','autocapitalize="none" spellcheck="false"')}${fld('или номер телефона','phone','','inputmode="tel" placeholder="8 928 000-00-00"')}${fld('Как с вами связаться','contact','','placeholder="WhatsApp, другой номер"')}`,
    async f=>{await api('POST','/api/recover',f);closeSheet();setTimeout(()=>doneSheet('Заявка отправлена','Администратор проверит данные и свяжется с вами, чтобы выдать новый пароль.',{},'','',''),200);return'keep'},'Отправить заявку'),
  payTariff:()=>{const t=TF.tariff;sheet('Оплата тарифа',`<div class="field"><span>Срок</span><div class="seg" style="margin:0">${[1,3,6,12].map(m=>`<button type="button" class="${m===1?'on':''}" data-a="tm" data-v="${m}">${m} мес.</button>`).join('')}</div><input type="hidden" name="months" value="1"></div>
    ${fld('Сумма, ₽','amount',t.price||'','inputmode="decimal"')}<label class="field"><span>Способ</span><select name="method"><option>Перевод на карту</option><option>Наличные</option><option>Другое</option></select></label>
    ${fld('Комментарий','comment','','placeholder="Например: перевёл с карты на имя …"')}${t.pay?`<div class="card pad small" style="white-space:pre-line;margin-bottom:12px">${esc(t.pay)}</div>`:''}
    <p class="note" style="margin:-2px 2px 12px">После перевода отправьте заявку — администратор проверит платёж и продлит тариф. Ответ придёт в уведомления.</p>`,
    async f=>{await api('POST','/api/payments',{...f,amount:num(f.amount)});obLog('Заявка об оплате тарифа',money(num(f.amount))+' · '+plural(+f.months||1,['месяц','месяца','месяцев']));setTimeout(loadTariff,450);toast('Заявка отправлена администратору')},'Отправить заявку')},
  tm:(d,el)=>{const f=$('#form');f.months.value=d.v;el.parentNode.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));const p=TF&&TF.tariff.price;if(p)f.amount.value=String(p*d.v)},
  install:async()=>{const ok=await XS.install();if(ok)toast('X-Finance устанавливается');render()},
  instX:(d,el)=>{try{localStorage.setItem('xf_inst_x','1')}catch(e){}const c=el.closest('.ibn');c.classList.add('out');setTimeout(()=>c.remove(),260)},
  zoom:d=>{XS.setZoom(+d.v);render()},
  waNum:d=>wa(d.v,`Ассаляму алейкум${d.who?', '+d.who:''}!`),
  pmSet:()=>{plusMenu(false);nav('#/settings')},
  editDebt:d=>debtForm(db.debts.find(x=>x.id===d.id)),
  delDebt:d=>confirmBox('Удалить долг?','Запись и вся история будут удалены.','Удалить',async()=>{await del('debt',d.id);nav('#/debts')}),
  op:d=>opDebt(db.debts.find(x=>x.id===d.id),d.k),
  delOp:d=>confirmBox('Удалить операцию?','Остаток долга будет пересчитан.','Удалить',async()=>{const x=db.debts.find(y=>y.id===d.id);closeSheet(true);await vanish(d.p);if((x.ops.find(o=>o.id===d.p)||{}).srv)x.dropped=[...(x.dropped||[]),d.p];x.ops=x.ops.filter(o=>o.id!==d.p);await put('debt',x);render();return'keep'}),
  waC:d=>{const c=db.contracts.find(x=>x.id===d.id),k=calc(c),cl=client(c.clientId);
    return remind('contract',c,`Ассаляму алейкум${hello(cl)?', '+hello(cl):''}!\nНапоминаю о платеже по рассрочке «${c.item}».\n`+(k.overdue?`Просрочено: ${money(k.overdue)} (${pdays(k.days)}).`:`Ближайший платёж: ${money(k.next.rest)} до ${fdate(k.next.date)}.`)+`\nОстаток по договору: ${money(k.left)}.`,cl.phone)},
  waCl:d=>{const c=db.clients.find(x=>x.id===d.id);wa(c.phone,`Ассаляму алейкум${hello(c)?', '+hello(c):''}!`)},
  waD:d=>{const x=db.debts.find(y=>y.id===d.id),k=dcalc(x);return remind('debt',x,`Ассаляму алейкум${hello(x)?', '+hello(x):''}!\nНапоминаю о долге: осталось вернуть ${money(k.left)}`+(x.due?` (срок до ${fdate(x.due)})`:'')+'.',x.phone)},
  waSend:async()=>{const L=lastWa;if(!L)return;
    if(L.file){const f=new File([L.file.blob],L.file.name,{type:L.file.type});
      if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],text:L.text});closeSheet();return}catch(e){if(e.name==='AbortError')return}}
      download(L.file.blob,L.file.name);toast((L.file.type==='application/pdf'?'PDF':'Картинка')+' скачан'+(L.file.type==='application/pdf'?'':'а')+' — прикрепите в WhatsApp')}
    wa(L.phone,L.text);closeSheet()},
  copy:d=>copy(d.v),
  share:d=>navigator.share({title:'X-Finance',url:d.v}).catch(()=>{}),
  shInvite:d=>shInvite(investor(d.id)),
  shPerm:async d=>{const s=SHR.out.find(x=>x.id===+d.id);if(!s)return;const p={...s.perms,[d.k]:!s.perms[d.k]};try{const r=await api('POST',`/api/shares/${s.id}/perms`,{perms:p});s.perms=r.perms;render();toast((p[d.k]?'Разрешено: ':'Запрещено: ')+SHP.find(x=>x[0]===d.k)[3].toLowerCase())}catch(e){toast(e.message)}},
  shOff:d=>{const s=SHR.out.find(x=>x.id===+d.id);confirmBox('Отключить пользователя?',`${esc(s?s.userName||s.name:'Пользователь')} сразу потеряет доступ к этому инвестору. Его записи останутся у вас.`,'Отключить',async()=>{await api('DELETE','/api/shares/'+d.id);SHR.out=SHR.out.filter(x=>x.id!==+d.id);render();toast('Доступ закрыт')})},
  shAcc:async d=>{try{await api('POST',`/api/shares/${d.id}/accept`);await loadShares();acct='x:'+d.id;try{localStorage.setItem('xf_acct',acct)}catch(e){}catOpen=true;if(npOpen)npToggle(false);await fetchNotes();nav('#/');toast('Доступ открыт — инвестор на главной')}catch(e){toast(e.message)}},
  shDec:async d=>{try{await api('POST',`/api/shares/${d.id}/decline`);await fetchNotes();if(npOpen)npRender();toast('Запрос отклонён')}catch(e){toast(e.message)}},
  xLeave:d=>confirmBox('Отключиться от инвестора?','Инвестор пропадёт с вашей главной. Снова получить доступ можно только по новому приглашению владельца.','Отключиться',async()=>{await api('DELETE','/api/shares/'+d.s);acct='all';try{localStorage.setItem('xf_acct','all')}catch(e){}delete SHR.data[d.s];await loadShares();render();toast('Вы отключились')}),
  xNew:d=>{const sd=SHR.data[d.s];if(sd)xContractForm(sd)},
  xEdit:d=>{const sd=SHR.data[d.s];if(sd)xContractForm(sd,sd.contracts.find(c=>c.id===d.id))},
  xPay:d=>{const sd=SHR.data[d.s];if(!sd)return;const c=sd.contracts.find(x=>x.id===d.id);if(!c)return;const k=withShare(sd,()=>calc(c)),def=Math.min(k.left,+d.v||k.overdue||(k.next?k.next.rest:k.left)),qk=[[k.overdue?'Просрочка':'Платёж',def]];if(k.left!==def)qk.push(['Весь остаток',k.left]);
    amountForm('Принять платёж',k.left,def,qk,'Принять',async p=>{try{await api('POST',`/api/shares/${sd.id}/pay`,{contractId:c.id,amount:p.amount,date:p.date,note:p.note});await loadShareData(sd.id,true);closeSheet();render();toast('Платёж принят — владелец получил уведомление')}catch(x){return x.message}})},
  xShift:d=>{const sd=SHR.data[d.s];if(!sd)return;sheet('Перенести график',`<div class="field"><span>На сколько месяцев</span><div class="seg" style="margin:0">${[1,2,3,6].map(m=>`<button type="button" class="${m===1?'on':''}" data-a="shm" data-v="${m}">${m} мес.</button>`).join('')}</div><input type="hidden" name="months" value="1"></div>${fld('Причина','note','','placeholder="Например: задержка зарплаты"')}`,
    async f=>{try{await api('POST',`/api/shares/${sd.id}/shift`,{contractId:d.id,months:parseInt(f.months)||1,note:f.note});await loadShareData(sd.id,true);closeSheet();render();toast('График перенесён')}catch(x){return x.message}},'Перенести')},
  xDel:d=>confirmBox('Удалить договор?','Договор будет удалён у владельца инвестиции без возможности восстановления.','Удалить',async()=>{try{await api('DELETE',`/api/shares/${d.s}/contract/${d.id}`);await loadShareData(d.s,true);nav('#/');toast('Договор удалён')}catch(e){toast(e.message)}}),
  refOpen:()=>{if(matchMedia('(min-width:960px)').matches){const p=$('#refsh');if(p){p.scrollIntoView({behavior:'smooth',block:'center'});p.classList.remove('flash');void p.offsetWidth;p.classList.add('flash')}return}
    sheet('Поделиться ссылкой',`<div id="refsh" class="rsheet">${refPanel(true)}</div>`,null,null);if(!REFD)loadRef()},
  goTariff:()=>nav('#/tariff'),
  refCopy:async()=>{if(!REFD)return;try{await navigator.clipboard.writeText(refLink())}catch(e){const a=document.createElement('textarea');a.value=refLink();document.body.append(a);a.select();document.execCommand('copy');a.remove()}toast('Ссылка скопирована')},
  refWa:()=>{if(REFD)window.open('https://wa.me/?text='+encodeURIComponent(refMsg()),'_blank')},
  refTg:()=>{if(REFD)window.open('https://t.me/share/url?url='+encodeURIComponent(refLink())+'&text='+encodeURIComponent(refMsg().replace(': '+refLink(),'')),'_blank')},
  refMore:async()=>{if(!REFD)return;if(navigator.share)try{await navigator.share({title:'X-Finance',text:refMsg(),url:refLink()});return}catch(e){if(e.name==='AbortError')return}A.refCopy()},
  docImg:async d=>{const x=(d.k==='c'?db.contracts:db.debts).find(y=>y.id===d.id);if(!x)return;
    sheet('Документ А4','<div class="a4p"><div class="a4l"><i class="spin"></i></div></div>',null,null);const f=$('#form');if(f)f.classList.add('a4s');const g=gen;
    const blob=await docOf(d.k,x),name=imgName(d.k,x);if(g!==gen)return;
    DOCB={blob,name};const u=URL.createObjectURL(blob),w=$('#form .a4p');if(!w)return;
    w.innerHTML=`<img src="${u}" alt="${esc(name)}">`;
    w.insertAdjacentHTML('afterend',`<div class="row-btns a4b"><button type="button" class="btn primary" data-a="docSave">${I.dl||''}Скачать</button>${navigator.share?`<button type="button" class="btn soft" data-a="docShare">${I.share}Поделиться</button>`:''}</div><p class="note a4n">${esc(name)}</p>`);
    const im=w.querySelector('img');im.onclick=()=>w.classList.toggle('zm');im.onload=()=>{const n=$('#form .a4n');if(n)n.textContent=`${name} · А4 · ${im.naturalWidth}×${im.naturalHeight}`}},
  docSave:()=>{if(DOCB)download(DOCB.blob,DOCB.name)},
  docShare:async()=>{if(!DOCB)return;const fl=new File([DOCB.blob],DOCB.name,{type:'image/png'});
    try{if(navigator.canShare&&navigator.canShare({files:[fl]}))await navigator.share({files:[fl],title:DOCB.name});else download(DOCB.blob,DOCB.name)}catch(e){}},
  ckOpen:d=>{const x=CKR.find(y=>y.c.id===d.id);if(!x)return;sheet('Проверка клиента',ckDetail(x),null,null);const f=$('#form');if(f)f.classList.add('ckds')},
  chkTog:async d=>{const[plan,k]=d.k.split(':'),cf=JSON.parse(JSON.stringify(chkCfg()));cf[plan][k]=!cf[plan][k];CHKC=cf;render();
    try{CHKC=(await api('PUT','/api/checkcfg',{[plan]:{[k]:cf[plan][k]}})).cfg;if(info)info.checkCfg=CHKC;toast('Сохранено на сервере')}catch(e){CHKC=null;toast(e.message);render()}},
  chkAs:d=>{try{d.v?localStorage.setItem('xf_chkas',d.v):localStorage.removeItem('xf_chkas')}catch(e){}render()},
  goCheck:()=>nav('#/check'),
  devCache:async()=>{try{for(const k of await caches.keys())if(k.startsWith('xfinance'))await caches.delete(k);const r=await navigator.serviceWorker.getRegistration();if(r)await r.update()}catch(e){}location.reload()},
  devOb:()=>{if(!npOpen)npToggle(true);ntab='out';npRender()},
  goWa:()=>nav('#/settings/wa'),
  pwEye:(d,el)=>{const i=el.parentNode.querySelector('input');i.type=i.type==='password'?'text':'password'},
  waKeys:async()=>{const f=Object.fromEntries(new FormData($('#waf'))),id=(f.id||'').trim(),token=(f.token||'').trim();if(!id||!token){const st=$('#gst');st.className='gstate warn';st.textContent='Укажите idInstance и apiTokenInstance';return}
    await saveS({green:{url:(f.url||'').trim(),id,token}});if(!S.wa)await saveWa({});WLOG=null;render();toast('Ключи Green API сохранены')},
  wtTog:async d=>{const v=!wtpl(d.k).on;await saveTpl(d.k,{on:v});render();toast(WTK[d.k][3]+': '+(v?'включено':'выключено'))},
  wtView:async d=>{const k=d.k,t=wtpl(k),f=t.fmt,cap=waSample(t.text),who=WEX().имя;
    const btns=`<div class="row-btns wvb"><button type="button" class="btn soft" data-a="wtEdit" data-k="${k}">${I.edit}Изменить текст</button>${WFK.includes(k)?`<button type="button" class="btn soft" data-a="wtFmt" data-k="${k}">${I[WFMT[f][1]]}Формат: ${WFMT[f][0]}</button>`:''}${!LOCAL&&gOn()?`<button type="button" class="btn soft" data-a="waTest" data-k="${k}">${I.send}Отправить себе</button>`:''}</div>`;
    const note=f==='png'?'Так клиент увидит сообщение: картинка бланка и текст под ней (данные — для примера).':f==='pdf'?'Так клиент увидит сообщение: документ PDF и текст под ним (данные — для примера).':'Так клиент увидит сообщение в WhatsApp (данные — для примера).';
    sheet(WTK[k][3],`<div class="note" style="margin:-4px 2px 12px">${note}</div><div id="wvw">${f==='text'?waBub(cap,who):waBub(cap,who,`<div class="wald"><i class="spin"></i></div>`)}</div>${btns}`,null,null);
    if(f==='text')return;const g=gen,sm=wSample(k);
    const blob=f==='pdf'?await pdfOf(sm.kind,sm.x,sm.o):await docOf(sm.kind,sm.x,sm.o);if(g!==gen)return;
    const img=f==='pdf'?URL.createObjectURL(await new Promise(r=>pdfCanvas(sm.kind,sm.x,sm.o).toBlob(r,'image/png'))):URL.createObjectURL(blob),url=URL.createObjectURL(blob),nm=(String(sm.x.id).startsWith('demo')?(sm.kind==='c'?'Рассрочка №12 — пример.png':'Долг — пример.png'):imgName(sm.kind,sm.x)).replace(/\.png$/,f==='pdf'?'.pdf':'.png');
    WVB={blob,name:nm,type:blob.type};const w=$('#wvw');if(!w)return;
    w.innerHTML=waBub(cap,who,f==='png'?`<button type="button" class="waimg" data-a="wvOpen"><img src="${img}" alt=""></button>`
      :`<button type="button" class="wapdf" data-a="wvOpen"><span class="wapv"><img src="${img}" alt=""></span><span class="wapf"><i>PDF</i><b>${esc(nm)}</b><small>1 стр. · PDF · ${Math.max(1,Math.round(blob.size/1024))} КБ</small></span></button>`);
    w.insertAdjacentHTML('beforeend',`<div class="row-btns wvo"><button type="button" class="btn soft" data-a="wvOpen">${f==='pdf'?I.file+'Открыть PDF':I.img+'Открыть картинку'}</button><button type="button" class="btn soft" data-a="wvSave">${I.dl||I.file}Скачать</button></div>`)},
  wvOpen:()=>{if(!WVB)return;const u=URL.createObjectURL(WVB.blob);if(WVB.type==='application/pdf'){window.open(u,'_blank')||download(WVB.blob,WVB.name)}else window.open(u,'_blank')||download(WVB.blob,WVB.name)},
  wvSave:()=>{if(WVB)download(WVB.blob,WVB.name)},
  wtFmt:d=>{const k=d.k,t=wtpl(k);sheet('Формат: '+WTK[k][3],`<p class="note" style="margin:-4px 2px 12px">Что отправлять клиенту в WhatsApp · ${esc(WTK[k][4].toLowerCase())}.</p>
    <div class="fmos">${Object.entries(WFMT).map(([v,[sh,ic,ti,de]])=>`<button type="button" class="fmo${t.fmt===v?' on':''}" data-a="wtFmtSet" data-k="${k}" data-v="${v}"><span class="sic ${v==='png'?'sky':v==='pdf'?'warn':'ok'}">${I[ic]}</span><span class="st"><b>${ti}${v==='png'?' <em>по умолчанию</em>':''}</b><small>${de}</small></span><i class="fmr"></i></button>`).join('')}</div>
    <p class="note" style="margin:12px 2px 0">Картинка и PDF отправляются сами через Green API. Без Green API кнопка «Отправить в WhatsApp» на телефоне откроет «Поделиться» с файлом, на компьютере — скачает файл и откроет чат.</p>`,null,null)},
  wtFmtSet:async d=>{await saveTpl(d.k,{fmt:d.v});closeSheet();render();toast(WTK[d.k][3]+': '+WFMT[d.v][2])},
  wtEdit:d=>{const k=d.k,t=wtpl(k);
    sheet('Текст: '+WTK[k][3],`<div class="wtvars">${WVARS.map(([v,l])=>`<button type="button" class="wvar" data-a="wtVar" data-v="${v}" title="${l}">{${v}}<small>${l}</small></button>`).join('')}</div>
      <label class="field"><span>Текст сообщения</span><textarea name="text" id="wtta" rows="7" oninput="wtLive()">${esc(t.text)}</textarea></label>
      <div id="wtpv">${waBub(waSample(t.text),WEX().имя)}</div>
      <div class="note" style="margin:10px 2px 12px">Слова в фигурных скобках заменятся данными клиента. Ссылка на его страницу и ваша подпись добавятся в конце сами.</div>
      <button type="button" class="btn ghost block" data-a="wtReset" data-k="${k}" style="margin-bottom:10px">${I.undo}Вернуть стандартный текст</button>`,
      async f=>{const tx=String(f.text||'').trim();if(!tx)return'Текст не может быть пустым';await saveTpl(k,{text:tx});render();toast('Текст сохранён')},'Сохранить')},
  wtVar:d=>{const ta=$('#wtta');if(!ta)return;const a=ta.selectionStart??ta.value.length,b=ta.selectionEnd??a,v='{'+d.v+'}';ta.value=ta.value.slice(0,a)+v+ta.value.slice(b);ta.focus();ta.setSelectionRange(a+v.length,a+v.length);wtLive()},
  wtReset:d=>{const ta=$('#wtta');if(ta){ta.value=WTK[d.k][5];wtLive();toast('Стандартный текст подставлен — нажмите «Сохранить»')}},
  waDue:async d=>{const due={before:(waS().due||{}).before!==false,day:(waS().due||{}).day!==false};due[d.k]=!due[d.k];if(!due.before&&!due.day)return toast('Выберите хотя бы один вариант');await saveWa({due});render()},
  waEvery:async d=>{await saveWa({over:{every:+d.v}});render()},
  waTime:async d=>{await saveWa({time:d.v});render();toast('Напоминания будут уходить в '+d.v)},
  waTest:async(d,el)=>{const k=d.k||'pay',tp=wtpl(k),t=$('#wtta')?$('#wtta').value:tp.text,q={text:waSample(t)};
    try{if(tp.fmt!=='text'&&WFK.includes(k)){const sm=wSample(k),bl=tp.fmt==='pdf'?await pdfOf(sm.kind,sm.x,sm.o):await docOf(sm.kind,sm.x,sm.o);
      Object.assign(q,{file:await blob64(bl),fname:imgName(sm.kind,sm.x).replace(/\.png$/,tp.fmt==='pdf'?'.pdf':'.png'),ftype:bl.type})}
      const r=await api('POST','/api/wa/test',q);toast('Отправлено на +'+r.phone+(r.file?' · с файлом':''))}catch(e){toast(e.message)}},
  pinTog:async d=>{const v=!pinned(d.k);await saveS({pin:{...(S.pin||{}),[d.k]:v}});render();toast(v?'Категории будут открыты всегда':'Категории — свайпом вниз')},
  mode:async d=>{if(S[d.k]&&!S[d.k==='inst'?'debt':'inst'])return toast('Хотя бы один раздел должен быть включён');await saveS({[d.k]:!S[d.k]});render()},
  ntTog:async d=>{const v=!ntS()[d.k];await ntSave({[d.k]:v});if(d.k==='badge'&&!v)ntBadge(0);if(d.k==='badge'&&v&&NI)ntBadge(NI.unread||0);render()},
  ntDur:async d=>{await ntSave({dur:+d.v});render()},
  ntHow:d=>{ntHow=d.k;render()},
  ntHowGo:()=>{const e=$('#nthow');if(e)e.scrollIntoView({behavior:'smooth',block:'center'})},
  goApp:()=>nav('#/settings/app'),
  ntDemo:()=>banner({kind:'confirm',title:'Ахмед Исаев подтвердил оплату',body:'Платёж 15 000 ₽ по договору №12 «iPhone 16 Pro». Остаток: 75 000 ₽.',url:'#/settings/notify'},true),
  ntTest:async()=>{try{const r=await api('POST','/api/push/test');toast(r.sent?'Отправлено — проверьте уведомление':'Устройство не подписано — нажмите «Выключить» и снова «Включить»')}catch(e){
    try{const reg=await navigator.serviceWorker.ready;await reg.showNotification('X-Finance',{body:'Проверка уведомлений: всё работает ✓',icon:'icon-192.png',badge:'icon-192.png',silent:ntS().silent,requireInteraction:ntS().sticky});toast('Показано на этом устройстве')}catch(x){toast(e.message)}}},
  ntBg:async()=>{const v=!(ntS().bg&&NTST.ps!==false);try{const reg=await navigator.serviceWorker.ready;
    if(v){const st=await navigator.permissions.query({name:'periodic-background-sync'}).catch(()=>({state:'granted'}));if(st.state==='denied')return toast('Браузер запретил фоновое обновление для этого сайта');
      await reg.periodicSync.register('xf-refresh',{minInterval:4*3600e3})}else await reg.periodicSync.unregister('xf-refresh');
    await ntSave({bg:v});await ntCheck();render();toast(v?'Фоновое обновление включено':'Фоновое обновление выключено')}catch(e){toast('Не удалось: '+e.message)}},
  pushMe:async()=>{if(lsGet('xf_push_me')==='1'&&ntPerm()==='granted'&&NTST.sub!==false){localStorage.removeItem('xf_push_me');try{const reg=await navigator.serviceWorker.getRegistration(),sb=reg&&await reg.pushManager.getSubscription();if(sb)await sb.unsubscribe()}catch(e){}NTST.sub=false;render();toast('Уведомления выключены')}else{await subscribePush(null);toast('Уведомления включены')}render()},
  pushPub:async()=>{await subscribePush(pub);render();toast('Уведомления включены')},
  confirmOp:async(d,el)=>{const l=el.closest('[data-link]');if(l){await api('POST',`/api/links/${l.dataset.link}/confirm`,{opId:d.id,debtId:d.d});shared=null;await loadShared();toast('Подтверждено');return}
    pubData=await api('POST',`/api/public/${pub}/confirm`,{opId:d.id,debtId:d.d});render();toast('Подтверждено')},
  signForm:()=>sheet('Подпись в сообщениях',fld('Подпись в конце сообщений WhatsApp','sign',S.sign,'placeholder="Например: Идрис, X-Finance"'),async f=>{await saveS({sign:f.sign.trim()});render()}),
  greenForm:()=>{const g=S.green||{},on=!!(g.id&&g.token);
    sheet('WhatsApp через Green API',`<div class="gwh"><span class="gwi">${I.wa}</span><div><b>${on?'Шлюз подключён':'Автоотправка сообщений'}</b><small>${on?'Сообщения о платежах и напоминания уходят клиентам сами с вашего номера.':'Сообщения о платежах и напоминания будут уходить клиентам сами — с вашего номера WhatsApp.'}</small></div></div>
    <ol class="gsteps"><li><b>Зарегистрируйтесь</b> на <a href="https://green-api.com" target="_blank" rel="noopener">green-api.com</a> и создайте инстанс.</li><li><b>Подключите номер:</b> в кабинете Green-API отсканируйте QR-код в WhatsApp (Связанные устройства).</li><li><b>Скопируйте</b> apiUrl, idInstance и apiTokenInstance сюда.</li></ol>
    ${fld('Адрес API (apiUrl)','url',g.url||'https://api.green-api.com','autocapitalize="none" spellcheck="false"')}
    <div class="g2">${fld('idInstance','id',g.id||'','inputmode="numeric" spellcheck="false" placeholder="1101000000"')}${fld('apiTokenInstance','token',g.token||'','autocapitalize="none" spellcheck="false" placeholder="токен из кабинета"')}</div>
    <div class="gstate" id="gst">${on?'Нажмите «Проверить», чтобы узнать состояние номера':'После ввода данных нажмите «Проверить»'}</div>
    <div class="row-btns" style="margin-bottom:12px"><button type="button" class="btn soft" data-a="greenCheck">${I.sync}Проверить</button>${on?`<button type="button" class="btn danger" data-a="greenOff">Отключить</button>`:''}</div>`,
    async f=>{await saveS({green:{url:(f.url||'').trim(),id:(f.id||'').trim(),token:(f.token||'').trim()}});render();toast((f.id||'').trim()?'Шлюз сохранён':'Шлюз отключён')},'Сохранить')},
  greenCheck:async(d,el)=>{const f=$('#form')&&$('#form').querySelector('[name=token]')?formData():Object.fromEntries(new FormData($('#waf'))),st=$('#gst');if(!(f.id||'').trim()||!(f.token||'').trim()){st.className='gstate warn';st.textContent='Укажите idInstance и apiTokenInstance';return}
    st.className='gstate';st.textContent='Проверяю…';const s=el.querySelector('svg');if(s)s.style.animation='rspin .8s linear infinite';
    try{const r=await api('POST','/api/green/check',{url:f.url,id:f.id,token:f.token});st.className='gstate '+(r.ok?'ok':'warn');st.textContent=r.text}catch(e){st.className='gstate warn';st.textContent=e.message}
    if(s)s.style.animation=''},
  greenOff:()=>confirmBox('Отключить WhatsApp?','Сообщения перестанут уходить автоматически. Отправлять вручную через WhatsApp можно будет как раньше.','Отключить',async()=>{await saveS({green:{url:'',id:'',token:''}});render();toast('Шлюз отключён')}),
  goAcc:()=>nav('#/account'),goPage:()=>nav('#/settings/page'),
  pgTog:async d=>{const pg={...pgCfg()};pg[d.k]=!pg[d.k];await saveS({page:pg});render();toast(PGK.find(x=>x[0]===d.k)[3]+(pg[d.k]?' — показывается':' — скрыто'))},
  pgText:d=>{const pg=pgCfg(),f=PGT.find(x=>x[0]===d.k);sheet(f[1],`<label class="field"><span>${f[1]}</span>${f[0]==='title'?`<input name="v" value="${esc(pg[f[0]]||'')}" maxlength="60" placeholder="${esc(me.company||me.name||'')}">`:`<textarea name="v" rows="4" maxlength="400" placeholder="${esc(f[3])}">${esc(pg[f[0]]||'')}</textarea>`}</label><p class="note">${f[2]}</p>`,async v=>{await saveS({page:{...pgCfg(),[f[0]]:(v.v||'').trim()}});render();toast('Сохранено')})},goInv:()=>nav('#/investors'),
  verCheck:async(d,el)=>{const s=el.querySelector('svg');if(s)s.style.animation='rspin .8s linear infinite';await loadVer(true);const v=verInfo();toast(v.st[1])},
  account:()=>sheet('Аккаунт',fld('Фамилия, имя, отчество','name',me.name)+fld('Название компании','company',me.company)+fld('Номер телефона','phone',me.phone,'inputmode="tel"')+`<div class="note" style="margin:-4px 2px 12px">Название компании и телефон видят ваши клиенты и должники на своих страницах.</div>`,
    async f=>{const r=await api('POST','/api/account',{name:f.name,company:f.company,phone:f.phone});me=r.user;render();toast('Сохранено')}),
  password:()=>sheet('Сменить пароль',fld('Старый пароль','old','','type="password" autocomplete="current-password"')+fld('Новый пароль (не короче 8 символов)','password','','type="password" autocomplete="new-password"'),
    async f=>{await api('POST','/api/password',f);toast('Пароль изменён')}),
  logout:async()=>{await api('POST','/api/logout').catch(()=>{});me=null;inv=null;db={clients:[],contracts:[],debts:[],investors:[]};nav('#/');render()},
  delAccount:()=>{sheet('Удалить аккаунт?',`<p class="note" style="font-size:15px;margin:0 0 14px">Аккаунт, все клиенты, договоры, долги, инвесторы и загруженные документы будут безвозвратно удалены с сервера. Сначала сохраните резервную копию.</p>${fld('Пароль для подтверждения','password','','type="password"')}`,
    async f=>{await api('POST','/api/account/delete',{password:f.password});me=null;db={clients:[],contracts:[],debts:[],investors:[]};nav('#/');render();toast('Аккаунт удалён')},'Удалить навсегда')},
  restore:()=>$('#file').click(),
  wipe:()=>confirmBox('Удалить все данные?','Все записи будут стёрты с этого устройства. Сначала сохраните резервную копию.','Удалить всё',()=>{db={clients:[],contracts:[],debts:[],investors:[]};saveLocal();render();toast('Данные удалены')})
};
document.addEventListener('click',async ev=>{
  const ln=ev.target.closest('a[href^="#"]');
  if(ln&&!ln.target&&!ev.defaultPrevented){const h=ln.getAttribute('href');
    if(ln.classList.contains('back')){ev.preventDefault();navBack(h)}
    else if(OV.length||backing){ev.preventDefault();nav(h)}}
  const el=ev.target.closest('[data-a]');if(!el)return;
  const a=el.dataset.a;if(el.tagName==='A'&&!el.getAttribute('href'))ev.preventDefault();
  try{A[a]&&await A[a](el.dataset,el,ev)}catch(e){toast(e.message||'Ошибка')}
});
document.addEventListener('submit',async ev=>{
  ev.preventDefault();
  if(ev.target.id==='chatf'){await sendChat(ev.target);return}
  if(ev.target.id==='auth'){
    const f=Object.fromEntries(new FormData(ev.target)),b=ev.target.querySelector('[type=submit]');b.classList.add('load');
    try{if(authMode==='reg'&&!(f.consent&&f.terms&&f.adult)){$('#aerr').textContent='Отметьте согласие на обработку персональных данных, пользовательское соглашение и возраст.';b.classList.remove('load');return}
    const r=await api('POST',authMode==='reg'?'/api/register':'/api/login',{...f,consent:!!f.consent,terms:!!f.terms,adult:!!f.adult,ref:authMode==='reg'?lsGet('xf_ref')||'':''});if(authMode==='reg')try{localStorage.removeItem('xf_ref')}catch(e){}me=r.user;obLoad();await loadData();HS=['#/'];if(location.hash!=='#/'){replacing=true;location.replace('#/')}render();dirInit()}
    catch(e){$('#aerr').textContent=e.message;b.classList.remove('load')}
    return;
  }
  if(!onSubmit||busy)return;busy=true;const btn=ev.target.querySelector('[type=submit]');btn&&btn.classList.add('load');
  try{const r=await onSubmit(formData());if(typeof r==='string'&&r!=='keep'){$('#err').textContent=r;return}if(r!=='keep')closeSheet()}
  catch(e){const er=$('#err');if(er)er.textContent=e.message;else toast(e.message)}
  finally{busy=false;btn&&btn.classList.remove('load')}
});
let qF=0;
document.addEventListener('input',ev=>{
  const t=ev.target;
  if(t.id==='cq'){cq=t.value;$('#ckr').innerHTML=checkResults();return}
  if(t.id==='q'){q=t.value;if(!qF)qF=requestAnimationFrame(()=>{qF=0;const l=$('#list');if(!l)return;l.innerHTML=location.hash.startsWith('#/clients')?clientsList():location.hash.startsWith('#/ops')?opsList():contractsList();runCounts()})}
  else if(t.id==='pq'){const s=t.value.trim().toLowerCase();document.querySelectorAll('#plist .rw').forEach(r=>r.hidden=!!s&&!r.dataset.s.includes(s))}
  else if(t.closest('#form')){
    const f=$('#form');
    if(t.name==='clientId'&&$('#newcl')){$('#newcl').hidden=t.value!=='new';blackWarn(t.value)}
    if(t.name==='investorId'){$('#newinv').hidden=t.value!=='new';$('#ipct').hidden=!t.value;const i=investor(t.value);if(i){f.invPct.value=i.pct;f.months.value=i.months}else if(t.value==='new'&&!f.invPct.value)f.invPct.value=50}
    if(t.name==='date'&&t.value&&f.first)f.first.value=addMonths(t.value,1);
    if(t.name==='pct'&&f.cpct)f.cpct.value=r2(100-num(t.value));
    if(t.name==='cpct'&&f.pct)f.pct.value=r2(100-num(t.value));
    if(t.name==='contactId'&&$('#newdc')){$('#newdc').hidden=t.value!=='new';blackWarn(t.value)}
    updSum();const e=$('#err');if(e)e.textContent='';
  }
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.matches&&e.target.matches('#chatf textarea')&&matchMedia('(pointer:fine)').matches){e.preventDefault();$('#chatf').requestSubmit()}});
document.addEventListener('input',e=>{if(e.target.matches&&e.target.matches('#chatf textarea')){e.target.style.height='';e.target.style.height=Math.min(140,e.target.scrollHeight)+'px'}});
// Esc — тот же «Назад»: обработчик в блоке «кнопка Назад»
async function formFiles(list){
  const cnt=curFiles.filter(f=>!delF.includes(f.id)).length+pend.length,used=[...curFiles.filter(f=>!delF.includes(f.id)).map(f=>fKind[f.id]||f.kind),...pend.map(p=>p.kind)];
  for(const x of await filesAdd(list,cnt)){const kind=dkGuess(x.name,used);used.push(kind);pend.push({...x,kind,url:URL.createObjectURL(x.blob)})}
  const p=$('#pf');if(p)p.innerHTML=filesHtml();
}
for(const id of['fpick','fcam'])$('#'+id).addEventListener('change',async ev=>{const files=[...ev.target.files];ev.target.value='';if(files.length)formFiles(files)});
/* компьютер: перетаскивание и вставка снимка в окне контакта */
document.addEventListener('dragover',e=>{const z=e.target.closest&&e.target.closest('#dz,.dtiles');if(!z||!$('#pf'))return;e.preventDefault();$('#dz').classList.add('over')});
document.addEventListener('dragleave',e=>{const z=$('#dz');if(z&&!z.contains(e.relatedTarget))z.classList.remove('over')});
document.addEventListener('drop',e=>{const z=e.target.closest&&e.target.closest('#dz,.dtiles');if(!z||!$('#pf'))return;e.preventDefault();$('#dz').classList.remove('over');formFiles([...e.dataTransfer.files])});
document.addEventListener('paste',e=>{if(!$('#pf')||!e.clipboardData)return;const fs=[...e.clipboardData.files].filter(f=>/^image\//.test(f.type));if(!fs.length)return;e.preventDefault();formFiles(fs.map((f,i)=>new File([f],`snimok-${Date.now()}-${i}.png`,{type:f.type})))});
document.addEventListener('change',async e=>{const t=e.target;if(!t.matches||!t.matches('select.dksel'))return;
  if(t.dataset.fk)fKind[t.dataset.fk]=t.value;else if(t.dataset.pk!=null&&pend[+t.dataset.pk])pend[+t.dataset.pk].kind=t.value;
  else if(t.dataset.gk){const c=db.clients.find(x=>x.id===t.dataset.id),f=c&&(c.files||[]).find(x=>x.id===t.dataset.gk);if(f){f.kind=t.value;await put('client',c);toast(dkName(t.value)+' — сохранено')}}});
$('#fpick2').addEventListener('change',ev=>{const files=[...ev.target.files];ev.target.value='';if(files.length)galFiles(files)});
async function galFiles(files){
  const c=db.clients.find(x=>x.id===upClient);if(!c||!files.length)return;
  c.files=c.files||[];const take=await filesAdd(files,c.files.length),g=$('#gal'),used=c.files.map(f=>f.kind);
  const tmp=take.map(()=>{const t=document.createElement('div');t.className='gt up';t.innerHTML='<span class="spin"></span>';if(g){const a=g.querySelector('.add');g.insertBefore(t,a)}return t});
  if(g&&c.files.length+take.length>=5){const a=g.querySelector('.add');if(a)a.remove()}
  let ok=0;
  for(let i=0;i<take.length;i++){const x=take[i],kind=dkGuess(x.name,used);used.push(kind);
    try{let file;
      if(LOCAL){const id=uid();await kvs('put','lf:'+id,x.blob);LF[id]=URL.createObjectURL(x.blob);file={id,name:x.name,type:x.type,size:x.blob.size,local:1}}
      else file=(await api('POST',`/api/files?item=${c.id}&name=${encodeURIComponent(x.name)}`,x.blob,x.type)).file;
      c.files.push({...file,kind});ok++;if(!c.mainPhoto&&file.type!=='application/pdf')c.mainPhoto=file.id;tmp[i].classList.remove('up')}
    catch(e){tmp[i].remove();
      if(e.net){try{const q=obAdd('file','client',c.id,{name:x.name,type:x.type,title:'Фото · '+fio(c)});await kvs('put','ob:'+q.id,x.blob);obMark(q,'wait',e.message);netNote()}catch(z){toast(z.message)}}
      else toast(e.message)}
  }
  if(ok){await put('client',c);toast(ok===1?'Файл добавлен':`Добавлено файлов: ${ok}`)}
  if(location.hash==='#/client/'+c.id)render();
}
/* страница контакта: перетащить файлы на блок фото (компьютер) */
document.addEventListener('dragover',e=>{const g=e.target.closest&&e.target.closest('#gal');if(!g||$('#pf'))return;e.preventDefault();g.classList.add('over')});
document.addEventListener('dragleave',e=>{const g=$('#gal');if(g&&!g.contains(e.relatedTarget))g.classList.remove('over')});
document.addEventListener('drop',e=>{const g=e.target.closest&&e.target.closest('#gal');if(!g||$('#pf'))return;e.preventDefault();g.classList.remove('over');
  const id=(location.hash.match(/#\/client\/(.+)/)||[])[1],c=id&&db.clients.find(x=>x.id===id);if(!c)return;upClient=c.id;
  const fs=[...e.dataTransfer.files];if(!c.consent)return confirmBox('Согласие на хранение документов','Человек дал согласие на обработку персональных данных и хранение копий его документов?','Да, согласие есть',async()=>{c.consent=today();await put('client',c);galFiles(fs)},false);galFiles(fs)});
$('#file').addEventListener('change',async ev=>{
  const file=ev.target.files[0];ev.target.value='';if(!file)return;
  try{
    const d=JSON.parse(await file.text());
    if(!Array.isArray(d.clients)||!Array.isArray(d.contracts)||!Array.isArray(d.debts))throw 0;
    const n=normalize(d);
    confirmBox('Восстановить копию?',`В файле: договоров ${n.contracts.length}, клиентов ${n.clients.length}, долгов ${n.debts.length}, инвесторов ${n.investors.length}. Текущие данные будут заменены.`,'Восстановить',async()=>{
      if(LOCAL){db=n;saveLocal()}else{await api('POST','/api/import',n);await loadData()}render();toast('Данные восстановлены')},false);
  }catch(e){toast('Это не файл копии X-Finance')}
});

/* ---------- резервные копии: JSON + Excel, автоматически ---------- */
const enc=new TextEncoder();
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zip(files){
  const parts=[],central=[];let off=0;const d=new Date(),dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF,dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF;
  for(const f of files){
    const name=enc.encode(f.name),data=typeof f.data==='string'?enc.encode(f.data):f.data,crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,dt,true);h.setUint16(12,dd,true);
    h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,name.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),name,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,dt,true);c.setUint16(14,dd,true);
    c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,off,true);
    central.push(new Uint8Array(c.buffer),name);off+=30+name.length+data.length;
  }
  const cs=central.reduce((s,x)=>s+x.length,0),e=new DataView(new ArrayBuffer(22));
  e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...central,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
const xe=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'');
const colL=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=(i-m-1)/26}return s};
function xlsx(sheets){
  const sx=sheets.map((sh,si)=>{
    const last=colL(sh.cols.length-1),rows=[sh.cols.map(c=>c.h),...sh.rows];
    const body=rows.map((r,ri)=>`<row r="${ri+1}">`+r.map((v,ci)=>{const ref=colL(ci)+(ri+1),t=sh.cols[ci].t;
      if(ri===0)return`<c r="${ref}" s="1" t="inlineStr"><is><t>${xe(v)}</t></is></c>`;
      if(v===''||v==null)return'';
      if(t==='n'&&isFinite(v))return`<c r="${ref}" s="2"><v>${+v}</v></c>`;
      return`<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xe(v)}</t></is></c>`}).join('')+'</row>').join('');
    return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`+
      `<cols>${sh.cols.map((c,i)=>`<col min="${i+1}" max="${i+1}" width="${c.w||14}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData>${sh.rows.length?`<autoFilter ref="A1:${last}${rows.length}"/>`:''}</worksheet>`;
  });
  return zip([
    {name:'[Content_Types].xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`},
    {name:'_rels/.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`},
    {name:'xl/workbook.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xe(s.name.slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`},
    {name:'xl/_rels/workbook.xml.rels',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`},
    {name:'xl/styles.xml',data:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.##"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FF2F6B58"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3EDE2"/></patternFill></fill></fills><borders count="2"><border/><border><bottom style="thin"><color rgb="FFD9CDB8"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`},
    ...sx.map((x,i)=>({name:`xl/worksheets/sheet${i+1}.xml`,data:x}))
  ]);
}
const STAT={done:'Завершён',overdue:'Просрочен',active:'Активный'};
function excelBackup(){
  const C=(h,w,t)=>({h,w,t});
  const ks=db.contracts.slice().sort((a,b)=>a.no-b.no).map(c=>({c,k:calc(c)}));
  const pays=[];ks.forEach(({c})=>c.payments.forEach(p=>pays.push([dmy(p.date),c.no,fio(client(c.clientId)),c.item,p.amount,p.note||''])));
  pays.sort((a,b)=>a[0].split('.').reverse().join('')<b[0].split('.').reverse().join('')?1:-1);
  const dops=[];db.debts.forEach(d=>d.ops.forEach(o=>dops.push([dmy(o.date),fio(d),d.type==='in'?'Мне должны':'Я должен',o.kind==='add'?'Долг':'Возврат',o.amount,o.note||'',o.confirmed?'да':''])));
  dops.sort((a,b)=>a[0].split('.').reverse().join('')<b[0].split('.').reverse().join('')?1:-1);
  return xlsx([
    {name:'Договоры',cols:[C('№',6,'n'),C('Дата',12),C('Клиент',30),C('Телефон',16),C('Товар',26),C('Закуп',12,'n'),C('Наценка',12,'n'),C('Цена в рассрочку',16,'n'),C('Первый взнос',13,'n'),C('Срок, мес',10,'n'),C('Платёж в месяц',15,'n'),C('Первый платёж',14),C('Оплачено',12,'n'),C('Остаток',12,'n'),C('Просрочено',12,'n'),C('Статус',12),C('Инвестор',24),C('Доля инвестора, %',12,'n'),C('Поручитель',24),C('Заметка',30)],
      rows:ks.map(({c,k})=>{const cl=client(c.clientId),iv=investor(c.investorId);return[c.no,dmy(c.date),fio(cl),cl.phone||'',c.item,c.cost,c.markup,k.total,c.down,c.months,k.monthly,dmy(c.first),k.paid,k.left,k.overdue,STAT[k.status],iv?fio(iv):'',iv?+c.invPct||0:'',c.guarantor||'',c.note||'']})},
    {name:'Платежи',cols:[C('Дата',12),C('Договор №',10,'n'),C('Клиент',30),C('Товар',26),C('Сумма',12,'n'),C('Заметка',30)],rows:pays},
    {name:'Долги',cols:[C('ФИО',30),C('Телефон',16),C('Кто должен',14),C('Дата',12),C('Вернуть до',12),C('Сумма долга',13,'n'),C('Возвращено',13,'n'),C('Остаток',12,'n'),C('Статус',12),C('Заметка',30)],
      rows:db.debts.map(d=>{const k=dcalc(d);return[fio(d),d.phone||'',d.type==='in'?'Мне должны':'Я должен',dmy(d.date),dmy(d.due),k.add,k.paid,k.left,k.status==='done'?'Закрыт':STAT[k.status],d.note||'']})},
    {name:'Операции по долгам',cols:[C('Дата',12),C('ФИО',30),C('Кто должен',14),C('Операция',12),C('Сумма',12,'n'),C('Заметка',30),C('Подтверждено',13)],rows:dops},
    {name:'Контакты',cols:[C('ФИО',32),C('Телефон',16),C('Доп. номер',16),C('Проживание',36),C('Фото документов',15,'n'),C('Договоров',11,'n'),C('Долгов',9,'n'),C('Чёрный список',14),C('Причина',34),C('Удалён',12)],
      rows:db.clients.slice().sort((a,b)=>fio(a).localeCompare(fio(b),'ru')).map(c=>[fio(c),c.phone||'',c.phone2||'',c.address||'',(c.files||[]).length,db.contracts.filter(x=>x.clientId===c.id).length,db.debts.filter(x=>x.contactId===c.id).length,c.black?'да':'',c.blackNote||'',c.deleted?dmy(c.deleted):''])},
    {name:'Инвесторы',cols:[C('ФИО',30),C('Телефон',16),C('Доля, %',9,'n'),C('Срок, мес',10,'n'),C('Договоров',11,'n'),C('Вложено',13,'n'),C('Прибыль ожидается',17,'n'),C('Прибыль получена',17,'n')],
      rows:db.investors.map(i=>{const s=invSum(db.contracts.filter(c=>c.investorId===i.id));return[fio(i),i.phone||'',i.pct,i.months,s.n,s.invested,s.exp,s.got]})}
  ]);
}
const jsonBackup=()=>new Blob([JSON.stringify({app:'x-finance',version:2,created:new Date().toISOString(),...db},null,1)],{type:'application/json'});
const bName=ext=>`X-Finance_${today()}.${ext}`;
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000)}
/* ---------- договоры в виде картинки (PNG) для локальной папки: X-Finance / Договоры в виде картинки / Рассрочки | Долги ---------- */
const PF='600 {s}px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',pf=(s,w)=>PF.replace('600',w||600).replace('{s}',s);
const PC={bg:'#F7F2E9',card:'#FFFFFF',ink:'#24211D',mut:'#8A8173',line:'#EEE8DE',acc:'#2F6B58',gold:'#A8823F',warn:'#B9573A',sky:'#4D7C99',soft:'#FAF6EE'};
function cvRect(x,c,y,w,h,r,fill,stroke){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();if(fill){c.fillStyle=fill;c.fill()}if(stroke){c.strokeStyle=stroke;c.lineWidth=2;c.stroke()}}
function cvText(c,t,x,y,font,color,max,align){c.font=font;c.fillStyle=color;c.textAlign=align||'left';t=String(t??'');if(max&&c.measureText(t).width>max){while(t.length>1&&c.measureText(t+'…').width>max)t=t.slice(0,-1);t+='…'}c.fillText(t,x,y);c.textAlign='left';return c.measureText(t).width}
function cvWrap(c,t,font,max){c.font=font;const out=[];let line='';for(const w of String(t).split(' ')){const tr=line?line+' '+w:w;if(line&&c.measureText(tr).width>max){out.push(line);line=w}else line=tr}if(line)out.push(line);return out}
function cvPill(c,t,x,y,fg,bg,align){c.font=pf(22,700);const w=c.measureText(t).width+32;const X=align==='right'?x-w:x;cvRect(X,c,y-30,w,42,21,bg);cvText(c,t,X+16,y-1,pf(22,700),fg);return w}
/* документ формата А4 (1240×1754 = А4 при 150 dpi): белый лист, тонкие линии, без карточек; одинаковый на телефоне и компьютере */
async function docImage(spec){
  const W=1240,M=100,CW=W-2*M,A4=1754,FOOT=290,cnv=document.createElement('canvas'),c=cnv.getContext('2d');
  const ls=v=>{try{c.letterSpacing=v+'px'}catch(e){}};
  const nL=(spec.notes||[]).map(n=>cvWrap(c,n,pf(21,500),CW));
  const T=[spec.table,spec.hist&&spec.hist.rows.length?spec.hist:null].filter(Boolean),nRows=T.reduce((a,t)=>a+t.rows.length,0);
  const fixed=310+164+40+Math.ceil(spec.kv.length/2)*56+28+(spec.bar!=null?84:0)+T.length*(40+40+36)+nL.reduce((a,l)=>a+l.length*30+10,0)+(nL.length?20:0);
  let rh=Math.max(36,Math.min(50,Math.floor((A4-FOOT-fixed)/Math.max(1,nRows))));
  const H=Math.max(A4,fixed+nRows*rh+FOOT);cnv.width=W;cnv.height=H;
  c.fillStyle='#FFFFFF';c.fillRect(0,0,W,H);
  const hr=(y,col)=>{c.fillStyle=col||'#E7E2D9';c.fillRect(M,y,CW,1.5)};
  const label=(t,y)=>{ls(2.4);cvText(c,t.toUpperCase(),M,y,pf(17,700),PC.mut);ls(0)};
  /* шапка */
  let y=96;
  cvText(c,spec.company||'X-Finance',M,y+30,pf(28,760),PC.ink,CW-300);
  ls(1.2);cvText(c,'X-FINANCE',W-M,y+28,pf(17,700),PC.mut,0,'right');ls(0);
  hr(y+58,PC.ink);
  y=230;cvText(c,spec.title,M,y,pf(54,760),PC.ink,CW-280);
  /* статус: точка + текст */
  c.font=pf(22,700);const sw=c.measureText(spec.status[0]).width;
  c.fillStyle=spec.status[1];c.beginPath();c.arc(W-M-sw-18,y-15,7,0,7);c.fill();cvText(c,spec.status[0],W-M,y-7,pf(22,700),spec.status[1],0,'right');
  y+=44;cvText(c,spec.sub,M,y,pf(24,500),PC.mut,CW);
  y=310;
  /* клиент */
  label(spec.client||'Клиент',y+22);y+=40;hr(y);
  cvText(c,spec.who,M,y+44,pf(32,720),PC.ink,CW);cvText(c,spec.whoSub,M,y+82,pf(22,500),PC.mut,CW);y+=124;
  /* условия — две колонки строк «название … значение» */
  label(spec.kvTitle||'Условия',y+22);y+=40;
  const cw=(CW-60)/2;
  spec.kv.forEach(([k,v,col],i)=>{const x=M+(i%2)*(cw+60),yy=y+Math.floor(i/2)*56;
    c.fillStyle='#EEEAE2';c.fillRect(x,yy,cw,1.5);
    const kw=cvText(c,k,x,yy+36,pf(21,500),PC.mut,cw*.55);cvText(c,v,x+cw,yy+36,pf(23,700),col||PC.ink,cw-kw-24,'right')});
  y+=Math.ceil(spec.kv.length/2)*56;c.fillStyle='#EEEAE2';c.fillRect(M,y,CW,1.5);y+=28;
  /* полоса оплаты */
  if(spec.bar!=null){cvRect(M,c,y+8,CW,8,4,'#EFEAE1');if(spec.bar>0)cvRect(M,c,y+8,Math.max(8,CW*Math.min(1,spec.bar)),8,4,spec.barC||PC.acc);
    cvText(c,spec.barL,M,y+52,pf(20,600),PC.mut,CW);y+=84}
  /* таблицы */
  T.forEach(t=>{label(t.title,y+22);y+=40;const xs=t.cols.map(z=>M+z[1]*CW);
    t.cols.forEach((z,j)=>cvText(c,z[0],xs[j],y+24,pf(18,600),PC.mut,(j+1<xs.length?xs[j+1]:W-M)-xs[j]-16));y+=36;hr(y,'#CFC7BA');
    t.rows.forEach((r,i)=>{const yy=y+i*rh;if(i)c.fillStyle='#F0ECE5',c.fillRect(M,yy,CW,1.5);
      r.cells.forEach((v,j)=>cvText(c,v,xs[j],yy+rh/2+8,pf(rh<42?19:21,j===t.bold?700:500),(r.col&&r.col[j])||PC.ink,(j+1<xs.length?xs[j+1]:W-M)-xs[j]-16))});
    y+=t.rows.length*rh;hr(y,'#CFC7BA');y+=40});
  /* примечания */
  if(nL.length){y+=4;nL.forEach(lsx=>{lsx.forEach(l=>{cvText(c,l,M,y+22,pf(21,500),'#5E574D',CW);y+=30});y+=10})}
  /* подвал — внизу листа */
  /* подписи сторон */
  const sy=H-FOOT+80,sg=spec.sign||['Продавец','Покупатель'],sw2=(CW-80)/2;
  sg.forEach((t,i)=>{const x=M+i*(sw2+80);c.fillStyle='#BDB4A6';c.fillRect(x,sy,sw2,1.5);cvText(c,t+' · подпись',x,sy+30,pf(18,500),PC.mut,sw2)});
  const fy=H-150+40;hr(fy);
  const d=new Date();
  cvText(c,spec.foot||'Без процентов и штрафов',M,fy+42,pf(19,500),PC.mut,CW*.6);
  cvText(c,`Сформировано ${dmy(iso(d))} в ${pad(d.getHours())}:${pad(d.getMinutes())}`,W-M,fy+42,pf(19,500),PC.mut,0,'right');
  return new Promise(r=>cnv.toBlob(r,'image/png'));
}
let DOCB=null;
/* ===== бланк договора (как бумажный «Договор купли-продажи · товар с условием рассрочки») и долговая расписка, А4 ===== */
const SF=(s,w)=>`${w||400} ${s}px Georgia,"Times New Roman","Noto Serif","DejaVu Serif",serif`,FINK='#1F2D4D';
/* сумма прописью: 40000 → «сорок тысяч рублей» */
function rubWords(n){n=Math.floor(Math.abs(+n||0));if(!n)return'ноль рублей';
  const U=[['','один','два','три','четыре','пять','шесть','семь','восемь','девять'],['','одна','две','три','четыре','пять','шесть','семь','восемь','девять']],
    T=['десять','одиннадцать','двенадцать','тринадцать','четырнадцать','пятнадцать','шестнадцать','семнадцать','восемнадцать','девятнадцать'],
    D=['','','двадцать','тридцать','сорок','пятьдесят','шестьдесят','семьдесят','восемьдесят','девяносто'],
    H=['','сто','двести','триста','четыреста','пятьсот','шестьсот','семьсот','восемьсот','девятьсот'],
    G=[['рубль','рубля','рублей',0],['тысяча','тысячи','тысяч',1],['миллион','миллиона','миллионов',0],['миллиард','миллиарда','миллиардов',0]];
  const out=[];let g=0;
  while(n>0||g===0){const t=n%1000;n=Math.floor(n/1000);
    if(t||g===0){const w=[],h=Math.floor(t/100),r=t%100,d=Math.floor(r/10),u=r%10;if(h)w.push(H[h]);
      if(r>=10&&r<20)w.push(T[r-10]);else{if(d)w.push(D[d]);if(u)w.push(U[G[g][3]][u])}
      const f=r>=10&&r<20?2:u===1?0:u>=2&&u<=4?1:2;if(t||g===0)w.push(G[g][f]);out.unshift(w.filter(Boolean).join(' '))}
    g++;if(g>3)break}
  return out.join(' ').replace(/\s+/g,' ').trim()}
function formCanvas(nRows,fixed,rhMax,rhMin){const A4=1754;const rh=Math.max(rhMin,Math.min(rhMax,Math.floor((A4-fixed)/Math.max(1,nRows))));
  const H=Math.max(A4,fixed+nRows*rh);const cnv=document.createElement('canvas');cnv.width=1240;cnv.height=H;const c=cnv.getContext('2d');
  c.fillStyle='#fff';c.fillRect(0,0,1240,H);
  /* тонкая светлая рамка вокруг листа с отступом */
  c.save();c.strokeStyle='#E2D9CB';c.lineWidth=1.6;cvRect(44,c,44,1240-88,H-88,22,null,null);c.stroke();c.restore();return{cnv,c,rh,H}}
function formKit(c,W,M){
  const line=(x1,x2,y,col)=>{c.fillStyle=col||'#9C9284';c.fillRect(x1,y,x2-x1,1.4)};
  /* поле: подпись сериф + линия до конца + вписанное значение */
  const field=(lab,val,x,y,w,o={})=>{const lw=cvText(c,lab,x,y,SF(o.ls||23,o.lw||400),PC.ink);const x0=x+lw+12;
    line(x0,x+w,y+8);if(val!=null&&val!=='')cvText(c,val,o.center?x0+(x+w-x0)/2:x0+8,y-2,pf(o.vs||24,o.vw||650),o.vc||FINK,x+w-x0-16,o.center?'center':'');return y};
  const para=(t,x,y,w,o={})=>{const f=SF(o.s||22,o.w||400),ls=cvWrap(c,t,f,w-(o.ind||0));ls.forEach((l,i)=>cvText(c,l,x+(i?o.ind||0:0),y+i*(o.lh||32),f,o.col||PC.ink));return y+ls.length*(o.lh||32)};
  /* логотип: название компании в два цвета */
  const logo=(name,y)=>{const ws=String(name||'X-Finance').trim().split(/\s+/),a=ws[0],b=ws.slice(1).join(' ');let fs=96;
    const fw=()=>{c.font=pf(fs,820);return c.measureText(a+(b?' '+b:'')).width};while(fw()>W-2*M&&fs>40)fs-=4;
    c.font=pf(fs,820);const wa=c.measureText(a+(b?' ':'')).width,tw=fw(),x=(W-tw)/2;
    try{c.letterSpacing='-1.5px'}catch(e){}cvText(c,a+(b?' ':''),x,y,pf(fs,820),PC.acc);if(b)cvText(c,b,x+wa,y,pf(fs,820),PC.ink);try{c.letterSpacing='0px'}catch(e){}};
  /* штамп статуса */
  const stamp=(t,col,x,y)=>{if(!t)return;c.save();c.translate(x,y);c.rotate(-0.09);c.globalAlpha=.82;c.font=pf(22,800);try{c.letterSpacing='2px'}catch(e){}
    const w=c.measureText(t).width+40;c.strokeStyle=col;c.lineWidth=3.5;cvRect(-w/2,c,-26,w,52,11,null,null);c.stroke();c.lineWidth=1.4;cvRect(-w/2+6,c,-20,w-12,40,7,null,null);c.stroke();
    c.fillStyle=col;c.textAlign='center';c.fillText(t,0,8);c.restore();try{c.letterSpacing='0px'}catch(e){}};
  /* таблица с рамкой: cols=[[заголовок, доля, выравн]], rows=[{cells,col}] */
  const grid=(cols,rows,x,y,w,rh,hh)=>{const xs=cols.map(z=>x+z[1]*w),H=hh+rows.length*rh;
    c.save();cvRect(x,c,y,w,H,14,null,null);c.clip();c.fillStyle='#F5EFE4';c.fillRect(x,y,w,hh);c.restore();
    c.fillStyle='#ECE6DC';rows.forEach((r,i)=>c.fillRect(x,y+hh+i*rh,w,1.2));xs.slice(1).forEach(xx=>c.fillRect(xx,y,1.2,H));
    c.save();c.strokeStyle='#DDD4C6';c.lineWidth=1.6;cvRect(x,c,y,w,H,14,null,null);c.stroke();c.restore();
    const cx=(j,al)=>al==='c'?(xs[j]+(j+1<xs.length?xs[j+1]:x+w))/2:xs[j]+14;
    cols.forEach((z,j)=>{try{c.letterSpacing='1.5px'}catch(e){}cvText(c,z[0],cx(j,'c'),y+hh/2+7,SF(17,700),PC.ink,0,'center');try{c.letterSpacing='0px'}catch(e){}});
    rows.forEach((r,i)=>r.cells.forEach((v,j)=>{const al=cols[j][2]||'c';cvText(c,v,cx(j,al),y+hh+i*rh+rh/2+8,j===0?SF(rh<42?17:19,700):pf(rh<42?19:21,r.b&&r.b[j]?700:560),(r.col&&r.col[j])||(j===0?PC.ink:FINK),(j+1<xs.length?xs[j+1]:x+w)-xs[j]-20,al==='c'?'center':'')}));
    return y+H};
  /* плашка-событие над таблицей: «Принят платёж», «Перенос графика» (для отправки клиенту в WhatsApp) */
  const banner=(y,col,bg,mark,title,sub)=>{const h=sub?86:62;cvRect(M,c,y,W-2*M,h,16,bg);c.fillStyle=col;c.fillRect(M,y+14,4,h-28);
    c.beginPath();c.arc(M+42,y+h/2,17,0,7);c.fillStyle=col;c.fill();cvText(c,mark,M+42,y+h/2+8,pf(21,800),'#fff',0,'center');
    cvText(c,title,M+74,y+(sub?36:40),pf(24,750),col,W-2*M-100);if(sub)cvText(c,sub,M+74,y+68,pf(19,550),'#5E574D',W-2*M-100);return y+h+18};
  return{line,field,para,logo,stamp,grid,banner}}
const dDots=s=>{if(!s)return['____','______________','20__'];const[y,m,d]=s.split('-').map(Number);return[String(d),MONG[m-1],String(y)]};
function dateLine(c,K,s,xr,y){const[d,m,yy]=dDots(s);const f=SF(23,400);c.font=f;
  /* «« 16 » июля 2026 г.» справа */
  const parts=[['«',0],[d,1,54],['»',0],[m,1,190],[yy+' г.',0]];let w=0;parts.forEach(p=>{w+=p[1]?p[2]+8:c.measureText(p[0]).width+4});let x=xr-w;
  parts.forEach(p=>{if(p[1]){K.line(x+2,x+p[2]+2,y+8);cvText(c,p[0],x+p[2]/2+2,y-2,pf(23,650),FINK,0,'center');x+=p[2]+8}else{cvText(c,p[0],x,y,f,PC.ink);x+=c.measureText(p[0]).width+4}})}
/* что печатать на бланке: название вверху и телефон для связи (Настройки → Резервная копия → «Бланк договора») */
const blankCfg=()=>{const b=S.blank||{};return{title:(b.title||'').trim()||me&&me.company||me&&me.name||'X-Finance',phone:(b.phone||'').trim()||me&&me.phone||''}};
function ownerName(){return[(S.blank&&(S.blank.title||'').trim())||me&&me.company||'',me&&me.name].filter(Boolean).join(', ')||'—'}
async function contractBlank(x,o={}){const k=calc(x),cl=o.cl||client(x.clientId)||{},W=1240,M=96,CW=W-2*M,t=today();
  const sh=(x.shifts||[]).slice(-1)[0],lp=(x.payments||[]).slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0)).pop();
  const bn=o.mode==='pay'&&lp?'pay':o.mode==='shift'&&sh?'shift':'';
  const n=k.rows.length,fixed=1188+300+(bn?104:0);const{cnv,c,rh,H}=formCanvas(n,fixed,54,36);const K=formKit(c,W,M);
  K.logo(blankCfg().title,150);
  cvText(c,'ДОГОВОР КУПЛИ-ПРОДАЖИ',W/2,232,SF(34,700),PC.ink,0,'center');
  cvText(c,'Товар с условием рассрочки',W/2,270,SF(23,700),'#5B544A',0,'center');
  cvText(c,'№ '+x.no,M,330,SF(25,700),PC.ink);dateLine(c,K,x.date,W-M,330);
  /* стороны */
  let y=400;const F=(l,v)=>{K.field(l,v,M,y,CW);y+=50};
  F('Именуемый в дальнейшем «ПРОДАВЕЦ»',ownerName());
  F('Именуемый в дальнейшем «ПОКУПАТЕЛЬ»',fio(cl));
  /* паспорт — пустые поля, заполняются от руки */
  {const a=cvText(c,'Серия паспорта',M,y,SF(23),PC.ink);K.line(M+a+12,M+a+112,y+8);const b=cvText(c,'номер',M+a+130,y,SF(23),PC.ink);
   K.line(M+a+142+b,M+a+300+b,y+8);const e=cvText(c,'выдан',M+a+318+b,y,SF(23),PC.ink);K.line(M+a+330+b+e,M+CW,y+8);y+=50}
  F('Адрес покупателя:',cl.address||'');F('Телефон покупателя',[cl.phone,cl.phone2].filter(Boolean).join(', '));
  /* условия */
  y+=22;const P=(num,txt,o)=>{cvText(c,num,M,y,SF(22,o&&o.b?700:400),PC.ink);y=K.para(txt,M+44,y,CW-44,{w:o&&o.b?700:400,...o})+8};
  P('1.1.','«ПОКУПАТЕЛЬ» обязуется оплатить стоимость товара в порядке, сроки и сумме, указанные в настоящем договоре.');
  P('2.1.','Наименование, стоимость и порядок расчётов:');
  const G=(num,l,v,w0,o)=>{cvText(c,num,M,y,SF(22),PC.ink);K.field(l,v,M+44,y,(w0||CW)-44,{ls:22,...o})};
  G('2.2.','Наименование:',x.item);y+=46;
  G('2.3.','Стоимость товара наличными:',money(x.cost));y+=46;
  G('2.4.','Стоимость товара в рассрочку:',money(k.total),CW*.64);K.field('Взнос',x.down?money(x.down):'нет',M+CW*.68,y,CW*.32);y+=46;
  G('2.5.','Срок:',x.months+' мес.',CW*.36);K.field('Ежемесячный платёж',money(k.monthly)+' · до '+(+String(x.first).slice(8,10))+' числа',M+CW*.4,y,CW*.6);y+=50;
  P('2.6.','Покупатель не имеет права продавать или передавать товар до полного погашения долга.',{b:1,s:23});
  P('2.7.','Цена зафиксирована при оформлении: без процентов, пени и штрафов. Просрочка не увеличивает сумму.');
  /* график */
  y+=10;
  if(bn==='pay')y=K.banner(y,PC.acc,'rgba(47,107,88,.08)','✓',`Принят платёж ${money(lp.amount)} · ${dmy(lp.date)}`,
    k.left<=0?'Рассрочка выплачена полностью. Баракаллаху фикум!':`Остаток ${money(k.left)}`+(k.next?` · следующий платёж ${money(k.next.rest)} до ${dmy(k.next.date)}`:''));
  if(bn==='shift')y=K.banner(y,PC.sky,'rgba(77,124,153,.09)','↻',`Перенос графика на ${sh.months} мес. · ${dmy(sh.date)}`,
    `С платежа №${(sh.from|0)+1} даты сдвинуты, сумма не изменилась`+(k.next?` · ближайший платёж ${money(k.next.rest)} до ${dmy(k.next.date)}`:''));
  const top=y;
  const rows=k.rows.map(r=>{const ov=r.st==='overdue',pd=r.st==='paid',part=!pd&&r.got,mv=bn==='shift'&&r.n>(sh.from|0)&&!pd;
    return{cells:[r.n+'. ОПЛАТА',dmy(r.date),money(r.amount),pd?'✓ '+money(r.got||r.amount):part?money(r.got):ov?'просрочен':'',''],
      col:[0,ov?PC.warn:mv?PC.sky:0,0,pd?PC.acc:part?PC.gold:ov?PC.warn:0,0],b:[0,mv?1:0,1,pd?1:0]}});
  y=K.grid([['ОПЛАТА',0,'l'],['ДАТА',.19],['СУММА',.38],['ВНЕСЕНО',.58],['ПОДПИСЬ',.8]],rows,M,y,CW,rh,46);
  y+=34;cvText(c,`Оплачено ${money(k.paid)} из ${money(k.fin)}`,M,y,pf(20,650),PC.acc);
  cvText(c,k.left?`Остаток ${money(k.left)}`+(k.overdue?` · просрочено ${money(k.overdue)}`:''):'Рассрочка полностью оплачена',W-M,y,pf(20,700),k.overdue?PC.warn:k.left?PC.ink:PC.acc,0,'right');
  /* подписи */
  y=Math.max(y+58,H-318);const sw=(CW-60)/3;
  [['Покупатель'],['Поручитель'],['Продавец']].forEach(([l],i)=>{const xx=M+i*(sw+30);const lw=cvText(c,l,xx,y,SF(22),PC.ink);K.line(xx+lw+10,xx+sw,y+8,'#9C9284');
    cvText(c,'(подпись)',xx+sw-4,y+32,SF(15,400),PC.mut,0,'right')});
  y+=78;K.field('Поручитель Ф.И.О.',x.guarantor||'',M,y,CW*.62);K.field('Тел.','',M+CW*.66,y,CW*.34);
  /* подвал */
  const ph=blankCfg().phone;K.line(M,W-M,H-118,'#ECE6DC');
  cvText(c,ph?'Телефон для связи: '+ph:'X-Finance',W/2,H-80,pf(21,650),PC.ink,0,'center');
  cvText(c,`X-Finance · ${new Date().toLocaleDateString('ru-RU')}`,W-M,H-80,pf(15,500),'#B3AA9C',0,'right');
  const st=k.status==='done'?['ВЫПЛАЧЕНО',PC.acc]:k.status==='overdue'?['ПРОСРОЧКА · '+pdays(k.days).toUpperCase(),PC.warn]:(x.shifts||[]).length?['ПЕРЕНОС',PC.sky]:null;
  if(st)K.stamp(st[0],st[1],W-M-230,(y+8+H-118)/2+2);
  return o.canvas?cnv:new Promise(r=>cnv.toBlob(r,'image/png'))}
async function debtBlank(d,o={}){const k=dcalc(d),mine=d.type==='in',W=1240,M=96,CW=W-2*M,cl=o.cl||d.contactId&&client(d.contactId)||{};
  const ops=sortD(d.ops).reverse(),lo=ops.filter(z=>z.kind==='pay').slice(-1)[0],bn=o.mode==='pay'&&lo?'pay':'';const fixed=1100+300+(bn?104:0);const{cnv,c,rh,H}=formCanvas(Math.max(ops.length,1),fixed,54,36);const K=formKit(c,W,M);
  K.logo(blankCfg().title,150);
  cvText(c,'ДОЛГОВАЯ РАСПИСКА',W/2,232,SF(34,700),PC.ink,0,'center');
  cvText(c,'Учёт долга · без процентов и штрафов',W/2,270,SF(23,700),'#5B544A',0,'center');
  cvText(c,mine?'Мне должны':'Я должен',M,330,SF(25,700),PC.ink);dateLine(c,K,d.date||(ops[0]||{}).date,W-M,330);
  const me1=ownerName(),him=fio(d)||'—';let y=400;const F=(l,v)=>{K.field(l,v,M,y,CW);y+=50};
  F('Именуемый в дальнейшем «ЗАЙМОДАВЕЦ»',mine?me1:him);
  F('Именуемый в дальнейшем «ЗАЁМЩИК»',mine?him:me1);
  {const a=cvText(c,'Серия паспорта',M,y,SF(23),PC.ink);K.line(M+a+12,M+a+112,y+8);const b=cvText(c,'номер',M+a+130,y,SF(23),PC.ink);
   K.line(M+a+142+b,M+a+300+b,y+8);const e=cvText(c,'выдан',M+a+318+b,y,SF(23),PC.ink);K.line(M+a+330+b+e,M+CW,y+8);y+=50}
  F('Адрес заёмщика:',mine?cl.address||'':'');F('Телефон заёмщика',mine?d.phone||'':(me&&me.phone)||'');
  y+=22;const P=(num,txt,o)=>{cvText(c,num,M,y,SF(22,o&&o.b?700:400),PC.ink);y=K.para(txt,M+44,y,CW-44,{w:o&&o.b?700:400,...o})+8};
  P('1.1.',`«ЗАЁМЩИК» получил от «ЗАЙМОДАВЦА» денежные средства и обязуется вернуть их в срок, указанный в настоящей расписке.`);
  const G=(num,l,v,w0,o)=>{cvText(c,num,M,y,SF(22),PC.ink);K.field(l,v,M+44,y,(w0||CW)-44,{ls:22,...o})};
  G('1.2.','Сумма долга:',money(k.add));y+=46;
  {const t='('+rubWords(k.add)+')';cvText(c,t,M+44,y,SF(21,400),'#5B544A',CW-44)}y+=42;
  G('1.3.','Срок возврата:',d.due?dlong(d.due):'без срока',CW*.55);K.field('Возвращено',money(k.paid),M+CW*.59,y,CW*.41,{vc:PC.acc});y+=46;
  G('1.4.','Назначение / примечание:',d.note||'');y+=50;
  P('1.5.','Долг возвращается без процентов, пени и штрафов. Возврат частями отмечается в таблице ниже.',{b:1,s:23});
  if((d.moves||[]).length)P('1.6.','Срок переносился: '+d.moves.map(m=>dmy(m.from)+' → '+dmy(m.to)).join('; ')+'.');
  y+=10;
  if(bn)y=K.banner(y,PC.acc,'rgba(47,107,88,.08)','✓',`${mine?'Принят возврат':'Возвращено'} ${money(lo.amount)} · ${dmy(lo.date)}`,k.left<=0?'Долг закрыт полностью. Баракаллаху фикум!':`Остаток долга ${money(k.left)}`);
  const top=y;let run=0;
  const rows=ops.map((o,i)=>{run=r2(run+(o.kind==='add'?o.amount:-o.amount));const add=o.kind==='add';
    return{cells:[String(i+1),dmy(o.date),add?'Получено в долг':'Возврат',(add?'+':'−')+money(o.amount),money(Math.max(0,run)),o.confirmed?'✓ подтв.':''],
      col:[0,0,0,add?PC.warn:PC.acc,0,PC.acc],b:[0,0,0,1,0]}});
  if(!rows.length)rows.push({cells:['','','','','','']});
  y=K.grid([['№',0],['ДАТА',.07],['ОПЕРАЦИЯ',.25],['СУММА',.47],['ОСТАТОК',.65],['ПОДПИСЬ',.82]],rows,M,y,CW,rh,46);
  y+=34;cvText(c,`Возвращено ${money(k.paid)} из ${money(k.add)}`,M,y,pf(20,650),PC.acc);
  cvText(c,k.left?`Остаток ${money(k.left)}`:'Долг полностью возвращён',W-M,y,pf(20,700),k.status==='overdue'?PC.warn:k.left?PC.ink:PC.acc,0,'right');
  y=Math.max(y+58,H-318);const sw=(CW-60)/2;
  [['Заёмщик'],['Займодавец']].forEach(([l],i)=>{const xx=M+i*(sw+60);const lw=cvText(c,l,xx,y,SF(22),PC.ink);K.line(xx+lw+10,xx+sw,y+8,'#9C9284');
    cvText(c,'(подпись)',xx+sw-4,y+32,SF(15,400),PC.mut,0,'right')});
  y+=78;K.field('Свидетель Ф.И.О.','',M,y,CW*.62);K.field('Тел.','',M+CW*.66,y,CW*.34);
  const ph=blankCfg().phone;K.line(M,W-M,H-118,'#ECE6DC');
  cvText(c,ph?'Телефон для связи: '+ph:'X-Finance',W/2,H-80,pf(21,650),PC.ink,0,'center');
  cvText(c,`X-Finance · ${new Date().toLocaleDateString('ru-RU')}`,W-M,H-80,pf(15,500),'#B3AA9C',0,'right');
  const st=k.status==='done'?['ДОЛГ ЗАКРЫТ',PC.acc]:k.status==='overdue'?['ПРОСРОЧЕН · '+pdays(k.days).toUpperCase(),PC.warn]:(d.moves||[]).length?['СРОК ПЕРЕНЕСЁН',PC.sky]:null;
  if(st)K.stamp(st[0],st[1],W-M-230,(y+8+H-118)/2+2);
  return o.canvas?cnv:new Promise(r=>cnv.toBlob(r,'image/png'))}
const docOf=(kind,x,o)=>kind==='c'?contractBlank(x,o):debtBlank(x,o);
/* ===== PDF-формат (как в прежнем приложении владельца): строгий чёрно-белый лист А4, координаты в пунктах ===== */
function pdfCanvas(kind,x,o={}){const sc=3,PW=595.28,PH=841.89,M=55,R=PW-M,CW=R-M,cnv=document.createElement('canvas'),c=cnv.getContext('2d');
  const isC=kind==='c',k=isC?calc(x):dcalc(x),mine=!isC&&x.type==='in';
  const cl=o.cl||(isC?client(x.clientId):x.contactId&&client(x.contactId))||{},bc=blankCfg(),INK='#111',MUT='#555',LN='#3a3a3a',LL='#bdbdbd';
  /* строки таблицы */
  let rows=[];
  if(isC){let paid=0;rows=k.rows.map(r=>{const g=r.st==='paid'?(r.got||r.amount):(r.got||0);paid+=g;return{c:[r.n,dmy(r.date),g?money(g):'',g?money(Math.max(0,k.fin-paid)):''],hl:0,ov:r.st==='overdue'}});
    if(o.mode==='pay'){for(let i=rows.length-1;i>=0;i--)if(rows[i].c[2]){rows[i].hl=1;break}}}
  else{let run=0;rows=sortD(x.ops).reverse().map((op,i)=>{run=r2(run+(op.kind==='add'?op.amount:-op.amount));return{c:[i+1,dmy(op.date),op.kind==='add'?'Получено в долг':'Возврат',(op.kind==='add'?'+':'−')+money(op.amount),money(Math.max(0,run))],hl:0}});
    if(o.mode==='pay'){for(let i=rows.length-1;i>=0;i--)if(rows[i].c[2]==='Возврат'){rows[i].hl=1;break}}}
  const sh=isC&&(x.shifts||[]).slice(-1)[0],lp=isC&&(x.payments||[]).slice().sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.ts||0)-(b.ts||0)).pop(),lo=!isC&&sortD(x.ops).find(z=>z.kind==='pay');
  const note=o.mode==='pay'&&isC&&lp?`Принят платёж ${money(lp.amount)} от ${dmy(lp.date)}. Остаток долга: ${money(k.left)}.`
    :o.mode==='pay'&&!isC&&lo?`${mine?'Принят возврат':'Возвращено'} ${money(lo.amount)} от ${dmy(lo.date)}. Остаток долга: ${money(k.left)}.`
    :o.mode==='shift'&&sh?`График перенесён на ${sh.months} мес. (с платежа №${(sh.from|0)+1}) ${dmy(sh.date)}. Сумма не изменилась.`:'';
  const top=isC?257:262,hh=24,n=Math.max(rows.length,1),avail=PH-top-hh-190-(note?24:0),rh=Math.max(15,Math.min(26,avail/n)),H=Math.max(PH,top+hh+n*rh+190+(note?24:0));
  cnv.width=Math.round(PW*sc);cnv.height=Math.round(H*sc);c.scale(sc,sc);c.fillStyle='#fff';c.fillRect(0,0,PW,H);
  const F=(s,w)=>`${w||400} ${s}px Roboto,"Helvetica Neue",Arial,system-ui,sans-serif`;
  const T=(t,xx,yy,f,col,al,max)=>cvText(c,t,xx,yy,f,col||INK,max||0,al);
  const LV=(l,v,xx,yy,al)=>{c.font=F(9.5,700);const lw=c.measureText(l).width;c.font=F(9.5,400);const vw=c.measureText(' '+v).width;
    const x0=al==='right'?xx-lw-vw:xx;T(l,x0,yy,F(9.5,700));T(' '+v,x0+lw,yy,F(9.5,400))};
  /* шапка */
  T(isC?'ДОГОВОР КУПЛИ-ПРОДАЖИ ТОВАРА В РАССРОЧКУ':'ДОЛГОВАЯ РАСПИСКА',PW/2,68,F(12.5,700),INK,'center');
  if(!isC)T('Учёт долга без процентов и штрафов',PW/2,84,F(8.5,400),MUT,'center');
  T(`Дата: ${dmy(x.date||(x.ops&&x.ops[0]||{}).date||today())}`+(isC?` · № ${String(x.no||'').padStart(4,'0')}`:''),R,104,F(8.5,400),INK,'right');
  const ownerPh=bc.phone?'Тел: '+bc.phone:'',hisPh=(isC?cl.phone:x.phone||cl.phone)?'Тел: '+(isC?cl.phone:x.phone||cl.phone):'';
  if(isC){LV('Продавец:',bc.title,M,133);T(ownerPh,R,133,F(9.5),INK,'right');
    LV('Покупатель:',fio(cl)||'—',M,158);T(hisPh,R,158,F(9.5),INK,'right');
    LV('Товар:',x.item||'—',M,188);
    LV('Срок рассрочки:',x.months+' мес.',M,213);LV('Стоимость:',money(k.total),R,213,'right');
    LV('Ежемесячный платеж:',money(k.monthly),M,237);LV('Первый взнос:',x.down?money(x.down):'нет',R,237,'right')}
  else{const me1=bc.title,him=fio(x)||'—';
    LV('Займодавец:',mine?me1:him,M,133);T(mine?ownerPh:hisPh,R,133,F(9.5),INK,'right');
    LV('Заёмщик:',mine?him:me1,M,158);T(mine?hisPh:ownerPh,R,158,F(9.5),INK,'right');
    LV('Сумма долга:',money(k.add)+' ('+rubWords(k.add)+')',M,188);
    LV('Срок возврата:',x.due?dmy(x.due):'без срока',M,213);LV('Возвращено:',money(k.paid),R,213,'right');
    LV('Назначение:',x.note||'—',M,237);LV('Остаток:',money(k.left),R,237,'right')}
  /* таблица */
  const cols=isC?[['№',0,.1],['Дата',.1,.4],['Сумма',.4,.652],['Остаток долга',.652,1]]:[['№',0,.08],['Дата',.08,.28],['Операция',.28,.56],['Сумма',.56,.78],['Остаток',.78,1]];
  const tb=top+hh+n*rh;c.fillStyle='#F2F2F2';c.fillRect(M,top,CW,hh);
  rows.forEach((r,i)=>{if(r.hl){c.fillStyle='#EAF5EE';c.fillRect(M,top+hh+i*rh,CW,rh)}});
  c.strokeStyle=LN;c.lineWidth=.7;c.strokeRect(M,top,CW,tb-top);c.lineWidth=.5;c.strokeStyle='#8a8a8a';
  for(let i=0;i<n;i++){c.beginPath();c.moveTo(M,top+hh+i*rh);c.lineTo(R,top+hh+i*rh);c.stroke()}
  cols.slice(1).forEach(z=>{c.beginPath();c.moveTo(M+z[1]*CW,top);c.lineTo(M+z[1]*CW,tb);c.stroke()});
  cols.forEach(z=>T(z[0],M+(z[1]+z[2])/2*CW,top+hh/2+3,F(8.5,700),INK,'center'));
  const fs=rh<20?8:8.5;rows.forEach((r,i)=>r.c.forEach((v,j)=>T(String(v),M+(cols[j][1]+cols[j][2])/2*CW,top+hh+i*rh+rh/2+3,F(fs,r.hl&&j>1?700:400),r.ov&&j===1?'#B9573A':INK,'center',(cols[j][2]-cols[j][1])*CW-8)));
  /* текст и подписи */
  let y=tb+26;
  if(note){T(note,M,y,F(9,700),o.mode==='shift'?'#3F6C88':'#2F6B58',0,CW);y+=22}
  const para=isC?'Продавец обязуется передать Покупателю товар, а Покупатель обязуется принять и оплатить его в рассрочку на указанных выше условиях. Цена фиксированная: без процентов, пени и штрафов.'
    :'Заёмщик получил от Займодавца денежные средства в указанной сумме и обязуется вернуть их в срок, указанный выше. Долг возвращается без процентов, пени и штрафов.';
  cvWrap(c,para,F(8.5),CW).forEach(l=>{T(l,M,y,F(8.5),INK);y+=13});
  y=Math.max(y+58,tb+120);const sw=(CW-46)/2;
  (isC?['Продавец','Покупатель']:mine?['Займодавец','Заёмщик']:['Займодавец','Заёмщик']).forEach((t,i)=>{const xx=M+i*(sw+46);c.fillStyle='#8a8a8a';c.fillRect(xx,y,sw,.7);T(t,xx+sw/2,y+12,`italic ${F(7.5)}`,INK,'center')});
  return cnv}
/* PDF: одна страница с картинкой JPEG высокого разрешения (PDF собирается вручную, без библиотек) */
async function pdfOf(kind,x,o={}){const cnv=pdfCanvas(kind,x,o);
  const jb=await new Promise(r=>cnv.toBlob(r,'image/jpeg',.92)),img=new Uint8Array(await jb.arrayBuffer()),enc=new TextEncoder(),parts=[],offs=[];let len=0;
  const add=v=>{const b=typeof v==='string'?enc.encode(v):v;parts.push(b);len+=b.length},obj=(n,v)=>{offs[n]=len;add(`${n} 0 obj\n${v}\nendobj\n`)};
  const PW=595.28,PH=+(PW*cnv.height/cnv.width).toFixed(2),cs=`q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
  add('%PDF-1.4\n');obj(1,'<</Type/Catalog/Pages 2 0 R>>');obj(2,'<</Type/Pages/Kids[3 0 R]/Count 1>>');
  obj(3,`<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${PW} ${PH}]/Resources<</XObject<</Im0 4 0 R>>>>/Contents 5 0 R>>`);
  offs[4]=len;add(`4 0 obj\n<</Type/XObject/Subtype/Image/Width ${cnv.width}/Height ${cnv.height}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${img.length}>>\nstream\n`);add(img);add('\nendstream\nendobj\n');
  obj(5,`<</Length ${cs.length}>>\nstream\n${cs}\nendstream`);
  const xr=len;add('xref\n0 6\n0000000000 65535 f \n'+[1,2,3,4,5].map(n=>String(offs[n]).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size 6/Root 1 0 R>>\nstartxref\n${xr}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'})}

const RST={paid:['Оплачен',PC.acc],overdue:['Просрочен',PC.warn],due:['Ожидается',PC.mut]};
function contractSpec(x){const k=calc(x),cl=client(x.clientId),iv=x.investorId&&investor(x.investorId),t=today();
  const st=k.status==='done'?['Выплачено',PC.acc,'rgba(47,107,88,.12)']:k.status==='overdue'?['Просрочка '+pdays(k.days),PC.warn,'rgba(185,87,58,.12)']:(x.shifts||[]).length?['Перенос',PC.sky,'rgba(77,124,153,.12)']:['Активный',PC.gold,'rgba(168,130,63,.14)'];
  return{company:me&&me.company||'',status:st,client:'Покупатель',sign:['Продавец','Покупатель'],foot:'Исламская рассрочка · без процентов и штрафов',kvTitle:'Условия рассрочки',title:`Рассрочка №${x.no}`,sub:`${x.item} · от ${dmy(x.date)} · ${x.months} мес.`,
    who:fio(cl)||'Без клиента',whoSub:[cl.phone,cl.address].filter(Boolean).join(' · ')||'—',
    kv:[['Цена закупа',money(x.cost)],['Наценка',money(x.markup)],['Цена в рассрочку',money(k.total)],['Первый взнос',money(x.down)],['Ежемесячный платёж',money(k.monthly),PC.sky],['Первый платёж',dmy(x.first)],
      ['Оплачено клиентом',money(k.paid),PC.acc],['Остаток долга',money(k.left),k.left?PC.warn:PC.acc],...(k.overdue?[['Просрочено',money(k.overdue)+' · '+pdays(k.days),PC.warn]]:[]),...(x.guarantor?[['Поручитель',x.guarantor]]:[]),...(iv?[['Инвестор',fio(iv)+' · '+(+x.invPct||0)+'%']]:[])],
    bar:k.fin?k.paid/k.fin:1,barC:k.status==='overdue'?PC.warn:PC.acc,barL:`Оплачено ${Math.round(k.pct)}% · ${money(k.paid)} из ${money(k.fin)}`,
    table:{title:'ГРАФИК ПЛАТЕЖЕЙ',cols:[['№',0,''],['Дата',.08,''],['Платёж',.33,''],['Внесено',.55,''],['Статус',.76,'']],bold:2,
      rows:k.rows.map(r=>({cells:[r.n,dmy(r.date),money(r.amount),r.got?money(r.got):'—',r.st==='overdue'?'Просрочен '+pdays(days(r.date,t)):r.st!=='paid'&&r.got?'Частично':RST[r.st][0]],col:[0,0,0,r.got?PC.acc:PC.mut,r.st!=='paid'&&r.st!=='overdue'&&r.got?PC.gold:RST[r.st][1]],bg:r.st==='overdue'?'rgba(185,87,58,.07)':r.st==='paid'?'rgba(47,107,88,.05)':''}))},
    hist:{title:'ИСТОРИЯ ПОСТУПЛЕНИЙ',cols:[['Дата',0,''],['Сумма',.25,''],['Заметка',.5,'']],bold:1,rows:[...(x.down?[{cells:[dmy(x.date),money(x.down),'Первый взнос']}]:[]),...x.payments.slice().sort((a,b)=>a.date<b.date?-1:1).map(p=>({cells:[dmy(p.date),money(p.amount),p.note||'Платёж'],col:[0,PC.acc]}))]},
    notes:(x.shifts||[]).map(s=>`Перенос графика на ${s.months} мес. (с платежа №${(s.from|0)+1}) — ${dmy(s.date)}${s.note?' · '+s.note:''}. Сумма не изменилась.`).concat(x.note?['Заметка: '+x.note]:[])}}
function debtSpec(d){const k=dcalc(d),mine=d.type==='in';let run=0;
  const st=k.status==='done'?['Закрыт',PC.acc,'rgba(47,107,88,.12)']:k.status==='overdue'?['Просрочен '+pdays(k.days),PC.warn,'rgba(185,87,58,.12)']:(d.moves||[]).length?['Перенесён',PC.sky,'rgba(77,124,153,.12)']:['Текущий',PC.gold,'rgba(168,130,63,.14)'];
  return{company:me&&me.company||'',status:st,client:mine?'Должник':'Кому я должен',sign:mine?['Кредитор','Должник']:['Кредитор','Должник (я)'],kvTitle:'Сумма и срок',title:mine?'Долг · мне должны':'Долг · я должен',sub:`от ${dmy(d.date||(d.ops[0]||{}).date)}${d.due?' · вернуть до '+dmy(d.due):' · без срока'}`,
    who:fio(d)||'Без имени',whoSub:[d.phone,d.note].filter(Boolean).join(' · ')||'—',
    kv:[['Сумма долга',money(k.add)],['Возвращено',money(k.paid),PC.acc],['Остаток',money(k.left),k.left?PC.warn:PC.acc],['Срок возврата',d.due?dmy(d.due):'без срока',k.status==='overdue'?PC.warn:0]],
    bar:k.add?k.paid/k.add:1,barC:k.status==='overdue'?PC.warn:PC.acc,barL:`Возвращено ${Math.round(k.pct)}% · ${money(k.paid)} из ${money(k.add)}`,
    table:{title:'ОПЕРАЦИИ',cols:[['Дата',0,''],['Операция',.2,''],['Сумма',.42,''],['Остаток',.62,''],['Подтверждено',.8,'']],bold:2,
      rows:sortD(d.ops).slice().reverse().map(o=>{run=r2(run+(o.kind==='add'?o.amount:-o.amount));return{cells:[dmy(o.date),o.kind==='add'?'Долг':'Возврат',(o.kind==='add'?'+':'−')+money(o.amount),money(Math.max(0,run)),o.confirmed?'✓ '+dmy(String(o.confirmed).slice(0,10)):o.disputed?'Оспорено':'—'],col:[0,0,o.kind==='add'?PC.warn:PC.acc,0,o.confirmed?PC.acc:PC.mut]}}).reverse()},
    notes:(d.moves||[]).map(m=>`Срок перенесён: ${dmy(m.from)} → ${dmy(m.to)} (${dmy(m.date)})`)}}
const fsName=s=>String(s).replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,110);
const imgName=(kind,x)=>kind==='c'?fsName(`Рассрочка №${x.no} — ${fio(client(x.clientId))||'без клиента'} — ${x.item}`)+'.png':fsName(`Долг ${x.type==='in'?'мне':'я должен'} — ${fio(x)||'без имени'} — от ${dmy(x.date||(x.ops[0]||{}).date)}`)+'.png';
const hstr=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return(h>>>0).toString(36)};
function imgHash(kind,x){if(kind==='c'){const k=calc(x),cl=client(x.clientId),iv=x.investorId&&investor(x.investorId);return hstr(JSON.stringify([x,fio(cl),cl.phone,cl.address,iv&&fio(iv),k.status,k.days,me&&me.company,me&&me.name,JSON.stringify(blankCfg()),8]))}
  const k=dcalc(x);return hstr(JSON.stringify([x,k.status,k.days,me&&me.company,me&&me.name,JSON.stringify(blankCfg()),8]))}
async function xfDirs(){let root=dirH;if(root.name!=='X-Finance')root=await root.getDirectoryHandle('X-Finance',{create:true});
  return{root,bk:await root.getDirectoryHandle('Резервная копия',{create:true}),img:await root.getDirectoryHandle('Договоры в виде картинки',{create:true})}}
/* «Скрыть папку»: файл .nomedia — Android и большинство галерей не показывают картинки из такой папки (сами файлы на месте) */
async function hideApply(on){const D=await xfDirs(),dirs=[D.img,await D.img.getDirectoryHandle('Рассрочки',{create:true}),await D.img.getDirectoryHandle('Долги',{create:true})];
  for(const d of dirs){if(on){const fh=await d.getFileHandle('.nomedia',{create:true}),w=await fh.createWritable();await w.write('');await w.close()}else await d.removeEntry('.nomedia').catch(()=>{})}}
let imgBusy=false,imgAgain=false,imgTimer=null,IMGP=null;
function imgSoon(ms){const a=AB.get();if(!a.img||!canDir||!dirH||!me||me.role==='investor')return;clearTimeout(imgTimer);imgTimer=setTimeout(syncImages,ms??3000)}
async function syncImages(){
  const a=AB.get();if(!a.img||!dirH)return;if(imgBusy){imgAgain=true;return}imgBusy=true;
  try{
    if(!dirOk){dirOk=(await dirH.queryPermission({mode:'readwrite'}))==='granted';if(!dirOk)throw new Error('perm')}
    const D=await xfDirs(),sub={c:await D.img.getDirectoryHandle('Рассрочки',{create:true}),d:await D.img.getDirectoryHandle('Долги',{create:true})};
    const map=(await kvs('get','imgmap').catch(()=>null))||{},seen=new Set(),names={c:new Set(),d:new Set()},todo=[];
    for(const[kind,list]of[['c',db.contracts],['d',db.debts]])for(const x of list){seen.add(x.id);let n=imgName(kind,x);if(names[kind].has(n))n=n.replace(/\.png$/,` (${x.id.slice(-4)}).png`);names[kind].add(n);
      const h=imgHash(kind,x),m=map[x.id];if(!m||m.h!==h||m.n!==n)todo.push({kind,x,n,h,old:m&&m.n!==n?m.n:null});
      else if(a.guard){try{await sub[kind].getFileHandle(n)}catch(e){todo.push({kind,x,n,h,old:null,back:1})}}}   // «Защита от удаления»: файла нет — создаём заново
    const back=todo.filter(t=>t.back).length;let done=0;IMGP={n:0,all:todo.length};
    for(const t of todo){const blob=await docOf(t.kind,t.x);
      if(t.old)await sub[t.kind].removeEntry(t.old).catch(()=>{});
      const fh=await sub[t.kind].getFileHandle(t.n,{create:true}),w=await fh.createWritable();await w.write(blob);await w.close();
      map[t.x.id]={n:t.n,h:t.h,k:t.kind};done++;IMGP={n:done,all:todo.length};if(done%10===0){await kvs('put','imgmap',map).catch(()=>{});const e=$('#imgp');if(e)e.textContent=`Обновляю картинки: ${done} из ${todo.length}`}
      await new Promise(r=>setTimeout(r,0))}
    for(const id of Object.keys(map))if(!seen.has(id)){await sub[map[id].k||'c'].removeEntry(map[id].n).catch(()=>{});delete map[id]}   // договор или долг удалили — картинку тоже
    if(AB.get().hide)await hideApply(true).catch(()=>{});
    await kvs('put','imgmap',map);AB.set({imgLast:new Date().toISOString(),imgN:Object.keys(map).length,imgErr:'',...(back?{back:(AB.get().back||0)+back,backAt:new Date().toISOString()}:{})});
    if(back)toast(`Восстановлено картинок: ${back} — их удалили из папки`);
    if(done&&location.hash.startsWith('#/settings'))render();
  }catch(e){AB.set({imgErr:e.message==='perm'?'Нужно заново разрешить доступ к папке':'Не удалось сохранить картинки: '+e.message})}
  finally{imgBusy=false;IMGP=null;if(imgAgain){imgAgain=false;imgSoon(500)}}
}
/* телефон (нет выбора папки): все картинки одним ZIP в «Загрузки» */
async function imagesZip(){const files=AB.get().hide?['','Рассрочки/','Долги/'].map(x=>({name:`Договоры в виде картинки/${x}.nomedia`,data:''})):[],used=new Set();
  for(const[kind,list,dir]of[['c',db.contracts,'Рассрочки'],['d',db.debts,'Долги']])for(const x of list){let n=imgName(kind,x);if(used.has(dir+n))n=n.replace(/\.png$/,` (${x.id.slice(-4)}).png`);used.add(dir+n);
    files.push({name:`Договоры в виде картинки/${dir}/${n}`,data:new Uint8Array(await (await docOf(kind,x)).arrayBuffer())})}
  return new Blob([zip(files)],{type:'application/zip'})}
/* настройки автокопии храним на устройстве: папка у каждого устройства своя */
const AB={get(){try{return JSON.parse(lsGet('xf_auto')||'{}')}catch(e){return{}}},set(p){const v={...AB.get(),...p};try{localStorage.setItem('xf_auto',JSON.stringify(v))}catch(e){}return v}};
const canDir='showDirectoryPicker' in window;
function idb(op,val){return new Promise((res,rej)=>{let r;try{r=indexedDB.open('xfinance',1)}catch(e){return rej(e)}
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{const t=r.result.transaction('kv',op==='get'?'readonly':'readwrite'),s=t.objectStore('kv'),q=op==='get'?s.get('dir'):op==='del'?s.delete('dir'):s.put(val,'dir');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}})}
let dirH=null,dirOk=false;
async function dirInit(){if(!canDir)return;try{dirH=await idb('get');if(dirH)dirOk=(await dirH.queryPermission({mode:'readwrite'}))==='granted'}catch(e){dirH=null}}
async function writeDir(){const D=await xfDirs();
  for(const[b,n]of[[jsonBackup(),bName('json')],[excelBackup(),bName('xlsx')]]){const fh=await D.bk.getFileHandle(n,{create:true}),w=await fh.createWritable();await w.write(b);await w.close()}
}
let abTimer=null,abBusy=false;
function autoBackupSoon(){const a=AB.get();imgSoon();if(!a.on||!me||me.role==='investor')return;clearTimeout(abTimer);abTimer=setTimeout(()=>runAuto(false),2500)}
async function runAuto(force){
  const a=AB.get();if((!a.on&&!force)||abBusy)return;if(!db.contracts.length&&!db.debts.length&&!db.clients.length)return;
  const day=today(),doneToday=a.last&&a.last.slice(0,10)===day,useDir=canDir&&dirH;
  if(!force&&doneToday&&!(useDir&&a.freq==='change'))return;
  abBusy=true;
  try{
    if(useDir){if(!dirOk){dirOk=(await dirH.queryPermission({mode:'readwrite'}))==='granted';if(!dirOk)throw new Error('perm')}await writeDir()}
    else{download(jsonBackup(),bName('json'));await new Promise(r=>setTimeout(r,700));download(excelBackup(),bName('xlsx'))}
    AB.set({last:new Date().toISOString(),err:''});noteCopy(useDir?'папка «'+[dirH.name==='X-Finance'?'':dirH.name,'X-Finance','Резервная копия'].filter(Boolean).join(' / ')+'»':'«Загрузки»');
  }catch(e){AB.set({err:e.message==='perm'?'Нужно заново разрешить доступ к папке':'Не удалось сохранить копию'})}
  finally{abBusy=false;if(location.hash.startsWith('#/settings'))render()}
}
function backupBlock(){
  const a=AB.get(),last=a.last?new Date(a.last):null,lastTxt=last?`${dmy(iso(last))} в ${pad(last.getHours())}:${pad(last.getMinutes())}`:'ещё не было',fd=canDir&&dirH;
  const il=a.imgLast?new Date(a.imgLast):null,root=fd?(dirH.name==='X-Finance'?'':dirH.name||'Выбранная папка'):'Документы';
  return`<h2>Резервная копия</h2>
  <div class="card sgrp">
    ${sRow(I.shield||I.check,'ok','Автоматическая копия','Раз в сутки: полная копия в .json и Excel',sTog(a.on,'abToggle','','Автоматическая копия'))}
    ${canDir?sRow(I.box,'gold','Папка для копий',fd?esc(dirH.name||'Выбранная папка')+(dirOk?'':' · нужно разрешение'):'Выберите «Документы» — внутри появится папка X-Finance',sGo(),'data-a="abDir"'):''}
    ${sRow(I.img||I.file,'sky','Договоры в виде картинки',canDir?(fd?(a.img?`Каждая рассрочка и долг — картинка PNG, обновляется при каждом изменении${a.imgN?' · '+a.imgN+' шт.':''}`:'Сохранять каждую рассрочку и долг картинкой'):'Сначала выберите папку для копий'):'На телефоне — кнопка «Картинки» ниже (архив ZIP)',canDir?sTog(a.img,'abImg','','Договоры в виде картинки'):'')}
    ${sRow(I.eye||I.img,'ink',a.hide?'Папка с картинками скрыта':'Папка с картинками видна',a.hide?'Картинки договоров не показываются в галерее телефона — файлы на месте':'Скрыть, чтобы картинки договоров не мешали в галерее',`<button class="btn sm ${a.hide?'soft':''} hidebtn" data-a="abHide">${a.hide?I.eye+'Показать папку':I.eyeOff+'Скрыть папку'}</button>`)}
    ${canDir?sRow(I.lock||I.shield||I.check,'warn','Защита от удаления',a.guard?`Удалённая картинка создаётся заново сама${a.back?` · восстановлено: ${a.back}`:''}`:'Если картинку удалят в галерее или папке — вернуть её автоматически',sTog(a.guard,'abGuard','','Защита от удаления')):''}
    ${sRow(I.file,'gold','Бланк договора',esc(blankCfg().title)+(blankCfg().phone?' · '+esc(blankCfg().phone):''),sGo(),'data-a="blankEdit"')}
    ${a.on&&fd?`<div class="sw"><div>Как часто<small>${a.freq==='change'?'После каждого изменения, файл дня обновляется':'Один раз в сутки — полная копия'}</small></div>
      <div class="tg" style="height:38px"><button class="${a.freq==='change'?'on':''}" data-a="abFreq" data-v="change" style="width:auto;padding:0 10px;font-size:13px">Всегда</button><button class="${a.freq!=='change'?'on':''}" data-a="abFreq" data-v="day" style="width:auto;padding:0 10px;font-size:13px">Раз в сутки</button></div></div>`:''}
    ${canDir?`<div class="bktree"><div class="bt0">${I.box}<b>${esc(root)}</b></div><div class="bt1">${I.box}<b>X-Finance</b></div>
      <div class="bt2 ${a.on?'on':''}">${I.box}<b>Резервная копия</b><small>${a.on?`X-Finance_${today()}.json · .xlsx`:'выключено'}</small></div>
      <div class="bt2 ${a.img?'on':''}">${I.box}<b>Договоры в виде картинки</b><small>${a.img?`${a.hide?'скрыта от галереи · ':''}Рассрочки · Долги${il?' · обновлено '+pad(il.getHours())+':'+pad(il.getMinutes()):''}`:'выключено'}</small></div></div>`:''}
    <div class="pad note" style="padding-top:12px">${a.on?(fd?`Раз в сутки в папку «X-Finance / Резервная копия» сохраняется полная копия: <b>.json</b> для восстановления и <b>.xlsx</b> для Excel (договоры, платежи, долги, контакты, инвесторы).`
      :`Раз в день, при первом изменении, в «Загрузки» (в «Моих файлах») скачиваются два файла: <b>.json</b> для восстановления и <b>.xlsx</b> для Excel. Браузер может один раз спросить разрешение на скачивание нескольких файлов.`):'Включите — и копия будет сохраняться сама.'}
      ${LOCAL?'':' Фото документов хранятся на сервере и в копию не входят.'}<br>Последняя автокопия: ${lastTxt}.${a.err?`<br><span style="color:var(--warn)">${esc(a.err)}</span>`:''}
      ${a.img&&a.imgErr?`<br><span style="color:var(--warn)">${esc(a.imgErr)}</span>`:''}<span id="imgp" style="display:block;color:var(--accent)">${IMGP?`Обновляю картинки: ${IMGP.n} из ${IMGP.all}`:''}</span></div>
  </div>
  <div class="bkacts"><button class="card bka" data-a="bkJson"><span class="sic ok">${I.file}</span><b>Копия JSON</b><small>для восстановления</small></button>
    <button class="card bka" data-a="bkXlsx"><span class="sic sky">${I.list}</span><b>Excel</b><small>таблица .xlsx</small></button>
    <button class="card bka" data-a="bkImg"><span class="sic gold">${I.img||I.file}</span><b>Картинки</b><small>${fd&&a.img?'пересоздать все':'договоры · ZIP'}</small></button>
    <button class="card bka" data-a="restore"><span class="sic gold">${I.undo}</span><b>Восстановить</b><small>из копии .json</small></button></div>`;
}
Object.assign(A,{
  abToggle:async()=>{const on=!AB.get().on;AB.set({on,freq:AB.get().freq||'day'});render();if(on){toast('Автоматическая копия включена');await runAuto(true)}},
  abDir:async()=>{
    if(dirH&&!dirOk){try{dirOk=(await dirH.requestPermission({mode:'readwrite'}))==='granted'}catch(e){}if(dirOk){AB.set({err:''});render();toast('Доступ к папке разрешён');return runAuto(true)}}
    try{const h=await window.showDirectoryPicker({id:'xfinance',mode:'readwrite',startIn:'documents'});dirH=h;dirOk=true;await idb('put',h);AB.set({on:true,err:''});render();toast('Папка выбрана');await runAuto(true)}
    catch(e){if(e.name!=='AbortError')toast('Не удалось выбрать папку')}},
  abFreq:d=>{AB.set({freq:d.v});render()},
  abGuard:async()=>{const on=!AB.get().guard;AB.set({guard:on});render();
    toast(on?'Защита включена: удалённые картинки вернутся сами':'Защита выключена');if(on)imgSoon(200)},
  blankEdit:()=>{const b=S.blank||{};sheet('Бланк договора',`<label class="field"><span>Название вверху бланка</span><input name="title" maxlength="40" value="${esc(b.title||'')}" placeholder="${esc(me&&me.company||me&&me.name||'X-Finance')}"></label>
    <label class="field"><span>Телефон для связи (внизу бланка)</span><input name="phone" inputmode="tel" maxlength="30" value="${esc(b.phone||'')}" placeholder="${esc(me&&me.phone||'8 900 000-00-00')}"></label>
    <p class="note">Пусто — берётся из аккаунта (компания и телефон). Первое слово названия — зелёным, остальное — чёрным. После сохранения все картинки договоров и долгов перерисуются сами.</p>`,
    async v=>{await saveS({blank:{title:(v.title||'').trim(),phone:(v.phone||'').trim()}});render();imgSoon(400);toast('Бланк сохранён')})},
  abHide:async()=>{const on=!AB.get().hide;AB.set({hide:on});
    if(canDir&&dirH&&dirOk)try{await hideApply(on)}catch(e){toast('Не удалось изменить папку: '+e.message)}
    render();toast(on?'Папка скрыта от галереи':'Папка снова видна в галерее')},
  abImg:async()=>{if(!canDir)return toast('На телефоне — кнопка «Картинки» (архив ZIP)');const on=!AB.get().img;
    if(on&&(!dirH||!dirOk)){await A.abDir();if(!dirH||!dirOk)return}
    AB.set({img:on,imgErr:''});render();if(on){toast('Картинки договоров включены');await syncImages();render();toast('Картинки сохранены: '+(AB.get().imgN||0))}},
  bkImg:async(d,el)=>{const a=AB.get();el.classList.add('load');
    try{if(canDir&&dirH&&dirOk&&a.img){await kvs('put','imgmap',{}).catch(()=>{});await syncImages();render();toast('Картинки пересозданы: '+(AB.get().imgN||0))}
      else{toast('Готовлю картинки…');download(await imagesZip(),`X-Finance_dogovory_${today()}.zip`);toast('Архив с картинками сохранён')}}finally{el.classList.remove('load')}},
  bkJson:async()=>{download(jsonBackup(),bName('json'));noteCopy('«Загрузки», вручную');await saveS({lastBackup:today()}).catch(()=>{});toast('Копия JSON сохранена')},
  bkXlsx:()=>{download(excelBackup(),bName('xlsx'));noteCopy('«Загрузки», вручную');toast('Файл Excel сохранён')}
});

/* чёткость: после анимации появления снимаем её — элемент выходит из отдельного слоя, текст рисуется резко (окна не трогаем) */
const FIN_ANIM=new Set(['rise','pop','zoomin','slideL','slideR','catin','pbin','kin','sheen']);
document.addEventListener('animationend',e=>{const el=e.target;if(!el||!el.getAnimations||(el.closest&&el.closest('.ov,#pm,.pm,.npw,#pv,.toast')))return;
  for(const a of el.getAnimations())if(a.playState==='finished'&&FIN_ANIM.has(a.animationName))try{a.cancel()}catch(_){}},true);
/* живые карточки: наклон и блик за курсором */
let tiltE=null,tiltF=0;   // наклон карточки за мышкой — не чаще одного раза за кадр
document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;tiltE=e;if(!tiltF)tiltF=requestAnimationFrame(tiltRun)},{passive:true});
function tiltRun(){tiltF=0;const e=tiltE;if(!e)return;
  const k=e.target.closest&&e.target.closest('.kpi');if(!k)return;
  const r=k.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  k.style.setProperty('--rx',((.5-y)*7).toFixed(2)+'deg');k.style.setProperty('--ry',((x-.5)*9).toFixed(2)+'deg');
  k.style.setProperty('--mx',(x*100).toFixed(1)+'%');k.style.setProperty('--my',(y*100).toFixed(1)+'%');
}
document.addEventListener('pointerout',e=>{const k=e.target.closest&&e.target.closest('.kpi');if(k&&!k.contains(e.relatedTarget)){k.style.setProperty('--rx','0deg');k.style.setProperty('--ry','0deg');k.style.setProperty('--mx','30%');k.style.setProperty('--my','0%')}});
Object.assign(A,{
  itab:d=>{itab=d.t;if(d.t==='shared')shared=null;render()},
  linkAcc:async d=>{await api('POST',`/api/links/${d.id}/accept`);toast('Приглашение принято');shared=null;itab='shared';if(npOpen){npToggle(false);if(!location.hash.startsWith('#/inbox')){nav('#/inbox/shared');fetchNotes();return}}await fetchNotes();render()},
  linkDec:async d=>{await api('POST',`/api/links/${d.id}/decline`);toast('Приглашение отклонено');await fetchNotes()},
  linkLeave:d=>confirmBox('Отключить?','Вы перестанете видеть эти долги и получать уведомления о них.','Отключить',async()=>{await api('POST',`/api/links/${d.id}/leave`);shared=null;await fetchNotes();render()}),
  blackTog:(d,el)=>{const w=$('#blk'),on=!el.classList.contains('on');el.classList.toggle('on',on);w.classList.toggle('on',on);$('#form').black.value=on?1:'';if(on)setTimeout(()=>$('#form').blackNote.focus(),300)},
});
/* ---------- запуск ---------- */
addEventListener('xfinstall',()=>{if(/^#\/(settings)?$|^$/.test(location.hash)||!me)render()});
addEventListener('xfzoom',()=>{if(location.hash.startsWith('#/settings'))render()});
async function boot(){
  try{history.scrollRestoration='manual'}catch(e){}
  {const rm=/^\/r\/([A-Za-z0-9]{2,20})/.exec(PTH);if(rm){try{localStorage.setItem('xf_ref',rm[1].toUpperCase());if(!sessionStorage.getItem('xf_rv'+rm[1])){sessionStorage.setItem('xf_rv'+rm[1],'1');fetch(U('/api/ref/'+rm[1]+'?visit=1')).catch(()=>{})}}catch(e){}authMode='reg';history.replaceState(null,'',XB+'/#/')}}
  if(!location.hash&&location.protocol.startsWith('http')&&!/^\/p\//.test(PTH))history.replaceState(null,'','#/');HS=[location.hash||'#/'];
  const web=location.protocol.startsWith('http');
  if(web&&'serviceWorker' in navigator){const had=!!navigator.serviceWorker.controller;let rl=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!rl&&!$('#layer .ov')){rl=true;location.reload()}});
    const root=window.XF_BASE!=null?XB+'/':/^\/[pr]\//.test(PTH)?'/':location.pathname.replace(/[^/]*$/,'');navigator.serviceWorker.register(root+'sw.js',{scope:root}).then(r=>r.update()).catch(()=>{})}
  if(!web)LOCAL=true;
  else try{const r=await fetch(U('/api/me'),{credentials:'same-origin'});if(!r.ok)throw 0;info=await r.json();if(!('user' in info))throw 0;try{localStorage.setItem('xf_server','1')}catch(e){}}
    catch(e){let known=false;try{known=localStorage.getItem('xf_server')==='1'}catch(e2){}if(known){const sn=await snapLoad();if(sn&&sn.me)useSnap(sn);else offline=true}else LOCAL=true}
  const m=/^\/p\/([\w-]+)/.exec(PTH);
  if(m&&!LOCAL&&!offline&&!stale){
    pub=m[1];try{pubData=await api('GET','/api/public/'+pub)}catch(e){}
    setInterval(async()=>{if(document.hidden||!pubData||$('#layer .ov'))return;try{const n=await api('GET','/api/public/'+pub);if(JSON.stringify(n)!==JSON.stringify(pubData)){pubData=n;if(!location.hash.includes('policy'))render()}}catch(e){}},15000);
  }else if(LOCAL){loadLocal();me={role:'owner',login:'',name:'',company:'',local:true};
    if(!db.clients.length&&!db.contracts.length&&!db.debts.length){const x=await kvs('get','local').catch(()=>null);if(x&&x.db){db=normalize(x.db);S={...SDEF,...x.S};saveLocal()}}}
  else if(stale){}
  else if(!offline&&info.user){me=info.user;obLoad();try{await obFlush(true);await loadData()}catch(e){const sn=e.net&&await snapLoad();if(sn&&sn.me&&sn.me.id===info.user.id)useSnap(sn);else me=null}}
  if(info.tariff)tSave(info.tariff);
  try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
  if(PG.on&&!LOCAL)setTimeout(pingNow,1200);
  if(me&&me.role==='owner')await linkDebts().catch(()=>{});
  render();
  if(me&&me.role==='owner'){await dirInit();setTimeout(()=>runAuto(false),4000);imgSoon(7000)}
}
async function linkDebts(){
  if(!LOCAL)for(const c of db.clients.filter(x=>!x.token))await put('client',c);
  for(const d of db.debts.filter(x=>!x.contactId)){
    let c=db.clients.find(x=>fioRaw(x)===fioRaw(d)&&(x.phone||'')===(d.phone||''));
    if(!c){c={id:uid(),last:d.last||'',first:d.first||'',middle:d.middle||'',phone:d.phone||'',phone2:'',address:'',note:'',files:[]};await put('client',c)}
    d.contactId=c.id;await put('debt',d);
  }
}
boot();
