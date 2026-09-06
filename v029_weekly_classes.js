(() => {
'use strict';
const VERSION='0.2.9';
const STATE_KEY='state.v1';
const PACKAGE_TYPE='training-journal-weekly-classes';
const PACKAGE_VERSION=1;
if(!window.TJDB?.get||!window.TJDB?.set)return;

function isoDate(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function parseISO(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return null;const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]),12);return Number.isNaN(d.getTime())?null:d}
function weekBounds(v){const d=parseISO(v)||new Date();d.setHours(12,0,0,0);const day=(d.getDay()+6)%7;const start=new Date(d);start.setDate(start.getDate()-day);const end=new Date(start);end.setDate(end.getDate()+6);return {start:isoDate(start),end:isoDate(end)}}
function normTitle(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
function clone(v){return JSON.parse(JSON.stringify(v))}
function toast(msg){const el=document.getElementById('toast');if(!el){alert(msg);return}el.textContent=msg;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),2800)}
function classKey(w){return `${w.date}::${normTitle(w.title)}`}
function hasText(v){return String(v||'').trim().length>0}
function hasAthleteData(w){
  if(!w||typeof w!=='object')return false;
  if(w.status==='completed'||hasText(w.completedAt))return true;
  const s=w.summary||{};
  if(hasText(s.duration)||hasText(s.rpe)||hasText(s.notes))return true;
  return (w.sections||[]).some(sec=>{
    if(sec.completed||hasText(sec.actualNotes)||hasText(sec.score)||hasText(sec.resultLevel))return true;
    return (sec.rows||[]).some(r=>r.completed||hasText(r.actualLoad)||hasText(r.actualReps)||hasText(r.actualSets)||hasText(r.attempts));
  });
}
function sameJSON(a,b){try{return JSON.stringify(a)===JSON.stringify(b)}catch{return false}}
function validWorkout(w){
  return !!(w&&typeof w==='object'&&typeof w.id==='string'&&w.id.trim()&&parseISO(w.date)&&typeof w.title==='string'&&w.title.trim()&&Array.isArray(w.sections));
}
function validatePackage(p){
  if(!p||typeof p!=='object')throw new Error('File JSON non valido');
  if(p.packageType!==PACKAGE_TYPE)throw new Error(`Formato non riconosciuto: atteso ${PACKAGE_TYPE}`);
  if(Number(p.packageVersion)!==PACKAGE_VERSION)throw new Error(`Versione pacchetto non supportata: ${p.packageVersion}`);
  if(!Array.isArray(p.workouts))throw new Error('Manca la lista workouts');
  const week=p.week||{};
  if(!parseISO(week.start)||!parseISO(week.end)||week.start>week.end)throw new Error('Intervallo settimana non valido');
  const bad=p.workouts.findIndex(w=>!validWorkout(w));
  if(bad>=0)throw new Error(`Classe non valida in posizione ${bad+1}`);
  for(const w of p.workouts){if(w.date<week.start||w.date>week.end)throw new Error(`La classe ${w.title} (${w.date}) è fuori dalla settimana dichiarata`)}
  return p;
}
function importedWorkout(w,p){
  const x=clone(w);
  x.status=x.status||'scheduled';
  x.weeklyClassMeta={
    kind:'class',
    packageType:PACKAGE_TYPE,
    packageVersion:PACKAGE_VERSION,
    packageId:String(p.packageId||''),
    weekStart:p.week.start,
    weekEnd:p.week.end,
    importedAt:new Date().toISOString()
  };
  return x;
}
function buildMerge(current,p){
  const workouts=Array.isArray(current.workouts)?clone(current.workouts):[];
  const byId=new Map(workouts.map((w,i)=>[w.id,i]));
  const byKey=new Map(workouts.map((w,i)=>[classKey(w),i]));
  const stats={added:0,updated:0,unchanged:0,protected:0};
  const protectedRows=[];
  for(const incomingRaw of p.workouts){
    const incoming=importedWorkout(incomingRaw,p);
    let ix=byId.has(incoming.id)?byId.get(incoming.id):undefined;
    if(ix===undefined&&byKey.has(classKey(incoming)))ix=byKey.get(classKey(incoming));
    if(ix===undefined){
      workouts.push(incoming);
      const ni=workouts.length-1;
      byId.set(incoming.id,ni);byKey.set(classKey(incoming),ni);
      stats.added++;
      continue;
    }
    const existing=workouts[ix];
    if(hasAthleteData(existing)){
      stats.protected++;
      protectedRows.push(`${existing.date} · ${existing.title}`);
      continue;
    }
    const replacement={...incoming,id:existing.id,createdAt:existing.createdAt||incoming.createdAt};
    if(sameJSON(existing,replacement)){stats.unchanged++;continue}
    workouts[ix]=replacement;
    byId.set(replacement.id,ix);byKey.set(classKey(replacement),ix);
    stats.updated++;
  }
  return {workouts,stats,protectedRows};
}
async function importWeeklyFile(file){
  try{
    const p=validatePackage(JSON.parse(await file.text()));
    const current=await window.TJDB.get(STATE_KEY);
    if(!current||typeof current!=='object'||!Array.isArray(current.workouts))throw new Error('Diario locale non disponibile');
    const merged=buildMerge(current,p);
    const s=merged.stats;
    const lines=[
      `Settimana ${p.week.start} → ${p.week.end}`,
      `Nuove classi: ${s.added}`,
      `Classi programmate aggiornabili: ${s.updated}`,
      `Già identiche: ${s.unchanged}`,
      `Protette perché già compilate/completate: ${s.protected}`
    ];
    if(s.protected)lines.push('', 'Le classi protette NON verranno sovrascritte.');
    if(!s.added&&!s.updated){toast(s.protected?'Nessuna modifica: dati atleta protetti':'Classi già presenti');return}
    if(!confirm(`${lines.join('\n')}\n\nImportare le modifiche sicure?`))return;
    const next={...current,workouts:merged.workouts};
    await window.TJDB.set(STATE_KEY,next);
    alert(`Import completato.\nNuove: ${s.added}\nAggiornate: ${s.updated}\nProtette: ${s.protected}`);
    location.reload();
  }catch(e){console.error(e);toast(`Import classi non valido: ${e.message}`)}
}
function downloadPackage(payload,name){
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const file=new File([blob],name,{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    navigator.share({files:[file],title:'Classi settimanali Training Journal'}).catch(e=>{if(e.name!=='AbortError')fallback()});
    return;
  }
  fallback();
  function fallback(){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
}
async function exportWeekly(){
  const today=isoDate(new Date());
  const raw=prompt('Inserisci una data della settimana da esportare (AAAA-MM-GG)',today);
  if(raw===null)return;
  if(!parseISO(raw)){toast('Data non valida');return}
  const week=weekBounds(raw);
  const current=await window.TJDB.get(STATE_KEY);
  const inWeek=(current?.workouts||[]).filter(w=>w.date>=week.start&&w.date<=week.end);
  const workouts=inWeek;
  if(!workouts.length){toast('Nessuna classe nella settimana selezionata');return}
  const payload={
    packageType:PACKAGE_TYPE,
    packageVersion:PACKAGE_VERSION,
    packageId:`tj-weekly-classes-${week.start}`,
    generatedBy:'Training Journal',
    exportedAt:new Date().toISOString(),
    week,
    workouts:clone(workouts)
  };
  downloadPackage(payload,`TrainingJournal_classi_${week.start}_${week.end}.json`);
}
function ensureInput(){
  if(document.getElementById('weeklyClassesInput'))return;
  const input=document.createElement('input');
  input.id='weeklyClassesInput';input.type='file';input.accept='application/json,.json';input.hidden=true;
  input.addEventListener('change',()=>{const f=input.files?.[0];if(f)importWeeklyFile(f);input.value=''});
  document.body.appendChild(input);
}
function injectProfileControls(){
  const app=document.getElementById('app');if(!app||document.getElementById('weeklyClassesControls'))return;
  const headings=[...app.querySelectorAll('h2')];
  const h=headings.find(x=>x.textContent.trim()==='Archivio e backup');
  const card=h?.nextElementSibling;if(!card)return;
  const box=document.createElement('div');box.id='weeklyClassesControls';box.style.marginTop='12px';
  box.innerHTML=`<div style="border-top:1px solid rgba(0,0,0,.08);padding-top:12px"><strong>Classi settimanali</strong><p class="muted small" style="margin:5px 0 10px">Import/export separato dal backup. Non modifica Extra, record, gare o profilo e protegge le classi già compilate.</p><div class="actions"><button class="button" data-weekly-action="import">Importa classi settimana</button><button class="button secondary" data-weekly-action="export">Esporta classi settimana</button></div></div>`;
  card.appendChild(box);
}
ensureInput();
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-weekly-action]');if(!b)return;
  e.preventDefault();e.stopPropagation();
  if(b.dataset.weeklyAction==='import')document.getElementById('weeklyClassesInput')?.click();
  if(b.dataset.weeklyAction==='export')exportWeekly();
},true);
new MutationObserver(()=>injectProfileControls()).observe(document.getElementById('app'),{childList:true,subtree:true});
setTimeout(injectProfileControls,300);
console.info(`Training Journal weekly classes ${VERSION} loaded`);
})();