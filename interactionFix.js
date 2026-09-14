// Reliability guard for the child onboarding flow.
// It deliberately duplicates only the persistence step so the primary CTA
// can never appear clickable while having no effect on a mobile browser.
(() => {
  const PROFILE_KEY='abacus-ai-profile-v2';
  const boot=()=>{
    const btn=document.getElementById('obNext');
    if(!btn||btn.dataset.wired==='1')return;
    btn.dataset.wired='1';
    btn.type='button';
    btn.addEventListener('click',()=>{
      const name=(document.getElementById('childName')?.value||'').trim();
      const age=document.querySelector('[data-age].selected')?.dataset.age||'';
      const experience=document.querySelector('[data-exp].selected')?.dataset.exp||'';
      if(!name||!age||!experience){
        btn.focus();
        return;
      }
      try{
        localStorage.setItem(PROFILE_KEY,JSON.stringify({name,age,experience,createdAt:Date.now()}));
        // A clean reload guarantees the persisted profile is consumed by the
        // module even when a mobile WebView delays an inline handler update.
        location.href=location.pathname+'?world=1&v=20260914';
      }catch(err){
        console.error('Onboarding save failed',err);
      }
    },{capture:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  new MutationObserver(boot).observe(document.documentElement,{childList:true,subtree:true});
})();
