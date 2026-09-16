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
  function targetOf(card){const strong=one('strong',card);const m=strong?.textContent.match(/(?:build|make|show)\s+(\d+)/i);return m?Number(m[1]):null}
  function realValue(card){return Number(one('#lessonValue',card)?.textContent)||0}
  function clearVisualDemo(card){all('.lp-demo-active',card).forEach(el=>el.classList.remove('lp-demo-active'));one('.lesson-demo-display',card)?.remove()}
  function setInput(card,enabled){const wrap=one('.abacus-wrap',card);if(wrap)wrap.style.pointerEvents=enabled?'auto':'none'}
  function renderState(card,state,target){
    card.dataset.lessonState=state;
    const check=one('#lessonCheck',card),next=one('#lessonGo',card),feedback=one('#lessonFeedback',card),show=one('#lessonWatch',card),wrap=one('.abacus-wrap',card);
    if(state===STATES.IDLE){setInput(card,false);if(check)check.disabled=true;if(next)next.disabled=true;if(show){show.disabled=false;show.textContent='👀 Watch Babi'}if(feedback)feedback.textContent=`Watch Babi first. Then build ${target} yourself.`}
    else if(state===STATES.DEMO){setInput(card,false);if(check)check.disabled=true;if(next)next.disabled=true;if(show){show.disabled=true;show.textContent='✨ Babi is showing you…'}if(feedback)feedback.textContent=`Watch: Babi is building ${target}, one move at a time.`}
    else if(state===STATES.PRACTICE){setInput(card,true);if(check)check.disabled=false;if(next)next.disabled=true;if(show){show.disabled=false;show.textContent='👀 Watch again'}if(feedback)feedback.textContent=`Now you try: Make ${target}.`}
    else if(state===STATES.COMPLETE){setInput(card,false);if(check)check.disabled=true;if(next)next.disabled=false;if(show){show.disabled=false;show.textContent='✓ Demo complete'}if(feedback)feedback.textContent='You got 3/3! 🌟 Next lesson is ready.'}
    if(wrap)wrap.setAttribute('aria-busy',state===STATES.DEMO?'true':'false');
  }
  function visualValue(card,count){
    const wrap=one('.abacus-wrap',card);if(!wrap)return;
    const lowers=all('.lower-zone .bead',wrap),upper=one('.upper-zone .bead',wrap);lowers.forEach((bead,i)=>bead.classList.toggle('lp-demo-active',i<count));if(upper)upper.classList.toggle('lp-demo-active',count>=5);
    let display=one('.lesson-demo-display',card);if(!display){display=document.createElement('div');display.className='lesson-demo-display';display.innerHTML='<span>Babi shows</span><strong>0</strong>';wrap.insertAdjacentElement('afterend',display)}one('strong',display).textContent=String(count);
  }
  function playDemo(card,target,finish){
    const values=[];if(target>=5)values.push(5);const remainder=target%5;if(remainder)for(let i=1;i<=remainder;i++)values.push(5+i);if(!values.length)values.push(target);visualValue(card,0);
    values.forEach((value,index)=>setTimeout(()=>visualValue(card,value),index*420));
    setTimeout(()=>{clearVisualDemo(card);finish()},values.length*420+500);
  }
  function transition(card,nextState,target){renderState(card,nextState,target);if(nextState===STATES.DEMO)playDemo(card,target,()=>{if(realValue(card)!==0){console.error('[lesson-state] DEMO mutated real answer state');transition(card,STATES.IDLE,target);return}transition(card,STATES.PRACTICE,target)})}
  function install(card){
    if(!card||card===activeCard)return;activeCard=card;const target=targetOf(card);if(!Number.isFinite(target))return;
    one('.lp-coach',card)?.remove();one('.lp-show',card)?.remove();const check=one('#lessonCheck',card);if(!check)return;
    const show=document.createElement('button');show.type='button';show.id='lessonWatch';show.className='lp-show';check.insertAdjacentElement('afterend',show);transition(card,STATES.IDLE,target);
    show.addEventListener('click',()=>{if(card.dataset.lessonState===STATES.IDLE||card.dataset.lessonState===STATES.PRACTICE)transition(card,STATES.DEMO,target)});
    check.addEventListener('click',()=>{if(card.dataset.lessonState!==STATES.PRACTICE)return;setTimeout(()=>{if(realValue(card)===target&&one('#lessonFeedback',card)?.textContent.includes('3/3'))transition(card,STATES.COMPLETE,target)},0)});
  }
  function scan(){const card=one('.lesson-card');if(card&&card!==activeCard)install(card)}
  const observer=new MutationObserver(()=>requestAnimationFrame(scan));observer.observe(app,{childList:true,subtree:true});scan();
})();
