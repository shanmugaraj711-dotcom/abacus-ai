/* Abacus interaction adapter
   Core state lives in challengeApp.js. This file owns only touch/drag input
   and a single DOM render path: count -> active classes -> CSS movement.
   Practice uses its own renderer and is intentionally excluded here.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];
  const STYLE='abacusInteractionUXStyle';

  if(!document.getElementById(STYLE)){
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      .abacus-wrap{user-select:none;-webkit-user-select:none}
      .abacus-inner{background:linear-gradient(180deg,#6B4226,#4F301B);box-shadow:inset 0 2px 0 rgba(255,255,255,.08)}
      .abacus .bead{position:relative;z-index:5;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent}
      .abacus .bead.lower,.abacus .bead.upper{transition:transform .2s ease,filter .15s ease,box-shadow .15s ease}
      .abacus .bead.lower.active{transform:translateY(-118px)}
      .abacus .bead.upper.active{transform:translateY(50px)}
      .abacus .bead.active{filter:brightness(1.08);box-shadow:inset 0 3px 5px rgba(255,255,255,.28),0 4px 7px rgba(0,0,0,.32)}
      .abacus .bead:active{filter:brightness(1.12)}
      .abx-touch-tip{margin:8px 0 0;padding:9px 11px;border-radius:12px;background:#EEF8EA;border:1px solid #B9D9B8;color:#35633B;font-size:11px;font-weight:800}
      .demo-card .demo-abacus .abacus-wrap{pointer-events:none;opacity:.96}
      .demo-card .demo-abacus .abacus-wrap .bead{cursor:default}
      .foundation-lesson .rod-column:nth-child(2),.demo-card .demo-abacus .rod-column:nth-child(2){display:none}
      .foundation-lesson .lesson-list{display:none}
      .lesson-demo-display{margin:8px auto 0;padding:8px 12px;border-radius:12px;background:#FFF7E7;border:1px solid #E2C89A;color:#6B4226;text-align:center;font-size:12px;font-weight:900}.lesson-demo-display strong{font-size:20px;margin-left:5px}.lesson-demo-display span{margin-right:4px}
      @media(max-width:520px){
        .abacus{padding:16px 10px;border-width:7px;border-radius:19px}
        .abacus-inner{gap:8px;padding:13px 8px}
        .rod-column{min-height:285px}
        .bead,.abacus .bead{width:58px;height:35px;min-width:58px;min-height:35px}
        .bead.upper,.abacus .bead.upper{width:64px;height:42px}
        .abacus .bead.lower.active{transform:translateY(-105px)}
        .abacus .bead.upper.active{transform:translateY(44px)}
      }
    `;document.head.appendChild(s)
  }

  function renderRod(root,count){
    if(!root)return;
    const beads=qa('.lower-zone .bead',root);
    const safe=Math.max(0,Math.min(beads.length,Number(count)||0));
    beads.forEach((bead,index)=>bead.classList.toggle('active',index<safe));
  }

  function renderFromDom(root){
    if(!root)return;
    qa('.rod-column',root).forEach(column=>{
      const lower=qa('.lower-zone .bead',column);
      renderRod(column,lower.filter(b=>b.classList.contains('active')).length);
      const upper=q('.upper-zone .bead',column);
      if(upper)upper.classList.toggle('active',upper.classList.contains('active'));
    });
  }

  function install(root){
    if(!root||root.dataset.abxUnified==='1')return;
    root.dataset.abxUnified='1';
    let down=null;
    root.addEventListener('pointerdown',e=>{
      const bead=e.target.closest('.bead');
      if(!bead||!root.contains(bead))return;
      down={bead,x:e.clientX,y:e.clientY};
    },{passive:true});
    root.addEventListener('pointerup',e=>{
      if(!down)return;
      const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>12;
      if(moved){e.preventDefault();down.bead.click()}
      down=null;
    },{passive:false});
    root.addEventListener('click',()=>requestAnimationFrame(()=>renderFromDom(root)));
    renderFromDom(root);
  }

  function scan(){
    // Practice has a dedicated state->DOM renderer. Never attach the generic
    // adapter here, otherwise drag/tap events can be processed twice.
    qa('.abacus-wrap:not(.pex-abacus)').forEach(install);
    const lesson=q('.lesson-card');
    if(lesson){
      const title=q('h1',lesson)?.textContent?.trim()||'';
      if(['Meet the abacus','Make 1–4','Meet 5','Make 6–9','Tiny challenge'].includes(title))lesson.classList.add('foundation-lesson');
    }
  }

  const observer=new MutationObserver(scan);
  observer.observe(app,{childList:true,subtree:true});
  scan();
})();