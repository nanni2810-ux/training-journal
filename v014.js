(() => {
'use strict';
const PATCH_VERSION='0.1.4';
const STATE_KEY='state.v1';
const WODS=Array.isArray(window.WLC_EMBEDDED_WODS)?window.WLC_EMBEDDED_WODS:[];
const GENERIC=new Set(['','wod','workout','metcon','training','allenamento']);

function ascii(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function norm(v){return ascii(v).replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim()}
function isGeneric(v){return GENERIC.has(norm(v))}
function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function fmtDate(v){if(!v)return'—';const [y,m,d]=String(v).split('-').map(Number);return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(y,(m||1)-1,d||1,12))}
function specialLabel(w){
  const cat=norm(w?.category),tags=(w?.tags||[]).map(norm),nm=norm(w?.name);
  const girls=new Set(['angie','annie','amanda','andi','barbara','candy','chelsea','cindy','diane','elizabeth','eva','fran','grace','grettel','gwen','helen','hope','ingrid','isabel','jackie','karen','kelly','linda','lynne','lyla','maggie','marguerita','mary','nancy','nicole']);
  if(cat==='open'||tags.includes('open')||/^open\s*\d{2}(?:\.\d+)?/.test(nm)||/^\d{2}\.\d+$/.test(nm))return'Open';
  if(cat==='hero'||tags.includes('hero'))return'Hero';
  if(cat==='girl'||tags.includes('girl')||girls.has(nm))return'Girl';
  if(cat==='benchmark')return'Benchmark';
  return w?.category||'Libreria';
}
function findLibraryByName(name){const n=norm(name);return WODS.find(w=>norm(w.name)===n)||null}
function candidateFromBadge(badge){
  const span=badge?.querySelector('span');if(!span)return null;
  const parts=span.textContent.split(' · ');if(parts.length<2)return null;
  const name=parts.slice(1,-1).join(' · ')||parts[1];
  return findLibraryByName(name.trim());
}
function setField(el,value){if(!el)return;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
function sectionFromElement(sec){return {
  name:sec.querySelector('[data-sec-field="name"]'),
  format:sec.querySelector('[data-sec-field="format"]'),
  scoreType:sec.querySelector('[data-sec-field="scoreType"]'),
  text:sec.querySelector('[data-sec-field="text"]')
}}
function confirmCandidate(sec,entry,replaceText=false){
  if(!sec||!entry)return;
  const f=sectionFromElement(sec);
  setField(f.name,entry.name||'WOD');
  if(entry.format)setField(f.format,entry.format);
  if(entry.scoreType)setField(f.scoreType,entry.scoreType);
  if(replaceText&&entry.description)setField(f.text,entry.description);
  sec.dataset.v014Confirmed=entry.id||entry.name||'1';
  const badge=sec.querySelector('.v013-wod-match');
  if(badge){
    badge.classList.add('v014-confirmed');
    badge.innerHTML=`<strong>✓ Corrispondenza confermata</strong><span>${esc(specialLabel(entry))} · ${esc(entry.name)}</span><small>${replaceText?'È stata usata la versione della libreria.':'Collegato alla libreria mantenendo il testo importato e i suoi carichi.'}</small>`;
  }
  saveConfirmedLink(sec,entry).catch(()=>{});
}
async function saveConfirmedLink(sec,entry){
  const id=sec?.dataset.sectionId;if(!id||!window.TJDB?.get)return;
  const state=await TJDB.get(STATE_KEY);if(!state)return;
  let changed=false;
  for(const w of state.workouts||[]){
    const s=(w.sections||[]).find(x=>x.id===id);if(!s)continue;
    s.name=entry.name||s.name;s.libraryId=entry.id||'';s.libraryName=entry.name||'';s.libraryCategory=entry.category||'';s.matchedType=specialLabel(entry);s.matchConfidence=100;s.matchVersion=PATCH_VERSION;
    if(entry.format)s.format=entry.format;if(entry.scoreType)s.scoreType=entry.scoreType;changed=true;
    for(const r of state.wodRecords||[]){if(r.sourceWorkoutId===w.id&&r.sectionId===s.id){r.wodId=s.libraryId;r.wodName=s.libraryName||s.name;r.libraryCategory=s.libraryCategory;r.matchedType=s.matchedType;}}
  }
  if(changed)await TJDB.set(STATE_KEY,state);
}
function openCandidate(sec,entry){
  if(!entry)return;
  const back=document.getElementById('modalBackdrop'),title=document.getElementById('modalTitle'),sub=document.getElementById('modalSubtitle'),body=document.getElementById('modalBody');
  if(!back||!title||!body)return;
  title.textContent=entry.name||'WOD';sub.textContent=`${specialLabel(entry)}${entry.format?` · ${entry.format}`:''}`;
  body.innerHTML=`<div class="v014-preview"><div class="v014-meta"><span class="badge accent">${esc(specialLabel(entry))}</span>${entry.category&&specialLabel(entry)!==entry.category?`<span class="badge">${esc(entry.category)}</span>`:''}</div><pre>${esc(entry.description||'Descrizione non disponibile')}</pre><div class="actions end"><button class="button secondary" data-v014-confirm="keep">Collega mantenendo il testo importato</button><button class="button ghost" data-v014-confirm="replace">Usa versione libreria</button></div><p class="muted small">Il primo pulsante conserva eventuali carichi o dettagli più completi presenti nel messaggio importato.</p></div>`;
  back.classList.remove('hidden');document.body.style.overflow='hidden';
  body.querySelector('[data-v014-confirm="keep"]')?.addEventListener('click',()=>{confirmCandidate(sec,entry,false);closeModal()});
  body.querySelector('[data-v014-confirm="replace"]')?.addEventListener('click',()=>{confirmCandidate(sec,entry,true);closeModal()});
}
function closeModal(){document.getElementById('modalBackdrop')?.classList.add('hidden');document.getElementById('modalBody').innerHTML='';document.body.style.overflow=''}
function enhancePossibleMatches(){
  document.querySelectorAll('.v013-wod-match').forEach(badge=>{
    if(badge.dataset.v014Done)return;
    const strong=badge.querySelector('strong');if(!strong||!/^possibile corrispondenza/i.test(strong.textContent.trim()))return;
    const sec=badge.closest('.workout-section[data-section-id]'),entry=candidateFromBadge(badge);if(!sec||!entry)return;
    badge.dataset.v014Done='1';
    const actions=document.createElement('div');actions.className='v014-match-actions';
    actions.innerHTML='<button type="button" class="button ghost small" data-v014-view>Vedi WOD</button><button type="button" class="button secondary small" data-v014-use>Conferma / collega</button>';
    badge.appendChild(actions);
    actions.querySelector('[data-v014-view]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openCandidate(sec,entry)});
    actions.querySelector('[data-v014-use]').addEventListener('click',e=>{e.preventDefault();e.stopPropagation();confirmCandidate(sec,entry,false)});
  })
}
function sourceInfo(state,r){
  const w=(state.workouts||[]).find(x=>x.id===r.sourceWorkoutId)||null;
  const s=w?.sections?.find(x=>x.id===r.sectionId)||null;
  const libId=r.wodId||s?.libraryId||'';
  const lib=libId?WODS.find(x=>x.id===libId)||null:null;
  return {w,s,lib};
}
function migrateRecords(state){
  let changed=false;
  for(const r of state.wodRecords||[]){
    const {s,lib}=sourceInfo(state,r);
    if(s?.libraryId){
      const entry=lib||WODS.find(x=>x.id===s.libraryId);
      const name=s.libraryName||entry?.name||s.name||r.wodName;
      if(r.wodId!==s.libraryId||r.wodName!==name){r.wodId=s.libraryId;r.wodName=name;changed=true}
      const cat=s.libraryCategory||entry?.category||'';if(cat&&r.libraryCategory!==cat){r.libraryCategory=cat;changed=true}
      const mt=s.matchedType||entry&&specialLabel(entry)||'';if(mt&&r.matchedType!==mt){r.matchedType=mt;changed=true}
    }
  }
  state.appVersion=PATCH_VERSION;return changed;
}
if(window.TJDB?.set){
  const prev=window.TJDB.set.bind(window.TJDB);
  window.TJDB.set=async(key,value)=>{
    await prev(key,value);
    if(key===STATE_KEY&&value&&migrateRecords(value))await prev(key,value);
  };
}
function recordKey(state,r){
  const {s}=sourceInfo(state,r),id=r.wodId||s?.libraryId||'';
  if(id)return `id:${id}:${r.level||'Rx'}`;
  const n=norm(r.wodName||s?.name||'');
  if(n&&!isGeneric(n))return `name:${n}:${r.level||'Rx'}`;
  return `single:${r.id}`;
}
function parseTime(s){const m=String(s||'').match(/(?:(\d+):)?(\d+):(\d+)/);if(m)return (+m[1]||0)*3600+(+m[2])*60+(+m[3]);const x=String(s||'').match(/(\d+):(\d+)/);return x?(+x[1])*60+(+x[2]):null}
function num(v){const m=String(v||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
function rounds(v){const m=String(v||'').match(/(\d+)\D+(\d+)/);return m?(+m[1])*10000+(+m[2]):num(v)||0}
function better(a,b){
  const t=a.scoreType||'time';if(t==='time'){const x=parseTime(a.score),y=parseTime(b.score);return x!=null&&y!=null?x<y:String(a.date)>String(b.date)}
  if(t==='rounds_plus_reps')return rounds(a.score)>rounds(b.score);
  const x=num(a.score),y=num(b.score);return Number.isFinite(x)&&Number.isFinite(y)?x>y:String(a.date)>String(b.date)
}
function groups(state){
  const map=new Map();for(const r of state.wodRecords||[]){const k=recordKey(state,r);if(!map.has(k))map.set(k,[]);map.get(k).push(r)}
  return [...map.entries()].map(([key,rows])=>({key,rows:rows.sort((a,b)=>String(b.date).localeCompare(String(a.date))),best:rows.reduce((x,r)=>!x||better(r,x)?r:x,null)})).sort((a,b)=>String(b.best?.date||'').localeCompare(String(a.best?.date||'')))
}
function excerpt(state,r,max=3){
  const {s,lib}=sourceInfo(state,r),text=s?.text||lib?.description||'';
  return String(text).split('\n').map(x=>x.trim()).filter(x=>x&&!/^(for time|amrap|emom|e\d+mom|chipper)$/i.test(x)).slice(0,max).join(' · ')
}
function displayName(state,r){
  const {s,lib}=sourceInfo(state,r),name=lib?.name||s?.libraryName||(!isGeneric(r.wodName)?r.wodName:'')||(!isGeneric(s?.name)?s?.name:'');
  const label=lib?specialLabel(lib):(s?.matchedType||r.matchedType||'WOD');
  return {name:name||'WOD',label};
}
async function enhanceProgress(){
  if(!document.querySelector('[data-action="progress-wod-detail"]'))return;
  const state=await TJDB.get(STATE_KEY);if(!state)return;
  migrateRecords(state);
  const title=[...document.querySelectorAll('h2.section-title')].find(x=>/benchmark\s*\/\s*wod pb/i.test(x.textContent));
  if(!title)return;
  const current=title.nextElementSibling;if(!current||current.dataset.v014Progress==='1')return;
  const gs=groups(state);const box=document.createElement('div');box.className='list v014-progress-list';box.dataset.v014Progress='1';
  if(!gs.length){box.innerHTML='<p class="muted">Nessun WOD score registrato.</p>'}
  else box.innerHTML=gs.slice(0,30).map(g=>{const r=g.best,d=displayName(state,r),ex=excerpt(state,r,2);return `<div class="list-item clickable progress-item v014-progress-item" data-v014-progress="${esc(r.id)}"><div class="avatar">💥</div><div class="grow"><h3>${esc(d.label)} · ${esc(d.name)}</h3><p><strong>${esc(fmtDate(r.date))}</strong>${r.level?` · ${esc(r.level)}`:''}${ex?` · ${esc(ex)}`:''}</p></div><strong class="v014-score">${esc(r.score)}</strong><span class="chevron">›</span></div>`}).join('');
  current.replaceWith(box);
}
async function openProgressDetail(id){
  const state=await TJDB.get(STATE_KEY);if(!state)return;const target=(state.wodRecords||[]).find(r=>r.id===id);if(!target)return;
  const key=recordKey(state,target),rows=(state.wodRecords||[]).filter(r=>recordKey(state,r)===key).sort((a,b)=>String(b.date).localeCompare(String(a.date))),best=rows.reduce((x,r)=>!x||better(r,x)?r:x,null),d=displayName(state,best),ex=excerpt(state,best,8),{lib}=sourceInfo(state,best);
  const back=document.getElementById('modalBackdrop'),title=document.getElementById('modalTitle'),sub=document.getElementById('modalSubtitle'),body=document.getElementById('modalBody');if(!back||!title||!body)return;
  title.textContent=`${d.label} · ${d.name}`;sub.textContent='Storico risultati dello stesso WOD e dello stesso livello';
  body.innerHTML=`<div class="detail-hero wod"><span>${rows.length>1?'Miglior risultato':'Risultato'} · ${esc(best.level||'Rx')}</span><strong>${esc(best.score)}</strong><small>${fmtDate(best.date)} · ${rows.length} ${rows.length===1?'risultato registrato':'risultati registrati'}</small></div><div class="card v014-wod-info"><div class="v014-wod-title"><strong>${esc(d.label)}${lib?.category&&d.label!==lib.category?` · ${esc(lib.category)}`:''}</strong>${lib?.format?`<span class="badge">${esc(lib.format)}</span>`:''}</div><p>${ex?esc(ex):'Descrizione del WOD non disponibile.'}</p></div><h3 class="v014-history-title">Risultati registrati</h3><div class="detail-list">${rows.map(r=>{const info=sourceInfo(state,r),xx=excerpt(state,r,2);return `<div class="detail-row static ${r.id===best.id?'is-pb':''}"><div><strong>${fmtDate(r.date)} · ${esc(r.score)}${r.id===best.id&&rows.length>1?' 🏆':''}</strong><small>${esc(r.level||'Rx')}${xx?` · ${esc(xx)}`:''}${r.notes?` · ${esc(r.notes)}`:''}</small></div>${info.w?`<button class="button ghost small" data-v014-workout="${esc(info.w.id)}">Allenamento</button>`:''}</div>`}).join('')}</div>`;
  back.classList.remove('hidden');document.body.style.overflow='hidden';
}

document.addEventListener('click',e=>{
  const p=e.target.closest('[data-v014-progress]');if(p){e.preventDefault();e.stopImmediatePropagation();openProgressDetail(p.dataset.v014Progress);return}
  const old=e.target.closest('[data-action="progress-wod-detail"]');if(old){e.preventDefault();e.stopImmediatePropagation();openProgressDetail(old.dataset.id);return}
  const w=e.target.closest('[data-v014-workout]');if(w){e.preventDefault();e.stopImmediatePropagation();closeModal();const tmp=document.createElement('button');tmp.type='button';tmp.dataset.action='open-workout';tmp.dataset.id=w.dataset.v014Workout;tmp.hidden=true;document.body.appendChild(tmp);tmp.click();tmp.remove();return}
},true);

let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(()=>{enhancePossibleMatches();enhanceProgress().catch(()=>{})},80)}
new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
const style=document.createElement('style');style.textContent=`
.v014-match-actions{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}.v013-wod-match.v014-confirmed{border-color:color-mix(in srgb,#2f8f65 45%,var(--line));background:color-mix(in srgb,#2f8f65 7%,white)}
.v014-preview pre{white-space:pre-wrap;font:inherit;line-height:1.55;background:var(--surface-2,#f6f8f7);border:1px solid var(--line);border-radius:12px;padding:14px;max-height:45vh;overflow:auto}.v014-meta{display:flex;gap:6px;margin-bottom:10px}.v014-progress-item p{white-space:normal;line-height:1.35}.v014-score{font-size:1.05rem;color:var(--brand)}
.v014-wod-info{margin-top:12px}.v014-wod-info p{line-height:1.5;margin-bottom:0}.v014-wod-title{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.v014-history-title{margin:18px 0 8px;font-size:1rem}
`;
document.head.appendChild(style);
setTimeout(schedule,100);
console.info(`Training Journal progress/match patch ${PATCH_VERSION} loaded`);
})();
