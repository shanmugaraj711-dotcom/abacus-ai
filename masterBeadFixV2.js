/* Permanent bead visual renderer.
   Core challenge handlers own numeric state. This layer mirrors each browser
   native click into the bead visuals for Learn and Practice.
   No synthetic pointer/touch/click events are generated.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  function install(){
    app.querySelectorAll('.abacus-wrap:not(.pex-abacus)').forEach(root=>{
      if(root.dataset.masterBeadRendererV2==='1')return;
      root.dataset.masterBeadRendererV2='1';

      root.addEventListener('click',event=>{
        const bead=event.target.closest('.bead');
        if(!bead||!root.contains(bead))return;

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
