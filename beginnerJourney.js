// Phase 2 — true zero-parent first-day journey for new learners.
(function(){
 const PROFILE='abacus-ai-profile-v2', FOUNDATION='abacus-ai-foundation-v1';
 const steps=[
  {title:'Meet Babi 🧮',body:'Hi! I’m Babi. This is your abacus. We’ll learn it together.',button:'Let’s start →',mark:'meet'},
  {title:'Meet the little beads',body:'Each lower bead is 1. Move beads up and watch the number change.',target:3,button:'Make 3 →',mark:'lower'},
  {title:'Meet the 5 bead ✋',body:'This special upper bead is worth 5. Tap it and make 5.',target:5,button:'Make 5 →',mark:'five'},
  {title:'Build 1–9',body:'You can make 6, 7, 8 and 9 with 5 plus little beads.',target:8,button:'Make 8 →',mark:'nine'},
  {title:'Babi’s tiny challenge ⭐',body:'One last try. Make the number Babi asks for — no typing!',target:4,button:'Make 4 →',mark:'challenge'}
 ];
 let step=0, upper=false, lower=0, locked=false;
 function profile(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')}catch{return {}}}
 function saveFoundation(k){try{const s={meet:false,lower:false,five:false,nine:false,place:false,finger:false,challenge:false,...JSON.parse(localStorage.getItem(FOUNDATION)||'{}')};s[k]=true;localStorage.setItem(FOUNDATION,JSON.stringify(s))}catch{}}
 function value(){return (upper?5:0)+lower}
 function babi(){return '<div style="font-size:72px;line-height:1">🧮</div>'}
 function render(){
  const s=steps[step]; upper=false;lower=0;locked=false;
  document.querySelector('#app').innerHTML=`<div class="screen world-screen"><header class="topbar"><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>My first adventure</small></span></div><span class="streak">${step+1}/${steps.length}</span></header><main class="content"><div style="max-width:620px;margin:auto;text-align:center">${babi()}<p class="eyebrow">BABI’S FIRST ADVENTURE</p><h1>${s.title}</h1><p style="font-size:18px;line-height:1.5">${s.body}</p>${s.target?`<div class="learning-target" style="background:#fff3c9;border-radius:20px;padding:12px;margin:16px 0"><small>Babi says: make</small><strong style="font-size:52px;display:block">${s.target}</strong></div>`:''}${s.target?abacus():`<div style="margin:24px auto;font-size:20px;font-weight:800">👆 Tap, watch, and discover.</div>`}<div id="bjStatus" class="learning-status" role="status" aria-live="polite"></div><button class="primary" id="bjNext">${s.button}</button></div></main></div>`;
  const next=document.querySelector('#bjNext');
  if(!s.target){next.onclick=()=>{saveFoundation(s.mark);step++;render()};return}
  draw(); next.onclick=check;
 }
 function abacus(){return `<div id="bjAbacus" class="abacus-wrap learning-abacus"><div class="abacus"><div class="abacus-inner"><div class="rod-column"><span class="rod-label">ONES</span><div class="upper-zone"><button type="button" id="bjUpper" class="bead upper" aria-label="Upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${[0,1,2,3].map(i=>`<button type="button" class="bead lower" data-bj-lower="${i}" aria-label="Lower bead ${i+1}"></button>`).join('')}</div></div><div class="rod-column"><span class="rod-label">TENS</span><div class="upper-zone"></div><div class="beam"></div><div class="lower-zone"></div></div></div></div></div><div style="font-size:20px;font-weight:900;margin:10px">Your number: <b id="bjValue">0</b></div>`}
 function draw(){const u=document.querySelector('#bjUpper'),v=document.querySelector('#bjValue');if(!u||!v)return;u.classList.toggle('active',upper);v.textContent=value();document.querySelectorAll('[data-bj-lower]').forEach(b=>{const i=Number(b.dataset.bjLower);b.classList.toggle('active',i<lower);b.onclick=()=>{if(locked)return;lower=i<lower?i:Math.min(4,i+1);draw()}});u.onclick=()=>{if(locked)return;upper=!upper;draw()}}
 function check(){if(locked)return;const s=steps[step],v=value(),status=document.querySelector('#bjStatus'),btn=document.querySelector('#bjNext');if(v!==s.target){status.className='learning-status bad';status.textContent=`Almost! You made ${v}. Try the beads again 💛`;return}locked=true;saveFoundation(s.mark);status.className='learning-status ok';status.textContent='YES! Babi is cheering! 🎉';btn.textContent=step===steps.length-1?'Start Level 1 🚀':'Next adventure →';setTimeout(()=>{if(step<steps.length-1){step++;render()}else finish()},700)}
 function finish(){saveFoundation('place');saveFoundation('finger');const p=profile();const app=document.querySelector('#app');app.innerHTML=`<div class="screen world-screen"><main class="content"><div style="max-width:620px;margin:auto;text-align:center">${babi()}<p class="eyebrow">ADVENTURE COMPLETE</p><h1>Look at you, ${String(p.name||'abacus star').replace(/[<>]/g,'')}! 🌟</h1><p style="font-size:20px;line-height:1.5">You met the abacus, learned 1 and 5, and built numbers with your own hands.</p><div class="learning-ready"><h2>🎯 You’re ready!</h2><p>Now Babi will give you real Level 1 practice.</p><button class="primary" id="bjStart">Start Level 1 🚀</button></div></div></main></div>`;document.querySelector('#bjStart').onclick=()=>{location.hash='start-level-1';location.reload()}}
 document.addEventListener('click',e=>{const b=e.target.closest('#learn');if(!b)return;let p=profile();if(p.experience==='known')return;e.preventDefault();e.stopImmediatePropagation();render()},true);
})();
