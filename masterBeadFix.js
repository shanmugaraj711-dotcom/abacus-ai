/* Master Practice bead input bridge.
   The core challenge state remains in challengeApp.js.
   This file only makes mobile bead taps reliably reach the existing bead click
   handler and keeps the visual lower-bead state normalized after that handler.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  const isMasterPractice=()=>!!app.querySelector('.practice-meta');

  function sync(root){
    if(!root)return;
    root.querySelectorAll('.rod-column').forEach(col=>{
      const lowers=[...col.querySelectorAll('.lower-zone .bead')];
      const active=lowers.filter(b=>b.classList.contains('active')).length;
      lowers.forEach((b,i)=>b.classList.toggle('active',i<active));
    });
  }

  function install(){
    if(!isMasterPractice())return;
    const root=app.querySelector('.practice-meta')?.parentElement?.querySelector('.abacus-wrap:not(.pex-abacus)');
    if(!root||root.dataset.masterBeadBridge==='1')return;
    root.dataset.masterBeadBridge='1';

    let lastSynthetic=0;
    const activate=e=>{
      const bead=e.target?.closest?.('.bead');
      if(!bead||!root.contains(bead))return;
      const now=Date.now();
      if(now-lastSynthetic<350)return;
      lastSynthetic=now;
      e.preventDefault();
      e.stopPropagation();
      bead.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      requestAnimationFrame(()=>{
        if(root.isConnected)sync(root);
      });
    };

    root.addEventListener('pointerup',activate,{capture:true,passive:false});
    root.addEventListener('touchend',activate,{capture:true,passive:false});
    root.addEventListener('click',()=>requestAnimationFrame(()=>sync(root)));
    sync(root);
  }

  const observer=new MutationObserver(install);
  observer.observe(app,{childList:true,subtree:true});
  install();
})();
