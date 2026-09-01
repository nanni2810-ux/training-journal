(() => {
'use strict';
const PATCH_VERSION='0.2.2';
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
  [/bar\s*muscle[- ]?up|\bbmu\b/i,'Bar Muscle-Up'],[/ring\s*muscle[- ]?up|\brmu\b/i,'Ring Muscle-Up'],[/strict\s*hspu|strict\s*handstand/i,'Strict HSPU'],
  [/\bhspu\b|handstand\s*push/i,'HSPU'],[/snatch\s*pull|tirata\s*strappo/i,'Snatch Pull'],[/\bsnatch\b|\bstrappo\b/i,'Snatch'],
  [/clean\s*(?:&|and)\s*jerk|\bslancio\b/i,'Clean & Jerk'],[/clean\s*pull|tirata\s*slancio/i,'Clean Pull'],[/front\s*squat/i,'Front Squat'],[/back\s*squat/i,'Back Squat'],
  [/\bclean\b|\bgirata\b/i,'Clean'],[/deadlift|\bstacco\b/i,'Deadlift']
];

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function uid(){return `aer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
async function getState(){const s=await TJDB.get(STATE_KEY);if(!s)return null;if(!Array.isArray(s.adaptiveExtras))s.adaptiveExtras=[];return s}
async function saveState(s){if(!s)return;s.appVersion=PATCH_VERSION;await TJDB.set(STATE_KEY,s)}
function openModal(title,html,subtitle=''){
  const back=document.getElementById('modalBackdrop'),t=document.getElementById('modalTitle'),sub=document.getElementById('modalSubtitle'),body=document.getElementById('modalBody');
  if(!back||!t||!body)return;t.textContent=title;if(sub)sub.textContent=subtitle;body.innerHTML=html;back.classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeModal(){document.getElementById('modalClose')?.click()}
function canonicalExercise(v){const s=String(v||'').trim();for(const [r,c] of CANON)if(r.test(s))return c;return s}
function num(v){const m=String(v??'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):null}
function loadKind(v){const s=String(v||'').trim().toLowerCase();if(!s)return'none';if(/\bbw\b|body\s*weight|corpo\s*libero/.test(s))return'bodyweight';if(/^\s*\+/.test(s))return'external_plus';if(/%/.test(s))return'percent';return'absolute'}
function normalizedRow(r){
  const setsN=num(r.sets),repsN=num(r.reps),loadN=num(r.load),kind=loadKind(r.load);
  const totalReps=setsN!=null&&repsN!=null?setsN*repsN:null;
  const tonnageKg=totalReps!=null&&loadN!=null&&['absolute','external_plus'].includes(kind)?Math.round(totalReps*loadN*100)/100:null;
  return {...r,exerciseKey:canonicalExercise(r.exercise),setsNumber:setsN,repsNumber:repsN,loadKg:loadN,loadKind:kind,totalReps,tonnageKg};
}
function rowHtml(r={}){
  const x={id:r.id||uid(),exercise:r.exercise||'',sets:r.sets??'',reps:r.reps??'',load:r.load??'',notes:r.notes||''};
  return `<div class="ae-log-row" data-ae-log-row="${esc(x.id)}">
    <div class="field ae-log-exercise"><label>Esercizio</label><input data-ae-log-field="exercise" list="aeExerciseList" value="${esc(x.exercise)}" placeholder="Es. Weighted Pull-Up"></div>
    <div class="field"><label>Serie</label><input data-ae-log-field="sets" inputmode="numeric" value="${esc(x.sets)}" placeholder="4"></div>
    <div class="field"><label>Rep</label><input data-ae-log-field="reps" inputmode="numeric" value="${esc(x.reps)}" placeholder="3"></div>
    <div class="field"><label>Carico</label><input data-ae-log-field="load" value="${esc(x.load)}" placeholder="70 kg / +10 / BW"></div>
    <div class="field ae-log-notes"><label>Note</label><input data-ae-log-field="notes" value="${esc(x.notes)}" placeholder="Tecnica, RPE set, modifiche..."></div>
    <button type="button" class="icon-btn ae-log-remove" data-ae-log-remove aria-label="Rimuovi esercizio">✕</button>
  </div>`;
}
function selectedLabel(v){return ({main:'Principale',reduced:'Ridotta',custom:'Personalizzata',skip:'Skip'})[v]||'Personalizzata'}
function actualSummary(x){
  const a=x.actualWork;if(!a||!Array.isArray(a.rows))return'';
  const rows=a.rows.filter(r=>r.exercise||r.sets||r.reps||r.load);
  const items=rows.slice(0,4).map(r=>{
    const scheme=[r.sets,r.reps].filter(Boolean).join('×');
    return `<span class="ae-log-chip"><b>${esc(r.exerciseKey||r.exercise||'Esercizio')}</b><span>${esc(scheme||'')}${r.load?`${scheme?' · ':''}${esc(r.load)}`:''}</span></span>`;
  }).join('');
  const meta=[];if(a.duration)meta.push(`Durata ${a.duration}`);if(a.rpe)meta.push(`RPE ${a.rpe}/10`);if(a.version)meta.push(selectedLabel(a.version));
  return `<div class="ae-log-summary"><div class="ae-log-summary-head"><strong>${a.completed?'✓ Lavoro svolto':'Resoconto salvato'}</strong>${meta.length?`<span>${esc(meta.join(' · '))}</span>`:''}</div>${items?`<div class="ae-log-chips">${items}${rows.length>4?`<span class="ae-log-more">+${rows.length-4}</span>`:''}</div>`:''}${a.notes?`<p>${esc(a.notes)}</p>`:''}</div>`;
}

async function openLog(id){
  const state=await getState(),x=state?.adaptiveExtras?.find(a=>a.id===id);if(!x)return;
  const old=x.actualWork||{};
  let rows=Array.isArray(old.rows)&&old.rows.length?old.rows:[{}];
  const version=old.version||(x.athleteChoice==='reduced'?'reduced':x.athleteChoice==='main'?'main':'custom');
  const planned=version==='reduced'?x.reducedText:x.mainText;
  openModal('Registra lavoro svolto',`<form id="aeActualWorkForm" data-id="${esc(id)}">
    <datalist id="aeExerciseList">${EXERCISES.map(e=>`<option value="${esc(e)}"></option>`).join('')}</datalist>
    <div class="card ae-log-planned"><div><strong>${esc(x.title||'Extra adattivo')}</strong><p class="muted small">${esc(x.date||'')} · ${esc(selectedLabel(version))}</p></div>${planned?`<details><summary>Vedi programmato</summary><div class="ae-log-planned-text">${esc(planned).replace(/\n/g,'<br>')}</div></details>`:''}</div>
    <div class="form-grid two"><div class="field"><label>Versione realmente eseguita</label><select name="version"><option value="main" ${version==='main'?'selected':''}>Principale</option><option value="reduced" ${version==='reduced'?'selected':''}>Ridotta</option><option value="custom" ${version==='custom'?'selected':''}>Personalizzata / modificata</option><option value="skip" ${version==='skip'?'selected':''}>Skip</option></select></div><div class="field"><label>Stato</label><label class="ae-log-complete"><input type="checkbox" name="completed" ${old.completed!==false?'checked':''}> Considera il lavoro completato</label></div></div>
    <h3 class="ae-log-heading">Esercizi realmente svolti</h3>
    <div id="aeActualRows">${rows.map(rowHtml).join('')}</div>
    <button type="button" class="button secondary small" data-ae-log-add>＋ Aggiungi esercizio</button>
    <h3 class="ae-log-heading">Riepilogo</h3>
    <div class="form-grid two"><div class="field"><label>Durata Extra</label><input name="duration" value="${esc(old.duration||'')}" placeholder="Es. 25 min"></div><div class="field"><label>RPE Extra (1–10)</label><input name="rpe" type="number" min="1" max="10" step="0.5" value="${esc(old.rpe||'')}"></div><div class="field full"><label>Note finali</label><textarea name="notes" rows="4" placeholder="Sensazioni, cosa è stato modificato, eventuale interferenza della classe...">${esc(old.notes||'')}</textarea></div></div>
    <div class="actions end"><button type="button" class="button ghost" data-ae-log-cancel>Annulla</button><button type="submit" class="button accent">Salva resoconto</button></div>
  </form>`,'Carichi, serie e ripetizioni restano salvati in forma strutturata per le future statistiche.');
}

function collectRows(form){
  return [...form.querySelectorAll('[data-ae-log-row]')].map(row=>{
    const get=k=>String(row.querySelector(`[data-ae-log-field="${k}"]`)?.value||'').trim();
    return normalizedRow({id:row.dataset.aeLogRow||uid(),exercise:get('exercise'),sets:get('sets'),reps:get('reps'),load:get('load'),notes:get('notes')});
  }).filter(r=>r.exercise||r.sets||r.reps||r.load||r.notes);
}
async function saveLog(form){
  const state=await getState(),x=state?.adaptiveExtras?.find(a=>a.id===form.dataset.id);if(!x)return;
  const fd=new FormData(form),rows=collectRows(form),completed=fd.get('completed')==='on',version=String(fd.get('version')||'custom');
  const rpeRaw=String(fd.get('rpe')||'').trim(),rpe=rpeRaw===''?'':Math.max(1,Math.min(10,Number(rpeRaw)||1));
  x.actualWork={schema:1,version,rows,duration:String(fd.get('duration')||'').trim(),rpe,notes:String(fd.get('notes')||'').trim(),completed,updatedAt:new Date().toISOString(),completedAt:completed?(x.actualWork?.completedAt||new Date().toISOString()):''};
  x.completed=completed||version==='skip';
  x.completedAt=x.completed?(x.completedAt||new Date().toISOString()):'';
  if(version==='main'||version==='reduced'||version==='skip')x.athleteChoice=version;
  await saveState(state);closeModal();setTimeout(enhance,100);
}

async function enhance(){
  const state=await getState();if(!state)return;
  document.querySelectorAll('.ae-card[data-ae-id]').forEach(card=>{
    const id=card.dataset.aeId,x=state.adaptiveExtras.find(a=>a.id===id);if(!x)return;
    const actions=card.querySelector('.ae-actions');
    if(actions&&!actions.querySelector('[data-ae-log-open]')){
      const b=document.createElement('button');b.type='button';b.className='button accent small';b.dataset.aeLogOpen=id;b.textContent=x.actualWork?'✎ Modifica svolto':'✓ Registra svolto';actions.appendChild(b);
    }else if(actions){const b=actions.querySelector('[data-ae-log-open]');if(b)b.textContent=x.actualWork?'✎ Modifica svolto':'✓ Registra svolto'}
    card.querySelector('.ae-log-summary')?.remove();
    if(x.actualWork){const html=actualSummary(x);const wrap=document.createElement('div');wrap.innerHTML=html;const node=wrap.firstElementChild;if(node)actions?.insertAdjacentElement('beforebegin',node)}
  });
}

document.addEventListener('click',e=>{
  const open=e.target.closest('[data-ae-log-open]');if(open){e.preventDefault();e.stopPropagation();openLog(open.dataset.aeLogOpen);return}
  if(e.target.closest('[data-ae-log-add]')){e.preventDefault();document.getElementById('aeActualRows')?.insertAdjacentHTML('beforeend',rowHtml({}));return}
  const remove=e.target.closest('[data-ae-log-remove]');if(remove){e.preventDefault();const row=remove.closest('[data-ae-log-row]'),box=document.getElementById('aeActualRows');if(row&&box){if(box.querySelectorAll('[data-ae-log-row]').length>1)row.remove();else row.querySelectorAll('input').forEach(i=>i.value='')}return}
  if(e.target.closest('[data-ae-log-cancel]')){e.preventDefault();closeModal();return}
},true);
document.addEventListener('submit',e=>{if(e.target?.id==='aeActualWorkForm'){e.preventDefault();saveLog(e.target)}},true);

let timer=null;
new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(enhance,90)}).observe(APP,{childList:true,subtree:true});

const style=document.createElement('style');style.textContent=`
.ae-log-planned{display:grid;gap:9px;margin-bottom:12px}.ae-log-planned details{border-top:1px solid var(--line);padding-top:8px}.ae-log-planned summary{cursor:pointer;font-size:.72rem;font-weight:800;color:var(--brand)}.ae-log-planned-text{margin-top:7px;font-size:.72rem;line-height:1.5;color:var(--muted)}
.ae-log-heading{font-size:.78rem;margin:15px 0 8px}.ae-log-row{display:grid;grid-template-columns:minmax(150px,1.55fr) 70px 70px 105px minmax(150px,1fr) 38px;gap:7px;align-items:end;padding:9px;border:1px solid var(--line);border-radius:12px;margin-bottom:7px;background:#fbfcfb}.ae-log-row .field{margin:0}.ae-log-row label{font-size:.62rem}.ae-log-row input{min-width:0}.ae-log-remove{margin-bottom:1px}.ae-log-complete{min-height:42px;display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;font-size:.72rem;font-weight:700}.ae-log-complete input{width:18px;height:18px}
.ae-log-summary{margin-top:10px;padding:10px 11px;border:1px solid color-mix(in srgb,var(--brand) 18%,var(--line));border-radius:11px;background:color-mix(in srgb,var(--brand) 4%,white)}.ae-log-summary-head{display:flex;justify-content:space-between;gap:8px;align-items:center}.ae-log-summary-head strong{font-size:.72rem;color:var(--brand)}.ae-log-summary-head span{font-size:.66rem;color:var(--muted)}.ae-log-chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.ae-log-chip{display:flex;gap:4px;align-items:center;border:1px solid var(--line);border-radius:999px;padding:5px 7px;font-size:.65rem;background:white}.ae-log-chip span{color:var(--muted)}.ae-log-more{font-size:.65rem;color:var(--muted);padding:5px}.ae-log-summary p{margin:7px 0 0;font-size:.68rem;color:var(--muted)}
@media(max-width:850px){.ae-log-row{grid-template-columns:1.5fr 70px 70px 105px 38px}.ae-log-notes{grid-column:1/-2}}
@media(max-width:600px){.ae-log-row{grid-template-columns:1fr 1fr}.ae-log-exercise,.ae-log-notes{grid-column:1/-1}.ae-log-remove{grid-column:2;justify-self:end}.ae-log-summary-head{align-items:flex-start;flex-direction:column}}
`;
document.head.appendChild(style);
setTimeout(enhance,120);
console.info(`Training Journal adaptive work log ${PATCH_VERSION} loaded`);
})();
