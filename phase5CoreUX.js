// Phase 5 — child-first learning experience polish.
// Non-invasive enhancement layer: never intercepts core buttons or changes scoring.
(function(){
  const ROOT='phase5-core-ux';
  const PROFILE='abacus-ai-profile-v2';
  const PROGRESS='abacus-ai-progress-v2';
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const load=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??f}catch{return f}};
  const profile=()=>load(PROFILE,null);
  const progress=()=>load(PROGRESS,{currentLevel:1,streak:0,levels:{}});
  const levelName=n=>n<=2?'Direct addition':n<=4?'Direct subtraction':n<=6?'Small friend addition':n<=8?'Small friend subtraction':n<=10?'Big friend addition':n<=12?'Big friend subtraction':n===13?'Mixed direct + small':n===14?'Mixed small + big':'Full mixed mastery';
  function styles(){
    if(document.getElementById(ROOT+'-style'))return;
    const st=document.createElement('style');st.id=ROOT+'-style';
    st.textContent=`
      #${ROOT}{display:grid;gap:12px;margin:12px 0 16px}
      #${ROOT} .p5-card{border:1px solid rgba(107,66,38,.12);border-radius:20px;background:linear-gradient(145deg,#fffdf8,#f6eddf);padding:15px;box-shadow:0 7px 20px rgba(75,44,24,.06)}
      #${ROOT} .p5-kicker{font-size:10px;letter-spacing:.08em;font-weight:900;color:#92745d;text-transform:uppercase}
      #${ROOT} h2,#${ROOT} p{margin:0} #${ROOT} h2{font-size:18px;color:#4b2c18;margin-top:3px}
      #${ROOT} .p5-sub{font-size:12px;line-height:1.45;color:#6d5949;margin-top:4px}
      #${ROOT} .p5-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:12px}
      #${ROOT} .p5-step{border-radius:14px;padding:9px 6px;text-align:center;background:#fff;font-size:11px;font-weight:900;color:#806b5b;border:1px solid rgba(107,66,38,.08)}
      #${ROOT} .p5-step.on{background:#eadbc9;color:#4b2c18;border-color:rgba(107,66,38,.2)}
      #${ROOT} .p5-step.done{opacity:.72}
      #${ROOT} .p5-next{display:flex;align-items:center;gap:10px;margin-top:11px;padding-top:11px;border-top:1px dashed rgba(107,66,38,.18)}
      #${ROOT} .p5-next-icon{font-size:26px} #${ROOT} .p5-next b{display:block;font-size:13px;color:#4b2c18} #${ROOT} .p5-next small{display:block;font-size:11px;color:#806b5b;margin-top:2px}
      #${ROOT} .p5-practice{margin:0 0 12px;padding:11px 13px;border-radius:15px;background:#fff8ec;border:1px solid rgba(107,66,38,.1);font-size:12px;color:#5e4939}
      #${ROOT} .p5-practice b{color:#4b2c18}
      @media(min-width:600px){#${ROOT}{grid-template-columns:1.25fr 1fr}#${ROOT} .p5-card:first-child{grid-column:1/-1}}
    `;document.head.appendChild(st);
  }
  function currentScreen(){return document.querySelector('#app .screen')}
  function screenKind(s){
    const t=(s?.textContent||'').replace(/\s+/g,' ');
    if(/TODAY'S MISSION|WELCOME BACK/i.test(t)&&/LEARN|PRACTISE|PLAY/i.test(t))return 'world';
    if(/LEVEL \d+/.test(t)&&/Move the beads to make your answer/i.test(t))return 'practice';
    return '';
  }
  function enhanceWorld(screen){
    if(document.getElementById(ROOT))return;
    styles();
    const p=progress(), prof=profile(), level=Math.max(1,Math.min(15,Number(p.currentLevel)||1));
    const mastered=Object.keys(p.levels||{}).filter(k=>p.levels[k]?.completed).length;
    const stage=level<=2?0:level<=6?1:2;
    const steps=[['🌱','Learn'],['🧮','Practise'],['🏆','Master']];
    const stepHtml=steps.map((x,i)=>`<div class="p5-step ${i<stage?'done ':''}${i===stage?'on':''}">${x[0]} ${x[1]}</div>`).join('');
    const child=prof?.name?esc(prof.name):'you';
    const next=level<=2?['🧮','Build confidence with direct addition']:level<=4?['↘️','Keep practising clean subtraction']:level<=6?['🪄','Get comfortable with small friends']:['🏆','Keep building toward mastery'];
    const root=document.createElement('section');root.id=ROOT;
    root.innerHTML=`<div class="p5-card"><div class="p5-kicker">YOUR LEARNING JOURNEY</div><h2>${child}, you're on Level ${level}</h2><p class="p5-sub">${esc(levelName(level))} · ${mastered} level${mastered===1?'':'s'} mastered</p><div class="p5-steps">${stepHtml}</div><div class="p5-next"><span class="p5-next-icon">${next[0]}</span><div><b>Next best step</b><small>${next[1]}</small></div></div></div>`;
    const mission=screen.querySelector('.mission');
    const journey=screen.querySelector('.journey');
    if(mission)mission.insertAdjacentElement('afterend',root); else if(journey)journey.insertAdjacentElement('beforebegin',root); else return;
  }
  function enhancePractice(screen){
    if(document.getElementById(ROOT))return;
    styles();
    const p=progress(), level=Math.max(1,Math.min(15,Number(p.currentLevel)||1));
    const meta=screen.querySelector('.practice-meta');
    const hint=screen.querySelector('.hint');
    const text=screen.textContent||'';
    const rule=/small friend/i.test(text)?'small':/big friend/i.test(text)?'big':'direct';
    const copy={direct:'Use simple bead moves. Watch each bead as you count.',small:'Look for a small friend: a group that helps you make 5 or 10.',big:'Think about the 10-friend: trade across the next rod when needed.'};
    const box=document.createElement('div');box.id=ROOT;box.innerHTML=`<div class="p5-practice"><b>🎯 Today's skill: ${esc(levelName(level))}</b><br>${esc(copy[rule])}</div>`;
    if(meta)meta.insertAdjacentElement('afterend',box);else if(hint)hint.insertAdjacentElement('beforebegin',box);else return;
  }
  function run(){const s=currentScreen();if(!s)return;const kind=screenKind(s);if(kind==='world')enhanceWorld(s);else if(kind==='practice')enhancePractice(s)}
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;run()})}
  const app=document.getElementById('app');
  if(!app)return;
  new MutationObserver(schedule).observe(app,{childList:true,subtree:true});
  schedule();
  window.Phase5CoreUX={version:1,passive:true,refresh:run};
})();
