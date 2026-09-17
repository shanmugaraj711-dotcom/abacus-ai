/* Explicit lesson state machine: IDLE -> DEMO -> PRACTICE -> COMPLETE.
   Owns only lesson-mode presentation/input gating. Core lesson truth remains in challengeApp.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  const STATES=Object.freeze({IDLE:'IDLE',DEMO:'DEMO',PRACTICE:'PRACTICE',COMPLETE:'COMPLETE'});
  const one=(s,r=document)=>r.querySelector(s);
  const all=(s,r=document)=>[...r.querySelectorAll(s)];
  let activeCard=null;

  if(!document.getElementById('lessonStateMachineStyle')){
    const style=document.createElement('style');
    style.id='lessonStateMachineStyle';
    style.textContent=`
      .abacus-wrap.lesson-demo-mode .bead.lower.active{transform:none!important}
      .abacus-wrap.lesson-demo-mode .bead.upper.active{transform:none!important}
      .abacus .bead.lower.lesson-demo-active{transform:translateY(-118px);filter:brightness(1.08);transition:transform .28s ease,filter .15s ease}
      .abacus .bead.upper.lesson-demo-active{transform:translateY(50px);filter:brightness(1.08);transition:transform .28s ease,filter .15s ease}
      @media(max-width:520px){
        .abacus .bead.lower.lesson-demo-active{transform:translateY(-105px)}
        .abacus .bead.upper.lesson-demo-active{transform:translateY(44px)}
      }
    `;
    document.head.appendChild(style);
  }

  function targetOf(card){
    const strong=one('strong',card);
    const m=strong?.textContent.match(/(?:build|make|show)\s+(\d+)/i);
    return m?Number(m[1]):null;
  }

  function realValue(card){
    return Number(one('#lessonValue',card)?.textContent)||0;
  }

  function clearVisualDemo(card){
    const wrap=one('.abacus-wrap',card);
    if(wrap)wrap.classList.remove('lesson-demo-mode');
    all('.lesson-demo-active',card).forEach(el=>el.classList.remove('lesson-demo-active'));
  }

  function setInput(card,enabled){
    const wrap=one('.abacus-wrap',card);
    if(wrap)wrap.style.pointerEvents=enabled?'auto':'none';
  }

  function renderState(card,state,target){
    card.dataset.lessonState=state;
    const check=one('#lessonCheck',card),next=one('#lessonGo',card),feedback=one('#lessonFeedback',card),show=one('#lessonWatch',card),wrap=one('.abacus-wrap',card);
    if(state===STATES.IDLE){
      setInput(card,false);
      if(check)check.disabled=true;
      if(next)next.disabled=true;
      if(show){show.disabled=false;show.textContent='👀 Watch Babi'}
      if(feedback)feedback.textContent=`Watch Babi first. Then build ${target} yourself.`;
    }else if(state===STATES.DEMO){
      setInput(card,false);
      if(check)check.disabled=true;
      if(next)next.disabled=true;
      if(show){show.disabled=true;show.textContent='✨ Babi is showing you…'}
      if(feedback)feedback.textContent=`Watch Babi build ${target}, one bead at a time.`;
    }else if(state===STATES.PRACTICE){
      setInput(card,true);
      if(check)check.disabled=false;
      if(next)next.disabled=true;
      if(show){show.disabled=false;show.textContent='👀 Watch again'}
      if(feedback)feedback.textContent=`Now you try: Make ${target}.`;
    }else if(state===STATES.COMPLETE){
      setInput(card,false);
      if(check)check.disabled=true;
      if(next)next.disabled=false;
      if(show){show.disabled=false;show.textContent='✓ Demo complete'}
      if(feedback)feedback.textContent='Great! You made it. 🌟 Next lesson is ready.';
    }
    if(wrap)wrap.setAttribute('aria-busy',state===STATES.DEMO?'true':'false');
  }

  function visualValue(card,count){
    const wrap=one('.abacus-wrap',card);
    if(!wrap)return;
    const lowers=all('.lower-zone .bead',wrap),upper=one('.upper-zone .bead',wrap);
    lowers.forEach((bead,i)=>bead.classList.toggle('lesson-demo-active',i<count));
    if(upper)upper.classList.toggle('lesson-demo-active',count>=5);
  }

  function demoValues(target){
    if(target<=0)return[];
    if(target<5)return Array.from({length:target},(_,i)=>i+1);
    return [5,...Array.from({length:target-5},(_,i)=>i+6)];
  }

  function playDemo(card,target,finish){
    const wrap=one('.abacus-wrap',card);
    const values=demoValues(target);
    if(!wrap||!values.length){finish();return}
    wrap.classList.add('lesson-demo-mode');
    clearVisualDemo(card);
    wrap.classList.add('lesson-demo-mode');
    visualValue(card,0);
    values.forEach((value,index)=>setTimeout(()=>visualValue(card,value),index*520));
    setTimeout(()=>{
      clearVisualDemo(card);
      finish();
    },values.length*520+450);
  }

  function transition(card,nextState,target){
    renderState(card,nextState,target);
    if(nextState===STATES.DEMO){
      playDemo(card,target,()=>{
        if(realValue(card)!==0){
          console.error('[lesson-state] DEMO mutated real answer state');
          transition(card,STATES.PRACTICE,target);
          return;
        }
        transition(card,STATES.PRACTICE,target);
      });
    }
  }

  function install(card){
    if(!card||card===activeCard)return;
    activeCard=card;
    const target=targetOf(card);
    if(!Number.isFinite(target))return;
    window.scrollTo(0,0);
    one('.lp-coach',card)?.remove();
    one('.lp-show',card)?.remove();
    const check=one('#lessonCheck',card);
    if(!check)return;

    const show=document.createElement('button');
    show.type='button';
    show.id='lessonWatch';
    show.className='lp-show';
    check.insertAdjacentElement('afterend',show);
    transition(card,STATES.IDLE,target);

    show.addEventListener('click',()=>{
      if(card.dataset.lessonState===STATES.IDLE||card.dataset.lessonState===STATES.PRACTICE){
        transition(card,STATES.DEMO,target);
      }
    });

    check.addEventListener('click',()=>{
      if(card.dataset.lessonState!=='PRACTICE')return;
      if(realValue(card)===target){
        transition(card,STATES.COMPLETE,target);
      }else{
        const feedback=one('#lessonFeedback',card);
        if(feedback)feedback.textContent=`Not yet. Build ${target} with the beads, then check again.`;
      }
    });
  }

  function scan(){
    const card=one('.lesson-card');
    if(card&&card!==activeCard)install(card);
  }

  const observer=new MutationObserver(()=>requestAnimationFrame(scan));
  observer.observe(app,{childList:true,subtree:true});
  scan();
})();