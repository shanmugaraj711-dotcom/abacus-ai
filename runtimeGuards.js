// Runtime-only guards. Nothing here runs until the real app has booted.
(function(){
  const PROFILE='abacus-ai-profile-v2';
  const DONE='abacus-ai-learning-v1';
  const app=document.getElementById('app');
  if(!app)return;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch{return f}};
  const isNew=()=>read(PROFILE,{}).experience!=='known';
  const learned=()=>read(DONE,{complete:false}).complete===true;
  const toast=(text)=>{const old=document.querySelector('.toast');old?.remove();const t=document.createElement('div');t.className='toast';t.textContent=text;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)};
  let learnPromise=null,gamesPromise=null;
  const openLearn=async()=>{
    if(window.__abacusLearningOpen)return window.__abacusLearningOpen();
    if(!learnPromise)learnPromise=import('./learning/learningHub.js?v=20260915-learn1');
    try{await learnPromise;window.__abacusLearningOpen?.()}catch(err){console.error(err);toast('Babi could not open Learn. Please try again.');}
  };
  const openGames=async()=>{
    if(window.__abacusPlay)return window.__abacusPlay();
    if(!gamesPromise)gamesPromise=import('./playModes.js?v=20260915-play1');
    try{await gamesPromise;window.__abacusPlay?.()}catch(err){console.error(err);toast('Games could not open yet. Please try again.');}
  };
  const decorate=()=>{
    const needs=isNew()&&!learned();
    const practice=document.getElementById('practice');
    const mission=document.getElementById('missionBtn');
    [practice,mission].forEach(el=>{
      if(!el)return;
      const small=el.querySelector('small');
      if(small){const text=el===practice?(needs?'🔒 Learn first':'Build answers with beads'):small.textContent;if(small.textContent!==text)small.textContent=text}
      const oldClass=el.classList.contains('learning-locked');
      if(oldClass!==needs)el.classList.toggle('learning-locked',needs);
      const aria=String(needs);if(el.getAttribute('aria-disabled')!==aria)el.setAttribute('aria-disabled',aria);
    });
    const levels=document.querySelectorAll('[data-level]');
    if(levels.length){
      const current=Math.max(1,Math.min(15,Number(read('abacus-ai-progress-v2',{currentLevel:1}).currentLevel)||1));
      levels.forEach(btn=>{
        const n=Number(btn.dataset.level),locked=n>6||n>current;
        if(!Number.isFinite(n))return;
        if(btn.disabled!==locked)btn.disabled=locked;
        const cls=btn.classList.contains('locked');if(cls!==locked)btn.classList.toggle('locked',locked);
        const aria=String(locked);if(btn.getAttribute('aria-disabled')!==aria)btn.setAttribute('aria-disabled',aria);
      });
    }
  };
  let styleReady=false;
  const ensureStyle=()=>{if(styleReady)return;styleReady=true;const s=document.createElement('style');s.textContent='.learning-locked{position:relative;filter:saturate(.7)}.learning-locked::after{content:"🔒";position:absolute;top:9px;right:10px;font-size:20px}';document.head.appendChild(s)};
  document.addEventListener('click',e=>{
    const learn=e.target.closest?.('#learn');
    if(learn){e.preventDefault();e.stopImmediatePropagation();openLearn();return}
    const games=e.target.closest?.('#games');
    if(games){e.preventDefault();e.stopImmediatePropagation();openGames();return}
    const practice=e.target.closest?.('#practice,#missionBtn');
    if(practice&&isNew()&&!learned()){e.preventDefault();e.stopImmediatePropagation();openLearn();return}
    const level=e.target.closest?.('[data-level]');
    if(level){const n=Number(level.dataset.level),p=read('abacus-ai-progress-v2',{currentLevel:1}),current=Math.max(1,Math.min(15,Number(p.currentLevel)||1));if(n>6){e.preventDefault();e.stopImmediatePropagation();toast('More levels are coming later 🔒');return}if(n>current){e.preventDefault();e.stopImmediatePropagation();toast(`Master Level ${current} first ⭐`);return}}
  },true);
  const observer=new MutationObserver(()=>{ensureStyle();decorate()});
  observer.observe(app,{childList:true,subtree:true});
  ensureStyle();decorate();
  window.__abacusRuntimeGuards={version:1,openLearn,openGames};
})();
