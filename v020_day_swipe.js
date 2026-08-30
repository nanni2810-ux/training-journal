(() => {
'use strict';
const PATCH_VERSION='0.2.1';
const APP=document.getElementById('app');
if(!APP)return;

function parseISO(v){
  const [y,m,d]=String(v||'').split('-').map(Number);
  if(!y||!m||!d)return null;
  return new Date(y,m-1,d,12,0,0,0);
}
function iso(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function moveDate(v,delta){const d=parseISO(v);if(!d)return v;d.setDate(d.getDate()+delta);return iso(d)}
function shortDate(v){const d=parseISO(v);return d?new Intl.DateTimeFormat('it-IT',{weekday:'short',day:'numeric',month:'short'}).format(d):''}
function currentDay(){
  return APP.querySelector('[data-action="toggle-rest"][data-date]')?.dataset.date||
         APP.querySelector('[data-action="new-workout"][data-date]')?.dataset.date||'';
}
function isDayView(){return !!currentDay()&&!!APP.querySelector('.page-head [data-nav="calendar"]')}
function openDay(date){
  if(!date)return;
  const b=document.createElement('button');
  b.type='button';b.hidden=true;b.dataset.action='open-day';b.dataset.date=date;
  document.body.appendChild(b);b.click();b.remove();
}
function navigate(delta){const cur=currentDay();if(!cur||!isDayView())return;openDay(moveDate(cur,delta))}

function enhanceDay(){
  const page=APP.querySelector('.page');
  if(!page)return;
  if(!isDayView()){
    page.querySelector('.day-swipe-nav')?.remove();
    page.classList.remove('day-swipe-page');
    return;
  }
  const date=currentDay(),prev=moveDate(date,-1),next=moveDate(date,1);
  let nav=page.querySelector('.day-swipe-nav');
  if(nav?.dataset.day===date&&nav.querySelector('[data-day-jump="-1"]')&&nav.querySelector('[data-day-jump="1"]'))return;
  if(!nav){
    nav=document.createElement('div');nav.className='day-swipe-nav';
    const head=page.querySelector('.page-head');
    if(head)head.insertAdjacentElement('afterend',nav);else page.prepend(nav);
  }
  nav.dataset.day=date;
  nav.innerHTML=`<button type="button" class="day-swipe-btn" data-day-jump="-1" aria-label="Giorno precedente"><span class="day-swipe-arrow">‹</span><span><small>Precedente</small><strong>${shortDate(prev)}</strong></span></button><div class="day-swipe-hint" aria-hidden="true"><span>⇆</span><small>Scorri a sinistra o destra</small></div><button type="button" class="day-swipe-btn next" data-day-jump="1" aria-label="Giorno successivo"><span><small>Successivo</small><strong>${shortDate(next)}</strong></span><span class="day-swipe-arrow">›</span></button>`;
  page.classList.add('day-swipe-page');
}

let touch=null;
function blockedTarget(el){return !!el.closest('input,textarea,select,button,a,[contenteditable="true"],.modal,.suggestions')}
APP.addEventListener('touchstart',e=>{
  if(!isDayView()||e.touches.length!==1||blockedTarget(e.target)){touch=null;return}
  const t=e.touches[0];touch={x:t.clientX,y:t.clientY,time:Date.now(),day:currentDay()};
},{passive:true});
APP.addEventListener('touchend',e=>{
  if(!touch||!isDayView()){touch=null;return}
  const t=e.changedTouches?.[0];if(!t){touch=null;return}
  const dx=t.clientX-touch.x,dy=t.clientY-touch.y,dt=Date.now()-touch.time,startDay=touch.day;
  touch=null;
  if(startDay!==currentDay())return;
  if(dt>900||Math.abs(dx)<80||Math.abs(dx)<Math.abs(dy)*1.4)return;
  navigate(dx<0?1:-1);
},{passive:true});
APP.addEventListener('touchcancel',()=>{touch=null},{passive:true});

document.addEventListener('click',e=>{
  const b=e.target.closest('[data-day-jump]');if(!b)return;
  e.preventDefault();e.stopPropagation();navigate(Number(b.dataset.dayJump)||0);
},true);

document.addEventListener('keydown',e=>{
  if(!isDayView()||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
  const tag=document.activeElement?.tagName;
  if(['INPUT','TEXTAREA','SELECT'].includes(tag)||document.activeElement?.isContentEditable)return;
  if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1)}
  if(e.key==='ArrowRight'){e.preventDefault();navigate(1)}
});

let timer=null;
const observer=new MutationObserver(records=>{
  const meaningful=records.some(r=>{
    const target=r.target instanceof Element?r.target:null;
    if(target?.closest('.day-swipe-nav'))return false;
    const changed=[...r.addedNodes,...r.removedNodes].filter(n=>n.nodeType===1);
    return !changed.length||changed.some(n=>!(n instanceof Element)||(!n.matches('.day-swipe-nav')&&!n.closest('.day-swipe-nav')));
  });
  if(!meaningful)return;
  clearTimeout(timer);timer=setTimeout(enhanceDay,50);
});
observer.observe(APP,{childList:true,subtree:true});

const style=document.createElement('style');
style.textContent=`
.day-swipe-nav{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:10px;margin:8px 0 14px;padding:7px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--surface,white) 94%,var(--brand) 6%)}
.day-swipe-btn{min-height:48px;border:0;border-radius:11px;background:transparent;color:var(--text);display:flex;align-items:center;gap:8px;padding:6px 10px;text-align:left;cursor:pointer;min-width:0}
.day-swipe-btn.next{justify-content:flex-end;text-align:right}.day-swipe-btn:hover{background:color-mix(in srgb,var(--brand) 7%,transparent)}
.day-swipe-btn small{display:block;color:var(--muted);font-size:.62rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}.day-swipe-btn strong{display:block;font-size:.78rem;text-transform:capitalize;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.day-swipe-arrow{font-size:1.65rem;line-height:1;color:var(--brand);font-weight:500}.day-swipe-hint{display:flex;align-items:center;gap:5px;color:var(--muted);font-size:.65rem;white-space:nowrap}.day-swipe-hint>span{font-size:1rem}
@media(max-width:650px){.day-swipe-nav{grid-template-columns:1fr 1fr}.day-swipe-hint{display:none}.day-swipe-btn{padding:6px 8px}.day-swipe-btn strong{font-size:.72rem}}
@media(prefers-reduced-motion:reduce){.day-swipe-page{scroll-behavior:auto}}
`;
document.head.appendChild(style);
setTimeout(enhanceDay,80);
console.info(`Training Journal day swipe ${PATCH_VERSION} loaded`);
})();
