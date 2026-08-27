(() => {
'use strict';
const PATCH_VERSION='0.1.6';
const STATE_KEY='state.v1';
const STATUS_META={pending:{label:'In attesa della classe',tone:'pending'},main:{label:'Principale',tone:'main'},reduced:{label:'Ridotto',tone:'reduced'},skip:{label:'Skip consigliato',tone:'skip'}};
const PRIORITY_META={high:'Alta',medium:'Media',low:'Bassa'};
const TIMING_META={before:'Prima della classe',after:'Dopo la classe',flexible:'Indifferente'};
const FOCUS_META={
  pull_strength:'Pull Strength',bar_gymnastics:'Bar Gymnastics',muscle_up:'Muscle-Up',grip:'Grip',hspu:'HSPU',handstand:'Handstand',vertical_push:'Vertical Push',core:'Core',
  snatch:'Snatch',clean:'Clean',jerk:'Jerk',clean_jerk:'Clean & Jerk',squat:'Squat',posterior_chain:'Posterior Chain',overhead:'Overhead',
  running:'Running',erg:'Erg',metabolic:'Metabolic',lower_body:'Lower Body',upper_body:'Upper Body'
};
const FOCUS_GROUPS=[
  ['Ginnastica',['pull_strength','bar_gymnastics','muscle_up','grip','hspu','handstand','vertical_push','core']],
  ['Pesistica',['snatch','clean','jerk','clean_jerk','squat','posterior_chain','overhead']],
  ['Condizionamento',['running','erg','metabolic','lower_body','upper_body']]
];

function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;')}
function uid(){return `ae-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function fmtDate(v){if(!v)return'—';const [y,m,d]=String(v).split('-').map(Number);return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(y,(m||1)-1,d||1,12))}
function parseDate(v){if(!v)return new Date();const [y,m,d]=String(v).split('-').map(Number);return new Date(y,(m||1)-1,d||1,12)}
function daysFromToday(v){return Math.floor((parseDate(todayISO())-parseDate(v))/86400000)}
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,v))}
function lineText(v){return String(v||'').replace(/\s+/g,' ').trim()}

async function getState(){
  const s=await window.TJDB?.get?.(STATE_KEY);if(!s)return null;
  if(!Array.isArray(s.adaptiveExtras))s.adaptiveExtras=[];
  return s;
}
async function saveState(s){if(!s)return; s.appVersion=PATCH_VERSION; await window.TJDB.set(STATE_KEY,s)}

if(window.TJDB?.set){
  const previousSet=window.TJDB.set.bind(window.TJDB);
  window.TJDB.set=async(key,value)=>{
    if(key===STATE_KEY&&value&&typeof value==='object'&&!Array.isArray(value.adaptiveExtras)){
      const current=await window.TJDB.get(STATE_KEY);value.adaptiveExtras=Array.isArray(current?.adaptiveExtras)?current.adaptiveExtras:[];
    }
    return previousSet(key,value);
  };
}

function flattenWorkout(w){
  const lines=[w.title||''];
  for(const s of w.sections||[]){
    lines.push(s.title||'',s.name||'',s.format||'',s.text||'',s.intro||'');
    for(const r of s.rows||[])lines.push([r.sets,r.reps,r.exercise,r.load?`${r.load} kg`:'',r.note||''].filter(Boolean).join(' '));
    for(const x of s.items||[])lines.push(x);
  }
  return lines.flatMap(x=>String(x||'').split(/\n+/)).map(lineText).filter(Boolean);
}
function repHint(line){
  const x=line.replace(',','.');
  let m=x.match(/\b(\d+)\s*[x×]\s*(\d+)\b/i);if(m)return clamp(Number(m[1])*Number(m[2]),1,80);
  m=x.match(/^\s*(\d+)\s+/);if(m)return clamp(Number(m[1]),1,60);
  if(/amrap|for time|rounds?|emom|interval/i.test(x))return 16;
  return 8;
}
function addScore(scores,key,amount){scores[key]=clamp((scores[key]||0)+amount)}
function scoreLine(line,scores){
  const s=line.toLowerCase(),vol=repHint(line),v=Math.min(28,Math.round(vol*.55));
  const has=(r)=>r.test(s);
  if(has(/weighted pull|strict pull|pull[- ]?up|chest to bar|c2b/)){addScore(scores,'pull_strength',20+v);addScore(scores,'bar_gymnastics',12+Math.round(v*.7));addScore(scores,'grip',8+Math.round(v*.6));addScore(scores,'upper_body',8)}
  if(has(/bar muscle|bmu|ring muscle|rmu|muscle[- ]?up/)){addScore(scores,'muscle_up',28+v);addScore(scores,'bar_gymnastics',24+v);addScore(scores,'pull_strength',14+Math.round(v*.7));addScore(scores,'grip',12+Math.round(v*.6));addScore(scores,'upper_body',10)}
  if(has(/toes to bar|t2b|knees to elbow|hanging leg|rope climb/)){addScore(scores,'bar_gymnastics',18+v);addScore(scores,'grip',14+v);addScore(scores,'core',12+Math.round(v*.7));if(has(/rope climb/))addScore(scores,'pull_strength',12+v)}
  if(has(/handstand push|hspu/)){addScore(scores,'hspu',26+v);addScore(scores,'vertical_push',22+v);addScore(scores,'handstand',16+Math.round(v*.8));addScore(scores,'upper_body',12)}
  if(has(/handstand walk|hsw|handstand hold|wall walk/)){addScore(scores,'handstand',25+v);addScore(scores,'vertical_push',10+Math.round(v*.6));addScore(scores,'upper_body',8)}
  if(has(/strict press|military press|push press|shoulder press|dumbbell press/)){addScore(scores,'vertical_push',22+v);addScore(scores,'overhead',16+Math.round(v*.8));addScore(scores,'upper_body',12)}
  if(has(/snatch|strappo/)){addScore(scores,'snatch',28+v);addScore(scores,'overhead',15+Math.round(v*.8));addScore(scores,'posterior_chain',10+Math.round(v*.6));addScore(scores,'lower_body',8)}
  if(has(/clean(?! and jerk)|girata/)){addScore(scores,'clean',26+v);addScore(scores,'posterior_chain',12+Math.round(v*.7));addScore(scores,'squat',8+Math.round(v*.5));addScore(scores,'lower_body',10)}
  if(has(/clean\s*(?:&|and)\s*jerk|clean & jerk|slancio/)){addScore(scores,'clean_jerk',30+v);addScore(scores,'clean',18+Math.round(v*.7));addScore(scores,'jerk',18+Math.round(v*.7));addScore(scores,'overhead',14+Math.round(v*.6));addScore(scores,'lower_body',10)}
  if(has(/split jerk|power jerk|push jerk|squat jerk|\bjerk\b/)){addScore(scores,'jerk',26+v);addScore(scores,'overhead',20+Math.round(v*.7));addScore(scores,'vertical_push',10+Math.round(v*.5))}
  if(has(/front squat|back squat|overhead squat|air squat|goblet squat|thruster|wall ball/)){addScore(scores,'squat',18+v);addScore(scores,'lower_body',18+Math.round(v*.7));if(has(/thruster|wall ball|overhead squat/))addScore(scores,'overhead',8+Math.round(v*.4))}
  if(has(/deadlift|stacco|romanian|rdl|good morning|snatch pull|clean pull|tirata/)){addScore(scores,'posterior_chain',22+v);addScore(scores,'lower_body',12+Math.round(v*.7))}
  if(has(/\brun\b|running|corsa|sprint|\d+\s*m(?:eter|etri)?\b/)){addScore(scores,'running',20+v);addScore(scores,'metabolic',12+Math.round(v*.7));addScore(scores,'lower_body',10)}
  if(has(/row|rower|skierg|ski erg|bikeerg|bike erg|assault bike|echo bike|air bike/)){addScore(scores,'erg',20+v);addScore(scores,'metabolic',16+Math.round(v*.7));if(has(/row|skierg|ski erg/))addScore(scores,'grip',6+Math.round(v*.3))}
  if(has(/burpee|box jump|double under|single under|devil press|kettlebell swing/)){addScore(scores,'metabolic',14+v);addScore(scores,'lower_body',8+Math.round(v*.5));if(has(/devil press|kettlebell swing/))addScore(scores,'posterior_chain',8+Math.round(v*.4))}
  if(has(/plank|hollow|arch hold|sit[- ]?up|ghd|dead bug|pallof|russian twist/))addScore(scores,'core',18+v);
}
function analyzeClass(state,date){
  const workouts=(state.workouts||[]).filter(w=>w.date===date);
  if(!workouts.length)return{hasClass:false,scores:{},workouts:[],lines:[]};
  const scores={},lines=[];for(const w of workouts){const wl=flattenWorkout(w);lines.push(...wl);for(const l of wl)scoreLine(l,scores)}
  return{hasClass:true,scores,workouts,lines};
}
function overlapFor(extra,analysis){
  const focuses=Array.isArray(extra.focus)?extra.focus:[];
  const rows=focuses.map(k=>({key:k,label:FOCUS_META[k]||k,score:analysis.scores[k]||0})).sort((a,b)=>b.score-a.score);
  const top=rows[0]?.score||0,second=rows[1]?.score||0,weighted=clamp(Math.round(top*.72+second*.28));
  return{rows,score:weighted};
}
function recommendation(extra,analysis){
  if(!analysis.hasClass)return{status:'pending',reason:'Inserisci o importa la classe del giorno: l’Extra verrà ricalcolato automaticamente.',overlap:{rows:[],score:0}};
  const overlap=overlapFor(extra,analysis),priority=extra.priority||'medium';
  const thresholds=priority==='high'?{reduce:45,skip:82}:priority==='low'?{reduce:25,skip:58}:{reduce:35,skip:70};
  let status=overlap.score>=thresholds.skip?'skip':overlap.score>=thresholds.reduce?'reduced':'main';
  const relevant=overlap.rows.filter(x=>x.score>=20).slice(0,3);
  const words=relevant.map(x=>`${x.label} (${x.score>=70?'alto':x.score>=40?'medio':'presente'})`).join(', ');
  let reason='Nessuna sovrapposizione rilevante con la classe: mantieni il lavoro programmato.';
  if(status==='reduced')reason=`La classe crea una sovrapposizione significativa su ${words||'i focus dell’Extra'}. Manteniamo lo stimolo principale e togliamo volume/accessori.`;
  if(status==='skip')reason=`La classe copre già in modo elevato ${words||'i focus dell’Extra'}. Lo skip è programmato e non viene conteggiato come allenamento mancato.`;
  return{status,reason,overlap,thresholds};
}
function intensityLabel(v){return v>=70?'Alto':v>=40?'Medio':v>=20?'Presente':'Basso'}
function focusChips(keys=[]){return keys.map(k=>`<span class="ae-focus-chip">${esc(FOCUS_META[k]||k)}</span>`).join('')}
function textAsProgram(v){const rows=String(v||'').split(/\n+/).map(x=>x.trim()).filter(Boolean);return rows.length?`<div class="ae-program">${rows.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:'<p class="muted small">Nessun lavoro inserito.</p>'}

function editorHtml(extra,date){
  const x=extra||{id:'',date:date||todayISO(),title:'',priority:'high',focus:[],timing:'before',duration:'20–25 min',mainText:'',reducedText:'',skipRules:'',notes:'',athleteChoice:'',completed:false};
  return `<form id="aeEditor" data-id="${esc(x.id||'')}">
    <div class="form-grid two"><div class="field"><label>Data</label><input name="date" type="date" value="${esc(x.date||date||todayISO())}" required></div><div class="field"><label>Nome Extra</label><input name="title" value="${esc(x.title||'')}" placeholder="Es. Pull Strength A" required></div></div>
    <div class="form-grid three"><div class="field"><label>Priorità</label><select name="priority"><option value="high" ${x.priority==='high'?'selected':''}>Alta</option><option value="medium" ${x.priority==='medium'?'selected':''}>Media</option><option value="low" ${x.priority==='low'?'selected':''}>Bassa</option></select></div><div class="field"><label>Quando</label><select name="timing"><option value="before" ${x.timing==='before'?'selected':''}>Prima della classe</option><option value="after" ${x.timing==='after'?'selected':''}>Dopo la classe</option><option value="flexible" ${x.timing==='flexible'?'selected':''}>Indifferente</option></select></div><div class="field"><label>Durata</label><input name="duration" value="${esc(x.duration||'')}" placeholder="20–25 min"></div></div>
    <div class="field"><label>Focus</label><div class="ae-focus-picker">${FOCUS_GROUPS.map(([g,items])=>`<div class="ae-focus-group"><strong>${g}</strong><div>${items.map(k=>`<label class="ae-check"><input type="checkbox" name="focus" value="${k}" ${(x.focus||[]).includes(k)?'checked':''}><span>${esc(FOCUS_META[k])}</span></label>`).join('')}</div></div>`).join('')}</div></div>
    <div class="form-grid two"><div class="field"><label>Versione principale</label><textarea name="mainText" rows="8" placeholder="Weighted Pull-Up 5×3\nHigh Pull 4×3\nScap Pull-Up 3×8">${esc(x.mainText||'')}</textarea></div><div class="field"><label>Versione ridotta</label><textarea name="reducedText" rows="8" placeholder="Weighted Pull-Up 3×3\nHigh Pull 2×3">${esc(x.reducedText||'')}</textarea></div></div>
    <div class="field"><label>Condizioni / note per lo Skip</label><textarea name="skipRules" rows="3" placeholder="Es. forte volume di C2B / BMU / Pull-Up nella classe">${esc(x.skipRules||'')}</textarea></div>
    <div class="field"><label>Note coach</label><textarea name="notes" rows="3" placeholder="Es. qualità prima del volume">${esc(x.notes||'')}</textarea></div>
    <div class="actions end"><button type="button" class="button ghost" data-ae-close>Annulla</button>${x.id?`<button type="button" class="button danger small" data-ae-delete="${esc(x.id)}">Elimina</button>`:''}<button type="submit" class="button accent">Salva Extra</button></div>
  </form>`;
}
function openModal(title,html,subtitle=''){
  const back=document.getElementById('modalBackdrop'),t=document.getElementById('modalTitle'),s=document.getElementById('modalSubtitle'),b=document.getElementById('modalBody');if(!back||!t||!b)return;
  t.textContent=title;s.textContent=subtitle;b.innerHTML=html;back.classList.remove('hidden');document.body.style.overflow='hidden';setTimeout(()=>b.querySelector('input,select,textarea,button')?.focus(),30);
}
function closeModal(){document.getElementById('modalClose')?.click()}
async function openEditor(id,date){const state=await getState();if(!state)return;const extra=id?(state.adaptiveExtras||[]).find(x=>x.id===id):null;openModal(extra?'Modifica Extra adattivo':'Nuovo Extra adattivo',editorHtml(extra,date),extra?'Principale, ridotto e regole di adattamento':'L’Extra si adatta automaticamente alla classe del giorno')}

function cardHtml(extra,state,compact=false){
  const analysis=analyzeClass(state,extra.date),rec=recommendation(extra,analysis),meta=STATUS_META[rec.status],chosen=extra.athleteChoice||'',effective=chosen||rec.status;
  const displayVersion=effective==='reduced'?extra.reducedText:effective==='skip'?'':extra.mainText;
  const choiceLabel=chosen?`Scelta atleta: ${chosen==='main'?'Principale':chosen==='reduced'?'Ridotto':'Skip'}`:`Suggerimento: ${meta.label}`;
  return `<article class="card ae-card ae-${meta.tone}" data-ae-id="${esc(extra.id)}">
    <div class="ae-card-head"><div><div class="ae-eyebrow">EXTRA ADATTIVO · PRIORITÀ ${esc((PRIORITY_META[extra.priority]||'Media').toUpperCase())}</div><h3>${esc(extra.title||'Extra adattivo')}</h3></div><span class="ae-status ${meta.tone}">${esc(meta.label)}</span></div>
    <div class="ae-meta"><span>🕒 ${esc(TIMING_META[extra.timing]||'Indifferente')}</span>${extra.duration?`<span>⏱ ${esc(extra.duration)}</span>`:''}<span>📅 ${esc(fmtDate(extra.date))}</span></div>
    <div class="ae-focus-row">${focusChips(extra.focus||[])}</div>
    ${compact?'':`<div class="ae-reason"><strong>${esc(choiceLabel)}</strong><p>${esc(rec.reason)}</p></div>${effective!=='skip'?`<div class="ae-version"><span>${effective==='reduced'?'Versione ridotta':'Versione principale'}</span>${textAsProgram(displayVersion)}</div>`:''}`}
    <div class="ae-actions"><button class="button ${rec.status==='main'?'accent':'ghost'} small" data-ae-choice="main" data-id="${esc(extra.id)}">Principale</button><button class="button ${rec.status==='reduced'?'accent':'ghost'} small" data-ae-choice="reduced" data-id="${esc(extra.id)}">Ridotto</button><button class="button ${rec.status==='skip'?'secondary':'ghost'} small" data-ae-choice="skip" data-id="${esc(extra.id)}">Salta</button><button class="button ghost small" data-ae-why="${esc(extra.id)}">Perché?</button><button class="button ghost small" data-ae-edit="${esc(extra.id)}">Modifica</button>${chosen&&chosen!=='skip'?`<button class="button ${extra.completed?'secondary':'accent'} small" data-ae-complete="${esc(extra.id)}">${extra.completed?'✓ Completato':'Segna completato'}</button>`:''}</div>
  </article>`;
}
function summaryForDate(state,date){return (state.adaptiveExtras||[]).filter(x=>x.date===date).sort((a,b)=>(a.title||'').localeCompare(b.title||''))}

async function renderHomeExtra(){
  const page=document.querySelector('#app .page'),hero=page?.querySelector('.hero');if(!page||!hero)return;
  let box=document.getElementById('aeHomeSection');if(box)box.remove();
  const state=await getState();if(!state)return;const date=todayISO(),extras=summaryForDate(state,date);
  box=document.createElement('section');box.id='aeHomeSection';box.className='ae-section';
  box.innerHTML=`<div class="ae-section-title"><div><h2 class="section-title">Extra adattivo</h2><p class="muted small">Il lavoro si adatta automaticamente alla classe di oggi.</p></div><button class="button secondary small" data-ae-new="${date}">＋ Extra</button></div>${extras.length?extras.map(x=>cardHtml(x,state,false)).join(''):`<div class="card ae-empty"><div><strong>Nessun Extra programmato oggi</strong><p class="muted small">Puoi aggiungere un richiamo di ginnastica, pesistica o condizionamento.</p></div><button class="button ghost small" data-ae-new="${date}">Crea Extra</button></div>`}`;
  const todayHeading=[...page.querySelectorAll('h2.section-title')].find(h=>h.textContent.trim()==='Oggi');if(todayHeading)todayHeading.parentNode.insertBefore(box,todayHeading);else page.appendChild(box);
}
async function renderDayExtra(){
  const page=document.querySelector('#app .page');if(!page||page.querySelector('.hero'))return;
  const dateButton=page.querySelector('[data-action="new-workout"][data-date]');if(!dateButton)return;
  const date=dateButton.dataset.date;if(!date)return;
  let box=document.getElementById('aeDaySection');if(box)box.remove();const state=await getState();if(!state)return;const extras=summaryForDate(state,date);
  box=document.createElement('section');box.id='aeDaySection';box.className='ae-section';box.innerHTML=`<div class="ae-section-title"><div><h2 class="section-title">Extra adattivo</h2><p class="muted small">${esc(fmtDate(date))}</p></div><button class="button secondary small" data-ae-new="${date}">＋ Extra</button></div>${extras.length?extras.map(x=>cardHtml(x,state,false)).join(''):`<div class="card ae-empty"><span class="muted">Nessun Extra programmato.</span><button class="button ghost small" data-ae-new="${date}">Crea Extra</button></div>`}`;
  const head=page.querySelector('.page-head');if(head)head.insertAdjacentElement('afterend',box);else page.prepend(box);
}
async function renderCalendarBadges(){
  const state=await getState();if(!state)return;document.querySelectorAll('.calendar-day[data-date]').forEach(day=>{day.querySelector('.ae-calendar-dot')?.remove();const xs=summaryForDate(state,day.dataset.date);if(!xs.length)return;const b=document.createElement('span');b.className='ae-calendar-dot';b.title=`${xs.length} Extra adattiv${xs.length===1?'o':'i'}`;b.textContent=`＋${xs.length}`;day.appendChild(b)})
}
async function renderProgressExtras(){
  const page=document.querySelector('#app .page');if(!page||![...page.querySelectorAll('h1')].some(h=>h.textContent.trim()==='Progressi'))return;
  document.getElementById('aeProgressSection')?.remove();const state=await getState();if(!state)return;const extras=(state.adaptiveExtras||[]).filter(x=>daysFromToday(x.date)>=0&&daysFromToday(x.date)<=28);
  if(!extras.length)return;
  const counts={main:0,reduced:0,skip:0,missed:0};for(const x of extras){const rec=recommendation(x,analyzeClass(state,x.date)),choice=x.athleteChoice;if(choice==='skip')counts.skip++;else if(x.completed&&choice==='reduced')counts.reduced++;else if(x.completed)counts.main++;else if(daysFromToday(x.date)>0&&rec.status!=='skip')counts.missed++;}
  const box=document.createElement('section');box.id='aeProgressSection';box.className='ae-section';box.innerHTML=`<h2 class="section-title">Extra adattivi · 4 settimane</h2><div class="grid four"><div class="card stat"><span>Principali completati</span><strong>${counts.main}</strong></div><div class="card stat"><span>Ridotti completati</span><strong>${counts.reduced}</strong></div><div class="card stat"><span>Skip programmati</span><strong>${counts.skip}</strong></div><div class="card stat"><span>Non eseguiti</span><strong>${counts.missed}</strong></div></div><div class="list ae-recent">${[...extras].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(x=>{const rec=recommendation(x,analyzeClass(state,x.date));return `<div class="list-item clickable" data-ae-edit="${esc(x.id)}"><div class="avatar">↔</div><div class="grow"><h3>${esc(x.title)}</h3><p>${esc(fmtDate(x.date))} · ${esc(STATUS_META[rec.status].label)} · ${esc(PRIORITY_META[x.priority]||'Media')}</p></div><span class="badge">${x.athleteChoice?esc(x.athleteChoice==='main'?'Principale':x.athleteChoice==='reduced'?'Ridotto':'Skip'):'—'}</span></div>`}).join('')}</div>`;
  const first=page.querySelector('.grid.three,.grid.four');if(first)first.insertAdjacentElement('afterend',box);else page.appendChild(box);
}

async function whyModal(id){
  const state=await getState(),extra=state?.adaptiveExtras?.find(x=>x.id===id);if(!extra)return;const analysis=analyzeClass(state,extra.date),rec=recommendation(extra,analysis);
  const focusRows=(rec.overlap.rows||[]).map(x=>`<div class="ae-load-row"><span>${esc(x.label)}</span><div><i style="width:${clamp(x.score)}%"></i></div><b>${esc(intensityLabel(x.score))}</b></div>`).join('');
  const classNames=analysis.workouts.map(w=>w.title||'Allenamento').join(' · ');
  openModal(`Perché ${STATUS_META[rec.status].label}?`,`<div class="ae-why"><div class="detail-hero"><span>Extra adattivo</span><strong>${esc(extra.title)}</strong><small>Priorità ${esc(PRIORITY_META[extra.priority]||'Media')} · ${esc(fmtDate(extra.date))}</small></div><div class="card"><strong>Decisione consigliata: ${esc(STATUS_META[rec.status].label)}</strong><p>${esc(rec.reason)}</p>${analysis.hasClass?`<p class="muted small">Classe analizzata: ${esc(classNames)}</p>`:'<p class="muted small">Nessuna classe disponibile in questa data.</p>'}</div>${focusRows?`<div class="card"><strong>Sovrapposizione sui focus</strong><div class="ae-load-list">${focusRows}</div></div>`:''}${extra.skipRules?`<div class="card"><strong>Regola coach per lo Skip</strong><p>${esc(extra.skipRules)}</p></div>`:''}${extra.notes?`<div class="card"><strong>Nota coach</strong><p>${esc(extra.notes)}</p></div>`:''}</div>`,'La raccomandazione considera classe del giorno, focus e priorità dell’Extra')
}

async function setChoice(id,choice){const state=await getState(),x=state?.adaptiveExtras?.find(a=>a.id===id);if(!x)return;x.athleteChoice=choice;x.choiceAt=new Date().toISOString();if(choice==='skip'){x.completed=true;x.completedAt=new Date().toISOString()}else{x.completed=false;x.completedAt=''}await saveState(state);schedule()}
async function toggleComplete(id){const state=await getState(),x=state?.adaptiveExtras?.find(a=>a.id===id);if(!x)return;x.completed=!x.completed;x.completedAt=x.completed?new Date().toISOString():'';await saveState(state);schedule()}
async function deleteExtra(id){if(!confirm('Eliminare questo Extra adattivo?'))return;const state=await getState();if(!state)return;state.adaptiveExtras=(state.adaptiveExtras||[]).filter(x=>x.id!==id);await saveState(state);closeModal();schedule()}
async function saveEditor(form){
  const fd=new FormData(form),state=await getState();if(!state)return;const id=form.dataset.id||uid(),old=(state.adaptiveExtras||[]).find(x=>x.id===id)||{};
  const x={...old,id,date:fd.get('date')||todayISO(),title:String(fd.get('title')||'').trim(),priority:fd.get('priority')||'medium',timing:fd.get('timing')||'flexible',duration:String(fd.get('duration')||'').trim(),focus:fd.getAll('focus'),mainText:String(fd.get('mainText')||'').trim(),reducedText:String(fd.get('reducedText')||'').trim(),skipRules:String(fd.get('skipRules')||'').trim(),notes:String(fd.get('notes')||'').trim(),updatedAt:new Date().toISOString()};
  if(!x.title){alert('Inserisci un nome per l’Extra.');return}if(!x.focus.length){alert('Seleziona almeno un focus.');return}if(!old.createdAt)x.createdAt=new Date().toISOString();
  const i=(state.adaptiveExtras||[]).findIndex(a=>a.id===id);if(i>=0)state.adaptiveExtras[i]=x;else state.adaptiveExtras.push(x);await saveState(state);closeModal();schedule();
}

function ensureHeroShortcut(){
  const hero=document.querySelector('#app .hero .actions');if(!hero||hero.querySelector('[data-ae-new]'))return;const date=hero.querySelector('[data-action="new-workout"]')?.dataset.date||todayISO();const b=document.createElement('button');b.className='button secondary';b.dataset.aeNew=date;b.textContent='↔ Extra adattivo';hero.appendChild(b);
}

let rendering=false,timer=null;
async function enhance(){if(rendering)return;rendering=true;try{ensureHeroShortcut();await Promise.all([renderHomeExtra(),renderDayExtra(),renderCalendarBadges(),renderProgressExtras()])}finally{rendering=false}}
function schedule(){clearTimeout(timer);timer=setTimeout(enhance,90)}

document.addEventListener('click',e=>{
  const n=e.target.closest('[data-ae-new]');if(n){e.preventDefault();openEditor('',n.dataset.aeNew);return}
  const ed=e.target.closest('[data-ae-edit]');if(ed){e.preventDefault();openEditor(ed.dataset.aeEdit);return}
  const wh=e.target.closest('[data-ae-why]');if(wh){e.preventDefault();whyModal(wh.dataset.aeWhy);return}
  const ch=e.target.closest('[data-ae-choice]');if(ch){e.preventDefault();setChoice(ch.dataset.id,ch.dataset.aeChoice);return}
  const co=e.target.closest('[data-ae-complete]');if(co){e.preventDefault();toggleComplete(co.dataset.aeComplete);return}
  const del=e.target.closest('[data-ae-delete]');if(del){e.preventDefault();deleteExtra(del.dataset.aeDelete);return}
  if(e.target.closest('[data-ae-close]')){e.preventDefault();closeModal();return}
},true);
document.addEventListener('submit',e=>{if(e.target?.id==='aeEditor'){e.preventDefault();saveEditor(e.target)}},true);
new MutationObserver(schedule).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});

const style=document.createElement('style');style.textContent=`
.ae-section{margin-top:12px}.ae-section-title{display:flex;align-items:flex-end;justify-content:space-between;gap:12px}.ae-section-title .section-title{margin-bottom:2px}.ae-card{border-left:3px solid var(--line);margin-top:8px}.ae-card.ae-main{border-left-color:#2f8f65}.ae-card.ae-reduced{border-left-color:#d1933d}.ae-card.ae-skip{border-left-color:#899596}.ae-card.ae-pending{border-left-color:#829bb0}.ae-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.ae-card h3{margin:3px 0 0;font-size:1rem}.ae-eyebrow{font-size:.66rem;font-weight:850;letter-spacing:.08em;color:var(--muted)}.ae-status{font-size:.7rem;font-weight:850;padding:6px 9px;border-radius:999px;white-space:nowrap}.ae-status.main{background:#e3f2ec;color:#21664f}.ae-status.reduced{background:#fff1d9;color:#865b1e}.ae-status.skip{background:#edf0ef;color:#556463}.ae-status.pending{background:#eaf0f4;color:#526d80}.ae-meta{display:flex;gap:12px;flex-wrap:wrap;color:var(--muted);font-size:.7rem;margin-top:8px}.ae-focus-row{display:flex;gap:5px;flex-wrap:wrap;margin-top:9px}.ae-focus-chip{font-size:.66rem;font-weight:750;background:#edf3f1;color:#355153;padding:5px 7px;border-radius:999px}.ae-reason{margin-top:11px;padding:10px 11px;border-radius:11px;background:#f6f8f7}.ae-reason strong{font-size:.77rem}.ae-reason p{font-size:.7rem;color:var(--muted);margin:4px 0 0;line-height:1.4}.ae-version{margin-top:10px}.ae-version>span{font-size:.68rem;text-transform:uppercase;letter-spacing:.05em;font-weight:800;color:var(--muted)}.ae-program{display:grid;gap:4px;margin-top:6px}.ae-program>div{padding:7px 9px;border-radius:9px;background:#fbfcfb;border:1px solid rgba(42,75,76,.09);font-size:.75rem}.ae-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:11px}.ae-empty{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}.ae-focus-picker{display:grid;gap:10px}.ae-focus-group{border:1px solid var(--line);border-radius:12px;padding:10px}.ae-focus-group>strong{display:block;font-size:.75rem;margin-bottom:7px}.ae-focus-group>div{display:flex;gap:6px;flex-wrap:wrap}.ae-check input{position:absolute;opacity:0;pointer-events:none}.ae-check span{display:inline-block;border:1px solid var(--line);border-radius:999px;padding:6px 8px;font-size:.68rem;font-weight:700;cursor:pointer}.ae-check input:checked+span{background:var(--brand);border-color:var(--brand);color:#fff}.ae-load-list{display:grid;gap:8px;margin-top:10px}.ae-load-row{display:grid;grid-template-columns:minmax(105px,1fr) 2fr 55px;gap:8px;align-items:center;font-size:.7rem}.ae-load-row>div{height:7px;background:#edf1ef;border-radius:999px;overflow:hidden}.ae-load-row i{display:block;height:100%;background:var(--accent);border-radius:999px}.ae-load-row b{text-align:right;font-size:.67rem}.ae-calendar-dot{position:absolute;right:5px;bottom:4px;font-size:.58rem;font-weight:850;padding:2px 4px;border-radius:6px;background:var(--brand);color:white}.calendar-day{position:relative}.ae-recent{margin-top:8px}
@media(max-width:700px){.ae-card-head{flex-direction:column}.ae-status{align-self:flex-start}.ae-section-title{align-items:center}.ae-load-row{grid-template-columns:95px 1fr 50px}.ae-empty{align-items:flex-start;flex-direction:column}}
`;
document.head.appendChild(style);
setTimeout(async()=>{const s=await getState();if(s&&!Array.isArray(s.adaptiveExtras)){s.adaptiveExtras=[];await saveState(s)}schedule()},120);
console.info(`Training Journal Adaptive Extra ${PATCH_VERSION} loaded`);
})();
