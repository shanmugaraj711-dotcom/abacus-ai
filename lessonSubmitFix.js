// Lesson submission reliability layer.
// The child may submit ANY abacus value. The app checks it; the button must never be
// disabled just because the answer is not yet correct.
(function(){
  const STYLE=`
    .lesson-submit-status{margin:8px 0 0;padding:9px 12px;border-radius:14px;font-weight:900;text-align:center;font-size:14px}
    .lesson-submit-status.good{background:#e3f7df;color:#176b2c;border:2px solid #72c979}
    .lesson-submit-status.retry{background:#fff0df;color:#8a4b18;border:2px solid #e1ad73}
    #lessonGo.lesson-check-ready{opacity:1;filter:none;cursor:pointer}
  `;
  if(!document.getElementById('lesson-submit-fix-style')){
    const s=document.createElement('style');s.id='lesson-submit-fix-style';s.textContent=STYLE;document.head.appendChild(s);
  }

  let wired=null;
  function numberNow(){
    const n=Number(document.querySelector('#lessonCurrent')?.textContent?.trim());
    return Number.isFinite(n)?n:0;
  }
  function targetNow(){
    const n=Number(document.querySelector('.lesson-target strong')?.textContent?.trim());
    return Number.isFinite(n)?n:null;
  }
  function status(card,text,good){
    let el=card.querySelector('.lesson-submit-status');
    if(!el){el=document.createElement('div');el.className='lesson-submit-status';const btn=card.querySelector('#lessonGo');btn?.insertAdjacentElement('afterend',el);}
    el.className='lesson-submit-status '+(good?'good':'retry');el.textContent=text;
  }
  function wire(card){
    const btn=card.querySelector('#lessonGo');
    if(!btn)return;
    // Existing lesson code used disabled=true until the target was built. That is
    // the wrong UX: a child must be allowed to check a wrong attempt.
    btn.disabled=false;
    btn.removeAttribute('aria-disabled');
    btn.classList.add('lesson-check-ready');
    btn.textContent='Check my answer ✓';
    if(wired===btn)return;
    wired=btn;
    btn.addEventListener('click',function(e){
      const target=targetNow(),value=numberNow();
      if(target===null)return;
      if(value!==target){
        // Stop the original advance handler only for a wrong answer.
        e.preventDefault();
        e.stopImmediatePropagation();
        status(card,`Not yet — you made ${value}. Try the beads again! 💛`,false);
        try{window.BabiVoice?.say?.(`Not yet. You made ${value}. Try the beads again!`,`இன்னும் சரியில்லை. நீ ${value} செய்திருக்கிறாய். மணிகளை மீண்டும் முயற்சி செய்!`)}catch{}
        try{window.abacusSound?.wrong?.()}catch{}
        return;
      }
      status(card,'Correct! 🎉 Babi is cheering for you!',true);
      // Do not stop the event here. The existing lesson engine advances the lesson
      // after its own check, while the universal celebration layer handles applause.
    },true);
  }
  function scan(){
    const card=document.querySelector('.lesson-card');
    if(card)wire(card);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scan);else scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.LessonSubmitFix={scan};
})();
