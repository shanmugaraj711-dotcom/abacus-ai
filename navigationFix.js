// Navigation guard: keep Learn and Practice as two different destinations.
(function(){
  let busy=false;
  function practice(){
    const b=document.getElementById('practice');
    if(b){busy=true;b.click();setTimeout(()=>{busy=false},250);return true}
    return false;
  }
  function route(){
    if(location.hash!=='#start-level-1')return;
    location.hash='';
    if(practice())return;
    const timer=setInterval(()=>{if(practice()){clearInterval(timer)}},80);
    setTimeout(()=>clearInterval(timer),4000);
  }
  document.addEventListener('click',e=>{
    const learn=e.target?.closest?.('#learn');
    if(learn && window.__abacusLearningOpen){e.preventDefault();e.stopImmediatePropagation();window.__abacusLearningOpen();return}
    const practiceBtn=e.target?.closest?.('#practice');
    if(practiceBtn && busy){e.preventDefault();e.stopImmediatePropagation()}
  },true);
  window.addEventListener('hashchange',route);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',route);else route();
  new MutationObserver(()=>{if(location.hash==='#start-level-1')route()}).observe(document.documentElement,{childList:true,subtree:true});
})();
