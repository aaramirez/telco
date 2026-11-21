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
const PAGES=[["index", "index.html", "", "Inicio", 0], ["01-el-viaje-de-un-clic", "01-el-viaje-de-un-clic.html", "01", "El viaje de un clic", 0], ["02-senales-bits-y-medios", "02-senales-bits-y-medios.html", "02", "Señales, bits y medios", 0], ["03-capas", "03-capas.html", "03", "Capas", 0], ["04-ethernet-y-switching", "04-ethernet-y-switching.html", "04", "Ethernet y switching", 0], ["05-ip", "05-ip.html", "05", "IP", 0], ["06-routing", "06-routing.html", "06", "Routing", 0], ["07-transporte", "07-transporte.html", "07", "Transporte", 0], ["08-los-servicios-invisibles", "08-los-servicios-invisibles.html", "08", "Los servicios invisibles", 0], ["09-la-web-y-las-apis", "09-la-web-y-las-apis.html", "09", "La web y las APIs", 0], ["10-correo-archivos-y-acceso-remoto", "10-correo-archivos-y-acceso-remoto.html", "10", "Correo, archivos y acceso remoto", 0], ["11-donde-viven-las-aplicaciones", "11-donde-viven-las-aplicaciones.html", "11", "Dónde viven las aplicaciones", 0], ["12-ciberseguridad-basica", "12-ciberseguridad-basica.html", "12", "Ciberseguridad básica", 0], ["13-manos-a-la-obra", "13-manos-a-la-obra.html", "13", "Manos a la obra", 0], ["14-anatomia-de-una-red-de-operador", "14-anatomia-de-una-red-de-operador.html", "14", "Anatomía de una red de operador", 0], ["15-energia-y-respaldo", "15-energia-y-respaldo.html", "15", "Energía y respaldo", 0], ["16-tecnologias-de-acceso", "16-tecnologias-de-acceso.html", "16", "Tecnologías de acceso", 0], ["17-la-fibra-y-la-red-de-distribucion-optica", "17-la-fibra-y-la-red-de-distribucion-optica.html", "17", "La fibra y la red de distribución óptica", 0], ["18-la-pon-por-dentro", "18-la-pon-por-dentro.html", "18", "La PON por dentro", 0], ["19-de-la-casa-al-core", "19-de-la-casa-al-core.html", "19", "De la casa al core", 0], ["20-aaa-y-radius", "20-aaa-y-radius.html", "20", "AAA y RADIUS", 0], ["21-el-core-del-operador", "21-el-core-del-operador.html", "21", "El core del operador", 0], ["22-voz-sobre-ip", "22-voz-sobre-ip.html", "22", "Voz sobre IP", 0], ["23-television-por-ip", "23-television-por-ip.html", "23", "Televisión por IP", 0], ["24-la-red-movil", "24-la-red-movil.html", "24", "La red móvil", 0], ["25-el-wi-fi-de-la-casa", "25-el-wi-fi-de-la-casa.html", "25", "El Wi-Fi de la casa", 0], ["26-calidad-de-servicio", "26-calidad-de-servicio.html", "26", "Calidad de servicio", 0], ["27-gestion-de-red", "27-gestion-de-red.html", "27", "Gestión de red", 0], ["28-gestionar-el-equipo-en-casa-del-cliente", "28-gestionar-el-equipo-en-casa-del-cliente.html", "28", "Gestionar el equipo en casa del cliente", 0], ["29-las-plataformas-de-gestion-en-la-practica", "29-las-plataformas-de-gestion-en-la-practica.html", "29", "Las plataformas de gestión en la práctica", 0], ["30-automatizacion-de-red", "30-automatizacion-de-red.html", "30", "Automatización de red", 0], ["31-el-noc", "31-el-noc.html", "31", "El NOC", 0], ["32-seguridad-en-un-telco", "32-seguridad-en-un-telco.html", "32", "Seguridad en un telco", 0], ["33-oss-y-bss", "33-oss-y-bss.html", "33", "OSS y BSS", 0], ["34-bss", "34-bss.html", "34", "BSS", 0], ["35-atencion-al-cliente", "35-atencion-al-cliente.html", "35", "Atención al cliente", 0], ["36-oss", "36-oss.html", "36", "OSS", 0], ["37-la-planta-en-el-mapa", "37-la-planta-en-el-mapa.html", "37", "La planta en el mapa", 0], ["38-el-orquestador", "38-el-orquestador.html", "38", "El orquestador", 0], ["39-construir-la-red", "39-construir-la-red.html", "39", "Construir la red", 0], ["40-una-instalacion-sin-tocar-nada", "40-una-instalacion-sin-tocar-nada.html", "40", "Una instalación sin tocar nada", 0], ["41-autogestion-del-wi-fi-y-actualizaciones-de-firmware", "41-autogestion-del-wi-fi-y-actualizaciones-de-firmware.html", "41", "Autogestión del Wi-Fi y actualizaciones de firmware", 0], ["42-no-tengo-internet", "42-no-tengo-internet.html", "42", "«No tengo Internet»", 0], ["43-cambio-de-plan", "43-cambio-de-plan.html", "43", "Cambio de plan", 0], ["44-corte-y-reconexion", "44-corte-y-reconexion.html", "44", "Corte y reconexión", 0], ["45-cuando-se-corta-la-fibra", "45-cuando-se-corta-la-fibra.html", "45", "Cuando se corta la fibra", 0], ["46-como-gana-dinero-un-telco", "46-como-gana-dinero-un-telco.html", "46", "Cómo gana dinero un telco", 0], ["47-regulacion", "47-regulacion.html", "47", "Regulación", 0], ["48-la-cadena-de-valor-de-punta-a-punta", "48-la-cadena-de-valor-de-punta-a-punta.html", "48", "La cadena de valor de punta a punta", 0], ["49-hacia-donde-va", "49-hacia-donde-va.html", "49", "Hacia dónde va", 0]];
const store={get(k){try{return localStorage.getItem(k);}catch(e){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(e){}}};
const holder=document.querySelector('[data-page]');
const page=holder?holder.getAttribute('data-page'):'';
const mods=PAGES.filter(p=>p[2]&&!p[4]);
const isDone=id=>store.get('telco-'+id)==='1';
function sync(){
  let n=0;
  mods.forEach(([id])=>{const d=isDone(id);if(d)n++;document.querySelectorAll('[data-id="'+id+'"]').forEach(a=>a.classList.toggle('done',d));});
  const p=$('#prog'),b=$('#prog-bar');if(p)p.textContent=n+' de '+mods.length;if(b)b.style.width=(n/mods.length*100)+'%';
}
(function(){
  const nav=$('#toc');
  if(nav){
    nav.innerHTML='<span class="eyebrow">Ruta</span><ol>'+PAGES.map(([id,f,n,t,soon])=>soon?`<li><span class="soon" data-id="${id}" title="En preparación"><span class="n">${n}</span>${t}<span class="ck"></span></span></li>`:`<li><a href="${f}" data-id="${id}"${id===page?' aria-current="page" class="active"':''}><span class="n">${n||'·'}</span>${t}<span class="ck"${n?'':' style="visibility:hidden"'}></span></a></li>`).join('')+
      '</ol><div class="prog"><span>Tu avance: <b id="prog"></b></span><div class="bar"><i id="prog-bar"></i></div><span>Se guarda solo en este navegador.</span></div>';
    const cur=nav.querySelector('[aria-current]');if(cur&&window.innerWidth<=900){const ol=nav.querySelector('ol');ol.scrollLeft=Math.max(0,cur.offsetLeft-16);}
  }
  const pg=$('#pager');
  if(pg){
    const open=PAGES.filter(p=>!p[4]),i=open.findIndex(p=>p[0]===page),prev=open[i-1],next=open[i+1];
    const lab=p=>(p[2]?p[2]+' · ':'')+p[3];
    pg.innerHTML=(prev?`<a class="prev" href="${prev[1]}"><small>← Anterior</small>${lab(prev)}</a>`:'')+(next?`<a class="next" href="${next[1]}"><small>Siguiente →</small>${lab(next)}</a>`:'');
  }
  const cb=$('#got');
  if(cb){cb.checked=isDone(page);cb.addEventListener('change',()=>{store.set('telco-'+page,cb.checked?'1':'0');sync();});}
  sync();
})();

window.Lab={$,tok,fmt,short,num,canvasWidget,frame,curve,seg,ring,dot,arrow,label,hexRgb,lerp,bindOut,wide};
})();
