/* Master Practice interaction safety net.
   Core challenge state remains in challengeApp.js; this only guarantees that
   a real pointer/touch event reaches the bead and that the visual state is
   rendered immediately after the core click handler runs.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  function install(){
    const root=app.querySelector('.practice-meta')?.parentElement?.querySelector('.abacus-wrap:not(.pex-abacus)');
    if(!root||root.dataset.masterFix==='1')return;
    root.dataset.masterFix='1';
    root.addEventListener('pointerdown',e=>{
      const bead=e.target.closest('.bead');
      if(!bead||!root.contains(bead))return;
      bead.style.pointerEvents='auto';
    },{passive:true});
    root.addEventListener('touchstart',e=>{
      const bead=e.target.closest('.bead');
      if(bead&&root.contains(bead))bead.style.pointerEvents='auto';
    },{passive:true});
    root.addEventListener('click',()=>requestAnimationFrame(()=>{
      root.querySelectorAll('.rod-column').forEach(col=>{
        const lowers=[...col.querySelectorAll('.lower-zone .bead')];
        const count=lowers.filter(b=>b.classList.contains('active')).length;
        lowers.forEach((b,i)=>b.classList.toggle('active',i<count));
      });
    }));
  }
  const observer=new MutationObserver(install);
  observer.observe(app,{childList:true,subtree:true});
  install();
})();