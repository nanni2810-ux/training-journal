(() => {
'use strict';
const PATCH_VERSION='0.2.4';
const STATE_KEY='state.v1';
const APP=document.getElementById('app');
if(!APP||!window.TJDB)return;

const EXERCISES=[
  'Weighted Pull-Up','Strict Pull-Up','Pull-Up','Chest-to-Bar','Bar Muscle-Up','Ring Muscle-Up','Dead Hang','High Pull','Scap Pull-Up',
  'Strict HSPU','HSPU','Handstand Hold','Pike HSPU','Eccentric HSPU','Shoulder Press','Push Press',
  'Snatch','Hang Snatch','Power Snatch','Snatch Pull','Clean','Hang Clean','Power Clean','Clean & Jerk','Clean Pull','Split Jerk','Jerk',
  'Back Squat','Front Squat','Overhead Squat','Deadlift','Romanian Deadlift','Good Morning','Hollow Hold','Arch Hold','Plank'
];
const CANON=[
  [/weighted\s*pull[- ]?up|pull[- ]?up\s*zavorrat/i,'Weighted Pull-Up'],[/strict\s*pull[- ]?up/i,'Strict Pull-Up'],[/chest[- ]?to[- ]?bar|\bc2b\b/i,'Chest-to-Bar'],
  [/bar\s*muscle[- ]?up|\bbmu\b/i,'Bar Muscle-Up'],[/ring\s*muscle[- ]?up|\brmu\b/i,'Ring Muscle-Up'],[/dead\s*hang/i,'Dead Hang'],[/high\s*(?:chest[- ]?to[- ]?bar|pull)/i,'High Pull'],[/scap\s*pull/i,'Scap Pull-Up'],
  [/strict\s*hspu|strict\s*handstand/i,'Strict HSPU'],[/eccentric\s*hspu/i,'Eccentric HSPU'],[/pike\s*hspu/i,'Pike HSPU'],[/handstand\s*hold/i,'Handstand Hold'],[/\bhspu\b|handstand\s*push/i,'HSPU'],
  [/snatch\s*pull|tirata\s*strappo/i,'Snatch Pull'],[/hang\s*snatch/i,'Hang Snatch'],[/power\s*snatch/i,'Power Snatch'],[/\bsnatch\b|\bstrappo\b/i,'Snatch'],
  [/clean\s*(?:&|and)\s*jerk|\bslancio\b/i,'Clean & Jerk'],[/clean\s*pull|tirata\s*slancio/i,'Clean Pull'],[/hang\s*clean/i,'Hang Clean'],[/power\s*clean/i,'Power Clean'],[/split\s*jerk/i,'Split Jerk'],[/\bjerk\b/i,'Jerk'],
  [/front\s*squat/i,'Front Squat'],[/back\s*squat/i,'Back Squat'],[/overhead\s*squat/i,'Overhead Squat'],[/romanian\s*deadlift|\brdl\b/i,'Romanian Deadlift'],[/deadlift|\bstacco\b/i,'Deadlift'],[/good\s*morning/i,'Good Morning'],[/\bclean\b|\bgirata\b/i,'Clean']
];

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function uid(){return `aer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
async function getState(){const s=await TJDB.get(STATE_KEY);if(!s)return null;if(!Array.isArray(s.adaptiveExtras))s.adaptiveExtras=[];return s}
async function saveState(s){s.appVersion=PATCH_VERSION;await TJDB.set(STATE_KEY,s)}
function canonicalExercise(v){const s=String(v||'').trim();for(const [r,c] of CANON)if(r.test(s))return c;return s}
function findExercise(v){for(const [r,c] of CANON)if(r.test(v))return c;return''}
function firstNumber(v){const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}
function simpleRepNumber(v){const s=String(v??'').trim().replace(',','.');return /^\d+(?:\.\d+)?$/.test(s)?Number(s):null}
function loadKind(v){const s=String(v||'').trim().toLowerCase();if(!s)return'none';if(/\bbw\b|body\s*weight|corpo\s*libero/.test(s))return'bodyweight';if(/%/.test(s))return'percent';if(/^\s*\+/.test(s)||/(?:^|\/)\s*\+\d/.test(s))return'external_plus';return'absolute'}
function loadValues(v){
  const kind=loadKind(v);if(kind==='none'||kind==='bodyweight')return[];
  return (String(v||'').replace(/,/g,'.').match(/[+]?\d+(?:\.\d+)?/g)||[]).map(x=>Number(x.replace('+',''))).filter(Number.isFinite);
}
function round2(v){return Math.round(v*100)/100}
function normalizedRow(r){
  const setsN=firstNumber(r.sets),repsN=simpleRepNumber(r.reps),kind=loadKind(r.load),values=loadValues(r.load),loadN=values[0]??null;
  const totalReps=setsN!=null&&repsN!=null?setsN*repsN:null;
  let tonnageKg=null;
  if(repsN!=null&&['absolute','external_plus'].includes(kind)&&values.length){
    if(setsN!=null&&values.length===setsN)tonnageKg=round2(values.reduce((a,b)=>a+b,0)*repsN);
    else if(setsN!=null&&values.length===1)tonnageKg=round2(setsN*repsN*values[0]);
  }
  return {...r,exerciseKey:canonicalExercise(r.exercise),setsNumber:setsN,repsNumber:repsN,loadKg:loadN,loadKind:kind,loadValuesKg:['absolute','external_plus'].includes(kind)?values:[],loadValuesPercent:kind==='percent'?values:[],loadSequence:values.length>1,totalReps,tonnageKg,minLoadKg:['absolute','external_plus'].includes(kind)&&values.length?Math.min(...values):null,maxLoadKg:['absolute','external_plus'].includes(kind)&&values.length?Math.max(...values):null,averageLoadKg:['absolute','external_plus'].includes(kind)&&values.length?round2(values.reduce((a,b)=>a+b,0)/values.length):null};
}
function parsePlannedRows(text){
  const out=[];
  for(const raw of String(text||'').split(/\n+/)){
    const line=raw.replace(/^[\s•\-–—*]+/,'').trim();if(!line)continue;
    const exercise=findExercise(line);if(!exercise)continue;
    if(/^(?:warm[- ]?up|obiettivo|note?|recupero|stop|niente)\b/i.test(line))continue;
    let sets='',reps='',load='';
    let m=line.match(/\b(\d+)\s*[x×]\s*(\([^)]*\)|\d+(?:\s*[-–]\s*\d+)?|max)\b/i);
    if(m){sets=m[1];reps=m[2].replace(/[()\s]/g,'')}
    if(!m&&/\b1\s+tentativo\s+max/i.test(line)){sets='1';reps='max'}
    const seq=line.match(/@\s*((?:[+]?\d+(?:[.,]\d+)?\s*[/|]\s*)+[+]?\d+(?:[.,]\d+)?\s*(?:kg|%)?)/i);
    const kg=line.match(/@\s*([+]?\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*kg)\b/i);
    const pct=line.match(/(?:@|al(?:l['’])?|circa\s+il|circa)\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*%)/i);
    const bw=line.match(/\b(BW|body\s*weight|corpo\s*libero)\b/i);
    if(seq)load=seq[1].replace(/\s*[/|]\s*/g,'/').replace(/\s+/g,' ');else if(kg)load=kg[1].replace(/\s+/g,' ');else if(pct)load=pct[1].replace(/\s+/g,'');else if(bw)load='BW';
    if(!sets&&!reps&&!load&&!/\b(?:test|max|salire|top|single|triple|complex)\b/i.test(line))continue;
    out.push(normalizedRow({id:uid(),exercise,sets,reps,load,notes:''}));
  }
  return out;
}
function rowHtml(r={}){
  const x={id:r.id||uid(),exercise:r.exercise||'',sets:r.sets??'',reps:r.reps??'',load:r.load??'',notes:r.notes||''};
  return `<div class="ae-log-row v024-row" data-v024-row="${esc(x.id)}">
    <div class="field ae-log-exercise"><label>Esercizio</label><input data-v024-field="exercise" list="v024ExerciseList" value="${esc(x.exercise)}" placeholder="Es. Snatch"></div>
    <div class="field"><label>Serie</label><input data-v024-field="sets" inputmode="numeric" value="${esc(x.sets)}" placeholder="5"></div>
    <div class="field"><label>Rep</label><input data-v024-field="reps" value="${esc(x.reps)}" placeholder="1 / 1+1 / max"></div>
    <div class="field v024-load"><label>Carico/i per serie</label><input data-v024-field="load" value="${esc(x.load)}" placeholder="60/65/70/75/80 kg"><small>Un carico unico oppure la sequenza dei set separata da /</small></div>
    <div class="field ae-log-notes"><label>Note</label><input data-v024-field="notes" value="${esc(x.notes)}" placeholder="Tecnica, RPE, modifiche..."></div>
    <button type="button" class="icon-btn ae-log-remove" data-v024-remove aria-label="Rimuovi esercizio">✕</button>
  </div>`;
}
function label(v){return ({main:'Principale',reduced:'Ridotta',custom:'Personalizzata',skip:'Skip'})[v]||'Personalizzata'}
function plannedFor(x,v){return v==='reduced'?String(x.reducedText||''):v==='main'?String(x.mainText||''):''}
function rowsFromVersion(x,v){const rows=parsePlannedRows(plannedFor(x,v));return rows.length?rows:[{}]}
function modalOpen(title,html,subtitle=''){
  const back=document.getElementById('modalBackdrop'),t=document.getElementById('modalTitle'),s=document.getElementById('modalSubtitle'),b=document.getElementById('modalBody');if(!back||!t||!b)return;
  t.textContent=title;if(s)s.textContent=subtitle;b.innerHTML=html;back.classList.remove('hidden');document.body.style.overflow='hidden';
}
function modalClose(){document.getElementById('modalClose')?.click()}
function collectRows(form){return [...form.querySelectorAll('[data-v024-row]')].map(row=>{const get=k=>String(row.querySelector(`[data-v024-field="${k}"]`)?.value||'').trim();return normalizedRow({id:row.dataset.v024Row||uid(),exercise:get('exercise'),sets:get('sets'),reps:get('reps'),load:get('load'),notes:get('notes')})}).filter(r=>r.exercise||r.sets||r.reps||r.load||r.notes)}
function renderRows(form,rows){const box=form.querySelector('#v024Rows');if(box)box.innerHTML=(rows?.length?rows:[{}]).map(rowHtml).join('')}
function updatePlannedPreview(form,x,version){
  const p=plannedFor(x,version),lab=form.querySelector('[data-v024-planned-label]'),body=form.querySelector('[data-v024-planned-body]');
  if(lab)lab.textContent=label(version);if(body)body.innerHTML=p?esc(p).replace(/\n/g,'<br>'):'<span class="muted">Nessuna versione programmata per questa scelta.</span>';
}
async function openLog(id){
  const s=await getState(),x=s?.adaptiveExtras?.find(a=>a.id===id);if(!x)return;
  const old=x.actualWork||{},hasSaved=!!x.actualWork;
  let version=old.version||(x.athleteChoice==='reduced'?'reduced':x.athleteChoice==='main'?'main':'main');
  if(!['main','reduced','custom','skip'].includes(version))version='main';
  const rows=hasSaved?(Array.isArray(old.rows)&&old.rows.length?old.rows:[{}]):rowsFromVersion(x,version);
  modalOpen('Registra lavoro svolto',`<form id="v024ActualForm" data-id="${esc(id)}" data-current-version="${esc(version)}" data-dirty="${hasSaved?'1':'0'}">
    <datalist id="v024ExerciseList">${EXERCISES.map(e=>`<option value="${esc(e)}"></option>`).join('')}</datalist>
    <div class="card ae-log-planned"><div><strong>${esc(x.title||'Extra adattivo')}</strong><p class="muted small">${esc(x.date||'')} · <span data-v024-planned-label>${esc(label(version))}</span></p></div><details><summary>Vedi programmato</summary><div class="ae-log-planned-text" data-v024-planned-body>${plannedFor(x,version)?esc(plannedFor(x,version)).replace(/\n/g,'<br>'):'<span class="muted">Nessuna versione programmata per questa scelta.</span>'}</div></details></div>
    <div class="form-grid two"><div class="field"><label>Versione realmente eseguita</label><select name="version" data-v024-version><option value="main" ${version==='main'?'selected':''}>Principale</option><option value="reduced" ${version==='reduced'?'selected':''}>Ridotta</option><option value="custom" ${version==='custom'?'selected':''}>Personalizzata / modificata</option><option value="skip" ${version==='skip'?'selected':''}>Skip</option></select></div><div class="field"><label>Stato</label><label class="ae-log-complete"><input type="checkbox" name="completed" ${old.completed!==false?'checked':''}> Considera il lavoro completato</label></div></div>
    <div class="v024-info">Quando passi da <b>Principale</b> a <b>Ridotta</b> (o viceversa), puoi caricare direttamente quella versione e modificarla. Per carichi a salire usa ad esempio <b>60/65/70/75/80 kg</b>.</div>
    <div class="ae-log-heading-row"><div><h3 class="ae-log-heading">Esercizi realmente svolti</h3><p class="muted tiny">Modifica liberamente esercizi, serie, reps e carichi.</p></div><button type="button" class="button ghost small" data-v024-reset>↺ Ripristina questa versione</button></div>
    <div id="v024Rows">${rows.map(rowHtml).join('')}</div>
    <button type="button" class="button secondary small" data-v024-add>＋ Aggiungi esercizio</button>
    <h3 class="ae-log-heading">Riepilogo</h3>
    <div class="form-grid two"><div class="field"><label>Durata Extra</label><input name="duration" value="${esc(old.duration||'')}" placeholder="Es. 25 min"></div><div class="field"><label>RPE Extra (1–10)</label><input name="rpe" type="number" min="1" max="10" step="0.5" value="${esc(old.rpe||'')}"></div><div class="field full"><label>Note finali</label><textarea name="notes" rows="4" placeholder="Sensazioni, modifiche, interferenza della classe...">${esc(old.notes||'')}</textarea></div></div>
    <div class="actions end"><button type="button" class="button ghost" data-v024-cancel>Annulla</button><button type="submit" class="button accent">Salva resoconto</button></div>
  </form>`,'Il resoconto resta strutturato per le future statistiche del coach.');
}
async function saveLog(form){
  const s=await getState(),x=s?.adaptiveExtras?.find(a=>a.id===form.dataset.id);if(!x)return;
  const fd=new FormData(form),version=String(fd.get('version')||'custom'),rows=collectRows(form),completed=fd.get('completed')==='on';
  const rr=String(fd.get('rpe')||'').trim(),rpe=rr===''?'':Math.max(1,Math.min(10,Number(rr)||1));
  x.actualWork={schema:3,version,rows,duration:String(fd.get('duration')||'').trim(),rpe,notes:String(fd.get('notes')||'').trim(),completed,source:'editable_planned_copy_v3',updatedAt:new Date().toISOString(),completedAt:completed?(x.actualWork?.completedAt||new Date().toISOString()):''};
  x.completed=completed||version==='skip';x.completedAt=x.completed?(x.completedAt||new Date().toISOString()):'';
  if(['main','reduced','skip'].includes(version))x.athleteChoice=version;
  await saveState(s);modalClose();
  setTimeout(()=>{const n=document.createElement('span');n.hidden=true;APP.appendChild(n);n.remove();},50);
}
async function changeVersion(form,next){
  const s=await getState(),x=s?.adaptiveExtras?.find(a=>a.id===form.dataset.id);if(!x)return;
  const prev=form.dataset.currentVersion||'main';
  if(next===prev){updatePlannedPreview(form,x,next);return}
  if(next==='custom'){form.dataset.currentVersion=next;updatePlannedPreview(form,x,next);return}
  const current=collectRows(form),dirty=form.dataset.dirty==='1';
  if((dirty||current.length)&&!confirm(`Caricare la versione ${label(next)}? Le righe attuali verranno sostituite.`)){
    form.querySelector('[data-v024-version]').value=prev;return;
  }
  renderRows(form,next==='skip'?[{}]:rowsFromVersion(x,next));form.dataset.currentVersion=next;form.dataset.dirty='0';updatePlannedPreview(form,x,next);
}
function migrateButtons(){
  document.querySelectorAll('.ae-actions button[data-ae-log-open]').forEach(btn=>{
    const id=btn.dataset.aeLogOpen;if(!id)return;btn.removeAttribute('data-ae-log-open');btn.dataset.v024Open=id;btn.textContent=btn.textContent.includes('Modifica')?'✎ Modifica svolto':'✓ Registra svolto';
    const actions=btn.closest('.ae-actions');if(actions&&!actions.querySelector('[data-v024-old-marker]')){const marker=document.createElement('span');marker.hidden=true;marker.dataset.aeLogOpen=id;marker.dataset.v024OldMarker='1';actions.appendChild(marker)}
  });
}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-v024-open]');if(open){e.preventDefault();e.stopPropagation();openLog(open.dataset.v024Open);return}
  const form=e.target.closest('#v024ActualForm');if(!form)return;
  if(e.target.closest('[data-v024-add]')){e.preventDefault();form.querySelector('#v024Rows')?.insertAdjacentHTML('beforeend',rowHtml({}));form.dataset.dirty='1';return}
  const rem=e.target.closest('[data-v024-remove]');if(rem){e.preventDefault();const row=rem.closest('[data-v024-row]'),box=form.querySelector('#v024Rows');if(row&&box){if(box.querySelectorAll('[data-v024-row]').length>1)row.remove();else row.querySelectorAll('input').forEach(i=>i.value='');form.dataset.dirty='1'}return}
  if(e.target.closest('[data-v024-reset]')){e.preventDefault();const v=form.querySelector('[data-v024-version]')?.value||'main';changeVersion(form.dataset.currentVersion===v?form:{...form},v);(async()=>{const s=await getState(),x=s?.adaptiveExtras?.find(a=>a.id===form.dataset.id);if(!x)return;if(!plannedFor(x,v)){alert('Non c’è una versione programmata da riportare.');return}if(collectRows(form).length&&!confirm(`Ripristinare la versione ${label(v)}?`))return;renderRows(form,rowsFromVersion(x,v));form.dataset.currentVersion=v;form.dataset.dirty='0';updatePlannedPreview(form,x,v)})();return}
  if(e.target.closest('[data-v024-cancel]')){e.preventDefault();modalClose();return}
},true);
document.addEventListener('change',e=>{const form=e.target.closest('#v024ActualForm');if(!form)return;if(e.target.matches('[data-v024-version]')){changeVersion(form,e.target.value);return}form.dataset.dirty='1'},true);
document.addEventListener('input',e=>{const form=e.target.closest('#v024ActualForm');if(form&&!e.target.matches('[data-v024-version]'))form.dataset.dirty='1'},true);
document.addEventListener('submit',e=>{if(e.target?.id==='v024ActualForm'){e.preventDefault();e.stopImmediatePropagation();saveLog(e.target)}},true);

let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(migrateButtons,60)}).observe(APP,{childList:true,subtree:true});
const style=document.createElement('style');style.textContent=`
[data-v024-old-marker]{display:none!important}.v024-info{margin:10px 0;padding:9px 10px;border-radius:10px;background:color-mix(in srgb,var(--brand) 6%,white);border:1px solid color-mix(in srgb,var(--brand) 15%,var(--line));font-size:.69rem;line-height:1.45;color:var(--muted)}.v024-load small{display:block;margin-top:3px;font-size:.58rem;color:var(--muted)}
@media(max-width:850px){.v024-row{grid-template-columns:1.4fr 68px 86px minmax(145px,1.2fr) 38px}.v024-row .ae-log-notes{grid-column:1/-2}}
@media(max-width:600px){.v024-row{grid-template-columns:1fr 1fr}.v024-row .ae-log-exercise,.v024-row .v024-load,.v024-row .ae-log-notes{grid-column:1/-1}.v024-row [data-v024-remove]{grid-column:2;justify-self:end}}
`;
document.head.appendChild(style);
setTimeout(migrateButtons,150);
console.info(`Training Journal adaptive actual-work v${PATCH_VERSION} loaded`);
})();
