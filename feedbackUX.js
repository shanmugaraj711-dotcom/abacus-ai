// Universal short success feedback + interaction guard.
// Keeps child feedback fast, consistent, and English-only for applause.
(function(){
  const MESSAGES=['Good job! 👏','Awesome! 🌟','Well done! 🎉','Great! ⭐','Nice! 👏'];
  let msgIndex=0;
  let lastKey='';
  const css=document.createElement('style');
  css.textContent=`
    .babi-quick-feedback{position:fixed;left:50%;top:18%;transform:translate(-50%,-8px) scale(.96);z-index:5000;padding:12px 20px;border:3px solid #70c979;border-radius:22px;background:#efffe9;color:#176b2c;font:900 22px/1 ui-rounded,system-ui,sans-serif;box-shadow:0 10px 30px rgba(40,100,40,.2);opacity:0;pointer-events:none;animation:babiQuickIn 1.15s ease forwards}
    @keyframes babiQuickIn{0%{opacity:0;transform:translate(-50%,-8px) scale(.94)}18%,75%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-3px) scale(.98)}}
    .babi-answer-correct{border-color:#70c979!important;box-shadow:0 0 0 4px rgba(112,201,121,.18),0 5px 0 #70c979!important;background:#efffe9!important}
    .babi-answer-correct::after{content:'✓';margin-left:7px;color:#176b2c;font-weight:900}
    .babi-lesson-complete{outline:4px solid rgba(112,201,121,.22);outline-offset:2px;border-radius:18px}
  `;
  document.head.appendChild(css);
  function applause(key){
    const k=String(key||'success');
    if(k===lastKey)return;
    lastKey=k;
    const old=document.querySelector('.babi-quick-feedback');old?.remove();
    const el=document.createElement('div');el.className='babi-quick-feedback';el.setAttribute('role','status');el.textContent=MESSAGES[msgIndex++%MESSAGES.length];
    document.body.appendChild(el);
    setTimeout(()=>el.remove(),1200);
    try{window.BabiVoice?.sayEnglish?.(el.textContent.replace(/[^A-Za-z! ]/g,''))}catch{}
    window.abacusSound?.correct?.();
    document.querySelectorAll('.babi-component,.babi').forEach(b=>{b.classList.remove('babi-celebrate','babi-buddy-dance');void b.offsetWidth;b.classList.add('babi-celebrate','babi-buddy-dance');setTimeout(()=>b.classList.remove('babi-celebrate','babi-buddy-dance'),1000)});
  }
  function lessonCheck(){
    const card=document.querySelector('.lesson-card');
    const target=Number(card?.querySelector('.lesson-target strong')?.textContent||NaN);
    const current=Number(card?.querySelector('#lessonCurrent')?.textContent||NaN);
    const next=card?.querySelector('#lessonGo');
    if(!card||!Number.isFinite(target)||!Number.isFinite(current)||!next)return;
    if(current===target){
      if(next.disabled){next.disabled=false;next.removeAttribute('disabled')}
      card.classList.add('babi-lesson-complete');
      const step=card.querySelector('.eyebrow')?.textContent||'';
      const key=`lesson:${step}:${target}`;
      if(card.dataset.successShown!=='1'){card.dataset.successShown='1';applause(key)}
    }else{card.classList.remove('babi-lesson-complete');if(next.dataset.forceEnabled!=='1')next.disabled=true}
  }
  function observeLesson(){
    const card=document.querySelector('.lesson-card');if(!card)return;
    lessonCheck();
    if(card.dataset.feedbackObserver==='1')return;
    card.dataset.feedbackObserver='1';
    card.addEventListener('click',e=>{if(e.target.closest('[data-lesson-lower],[data-lesson-upper]'))setTimeout(lessonCheck,30)},{passive:true});
  }
  function auditButtons(){
    document.querySelectorAll('button').forEach(b=>{
      const text=(b.textContent||'').replace(/\s+/g,'').trim();
      if(!text && !b.getAttribute('aria-label')) b.setAttribute('aria-label','Button');
      if(b.disabled && !b.getAttribute('title')) b.setAttribute('title','Not available yet');
    });
  }
  const observer=new MutationObserver(()=>{observeLesson();auditButtons()});
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{const c=e.target.closest('[data-choice]');if(!c)return;const choices=[...document.querySelectorAll('[data-choice]')];const value=c.dataset.choice;const gameHead=document.querySelector('.game-head')?.textContent||'';if(!gameHead.includes('MYSTERY'))return;setTimeout(()=>{const msg=document.querySelector('#mysteryMsg');if(msg?.textContent?.startsWith('Not that one'))return;applause(`mystery:${value}:${Date.now()}`)},10)},{passive:true});
  observeLesson();auditButtons();
  window.AbacusFeedbackUX={applause,lessonCheck,auditButtons};
})();
