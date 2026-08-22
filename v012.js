(() => {
'use strict';
const PATCH_VERSION='0.1.2';

function headerKey(v){
  return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9/& +'-]+/g,' ').replace(/\s+/g,' ').trim().toLowerCase();
}
function sectionType(line){
  const h=headerKey(line);
  if(/^(riscaldamento|warm ?up)$/.test(h))return'warmup';
  if(/^tabata$/.test(h))return'tabata';
  if(/^skill$/.test(h))return'skill';
  if(/^(forza|strength)$/.test(h))return'strength';
  if(/^(pesistica|weightlifting|olympic lifting)$/.test(h))return'weightlifting';
  if(/^(wod|workout)$/.test(h))return'wod';
  if(/^(metcon|metabolic|metabolic conditioning|running)$/.test(h))return'metcon';
  if(/^(core|core \/ accessory|accessory)$/.test(h))return'core';
  if(/^(cooldown|cool down|stretching|defaticamento)$/.test(h))return'cooldown';
  return'';
}
function parseDate(text){
  const m=String(text||'').match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if(!m)return'';
  let y=Number(m[3]); if(y<100)y+=2000;
  return `${y}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[1])).padStart(2,'0')}`;
}
function parseTitle(line){
  return String(line||'').replace(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,'').replace(/[^A-Za-zÀ-ÿ0-9&+/' -]+/g,' ').replace(/\s+/g,' ').trim();
}
function simpleRow(line){
  const raw=String(line||'').trim();
  const m=raw.match(/^((?:\d+(?:[.,]\d+)?(?:\+\d+)?)(?:\s*(?:[’'′\"]|sec(?:ondi)?|s|min(?:uti)?|m))?)\s+(.+)$/i);
  return {exercise:m?m[2].trim():raw,reps:m?m[1].trim():'',note:''};
}
function parseWarmup(lines,type='warmup'){
  const out={type,scheme:'Rounds',amount:'3',intro:'',rows:[]};
  let roundIndex=-1;
  for(let i=0;i<lines.length;i++){
    const m=lines[i].match(/^(\d+)\s*(rounds?|giri)(?:\s+(not for time|nft))?\s*$/i);
    if(m){roundIndex=i;out.amount=m[1];out.scheme=m[3]?'Not For Time':'Rounds';break;}
  }
  if(roundIndex>=0){
    const before=lines.slice(0,roundIndex).filter(x=>!/^then$/i.test(x));
    const hadThen=lines.slice(0,roundIndex).some(x=>/^then$/i.test(x));
    out.intro=[...before,hadThen?'Then':''].filter(Boolean).join(' · ');
    out.rows=lines.slice(roundIndex+1).filter(Boolean).map(simpleRow);
  }else{
    out.rows=lines.filter(x=>!/^then$/i.test(x)).map(simpleRow);
    out.intro=lines.some(x=>/^then$/i.test(x))?'Then':'';
  }
  if(!out.rows.length)out.rows=[{exercise:'',reps:'',note:''}];
  return out;
}
function parseTabata(lines){
  const out={type:'tabata',work:'20"',rest:'10"',rounds:'8',items:[]};
  for(const line of lines){
    let m=line.match(/^(?:work|lavoro)\s*:?\s*(.+)$/i); if(m){out.work=m[1].trim();continue;}
    m=line.match(/^(?:rest|recupero)\s*:?\s*(.+)$/i); if(m){out.rest=m[1].trim();continue;}
    m=line.match(/^(?:rounds?|giri)\s*:?\s*(\d+)/i); if(m){out.rounds=m[1];continue;}
    out.items.push(line);
  }
  if(!out.items.length)out.items=[''];
  return out;
}
function parseLift(lines,type){
  const out={type,rows:[]};
  for(const line of lines){
    const raw=line.trim(); if(!raw)continue;
    let exercise=raw,sets='',reps='',load='',percent='',rest='';
    let m=raw.match(/^(.+?)\s+(\d+)\s*[x×]\s*([^@]+?)(?:\s*@\s*([\d.,-]+)\s*(kg|%))?(?:\s+(.*))?$/i);
    if(m){exercise=m[1].trim();sets=m[2];reps=m[3].trim();if((m[5]||'').toLowerCase()==='kg')load=(m[4]||'').trim();else if(m[5]==='%')percent=(m[4]||'').trim();rest=(m[6]||'').trim();}
    out.rows.push({exercise,sets,reps,load,percent,rm:'1',rest});
  }
  if(!out.rows.length)out.rows=[{exercise:'',sets:'',reps:'',load:'',percent:'',rm:'1',rest:''}];
  return out;
}
function parseWod(lines){
  const out={type:'wod',name:'WOD',format:'',scoreType:'time',level:'Rx',text:''};
  const body=[...lines];
  const ix=body.findIndex(x=>/^(for time|amrap\b.*|emom\b.*|e\d+mom\b.*|chipper|intervals?|intervalli)$/i.test(x.trim()));
  if(ix>=0){out.format=body[ix].trim();body.splice(ix,1);}
  const f=out.format.toLowerCase();
  if(f.startsWith('amrap'))out.scoreType='rounds_plus_reps';
  else if(f.startsWith('emom')||/^e\d+mom/.test(f))out.scoreType='reps';
  else out.scoreType='time';
  out.text=body.join('\n').trim();
  return out;
}
function parseMessage(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim());
  const nonempty=lines.filter(Boolean);
  if(!nonempty.length)return{title:'',date:'',sections:[]};
  const first=nonempty[0], title=sectionType(first)?'':parseTitle(first), date=parseDate(text);
  const groups=[]; let current=null;
  const start=title?lines.indexOf(first)+1:0;
  for(let i=start;i<lines.length;i++){
    const line=lines[i]; if(!line)continue;
    const type=sectionType(line);
    if(type){current={type,lines:[]};groups.push(current);continue;}
    if(current)current.lines.push(line);
  }
  const sections=groups.map(g=>{
    if(g.type==='warmup'||g.type==='core')return parseWarmup(g.lines,g.type);
    if(g.type==='tabata')return parseTabata(g.lines);
    if(g.type==='strength'||g.type==='weightlifting')return parseLift(g.lines,g.type);
    if(g.type==='wod')return parseWod(g.lines);
    return {type:g.type,text:g.lines.join('\n').trim()};
  });
  return {title,date,sections};
}

function fire(el,type='input'){ if(el)el.dispatchEvent(new Event(type,{bubbles:true})); }
function setInput(el,value){ if(!el)return; el.value=value==null?'':String(value); fire(el,'input'); }
function toast(msg){
  const el=document.getElementById('toast'); if(!el)return;
  el.textContent=msg; el.classList.remove('hidden');
  clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.add('hidden'),2200);
}
function closeModal(){ document.getElementById('modalClose')?.click(); }
function showImportModal(){
  const back=document.getElementById('modalBackdrop'), title=document.getElementById('modalTitle'), sub=document.getElementById('modalSubtitle'), body=document.getElementById('modalBody');
  if(!back||!body)return;
  title.textContent='Importa allenamento';
  sub.textContent='Incolla il messaggio completo: data, titolo e sezioni verranno riconosciuti automaticamente.';
  body.innerHTML=`<div class="field"><label>Messaggio allenamento</label><textarea id="v012ImportText" style="min-height:360px" placeholder="Incolla qui Hybrid Class, CrossFit, HYROX, Weightlifting o un allenamento Running..."></textarea></div><div class="card compact" style="margin-top:10px"><strong>Sezioni riconosciute</strong><p class="muted small" style="margin-bottom:0">Riscaldamento, Tabata, Skill, Forza/Pesistica, Metcon, WOD, Core e Cooldown. Tutto resta modificabile dopo l'importazione.</p></div><div class="actions end" style="margin-top:12px"><button class="button ghost" data-v012-cancel>Annulla</button><button class="button accent" data-v012-apply-import>Genera allenamento</button></div>`;
  back.classList.remove('hidden'); document.body.style.overflow='hidden';
  setTimeout(()=>document.getElementById('v012ImportText')?.focus(),40);
}
function currentSections(){ return [...document.querySelectorAll('#sectionEditor [data-section-id]')]; }
function deleteAllSections(){
  let guard=0;
  while(currentSections().length&&guard++<30){
    const b=document.querySelector('#sectionEditor [data-action="section-delete"]'); if(!b)break; b.click();
  }
}
function addSection(type){
  const select=document.getElementById('sectionType'), add=document.querySelector('[data-action="add-section"]');
  if(!select||!add)return null;
  select.value=type; fire(select,'change'); add.click();
  const all=currentSections(); return all[all.length-1]||null;
}
function secById(id){ return document.querySelector(`#sectionEditor [data-section-id="${CSS.escape(id)}"]`); }
function setSecField(sec,name,value){ setInput(sec?.querySelector(`[data-sec-field="${name}"]`),value); }
function fillSimpleRows(sec,spec){
  const id=sec.dataset.sectionId, rows=spec.rows||[];
  while((secById(id)?.querySelectorAll('[data-row-id]').length||0)<rows.length){ secById(id)?.querySelector('[data-action="add-simple-row"]')?.click(); }
  const fresh=secById(id); [...fresh.querySelectorAll('[data-row-id]')].forEach((row,i)=>{const x=rows[i]||{};setInput(row.querySelector('[data-row-field="exercise"]'),x.exercise||'');setInput(row.querySelector('[data-row-field="reps"]'),x.reps||'');setInput(row.querySelector('[data-row-field="note"]'),x.note||'');});
  return fresh;
}
function fillLiftRows(sec,spec){
  const id=sec.dataset.sectionId, rows=spec.rows||[];
  while((secById(id)?.querySelectorAll('[data-row-id]').length||0)<rows.length){ secById(id)?.querySelector('[data-action="add-lift-row"]')?.click(); }
  const fresh=secById(id); [...fresh.querySelectorAll('[data-row-id]')].forEach((row,i)=>{const x=rows[i]||{};for(const k of ['exercise','sets','reps','load','percent','rm','rest'])setInput(row.querySelector(`[data-row-field="${k}"]`),x[k]||'');});
  return fresh;
}
function fillTabata(sec,spec){
  const id=sec.dataset.sectionId, items=spec.items||[];
  while((secById(id)?.querySelectorAll('[data-tabata-item]').length||0)<items.length){ secById(id)?.querySelector('[data-action="add-tabata-item"]')?.click(); }
  const fresh=secById(id); setSecField(fresh,'work',spec.work||'20"');setSecField(fresh,'rest',spec.rest||'10"');setSecField(fresh,'rounds',spec.rounds||'8');
  [...fresh.querySelectorAll('[data-tabata-item]')].forEach((el,i)=>setInput(el,items[i]||'')); return fresh;
}
function fillSection(sec,spec){
  if(!sec)return;
  let fresh=sec;
  if(spec.title)setSecField(fresh,'title',spec.title);
  if(spec.type==='warmup'||spec.type==='core'){
    setSecField(fresh,'scheme',spec.scheme||'Rounds');setSecField(fresh,'amount',spec.amount||'3');setSecField(fresh,'intro',spec.intro||'');fresh=fillSimpleRows(fresh,spec);
  }else if(spec.type==='tabata') fresh=fillTabata(fresh,spec);
  else if(spec.type==='strength'||spec.type==='weightlifting') fresh=fillLiftRows(fresh,spec);
  else if(spec.type==='wod'){
    setSecField(fresh,'name',spec.name||'WOD');setSecField(fresh,'format',spec.format||'');setSecField(fresh,'scoreType',spec.scoreType||'time');setSecField(fresh,'level',spec.level||'Rx');setSecField(fresh,'text',spec.text||'');
  }else setSecField(fresh,'text',spec.text||'');
}
function applySections(specs,ask=true){
  if(!document.getElementById('sectionEditor'))return false;
  if(ask&&currentSections().length&&!confirm('Sostituire le sezioni attuali?'))return false;
  deleteAllSections();
  for(const spec of specs){ const sec=addSection(spec.type); fillSection(sec,spec); }
  return true;
}
function applyImport(){
  const text=document.getElementById('v012ImportText')?.value||'';
  if(!text.trim()){toast('Incolla prima un allenamento');return;}
  const parsed=parseMessage(text);
  if(!parsed.sections.length){toast('Non ho riconosciuto le sezioni del messaggio');return;}
  if(!applySections(parsed.sections,true))return;
  if(parsed.date)setInput(document.getElementById('workoutDate'),parsed.date);
  if(parsed.title)setInput(document.getElementById('workoutTitle'),parsed.title);
  closeModal(); toast(`${parsed.sections.length} sezioni importate`);
}
function model(name){
  if(name==='hybridcrossfit')return [
    {type:'warmup',scheme:'Rounds',amount:'3',intro:'',rows:[{exercise:'',reps:'',note:''}]},
    {type:'tabata',work:'20"',rest:'10"',rounds:'8',items:['']},
    {type:'skill',text:''},{type:'strength',rows:[{exercise:'',sets:'',reps:'',load:'',percent:'',rm:'1',rest:''}]},{type:'wod',name:'',format:'',scoreType:'time',level:'Rx',text:''},{type:'cooldown',text:''}
  ];
  if(name==='hyrox')return [
    {type:'warmup',scheme:'Rounds',amount:'3',intro:'',rows:[{exercise:'',reps:'',note:''}]},
    {type:'strength',rows:[{exercise:'',sets:'',reps:'',load:'',percent:'',rm:'1',rest:''}]},
    {type:'metcon',title:'HYROX / Running + Stations',text:''},{type:'wod',name:'',format:'For Time',scoreType:'time',level:'Rx',text:''},{type:'cooldown',text:''}
  ];
  if(name==='weightlifting')return [
    {type:'warmup',scheme:'Rounds',amount:'3',intro:'',rows:[{exercise:'',reps:'',note:''}]},
    {type:'weightlifting',rows:[{exercise:'',sets:'',reps:'',load:'',percent:'',rm:'1',rest:''}]},
    {type:'strength',rows:[{exercise:'',sets:'',reps:'',load:'',percent:'',rm:'1',rest:''}]},
    {type:'core',scheme:'Rounds',amount:'3',intro:'',rows:[{exercise:'',reps:'',note:''}]},{type:'cooldown',text:''}
  ];
  if(name==='metabolic')return [
    {type:'warmup',scheme:'Rounds',amount:'3',intro:'',rows:[{exercise:'',reps:'',note:''}]},
    {type:'metcon',title:'Metabolic / Running',text:''},{type:'wod',name:'',format:'',scoreType:'time',level:'Rx',text:''},{type:'cooldown',text:''}
  ];
  return [];
}
function enhanceEditor(){
  if(!document.getElementById('workoutTitle'))return;
  const row=[...document.querySelectorAll('.quick-row')].find(x=>x.textContent.includes('Modelli:')&&x.querySelector('[data-action="workout-template"]'));
  if(!row||row.dataset.v012Enhanced)return;
  row.dataset.v012Enhanced='1';
  row.querySelectorAll('[data-action="workout-template"]').forEach(b=>b.remove());
  const label=[...row.querySelectorAll('span')].find(s=>s.textContent.includes('Modelli:'));
  const imp=document.createElement('button');imp.className='button secondary small';imp.type='button';imp.dataset.v012Import='1';imp.textContent='📋 Importa messaggio';
  row.insertBefore(imp,label||row.firstChild);
  const defs=[['hybridcrossfit','Hybrid / CrossFit'],['hyrox','HYROX'],['weightlifting','Weightlifting'],['metabolic','Metabolic / Running']];
  for(const [id,text] of defs){const b=document.createElement('button');b.className='button ghost small';b.type='button';b.dataset.v012Template=id;b.textContent=text;row.appendChild(b);}
}

document.addEventListener('click',e=>{
  const imp=e.target.closest('[data-v012-import]'); if(imp){e.preventDefault();showImportModal();return;}
  const apply=e.target.closest('[data-v012-apply-import]'); if(apply){e.preventDefault();applyImport();return;}
  const cancel=e.target.closest('[data-v012-cancel]'); if(cancel){e.preventDefault();closeModal();return;}
  const tpl=e.target.closest('[data-v012-template]'); if(tpl){e.preventDefault();applySections(model(tpl.dataset.v012Template),true);return;}
},true);

const observer=new MutationObserver(()=>queueMicrotask(enhanceEditor));
observer.observe(document.body,{childList:true,subtree:true});
setTimeout(enhanceEditor,0);
console.info(`Training Journal patch ${PATCH_VERSION} loaded`);
})();
