// Phase 3 staging QA: verifies the experienced onboarding contract without altering production behavior.
(function(){
 const checks={
  onboarding:!!document.querySelector('#obNext'),
  ageChoices:document.querySelectorAll('[data-age]').length>=4,
  experienceChoices:document.querySelectorAll('[data-exp]').length>=2,
  knownChoice:!!document.querySelector('[data-exp="known"]'),
  storage:(()=>{try{const k='__abacus_phase3_q';localStorage.setItem(k,'1');const ok=localStorage.getItem(k)==='1';localStorage.removeItem(k);return ok}catch{return false}})(),
  backNavigation:!!document.querySelector('.topbar')
 };
 window.Phase3ExperiencedQA={run:()=>({ok:Object.values(checks).every(Boolean),checks})};
})();
