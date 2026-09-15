// Phase 5 QA guard — keep the visible Master Path sequential without touching scoring.
(function(){
  const PROGRESS='abacus-ai-progress-v2';
  const ROOT='phase5-flow-guard';
  const load=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}};
  function run(){
    const screen=document.querySelector('#app .screen');
    if(!screen)return;
    const heading=screen.querySelector('h1,h2');
    if(!heading||!/^Master Path$/i.test((heading.textContent||'').trim()))return;
    const p=load(PROGRESS,{currentLevel:1});
    const current=Math.max(1,Math.min(15,Number(p.currentLevel)||1));
    screen.querySelectorAll('[data-level]').forEach(btn=>{
      const n=Number(btn.dataset.level);
      if(!Number.isFinite(n))return;
      const locked=n>6||n>current;
      btn.disabled=locked;
      btn.classList.toggle('locked',locked);
      btn.setAttribute('aria-disabled',String(locked));
      if(locked&&n<=6){
        btn.title=`Master Level ${current} first`;
      }else if(locked){
        btn.title='Coming later';
      }else{
        btn.removeAttribute('title');
      }
    });
    let style=document.getElementById(ROOT+'-style');
    if(!style){
      style=document.createElement('style');style.id=ROOT+'-style';
      style.textContent=`.world-level.locked[aria-disabled="true"]{cursor:not-allowed;filter:saturate(.55)}.world-level.locked[aria-disabled="true"]:focus{outline:2px solid rgba(107,66,38,.25);outline-offset:2px}`;
      document.head.appendChild(style);
    }
    window.Phase5FlowGuard={version:1,passive:true,currentLevel:current};
  }
  const app=document.getElementById('app');if(!app)return;
  let pending=false;
  const schedule=()=>{if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;run()})};
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
})();
