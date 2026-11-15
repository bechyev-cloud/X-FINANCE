/* X-Finance — оболочка «как настоящее приложение» (общая для приложения и админ-панели).
   Масштаб под экран, запрет масштабирования жестами и выделения текста, установка PWA. */
(function(){
  const de=document.documentElement,n=navigator,mm=q=>window.matchMedia&&matchMedia(q).matches;
  const X=window.XS={f:1,ip:null,
    ios:/iPad|iPhone|iPod/.test(n.userAgent)||(n.platform==='MacIntel'&&n.maxTouchPoints>1),
    android:/Android/i.test(n.userAgent),
    standalone:mm('(display-mode: standalone)')||mm('(display-mode: minimal-ui)')||n.standalone===true};
  try{X.f=+localStorage.getItem('xf_zoom')||1}catch(e){}
  de.classList.toggle('pwa',X.standalone);
  if((n.deviceMemory&&n.deviceMemory<=2)||(n.hardwareConcurrency&&n.hardwareConcurrency<=2))de.classList.add('lite');

  /* Автомасштаб: на широких экранах (ноутбук, монитор, планшет) интерфейс крупнее,
     но так, чтобы ширина вёрстки не становилась меньше её точек перехода (620 / 960 px). */
  X.fit=function(){
    const w=innerWidth,h=innerHeight;let z=1;
    if(w>=960)z=Math.min(1.4,Math.max(w/1240,h/1500),h/560);
    else if(w>=620&&h>=560)z=Math.min(1.12,w/700,h/600);
    z=Math.max(1,z)*X.f;
    z=Math.min(z,w/(w>=960?960:w>=620?620:340));
    z=Math.max(.8,Math.round(z*100)/100);
    if(de.style.getPropertyValue('--z')!==String(z)){de.style.zoom=z===1?'':z;de.style.setProperty('--z',z)}
  };
  X.setZoom=function(f){X.f=f;try{localStorage.setItem('xf_zoom',f)}catch(e){}X.fit()};
  X.fit();let ft=0;addEventListener('resize',()=>{cancelAnimationFrame(ft);ft=requestAnimationFrame(X.fit)},{passive:true});

  /* Без масштабирования жестами (iPhone игнорирует user-scalable=no) и без меню/выделения при удержании */
  const editable=t=>{t=t&&t.nodeType===3?t.parentElement:t;return!!(t&&t.closest&&t.closest('input,textarea,select,[contenteditable],.sel'))};
  ['gesturestart','gesturechange'].forEach(e=>document.addEventListener(e,ev=>ev.preventDefault()));
  document.addEventListener('contextmenu',e=>{if(!editable(e.target))e.preventDefault()});
  document.addEventListener('selectstart',e=>{if(!editable(e.target))e.preventDefault()});
  document.addEventListener('dragstart',e=>{if(e.target&&(e.target.tagName==='IMG'||e.target.tagName==='A'))e.preventDefault()});
  addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&['+','-','=','0'].includes(e.key)&&X.standalone){e.preventDefault();const s=[.9,1,1.1,1.2],i=s.indexOf(X.f);X.setZoom(e.key==='0'?1:s[Math.max(0,Math.min(3,(i<0?1:i)+(e.key==='-'?-1:1)))]);window.dispatchEvent(new Event('xfzoom'))}});

  /* Установка */
  addEventListener('beforeinstallprompt',e=>{e.preventDefault();X.ip=e;window.dispatchEvent(new Event('xfinstall'))});
  addEventListener('appinstalled',()=>{X.ip=null;X.standalone=true;window.dispatchEvent(new Event('xfinstall'))});
  X.install=async function(){if(!X.ip)return false;X.ip.prompt();const r=await X.ip.userChoice.catch(()=>({}));X.ip=null;window.dispatchEvent(new Event('xfinstall'));return r.outcome==='accepted'};
  /* Что сказать пользователю об установке: [вид, заголовок, текст] */
  X.state=function(){
    if(X.standalone)return['ok','Приложение установлено','Открывается в своём окне, как обычная программа.'];
    if(location.protocol==='file:')return['warn','Это проверочный файл','Файл X-Finance.html нужен только для просмотра дизайна. Установить приложение можно, открыв адрес вашего сервера (https://…).'];
    if(!window.isSecureContext)return['warn','Нужен адрес https://','Сейчас приложение открыто по адресу '+location.host+' без защиты. Chrome, Edge и Safari устанавливают приложения только с https:// (например, через Tuna) или с localhost. Откройте защищённый адрес — и кнопка установки появится.'];
    if(X.ip)return['go','Установить X-Finance','Приложение появится на рабочем столе, в меню «Пуск» или на главном экране и будет открываться в своём окне.'];
    if(X.ios)return['ios','Установка на iPhone и iPad','В Safari нажмите «Поделиться» (квадрат со стрелкой) → «На экран „Домой“» → «Добавить».'];
    if(X.android)return['info','Установка на Android','В Chrome откройте меню ⋮ → «Установить приложение» или «Добавить на главный экран».'];
    return['info','Установка на компьютер','В Chrome или Edge нажмите значок установки справа в адресной строке или меню ⋮ → «Сохранить и поделиться» → «Установить страницу как приложение».'];
  };
})();
