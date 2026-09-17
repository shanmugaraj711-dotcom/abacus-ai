/* Learn progression fix: one correct Check unlocks the next lesson. */
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  function unlockIfCorrect(){
    const feedback=document.getElementById('lessonFeedback');
    const next=document.getElementById('lessonGo');
    if(!feedback||!next)return;
    const text=(feedback.textContent||'').trim();
    if(/^Great!/.test(text)||/^You got it!/.test(text)) next.disabled=false;
  }
  new MutationObserver(unlockIfCorrect).observe(app,{childList:true,subtree:true,characterData:true});
  app.addEventListener('click',()=>setTimeout(unlockIfCorrect,0),true);
  unlockIfCorrect();
})();
