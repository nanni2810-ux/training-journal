(() => {
'use strict';
const VERSION='0.2.6';
const STATE_KEY='state.v1';
if(!window.TJDB?.set||!window.TJDB?.get)return;

const previousSet=window.TJDB.set.bind(window.TJDB);
let writeQueue=Promise.resolve();

function stamp(v){
  const t=Date.parse(v||'');
  return Number.isFinite(t)?t:0;
}
function newerActual(current,incoming){
  if(!current)return incoming||null;
  if(!incoming)return current;
  return stamp(current.updatedAt)>=stamp(incoming.updatedAt)?current:incoming;
}
function newerTests(current,incoming){
  if(!current)return incoming||null;
  if(!incoming)return current;
  return stamp(current._updatedAt)>=stamp(incoming._updatedAt)?current:incoming;
}
function mergeExtra(current,incoming){
  if(!current)return incoming;
  const out={...incoming};

  const actual=newerActual(current.actualWork,incoming.actualWork);
  if(actual){
    out.actualWork=actual;
    // Se vince il resoconto già persistito, preserviamo anche lo stato coerente
    // collegato a quel resoconto. Evita che una copia in memoria più vecchia lo annulli.
    if(actual===current.actualWork){
      out.completed=current.completed;
      out.completedAt=current.completedAt||'';
      out.athleteChoice=current.athleteChoice||out.athleteChoice||'';
    }
  }

  const tests=newerTests(current.testResults,incoming.testResults);
  if(tests)out.testResults=tests;
  return out;
}
function protectedState(current,incoming){
  if(!current||!incoming||typeof incoming!=='object')return incoming;
  const next={...incoming};
  const curExtras=Array.isArray(current.adaptiveExtras)?current.adaptiveExtras:[];
  const incExtras=Array.isArray(incoming.adaptiveExtras)?incoming.adaptiveExtras:null;

  // Il core v0.1.1 mantiene una copia dello state in memoria. Quando salva un normale
  // allenamento non deve mai sovrascrivere gli Extra che nel frattempo sono stati
  // modificati direttamente in IndexedDB dai moduli Adaptive.
  if(String(incoming.appVersion||'')==='0.1.1'){
    next.adaptiveExtras=curExtras;
    return next;
  }

  if(incExtras){
    const map=new Map(curExtras.map(x=>[x.id,x]));
    next.adaptiveExtras=incExtras.map(x=>x?.id&&map.has(x.id)?mergeExtra(map.get(x.id),x):x);
  }
  return next;
}

window.TJDB.set=function(key,value){
  // Serializziamo le scritture: due salvataggi ravvicinati non possono più leggere
  // lo stesso stato vecchio e poi sovrascriversi in ordine inverso.
  const job=writeQueue.then(async()=>{
    if(key!==STATE_KEY)return previousSet(key,value);
    const current=await window.TJDB.get(STATE_KEY);
    const next=protectedState(current,value);
    const result=await previousSet(key,next);
    window.dispatchEvent(new CustomEvent('tj:state-persisted',{detail:{key,version:VERSION}}));
    return result;
  });
  writeQueue=job.catch(err=>{console.error('Training Journal persistence queue',err)});
  return job;
};

// Dopo un salvataggio, forza soltanto un piccolo evento DOM neutro. I moduli già
// presenti aggiornano così badge, riepilogo e pulsante senza ricostruire la pagina.
let refreshTimer=null;
window.addEventListener('tj:state-persisted',()=>{
  clearTimeout(refreshTimer);
  refreshTimer=setTimeout(()=>{
    const app=document.getElementById('app');if(!app)return;
    const n=document.createElement('span');n.hidden=true;n.dataset.persistenceRefresh='1';app.appendChild(n);n.remove();
  },60);
});

console.info(`Training Journal adaptive persistence fix ${VERSION} loaded`);
})();
