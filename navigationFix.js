// Deterministic navigation guard: Learn is the teaching hub; Practise is the live bead challenge.
// Practice is opened through an explicit intent flag instead of hash-click races.
(function(){
  let busy=false;
  const INTENT='abacus-ai-open-practice-v1';

  const runPractice=()=>{
    if(busy)return true;
    const b=document.getElementById('practice');
    if(!b||typeof b.onclick!=='function')return false;
    busy=true;
    try{
      b.onclick.call(b,new MouseEvent('click',{bubbles:false,cancelable:true,view:window}));
    }finally{
      setTimeout(()=>{busy=false},350);
    }
    return true;
  };

  const openPracticeAfterBoot=()=>{
    let pending=false;
    try{pending=sessionStorage.getItem(INTENT)==='1'}catch{}
    if(!pending)return false;
    try{sessionStorage.removeItem(INTENT)}catch{}
    history.replaceState(null,'',location.pathname+location.search);
    const timer=setInterval(()=>{if(runPractice())clearInterval(timer)},60);
    setTimeout(()=>clearInterval(timer),5000);
    return true;
  };

  const bindLearningReady=()=>{
    const b=document.getElementById('learningReady');
    if(!b||b.__practiceIntentBound)return;
    b.__practiceIntentBound=true;
    b.onclick=()=>{
      try{sessionStorage.setItem(INTENT,'1')}catch{}
      history.replaceState(null,'',location.pathname+location.search);
      location.reload();
    };
  };

  document.addEventListener('click',e=>{
    const learn=e.target?.closest?.('#learn');
    if(learn&&window.__abacusLearningOpen){
      e.preventDefault();
      e.stopImmediatePropagation();
      window.__abacusLearningOpen();
      return;
    }
    const practice=e.target?.closest?.('#practice');
    if(practice&&!busy){
      e.preventDefault();
      e.stopImmediatePropagation();
      runPractice();
    }
  },true);

  // Bind the Learn Hub's "Ready for Level 1" action after that screen renders.
  new MutationObserver(bindLearningReady).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{bindLearningReady();openPracticeAfterBoot()});
  else {bindLearningReady();openPracticeAfterBoot()}
})();
