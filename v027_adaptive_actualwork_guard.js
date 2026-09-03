(() => {
'use strict';
const VERSION='0.2.7';
const STATE_KEY='state.v1';
const BACKUP_KEY='tj.adaptiveActualWorkBackup.v1';
if(!window.TJDB?.get||!window.TJDB?.set)return;

const previousGet=window.TJDB.get.bind(window.TJDB);
const previousSet=window.TJDB.set.bind(window.TJDB);

function ts(v){
  const n=Date.parse(v||'');
  return Number.isFinite(n)?n:0;
}
function readBackup(){
  try{
    const raw=localStorage.getItem(BACKUP_KEY);
    const obj=raw?JSON.parse(raw):{};
    return obj&&typeof obj==='object'?obj:{};
  }catch{return {}}
}
function writeBackup(map){
  try{localStorage.setItem(BACKUP_KEY,JSON.stringify(map))}catch{}
}
function captureFromState(state){
  if(!state||!Array.isArray(state.adaptiveExtras))return false;
  const backup=readBackup();let changed=false;
  for(const extra of state.adaptiveExtras){
    if(!extra?.id||!extra.actualWork)continue;
    const incoming=extra.actualWork,current=backup[extra.id]?.actualWork;
    if(!current||ts(incoming.updatedAt)>=ts(current.updatedAt)){
      backup[extra.id]={actualWork:incoming,completed:!!extra.completed,completedAt:extra.completedAt||'',athleteChoice:extra.athleteChoice||'',savedAt:new Date().toISOString()};
      changed=true;
    }
  }
  if(changed)writeBackup(backup);
  return changed;
}
function restoreIntoState(state){
  if(!state||!Array.isArray(state.adaptiveExtras))return state;
  const backup=readBackup();let restored=false;
  for(const extra of state.adaptiveExtras){
    const b=backup[extra?.id];if(!b?.actualWork)continue;
    const cur=extra.actualWork;
    if(!cur||ts(b.actualWork.updatedAt)>ts(cur.updatedAt)){
      extra.actualWork=b.actualWork;
      extra.completed=b.completed;
      extra.completedAt=b.completedAt||'';
      if(b.athleteChoice)extra.athleteChoice=b.athleteChoice;
      restored=true;
    }
  }
  if(restored)state.__actualWorkRestored=true;
  return state;
}

window.TJDB.get=async function(key){
  const value=await previousGet(key);
  if(key!==STATE_KEY)return value;
  return restoreIntoState(value);
};

window.TJDB.set=async function(key,value){
  if(key!==STATE_KEY)return previousSet(key,value);
  // Prima di ogni scrittura recupera eventuali resoconti più recenti dalla copia di sicurezza.
  const safe=restoreIntoState(value);
  // Cattura subito i nuovi resoconti: anche una scrittura successiva obsoleta non potrà più farli sparire.
  captureFromState(safe);
  const result=await previousSet(key,safe);
  // Verifica dopo la scrittura e aggiorna la copia ridondante con ciò che è realmente persistito.
  const persisted=await previousGet(STATE_KEY);
  captureFromState(persisted);
  window.dispatchEvent(new CustomEvent('tj:actualwork-saved',{detail:{version:VERSION}}));
  return result;
};

// Migra nella copia ridondante eventuali resoconti già presenti prima dell'aggiornamento.
previousGet(STATE_KEY).then(captureFromState).catch(()=>{});

// Forza l'aggiornamento leggero delle card dopo un salvataggio verificato.
window.addEventListener('tj:actualwork-saved',()=>{
  const app=document.getElementById('app');if(!app)return;
  setTimeout(()=>{const n=document.createElement('span');n.hidden=true;n.dataset.actualworkRefresh='1';app.appendChild(n);n.remove()},70);
});

console.info(`Training Journal adaptive actual-work guard ${VERSION} loaded`);
})();
