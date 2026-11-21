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
const PAGES=[["index", "index.html", "", "Inicio", 0], ["01-el-viaje-de-un-clic", "01-el-viaje-de-un-clic.html", "01", "El viaje de un clic", 1], ["02-senales-bits-y-medios", "02-senales-bits-y-medios.html", "02", "Señales, bits y medios", 1], ["03-capas", "03-capas.html", "03", "Capas", 1], ["04-ethernet-y-switching", "04-ethernet-y-switching.html", "04", "Ethernet y switching", 1], ["05-ip", "05-ip.html", "05", "IP", 1], ["06-routing", "06-routing.html", "06", "Routing", 1], ["07-transporte", "07-transporte.html", "07", "Transporte", 1], ["08-los-servicios-invisibles", "08-los-servicios-invisibles.html", "08", "Los servicios invisibles", 1], ["09-la-web-y-las-apis", "09-la-web-y-las-apis.html", "09", "La web y las APIs", 1], ["10-correo-archivos-y-acceso-remoto", "10-correo-archivos-y-acceso-remoto.html", "10", "Correo, archivos y acceso remoto", 1], ["11-ciberseguridad-basica", "11-ciberseguridad-basica.html", "11", "Ciberseguridad básica", 1], ["12-anatomia-de-una-red-de-operador", "12-anatomia-de-una-red-de-operador.html", "12", "Anatomía de una red de operador", 1], ["13-tecnologias-de-acceso", "13-tecnologias-de-acceso.html", "13", "Tecnologías de acceso", 1], ["14-la-fibra-y-la-pon", "14-la-fibra-y-la-pon.html", "14", "La fibra y la PON", 1], ["15-de-la-casa-al-core", "15-de-la-casa-al-core.html", "15", "De la casa al core", 1], ["16-aaa-y-radius", "16-aaa-y-radius.html", "16", "AAA y RADIUS", 1], ["17-el-core-del-operador", "17-el-core-del-operador.html", "17", "El core del operador", 1], ["18-voz-sobre-ip", "18-voz-sobre-ip.html", "18", "Voz sobre IP", 1], ["19-television-por-ip", "19-television-por-ip.html", "19", "Televisión por IP", 1], ["20-la-red-movil", "20-la-red-movil.html", "20", "La red móvil", 1], ["21-calidad-de-servicio", "21-calidad-de-servicio.html", "21", "Calidad de servicio", 1], ["22-gestion-de-red", "22-gestion-de-red.html", "22", "Gestión de red", 1], ["23-gestionar-el-equipo-en-casa-del-cliente", "23-gestionar-el-equipo-en-casa-del-cliente.html", "23", "Gestionar el equipo en casa del cliente", 1], ["24-el-noc", "24-el-noc.html", "24", "El NOC", 1], ["25-seguridad-en-un-telco", "25-seguridad-en-un-telco.html", "25", "Seguridad en un telco", 1], ["26-oss-y-bss", "26-oss-y-bss.html", "26", "OSS y BSS", 1], ["27-bss", "27-bss.html", "27", "BSS", 1], ["28-oss", "28-oss.html", "28", "OSS", 1], ["29-el-orquestador", "29-el-orquestador.html", "29", "El orquestador", 1], ["30-una-instalacion-sin-tocar-nada", "30-una-instalacion-sin-tocar-nada.html", "30", "Una instalación sin tocar nada", 1], ["31-autogestion-del-wi-fi-y-actualizaciones-de-firmware", "31-autogestion-del-wi-fi-y-actualizaciones-de-firmware.html", "31", "Autogestión del Wi-Fi y actualizaciones de firmware", 1], ["32-no-tengo-internet", "32-no-tengo-internet.html", "32", "«No tengo Internet»", 1], ["33-cambio-de-plan-suspension-y-reconexion", "33-cambio-de-plan-suspension-y-reconexion.html", "33", "Cambio de plan, suspensión y reconexión", 1], ["34-cuando-se-corta-la-fibra", "34-cuando-se-corta-la-fibra.html", "34", "Cuando se corta la fibra", 1], ["35-como-gana-dinero-un-telco", "35-como-gana-dinero-un-telco.html", "35", "Cómo gana dinero un telco", 1], ["36-la-cadena-de-valor-de-punta-a-punta", "36-la-cadena-de-valor-de-punta-a-punta.html", "36", "La cadena de valor de punta a punta", 1], ["37-hacia-donde-va", "37-hacia-donde-va.html", "37", "Hacia dónde va", 1]];
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
