(() => {
'use strict';
const VERSION='0.2.5';
const STATE_KEY='state.v1';

async function stateMap(){
  try{
    const s=await window.TJDB?.get?.(STATE_KEY);
    return new Map((s?.adaptiveExtras||[]).map(x=>[x.id,x]));
  }catch{return new Map()}
}

async function ensureButtons(){
  const map=await stateMap();
  document.querySelectorAll('.ae-card[data-ae-id]').forEach(card=>{
    const id=card.dataset.aeId;
    const actions=card.querySelector('.ae-actions');
    if(!id||!actions)return;

    // v0.2.4 usa data-v024-open. Se è già presente, basta aggiornarne l'etichetta.
    let btn=actions.querySelector('button[data-v024-open]');

    // Converte eventuale vecchio pulsante creato da v0.2.3, senza toccare i marker nascosti.
    if(!btn){
      const old=actions.querySelector('button[data-ae-log-open]');
      if(old){
        old.removeAttribute('data-ae-log-open');
        old.dataset.v024Open=id;
        btn=old;
      }
    }

    // Il pulsante deve esistere SEMPRE, indipendentemente da Principale/Ridotto/Skip/completato.
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='button accent small';
      btn.dataset.v024Open=id;
      actions.appendChild(btn);
    }

    const extra=map.get(id);
    btn.textContent=extra?.actualWork?'✎ Modifica svolto':'✓ Registra svolto';
    btn.classList.add('v025-log-button');
  });
}

function repairSequence(){
  // setChoice salva su IndexedDB e poi ridisegna la card in modo asincrono.
  // Ripetiamo il controllo per coprire anche device/PWA più lenti.
  [0,60,140,300,650,1100].forEach(ms=>setTimeout(ensureButtons,ms));
}

// Il problema si presentava esattamente dopo questi rerender dell'Extra.
document.addEventListener('click',e=>{
  if(e.target.closest('[data-ae-choice],[data-ae-complete],[data-ae-edit],[data-ae-new]'))repairSequence();
  if(e.target.closest('[data-nav],[data-action="open-day"]'))setTimeout(ensureButtons,180);
},true);

// La pagina Home/giorno può essere ricostruita anche da altri moduli.
// Un controllo leggero di sicurezza evita che il pulsante resti assente senza creare render loop.
let lastVisibleCheck=0;
setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  if(!document.querySelector('.ae-card[data-ae-id]'))return;
  const now=Date.now();if(now-lastVisibleCheck<1200)return;lastVisibleCheck=now;
  ensureButtons();
},1400);

window.addEventListener('pageshow',repairSequence);
setTimeout(ensureButtons,120);
console.info(`Training Journal adaptive log button fix ${VERSION} loaded`);
})();
