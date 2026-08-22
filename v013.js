(() => {
'use strict';
const PATCH_VERSION='0.1.3';
const WODS=Array.isArray(window.WLC_EMBEDDED_WODS)?window.WLC_EMBEDDED_WODS:[];
const GIRLS=new Set([
  'angie','annie','amanda','andi','barbara','candy','chelsea','cindy','diane','elizabeth','eva','fran','grace','grettel','gwen','helen','hope','ingrid','isabel','jackie','karen','kelly','linda','lynne','lyla','maggie','marguerita','mary','nancy','nicole'
]);
const STOP=new Set(['the','a','an','and','or','of','to','in','on','at','with','w','for','then','each','every','round','rounds','roundsfor','reps','rep','total','complete','work','workout','wod','score','time','cap','tc','rx','scaled','men','women','male','female']);

function ascii(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function normName(v){return ascii(v).replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim()}
function genericName(v){const n=normName(v);return !n||['wod','workout','metcon','training','allenamento'].includes(n)}
function specialLabel(w){
  const cat=normName(w?.category);
  const tags=(w?.tags||[]).map(normName);
  const nm=normName(w?.name);
  if(cat==='open'||tags.includes('open')||/^open\s*\d{2}(?:\.\d+)?/.test(nm)||/^\d{2}\.\d+$/.test(nm))return'Open';
  if(cat==='hero'||tags.includes('hero'))return'Hero';
  if(cat==='girl'||tags.includes('girl')||GIRLS.has(nm))return'Girl';
  if(cat==='benchmark')return'Benchmark';
  return w?.category||'Libreria';
}
function stripLoads(v){
  let s=ascii(v).replace(/,/g,'.');
  s=s.replace(/\((?=[^)]*(?:\bkg\b|\blbs?\b|#|\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?))[^)]*\)/g,' ');
  s=s.replace(/@\s*(?:\d+\s*x\s*)?\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?\s*(?:kg|lbs?|#)?/g,' ');
  s=s.replace(/\b(?:\d+\s*x\s*)?\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?\s*(?:kg|lbs?|#)\b/g,' ');
  s=s.replace(/\b\d+(?:\.\d+)?\s*(?:kg|lbs?)\b/g,' ');
  s=s.replace(/\b(?:time\s*cap|tc)\s*:?\s*\d+(?::\d+)?\s*(?:min(?:utes?)?|m|'|’)?/g,' ');
  return s;
}
function canonicalWords(v){
  let s=stripLoads(v);
  const repl=[
    [/\bdumbbells?\b|\bdb\b/g,'dumbbell'],[/\bkettlebells?\b|\bkb\b/g,'kettlebell'],
    [/\bsnatches\b/g,'snatch'],[/\bcleans\b/g,'clean'],[/\bjerks\b/g,'jerk'],[/\bthrusters\b/g,'thruster'],
    [/\bburpees\b/g,'burpee'],[/\bboxes\b/g,'box'],[/\bjumps\b/g,'jump'],[/\bovers\b/g,'over'],
    [/\bwall\s*balls?\b/g,'wall ball'],[/\bpull[ -]?ups?\b/g,'pull up'],[/\bpush[ -]?ups?\b/g,'push up'],
    [/\btoes[ -]?to[ -]?bar\b|\bt2b\b/g,'toes to bar'],[/\bchest[ -]?to[ -]?bar\b|\bc2b\b/g,'chest to bar'],
    [/\bdouble[ -]?unders?\b|\bdu\b/g,'double under'],[/\bsingle[ -]?unders?\b|\bsu\b/g,'single under'],
    [/\bhandstand\s*push[ -]?ups?\b|\bhspu\b/g,'handstand push up'],[/\bbar\s*muscle[ -]?ups?\b|\bbmu\b/g,'bar muscle up'],
    [/\bring\s*muscle[ -]?ups?\b|\brmu\b/g,'ring muscle up'],[/\brunning\b|\brun\b/g,'run'],[/\browing\b|\brower\b/g,'row']
  ];
  for(const [r,x] of repl)s=s.replace(r,x);
  return s.replace(/[^a-z0-9.]+/g,' ').replace(/\s+/g,' ').trim();
}
function tokens(v){return canonicalWords(v).split(' ').filter(x=>x&&!STOP.has(x))}
function bigrams(ts){const out=[];for(let i=0;i<ts.length-1;i++)out.push(ts[i]+' '+ts[i+1]);return out}
function multisetDice(a,b){
  if(!a.length||!b.length)return 0;
  const fa=new Map(),fb=new Map();
  a.forEach(x=>fa.set(x,(fa.get(x)||0)+1));b.forEach(x=>fb.set(x,(fb.get(x)||0)+1));
  let common=0;for(const [k,n] of fa)common+=Math.min(n,fb.get(k)||0);
  return 2*common/(a.length+b.length);
}
function formatKey(v){
  const s=normName(v);
  if(s.includes('for time'))return'for time';
  if(s.startsWith('amrap'))return'amrap';
  if(s.includes('emom'))return'emom';
  if(s.includes('chipper'))return'chipper';
  if(s.includes('interval'))return'intervals';
  return s;
}
function bodyScore(aText,bText,aFormat,bFormat){
  const a=tokens(aText),b=tokens(bText);
  if(a.length<4||b.length<4)return 0;
  const uni=multisetDice(a,b),bi=multisetDice(bigrams(a),bigrams(b));
  const fa=formatKey(aFormat),fb=formatKey(bFormat);const fm=fa&&fb?(fa===fb?1:0):0.5;
  return Math.min(1,uni*0.57+bi*0.36+fm*0.07);
}
function compile(w){
  const desc=w?.description||'';
  const tok=tokens(desc);
  return {w,name:normName(w?.name),label:specialLabel(w),format:w?.format||'',tok,bi:bigrams(tok)};
}
const LIB=WODS.map(compile);
function matchWod(name,format,text){
  const nn=normName(name),isGeneric=genericName(name),body=String(text||'').trim();
  let exact=[];
  if(!isGeneric&&nn)exact=LIB.filter(x=>x.name===nn);
  if(exact.length){
    let best=exact[0],bestBody=-1;
    for(const c of exact){const bs=bodyScore(body,c.w.description||'',format,c.format);if(bs>bestBody){bestBody=bs;best=c}}
    return {entry:best.w,label:best.label,score:Math.max(0.96,bestBody),ambiguous:false,reason:'name'};
  }
  if(tokens(body).length<5)return null;
  const a=tokens(body),ab=bigrams(a),fa=formatKey(format);
  let first=null,second=null;
  for(const c of LIB){
    if(c.tok.length<4)continue;
    const uni=multisetDice(a,c.tok),bi=multisetDice(ab,c.bi);
    const fb=formatKey(c.format),fm=fa&&fb?(fa===fb?1:0):0.5;
    let score=uni*0.57+bi*0.36+fm*0.07;
    if(['Open','Hero','Girl'].includes(c.label))score+=0.012;
    score=Math.min(1,score);
    const row={entry:c.w,label:c.label,score,reason:'body'};
    if(!first||score>first.score){second=first;first=row}else if(!second||score>second.score)second=row;
  }
  if(!first||first.score<0.74)return null;
  const gap=second?first.score-second.score:1;
  const ambiguous=gap<0.035&&first.score<0.93;
  return {...first,ambiguous,secondScore:second?.score||0};
}
function enrichSection(s){
  if(!s||s.type!=='wod')return null;
  const m=matchWod(s.name,s.format,s.text);
  if(!m||m.ambiguous)return m;
  s.libraryId=m.entry.id||s.libraryId||'';
  s.libraryCategory=m.entry.category||'';
  s.libraryName=m.entry.name||'';
  s.matchedType=m.label;
  s.matchConfidence=Math.round(m.score*100);
  s.matchVersion=PATCH_VERSION;
  if(genericName(s.name)&&m.entry.name)s.name=m.entry.name;
  if(!s.format&&m.entry.format)s.format=m.entry.format;
  if((!s.scoreType||s.scoreType==='time')&&m.entry.scoreType)s.scoreType=m.entry.scoreType;
  return m;
}
function enrichState(v){
  if(!v||typeof v!=='object')return;
  v.appVersion=PATCH_VERSION;
  for(const w of v.workouts||[])for(const s of w.sections||[])enrichSection(s);
}
if(window.TJDB?.set){
  const originalSet=window.TJDB.set.bind(window.TJDB);
  window.TJDB.set=async (key,value)=>{if(key==='state.v1')enrichState(value);return originalSet(key,value)};
}

function setValue(el,value){if(!el||value==null)return;el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}))}
function matchEditorSection(sec){
  const text=sec.querySelector('[data-sec-field="text"]');
  const scoreType=sec.querySelector('[data-sec-field="scoreType"]');
  if(!text||!scoreType)return null;
  const name=sec.querySelector('[data-sec-field="name"]'),format=sec.querySelector('[data-sec-field="format"]');
  const m=matchWod(name?.value||'',format?.value||'',text.value||'');
  const old=sec.querySelector('.v013-wod-match'); if(old)old.remove();
  if(!m)return null;
  const badge=document.createElement('div');badge.className='v013-wod-match';
  if(m.ambiguous){
    badge.innerHTML=`<strong>Possibile corrispondenza</strong><span>${escapeHtml(m.label)} · ${escapeHtml(m.entry.name||'WOD')} · ${Math.round(m.score*100)}%</span><small>Non collegato automaticamente: corrispondenza non abbastanza univoca.</small>`;
  }else{
    if(name&&genericName(name.value)&&m.entry.name)setValue(name,m.entry.name);
    if(format&&!format.value&&m.entry.format)setValue(format,m.entry.format);
    if(scoreType&&m.entry.scoreType)setValue(scoreType,m.entry.scoreType);
    badge.innerHTML=`<strong>✓ Riconosciuto</strong><span>${escapeHtml(m.label)} · ${escapeHtml(m.entry.name||'WOD')} · ${Math.round(m.score*100)}%</span><small>Il testo importato resta invariato, compresi i carichi.</small>`;
  }
  const body=sec.querySelector('.section-body');if(body)body.insertBefore(badge,body.firstChild);
  return m;
}
function escapeHtml(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function enhanceEditor(){document.querySelectorAll('.workout-section[data-section-id]').forEach(matchEditorSection)}
function enhanceReadOnly(){
  document.querySelectorAll('.workout-section:not([data-section-id]):not([data-log-section])').forEach(sec=>{
    if(sec.querySelector('.v013-read-badge'))return;
    const head=sec.querySelector('.section-head'),strong=head?.querySelector('strong');
    if(!head||!strong||!/^wod$/i.test(strong.textContent.trim()))return;
    const body=sec.querySelector('.section-body')?.innerText||'';
    const first=body.split('\n').map(x=>x.trim()).filter(Boolean);
    const maybeName=first[0]||'';const maybeFormat=first.find(x=>/^(for time|amrap|emom|chipper)/i.test(x))||'';
    const m=matchWod(maybeName,maybeFormat,body);if(!m||m.ambiguous)return;
    const b=document.createElement('span');b.className='badge accent v013-read-badge';b.textContent=`${m.label} · ${m.entry.name}`;head.appendChild(b);
  });
}
function runEnhance(){enhanceEditor();enhanceReadOnly()}
let timer=null;function schedule(){clearTimeout(timer);timer=setTimeout(runEnhance,90)}
const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
document.addEventListener('input',e=>{if(e.target.closest?.('.workout-section[data-section-id]')&&e.target.matches?.('[data-sec-field="text"],[data-sec-field="name"],[data-sec-field="format"]'))schedule()},true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-v012-apply-import]'))setTimeout(runEnhance,130)},true);

const style=document.createElement('style');style.textContent=`
.v013-wod-match{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;align-items:center;padding:10px 12px;margin-bottom:10px;border:1px solid color-mix(in srgb,var(--accent) 35%,var(--line));border-radius:12px;background:color-mix(in srgb,var(--accent) 7%,white)}
.v013-wod-match strong{color:var(--brand);font-size:.82rem}.v013-wod-match span{font-weight:800;font-size:.86rem}.v013-wod-match small{grid-column:1/-1;color:var(--muted)}
`;
document.head.appendChild(style);
setTimeout(runEnhance,100);
console.info(`Training Journal WOD matcher ${PATCH_VERSION} loaded (${WODS.length} WOD)`);
})();