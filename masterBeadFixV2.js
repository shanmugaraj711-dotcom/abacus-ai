/* Unified bead visual adapter.
   challengeApp.js remains the authoritative numeric state owner.
   After a native click, this layer only renders visuals when the core handler
   did not already render them. This prevents double-toggling Learn while also
   covering Practice, Assessment and Bead Builder where callbacks may only
   update the numeric display.
   No synthetic pointer/touch/click events are generated.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  const activeSignature=root=>[...root.querySelectorAll('.bead')].map(b=>b.classList.contains('active')?'1':'0').join('');

  function install(){
    app.querySelectorAll('.abacus-wrap:not(.pex-abacus)').forEach(root=>{
      if(root.dataset.masterBeadRendererV3==='1')return;
      root.dataset.masterBeadRendererV3='1';
      let before=null;

      root.addEventListener('pointerdown',event=>{
        const bead=event.target.closest('.bead');
        if(!bead||!root.contains(bead))return;
        before={bead,signature:activeSignature(root)};
      },{passive:true});

      root.addEventListener('click',event=>{
        const bead=event.target.closest('.bead');
        if(!bead||!root.contains(bead))return;

        /* If the authoritative handler already changed the active classes,
           leave them alone. This is the normal Learn/Lesson path. */
        if(before&&before.bead===bead&&before.signature!==activeSignature(root)){
          before=null;
          return;
        }
        before=null;

        if(bead.classList.contains('upper')){
          bead.classList.toggle('active');
          return;
        }

        if(bead.classList.contains('lower')){
          const col=bead.closest('.rod-column');
          if(!col)return;
          const lowers=[...col.querySelectorAll('.lower-zone .bead')];
          const index=lowers.indexOf(bead);
          const activeCount=lowers.filter(b=>b.classList.contains('active')).length;
          const nextCount=index<activeCount?activeCount-1:Math.min(4,activeCount+1);
          lowers.forEach((b,i)=>b.classList.toggle('active',i<nextCount));
        }
      });
    });
  }

  new MutationObserver(install).observe(app,{childList:true,subtree:true});
  install();
})();
