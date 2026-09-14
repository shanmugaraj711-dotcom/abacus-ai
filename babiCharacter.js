// Shared Babi character for the vanilla JS/PWA app.
// One component, reused by World, Learn, Practice and Play.
(function(){
  let seq=0;
  const style=document.createElement('style');
  style.textContent=`
    .babi-component{display:inline-block;position:relative;width:120px;height:126px;touch-action:none;cursor:pointer;user-select:none;-webkit-user-select:none;transform-origin:50% 70%;transition:transform .18s ease}
    .babi-component.babi-small{width:78px;height:82px}.babi-component.babi-large{width:150px;height:158px}.babi-component.babi-hero{width:190px;height:200px}.babi-component .babi-svg{width:100%;height:100%;overflow:visible;filter:drop-shadow(0 4px 8px rgba(0,0,0,.12))}
    .babi-component.babi-poke{animation:babiPoke .55s cubic-bezier(.2,.9,.3,1)}
    .babi-component.babi-wave{animation:babiWave .7s ease}.babi-component.babi-hop{animation:babiHop .58s ease}.babi-component.babi-giggle{animation:babiGiggle .65s ease}.babi-component.babi-surprise{animation:babiSurprise .6s ease}.babi-component.babi-bounce{animation:babiBounce .65s ease}.babi-component.babi-blink .babi-eye{opacity:0}.babi-component.babi-blink .babi-blink-line{opacity:1}
    .babi-component .babi-eye{transition:opacity .08s}.babi-component .babi-blink-line{opacity:0;transition:opacity .08s}
    .babi-component .babi-arm-wave{transform-origin:28px 48px;transition:transform .15s}.babi-component.babi-wave .babi-arm-wave{animation:armWave .7s ease}
    .babi-component .babi-pupil{transition:transform .12s ease-out;transform-box:fill-box;transform-origin:center}
    @keyframes babiPoke{0%,100%{transform:scale(1) rotate(0)}25%{transform:scale(1.1,.92) rotate(-3deg)}50%{transform:scale(.94,1.07) rotate(3deg)}75%{transform:scale(1.04,.97) rotate(-1deg)}}
    @keyframes babiWave{0%,100%{transform:rotate(0)}35%{transform:rotate(-5deg) translateY(-5px)}65%{transform:rotate(5deg) translateY(-2px)}}
    @keyframes armWave{20%{transform:rotate(-16deg)}45%{transform:rotate(12deg)}70%{transform:rotate(-8deg)}100%{transform:rotate(0)}}
    @keyframes babiHop{45%{transform:translateY(-13px) scale(1.05)}100%{transform:translateY(0)}}
    @keyframes babiGiggle{25%{transform:rotate(-7deg) scale(1.04)}50%{transform:rotate(7deg) scale(.97)}75%{transform:rotate(-5deg) scale(1.02)}}
    @keyframes babiSurprise{30%{transform:scale(1.12)}60%{transform:scale(.95)}100%{transform:scale(1)}}
    @keyframes babiBounce{35%{transform:translateY(-9px)}65%{transform:translateY(3px)}100%{transform:translateY(0)}}
    @media (prefers-reduced-motion:reduce){.babi-component,.babi-component *{animation:none!important;transition:none!important}}
  `;document.head.appendChild(style);

  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function svg(){const id='babi'+(++seq);return `<svg class="babi-svg" viewBox="0 0 100 105" aria-hidden="true">
    <defs>
      <radialGradient id="${id}pot" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#F3C38C"/><stop offset="60%" stop-color="#DCA265"/><stop offset="100%" stop-color="#BA7B3C"/></radialGradient>
      <linearGradient id="${id}rim" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#E6AC70"/><stop offset="100%" stop-color="#B37333"/></linearGradient>
    </defs>
    <ellipse cx="28" cy="48" rx="3" ry="9" fill="#5C381E"/><ellipse cx="72" cy="48" rx="3" ry="9" fill="#5C381E"/>
    <path d="M38 68L34 82" stroke="#332B27" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="32" cy="82" rx="6" ry="3.5" fill="#332B27"/>
    <path d="M60 68L64 82" stroke="#332B27" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="66" cy="82" rx="6" ry="3.5" fill="#332B27"/>
    <g class="babi-arm-wave"><path d="M28 48Q18 36 14 25" stroke="#332B27" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="14" cy="24" r="3.2" fill="#332B27"/><path d="M8 18L4 14M14 14L12 8" stroke="#F5B700" stroke-width="2.5" stroke-linecap="round"/></g>
    <g><path d="M72 48Q79 55 74 60" stroke="#332B27" stroke-width="4.5" stroke-linecap="round" fill="none"/><circle cx="74" cy="60" r="3" fill="#332B27"/></g>
    <circle cx="50" cy="48" r="27" fill="url(#${id}pot)"/>
    <ellipse cx="50" cy="23" rx="11" ry="4.5" fill="url(#${id}rim)"/><ellipse cx="50" cy="23.5" rx="8.5" ry="3" fill="#78481E"/>
    <circle cx="33" cy="47" r="4.5" fill="#FF8A7A" opacity=".65"/><circle cx="67" cy="47" r="4.5" fill="#FF8A7A" opacity=".65"/>
    <g stroke="#382314" stroke-width="2.5" stroke-linecap="round"><path d="M33 34Q38 31 44 33"/><path d="M56 33Q62 31 67 34"/></g>
    <g class="babi-eye"><ellipse cx="39" cy="41" rx="5.2" ry="6.8" fill="#fff"/><ellipse cx="61" cy="41" rx="5.2" ry="6.8" fill="#fff"/><g class="babi-pupil"><circle cx="39" cy="41" r="3.8" fill="#3B1E08"/><circle cx="37.8" cy="39.8" r="1.4" fill="#fff"/><circle cx="40.5" cy="42.5" r=".7" fill="#fff"/></g><g class="babi-pupil"><circle cx="61" cy="41" r="3.8" fill="#3B1E08"/><circle cx="59.8" cy="39.8" r="1.4" fill="#fff"/><circle cx="62.5" cy="42.5" r=".7" fill="#fff"/></g></g>
    <g class="babi-blink-line" stroke="#382314" stroke-width="2.5" stroke-linecap="round" fill="none"><path d="M34 42Q39 38 44 42"/><path d="M56 42Q61 38 66 42"/></g>
    <path d="M43 51Q50 60 57 51Z" fill="#4A180D"/><path d="M46 54Q50 58 54 54" fill="#E86262"/>
    <g transform="translate(40 60)"><rect x="0" y="0" width="20" height="9" rx="2.5" fill="#F8EAD6" stroke="#8E5B2E" stroke-width="1"/><circle cx="3" cy="1.5" r=".8" fill="#5C381E"/><circle cx="17" cy="1.5" r=".8" fill="#5C381E"/><text x="10" y="6.5" text-anchor="middle" fill="#4A260C" font-size="4.5" font-weight="bold" font-family="system-ui,sans-serif">Babi</text></g>
  </svg>`}
  function enhance(el){
    if(!el||el.dataset.babiComponent==='1')return;
    el.dataset.babiComponent='1';
    const oldClass=el.className.baseVal||el.className||'';
    const size=oldClass.match(/babi-(hero|large|small)/)?.[1]||'medium';
    el.className=`babi-component babi-${size}`;
    el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','Talk to Babi');
    el.innerHTML=svg();
    const pupils=[...el.querySelectorAll('.babi-pupil')];let downX=0,downY=0,moved=false;let idle;
    const reactions=['babi-poke','babi-wave','babi-hop','babi-giggle','babi-surprise','babi-bounce'];
    let bag=[];const next=()=>{if(!bag.length)bag=[...reactions].sort(()=>Math.random()-.5);return bag.pop()};
    const idleArm=()=>{clearTimeout(idle);idle=setTimeout(()=>{if(!document.body.contains(el))return;el.classList.add('babi-blink');setTimeout(()=>el.classList.remove('babi-blink'),180);idleArm()},15000+Math.random()*5000)};
    const react=()=>{el.classList.remove(...reactions);void el.offsetWidth;el.classList.add(next());window.abacusSound?.cheer?.();idleArm();setTimeout(()=>el.classList.remove(...reactions),800)};
    el.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;moved=false;el.setPointerCapture?.(e.pointerId);el.style.transition='transform .08s';el.style.transform='scale(1.08,.92)';clearTimeout(idle);e.preventDefault()},{passive:false});
    el.addEventListener('pointermove',e=>{const dx=e.clientX-downX,dy=e.clientY-downY;if(Math.hypot(dx,dy)>7){moved=true;el.style.transform=`translate(${Math.max(-10,Math.min(10,dx/4))}px,${Math.max(-10,Math.min(10,dy/4))}px) scale(${1+Math.min(.12,Math.hypot(dx,dy)/320)})`};const rect=el.getBoundingClientRect();const tx=e.clientX-(rect.left+rect.width/2),ty=e.clientY-(rect.top+rect.height*.35);const mag=Math.min(2.2,Math.hypot(tx,ty)/80);const ang=Math.atan2(ty,tx);pupils.forEach((p,i)=>{const sign=i?1:-1;p.style.transform=`translate(${Math.cos(ang)*mag+sign*.2}px,${Math.sin(ang)*mag}px)`})},{passive:true});
    el.addEventListener('pointerup',e=>{el.releasePointerCapture?.(e.pointerId);el.style.transform='';el.style.transition='';pupils.forEach(p=>p.style.transform='');if(!moved)react();else idleArm()},{passive:true});
    el.addEventListener('pointercancel',()=>{el.style.transform='';el.style.transition='';pupils.forEach(p=>p.style.transform='');idleArm()},{passive:true});
    el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();react()}});
    idleArm();
  }
  function scan(root=document){root.querySelectorAll('.babi:not(.babi-component)').forEach(enhance)}
  window.BabiCharacter={enhance,scan,svg};
  scan();
  new MutationObserver(muts=>muts.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1)scan(n)}))).observe(document.body,{childList:true,subtree:true});
})();
