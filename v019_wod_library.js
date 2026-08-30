(() => {
'use strict';
const PATCH_VERSION='0.1.9';
const WODS=Array.isArray(window.WLC_EMBEDDED_WODS)?window.WLC_EMBEDDED_WODS:[];
const GIRLS=new Set(['angie','annie','amanda','andi','barbara','candy','chelsea','cindy','diane','elizabeth','eva','fran','grace','grettel','gwen','helen','hope','ingrid','isabel','jackie','karen','kelly','linda','lynne','lyla','maggie','marguerita','mary','nancy','nicole']);
const state={query:'',type:'all',format:'all',limit:40,lastId:''};

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function ascii(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function norm(v){return ascii(v).replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim()}
function typeLabel(w){
  const cat=norm(w?.category),tags=(w?.tags||[]).map(norm),nm=norm(w?.name);
  if(cat==='open'||tags.includes('open')||/^open\s*\d{2}(?:\.\d+)?/.test(nm)||/^\d{2}\.\d+$/.test(nm))return'Open';
  if(cat==='hero'||tags.includes('hero'))return'Hero';
  if(cat==='girl'||tags.includes('girl')||GIRLS.has(nm))return'Girl';
  if(cat==='benchmark')return'Benchmark';
  if(cat==='archivio')return'Archivio';
  return w?.category||'Libreria';
}
function typeKey(w){return norm(typeLabel(w)).replace(/ /g,'_')||'libreria'}
function scoreLabel(v){return ({time:'Tempo',rounds_plus_reps:'Round + reps',reps:'Ripetizioni',load:'Carico',calories:'Calorie',distance:'Distanza',points:'Punti',completion_or_total_reps:'Completamento / reps',split_times_or_total_work:'Split / lavoro totale'})[v]||String(v||'—').replace(/_/g,' ')}
function searchHay(w){return ascii([w.name,w.category,w.format,w.duration,w.timeCap,w.description,w.searchText,(w.tags||[]).join(' '),(w.equipment||[]).join(' '),(w.movements||[]).join(' ')].filter(Boolean).join(' '))}
const INDEX=WODS.map((w,i)=>({w,i,type:typeLabel(w),typeKey:typeKey(w),hay:searchHay(w),nameNorm:norm(w.name),formatNorm:norm(w.format)}));
const FORMATS=[...new Set(WODS.map(w=>String(w.format||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'it'));
const PRESET_TYPES=['Girl','Hero','Open','Benchmark','Archivio'];

function priorityType(t){return ({Girl:0,Hero:1,Open:2,Benchmark:3,Archivio:8})[t]??5}
function filtered(){
  const q=ascii(state.query).trim(),parts=q.split(/\s+/).filter(Boolean),fmt=norm(state.format);
  return INDEX.filter(x=>{
    if(state.type!=='all'&&x.typeKey!==state.type)return false;
    if(fmt&&fmt!=='all'&&x.formatNorm!==fmt)return false;
    if(parts.length&&!parts.every(p=>x.hay.includes(p)))return false;
    return true;
  }).sort((a,b)=>{
    if(parts.length){const an=a.nameNorm.includes(norm(state.query))?0:1,bn=b.nameNorm.includes(norm(state.query))?0:1;if(an!==bn)return an-bn}
    const pt=priorityType(a.type)-priorityType(b.type);if(pt)return pt;
    return String(a.w.name||'').localeCompare(String(b.w.name||''),'it',{numeric:true,sensitivity:'base'});
  });
}
function typeCounts(){const m={all:WODS.length};for(const x of INDEX)m[x.typeKey]=(m[x.typeKey]||0)+1;return m}
function quickFiltersHtml(){const c=typeCounts();return `<button class="wodlib-chip ${state.type==='all'?'active':''}" data-wodlib-type="all">Tutti <b>${c.all||0}</b></button>${PRESET_TYPES.map(t=>{const k=norm(t).replace(/ /g,'_');return c[k]?`<button class="wodlib-chip ${state.type===k?'active':''}" data-wodlib-type="${k}">${esc(t)} <b>${c[k]}</b></button>`:''}).join('')}`}
function resultCard(x){const w=x.w,desc=String(w.description||'').split(/\n+/).filter(Boolean).slice(0,3).join(' · ');return `<button class="wodlib-card" data-wodlib-open="${esc(w.id||String(x.i))}"><div class="wodlib-card-top"><div><span class="wodlib-type type-${esc(x.typeKey)}">${esc(x.type)}</span><h3>${esc(w.name||'WOD')}</h3></div><span class="wodlib-format">${esc(w.format||'—')}</span></div><p>${esc(desc||'Nessuna descrizione disponibile')}</p><div class="wodlib-meta">${w.duration?`<span>⏱ ${esc(w.duration)}</span>`:''}${w.timeCap?`<span>TC ${esc(w.timeCap)}</span>`:''}<span>Score: ${esc(scoreLabel(w.scoreType))}</span></div></button>`}
function renderResults(){
  const rows=filtered(),visible=rows.slice(0,state.limit),count=document.getElementById('wodlibCount'),list=document.getElementById('wodlibResults'),more=document.getElementById('wodlibMore');
  if(count)count.textContent=`${rows.length} WOD trovati`;
  if(list)list.innerHTML=visible.length?visible.map(resultCard).join(''):`<div class="wodlib-empty"><strong>Nessun WOD trovato</strong><span>Prova con un nome, un movimento o un formato diverso.</span></div>`;
  if(more){more.hidden=visible.length>=rows.length;more.textContent=`Mostra altri (${Math.min(40,rows.length-visible.length)})`}
  const chips=document.getElementById('wodlibChips');if(chips)chips.innerHTML=quickFiltersHtml();
}
function openModal(title,html,subtitle=''){
  const back=document.getElementById('modalBackdrop'),modal=back?.querySelector('.modal'),t=document.getElementById('modalTitle'),s=document.getElementById('modalSubtitle'),b=document.getElementById('modalBody');if(!back||!modal||!t||!b)return;
  modal.classList.add('wodlib-modal');t.textContent=title;s.textContent=subtitle;b.innerHTML=html;back.classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeLibrary(){const modal=document.querySelector('#modalBackdrop .modal');modal?.classList.remove('wodlib-modal')}
function libraryHtml(){return `<div class="wodlib-shell">
  <div class="wodlib-toolbar">
    <div class="wodlib-search-wrap"><span>⌕</span><input id="wodlibSearch" type="search" autocomplete="off" placeholder="Cerca nome, movimento, carico, tag…" value="${esc(state.query)}"><button type="button" data-wodlib-clear aria-label="Cancella ricerca">✕</button></div>
    <select id="wodlibFormat" aria-label="Filtra formato"><option value="all">Tutti i formati</option>${FORMATS.map(f=>`<option value="${esc(f)}" ${state.format===f?'selected':''}>${esc(f)}</option>`).join('')}</select>
  </div>
  <div id="wodlibChips" class="wodlib-chips">${quickFiltersHtml()}</div>
  <div class="wodlib-summary"><strong id="wodlibCount">${WODS.length} WOD</strong><span>Ricerca anche nel testo completo del workout.</span></div>
  <div id="wodlibResults" class="wodlib-results"></div>
  <div class="wodlib-more-wrap"><button id="wodlibMore" class="button secondary" data-wodlib-more>Mostra altri</button></div>
</div>`}
function openLibrary(reset=false){if(reset){state.query='';state.type='all';state.format='all';state.limit=40}openModal('Libreria WOD',libraryHtml(),`${WODS.length.toLocaleString('it-IT')} WOD incorporati · ricerca offline`);renderResults();setTimeout(()=>document.getElementById('wodlibSearch')?.focus(),60)}
function getById(id){return WODS.find(w=>String(w.id)===String(id))||WODS[Number(id)]||null}
function detailHtml(w){const type=typeLabel(w),tags=(w.tags||[]).filter(Boolean),equipment=(w.equipment||[]).filter(Boolean);return `<div class="wodlib-detail">
  <button class="button ghost small" data-wodlib-back>← Libreria</button>
  <div class="wodlib-detail-hero"><div><span class="wodlib-type type-${esc(typeKey(w))}">${esc(type)}</span><h2>${esc(w.name||'WOD')}</h2></div><span class="wodlib-format large">${esc(w.format||'—')}</span></div>
  <div class="wodlib-detail-meta">${w.duration?`<div><small>Durata</small><strong>${esc(w.duration)}</strong></div>`:''}${w.timeCap?`<div><small>Time Cap</small><strong>${esc(w.timeCap)}</strong></div>`:''}<div><small>Score</small><strong>${esc(scoreLabel(w.scoreType))}</strong></div>${w.level?`<div><small>Livello</small><strong>${esc(w.level)}</strong></div>`:''}</div>
  <div class="card wodlib-description"><pre>${esc(w.description||'Nessuna descrizione disponibile.')}</pre></div>
  ${equipment.length?`<div class="wodlib-info"><strong>Attrezzatura</strong><div>${equipment.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:''}
  ${tags.length?`<div class="wodlib-info"><strong>Tag</strong><div>${tags.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div>`:''}
  <div class="actions"><button class="button accent" data-wodlib-share="${esc(w.id)}">Condividi WOD</button><button class="button secondary" data-wodlib-copy="${esc(w.id)}">Copia testo</button></div>
</div>`}
function openDetail(id){const w=getById(id);if(!w)return;state.lastId=String(id);openModal(w.name||'WOD',detailHtml(w),`${typeLabel(w)} · ${w.format||'Formato non indicato'}`)}
function shareText(w){return `${w.name||'WOD'}\n${typeLabel(w)} · ${w.format||''}${w.timeCap?` · Time Cap ${w.timeCap}`:''}\n\n${w.description||''}`.trim()}
async function copyWod(id){const w=getById(id);if(!w)return;const text=shareText(w);try{await navigator.clipboard.writeText(text);showToast('WOD copiato')}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();showToast('WOD copiato')}}
async function shareWod(id){const w=getById(id);if(!w)return;const text=shareText(w);if(navigator.share){try{await navigator.share({title:w.name||'WOD',text});return}catch(e){if(e?.name==='AbortError')return}}await copyWod(id)}
function showToast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),1800)}

function ensureHomeShortcut(){const hero=document.querySelector('#app .hero .actions');if(!hero||hero.querySelector('[data-wod-library]'))return;const b=document.createElement('button');b.className='button secondary';b.dataset.wodLibrary='1';b.textContent='📚 Libreria WOD';hero.appendChild(b)}
let timer=null;const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(ensureHomeShortcut,100)});observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true});

document.addEventListener('click',e=>{
  const lib=e.target.closest('[data-wod-library]');if(lib){e.preventDefault();e.stopPropagation();openLibrary(false);return}
  const card=e.target.closest('[data-wodlib-open]');if(card){e.preventDefault();openDetail(card.dataset.wodlibOpen);return}
  const type=e.target.closest('[data-wodlib-type]');if(type){state.type=type.dataset.wodlibType;state.limit=40;renderResults();return}
  if(e.target.closest('[data-wodlib-more]')){state.limit+=40;renderResults();return}
  if(e.target.closest('[data-wodlib-clear]')){state.query='';const q=document.getElementById('wodlibSearch');if(q){q.value='';q.focus()}state.limit=40;renderResults();return}
  if(e.target.closest('[data-wodlib-back]')){openLibrary(false);return}
  const cp=e.target.closest('[data-wodlib-copy]');if(cp){copyWod(cp.dataset.wodlibCopy);return}
  const sh=e.target.closest('[data-wodlib-share]');if(sh){shareWod(sh.dataset.wodlibShare);return}
  if(e.target.closest('#modalClose'))setTimeout(closeLibrary,0);
},true);
document.addEventListener('input',e=>{if(e.target?.id==='wodlibSearch'){state.query=e.target.value;state.limit=40;renderResults()}},true);
document.addEventListener('change',e=>{if(e.target?.id==='wodlibFormat'){state.format=e.target.value;state.limit=40;renderResults()}},true);

const style=document.createElement('style');style.textContent=`
.wodlib-modal{width:min(1040px,94vw);max-width:1040px;height:min(88vh,900px)}.wodlib-modal .modal-body{overflow:auto;padding-bottom:28px}.wodlib-toolbar{position:sticky;top:-1px;z-index:4;display:grid;grid-template-columns:1fr 190px;gap:10px;background:var(--surface,#fff);padding:2px 0 10px}.wodlib-search-wrap{display:grid;grid-template-columns:28px 1fr 32px;align-items:center;border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 8px}.wodlib-search-wrap>span{font-size:1.3rem;color:var(--muted)}.wodlib-search-wrap input{border:0!important;outline:0!important;background:transparent!important;padding:11px 4px!important;min-width:0}.wodlib-search-wrap button{border:0;background:transparent;color:var(--muted);font-size:.8rem}.wodlib-toolbar select{border:1px solid var(--line);border-radius:12px;background:#fff;padding:0 10px}.wodlib-chips{display:flex;gap:6px;overflow:auto;padding:2px 0 9px;scrollbar-width:none}.wodlib-chip{border:1px solid var(--line);background:#fff;border-radius:999px;padding:7px 10px;white-space:nowrap;font-size:.72rem;font-weight:750;color:var(--text)}.wodlib-chip b{font-size:.64rem;color:var(--muted);margin-left:3px}.wodlib-chip.active{background:var(--brand);border-color:var(--brand);color:#fff}.wodlib-chip.active b{color:rgba(255,255,255,.75)}.wodlib-summary{display:flex;justify-content:space-between;gap:12px;align-items:center;margin:4px 0 10px}.wodlib-summary strong{font-size:.78rem}.wodlib-summary span{font-size:.68rem;color:var(--muted)}.wodlib-results{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.wodlib-card{display:block;width:100%;text-align:left;border:1px solid var(--line);background:#fff;border-radius:14px;padding:12px;color:inherit}.wodlib-card:hover{border-color:color-mix(in srgb,var(--brand) 35%,var(--line));box-shadow:0 5px 18px rgba(22,50,52,.06)}.wodlib-card-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.wodlib-card h3{font-size:.92rem;margin:5px 0 0}.wodlib-card p{font-size:.7rem;line-height:1.42;color:var(--muted);margin:8px 0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.wodlib-type,.wodlib-format{display:inline-flex;align-items:center;border-radius:999px;font-size:.62rem;font-weight:850;letter-spacing:.03em;padding:4px 7px;background:#edf3f1;color:#355153}.wodlib-type.type-girl{background:#f9e8ee;color:#8b3956}.wodlib-type.type-hero{background:#ece9df;color:#66562d}.wodlib-type.type-open{background:#e7eef8;color:#315a88}.wodlib-type.type-benchmark{background:#e9f3ed;color:#356b4e}.wodlib-type.type-archivio{background:#f0f1f1;color:#626c6d}.wodlib-format{background:#f7f3e9;color:#745e2d;white-space:nowrap}.wodlib-format.large{font-size:.72rem;padding:6px 9px}.wodlib-meta{display:flex;gap:9px;flex-wrap:wrap;font-size:.64rem;color:var(--muted)}.wodlib-more-wrap{text-align:center;padding:14px 0 0}.wodlib-empty{grid-column:1/-1;padding:38px;text-align:center;border:1px dashed var(--line);border-radius:14px;display:grid;gap:5px}.wodlib-empty span{font-size:.72rem;color:var(--muted)}.wodlib-detail{display:grid;gap:12px}.wodlib-detail>.button{justify-self:start}.wodlib-detail-hero{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.wodlib-detail-hero h2{font-size:1.5rem;margin:6px 0 0}.wodlib-detail-meta{display:flex;gap:8px;flex-wrap:wrap}.wodlib-detail-meta>div{min-width:110px;border:1px solid var(--line);border-radius:12px;padding:9px 11px;display:grid;gap:2px}.wodlib-detail-meta small{color:var(--muted);font-size:.64rem}.wodlib-detail-meta strong{font-size:.78rem}.wodlib-description pre{font-family:inherit;white-space:pre-wrap;margin:0;font-size:.8rem;line-height:1.55}.wodlib-info{display:grid;gap:7px}.wodlib-info>strong{font-size:.72rem}.wodlib-info>div{display:flex;gap:5px;flex-wrap:wrap}.wodlib-info span{font-size:.66rem;padding:5px 7px;border:1px solid var(--line);border-radius:999px;background:#fff}.side-nav .wodlib-nav span,.bottom-nav .wodlib-nav span{font-size:1.05em}.bottom-nav .wodlib-nav b{font-size:.63rem}
@media(max-width:760px){.wodlib-modal{width:96vw;height:91vh}.wodlib-toolbar{grid-template-columns:1fr}.wodlib-results{grid-template-columns:1fr}.wodlib-summary span{display:none}.wodlib-detail-hero{flex-direction:column}.bottom-nav{grid-template-columns:repeat(6,1fr)!important}.bottom-nav .nav-btn{min-width:0;padding-left:2px!important;padding-right:2px!important}}
`;
document.head.appendChild(style);
setTimeout(ensureHomeShortcut,150);
console.info(`Training Journal WOD Library ${PATCH_VERSION} loaded (${WODS.length} WOD)`);
})();
