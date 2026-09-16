/* Abacus interaction polish
   Keeps challengeApp.js as the source of truth. This layer only improves touch
   hit areas, bead motion, feedback, and the Learn demo replay.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  const STYLE='abacusInteractionUXStyle';
  if(!document.getElementById(STYLE)){
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      .abacus-wrap{touch-action:none;user-select:none;-webkit-user-select:none}
      .abacus{overflow:visible}
      .abacus-inner{touch-action:none}
      .abacus .bead{position:relative;z-index:5;cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;min-width:64px;min-height:38px}
      .abacus .bead:active{transform:scale(1.08)}
      .abacus .bead.upper:active{transform:translateY(50px) scale(1.08)}
      .abacus .lower-zone{gap:7px;padding-top:5px}
      .abacus .lower-zone .bead{transition:transform .22s cubic-bezier(.2,.8,.2,1),filter .18s ease,box-shadow .18s ease}
      .abacus .lower-zone .bead.active{filter:brightness(1.08);box-shadow:inset 0 3px 5px rgba(255,255,255,.28),0 4px 7px rgba(0,0,0,.32)}
      .abx-pulse{animation:abxPulse .32s ease}
      @keyframes abxPulse{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
      .abx-demo-bead{animation:abxDemoBead .38s cubic-bezier(.2,.8,.2,1) both}
      @keyframes abxDemoBead{0%{transform:translateY(0) scale(.94);opacity:.75}65%{transform:translateY(-10px) scale(1.08)}100%{transform:translateY(0) scale(1);opacity:1}}
      .abx-demo-live{display:flex;align-items:center;gap:9px;margin:10px 0 0;padding:10px 12px;border-radius:14px;background:#FFF7E7;border:1px solid #E2C89A;color:#6B4226;font-size:12px;font-weight:850}
      .abx-demo-live .dot{width:10px;height:10px;border-radius:50%;background:#D99A4A;box-shadow:0 0 0 5px rgba(217,154,74,.15);flex:0 0 auto;animation:abxDot 1s ease-in-out infinite}
      @keyframes abxDot{50%{transform:scale(1.35);opacity:.65}}
      .abx-demo-actions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:9px}
      .abx-demo-actions button{min-height:44px;padding:9px 14px;border-radius:13px;border:2px solid #D8C09A;background:#FFFDF8;color:#6B4226;font-weight:900}
      .abx-demo-actions button.primary-demo{background:#6B4226;color:#fff;border-color:#6B4226;box-shadow:0 3px 0 #4B2C18}
      .abx-demo-actions button:disabled{opacity:.55}
      .abx-touch-tip{margin:8px 0 0;padding:9px 11px;border-radius:12px;background:#EEF8EA;border:1px solid #B9D9B8;color:#35633B;font-size:11px;font-weight:800}
      .abx-touch-tip.waiting{display:none}
      .foundation-lesson .abacus-wrap{margin-top:14px}
      .foundation-lesson .abacus-wrap .bead{outline-offset:3px}
      .foundation-lesson .rod-column:nth-child(2),.demo-card .demo-abacus .rod-column:nth-child(2){display:none}
      .foundation-lesson .lesson-list{display:none}
      .demo-card .demo-abacus .abacus-wrap{pointer-events:none;opacity:.96}
      .demo-card .demo-abacus .abacus-wrap .bead{cursor:default}
      @media(max-width:520px){
        .abacus{padding:16px 10px;border-width:7px;border-radius:19px}
        .abacus-inner{gap:8px;padding:13px 8px}
        .rod-column{min-height:285px}
        .bead,.abacus .bead{width:58px;height:35px;min-width:58px;min-height:35px}
        .bead.upper,.abacus .bead.upper{width:64px;height:42px}
        .abacus .bead.lower.active{transform:translateY(-105px)}
        .abacus .bead.upper.active{transform:translateY(44px)}
        .demo-card .demo-abacus .abacus-wrap .bead{pointer-events:none}
      }
    `;document.head.appendChild(s)}

  let lastLesson=null,lastDemo=null;
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  function refreshLowerMotion(root){
    if(!root)return;
    const beads=qa('.lower-zone .bead',root);
    const active=beads.filter(b=>b.classList.contains('active'));
    beads.forEach((b,i)=>{
      b.style.setProperty('--abx-i',i);
      b.setAttribute('aria-label',`Lower bead ${i+1}, ${b.classList.contains('active')?'active':'inactive'}`);
    });
    if(active.length){
      const n=active.length;
      active.forEach((b,i)=>{
        const shift=Math.max(0,Math.round(106-(n-1-i)*39));
        b.style.transform=`translateY(-${shift}px)`;
      });
    }else beads.forEach(b=>b.style.removeProperty('transform'));
  }

  function installTouch(root){
    if(!root||root.dataset.abxTouch==='1')return;
    root.dataset.abxTouch='1';
    let downX=0,downY=0,downBead=null;
    root.addEventListener('pointerdown',e=>{
      const bead=e.target.closest('.bead');
      if(!bead||!root.contains(bead))return;
      downX=e.clientX;downY=e.clientY;downBead=bead;
    },{passive:true});
    root.addEventListener('pointerup',e=>{
      const bead=e.target.closest('.bead')||downBead;
      if(!bead||!root.contains(bead))return;
      const moved=Math.hypot(e.clientX-downX,e.clientY-downY)>10;
      if(moved){
        e.preventDefault();
        bead.dataset.abxSkipClick='1';
        bead.click();
        setTimeout(()=>delete bead.dataset.abxSkipClick,0);
      }
      bead.classList.remove('abx-pulse');void bead.offsetWidth;bead.classList.add('abx-pulse');
      setTimeout(()=>bead.classList.remove('abx-pulse'),360);
      setTimeout(()=>refreshLowerMotion(root),0);
      downBead=null;
    },{passive:false});
    root.addEventListener('click',e=>{
      const bead=e.target.closest('.bead');
      if(bead?.dataset.abxSkipClick==='1'){e.preventDefault();e.stopPropagation();delete bead.dataset.abxSkipClick}
    },true);
    refreshLowerMotion(root);
  }

  function demoBeads(value){
    const root=q('.demo-abacus .abacus-wrap');
    if(!root)return;
    const lowers=qa('.lower-zone .bead',root);
    const upper=q('.upper-zone .bead',root);
    lowers.forEach(b=>{b.classList.remove('active','abx-demo-bead');b.style.removeProperty('transform')});
    if(upper){upper.classList.remove('active','abx-demo-bead');upper.style.removeProperty('transform')}
    const lowerCount=value>=5?value-5:value;
    if(value>=5&&upper){upper.classList.add('active','abx-demo-bead')}
    lowers.slice(0,lowerCount).forEach((b,i)=>setTimeout(()=>{
      b.classList.add('active','abx-demo-bead');
      b.style.transform=`translateY(-${Math.max(0,106-i*39)}px)`;
    },i*260));
    const out=q('#demoValue');if(out)out.textContent=String(value);
  }

  function installDemo(){
    const button=q('#watchDemo');
    if(!button||button.dataset.abxDemo==='1')return;
    button.dataset.abxDemo='1';
    const host=q('.demo-abacus');
    if(host&&!q('.abx-demo-live',host)){
      const live=document.createElement('div');live.className='abx-demo-live';live.innerHTML='<i class="dot"></i><span>Watch Babi move one bead at a time. Then copy the move.</span>';
      button.insertAdjacentElement('beforebegin',live);
      const tip=document.createElement('div');tip.className='abx-touch-tip waiting';tip.textContent='👆 After Watch: tap a bead or press and slide it toward the bar.';
      live.insertAdjacentElement('afterend',tip);
    }
    const tip=q('.abx-touch-tip',host);
    const showTry=()=>tip?.classList.remove('waiting');
    if(/again|complete|completed/i.test(button.textContent||''))showTry();
    button.onclick=e=>{
      e.preventDefault();
      if(button.dataset.running==='1')return;
      button.dataset.running='1';button.disabled=true;button.textContent='✨ Babi is building 3…';
      const feedback=q('#demoFeedback');if(feedback)feedback.textContent='Watch Babi move each bead to the bar — one at a time.';
      demoBeads(0);
      [1,2,3].forEach((v,i)=>setTimeout(()=>demoBeads(v),420+i*520));
      setTimeout(()=>{
        button.dataset.running='0';button.disabled=false;button.textContent='↻ Watch Babi again';
        showTry();
        const feedback=q('#demoFeedback');if(feedback)feedback.textContent='Demo complete. Choose a lesson below and move the beads yourself. 🌟';
      },2200);
    };
  }

  function scan(){
    qa('.abacus-wrap').forEach(installTouch);
    const lesson=q('.lesson-card');
    if(lesson&&lesson!==lastLesson){
      lastLesson=lesson;
      const title=q('h1',lesson)?.textContent?.trim()||'';
      if(['Meet the abacus','Make 1–4','Meet 5','Make 6–9','Tiny challenge'].includes(title))lesson.classList.add('foundation-lesson');
      setTimeout(()=>refreshLowerMotion(q('.lesson-card .abacus-wrap')),0);
    }
    const demo=q('.demo-card');
    if(demo&&demo!==lastDemo){lastDemo=demo;installDemo()}
  }

  let timer=0;
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scan,30)});
  observer.observe(app,{childList:true,subtree:true});
  scan();
})();
