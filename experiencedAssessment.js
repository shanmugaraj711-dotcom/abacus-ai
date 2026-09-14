// Experienced learner path: intercepts the onboarding submit before the legacy assessment
// and runs a balanced five-question check using real bead interaction.
(function(){
  const PROFILE_KEY='abacus-ai-profile-v2';
  const PROGRESS_KEY='abacus-ai-progress-v2';
  const QUESTIONS=[
    {a:2,b:3,op:'+',answer:5,skill:'direct'},
    {a:7,b:2,op:'−',answer:5,skill:'direct'},
    {a:3,b:4,op:'+',answer:7,skill:'small'},
    {a:8,b:3,op:'−',answer:5,skill:'small'},
    {a:5,b:4,op:'+',answer:9,skill:'small'}
  ];
  let index=0,score=0;
  function save(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
  function value(a){return (a.upper?5:0)+a.lower}
  function beadMarkup(a){
    return `<div class="abacus-wrap"><div class="abacus"><div class="abacus-inner"><div class="rod-column"><span class="rod-label">ONES</span><div class="upper-zone"><button type="button" class="bead upper ${a.upper?'active':''}" id="assessUpper" aria-label="Upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<a.lower?'active':''}" data-assess-lower="${i}" aria-label="Lower bead ${i+1}"></button>`).join('')}</div></div><div class="rod-column"><span class="rod-label">TENS</span><div class="upper-zone"></div><div class="beam"></div><div class="lower-zone"></div></div></div></div></div>`;
  }
  function render(){
    const q=QUESTIONS[index], app=document.querySelector('#app');
    if(!app)return;
    const profile=(()=>{try{return JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}')}catch{return {}}})();
    const a={upper:false,lower:0};
    app.innerHTML=`<div class="screen world-screen"><header class="topbar"><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>Quick Start</small></span></div><div class="top-actions"><span class="streak">${index+1}/5</span></div></header><main class="content"><div class="assessment"><p class="eyebrow">QUICK START CHECK · ${index+1}/5</p><h1>Ready for a challenge, ${esc(profile.name||'friend')}?</h1><p>Build the answer with the beads. No typing.</p><div class="problem">${q.a} ${q.op} ${q.b} <span>= ?</span></div><div id="assessBeadArea">${beadMarkup(a)}</div><div class="answer-card"><small>Your number</small><strong id="assessValue">0</strong></div><div id="assessStatus" class="learning-status" role="status" aria-live="polite"></div><button class="primary" id="assessCheck">Check →</button></div></main></div>`;
    const redraw=()=>{
      document.querySelector('#assessBeadArea').innerHTML=beadMarkup(a);
      document.querySelector('#assessValue').textContent=String(value(a));
      document.querySelector('#assessUpper').onclick=()=>{a.upper=!a.upper;redraw()};
      document.querySelectorAll('[data-assess-lower]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.assessLower);a.lower=i<a.lower?i:Math.min(4,i+1);redraw()});
    };
    redraw();
    document.querySelector('#assessCheck').onclick=()=>{
      const correct=value(a)===q.answer;
      if(correct)score++;
      const status=document.querySelector('#assessStatus');
      status.className=`learning-status ${correct?'ok':'bad'}`;
      status.textContent=correct?'Great! Babi found that one. 🌟':`Good try — the answer was ${q.answer}.`;
      const btn=document.querySelector('#assessCheck');btn.disabled=true;
      setTimeout(()=>{index++;index<QUESTIONS.length?render():finish()},650);
    };
  }
  function finish(){
    const start=score>=4?5:score>=2?3:1;
    let progress={currentLevel:1,streak:0,levels:{},rules:{direct:{correct:0,wrong:0},small:{correct:0,wrong:0},big:{correct:0,wrong:0},mixed:{correct:0,wrong:0}},sessions:0};
    try{progress=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null')||progress}catch{}
    progress.currentLevel=start;progress.streak=0;progress.sessions=Number(progress.sessions||0)+1;
    save(PROGRESS_KEY,progress);
    save('abacus-ai-assessment-v1',{score,total:QUESTIONS.length,startingLevel:start,completedAt:Date.now()});
    location.reload();
  }
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#obNext');
    if(!btn)return;
    const exp=document.querySelector('.experience button.selected')?.dataset.exp;
    if(exp!=='known')return;
    e.preventDefault();e.stopImmediatePropagation();
    const name=document.querySelector('#childName')?.value?.trim()||'Child';
    const age=document.querySelector('.age-grid button.selected')?.dataset.age||'6-8';
    if(!save(PROFILE_KEY,{name,age,experience:'known',createdAt:Date.now()}))return;
    index=0;score=0;render();
  },true);
})();
