// Hard navigation guard: Learn is the teaching hub; Practise is the live bead challenge.
(function(){
  let busy=false;
  const markHandled=b=>{try{b.__abacusPracticeHandled=true}catch{}};
  const runPractice=()=>{
    if(busy)return true;
    const b=document.getElementById('practice');
    if(!b)return false;
    const handler=b.onclick;
    if(typeof handler!=='function')return false;
    busy=true;markHandled(b);
    try{handler.call(b,new MouseEvent('click',{bubbles:false,cancelable:true,view:window}))}
    finally{setTimeout(()=>busy=false,350)}
    return true;
  };
  const route=()=>{
    if(location.hash!=='#start-level-1')return;
    history.replaceState(null,'',location.pathname+location.search);
    runPractice();
    const timer=setInterval(()=>{if(runPractice())clearInterval(timer)},60);
    setTimeout(()=>clearInterval(timer),4000);
  };
  const nativeClick=Element.prototype.click;
  Element.prototype.click=function(){
    if(this?.id==='practice'&&this.__abacusPracticeHandled)return;
    return nativeClick.call(this);
  };
  document.addEventListener('click',e=>{
    const learn=e.target?.closest?.('#learn');
    if(learn&&window.__abacusLearningOpen){e.preventDefault();e.stopImmediatePropagation();window.__abacusLearningOpen();return}
    const practice=e.target?.closest?.('#practice');
    if(practice&&!busy){e.preventDefault();e.stopImmediatePropagation();runPractice();}
  },true);
  window.addEventListener('hashchange',route);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',route);else route();
  new MutationObserver(()=>{if(location.hash==='#start-level-1')route()}).observe(document.documentElement,{childList:true,subtree:true});
})();
