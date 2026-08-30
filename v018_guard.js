(() => {
'use strict';
const NativeMutationObserver=window.MutationObserver;
if(!NativeMutationObserver||NativeMutationObserver.__tjAdaptiveGuard)return;

const OWN_SELECTORS=[
  '.ae-section',
  '.ae-calendar-dot',
  '[data-ae-new]',
  '[data-test-open]',
  '.ae-test-summary',
  '.day-swipe-nav'
];

function isOwnNode(node){
  if(!(node instanceof Element))return true;
  return OWN_SELECTORS.some(sel=>node.matches(sel)||node.closest(sel));
}

function isUiOnlyMutation(record){
  if(record.type!=='childList')return false;
  const target=record.target instanceof Element?record.target:null;
  if(target&&OWN_SELECTORS.some(sel=>target.matches(sel)||target.closest(sel)))return true;
  const changed=[...record.addedNodes,...record.removedNodes].filter(n=>n.nodeType===1);
  return changed.length>0&&changed.every(isOwnNode);
}

class GuardedMutationObserver{
  constructor(callback){
    this._inner=new NativeMutationObserver((records)=>{
      const meaningful=records.filter(r=>!isUiOnlyMutation(r));
      if(meaningful.length)callback(meaningful,this);
    });
  }
  observe(...args){return this._inner.observe(...args)}
  disconnect(){return this._inner.disconnect()}
  takeRecords(){return this._inner.takeRecords()}
}
GuardedMutationObserver.__tjAdaptiveGuard=true;
window.MutationObserver=GuardedMutationObserver;
console.info('Training Journal render guard v0.2.1 loaded');
})();
