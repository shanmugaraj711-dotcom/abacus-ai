// Babi — the friendly, touch-responsive abacus buddy.
// Vanilla JS/PWA component: no network, no framework, no external assets.
(function(){
  let seq=0;
  const style=document.createElement('style');
  style.textContent=`
    .babi-component{display:inline-block;position:relative;width:120px;height:150px;touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;transform-origin:50% 72%;isolation:isolate;outline:none}
    .babi-component.babi-small{width:78px;height:104px}.babi-component.babi-large{width:150px;height:184px}.babi-component.babi-hero{width:190px;height:228px}
    .babi-component .babi-svg{position:absolute;left:0;bottom:0;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 5px 7px rgba(76,42,20,.14));transform-origin:50% 72%}
    .babi-component:focus-visible{filter:drop-shadow(0 0 0.5px #6B4226)}
    .babi-component .babi-speech{position:absolute;z-index:3;left:50%;top:-8px;transform:translate(-50%,-100%) scale(.92);min-width:190px;max-width:250px;padding:10px 14px;border:2px solid rgba(110,72,40,.12);border-radius:18px;background:#fffdf7;color:#4b2c18;box-shadow:0 7px 18px rgba(72,42,22,.16);font:800 13px/1.22 ui-rounded,system-ui,sans-serif;text-align:center;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .2s cubic-bezier(.2,.9,.3,1)}
    .babi-component .babi-speech:after{content:"";position:absolute;left:50%;bottom:-9px;width:16px;height:16px;background:#fffdf7;border-right:2px solid rgba(110,72,40,.12);border-bottom:2px solid rgba(110,72,40,.12);transform:translateX(-50%) rotate(45deg)}
    .babi-component.babi-speaking .babi-speech{opacity:1;transform:translate(-50%,-100%) scale(1)}
    .babi-component .babi-sparkles{position:absolute;z-index:2;inset:0;pointer-events:none;opacity:0}
    .babi-component .babi-sparkles span{position:absolute;font-size:17px;animation:none}
    .babi-component.babi-dance .babi-sparkles{opacity:1}.babi-component.babi-dance .babi-sparkles span:nth-child(1){left:2%;top:30%;animation:babiFloat1 .9s ease-in-out infinite}.babi-component.babi-dance .babi-sparkles span:nth-child(2){right:1%;top:38%;animation:babiFloat2 .9s .15s ease-in-out infinite}.babi-component.babi-dance .babi-sparkles span:nth-child(3){left:15%;top:7%;animation:babiFloat1 .8s .25s ease-in-out infinite}
    .babi-component.babi-dance .babi-svg{animation:babiDance 1.15s cubic-bezier(.4,.05,.4,1)}
    .babi-component.babi-dance .babi-arm-left{animation:babiLeftArm 1.15s ease-in-out}.babi-component.babi-dance .babi-arm-right{animation:babiRightArm 1.15s ease-in-out}.babi-component.babi-dance .babi-foot-left{animation:babiLeftFoot 1.15s ease-in-out}.babi-component.babi-dance .babi-foot-right{animation:babiRightFoot 1.15s ease-in-out}
    .babi-component.babi-happy .babi-svg{animation:babiHappy .65s ease}.babi-component.babi-excited .babi-svg{animation:babiExcited .72s ease}.babi-component.babi-blink .babi-eye{opacity:0}.babi-component.babi-blink .babi-blink-line{opacity:1}
    .babi-component .babi-eye{transition:opacity .08s}.babi-component .babi-blink-line{opacity:0;transition:opacity .08s}
    .babi-component .babi-pupil{transition:transform .12s ease-out;transform-box:fill-box;transform-origin:center}
    @keyframes babiDance{0%,100%{transform:translateY(0) rotate(0) scale(1)}18%{transform:translateY(-6px) rotate(-7deg) scale(1.03)}36%{transform:translateY(1px) rotate(7deg) scale(.98)}54%{transform:translateY(-10px) rotate(-5deg) scale(1.04)}72%{transform:translateY(1px) rotate(6deg) scale(.98)}88%{transform:translateY(-4px) rotate(-2deg)}}
    @keyframes babiLeftArm{20%{transform:rotate(-22deg)}45%{transform:rotate(16deg)}70%{transform:rotate(-12deg)}100%{transform:rotate(0)}}
    @keyframes babiRightArm{20%{transform:rotate(18deg)}45%{transform:rotate(-14deg)}70%{transform:rotate(12deg)}100%{transform:rotate(0)}}
    @keyframes babiLeftFoot{20%{transform:translate(-3px,-5px) rotate(-9deg)}45%{transform:translate(2px,0) rotate(7deg)}70%{transform:translate(-2px,-3px) rotate(-6deg)}100%{transform:none}}
    @keyframes babiRightFoot{20%{transform:translate(3px,0) rotate(8deg)}45%{transform:translate(-2px,-5px) rotate(-8deg)}70%{transform:translate(2px,0) rotate(6deg)}100%{transform:none}}
    @keyframes babiHappy{25%{transform:translateY(-5px) scale(1.06)}55%{transform:translateY(1px) scale(.98)}100%{transform:translateY(0) scale(1)}}
    @keyframes babiExcited{20%{transform:translateY(-12px) scale(1.08)}42%{transform:translateY(0) scale(.97)}64%{transform:translateY(-7px) scale(1.04)}100%{transform:translateY(0) scale(1)}}
    @keyframes babiFloat1{50%{transform:translateY(-9px) rotate(-12deg)}}@keyframes babiFloat2{50%{transform:translateY(8px) rotate(12deg)}}
    @media (prefers-reduced-motion:reduce){.babi-component,.babi-component *{animation:none!important;transition:none!important}}
  `;
  document.head.appendChild(style);

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function childName(){
    try{const p=JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null');return p&&p.name?String(p.name).trim().split(/\s+/)[0]:'friend'}catch(e){return 'friend'}
  }
  function svg(){
    const id='babi'+(++seq);
    return `<svg class="babi-svg" viewBox="0 0 100 105" aria-hidden="true">
      <defs><radialGradient id="${id}pot" cx="40%" cy="38%" r="65%"><stop offset="0%" stop-color="#FFD09A"/><stop offset="58%" stop-color="#E5A66B"/><stop offset="100%" stop-color="#B96F32"/></radialGradient><linearGradient id="${id}rim" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F0B878"/><stop offset="100%" stop-color="#B87535"/></linearGradient></defs>
      <g class="babi-foot-left"><path d="M38 68L34 82" stroke="#332B27" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="32" cy="82" rx="6" ry="3.5" fill="#332B27"/></g>
      <g class="babi-foot-right"><path d="M60 68L64 82" stroke="#332B27" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="66" cy="82" rx="6" ry="3.5" fill="#332B27"/></g>
      <g class="babi-arm-left"><path d="M28 48Q18 36 14 25" stroke="#332B27" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="14" cy="24" r="3.2" fill="#332B27"/><path d="M8 18L4 14M14 14L12 8" stroke="#F5B700" stroke-width="2.5" stroke-linecap="round"/></g>
      <g class="babi-arm-right"><path d="M72 48Q79 55 74 60" stroke="#332B27" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="74" cy="60" r="3" fill="#332B27"/></g>
      <circle cx="50" cy="48" r="27" fill="url(#${id}pot)"/>
      <ellipse cx="50" cy="23" rx="11" ry="4.5" fill="url(#${id}rim)"/><ellipse cx="50" cy="23.5" rx="8.5" ry="3" fill="#78481E"/>
      <circle cx="33" cy="47" r="4.5" fill="#FF8A7A" opacity=".68"/><circle cx="67" cy="47" r="4.5" fill="#FF8A7A" opacity=".68"/>
      <g stroke="#382314" stroke-width="2.5" stroke-linecap="round"><path d="M33 34Q38 31 44 33"/><path d="M56 33Q62 31 67 34"/></g>
      <g class="babi-eye"><ellipse cx="39" cy="41" rx="5.2" ry="6.8" fill="#fff"/><ellipse cx="61" cy="41" rx="5.2" ry="6.8" fill="#fff"/><g class="babi-pupil"><circle cx="39" cy="41" r="3.8" fill="#3B1E08"/><circle cx="37.8" cy="39.8" r="1.4" fill="#fff"/><circle cx="40.5" cy="42.5" r=".7" fill="#fff"/></g><g class="babi-pupil"><circle cx="61" cy="41" r="3.8" fill="#3B1E08"/><circle cx="59.8" cy="39.8" r="1.4" fill="#fff"/><circle cx="62.5" cy="42.5" r=".7" fill="#fff"/></g></g>
      <g class="babi-blink-line" stroke="#382314" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M34 42Q39 38 44 42"/><path d="M56 42Q61 38 66 42"/></g>
      <path d="M43 51Q50 60 57 51Z" fill="#4A180D"/><path d="M46 54Q50 58 54 54" fill="#E86262"/>
      <g transform="translate(40 60)"><rect x="0" y="0" width="20" height="9" rx="2.5" fill="#F8EAD6" stroke="#8E5B2E" stroke-width="1"/><circle cx="3" cy="1.5" r=".8" fill="#5C381E"/><circle cx="17" cy="1.5" r=".8" fill="#5C381E"/><text x="10" y="6.5" text-anchor="middle" fill="#4A260C" font-size="4.5" font-weight="bold" font-family="system-ui,sans-serif">Babi</text></g>
    </svg>`;
  }
  function enhance(el){
    if(!el||el.dataset.babiComponent==='1')return;
    el.dataset.babiComponent='1';
    const oldClass=String(el.className.baseVal||el.className||'');
    const size=oldClass.match(/babi-(hero|large|small)/)?.[1]||'medium';
    el.className=`babi-component babi-${size}`;
    el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Talk to Babi');
    el.innerHTML=`<div class="babi-sparkles" aria-hidden="true"><span>♪</span><span>♫</span><span>✦</span></div><div class="babi-speech" aria-live="polite"></div>${svg()}`;
    const speech=el.querySelector('.babi-speech');
    const pupils=[...el.querySelectorAll('.babi-pupil')];let downX=0,downY=0,moved=false,dialogTimer,idle;
    let tapCount=0;
    const idleArm=()=>{clearTimeout(idle);idle=setTimeout(()=>{if(!document.body.contains(el))return;el.classList.add('babi-blink');setTimeout(()=>el.classList.remove('babi-blink'),180);idleArm()},15000+Math.random()*5000)};
    const clearReactions=()=>el.classList.remove('babi-dance','babi-happy','babi-excited','babi-blink');
    const speakAndDance=()=>{
      const name=childName();tapCount++;
      const messages=[`Hi ${esc(name)}! 👋<br>Shall we start with some dance? 🎵`,`Yay ${esc(name)}! 🎉<br>Let’s learn together! ❤️`,`Ready, ${esc(name)}? 😊<br>Tap me and let’s go! ✨`];
      speech.innerHTML=messages[(tapCount-1)%messages.length];
      clearTimeout(dialogTimer);clearReactions();void el.offsetWidth;el.classList.add('babi-speaking','babi-dance');
      window.abacusSound?.cheer?.();
      clearTimeout(dialogTimer);dialogTimer=setTimeout(()=>el.classList.remove('babi-speaking','babi-dance'),2600);
      idleArm();
    };
    const reactPress=()=>{clearReactions();void el.offsetWidth;el.classList.add('babi-happy');setTimeout(speakAndDance,100)};
    el.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;moved=false;el.setPointerCapture?.(e.pointerId);el.style.transform='scale(1.07,.94)';clearTimeout(idle);e.preventDefault()},{passive:false});
    el.addEventListener('pointermove',e=>{const dx=e.clientX-downX,dy=e.clientY-downY;if(Math.hypot(dx,dy)>7)moved=true;const rect=el.getBoundingClientRect();const tx=e.clientX-(rect.left+rect.width/2),ty=e.clientY-(rect.top+rect.height*.4),mag=Math.min(2.2,Math.hypot(tx,ty)/80),ang=Math.atan2(ty,tx);pupils.forEach((p,i)=>{const sign=i?1:-1;p.style.transform=`translate(${Math.cos(ang)*mag+sign*.2}px,${Math.sin(ang)*mag}px)`})},{passive:true});
    el.addEventListener('pointerup',e=>{el.releasePointerCapture?.(e.pointerId);el.style.transform='';pupils.forEach(p=>p.style.transform='');if(!moved)reactPress();else idleArm()},{passive:true});
    el.addEventListener('pointercancel',()=>{el.style.transform='';pupils.forEach(p=>p.style.transform='');idleArm()},{passive:true});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reactPress()}});
    idleArm();
  }
  function scan(root=document){
    if(root&&root.nodeType===1&&root.matches?.('.babi:not(.babi-component)'))enhance(root);
    root.querySelectorAll?.('.babi:not(.babi-component)').forEach(enhance);
  }
  window.BabiCharacter={enhance,scan,svg};
  scan();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)}))).observe(document.body,{childList:true,subtree:true});
})();
