/* Child-first learning helper: explains the idea before the child is asked to answer. */
(function(){
  const app=document.querySelector('#app');
  if(!app)return;
  let lastCard=null;
  function addStyle(){
    if(document.getElementById('lesson-tutor-style'))return;
    const s=document.createElement('style');s.id='lesson-tutor-style';s.textContent=`
      .lesson-tutor{margin:12px 0;text-align:left;border-radius:20px;background:#fff;border:2px solid rgba(107,66,38,.10);overflow:hidden}
      .lesson-tutor-head{display:flex;align-items:center;gap:10px;padding:13px 15px;font-weight:900}
      .lesson-tutor-head .tutor-bear{font-size:28px}.lesson-tutor-head span:nth-child(2){flex:1}
      .lesson-tutor-body{padding:0 15px 15px}.lesson-tutor-body p{margin:5px 0 9px;font-weight:800}
      .lesson-steps{margin:0;padding-left:24px;line-height:1.55;font-size:14px}.lesson-steps li{margin:5px 0}
      .lesson-tutor-actions{display:flex;gap:8px;margin-top:11px;flex-wrap:wrap}.lesson-tutor-btn{border:0;border-radius:13px;padding:10px 13px;font-weight:900;cursor:pointer;background:#FAF6EE;color:#4B2C18}.lesson-tutor-btn.hint{background:#fff3c9}
      .lesson-hint{display:none;margin-top:10px;padding:11px 12px;border-radius:13px;background:#f3dfb5;font-weight:800;line-height:1.45}.lesson-hint.show{display:block}
      .lesson-tutor.collapsed .lesson-tutor-body{display:none}
    `;document.head.appendChild(s);
  }
  function lessonNumber(card){const m=(card.querySelector('.eyebrow')?.textContent||'').match(/LEARN\s·\s(\d+)/i);return m?Number(m[1]):1}
  function hintFor(n,target,current){
    if(target>0){
      if(current===target)return `Perfect! Your number is ${target}. You're ready — press Check.`;
      if(current<target){const left=target-current;return current===0?`Start with the ONES rod. Move one lower bead at a time toward the bar.`:`Nice! You have ${current}. Move ${left===1?'one more bead':`${left} more beads`} until your number is ${target}.`;}
      return `Oops, you have ${current}, but we need ${target}. Move a bead back and watch the number change.`;
    }
    if(n===1)return 'Try one lower bead on the ONES rod. Watch the number change before moving another.';
    if(n===3)return 'Find the upper bead. It is worth 5. Tap it and watch your number.';
    if(n===4)return 'Make the 5 first, then use lower beads to build the rest.';
    if(n===5)return `Look at Babi's target and build it slowly. Watch your number before pressing Check.`;
    return 'Move one bead gently and watch your number. Use the number to guide your next move.';
  }
  function render(card){
    if(!card||card===lastCard||card.querySelector('.lesson-tutor'))return;
    lastCard=card;addStyle();
    const n=lessonNumber(card), target=Number(card.querySelector('.learning-target strong')?.textContent||0);
    const box=document.createElement('section');box.className='lesson-tutor';box.innerHTML=`
      <div class="lesson-tutor-head"><span class="tutor-bear">🐻</span><span>${n===1?'First, let’s learn the abacus!':'Babi’s quick lesson'}</span><button class="lesson-tutor-btn" id="lessonTutorToggle" type="button">${n===1?'Got it':'Show me'}</button></div>
      <div class="lesson-tutor-body">
        <p>${n===1?'Here is the simple rule: lower beads = 1 each. The ONES rod is for ones.':''}</p>
        <ol class="lesson-steps">
          ${n===1?'<li><b>ONES</b> means each lower bead counts as 1.</li><li>Tap a lower bead and watch <b>Your number</b> change.</li><li>For this mission, gently move <b>3 lower beads</b>.':'<li>Read what Babi asks you to make.</li><li>Move the beads and watch <b>Your number</b>.</li><li>Only press Check when your number matches.</li>'}
        </ol>
        <div class="lesson-tutor-actions"><button class="lesson-tutor-btn hint" id="lessonHintBtn" type="button">💡 Give me a hint</button></div>
        <div class="lesson-hint" id="lessonHint"></div>
      </div>`;
    const abacus=card.querySelector('.learning-abacus');
    if(abacus)abacus.parentNode.insertBefore(box,abacus);else card.appendChild(box);
    const body=box.querySelector('.lesson-tutor-body'),toggle=box.querySelector('#lessonTutorToggle'),hintBtn=box.querySelector('#lessonHintBtn'),hint=box.querySelector('#lessonHint');
    if(n===1){body.style.display='block';toggle.textContent='Hide';}else body.style.display='none';
    toggle.onclick=()=>{const hidden=body.style.display==='none';body.style.display=hidden?'block':'none';toggle.textContent=hidden?'Hide':'Show me';};
    hintBtn.onclick=()=>{const current=Number(card.querySelector('#learningCurrent')?.textContent||0);hint.textContent=hintFor(n,target,current);hint.classList.add('show');};
  }
  const observer=new MutationObserver(()=>{const card=app.querySelector('.learning-lesson-card');if(card)render(card);else lastCard=null;});
  observer.observe(app,{childList:true,subtree:true});
  setTimeout(()=>{const card=app.querySelector('.learning-lesson-card');if(card)render(card);},50);
})();
