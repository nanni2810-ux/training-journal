(() => {
'use strict';
const VERSION='0.2.8';
const STATE_KEY='state.v1';
if(!window.TJDB?.get||!window.TJDB?.set)return;

const baseGet=window.TJDB.get.bind(window.TJDB);
const baseSet=window.TJDB.set.bind(window.TJDB);

function asArray(v){return Array.isArray(v)?v:[]}
function norm(v){return String(v||'').trim().toLowerCase().replace(/\s+/g,' ')}
function uniq(v){return [...new Set(asArray(v).filter(Boolean))]}
function clone(v){return v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))}
function dayNo(v){if(!validDate(v))return null;const [y,m,d]=String(v).split('-').map(Number);return Date.UTC(y,m-1,d)/86400000}
function datesOf(c){return uniq([c?.date,c?.startDate,c?.endDate,...asArray(c?.dates)]).filter(validDate).sort()}
function firstDate(c){return datesOf(c)[0]||''}
function lastDate(c){const d=datesOf(c);return d[d.length-1]||''}
function dateDistance(a,b){
  const ae=dayNo(lastDate(a)),bs=dayNo(firstDate(b));
  if(ae==null||bs==null)return Infinity;
  if(bs<=ae)return 0;
  return bs-ae;
}
function compatible(a,b){
  if(norm(a?.name)!==norm(b?.name))return false;
  if(norm(a?.type||a?.discipline)!==norm(b?.type||b?.discipline))return false;
  const ad=norm(a?.division),bd=norm(b?.division);if(ad&&bd&&ad!==bd)return false;
  const al=norm(a?.location),bl=norm(b?.location);if(al&&bl&&al!==bl)return false;
  return Math.min(dateDistance(a,b),dateDistance(b,a))<=4;
}
function itemKey(item){
  if(!item||typeof item!=='object')return '';
  if(item.id)return `id:${item.id}`;
  return `content:${norm(item.name||item.title)}|${norm(item.format)}|${norm(item.workout||item.text||item.description)}|${norm(item.score)}`;
}
function mergeObjects(values){
  const out=[],seen=new Set();
  for(const item of values.flatMap(asArray)){
    if(!item||typeof item!=='object')continue;
    const key=itemKey(item);if(key&&seen.has(key))continue;
    if(key)seen.add(key);out.push(clone(item));
  }
  return out;
}
function prefer(a,b,field){return a?.[field]!==''&&a?.[field]!=null?a[field]:b?.[field]}
function mergeCompetition(a,b){
  const dates=uniq([...datesOf(a),...datesOf(b)]).sort();
  const start=dates[0]||a?.date||b?.date||'';
  const end=dates[dates.length-1]||start;
  const sourceIds=uniq([a?.id,b?.id,...asArray(a?.sourceCompetitionIds),...asArray(b?.sourceCompetitionIds)]);
  const events=mergeObjects([a?.events,b?.events]);
  const wods=mergeObjects([a?.wods,b?.wods]);
  return {
    ...clone(a||{}),
    ...clone(b||{}),
    id:a?.id||b?.id,
    name:prefer(a,b,'name')||'Gara',
    type:prefer(a,b,'type')||prefer(a,b,'discipline')||'crossfit',
    division:prefer(a,b,'division')||'',
    location:prefer(a,b,'location')||'',
    result:prefer(a,b,'result')||'',
    notes:prefer(a,b,'notes')||'',
    placement:prefer(a,b,'placement')||'',
    date:start,
    startDate:start,
    endDate:end!==start?end:'',
    dates,
    events,
    ...(wods.length?{wods}:{}),
    sourceCompetitionIds:sourceIds
  };
}
function groupCompetitions(list){
  const rows=asArray(list).filter(x=>x&&typeof x==='object').map(clone).sort((a,b)=>firstDate(a).localeCompare(firstDate(b)));
  const groups=[];
  for(const row of rows){
    let ix=-1;
    for(let i=groups.length-1;i>=0;i--){if(compatible(groups[i],row)){ix=i;break}}
    if(ix<0)groups.push(row);else groups[ix]=mergeCompetition(groups[ix],row);
  }
  return groups;
}
function normalizeState(state){
  if(!state||typeof state!=='object'||!Array.isArray(state.competitions))return {state,changed:false};
  const merged=groupCompetitions(state.competitions);
  const before=JSON.stringify(state.competitions),after=JSON.stringify(merged);
  if(before===after)return {state,changed:false};
  return {state:{...state,competitions:merged,appVersion:VERSION},changed:true};
}

window.TJDB.get=async function(key){
  const value=await baseGet(key);
  if(key!==STATE_KEY)return value;
  const normalized=normalizeState(value);
  if(normalized.changed)await baseSet(key,normalized.state);
  return normalized.state;
};
window.TJDB.set=async function(key,value){
  if(key!==STATE_KEY)return baseSet(key,value);
  return baseSet(key,normalizeState(value).state);
};

function fmtDate(v){
  if(!validDate(v))return String(v||'');
  const [y,m,d]=v.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(y,m-1,d,12));
}
function rangeLabel(c){const ds=datesOf(c);if(!ds.length)return'';return ds.length===1?fmtDate(ds[0]):`${fmtDate(ds[0])}–${fmtDate(ds[ds.length-1])}`}
let decorateTimer=null;
async function decorateCompetitionCards(){
  const app=document.getElementById('app');if(!app)return;
  const buttons=[...app.querySelectorAll('[data-action="edit-competition"][data-id]')];if(!buttons.length)return;
  const state=await window.TJDB.get(STATE_KEY);const map=new Map(asArray(state?.competitions).map(c=>[String(c.id),c]));
  for(const button of buttons){
    const comp=map.get(String(button.dataset.id));if(!comp)continue;
    const card=button.closest('.card');const meta=card?.querySelector('p.muted.small');if(!meta)continue;
    const parts=[rangeLabel(comp),comp.type==='crossfit'?'CrossFit':'Pesistica',comp.division||'',comp.location||''].filter(Boolean);
    meta.textContent=parts.join(' · ');
  }
}
function scheduleDecorate(){clearTimeout(decorateTimer);decorateTimer=setTimeout(()=>decorateCompetitionCards().catch(()=>{}),60)}
const app=document.getElementById('app');if(app)new MutationObserver(scheduleDecorate).observe(app,{childList:true,subtree:true});
scheduleDecorate();

window.TJCompetitionGrouping={version:VERSION,groupCompetitions};
console.info(`Training Journal competition grouping ${VERSION} loaded`);
})();
