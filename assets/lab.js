(function(){
const $=s=>document.querySelector(s);
const root=document.documentElement;
const tok=n=>getComputedStyle(root).getPropertyValue(n).trim();
const fmt=(n,d=2)=>{const p=Math.pow(10,d);const r=Math.round(n*p)/p;return (Object.is(r,-0)?0:r).toFixed(d);};
const short=n=>{const r=Math.round(n*100)/100;return String(Object.is(r,-0)?0:r);};
const num=id=>parseFloat($(id).value);
const renders=[];

function canvasWidget(c,ratio,draw){
  const ctx=c.getContext('2d');
  const r=()=>{const w=c.clientWidth;if(!w)return;const rt=typeof ratio==='function'?ratio(w):ratio;const h=Math.round(w*rt);const d=window.devicePixelRatio||1;c.width=Math.round(w*d);c.height=Math.round(h*d);c.style.height=h+'px';ctx.setTransform(d,0,0,d,0,0);draw(ctx,w,h);};
  renders.push(r);new ResizeObserver(r).observe(c);r();return r;
}
const rerenderAll=()=>renders.forEach(r=>r());
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',rerenderAll);
new MutationObserver(rerenderAll).observe(root,{attributes:true,attributeFilter:['data-theme']});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(rerenderAll);

function niceStep(range){const raw=range/8;const m=Math.pow(10,Math.floor(Math.log10(raw)));const n=raw/m;return (n<1.5?1:n<3?2:n<7?5:10)*m;}
function frame(ctx,w,h,v){
  const p={l:34,r:10,t:10,b:22};const pw=w-p.l-p.r,ph=h-p.t-p.b;
  let x0=v.x0,x1=v.x1,y0=v.y0,y1=v.y1;
  if(v.equal){const s=(x1-x0)/pw;const half=ph*s/2;const cy=v.cy||0;y0=cy-half;y1=cy+half;}
  const X=x=>p.l+(x-x0)/(x1-x0)*pw,Y=y=>p.t+(y1-y)/(y1-y0)*ph;
  const IX=px=>x0+(px-p.l)/pw*(x1-x0),IY=py=>y1-(py-p.t)/ph*(y1-y0);
  ctx.clearRect(0,0,w,h);
  const sx=v.sx||niceStep(x1-x0),sy=v.sy||niceStep(y1-y0);
  ctx.lineWidth=1;ctx.strokeStyle=tok('--grid');
  for(let x=Math.ceil(x0/sx)*sx;x<=x1+1e-9;x+=sx){ctx.beginPath();ctx.moveTo(X(x),p.t);ctx.lineTo(X(x),p.t+ph);ctx.stroke();}
  for(let y=Math.ceil(y0/sy)*sy;y<=y1+1e-9;y+=sy){ctx.beginPath();ctx.moveTo(p.l,Y(y));ctx.lineTo(p.l+pw,Y(y));ctx.stroke();}
  ctx.strokeStyle=tok('--muted');ctx.lineWidth=1.2;
  if(y0<=0&&y1>=0){ctx.beginPath();ctx.moveTo(p.l,Y(0));ctx.lineTo(p.l+pw,Y(0));ctx.stroke();}
  if(x0<=0&&x1>=0){ctx.beginPath();ctx.moveTo(X(0),p.t);ctx.lineTo(X(0),p.t+ph);ctx.stroke();}
  ctx.font='11px '+tok('--f-mono');ctx.fillStyle=tok('--muted');
  ctx.textAlign='center';ctx.textBaseline='top';
  for(let x=Math.ceil(x0/sx)*sx;x<=x1+1e-9;x+=sx)ctx.fillText(short(x),X(x),p.t+ph+5);
  ctx.textAlign='right';ctx.textBaseline='middle';
  for(let y=Math.ceil(y0/sy)*sy;y<=y1+1e-9;y+=sy)ctx.fillText(short(y),p.l-5,Y(y));
  return {X,Y,IX,IY,x0,x1,y0,y1,p,pw,ph,clip(){ctx.save();ctx.beginPath();ctx.rect(p.l,p.t,pw,ph);ctx.clip();}};
}
function curve(ctx,F,f,color,lw,dash){
  F.clip();ctx.strokeStyle=color;ctx.lineWidth=lw||2.5;ctx.setLineDash(dash||[]);ctx.beginPath();
  const N=500,span=F.y1-F.y0;let pen=false;
  for(let i=0;i<=N;i++){const x=F.x0+(F.x1-F.x0)*i/N;const y=f(x);if(!isFinite(y)||y>F.y1+span*3||y<F.y0-span*3){pen=false;continue;}const px=F.X(x),py=F.Y(y);pen?ctx.lineTo(px,py):ctx.moveTo(px,py);pen=true;}
  ctx.stroke();ctx.restore();
}
function dot(ctx,x,y,color,r){ctx.beginPath();ctx.arc(x,y,r||5,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function arrow(ctx,x0,y0,x1,y1,color,lw){
  const a=Math.atan2(y1-y0,x1-x0),L=Math.hypot(x1-x0,y1-y0),hd=Math.min(12,L*.4);
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=lw||3;ctx.setLineDash([]);
  ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-hd*.7*Math.cos(a),y1-hd*.7*Math.sin(a));ctx.stroke();
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-hd*Math.cos(a-.4),y1-hd*Math.sin(a-.4));ctx.lineTo(x1-hd*Math.cos(a+.4),y1-hd*Math.sin(a+.4));ctx.closePath();ctx.fill();
}
function label(ctx,t,x,y,color,align){ctx.font='600 14px '+tok('--f-body');ctx.fillStyle=color;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillText(t,x,y);}
function hexRgb(h){h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255];}
function lerp(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}
function bindOut(id,f){const el=$(id),o=$(id+'-o');const u=()=>{o.textContent=f?f(parseFloat(el.value)):short(parseFloat(el.value));};el.addEventListener('input',u);u();}
const wide=w=>w<520?0.85:0.55;


function seg(ctx,F,f,xa,xb,color,lw,N){
  F.clip();ctx.strokeStyle=color;ctx.lineWidth=lw||2.5;ctx.setLineDash([]);ctx.beginPath();
  N=N||600;const span=F.y1-F.y0;let pen=false;
  for(let i=0;i<=N;i++){const x=xa+(xb-xa)*i/N,y=f(x);if(!isFinite(y)||y>F.y1+span*3||y<F.y0-span*3){pen=false;continue;}const px=F.X(x),py=F.Y(y);pen?ctx.lineTo(px,py):ctx.moveTo(px,py);pen=true;}
  ctx.stroke();ctx.restore();
}
function ring(ctx,x,y,color,fill){ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle=color;ctx.stroke();}

/* ---------- Navegación entre páginas y avance ---------- */
// Datos del curso: los escribe el motor al generar el sitio
const CURSO={"prefijo": "telco-"};
const PAGES=[["index", "index.html", "", "Inicio", 0, 0], ["01-el-viaje-de-un-clic", "01-el-viaje-de-un-clic.html", "01", "El viaje de un clic", 0, 1], ["02-senales-bits-y-medios", "02-senales-bits-y-medios.html", "02", "Señales, bits y medios", 0, 1], ["03-capas", "03-capas.html", "03", "Capas", 0, 1], ["04-ethernet-y-switching", "04-ethernet-y-switching.html", "04", "Ethernet y switching", 0, 1], ["05-ip", "05-ip.html", "05", "IP", 0, 1], ["06-routing", "06-routing.html", "06", "Routing", 0, 1], ["07-transporte", "07-transporte.html", "07", "Transporte", 0, 1], ["08-los-servicios-invisibles", "08-los-servicios-invisibles.html", "08", "Los servicios invisibles", 0, 1], ["09-la-web-y-las-apis", "09-la-web-y-las-apis.html", "09", "La web y las APIs", 0, 1], ["10-correo-archivos-y-acceso-remoto", "10-correo-archivos-y-acceso-remoto.html", "10", "Correo, archivos y acceso remoto", 0, 1], ["11-donde-viven-las-aplicaciones", "11-donde-viven-las-aplicaciones.html", "11", "Dónde viven las aplicaciones", 0, 1], ["12-ciberseguridad-basica", "12-ciberseguridad-basica.html", "12", "Ciberseguridad básica", 0, 1], ["13-manos-a-la-obra", "13-manos-a-la-obra.html", "13", "Manos a la obra", 0, 1], ["14-anatomia-de-una-red-de-operador", "14-anatomia-de-una-red-de-operador.html", "14", "Anatomía de una red de operador", 0, 2], ["15-energia-y-respaldo", "15-energia-y-respaldo.html", "15", "Energía y respaldo", 0, 2], ["16-tecnologias-de-acceso", "16-tecnologias-de-acceso.html", "16", "Tecnologías de acceso", 0, 2], ["17-la-fibra-y-la-red-de-distribucion-optica", "17-la-fibra-y-la-red-de-distribucion-optica.html", "17", "La fibra y la red de distribución óptica", 0, 2], ["18-la-pon-por-dentro", "18-la-pon-por-dentro.html", "18", "La PON por dentro", 0, 2], ["19-de-la-casa-al-core", "19-de-la-casa-al-core.html", "19", "De la casa al core", 0, 2], ["20-aaa-y-radius", "20-aaa-y-radius.html", "20", "AAA y RADIUS", 0, 2], ["21-el-core-del-operador", "21-el-core-del-operador.html", "21", "El core del operador", 0, 2], ["22-voz-sobre-ip", "22-voz-sobre-ip.html", "22", "Voz sobre IP", 0, 2], ["23-television-por-ip", "23-television-por-ip.html", "23", "Televisión por IP", 0, 2], ["24-la-red-movil", "24-la-red-movil.html", "24", "La red móvil", 0, 2], ["25-el-wi-fi-de-la-casa", "25-el-wi-fi-de-la-casa.html", "25", "El Wi-Fi de la casa", 0, 2], ["26-calidad-de-servicio", "26-calidad-de-servicio.html", "26", "Calidad de servicio", 0, 2], ["27-gestion-de-red", "27-gestion-de-red.html", "27", "Gestión de red", 0, 3], ["28-gestionar-el-equipo-en-casa-del-cliente", "28-gestionar-el-equipo-en-casa-del-cliente.html", "28", "Gestionar el equipo en casa del cliente", 0, 3], ["29-las-plataformas-de-gestion-en-la-practica", "29-las-plataformas-de-gestion-en-la-practica.html", "29", "Las plataformas de gestión en la práctica", 0, 3], ["30-automatizacion-de-red", "30-automatizacion-de-red.html", "30", "Automatización de red", 0, 3], ["31-el-noc", "31-el-noc.html", "31", "El NOC", 0, 3], ["32-seguridad-en-un-telco", "32-seguridad-en-un-telco.html", "32", "Seguridad en un telco", 0, 3], ["33-oss-y-bss", "33-oss-y-bss.html", "33", "OSS y BSS", 0, 4], ["34-bss", "34-bss.html", "34", "BSS", 0, 4], ["35-atencion-al-cliente", "35-atencion-al-cliente.html", "35", "Atención al cliente", 0, 4], ["36-oss", "36-oss.html", "36", "OSS", 0, 4], ["37-la-planta-en-el-mapa", "37-la-planta-en-el-mapa.html", "37", "La planta en el mapa", 0, 4], ["38-el-orquestador", "38-el-orquestador.html", "38", "El orquestador", 0, 4], ["39-construir-la-red", "39-construir-la-red.html", "39", "Construir la red", 0, 5], ["40-una-instalacion-sin-tocar-nada", "40-una-instalacion-sin-tocar-nada.html", "40", "Una instalación sin tocar nada", 0, 5], ["41-autogestion-del-wi-fi-y-actualizaciones-de-firmware", "41-autogestion-del-wi-fi-y-actualizaciones-de-firmware.html", "41", "Autogestión del Wi-Fi y actualizaciones de firmware", 0, 5], ["42-no-tengo-internet", "42-no-tengo-internet.html", "42", "«No tengo Internet»", 0, 5], ["43-cambio-de-plan", "43-cambio-de-plan.html", "43", "Cambio de plan", 0, 5], ["44-corte-y-reconexion", "44-corte-y-reconexion.html", "44", "Corte y reconexión", 0, 5], ["45-cuando-se-corta-la-fibra", "45-cuando-se-corta-la-fibra.html", "45", "Cuando se corta la fibra", 0, 5], ["46-como-gana-dinero-un-telco", "46-como-gana-dinero-un-telco.html", "46", "Cómo gana dinero un telco", 0, 6], ["47-regulacion", "47-regulacion.html", "47", "Regulación", 0, 6], ["48-la-cadena-de-valor-de-punta-a-punta", "48-la-cadena-de-valor-de-punta-a-punta.html", "48", "La cadena de valor de punta a punta", 0, 6], ["49-hacia-donde-va", "49-hacia-donde-va.html", "49", "Hacia dónde va", 0, 6], ["apendice-a-glosario", "apendice-a-glosario.html", "A", "Glosario", 0, "ap"], ["apendice-b-fichas-de-protocolos", "apendice-b-fichas-de-protocolos.html", "B", "Fichas de protocolos", 0, "ap"], ["apendice-c-respuestas", "apendice-c-respuestas.html", "C", "Respuestas de «Pruébate»", 0, "ap"], ["apendice-d-para-seguir-aprendiendo", "apendice-d-para-seguir-aprendiendo.html", "D", "Para seguir aprendiendo", 0, "ap"], ["apendice-e-mapa-de-herramientas", "apendice-e-mapa-de-herramientas.html", "E", "Mapa de herramientas", 0, "ap"], ["apendice-f-ruta-de-estudio", "apendice-f-ruta-de-estudio.html", "F", "Ruta de estudio sugerida", 0, "ap"], ["apendice-g-direccionamiento-ip", "apendice-g-direccionamiento-ip.html", "G", "Direccionamiento IP paso a paso", 0, "ap"]];
const ETAPAS=[[1, "Parte 1 · Las bases: cómo se hablan las máquinas"], [2, "Parte 2 · La red de un telco"], [3, "Parte 3 · Gestionar la red"], [4, "Parte 4 · Los sistemas del negocio"], [5, "Parte 5 · Todo junto: procesos de punta a punta"], [6, "Parte 6 · La cadena de valor"], ["ap", "Apéndices"]];
const PREF=CURSO.prefijo;
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const holder=document.querySelector('[data-page]');
const page=holder?holder.getAttribute('data-page'):'';
const mods=PAGES.filter(p=>/^\d/.test(p[2])&&!p[4]);
const isDone=id=>store.get(PREF+id)==='1';
function sync(){
  let n=0;
  mods.forEach(([id])=>{const d=isDone(id);if(d)n++;document.querySelectorAll('[data-id="'+id+'"]').forEach(a=>a.classList.toggle('done',d));});
  const p=$('#prog'),b=$('#prog-bar');if(p)p.textContent=n+' de '+mods.length;if(b)b.style.width=(n/mods.length*100)+'%';
  document.querySelectorAll('[data-etapa-cuenta]').forEach(s=>{const k=s.getAttribute('data-etapa-cuenta'),ms=mods.filter(m=>String(m[5])===k);s.textContent=ms.filter(m=>isDone(m[0])).length+'/'+ms.length;});
}
(function(){
  const nav=$('#toc');
  if(nav){
    const item=([id,f,n,t,soon])=>soon?`<li><span class="soon" data-id="${id}" title="En preparación"><span class="n">${n}</span>${t}<span class="ck"></span></span></li>`:`<li><a href="${f}" data-id="${id}"${id===page?' aria-current="page" class="active"':''}><span class="n">${n||'·'}</span>${t}<span class="ck"${n?'':' style="visibility:hidden"'}></span></a></li>`;
    const actual=PAGES.find(p=>p[0]===page),aqui=actual&&actual[2]?actual[2]+' · '+actual[3]:'Inicio';
    const grupos=ETAPAS.map(([k,rot])=>{const ps=PAGES.filter(p=>p[5]===k),hay=ps.some(p=>/^\d/.test(p[2]));
      return `<details class="etapa"${actual&&actual[5]===k?' open':''}><summary><span>${rot}</span>${hay?`<span class="cuenta" data-etapa-cuenta="${k}"></span>`:''}</summary><ol>${ps.map(item).join('')}</ol></details>`;}).join('');
    const escritorio=matchMedia('(min-width:901px)');
    const plegada=store.get(PREF+'ruta')==='0';
    nav.innerHTML=`<details class="ruta"${escritorio.matches&&!plegada?' open':''}><summary><span class="eyebrow">Ruta</span><span class="aqui">${aqui}</span></summary>`+
      `<ol class="ini">${PAGES.filter(p=>p[5]===0).map(item).join('')}</ol>${grupos}`+
      '<div class="prog"><span>Tu avance: <b id="prog"></b></span><div class="bar"><i id="prog-bar"></i></div><span>Se guarda solo en este navegador.</span></div></details>';
    const ruta=nav.querySelector('.ruta');
    const capa=nav.closest('.layout');
    const marcar=()=>{if(capa)capa.classList.toggle('toc-cerrada',escritorio.matches&&!ruta.open);};
    escritorio.addEventListener('change',e=>{ruta.open=e.matches&&store.get(PREF+'ruta')!=='0';marcar();});
    ruta.addEventListener('toggle',()=>{if(escritorio.matches)store.set(PREF+'ruta',ruta.open?'1':'0');marcar();});
    marcar();
  }
  const pg=$('#pager');
  if(pg){
    const open=PAGES.filter(p=>!p[4]),i=open.findIndex(p=>p[0]===page),prev=open[i-1],next=open[i+1];
    const lab=p=>(p[2]?p[2]+' · ':'')+p[3];
    pg.innerHTML=(prev?`<a class="prev" href="${prev[1]}"><small>← Anterior</small>${lab(prev)}</a>`:'')+(next?`<a class="next" href="${next[1]}"><small>Siguiente →</small>${lab(next)}</a>`:'');
  }
  const cb=$('#got');
  if(cb){cb.checked=isDone(page);cb.addEventListener('change',()=>{store.set(PREF+page,cb.checked?'1':'0');sync();});}
  // Portada: un enlace a #parte-N abre su etapa plegada
  const etapaDe=h=>{const t=h&&h.length>1&&document.getElementById(decodeURIComponent(h.slice(1)));return t&&t.matches('details.stage')?t:null;};
  const abrirAncla=()=>{const t=etapaDe(location.hash);if(t){t.open=true;t.scrollIntoView();}};
  document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]'),t=a&&etapaDe(a.getAttribute('href'));if(t)t.open=true;});
  window.addEventListener('hashchange',abrirAncla);abrirAncla();
  // Comandos: una pestaña por sistema operativo (se recuerda) y «Copiar» en cada línea
  const soDetectado=(()=>{const p=((navigator.userAgentData&&navigator.userAgentData.platform)||navigator.platform||navigator.userAgent||'').toLowerCase();return /win/.test(p)?'win':/mac|iphone|ipad/.test(p)?'mac':/linux|android|cros|x11/.test(p)?'linux':'win';})();
  let so=store.get(PREF+'so')||soDetectado;
  const cajas=[...document.querySelectorAll('.cmds')];
  const elegir=caja=>{const tabs=[...caja.querySelectorAll('[role="tab"]')];if(!tabs.length)return;const t=tabs.find(b=>b.dataset.so.split(' ').includes(so))||tabs[0];
    tabs.forEach(b=>{const on=b===t;b.setAttribute('aria-selected',on?'true':'false');b.tabIndex=on?0:-1;document.getElementById(b.getAttribute('aria-controls')).hidden=!on;});};
  cajas.forEach((caja,k)=>{const tabs=[...caja.querySelectorAll('[role="tab"]')],panels=[...caja.querySelectorAll('[role="tabpanel"]')];
    tabs.forEach((b,i)=>{b.id='so-'+k+'-'+i;panels[i].id='so-'+k+'-'+i+'-p';b.setAttribute('aria-controls',panels[i].id);panels[i].setAttribute('aria-labelledby',b.id);
      b.addEventListener('click',()=>{const lista=b.dataset.so.split(' ');if(!lista.includes(so))so=lista[0];store.set(PREF+'so',so);cajas.forEach(elegir);});
      b.addEventListener('keydown',ev=>{const d=ev.key==='ArrowRight'?1:ev.key==='ArrowLeft'?-1:0;if(!d)return;ev.preventDefault();const n=tabs[(i+d+tabs.length)%tabs.length];n.click();n.focus();});});
    elegir(caja);});
  const aviso=document.createElement('span');aviso.setAttribute('aria-live','polite');aviso.style.cssText='position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';document.body.appendChild(aviso);
  document.querySelectorAll('.copiar').forEach(b=>{const c=b.parentElement.querySelector('code');if(c)b.setAttribute('aria-label','Copiar: '+c.textContent.slice(0,80));});
  /* Scripts largos: se ven 20 líneas con scroll; «Ver las N líneas» abre el bloque completo y lo vuelve a cerrar */
  document.addEventListener('click',ev=>{const b=ev.target.closest('.ver-todo');if(!b)return;const caja=b.closest('.code-lineas');
    if(!b.dataset.rotulo)b.dataset.rotulo=b.textContent;const abierto=caja.classList.toggle('abierto');
    b.setAttribute('aria-expanded',abierto?'true':'false');b.textContent=abierto?'Ver menos':b.dataset.rotulo;
    if(!abierto)caja.scrollIntoView({block:'nearest'});});
  const copiaVieja=t=>new Promise((ok,mal)=>{const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;opacity:0';document.body.appendChild(a);a.select();let r=false;try{r=document.execCommand('copy');}catch(e){}a.remove();r?ok():mal();});
  const copiarTexto=t=>(navigator.clipboard&&window.isSecureContext)?navigator.clipboard.writeText(t).catch(()=>copiaVieja(t)):copiaVieja(t);
  document.addEventListener('click',ev=>{const b=ev.target.closest('.copiar');if(!b)return;const c=b.parentElement.querySelector('code');if(!c)return;
    copiarTexto(c.textContent).then(()=>{b.textContent='Copiado';b.classList.add('ok');aviso.textContent='Copiado';setTimeout(()=>{b.textContent='Copiar';b.classList.remove('ok');aviso.textContent='';},1500);},
      ()=>{b.textContent='Selecciónalo y copia';const r=document.createRange();r.selectNodeContents(c);const s=getSelection();s.removeAllRanges();s.addRange(r);});});
  sync();
})();

/* Fórmulas: KaTeX dibuja cada .math (en línea) y .math-display (en bloque). Sin KaTeX queda el TeX legible.
   Un laboratorio que escribe fórmulas nuevas llama a Lab.renderMath(su_contenedor). */
function renderMath(raiz){
  if(!window.katex)return;
  (raiz||document).querySelectorAll('.math,.math-display').forEach(el=>{
    if(el.dataset.tex!==undefined)return;
    const tex=el.textContent;el.dataset.tex=tex;
    const display=el.classList.contains('math-display');
    // El número de una ecuación (	ag{3.1}) va en su propia columna: en el celular no tapa la fórmula
    const m=display&&tex.match(/\\tag\{([^{}]*)\}\s*$/);
    let destino=el;
    if(m){el.textContent='';el.classList.add('con-numero');
      destino=document.createElement('span');destino.className='formula';
      const n=document.createElement('span');n.className='eq-num';n.textContent='('+m[1]+')';
      el.append(destino,n);}
    try{katex.render(m?tex.slice(0,m.index):tex,destino,{displayMode:display,throwOnError:false,output:'htmlAndMathml'});}
    catch(err){destino.textContent=tex;}
  });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>renderMath());else renderMath();

window.Lab={$,tok,fmt,short,num,canvasWidget,frame,curve,seg,ring,dot,arrow,label,hexRgb,lerp,bindOut,wide,renderMath};
})();
