// Phase 3 — experienced learner quick-start assessment.
(function(){
  const PROFILE_KEY='abacus-ai-profile-v2';
  const PROGRESS_KEY='abacus-ai-progress-v2';
  const ASSESS_KEY='abacus-ai-assessment-v1';
  const QUESTIONS=[
    {a:2,b:3,op:'+',answer:5,skill:'direct',label:'Direct addition'},
    {a:7,b:2,op:'−',answer:5,skill:'direct',label:'Direct subtraction'},
    {a:3,b:4,op:'+',answer:7,skill:'small',label:'Small friend addition'},
    {a:8,b:3,op:'−',answer:5,skill:'small',label:'Small friend subtraction'},
    {a:5,b:4,op:'+',answer:9,skill:'small',label:'Small friend addition'},
    {a:6,b:2,op:'−',answer:4,skill:'direct',label:'Direct subtraction'}
  ];
  let index=0,score=0,results=[];
  function load(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function value(a){return (a.upper?5:0)+a.lower}
  function beadMarkup(a){return `<div class="abacus-wrap"><div class="abacus"><div class="abacus-inner"><div class="rod-column"><span class="rod-label">ONES</span><div class="upper-zone"><button type="button" class="bead upper ${a.upper?'active':''}" id="assessUpper" aria-label="Upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<a.lower?'active':''}" data-assess-lower="${i}" aria-label="Lower bead ${i+1}"></button>`).join('')}</div></div><div class="rod-column"><span class="rod-label">TENS</span><div class="upper-zone"></div><div class="beam"></div><div class="lower-zone"></div></div></div></div></div>`}
  function render(){
    const q=QUESTIONS[index],app=document.querySelector('#app');if(!app)return;
    const profile=load(PROFILE_KEY,{}),a={upper:false,lower:0};
    app.innerHTML=`<div class="screen world-screen"><header class="topbar"><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>Quick Start</small></span></div><div class="top-actions"><span class="streak">${index+1}/${QUESTIONS.length}</span></div></header><main class="content"><div class="assessment"><p class="eyebrow">QUICK START CHECK · ${index+1}/${QUESTIONS.length}</p><h1>Show Babi what you know, ${esc(profile.name||'friend')}!</h1><p>Build the answer with the beads. No typing.</p><div class="problem">${q.a} ${q.op} ${q.b} <span>= ?</span></div><div id="assessBeadArea">${beadMarkup(a)}</div><div class="answer-card"><small>Your number</small><strong id="assessValue">0</strong></div><div id="assessStatus" class="learning-status" role="status" aria-live="polite"></div><button class="primary" id="assessCheck">Check →</button></div></main></div>`;
    const redraw=()=>{document.querySelector('#assessBeadArea').innerHTML=beadMarkup(a);document.querySelector('#assessValue').textContent=String(value(a));document.querySelector('#assessUpper').onclick=()=>{a.upper=!a.upper;redraw()};document.querySelectorAll('[data-assess-lower]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.assessLower);a.lower=i<a.lower?i:Math.min(4,i+1);redraw()})};
    redraw();
    document.querySelector('#assessCheck').onclick=()=>{const correct=value(a)===q.answer;score+=correct?1:0;results.push({skill:q.skill,correct});const status=document.querySelector('#assessStatus');status.className=`learning-status ${correct?'ok':'bad'}`;status.textContent=correct?'Great! Babi found that one. 🌟':`Good try — Babi will use this to choose your starting level.`;const btn=document.querySelector('#assessCheck');btn.disabled=true;setTimeout(()=>{index++;index<QUESTIONS.length?render():finish()},650)};
  }
  function finish(){
    const start=score>=5?6:score>=4?5:score>=3?3:1;
    const progress=load(PROGRESS_KEY,{currentLevel:1,streak:0,levels:{},rules:{direct:{correct:0,wrong:0},small:{correct:0,wrong:0},big:{correct:0,wrong:0},mixed:{correct:0,wrong:0}},sessions:0});
    progress.currentLevel=start;progress.streak=0;progress.sessions=Number(progress.sessions||0)+1;save(PROGRESS_KEY,progress);
    save(ASSESS_KEY,{score,total:QUESTIONS.length,startingLevel:start,results,completedAt:Date.now()});
    const profile=load(PROFILE_KEY,{}),app=document.querySelector('#app');
    app.innerHTML=`<div class="screen world-screen"><main class="content"><div style="max-width:620px;margin:auto;text-align:center">${babi()}<p class="eyebrow">QUICK START COMPLETE</p><h1>Nice work, ${esc(profile.name||'abacus star')}! 🌟</h1><p style="font-size:20px;line-height:1.5">Babi checked your bead skills and found a good place to start.</p><div class="learning-ready"><h2>🚀 Your starting point</h2><strong style="font-size:42px;display:block;margin:8px 0">Level ${start}</strong><p>${score}/${QUESTIONS.length} correct · No beginner lessons needed.</p><button class="primary" id="assessContinue">Enter My World →</button></div></div></main></div>`;
    document.querySelector('#assessContinue').onclick=()=>{location.hash='';location.reload()};
  }
  function babi(){return `<svg class="babi babi-medium babi-happy" viewBox="0 0 160 160" aria-label="Babi"><use href="./assets/mascot/babi.svg#happy"></use></svg>`}
  document.addEventListener('click',e=>{const btn=e.target.closest('#obNext');if(!btn)return;const exp=document.querySelector('.experience button.selected')?.dataset.exp;if(exp!=='known')return;e.preventDefault();e.stopImmediatePropagation();const name=document.querySelector('#childName')?.value?.trim()||'Child';const age=document.querySelector('.age-grid button.selected')?.dataset.age||'6-8';if(!save(PROFILE_KEY,{name,age,experience:'known',createdAt:Date.now()}))return;index=0;score=0;results=[];render()},true);
})();
