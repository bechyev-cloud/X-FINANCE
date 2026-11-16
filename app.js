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
const client=id=>db.clients.find(c=>c.id===id)||{last:'Без клиента',phone:''};
const investor=id=>db.investors.find(c=>c.id===id);
const waPhone=p=>{let d=String(p||'').replace(/\D/g,'');if(d.length===11&&d[0]==='8')d='7'+d.slice(1);if(d.length===10)d='7'+d;return d};
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const linkOf=x=>x.token&&!LOCAL?location.origin+'/p/'+x.token:'';
const sv=(p,w=1.8)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I={
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
eye:sv('<path d="M2.5 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="3"/>'),send:sv('<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>'),
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
  let r;try{r=await fetch(url,o)}catch(e){const x=new Error('Нет связи с сервером');x.net=true;throw x}
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
async function reconnect(){if(!stale)return;try{const r=await fetch('/api/me',{credentials:'same-origin'});if(!r.ok)return;const j=await r.json();if(!('user' in j))return;info=j;
  if(!j.user){stale=null;me=null;render();return}me=j.user;stale=null;offline=false;await obFlush(true);await loadData();render();toast('Связь восстановлена — данные синхронизированы')}catch(e){}}
setInterval(()=>{if(stale&&!document.hidden)reconnect()},15000);
let svTried=0;async function svFailover(){if(!svAuto()||!stale||Date.now()-svTried<60000)return;svTried=Date.now();
  const l=svList().filter(s=>s.url!==location.origin);for(const s of l){const p=await svPing1(s);if(p.ms!=null){toast('Основной сервер не отвечает — переключаюсь на «'+s.name+'»');setTimeout(()=>{location.href=s.url+'/#/'},1200);return}}}
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
  if(LOCAL||!(c.files||[]).length)return'';
  return`<h2>Документы</h2><div class="files">${c.files.map(f=>`<button class="tile" data-a="view" data-id="${f.id}" data-t="${f.type}">${f.type==='application/pdf'?I.file+'PDF':`<img src="/api/files/${f.id}" alt="${esc(f.name)}" loading="lazy">`}</button>`).join('')}</div>`;
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
let htab=lsGet('xf_htab')==='pay'?'pay':'dash',ptab=lsGet('xf_ptab')||'all',calM=today().slice(0,7),calD=today();
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
  const pc=payEvents().filter(e=>e.date<=t).length;
  let h=`<div class="top"><div><h1>${esc(me.company||'X-Finance')}</h1><div class="sub">${XSID?'Инвестор извне · '+esc(sd.owner.company||sd.owner.name):ai?'Инвестор · '+esc(fio(ai)):acct==='main'?'Основной счёт':title} · ${d.getDate()} ${MON[d.getMonth()]}</div></div></div>${accCats()}${instBanner()}
  <div class="htabs" role="tablist"><i class="hthumb${htab==='pay'?' r':''}"></i><button class="${htab==='dash'?'on':''}" data-a="htab" data-t="dash" role="tab">${I.grid}Дашборд</button><button class="${htab==='pay'?'on':''}" data-a="htab" data-t="pay" role="tab">${I.cal}Платежи${pc?`<em>${pc}</em>`:''}</button></div>`;
  if(XSID)h+=extHead(sd);
  if(htab==='pay')return h+`<div id="hbody" class="hbody">${paysView()}</div>`;
  h+=`<div id="hbody" class="hbody"><div class="home"><div>
  ${me.tariff&&me.tariff.status==='expired'?`<a class="card tbanner" href="#/tariff">${I.cal}<div><b>Тариф закончился</b><span>Продлите тариф, чтобы продолжить работу</span></div>${I.back}</a>`:''}
  <div class="kpis" style="margin-top:0">`;
  if(S.inst||XSID)h+=kpi(I.cash,'gold','Долг клиентов',recv,'k-recv',hx({href:'#/contracts',a:'tab',t:'active'}))+
    kpi(I.alert,'warn'+(over?' hot':''),'Просрочено',over,'k-over',hx({href:'#/contracts',a:'tab',t:'overdue'}))+
    kpi(I.card,'sky','В обороте',sumBy(act,x=>x.c.cost),'k-turn',{sub:'активные договоры'})+
    kpi(I.rub,'ok','Собрано',sumBy(ks,x=>x.k.paid),'k-coll',{sub:'без первых взносов'})+
    kpi(I.box,'ink','Закуп',sumBy(ks,x=>x.c.cost),'k-cost')+
    kpi(I.box,'sky solid','Продажи',sumBy(ks,x=>x.k.total),'k-sale')+
    kpi(I.cal,'gold','Ожидаемые платежи',exp,'k-exp',hx({a:'monthExp',sub:mon}))+
    kpi(I.check,'ok','Получено платежей',got,'k-got',hx({a:'monthGot',sub:mon}));
  if(ai)h+=kpi(I.chart,'gold','Прибыль инвестора',sumBy(ks,x=>x.k.invExp),'k-iexp',hx({href:'#/investor/'+ai.id,sub:'ожидается · доля '+nf.format(ai.pct)+'%'}))+
    kpi(I.check,'ok','Прибыль получена',sumBy(ks,x=>x.k.invGot),'k-igot',hx({href:'#/investor/'+ai.id,sub:'по оплаченным платежам'}));
  if(S.debt&&accD())h+=kpi(I.coin,'gold','Мне должны',din,'k-din',{href:'#/debts',a:'dtab',t:'in',sub:S.inst?'личные долги':''})+
    kpi(I.coin,'ink','Я должен',dout,'k-dout',{href:'#/debts',a:'dtab',t:'out'})+
    (S.inst?'':kpi(I.alert,'warn'+(dov?' hot':''),'Просрочено',dov,'k-dov')+kpi(I.check,'ok','Возвращено',dgot,'k-dgot',{sub:mon}));
  h+=`</div></div><div>`;
  if(!db.contracts.length&&!db.debts.length&&!XSID)h+=`<div class="card" style="margin-top:10px">${empty(I.doc,'Начнём?','Добавьте первый договор или долг: остатки, графики и просрочки приложение посчитает само.')}</div>`;
  else if(!ks.length&&!ds.length&&!XSID)h+=`<div class="card" style="margin-top:10px">${empty(I.chart,ai?'У инвестора пока нет договоров':'На основном счёте пока пусто',ai?'Выберите этого инвестора при оформлении договора — его данные появятся здесь.':'Договоры без инвестора и личные долги будут считаться здесь.')}</div>`;
  if(overdue.length||dover.length)h+=`<section class="hsec"><h2>Просрочки</h2><div class="list">${overdue.slice(0,5).map(x=>cCard(x.c,x.k)).join('')}${dover.slice(0,5).map(x=>dCard(x.d,x.k)).join('')}</div></section>`;
  if(XSID)h+=`<section class="hsec"><h2>Договоры инвестора</h2>${ks.length?`<div class="list">${ks.slice().sort((a,b)=>(a.k.status==='done')-(b.k.status==='done')||b.c.no-a.c.no).map(x=>cCard(x.c,x.k)).join('')}</div>`:`<div class="card">${empty(I.doc,'Договоров пока нет',sd.perms.create?'Нажмите «Оформить договор» — он сохранится у владельца.':'')}</div>`}</section>`;
  if((S.inst||XSID)&&ks.length)h+=`<section class="hsec"><h2>Ближайшие платежи <button class="hlink" data-a="htab" data-t="pay">Все платежи${I.back}</button></h2>`+(soon.length?`<div class="card rows">${soon.slice(0,8).map(x=>`<a class="rw" href="${cHref(x.c.id)}"><div class="g"><b>${esc(fio(client(x.c.clientId)))}</b><small>${fdate(x.k.next.date)} · ${esc(x.c.item)}</small></div><div class="am num">${money(x.k.next.rest)}</div></a>`).join('')}</div>`
    :`<div class="card pad muted small">В ближайшие две недели платежей нет.</div>`)+'</section>';
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
function clientInfo(c){
  const cs=db.contracts.filter(x=>x.clientId===c.id),ks=cs.map(calc),ds=db.debts.filter(x=>x.contactId===c.id&&x.type==='in').map(dcalc);
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
    const ks=S.inst?db.contracts.filter(x=>x.clientId===c.id).map(calc):[],ds=S.debt?db.debts.filter(x=>x.contactId===c.id&&x.type==='in').map(dcalc):[];
    const left=sumBy(ks,k=>k.left)+sumBy(ds,k=>k.left),over=sumBy(ks,k=>k.overdue)+sumBy(ds.filter(k=>k.status==='overdue'),k=>k.left);
    const tags=[ks.length?plural(ks.length,['договор','договора','договоров']):'',ds.length?plural(ds.length,['долг','долга','долгов']):'',(c.files||[]).length?`${c.files.length} фото`:''].filter(Boolean).join(' · ');
    return`<a class="card item with-ava${c.black?' black':''}${c.deleted?' gone':''}" href="#/client/${c.id}">${avaHtml(c)}<div><div class="h"><div class="t">${esc(fio(c))}</div><div class="a num">${left?money(left):''}</div></div>
    <div class="s">${esc(c.phone||'Телефон не указан')}${linked.has(c.id)?' · <span style="color:var(--accent)">в X-Finance</span>':''}</div>
    ${c.deleted?`<div class="f" style="margin-top:6px"><span class="chip">Удалён ${dmy(c.deleted)}</span><span></span></div>`:c.black||over||left||tags?`<div class="f" style="margin-top:6px">${c.black?`<span class="chip warn">${I.ban}Чёрный список</span>`:over?`<span class="chip warn">Просрочено ${money(over)}</span>`:left?'<span class="chip ok">Платит вовремя</span>':'<span></span>'}<span>${tags}</span></div>`:''}</div></a>`}).join('')}</div>`;
}
const clients=()=>`<div class="top"><div><h1>Контакты</h1><div class="sub">${plural(alive().length,['контакт','контакта','контактов'])}</div></div><button class="btn primary only-desk" data-a="newClient">${I.plus}Контакт</button></div>${clientCats()}
  <input class="search" id="q" placeholder="Поиск по имени, телефону, адресу" value="${esc(q)}"><div id="list">${clientsList()}</div>`;
function avaHtml(c,cls='ava',style=''){
  const f=!LOCAL&&c.mainPhoto&&(c.files||[]).find(x=>x.id===c.mainPhoto&&x.type!=='application/pdf');
  return f?`<div class="${cls} ph"${style}><img src="/api/files/${f.id}" alt="" loading="lazy" decoding="async"></div>`:`<div class="${cls}${c.black?' bad':''}"${style}>${esc(ini(c))}</div>`;
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
      <button class="gimg" data-a="view" data-id="${f.id}" data-t="${f.type}" aria-label="Открыть">${f.type==='application/pdf'?`<span class="pdf">${I.file}PDF</span>`:`<img src="/api/files/${f.id}" alt="${esc(f.name)}" loading="lazy" decoding="async">`}</button>
      ${f.type!=='application/pdf'?`<button class="gb star${c.mainPhoto===f.id?' on':''}" data-a="fStar" data-id="${c.id}" data-f="${f.id}" aria-label="Сделать главной">${I.star}</button>`:''}
      <button class="gb del" data-a="fDel" data-id="${c.id}" data-f="${f.id}" aria-label="Удалить">${I.trash}</button></div>`).join('')}
    ${fs.length<5?`<button class="gt add" data-a="fAdd" data-id="${c.id}" aria-label="Добавить фото">${I.plus}<small>Добавить</small></button>`:''}</div>
  <div class="note" style="margin:8px 2px 0">Паспорт, права, договор — любые фото, можно выбрать сразу несколько. ★ — главное фото на карточке контакта. Удаление — двойное нажатие на корзину.</div>`;
}
function clientPage(id){
  const c=db.clients.find(x=>x.id===id);if(!c)return notFound();
  const cs=S.inst?db.contracts.filter(x=>x.clientId===id).sort((a,b)=>b.no-a.no).map(x=>({c:x,k:calc(x)})):[],dl=S.debt?db.debts.filter(x=>x.contactId===id).map(d=>({d,k:dcalc(d)})):[];
  const left=sumBy(cs,x=>x.k.left)+sumBy(dl.filter(x=>x.d.type==='in'),x=>x.k.left),over=sumBy(cs,x=>x.k.overdue)+sumBy(dl.filter(x=>x.d.type==='in'&&x.k.status==='overdue'),x=>x.k.left);
  const iOwe=sumBy(dl.filter(x=>x.d.type==='out'),x=>x.k.left),link=linkOf(c);
  const row=(icon,l,v,act='')=>`<div class="crow"><span class="ci">${icon}</span><div class="cv"><small>${l}</small><b>${v}</b></div>${act}</div>`;
  const phAct=n=>`<a class="x" href="tel:${esc(n)}" aria-label="Позвонить">${I.phone}</a><button class="x" data-a="waNum" data-v="${esc(n)}" data-who="${esc(hello(c))}" aria-label="WhatsApp">${I.wa}</button>`;
  // слева — долги, справа — рассрочки; если чего-то нет, с обеих сторон то, что есть
  const hasD=S.debt&&dl.length>0,hasI=S.inst&&cs.length>0;
  const L=hasD?'d':hasI?'i':(S.debt?'d':S.inst?'i':''),R=hasI?'i':hasD?'d':(S.inst?'i':S.debt?'d':'');
  const lbl={d:'Долги',i:'Рассрочки'},cnt={d:dl.length,i:cs.length};
  const panel=(t,suf)=>t==='d'?debtPanel(c,dl,suf):instPanel(c,cs,suf);
  const center=`<div class="card chero">
    ${avaHtml(c,'cav')}
    <h1>${esc(fio(c))}</h1>
    <div class="sub">${c.phone?esc(c.phone):'Телефон не указан'}</div>
    ${linkU[c.id]?`<a class="btn sm primary xwrite" href="#/chat/${linkU[c.id]}">${I.send}Написать в X-Finance</a>`:''}
    ${c.black||linked.has(c.id)?`<div class="cchips">${c.black?`<span class="chip warn">${I.ban}Чёрный список</span>`:''}${linked.has(c.id)?`<span class="chip ok">${I.check}Подключён к X-Finance</span>`:''}</div>`:''}
    ${cs.length||dl.length?`<div class="cstats"><div><small>Должен мне</small><b>${N(left,'cl'+id)}</b></div><div class="${over?'hot':''}"><small>Просрочено</small><b class="num">${money(over)}</b></div>${iOwe?`<div><small>Я должен</small><b class="num">${money(iOwe)}</b></div>`:''}</div>`:''}
    ${L?`<div class="swhint"><span>${I.back}${lbl[L]}</span><span>${lbl[R]}${I.back}</span></div>`:''}
  </div>
  ${c.deleted?`<div class="card pad note" style="margin-top:12px">Контакт удалён ${dmy(c.deleted)}. Его можно восстановить или удалить навсегда кнопками внизу.</div>`:''}
  ${c.black?`<div class="card bnote"><span class="ci">${I.ban}</span><div><b>В чёрном списке</b><p>${esc(c.blackNote||'Причина не указана')}</p></div></div>`:''}
  ${linked.has(c.id)?`<div class="card pad note lnote">${I.check}<span>${esc(hello(c)||'Клиент')} зарегистрирован в X-Finance и принял ваше приглашение: он видит свои долги и рассрочки у вас и получает уведомления.</span></div>`:''}
  <h2>Данные</h2>
  <div class="card crows">
    ${row(I.users,'Фамилия, имя, отчество',esc(fio(c)))}
    ${row(I.phone,'Номер телефона',c.phone?`<span class="num">${esc(c.phone)}</span>`:'<span class="muted">не указан</span>',c.phone?phAct(c.phone):'')}
    ${c.phone2?row(I.phone,'Дополнительный номер',`<span class="num">${esc(c.phone2)}</span>`,phAct(c.phone2)):''}
    ${row(I.home,'Проживание',c.address?esc(c.address):'<span class="muted">не указано</span>')}
    ${c.note?row(I.file,'Заметка',esc(c.note)):''}
  </div>
  ${LOCAL?'':galleryHtml(c)}
  ${link?`<h2>Личная ссылка</h2>
  <div class="card clink"><div class="cl1"><span class="ci">${I.share}</span><div><b>Страница клиента</b><small>По ссылке ${esc(hello(c)||'клиент')} видит все свои долги и рассрочки, подтверждает операции и может включить уведомления.</small></div></div>
    <div class="link" style="padding:0"><code>${esc(link.replace(/^https?:\/\//,''))}</code></div>
    <div class="row-btns"><button class="btn sm primary" data-a="copy" data-v="${esc(link)}">${I.copy}Копировать</button>${c.phone?`<button class="btn sm soft" data-a="waLink" data-id="${c.id}">${I.wa}Отправить</button>`:''}${navigator.share?`<button class="btn sm" data-a="share" data-v="${esc(link)}">${I.share}</button>`:''}</div></div>`:''}
  ${c.deleted?`<div class="row-btns" style="margin-top:26px"><button class="btn primary" data-a="restoreClient" data-id="${c.id}">${I.check}Восстановить</button><button class="btn danger" data-a="purgeClient" data-id="${c.id}">${I.x}Удалить навсегда</button></div>`
    :''}`;
  const dup=L&&L===R;
  return`<div class="cbar"><a class="back" href="#/clients" style="margin:0">${I.back}Контакты</a><div class="rbtns">${c.deleted?`<button class="rbtn" data-a="restoreClient" data-id="${c.id}" aria-label="Восстановить" title="Восстановить">${I.undo}</button>`:`<button class="rbtn red" data-a="delClient" data-id="${c.id}" aria-label="Удалить контакт" title="Удалить">${I.trash}</button>`}<button class="rbtn" data-a="editClient" data-id="${c.id}" aria-label="Изменить контакт" title="Изменить">${I.edit}</button></div></div>
  ${L?`<div class="ptabs" id="ptabs"><button data-a="pgo" data-p="0">${lbl[L]}<em>${cnt[L]}</em></button><button class="on" data-a="pgo" data-p="1">Контакт</button><button data-a="pgo" data-p="2">${lbl[R]}<em>${cnt[R]}</em></button><i id="pind"></i></div>`:''}
  <div class="pager${L?'':' solo'}${dup?' dup':''}" id="pager">
    ${L?`<section class="pg side">${panel(L,'l')}</section>`:''}
    <section class="pg mid">${center}</section>
    ${L?`<section class="pg side right">${panel(R,'r')}</section>`:''}
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
  <div class="row-btns" style="margin-top:22px"><button class="btn" data-a="editDebt" data-id="${d.id}">Изменить</button><button class="btn danger" data-a="delDebt" data-id="${d.id}">Удалить</button></div>`;
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
const NOTES=['Совместный доступ к инвестору: приглашение пользователя X-Finance, права и отключение; на главной — инвестор извне с переливающейся рамкой','WhatsApp: ключи Green API, тексты сообщений с просмотром и редактированием, напоминания о дне оплаты и просрочке по расписанию','Настройки → Отображение: рассрочка и долги, а также «Категории всегда открыты» для Главной, Договоров и Контактов — без свайпа вниз','Главная: счета по свайпу вниз — Все, Основной счёт и каждый инвестор; карточки и платежи считаются по выбранному счёту','Настройки — красивые карточки разделов: Аккаунт, Тарифы, Серверы, Приложение, Разделы, Уведомления, Резервная копия, О приложении','Номер сборки вместо версии: V15, V16 … — растёт при каждом изменении','«О приложении»: сборка на устройстве, последняя сборка, сборка сервера и совет — что и как обновить','Серверы: основной, резервный и домашний с приоритетом, живым пингом и автопереключением'];
/* ---------- Настройки: главный экран — карточки разделов; каждый раздел открывается отдельной страницей ---------- */
const SSUB={server:'Серверы',app:'Приложение',view:'Отображение',sections:'Отображение',wa:'WhatsApp',notify:'Уведомления и WhatsApp',backup:'Резервная копия',about:'О приложении'};
const tile=(h,cls,ic,tone,t,s,extra='',i=0,id='')=>`<a class="card stile ${cls}" href="${h}" style="--i:${i}"${id?` id="${id}"`:''}><span class="stic ${tone}">${ic}</span><span class="sgo">${I.back}</span><span class="stx"><b>${t}</b><small>${s}</small></span>${extra}</a>`;
function hubSrv(){const l=svList(),act=l.find(s=>s.url===location.origin);
  const ms=LOCAL?null:PG.ms,dots=l.slice(0,6).map(s=>{const p=SVP[s.id];return`<i class="${!p?'wait':p.ms==null?'off':pq(p.ms)}" title="${esc(s.name)}"></i>`}).join('');
  return`<span class="stx"><b>Серверы</b><small>${LOCAL?'Работа без сервера':stale?'Нет связи с сервером':ms!=null?`Активный · ${ms} мс · ${pqName(ms).toLowerCase()}`:'Проверяю связь…'}</small></span>
    <span class="stm"><span class="sdots">${dots}</span><em>${l.length?plural(l.length,['сервер','сервера','серверов']):'не добавлены'}${act?'':''}</em></span>`}
function hubAbout(){const v=verInfo(),[tone,t]=v.st;
  return`<a class="card stile about" href="#/settings/about" style="--i:8" id="habout"><span class="stic brand"><img src="icon-192.png" alt=""></span><span class="sgo">${I.back}</span>
    <span class="stx"><b>О приложении</b><small>X-Finance · сборка ${BV(BUILD)}</small></span><span class="stm"><i class="schip ${tone==='ok'?'ok':tone==='gold'?'gold':''}">${t}</i></span></a>`}
function settingsHub(){
  loadVer();if(!LOCAL&&!TF&&!stale)loadTariff();if(!LOCAL&&PG.ms==null&&!PG.busy&&Date.now()-PG.at>3000)setTimeout(pingNow,50);setTimeout(svPingAll,80);
  const t=curTariff(),[tc,tl]=tStat(t),total=Math.max(1,Math.round((new Date(t.until)-new Date('2026-01-01'))/864e5)),pct=Math.min(100,t.daysLeft/total*100);
  const g=S.green||{},gOn=!!(g.id&&g.token),pushOn=lsGet('xf_push_me')==='1',ab=AB.get(),[ik,itl]=XS.state(),zl=(ZS.find(z=>Math.abs(XS.f-z[0])<.01)||[0,'Обычный'])[1];
  const name=LOCAL?'Без сервера':me.name||me.login;
  const acc=`<a class="card stile acc" href="#/account" style="--i:0">${LOCAL?`<span class="stic ink">${I.cloud}</span>`:`<span class="pava">${esc(ini({last:(me.name||me.login||'?').split(' ')[0],first:(me.name||'').split(' ')[1]||''}))}</span>`}<span class="sgo">${I.back}</span>
    <span class="stx"><small class="sov">Аккаунт</small><b>${esc(name)}</b><small>${LOCAL?'Данные хранятся на этом устройстве':esc(me.login)+(me.phone?' · '+esc(me.phone):'')+(me.company?' · '+esc(me.company):'')}</small></span>
    <span class="stm"><i class="schip ${LOCAL?'':stale?'warn':'ok'}">${LOCAL?'Локально':stale?'Нет связи':'Синхронизировано'}</i><em>Профиль · вход · синхронизация</em></span></a>`;
  return`<div class="top"><div><h1>Настройки</h1><div class="sub">${LOCAL?'Работа без сервера':esc(me.company||me.name||'')}</div></div></div>
  ${mem?'<div class="card pad small" style="color:var(--warn);margin-bottom:12px">Браузер не разрешает сохранять данные в этом режиме. Установите приложение на сервер, чтобы записи не пропадали.</div>':''}
  <div class="shub">${acc}
    ${tile('#/tariff','tar',I.star||I.check,'gold','Тарифы',`«${esc(t.name)}» · ${t.status==='expired'?'закончился':t.status==='free'?'бесплатно до '+fdate(t.until):'оплачен до '+fdate(t.until)}`,`<span class="stm"><span class="sbar"><b style="width:${pct}%"></b></span><em>${t.status==='expired'?'продлите':'ещё '+plural(t.daysLeft,['день','дня','дней'])}</em></span>`,1)}
    <a class="card stile srv" href="#/settings/server" style="--i:2"><span class="stic ok">${I.cloud}</span><span class="sgo">${I.back}</span><span id="hsrv" class="hsrv">${hubSrv()}</span></a>
    ${tile('#/settings/app','',I.share,'sky','Приложение',`${itl} · размер «${zl}»`,`<span class="stm"><em>Установка · размер интерфейса</em></span>`,3)}
    ${tile('#/settings/view','',I.grid,'gold','Отображение',[S.inst&&'Рассрочка',S.debt&&'Долги'].filter(Boolean).join(' · ')||'Выключены',`<span class="stm"><em>${(()=>{const ks=pinKeys(),n=ks.filter(k=>pinned(k[0])).length;return n?`Всегда открыты: ${n} из ${ks.length}`:'Категории — свайпом вниз'})()}</em></span>`,4)}
    ${tile('#/settings/wa','',I.wa,'wa','WhatsApp',LOCAL?'Отправка вручную':gOn?'Green API подключён':'Green API не подключён',`<span class="stm"><i class="schip ${gOn?'ok':''}">${gOn?'Подключено':'Не подключено'}</i><em>${(()=>{const n=WT.filter(x=>wtpl(x[0]).on).length;return n+' из '+WT.length+' сообщений'})()}</em></span>`,5)}
    ${tile('#/settings/notify','',I.bell,'ok','Уведомления',pushOn?'Push на этом устройстве включены':'Push на этом устройстве выключены','<span class="stm"><em>Подтверждения от должников</em></span>',6)}
    ${tile('#/settings/backup','',I.file,'sky','Резервная копия',ab.on?'Автокопия включена':'Автокопия выключена',`<span class="stm"><em>${ab.last?'Последняя: '+tfmt(ab.last):'Копий ещё не было'}</em></span>`,6)}
    ${hubAbout()}</div>`;
}
const wnew=()=>{const nb=VER.build&&VER.build>BUILD,n=VER.notes&&VER.notes.length?VER.notes:NOTES;return`<div class="wnh"><span class="bvv">${BV(nb?VER.build:BUILD)}</span><small>${nb?'новая сборка — нажмите «Обновить»':'установлена у вас'}</small></div><ul class="wnew">${n.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`};
const pinKeys=()=>[S.inst&&['home',I.home,'ok','Главная','Счета: все, основной, инвесторы'],S.inst&&['contracts',I.doc,'gold','Договоры','Активные, просроченные, завершённые'],['clients',I.users,'sky','Контакты','X-контакты, должники, чёрный список']].filter(Boolean);
function settings(sub){
  if(!sub||!SSUB[sub])return settingsHub();
  const g=S.green||{},gOn=!!(g.id&&g.token),pushOn=lsGet('xf_push_me')==='1';
  const head=(t,s)=>`<a class="back" href="#/settings">${I.back}Настройки</a><div class="top"><div><h1>${t}</h1><div class="sub">${s}</div></div></div>`;
  if(sub==='server')return head('Серверы','Активный, основной, резервный и домашний сервер')+serverBlock();
  if(sub==='app')return head('Приложение','Установка, обновление и размер интерфейса')+`<h2>Установка</h2>${instCard()}<h2>Размер интерфейса</h2>${zoomCard()}`;
  if(sub==='sections'||sub==='view')return head('Отображение','Разделы приложения и категории на экранах')+`<h2>Разделы</h2>
    <div class="card sgrp">${sRow(I.doc,'gold','Рассрочка','Договоры, графики платежей, инвесторы',sTog(S.inst,'mode','inst','Показывать рассрочку'))}
    ${sRow(I.coin,'warn','Долги','Кто должен мне и кому должен я',sTog(S.debt,'mode','debt','Показывать долги'))}
    ${S.inst?sRow(I.chart,'sky','Инвесторы',db.investors.length?plural(db.investors.length,['инвестор','инвестора','инвесторов']):'Доли прибыли и личные кабинеты',sGo(),'data-a="goInv"'):''}</div>
    <h2>Категории всегда открыты</h2>
    <div class="card sgrp">${pinKeys().map(([k,ic,tone,t,x])=>sRow(ic,tone,t,x,sTog(pinned(k),'pinTog',k,t+': всегда открыты'))).join('')}</div>
    <p class="note" style="margin:8px 4px 0">Включено — категории видны сразу, свайп вниз не нужен. Выключено — открываются свайпом вниз по экрану. На компьютере категории видны всегда.</p>`;
  if(sub==='wa')return head('WhatsApp','Green API: сообщения и напоминания клиентам')+waPage();
  if(sub==='notify')return head('Уведомления','Push-уведомления на этом устройстве')+`<div class="card sgrp">${LOCAL?'':sRow(I.bell,'ok','Уведомления на этом устройстве','Когда должник подтвердил долг или оплату',sTog(pushOn,'pushMe','','Уведомления'))}
    ${sRow(I.wa,'wa','WhatsApp через Green API',gOn?'Сообщения клиентам уходят автоматически':'Ключи, тексты сообщений и напоминания',`<span class="sgo"><i class="schip ${gOn?'ok':''}">${gOn?'Подключено':'Не подключено'}</i>${I.back}</span>`,'data-a="goWa"')}</div>`;
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
async function fetchNotes(){if(LOCAL||!me||me.role!=='owner')return;fetchX();try{const r=await api('GET','/api/notes');NI=r;bell();
    const top=r.notes&&r.notes[0]?r.notes[0].id:0,fresh=lastNote&&r.notes.filter(n=>n.id>lastNote);lastNote=Math.max(lastNote,top);
    if(fresh&&fresh.length){   // ответ другой стороны меняет суммы — подтянуть данные, чтобы остаток обновился у обоих
      if(fresh.some(n=>['share','shx','shok','shno'].includes(n.kind))){SHR.data={};loadShares()}
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
const NK={share:['chart','gold'],shok:['check','ok'],shno:['ban','ink'],shx:['chart','ink'],shop:['coin','sky'],prop:['card','gold'],propok:['check','ok'],propno:['ban','warn'],dispute:['alert','warn'],pay:['check','ok'],msg:['send','sky'],link:['users','gold'],linked:['check','ok'],confirm:['check','ok'],op:['coin','sky']};
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
    const risk=c.black||oSum>0&&maxDays>30?'bad':oSum>0?'warn':left>0?'mid':'ok';
    return{c,cs,ds,act,over,dIn,dOver,left,oSum,maxDays,risk};
  }).sort((a,b)=>({bad:0,warn:1,mid:2,ok:3}[a.risk]-{bad:0,warn:1,mid:2,ok:3}[b.risk]));
}
const RISK={bad:['warn','Высокий риск'],warn:['warn','Есть просрочка'],mid:['gold','Платит, есть долг'],ok:['ok','Нет долгов']};
function checkResults(){
  const r=checkFind(cq);
  if(!r)return`<div class="chkhint">${I.search}<b>Проверка клиента</b><span>Введите номер телефона или фамилию, имя, отчество. Приложение покажет все рассрочки, долги и просрочки этого человека в вашей базе — включая удалённые контакты.</span></div>`;
  if(!r.length)return`<div class="card">${empty(I.search,'Не найден','В вашей базе нет человека с такими данными. Значит, у вас с ним ещё не было рассрочек и долгов.')}</div>`;
  return`<div class="list">${r.map(x=>{const[t,l]=RISK[x.risk];return`<a class="card ckc ${x.risk}" href="#/client/${x.c.id}">
    <div class="chkh">${avaHtml(x.c)}<div class="g"><b>${esc(fio(x.c))}</b><small>${esc(x.c.phone||'телефон не указан')}${x.c.deleted?' · удалён '+dmy(x.c.deleted):''}</small></div><span class="chip ${t}">${l}</span></div>
    ${x.c.black?`<div class="bw" style="margin:12px 0 0">${I.ban}<div><b>В чёрном списке</b><span>${esc(x.c.blackNote||'Причина не указана')}</span></div></div>`:''}
    <div class="chkg"><div><small>Рассрочки</small><b>${x.cs.length}</b><span>${x.act.length} активн.${x.over.length?` · <i>${x.over.length} просроч.</i>`:''}</span></div>
      <div><small>Долги</small><b>${x.ds.length}</b><span>${x.dIn.length} открыт.${x.dOver.length?` · <i>${x.dOver.length} просроч.</i>`:''}</span></div>
      <div><small>Должен сейчас</small><b class="num">${money(x.left)}</b><span>${x.oSum?`<i>просрочено ${money(x.oSum)}</i>`:'без просрочек'}</span></div></div>
    ${x.maxDays?`<div class="chkn">Самая долгая просрочка: <b>${pdays(x.maxDays)}</b></div>`:''}</a>`}).join('')}</div>`;
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
  if(!open){if(old){old.classList.add('closing');setTimeout(()=>old.remove(),200)}bell();if(!silent)ovDone('np');return}
  ovOpen('np',()=>npToggle(false,true));
  if(old)old.remove();
  const w=document.createElement('div');w.id='npw';w.className='npw';w.dataset.a='npOut';
  w.innerHTML=`<div class="np" id="np"><div class="nph"></div><div class="seg npt"></div><div class="npl rows"></div></div>`;document.body.append(w);npRender();bell();fetchNotes();
}
/* ---------- установка и размер интерфейса ---------- */
const XS=window.XS||{state:()=>['info','',''],f:1,setZoom(){},install:async()=>false};
const APP_VER='2.6',BUILD=19;   // BUILD — номер сборки (V15): +1 при каждом выпуске, вместе с version.json, server/package.json и CACHE в sw.js
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
  for(let i=0;i<2;i++){const t0=performance.now();try{const r=await fetch('/api/ping?_='+Date.now(),{cache:'no-store',credentials:'same-origin'});if(!r.ok)throw 0;await r.json();const ms=Math.round(performance.now()-t0);best=best==null?ms:Math.min(best,ms)}catch(e){best=null;break}}
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
  return kv('Адрес',`<span class="sel">${esc(location.host)}</span>`)+
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
const sNorm=u=>{try{u=String(u||'').trim();if(!/^https?:\/\//i.test(u))u='https://'+u;const x=new URL(u);return x.origin}catch(e){return''}};
function svList(){let l=[];try{l=JSON.parse(localStorage.getItem('xf_srv')||'[]')}catch(e){}
  if(!Array.isArray(l))l=[];const cur=location.protocol.startsWith('http')&&!LOCAL?location.origin:'';
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
  const l=svList(),cur=!LOCAL&&location.protocol.startsWith('http')?location.origin:'';
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
async function loadTariff(){if(LOCAL)return;try{TF=await api('GET','/api/tariff');if(me)me.tariff=TF.tariff;tSave(TF.tariff)}catch(e){TF={error:e.message}}if(/^#\/(tariff|settings)/.test(location.hash)&&!$('#layer .ov'))render()}
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
function allOps(){
  const out=[];
  if(S.inst)for(const c of db.contracts){
    const cl=client(c.clientId),who=fio(cl),total=c.cost+c.markup;
    out.push({id:'c'+c.id,date:c.date,ts:c.ts||0,ord:0,grp:'inst',kind:'new',tone:'gold',icon:I.doc,title:'Оформлена рассрочка',who,sub:`№${c.no} · ${c.item}`+(c.down?` · взнос ${money(c.down)}`:''),amount:total,sign:'',href:'#/contract/'+c.id});
    (c.shifts||[]).forEach((z,i)=>out.push({id:z.id,date:z.date,ts:z.ts||0,ord:50+i,grp:'inst',kind:'shift',tone:'gold',icon:I.cal,title:'График перенесён',who,sub:`№${c.no} · ${c.item} · +${z.months} мес.`+(z.note?' · '+z.note:''),amount:0,sign:'',href:'#/contract/'+c.id}));
    c.payments.forEach((p,i)=>out.push({id:p.id,date:p.date,ts:p.ts||0,ord:1+i,grp:'inst',kind:'pay',tone:'ok',icon:I.check,title:'Платёж по рассрочке',who,sub:`№${c.no} · ${c.item}`+(p.note?' · '+p.note:''),amount:p.amount,sign:'+',href:'#/contract/'+c.id}));
  }
  if(S.debt)for(const d of db.debts){
    const who=fio(d),isIn=d.type==='in';
    d.ops.forEach((o,i)=>{
      const add=o.kind==='add',first=add&&i===0;
      out.push({id:o.id,date:o.date,ts:o.ts||0,ord:i,grp:'debt',kind:add?'new':'pay',tone:add?(isIn?'warn':'ink'):(isIn?'ok':'ink'),icon:add?I.plus:I.minus,
        title:add?(isIn?(first?'Оформлен долг':'Долг увеличен'):(first?'Я взял в долг':'Взял ещё в долг')):(isIn?'Возврат долга':'Я вернул долг'),
        who,sub:(isIn?'Должен мне':'Я должен')+(o.note?' · '+o.note:'')+(o.confirmed?' · подтверждено':''),amount:o.amount,sign:add?(isIn?'':'−'):(isIn?'+':'−'),href:'#/debt/'+d.id});
    });
  }
  return out.sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts-a.ts)||(b.ord-a.ord));
}
function opsList(){
  const s=q.trim().toLowerCase(),all=allOps().filter(o=>!s||(o.who+' '+o.title+' '+o.sub).toLowerCase().includes(s));
  const f={all:()=>1,pay:o=>o.kind==='pay',new:o=>o.kind==='new',debt:o=>o.grp==='debt'};
  const tabs=[['all','Все'],['pay','Платежи'],['new','Оформления'],...(S.debt&&S.inst?[['debt','Долги']]:[])].map(([k,l])=>`<button class="${otab===k?'on':''}" data-a="otab" data-t="${k}">${l}<em>${all.filter(f[k]).length}</em></button>`).join('');
  const list=all.filter(f[otab]);
  const inc=sumBy(list.filter(o=>o.sign==='+'),o=>o.amount),iss=sumBy(list.filter(o=>o.kind==='new'&&o.sign===''),o=>o.amount);
  let h=`<div class="seg">${tabs}</div>`;
  if(!list.length)return h+`<div class="card">${empty(I.list,s?'Ничего не найдено':'Операций пока нет','Здесь появятся все оформленные рассрочки, долги и платежи.')}</div>`;
  h+=`<div class="stats" style="grid-template-columns:1fr 1fr;margin:0 0 4px"><div class="card stat"><div class="l">Поступило</div><div class="v" style="color:var(--accent)">${N(inc,'o-in-'+otab+s)}</div></div>
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
  return`<div class="auth">${brand()}<div class="tstrip">${I.check}<span>Тариф «${esc(tp.name)}» — <b>бесплатно до ${fdate(tp.freeUntil)}</b></span></div><div class="seg"><button class="${reg?'':'on'}" data-a="authMode" data-m="login">Вход</button><button class="${reg?'on':''}" data-a="authMode" data-m="reg">Регистрация</button></div>
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
  const k=dcalc(d),mine=d.type==='in';
  return`<div class="card ${big?'hero':'pubc'}"><div class="l">${k.status==='done'?'Долг закрыт. Баракаллаху фикум!':mine?'Ваш долг':'Вам должны'}${d.note&&!big?' · '+esc(d.note):''}</div><div class="v">${N(k.left,key,1)}</div>
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>Возвращено ${money(k.paid)} из ${money(k.add)}</span><span${k.status==='overdue'?' style="color:var(--warn)"':''}>${d.due?'до '+fdate(d.due):''}</span></div>
  ${big?'</div><h2>История</h2><div class="card rows">':'<div class="rows inner">'}${sortD(d.ops).map(o=>`<div class="rw ${o.kind}"><div class="n">${o.kind==='add'?I.plus:I.minus}</div>
    <div class="g"><b>${o.kind==='add'?'Долг':'Оплата'} <span class="num">${money(o.amount)}</span></b><small>${fdate(o.date)}${o.note?' · '+esc(o.note):''}</small></div>
    ${o.confirmed?`<span class="chip ok">${I.check}Подтверждено</span>`:`<div class="oa">${o.disputed?'<span class="chip warn">Оспорено</span>':''}<button class="btn sm soft" data-a="confirmOp" data-id="${o.id}" data-d="${d.id}">${I.check}Принять</button>${lk&&!o.disputed?`<button class="btn sm ghost" data-a="dispute" data-lk="${lk}" data-id="${o.id}" data-d="${d.id}">Не согласен</button>`:''}</div>`}</div>`).join('')}</div>
  ${lk?propList(ps)+(k.left>0?`<div class="pact"><button class="btn primary block" data-a="propose" data-lk="${lk}" data-item="${d.id}" data-left="${k.left}" data-out="${mine?'':'1'}">${I.card}${mine?'Сообщить об оплате':'Мне вернули'}</button></div>`:''):''}${big?'':'</div>'}`;
}
function pubContractBlock(p,key,big,lk,ps){
  const c={cost:p.total,markup:0,down:p.down,months:p.months,first:p.first_pay,payments:p.payments,shifts:p.shifts},k=calc(c);
  const sched=k.rows.map(r=>`<div class="rw ${r.st}"><div class="n">${r.st==='paid'?I.check:r.n}</div><div class="g"><b>${dmy(r.date)}</b><small>${r.st==='paid'?'Оплачен':r.st==='overdue'?'Просрочен':r.got?'Внесено '+money(r.got):'Ожидается'}</small></div><div class="am num">${money(r.amount)}</div></div>`).join('');
  return`<div class="card ${big?'hero':'pubc'}"><div class="l">${k.status==='done'?'Рассрочка выплачена. Баракаллаху фикум!':big?'Остаток по рассрочке':esc(p.item)+' · №'+p.no}</div><div class="v">${N(k.left,key,1)}</div>
    ${k.overdue?`<div class="s" style="color:var(--warn)">Просрочено ${money(k.overdue)} · ${pdays(k.days)}</div>`:k.next?`<div class="s">Ближайший платёж ${money(k.next.rest)} до ${fdate(k.next.date)}</div>`:''}
    <div class="bar${k.status==='overdue'?' warn':''}"><b style="width:${k.pct}%"></b></div>
    <div class="s" style="display:flex;justify-content:space-between;margin-top:8px"><span>${big?esc(p.item)+' · договор №'+p.no:'Оплачено '+money(k.paid)}</span><span>${big?'оплачено '+money(k.paid):'из '+money(k.fin)}</span></div>
  ${big?`</div><h2>График платежей</h2><div class="card rows">${sched}</div>`:`<details class="sch"><summary>График платежей <span>${k.rows.filter(r=>r.st==='paid').length}/${k.rows.length}</span></summary><div class="rows inner">${sched}</div></details>${lk?propList(ps)+(k.left>0?`<div class="pact"><button class="btn primary block" data-a="propose" data-lk="${lk}" data-item="${p.id}" data-left="${k.left}" data-next="${k.next?k.next.rest:''}">${I.card}Сообщить об оплате</button></div>`:''):''}</div>`}`;
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
  return`<div class="auth" style="margin-top:2vh">${brand(p.company)}<p class="muted" style="margin:-8px 2px 16px">Ассаляму алейкум${p.first?', '+esc([p.first,p.middle].filter(Boolean).join(' ')):''}!</p>${body}
  <div class="row-btns" style="margin-top:14px">${pushOn?`<span class="chip ok" style="height:48px;flex:1;justify-content:center;border-radius:16px;font-size:14px">${I.bell}Уведомления включены</span>`:`<button class="btn primary" data-a="pushPub">${I.bell}Получать уведомления</button>`}
    ${p.ownerPhone?`<a class="btn soft" href="https://wa.me/${waPhone(p.ownerPhone)}" target="_blank" rel="noopener">${I.wa}Написать</a>`:''}</div>
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
function render(){renderCore();try{backLabels()}catch(e){}}
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
  runCounts();flashId=null;bell();
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
  w.innerHTML=`<div class="pmc" id="pmc">${plusMain()}</div>`;document.body.append(w);
  if(matchMedia('(min-width:960px)').matches){const b=$('#nav .pl'),c=$('#pmc');if(b&&c){const z=+(getComputedStyle(document.documentElement).getPropertyValue('--z')||1)||1,
    r=b.getBoundingClientRect(),vh=innerHeight/z,ch=c.offsetHeight;c.style.setProperty('--pmt',Math.max(14,Math.min(r.top/z-12,vh-ch-14))+'px')}}
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
function doneSheet(title,text,r,phone,waText,link){
  gen++;onSubmit=null;lastWa={phone,text:waText};ovOpen('sheet',()=>closeSheet(true,true));
  $('#layer').innerHTML=`<div class="ov" data-a="closeOv"><div class="sheet"><div class="done">
  <svg class="ok" viewBox="0 0 84 84"><circle cx="42" cy="42" r="38"/><path d="M26 43l11 11 21-23"/></svg><b>${title}</b><p>${esc(text)}</p>
  ${r.wa?`<span class="chip ok">${I.wa}Отправлено в WhatsApp</span>`:''}${r.push?`<span class="chip ok">${I.bell}Уведомление доставлено</span>`:''}
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
async function announce(kind,item,title,body,phone){
  const link=linkOf(item),waText=withSign(body+(link?'\nВаша страница: '+link:''));let r={push:0,wa:false};
  if(!LOCAL)try{r=await api('POST','/api/notify',{kind,id:item.id,body,wa:waText})}catch(e){}
  doneSheet(title,body,r,phone,waText,kind==='debt'&&item.ops.length===1?link:'');
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
  ['due','bell','gold','День оплаты','Сам, по расписанию','Ассаляму алейкум, {имя}!\nНапоминаем: {когда}, {дата}, платёж по «{товар}» — {сумма}.\nОстаток: {остаток}.'],
  ['over','alert','warn','Просрочка','Сам, если платёж не внесён','Ассаляму алейкум, {имя}!\nПо «{товар}» не оплачен платёж {сумма} от {дата} ({дней}). Пожалуйста, оплатите, когда сможете.\nОстаток: {остаток}.']];
const WTK=Object.fromEntries(WT.map(x=>[x[0],x]));
const WVARS=[['имя','Имя Отчество'],['товар','Товар'],['сумма','Сумма'],['остаток','Остаток'],['дата','Дата'],['платёж','Платёж в месяц'],['срок','Срок, мес.'],['номер','№ договора'],['когда','завтра / сегодня'],['дней','Дней просрочки'],['компания','Компания']];
const WEX=()=>({имя:'Ахмед Магомедович',товар:'iPhone 16 Pro',сумма:'15 000 ₽',остаток:'75 000 ₽',дата:'20 ноября',платёж:'15 000 ₽',срок:'6',номер:'12',когда:'завтра',дней:'3 дня',компания:(me&&me.company)||'XStore 95'});
const WTIMES=['08:00','08:30','09:00','09:30'];
const waS=()=>S.wa||{};
const wtpl=k=>{const t=(waS().tpl||{})[k]||{};return{on:t.on!=null?!!t.on:!['due','over'].includes(k),text:t.text||WTK[k][5]}};
const waFill=(t,v)=>String(t).replace(/\{([^{}\s]+)\}/g,(m,k)=>v[k]!=null?v[k]:m).replace(/,\s*!/g,'!');
const gOn=()=>{const g=S.green||{};return!!(g.id&&g.token)};
async function saveWa(p){const w={...waS(),...p};try{w.tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Moscow'}catch(e){}if(location.protocol.startsWith('http'))w.origin=location.origin;await saveS({wa:w})}
async function saveTpl(k,p){const tp={...(waS().tpl||{})},cur=wtpl(k);tp[k]={on:cur.on,text:cur.text,...p};await saveWa({tpl:tp})}
/* отправка клиенту по шаблону: шаблон выключен — только push на его страницу, без WhatsApp */
async function announceT(key,kind,item,title,vars,phone){
  const t=wtpl(key),body=waFill(t.text,{компания:me&&me.company||'',...vars});
  if(t.on)return announce(kind,item,title,body,phone);
  let r={push:0,wa:false};if(!LOCAL)try{r=await api('POST','/api/notify',{kind,id:item.id,body})}catch(e){}
  doneSheet(title,body,r,null,'');
}
const waBub=(text,who)=>`<div class="wachat"><div class="wahd"><span class="wava">${esc(ini({last:(who||'А М').split(' ')[0],first:(who||'А М').split(' ')[1]||''}))}</span><div><b>${esc(who||'Клиент')}</b><small>в сети</small></div>${I.wa}</div>
  <div class="wabody"><div class="waday">Сегодня</div><div class="wabub"><p>${esc(text).replace(/\n/g,'<br>')}</p><small>${esc(waS().time||'09:00')} ✓✓</small></div></div></div>`;
const waSample=t=>waFill(t,WEX())+'\nВаша страница: '+(location.host||'xfinance.ru')+'/p/…'+(S.sign?'\n\n'+S.sign:'');
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
    <span class="wexr"><button class="wex" data-a="wtView" data-k="${k}" title="Просмотр">${esc(waFill(w.text,WEX()).replace(/\n/g,' '))}</button><button class="x" data-a="wtView" data-k="${k}" aria-label="Как будет выглядеть" title="Просмотр">${I.eye}</button><button class="x" data-a="wtEdit" data-k="${k}" aria-label="Изменить текст" title="Изменить текст">${I.edit}</button></span></span>
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
let pend=[],delF=[],curFiles=[];
function filesHtml(){
  const cur=curFiles.filter(f=>!delF.includes(f.id)),n=cur.length+pend.length;
  return cur.map(f=>`<div class="tile">${f.type==='application/pdf'?I.file+'PDF':`<img src="/api/files/${f.id}" alt="">`}<button type="button" class="rm" data-a="rmFile" data-f="${f.id}" aria-label="Убрать">${I.x}</button></div>`).join('')+
    pend.map((f,i)=>`<div class="tile">${f.type==='application/pdf'?I.file+'PDF':`<img src="${f.url}" alt="">`}<button type="button" class="rm" data-a="rmFile" data-i="${i}" aria-label="Убрать">${I.x}</button></div>`).join('')+
    (n<5?`<button type="button" class="tile addf" data-a="addFile" aria-label="Добавить фото">${I.plus}</button>`:'')+((c=>{if(c)c.textContent=n+'/5'})($('#fcnt')),'');
}
async function shrink(file){
  if(!file.type.startsWith('image/'))return file;
  try{const bm=await createImageBitmap(file),k=Math.min(1,1600/Math.max(bm.width,bm.height)),cv=document.createElement('canvas');cv.width=Math.round(bm.width*k);cv.height=Math.round(bm.height*k);
    cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);return await new Promise(r=>cv.toBlob(b=>r(b||file),'image/jpeg',.82))}catch(e){return file}
}
function clientForm(c,after){
  const e=c||{last:'',first:'',middle:'',phone:'',phone2:'',address:'',note:'',files:[]};curFiles=(e.files||[]).slice();pend=[];delF=[];
  sheet(c?'Изменить контакт':'Новый контакт',fioFields(e)+
  fld('Номер телефона','phone',e.phone,'inputmode="tel" autocomplete="off" placeholder="8 928 000-00-00"')+
  fld('Дополнительный номер','phone2',e.phone2||'','inputmode="tel" autocomplete="off" placeholder="Необязательно"')+
  fld('Проживание','address',e.address||'','placeholder="Город, улица, дом"')+
  `<div class="blk${e.black?' on':''}" id="blk"><div class="sw"><div><b>Чёрный список</b><small>Отметка для ненадёжных клиентов</small></div>
    <button type="button" class="tog${e.black?' on':''}" data-a="blackTog" aria-label="Чёрный список"></button></div><input type="hidden" name="black" value="${e.black?1:''}">
    <div class="blw"><div><label class="field" style="margin:0"><span>Причина добавления в чёрный список</span><textarea name="blackNote" rows="3" placeholder="Например: не платит третий месяц, не выходит на связь">${esc(e.blackNote||'')}</textarea></label></div></div></div>`+
  (LOCAL?'<div class="note" style="margin:-2px 2px 14px">Фото документов можно добавлять, когда приложение работает через сервер.</div>'
  :`<div class="field"><span style="display:flex;justify-content:space-between"><span>Фото документов</span><span id="fcnt">${curFiles.length}/5</span></span><div class="files" id="pf">${filesHtml()}</div>
    <div class="note" style="margin:6px 2px 0">Можно выбрать сразу несколько фото. Паспорт, договор, расписка.</div></div>
  <label class="chk"><input type="checkbox" name="consent"${e.consent?' checked':''}><span>Человек дал согласие на обработку персональных данных и хранение копий документов</span></label>`),async f=>{
    const n=fioOf(f);if(!n.last)return'Укажите фамилию, имя и отчество.';
    const hasFiles=curFiles.filter(x=>!delF.includes(x.id)).length+pend.length>0;
    if(hasFiles&&!f.consent)return'Чтобы хранить документы, отметьте согласие.';
    if(f.black&&!(f.blackNote||'').trim())return'Укажите причину добавления в чёрный список.';
    const data={...n,phone:(f.phone||'').trim(),phone2:(f.phone2||'').trim(),address:(f.address||'').trim(),consent:f.consent?(e.consent||today()):'',black:!!f.black,blackNote:f.black?(f.blackNote||'').trim():''};
    if(c)Object.assign(c,data);else c={id:uid(),files:[],note:'',...data};
    const up=pend.slice(),rm=delF.slice();await put('client',c);
    if(!LOCAL&&(up.length||rm.length)){
      for(const id of rm){await api('DELETE','/api/files/'+id).catch(()=>{});c.files=c.files.filter(x=>x.id!==id)}
      let i=0;for(const p of up){i++;const b=$('#form [type=submit]');if(b)b.textContent=`Загрузка фото ${i} из ${up.length}…`;
        try{const r=await api('POST',`/api/files?item=${c.id}&name=${encodeURIComponent(p.name)}`,p.blob,p.type);c.files.push(r.file)}
        catch(x){if(!x.net)throw x;const q=obAdd('file','client',c.id,{name:p.name,type:p.type,title:'Фото · '+fio(c)});await kvs('put','ob:'+q.id,p.blob);obMark(q,'wait',x.message);netNote()}}
      if(c.mainPhoto&&!c.files.some(x=>x.id===c.mainPhoto))c.mainPhoto='';
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
    if(d)Object.assign(d,data);else{d={id:uid(),ops:[{id:uid(),kind:'add',amount:a,date:data.date,note:'',ts:Date.now()}],...data};dtab=d.type}
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
  pmPay:()=>{plusMenu(false);setTimeout(pickPay,120)},
  pmCheck:()=>{plusMenu(false);nav('#/check');setTimeout(()=>{const i=$('#cq');if(i)i.focus()},350)},
  pmContact:()=>{plusMenu(false);setTimeout(()=>clientForm(),120)},
  pmOps:()=>{plusMenu(false);nav('#/ops')},
  otab:d=>{otab=d.t;oLimit=60;$('#list').innerHTML=opsList();runCounts()},
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
    await api('DELETE','/api/files/'+d.f);c.files=(c.files||[]).filter(x=>x.id!==d.f);if(c.mainPhoto===d.f)c.mainPhoto='';await put('client',c);
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
  rmFile:async(d,el)=>{el.parentNode.classList.add('out');await new Promise(r=>setTimeout(r,250));if(d.f)delF.push(d.f);else{URL.revokeObjectURL(pend[d.i].url);pend.splice(+d.i,1)}const p=$('#pf');if(p)p.innerHTML=filesHtml()},
  view:d=>{if(d.t==='application/pdf')return window.open('/api/files/'+d.id,'_blank');const v=document.createElement('div');v.className='view';v.innerHTML=`<img src="/api/files/${d.id}" alt="">`;v.onclick=()=>{v.remove();ovDone('view')};ovOpen('view',()=>v.remove());document.body.append(v)},
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
  obAll:async()=>{const n=await obFlush();if(!n)toast(obPend()?'Нет связи с сервером — попробуйте позже':'Всё уже отправлено');if(npOpen)npRender()},
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
  htab:(d,el)=>{if(htab===d.t)return;htab=d.t;try{localStorage.setItem('xf_htab',htab)}catch(e){}const th=$('.hthumb');if(th)th.classList.toggle('r',htab==='pay');setTimeout(render,180)},
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
  waSend:()=>{wa(lastWa.phone,lastWa.text);closeSheet()},
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
  goWa:()=>nav('#/settings/wa'),
  pwEye:(d,el)=>{const i=el.parentNode.querySelector('input');i.type=i.type==='password'?'text':'password'},
  waKeys:async()=>{const f=Object.fromEntries(new FormData($('#waf'))),id=(f.id||'').trim(),token=(f.token||'').trim();if(!id||!token){const st=$('#gst');st.className='gstate warn';st.textContent='Укажите idInstance и apiTokenInstance';return}
    await saveS({green:{url:(f.url||'').trim(),id,token}});if(!S.wa)await saveWa({});WLOG=null;render();toast('Ключи Green API сохранены')},
  wtTog:async d=>{const v=!wtpl(d.k).on;await saveTpl(d.k,{on:v});render();toast(WTK[d.k][3]+': '+(v?'включено':'выключено'))},
  wtView:d=>{const t=wtpl(d.k);sheet(WTK[d.k][3],`<div class="note" style="margin:-4px 2px 12px">Так клиент увидит сообщение в WhatsApp (данные — для примера).</div>${waBub(waSample(t.text),WEX().имя)}
    <div class="row-btns" style="margin:14px 0 4px"><button type="button" class="btn soft" data-a="wtEdit" data-k="${d.k}">${I.edit}Изменить текст</button>${!LOCAL&&gOn()?`<button type="button" class="btn soft" data-a="waTest" data-k="${d.k}">${I.send}Отправить себе</button>`:''}</div>`,null,null)},
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
  waTest:async(d,el)=>{const t=$('#wtta')?$('#wtta').value:wtpl(d.k||'pay').text;try{const r=await api('POST','/api/wa/test',{text:waSample(t)});toast('Отправлено на +'+r.phone)}catch(e){toast(e.message)}},
  pinTog:async d=>{const v=!pinned(d.k);await saveS({pin:{...(S.pin||{}),[d.k]:v}});render();toast(v?'Категории будут открыты всегда':'Категории — свайпом вниз')},
  mode:async d=>{if(S[d.k]&&!S[d.k==='inst'?'debt':'inst'])return toast('Хотя бы один раздел должен быть включён');await saveS({[d.k]:!S[d.k]});render()},
  pushMe:async()=>{if(lsGet('xf_push_me')==='1'){localStorage.removeItem('xf_push_me');toast('Уведомления выключены')}else{await subscribePush(null);toast('Уведомления включены')}render()},
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
  goAcc:()=>nav('#/account'),goInv:()=>nav('#/investors'),
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
    const r=await api('POST',authMode==='reg'?'/api/register':'/api/login',{...f,consent:!!f.consent,terms:!!f.terms,adult:!!f.adult});me=r.user;obLoad();await loadData();HS=['#/'];if(location.hash!=='#/'){replacing=true;location.replace('#/')}render();dirInit()}
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
$('#fpick').addEventListener('change',async ev=>{
  const files=[...ev.target.files];ev.target.value='';
  for(const file of files){
    if(curFiles.filter(f=>!delF.includes(f.id)).length+pend.length>=5){toast('Не больше 5 файлов');break}
    if(!/^image\/|^application\/pdf$/.test(file.type)){toast('Можно добавить фото или PDF');continue}
    const blob=await shrink(file);if(blob.size>8e6){toast('Файл больше 8 МБ');continue}
    pend.push({blob,name:file.name,type:blob.type==='application/pdf'?blob.type:(blob===file?file.type:'image/jpeg'),url:URL.createObjectURL(blob)});
  }
  const p=$('#pf');if(p)p.innerHTML=filesHtml();
});
$('#fpick2').addEventListener('change',async ev=>{
  const files=[...ev.target.files];ev.target.value='';const c=db.clients.find(x=>x.id===upClient);if(!c||!files.length)return;
  c.files=c.files||[];const free=5-c.files.length;if(files.length>free)toast(`Можно добавить ещё ${free} фото — лишние пропущены`);
  const take=files.slice(0,free).filter(f=>/^image\/|^application\/pdf$/.test(f.type));const g=$('#gal');
  const tmp=take.map((f,i)=>{const t=document.createElement('div');t.className='gt up';t.innerHTML='<span class="spin"></span>';if(g){const a=g.querySelector('.add');g.insertBefore(t,a)}return t});
  if(g&&c.files.length+take.length>=5){const a=g.querySelector('.add');if(a)a.remove()}
  let ok=0;
  for(let i=0;i<take.length;i++){
    try{const blob=await shrink(take[i]);if(blob.size>8e6)throw new Error('Файл больше 8 МБ');
      const type=blob.type==='application/pdf'?blob.type:(blob===take[i]?take[i].type:'image/jpeg');
      const r=await api('POST',`/api/files?item=${c.id}&name=${encodeURIComponent(take[i].name)}`,blob,type);c.files.push(r.file);ok++;
      if(!c.mainPhoto&&r.file.type!=='application/pdf')c.mainPhoto=r.file.id;
      const u=URL.createObjectURL(blob);tmp[i].innerHTML=type==='application/pdf'?`<span class="pdf">${I.file}PDF</span>`:`<img src="${u}" alt="">`;tmp[i].classList.remove('up')}
    catch(e){tmp[i].remove();
      if(e.net){try{const blob=await shrink(take[i]),type=blob.type==='application/pdf'?blob.type:(blob===take[i]?take[i].type:'image/jpeg'),q=obAdd('file','client',c.id,{name:take[i].name,type,title:'Фото · '+fio(c)});await kvs('put','ob:'+q.id,blob);obMark(q,'wait',e.message);netNote()}catch(x){toast(x.message)}}
      else toast(e.message)}
  }
  if(ok){await put('client',c);toast(ok===1?'Фото добавлено':`Добавлено фото: ${ok}`)}
  if(location.hash==='#/client/'+c.id)render();
});
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
/* настройки автокопии храним на устройстве: папка у каждого устройства своя */
const AB={get(){try{return JSON.parse(lsGet('xf_auto')||'{}')}catch(e){return{}}},set(p){const v={...AB.get(),...p};try{localStorage.setItem('xf_auto',JSON.stringify(v))}catch(e){}return v}};
const canDir='showDirectoryPicker' in window;
function idb(op,val){return new Promise((res,rej)=>{let r;try{r=indexedDB.open('xfinance',1)}catch(e){return rej(e)}
  r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onerror=()=>rej(r.error);
  r.onsuccess=()=>{const t=r.result.transaction('kv',op==='get'?'readonly':'readwrite'),s=t.objectStore('kv'),q=op==='get'?s.get('dir'):op==='del'?s.delete('dir'):s.put(val,'dir');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}})}
let dirH=null,dirOk=false;
async function dirInit(){if(!canDir)return;try{dirH=await idb('get');if(dirH)dirOk=(await dirH.queryPermission({mode:'readwrite'}))==='granted'}catch(e){dirH=null}}
async function writeDir(){
  for(const[b,n]of[[jsonBackup(),bName('json')],[excelBackup(),bName('xlsx')]]){const fh=await dirH.getFileHandle(n,{create:true}),w=await fh.createWritable();await w.write(b);await w.close()}
}
let abTimer=null,abBusy=false;
function autoBackupSoon(){const a=AB.get();if(!a.on||!me||me.role==='investor')return;clearTimeout(abTimer);abTimer=setTimeout(()=>runAuto(false),2500)}
async function runAuto(force){
  const a=AB.get();if((!a.on&&!force)||abBusy)return;if(!db.contracts.length&&!db.debts.length&&!db.clients.length)return;
  const day=today(),doneToday=a.last&&a.last.slice(0,10)===day,useDir=canDir&&dirH;
  if(!force&&doneToday&&!(useDir&&a.freq==='change'))return;
  abBusy=true;
  try{
    if(useDir){if(!dirOk){dirOk=(await dirH.queryPermission({mode:'readwrite'}))==='granted';if(!dirOk)throw new Error('perm')}await writeDir()}
    else{download(jsonBackup(),bName('json'));await new Promise(r=>setTimeout(r,700));download(excelBackup(),bName('xlsx'))}
    AB.set({last:new Date().toISOString(),err:''});noteCopy(useDir?'папка «'+dirH.name+'»':'«Загрузки»');
  }catch(e){AB.set({err:e.message==='perm'?'Нужно заново разрешить доступ к папке':'Не удалось сохранить копию'})}
  finally{abBusy=false;if(location.hash.startsWith('#/settings'))render()}
}
function backupBlock(){
  const a=AB.get(),last=a.last?new Date(a.last):null,lastTxt=last?`${dmy(iso(last))} в ${pad(last.getHours())}:${pad(last.getMinutes())}`:'ещё не было';
  return`<h2>Резервная копия</h2>
  <div class="card sgrp">
    ${sRow(I.shield||I.check,'ok','Автоматическая копия','JSON и Excel в ваши файлы',sTog(a.on,'abToggle','','Автоматическая копия'))}
    ${canDir?sRow(I.box,'gold','Папка для копий',dirH?esc(dirH.name)+(dirOk?'':' · нужно разрешение'):'Не выбрана: копии будут в «Загрузках»',sGo(),'data-a="abDir"'):''}
    ${a.on&&canDir&&dirH?`<div class="sw"><div>Как часто<small>${a.freq==='change'?'После каждого изменения, файл дня обновляется':'Один раз в день'}</small></div>
      <div class="tg" style="height:38px"><button class="${a.freq==='change'?'on':''}" data-a="abFreq" data-v="change" style="width:auto;padding:0 10px;font-size:13px">Всегда</button><button class="${a.freq!=='change'?'on':''}" data-a="abFreq" data-v="day" style="width:auto;padding:0 10px;font-size:13px">Раз в день</button></div></div>`:''}
    <div class="pad note" style="padding-top:12px">${a.on?(canDir&&dirH?`Каждый раз сохраняются два файла в папку «${esc(dirH.name)}»: <b>.json</b> для восстановления и <b>.xlsx</b> для Excel.`
      :`Раз в день, при первом изменении, в «Загрузки» (в «Моих файлах») скачиваются два файла: <b>.json</b> для восстановления и <b>.xlsx</b> для Excel. Браузер может один раз спросить разрешение на скачивание нескольких файлов.`):'Включите, чтобы копии сохранялись сами.'}
      ${LOCAL?'':' Фото документов хранятся на сервере и в копию не входят.'}<br>Последняя автокопия: ${lastTxt}.${a.err?`<br><span style="color:var(--warn)">${esc(a.err)}</span>`:''}</div>
  </div>
  <div class="bkacts"><button class="card bka" data-a="bkJson"><span class="sic ok">${I.file}</span><b>Копия JSON</b><small>для восстановления</small></button>
    <button class="card bka" data-a="bkXlsx"><span class="sic sky">${I.list}</span><b>Excel</b><small>таблица .xlsx</small></button>
    <button class="card bka" data-a="restore"><span class="sic gold">${I.undo}</span><b>Восстановить</b><small>из копии .json</small></button></div>`;
}
Object.assign(A,{
  abToggle:async()=>{const on=!AB.get().on;AB.set({on,freq:AB.get().freq||'change'});render();if(on){toast('Автоматическая копия включена');await runAuto(true)}},
  abDir:async()=>{
    if(dirH&&!dirOk){try{dirOk=(await dirH.requestPermission({mode:'readwrite'}))==='granted'}catch(e){}if(dirOk){AB.set({err:''});render();toast('Доступ к папке разрешён');return runAuto(true)}}
    try{const h=await window.showDirectoryPicker({id:'xfinance',mode:'readwrite',startIn:'documents'});dirH=h;dirOk=true;await idb('put',h);AB.set({on:true,err:''});render();toast('Папка выбрана');await runAuto(true)}
    catch(e){if(e.name!=='AbortError')toast('Не удалось выбрать папку')}},
  abFreq:d=>{AB.set({freq:d.v});render()},
  bkJson:async()=>{download(jsonBackup(),bName('json'));noteCopy('«Загрузки», вручную');await saveS({lastBackup:today()}).catch(()=>{});toast('Копия JSON сохранена')},
  bkXlsx:()=>{download(excelBackup(),bName('xlsx'));noteCopy('«Загрузки», вручную');toast('Файл Excel сохранён')}
});

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
  if(!location.hash&&location.protocol.startsWith('http')&&!/^\/p\//.test(location.pathname))history.replaceState(null,'','#/');HS=[location.hash||'#/'];
  const web=location.protocol.startsWith('http');
  if(web&&'serviceWorker' in navigator){const had=!!navigator.serviceWorker.controller;let rl=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had&&!rl&&!$('#layer .ov')){rl=true;location.reload()}});
    const root=/^\/p\//.test(location.pathname)?'/':location.pathname.replace(/[^/]*$/,'');navigator.serviceWorker.register(root+'sw.js',{scope:root}).then(r=>r.update()).catch(()=>{})}
  if(!web)LOCAL=true;
  else try{const r=await fetch('/api/me',{credentials:'same-origin'});if(!r.ok)throw 0;info=await r.json();if(!('user' in info))throw 0;try{localStorage.setItem('xf_server','1')}catch(e){}}
    catch(e){let known=false;try{known=localStorage.getItem('xf_server')==='1'}catch(e2){}if(known){const sn=await snapLoad();if(sn&&sn.me)useSnap(sn);else offline=true}else LOCAL=true}
  const m=/^\/p\/([\w-]+)/.exec(location.pathname);
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
  if(me&&me.role==='owner'){await dirInit();setTimeout(()=>runAuto(false),4000)}
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
