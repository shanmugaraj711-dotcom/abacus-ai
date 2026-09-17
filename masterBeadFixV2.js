/* Canonical bead visual adapter.
   challengeApp.js + abacusEngine.js own state/math. This file only mirrors the
   already-rendered numeric value into bead classes; it never changes state and
   never synthesizes clicks.
*/
(function(){
  const app=document.getElementById('app'); if(!app)return;
  const ids=['lessonValue','practiceValue','assessmentValue','builderValue','demoValue'];
  function valueFor(root){
    const card=root.closest('.lesson-card');
    if(card){const n=card.querySelector('#lessonValue'); if(n)return Number(n.textContent)||0;}
    for(const id of ids){const n=document.getElementById(id);if(n&&n.closest('.screen')===root.closest('.screen'))return Number(n.textContent)||0;}
    return null;
  }
  function render(root){
    const value=valueFor(root); if(!Number.isFinite(value))return;
    [...root.querySelectorAll('.rod-column')].forEach((rod,i)=>{
      const digit=Math.floor(value/Math.pow(10,i))%10;
      const upper=rod.querySelector('.upper-zone .bead');
      const lowers=[...rod.querySelectorAll('.lower-zone .bead')];
      if(upper)upper.classList.toggle('active',digit>=5);
      lowers.forEach((b,j)=>b.classList.toggle('active',j<digit%5));
    });
  }
  const scan=()=>app.querySelectorAll('.abacus-wrap:not(.pex-abacus)').forEach(render);
  new MutationObserver(scan).observe(app,{childList:true,subtree:true,characterData:true});
  scan();
})();
