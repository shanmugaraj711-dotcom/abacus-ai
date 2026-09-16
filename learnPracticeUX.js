/* Learn + Practice UX layer
   Presentation-only: enhances the existing challengeApp flow without replacing its
   abacus engine, state, navigation, or persistence. Designed to stay offline-safe.
   Engineering rule: this layer is a thin, failure-isolated adapter; it owns no
   learning truth and never creates a second state machine.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  const STYLE_ID='learnPracticeUXStyle';
  if(!document.getElementById(STYLE_ID)){
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
      .lp-sparkles{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:inherit}
      .lp-sparkles i{position:absolute;width:9px;height:9px;background:#F6D18B;transform:rotate(45deg);border-radius:3px;animation:lpFloat 3.6s ease-in-out infinite;opacity:.75}
      .lp-sparkles i:nth-child(1){left:8%;top:18%;animation-delay:.1s}.lp-sparkles i:nth-child(2){right:12%;top:28%;width:7px;height:7px;animation-delay:.8s}.lp-sparkles i:nth-child(3){left:22%;bottom:13%;width:6px;height:6px;animation-delay:1.5s}.lp-sparkles i:nth-child(4){right:25%;bottom:18%;width:8px;height:8px;animation-delay:2.1s}
      @keyframes lpFloat{0%,100%{transform:translateY(0) rotate(45deg) scale(1)}50%{transform:translateY(-9px) rotate(45deg) scale(1.18)}}
      .lp-teach-card{position:relative;display:grid;grid-template-columns:auto 1fr;gap:12px;align-items:center;margin:10px 0 12px;padding:13px 15px;border-radius:18px;background:linear-gradient(135deg,#FFF5D8,#FFFDF8);border:2px solid #E5C98F;box-shadow:0 6px 16px rgba(75,44,24,.08);overflow:hidden}
      .lp-teach-icon{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#6B4226;color:#fff;font-size:25px;box-shadow:0 3px 0 #4B2C18}
      .lp-teach-card b{display:block;color:#6B4226;font-size:15px}.lp-teach-card span{display:block;color:#75685D;font-size:12px;line-height:1.4;margin-top:2px}
      .lp-road{display:flex;align-items:center;gap:6px;margin:0 0 12px;padding:8px 10px;border-radius:999px;background:#F7E9CE;border:1px solid #E1C99E;color:#6B4226;font-size:11px;font-weight:950}
      .lp-road em{font-style:normal;width:25px;height:25px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid #D5B67D}.lp-road .active{background:#C98A3E;color:#fff;border-color:#8D542B}.lp-road .arrow{border:0;background:transparent;width:auto;color:#A77A45}
      .lp-legend{display:flex;justify-content:center;gap:9px;flex-wrap:wrap;margin:10px 0}.lp-legend span{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#FFF8EA;border:1px solid #E0C79B;color:#6B4226;font-size:11px;font-weight:850}.lp-dot{width:14px;height:9px;border-radius:50%;display:inline-block;background:radial-gradient(circle at 35% 25%,#F0BF78,#C98A3E 55%,#824B23);border:1px solid #633716}.lp-dot.five{width:17px;height:11px}
      .demo-card,.lesson-card{position:relative;overflow:hidden}.demo-card:before,.lesson-card:before{content:"";position:absolute;width:90px;height:90px;border-radius:50%;background:rgba(246,209,139,.22);right:-35px;top:-35px}.demo-card{background:linear-gradient(180deg,#FFFDF8,#FFF4DD)}
      .lp-show{margin:9px auto 0;display:block;min-height:46px;padding:10px 17px;border-radius:13px;background:#6B4226;color:#fff;font-weight:950;box-shadow:0 3px 0 #4B2C18}.lp-show:disabled{opacity:.6}.lp-show.done{background:#4B8F55;box-shadow:0 3px 0 #2E6E43}
      .lp-coach{display:flex;align-items:center;gap:10px;margin:10px 0;padding:10px 12px;border-radius:15px;background:#F1E4CF;border:1px solid #D7BD91;color:#6B4226;font-size:12px;line-height:1.4}.lp-coach .bubble{font-size:23px;flex:0 0 auto}.lp-coach b{display:block;font-size:13px}.lp-coach span{display:block;color:#75685D}
      .lp-practice-banner{position:relative;margin:8px 0 12px;padding:13px 14px 14px;border-radius:19px;background:linear-gradient(135deg,#6B4226,#8D542B);color:#fff;box-shadow:0 5px 0 #4B2C18;overflow:hidden}.lp-practice-banner:after{content:"★  ★  ★";position:absolute;right:10px;top:8px;color:#F6D18B;letter-spacing:5px;font-size:12px;opacity:.9}.lp-practice-banner b{display:block;font-size:16px}.lp-practice-banner span{display:block;margin-top:3px;color:#FBE2AD;font-size:12px;max-width:78%}.lp-progress{height:7px;margin-top:9px;border-radius:99px;background:rgba(255,255,255,.2);overflow:hidden}.lp-progress i{display:block;height:100%;width:33%;background:#F6D18B;border-radius:inherit;transition:width .25s ease}
      .lp-focus{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:8px 0 12px}.lp-focus span{padding:6px 9px;border-radius:999px;background:#FFF7E7;border:1px solid #E2C89A;color:#6B4226;font-size:10px;font-weight:950}.lp-focus span:first-child{background:#FBE3B7}
      .lp-success{animation:lpSuccess .5s ease}.lp-wiggle{animation:lpWiggle .38s ease}@keyframes lpSuccess{0%{transform:scale(.98)}55%{transform:scale(1.015)}100%{transform:scale(1)}}@keyframes lpWiggle{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
      .lp-master-intro{display:flex;align-items:center;gap:10px;margin:8px 0 12px;padding:10px 12px;border-radius:16px;background:#FFF7E7;border:1px solid #E2C89A;color:#6B4226}.lp-master-intro img{width:48px;height:48px;object-fit:contain}.lp-master-intro b{display:block;font-size:14px}.lp-master-intro span{display:block;font-size:11px;margin-top:2px;color:#75685D}
      .lp-master-path{position:relative}.lp-master-path:before{content:"";position:absolute;left:50%;top:18px;bottom:18px;width:3px;transform:translateX(-50%);background:#E5C98F;border-radius:9px;opacity:.8}.lp-master-path .world-level{position:relative;z-index:1}
      .lp-demo-bead{transition:transform .32s ease,filter .32s ease}.lp-demo-active{filter:brightness(1.08) saturate(1.05);transform:translateY(-2px)}
      @media(max-width:520px){.lp-teach-card{grid-template-columns:42px 1fr;padding:11px}.lp-teach-icon{width:42px;height:42px}.lp-practice-banner{padding-right:10px}.lp-road{font-size:10px}}
    `;document.head.appendChild(s);
  }

  const esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const one=(sel,root=document)=>root.querySelector(sel);
  let lastLearn=null,lastLesson=null,lastPractice=null,lastLevels=null;

  function addSparkles(host){
    if(!host||host.querySelector('.lp-sparkles'))return;
    const x=document.createElement('div');x.className='lp-sparkles';x.innerHTML='<i></i><i></i><i></i><i></i>';host.appendChild(x);
  }

  function enhanceLearn(){
    const hero=one('.learn-hero');
    if(!hero||lastLearn===hero)return;
    lastLearn=hero;addSparkles(hero);
    const road=document.createElement('div');road.className='lp-road';road.innerHTML='<em class="active">1</em><span>Watch</span><em>2</em><span>Try</span><em>3</em><span>Master</span>';
    hero.insertAdjacentElement('afterend',road);

    const demo=one('.demo-card');
    if(demo&&!demo.querySelector('.lp-legend')){
      const legend=document.createElement('div');legend.className='lp-legend';legend.innerHTML='<span><i class="lp-dot"></i> lower bead = 1</span><span><i class="lp-dot five"></i> upper bead = 5</span>';
      const steps=demo.querySelectorAll('.demo-step');
      (steps[steps.length-1]||demo).insertAdjacentElement('afterend',legend);
      addSparkles(demo);
    }

    const list=document.querySelector('.lesson-list');
    if(list&&!list.querySelector('.lp-teach-card')){
      const card=document.createElement('div');card.className='lp-teach-card';card.innerHTML='<div class="lp-teach-icon">👋</div><div><b>Babi teaches first — you never have to guess.</b><span>Watch the move, copy it with your finger, then try it by yourself. Small wins unlock the next adventure.</span></div>';
      list.parentElement.insertBefore(card,list);
    }
  }

  function parseLessonTarget(){
    const strong=one('.lesson-card strong');
    if(!strong)return null;
    const m=strong.textContent.match(/(\d+)\.?\s*$/);
    return m?Number(m[1]):null;
  }

  // Visual-only lesson demonstration. It deliberately never invokes the real
  // bead event handlers, so the child's answer state remains untouched.
  function showDemoValue(target,done){
    const root=one('.lesson-card .abacus-wrap');
    if(!root||!Number.isFinite(target))return;
    const lowers=[...root.querySelectorAll('[data-lower]')];
    const upper=root.querySelector('[data-upper]');
    const originalLower=lowers.map(el=>el.classList.contains('active'));
    const originalUpper=!!upper?.classList.contains('active');
    const demoDisplay=one('#lessonValue');
    const demoValue={value:0};
    const render=count=>{
      lowers.forEach((el,i)=>el.classList.toggle('lp-demo-active',i<count));
      if(upper)upper.classList.toggle('lp-demo-active',count>=5);
      if(demoDisplay)demoDisplay.dataset.demoValue=String(count);
    };
    render(0);
    const sequence=[];
    if(target>=5)sequence.push(5);
    const remainder=target%5;
    for(let i=1;i<=remainder;i++)sequence.push(5+i);
    if(!sequence.length)sequence.push(target);
    sequence.forEach((value,i)=>setTimeout(()=>render(value),i*420));
    setTimeout(()=>{
      render(0);
      lowers.forEach((el,i)=>el.classList.toggle('lp-demo-active',originalLower[i]));
      if(upper)upper.classList.toggle('lp-demo-active',originalUpper);
      if(done)done(demoValue.value);
    },sequence.length*420+450);
  }

  function enhanceLesson(){
    const card=one('.lesson-card');if(!card||lastLesson===card)return;
    lastLesson=card;addSparkles(card);
    const target=parseLessonTarget();
    if(!Number.isFinite(target))return;
    const check=one('#lessonCheck',card);if(!check||card.querySelector('.lp-show'))return;
    const coach=document.createElement('div');coach.className='lp-coach';coach.innerHTML='<div class="bubble">🧠</div><div><b>First: watch Babi build it.</b><span>Then the beads are yours. You can repeat the demo anytime.</span></div>';
    const task=check.previousElementSibling;
    (task||check).insertAdjacentElement('afterend',coach);
    const show=document.createElement('button');show.type='button';show.className='lp-show';show.textContent='👀 Show me how';
    check.insertAdjacentElement('afterend',show);
    check.disabled=true;
    let running=false;
    show.onclick=()=>{
      if(running)return;running=true;show.disabled=true;check.disabled=true;show.textContent='✨ Babi is showing you…';
      showDemoValue(target,()=>{
        running=false;
        // Regression guard: the real lesson value must still be zero immediately
        // after a demo on a fresh lesson. If it isn't, fail closed and surface it.
        const valueNode=one('#lessonValue',card);
        const realValue=valueNode?Number(valueNode.textContent)||0:0;
        if(realValue!==0){
          console.error('[abacus-regression] lesson demo mutated real answer state', {target,realValue});
          check.disabled=true;
          show.disabled=false;
          show.textContent='⚠ Demo state error — restart lesson';
          return;
        }
        check.disabled=false;show.disabled=false;show.classList.add('done');show.textContent='✓ I saw it — your turn!';
        const hint=one('#lessonFeedback',card);if(hint)hint.textContent='Your turn — build the number yourself.';
        setTimeout(()=>{show.classList.remove('done');show.textContent='👀 Show me again'},900);
      });
    };
    check.setAttribute('aria-disabled','true');
    const hint=one('#lessonFeedback',card);
    if(hint)hint.textContent='Watch Babi first. Then build the number yourself.';
  }

  function enhancePractice(){
    const meta=one('.practice-meta');
    if(!meta||meta===lastPractice)return;
    lastPractice=meta;
    const problem=one('.problem');
    const banner=document.createElement('div');banner.className='lp-practice-banner';
    const text=problem?problem.textContent.replace(/=\s*\?/,'').trim():'your abacus challenge';
    banner.innerHTML='<b>🎯 Babi’s bead mission</b><span>Build <strong>'+esc(text)+'</strong> on the abacus. Take your time — accuracy first.</span><div class="lp-progress"><i></i></div>';
    meta.insertAdjacentElement('afterend',banner);
    const focus=document.createElement('div');focus.className='lp-focus';focus.innerHTML='<span>👆 Move beads</span><span>👀 Check your number</span><span>🌟 Then press Check</span>';
    banner.insertAdjacentElement('afterend',focus);
    const value=one('#practiceValue');const check=one('#check');
    const refresh=()=>{
      const n=value?Number(value.textContent)||0:0;const bar=one('.lp-progress i');if(bar)bar.style.width=(n?Math.min(92,33+n*6):33)+'%';
      if(check&&n)check.classList.add('lp-success');
    };
    if(value){new MutationObserver(refresh).observe(value,{childList:true,characterData:true,subtree:true});}
    refresh();
    addSparkles(one('.abacus-wrap'));
  }

  function enhanceLevels(){
    const grid=one('.world-levels');
    if(!grid||lastLevels===grid)return;
    lastLevels=grid;grid.classList.add('lp-master-path');
    const head=one('.section-head');
    if(head&&!head.querySelector('.lp-master-intro')){
      const intro=document.createElement('div');intro.className='lp-master-intro';
      intro.innerHTML='<img src="./assets/mascot/babi-celebrating.svg" alt="Babi celebrating"><div><b>Master one step at a time.</b><span>Complete a level to reveal the next part of your Abacus Adventure.</span></div>';
      head.insertAdjacentElement('afterend',intro);
    }
  }

  function scan(){
    if(document.querySelector('.learn-hero'))enhanceLearn();
    if(document.querySelector('.lesson-card')&&document.querySelector('#lessonCheck'))enhanceLesson();
    if(document.querySelector('.practice-meta'))enhancePractice();
    if(document.querySelector('.world-levels'))enhanceLevels();
  }
  let timer=0;
  const observer=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(scan,20)});
  observer.observe(app,{childList:true,subtree:true});
  scan();
})();
