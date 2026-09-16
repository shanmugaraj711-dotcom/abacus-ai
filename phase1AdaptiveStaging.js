// Phase 1 staging-only adaptive audit helper.
// IMPORTANT: this helper is passive. It must never replace the real challenge flow.
(function(){
 const KEY='abacus-ai-phase1-wrong-count-v1';
 const load=()=>{try{return Number(localStorage.getItem(KEY)||0)}catch{return 0}};
 const save=n=>{try{localStorage.setItem(KEY,String(n))}catch{}};
 function install(){
  if(window.__abacusAdaptiveAuditInstalled)return;
  window.__abacusAdaptiveAuditInstalled=true;
  document.addEventListener('click',e=>{
   const btn=e.target.closest('#check');
   if(!btn)return;
   const p=document.querySelector('.problem');
   const m=p?.textContent.match(/(\d+)\s*([+−-])\s*(\d+)/);
   if(!m)return;
   let value=0;
   document.querySelectorAll('[data-lower]').forEach(x=>{if(x.classList.contains('active'))value+=Math.pow(10,Number(x.dataset.lower))});
   document.querySelectorAll('[data-upper]').forEach(x=>{if(x.classList.contains('active'))value+=5*Math.pow(10,Number(x.dataset.upper))});
   const a=Number(m[1]),b=Number(m[3]),answer=m[2]==='+'?a+b:a-b;
   if(value===answer){save(0);return;}
   save(Math.min(2,load()+1));
   // Do NOT preventDefault, stop propagation, alert, reload, or mutate progress.
   // challengeApp.js owns the real result/level progression.
  },true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
 window.Phase1AdaptiveStaging={load,reset:()=>save(0),passive:true};
})();
