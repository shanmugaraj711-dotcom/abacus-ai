// Connect the existing World Play button to the shared Play layer without duplicating the app router.
function wirePlay(){
  const btn=document.querySelector('#games');
  if(!btn||btn.dataset.playWired==='1')return;
  btn.dataset.playWired='1';
  btn.addEventListener('click',e=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    window.__abacusPlay?.();
  },{capture:true});
}
new MutationObserver(wirePlay).observe(document.body,{childList:true,subtree:true});
wirePlay();
