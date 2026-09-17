// Phase 2 staging QA instrumentation. No production behavior; exposes a deterministic audit of the beginner path contract.
(function(){
 const REQUIRED=['childName','age','experience'];
 const result={name:'beginner-zero-parent',checks:{},run(){
   const app=document.querySelector('#app');
   this.checks.boot=!!app;
   this.checks.nameInput=!!document.querySelector('#childName');
   this.checks.ageChoices=document.querySelectorAll('[data-age]').length>=4;
   this.checks.experienceChoices=document.querySelectorAll('[data-exp]').length>=2;
   this.checks.primaryDisabledWithoutInput=!!document.querySelector('#obNext')?.disabled;
   this.checks.zeroParentControls=REQUIRED.every(k=>k==='childName'?!!document.querySelector('#childName'):k==='age'?document.querySelectorAll('[data-age]').length>=4:document.querySelectorAll('[data-exp]').length>=2);
   this.checks.foundationTracker=!!window.LevelZero;
   this.checks.persistence=(()=>{try{const k='__abacus_phase2_q';localStorage.setItem(k,'1');const ok=localStorage.getItem(k)==='1';localStorage.removeItem(k);return ok}catch{return false}})();
   this.ok=Object.values(this.checks).every(Boolean);return this;
 }};
 window.BeginnerZeroParentQA=result;
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>result.run());else result.run();
})();
