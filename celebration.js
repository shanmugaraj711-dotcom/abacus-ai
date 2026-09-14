// Universal child encouragement layer — event driven so it never loops on its own DOM updates.
(function(){
  const style=document.createElement('style');
  style.textContent=`
    .babi-correct-celebration{position:relative;display:flex;align-items:center;gap:12px;margin:12px auto;padding:12px 16px;max-width:620px;border:3px solid #72c979;border-radius:20px;background:linear-gradient(135deg,#efffe9,#dff7d8);color:#176b2c;box-shadow:0 7px 18px rgba(40,110,50,.14);animation:babiCorrectIn .35s cubic-bezier(.2,.9,.3,1)}
    .babi-correct-celebration .babi-mini{width:62px;height:62px;flex:0 0 62px;animation:babiCorrectDance .8s ease-in-out 2}
    .babi-correct-celebration strong{display:block;font-size:21px}.babi-correct-celebration span{display:block;margin-top:2px;font-size:14px;font-weight:800}
    .babi-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden;border-radius:18px}.babi-confetti i{position:absolute;width:7px;height:13px;border-radius:3px;animation:babiConfetti .8s ease-out forwards}.babi-confetti i:nth-child(1){left:12%;top:35%}.babi-confetti i:nth-child(2){left:28%;top:10%;animation-delay:.05s}.babi-confetti i:nth-child(3){left:67%;top:12%;animation-delay:.1s}.babi-confetti i:nth-child(4){left:84%;top:35%;animation-delay:.15s}.babi-confetti i:nth-child(5){left:52%;top:5%;animation-delay:.2s}
    @keyframes babiCorrectIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
    @keyframes babiCorrectDance{0%,100%{transform:translateY(0) rotate(0) scale(1)}20%{transform:translateY(-9px) rotate(-7deg) scale(1.05)}40%{transform:translateY(0) rotate(7deg)}60%{transform:translateY(-7px) rotate(-5deg)}80%{transform:translateY(0) rotate(4deg)}}
    @keyframes babiConfetti{0%{opacity:0;transform:translateY(0) rotate(0)}20%{opacity:1}100%{opacity:0;transform:translateY(-28px) rotate(160deg)}}
    .lesson-card.babi-correct-flash,.assessment.babi-correct-flash{animation:babiCardFlash .6s ease}
    @keyframes babiCardFlash{0%,100%{box-shadow:var(--shadow)}35%{box-shadow:0 0 0 6px rgba(91,190,100,.18),0 12px 28px rgba(75,44,24,.16)}}
  `;
  document.head.appendChild(style);
  let lastKey='';
  function speak(){
    try{
      const [en,ta]=window.BabiVoice?.context?.()||['Super job! You did it!','சூப்பர்! நீ செய்துவிட்டாய்!'];
      window.BabiVoice?.say?.(en,ta);
    }catch(e){}
  }
  function dance(){
    document.querySelectorAll('.babi,.babi-component').forEach(el=>{el.classList.remove('babi-buddy-dance','babi-celebrate');void el.offsetWidth;el.classList.add('babi-buddy-dance','babi-celebrate')});
  }
  function celebrate(label,key){
    const host=document.querySelector('.lesson-card,.assessment,.content')||document.querySelector('#app');
    if(!host)return;
    const safeKey=String(key||label||host.textContent||'').slice(0,240);
    if(safeKey===lastKey)return;lastKey=safeKey;
    const box=document.createElement('div');box.className='babi-correct-celebration';box.setAttribute('role','status');box.innerHTML=`<svg class="babi-mini babi" viewBox="0 0 160 160" aria-label="Babi celebrating"><use href="./assets/mascot/babi.svg#celebrate"></use></svg><div><strong>Correct! 🎉</strong><span>${label||'Great job! Babi is proud of you!'}</span></div><div class="babi-confetti"><i></i><i></i><i></i><i></i><i></i></div>`;
    const anchor=host.querySelector('.actions,.answer-card,.lesson-target,.lesson-current')||host.firstElementChild;
    if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor.nextSibling);else host.appendChild(box);
    host.classList.add('babi-correct-flash');dance();speak();window.abacusSound?.correct?.();
    setTimeout(()=>{box.remove();host.classList.remove('babi-correct-flash')},2400);
  }
  function resultCelebration(){
    const title=document.querySelector('.result-title.coral');
    const problem=document.querySelector('.result-problem');
    if(title&&problem)celebrate('You got it right! Babi is dancing with you! 💃🕺',`result:${problem.textContent}`);
  }
  function builderCelebration(){
    const h=document.querySelector('.lesson-card h1');
    if(!h)return;
    const m=h.textContent.match(/Make\s+(\d+)/i),n=Number(document.querySelector('.answer-card strong')?.textContent||NaN);
    if(m&&Number.isFinite(n)&&n===Number(m[1]))celebrate(`You built ${n}! Amazing bead work! 🧮`,`builder:${m[1]}`);
  }
  // Practice result is rendered after #check. Preview/locked screens never trigger this.
  document.addEventListener('click',e=>{
    const el=e.target?.closest?.('#check,#builderCheck');if(!el)return;
    setTimeout(()=>{if(el.id==='check')resultCelebration();else builderCelebration()},100);
  },true);
})();
