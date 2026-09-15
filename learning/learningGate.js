// Learning progression gate — new children must complete Learn before Practice.
(function(){
  const PROFILE='abacus-ai-profile-v2';
  const DONE='abacus-ai-learning-v1';
  const app=document.getElementById('app');
  if(!app)return;
  function read(key,fallback={}){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback}catch{return fallback}}
  function profile(){return read(PROFILE,{})}
  function complete(){return read(DONE,{complete:false}).complete===true}
  function isNew(){return profile().experience!=='known'}
  function gatePractice(e){
    if(!isNew()||complete())return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const learn=document.getElementById('learn');
    if(learn){learn.classList.add('learning-required-pulse');setTimeout(()=>learn.click(),0)}
  }
  function refresh(){
    const practice=document.getElementById('practice');
    const mission=document.getElementById('missionBtn');
    const needs=isNew()&&!complete();
    [practice,mission].forEach(el=>{
      if(!el)return;
      el.classList.toggle('learning-locked',needs);
      el.setAttribute('aria-disabled',String(needs));
      if(el===practice)el.querySelector('small')?.replaceChildren(document.createTextNode(needs?'🔒 Learn first':'Build answers with beads'));
      if(el===mission&&needs)el.querySelector('b')?.replaceChildren(document.createTextNode('Learn first — then practise!'));
    });
    let style=document.getElementById('learning-gate-style');
    if(!style){
      style=document.createElement('style');style.id='learning-gate-style';style.textContent=`.learning-locked{position:relative;filter:saturate(.7);cursor:pointer!important}.learning-locked::after{content:'🔒';position:absolute;top:10px;right:12px;font-size:22px}.learning-required-pulse{animation:learningRequiredPulse .7s ease 2}@keyframes learningRequiredPulse{50%{transform:scale(1.03)}}`;
      document.head.appendChild(style);
    }
  }
  function markCompleteIfFinished(){
    if(complete())return;
    const eyebrow=(app.textContent||'').match(/LEARN\s·\s5\/5/i);
    const status=app.querySelector('.learning-status.ok');
    if(eyebrow&&status){
      localStorage.setItem(DONE,JSON.stringify({complete:true,completedAt:Date.now(),version:1}));
      setTimeout(refresh,50);
    }
  }
  app.addEventListener('click',function(e){
    const practice=e.target.closest('#practice,#missionBtn');
    if(practice)gatePractice(e);
  },true);
  app.addEventListener('click',function(e){
    if(e.target.closest('#learn')&&isNew()&&!complete()){
      setTimeout(function(){document.querySelector('[data-learning-id="1"]')?.click()},100);
    }
  });
  new MutationObserver(function(){refresh();markCompleteIfFinished()}).observe(app,{childList:true,subtree:true});
  refresh();
})();
