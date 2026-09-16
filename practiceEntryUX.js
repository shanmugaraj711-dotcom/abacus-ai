/* Practice entry adapter.
   Core practice rules are mirrored from challengeApp for the single missing entry path:
   Learn complete -> Practice available -> 3 correct in a row completes the first level.
   This exists because the legacy unlockedLevel(1) gate still assumes Practice must already exist.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;
  let active=false;

  const PROFILE='abacus-ai-profile-v2',PROGRESS='abacus-ai-progress-v2';
  const load=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}};
  const save=(state)=>{try{localStorage.setItem(PROGRESS,JSON.stringify(state));return true}catch{return false}};
  const esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));

  const levelName=n=>n<=2?'Direct addition':n<=4?'Direct subtraction':n<=6?'Small friend addition':n<=8?'Small friend subtraction':n<=10?'Big friend addition':n<=12?'Big friend subtraction':n===13?'Mixed direct + small':n===14?'Mixed small + big':'Full mixed mastery';

  function style(){
    if(document.getElementById('practiceEntryUXStyle'))return;
    const s=document.createElement('style');s.id='practiceEntryUXStyle';s.textContent=`
      .pex-abacus{margin:14px 0}.pex-abacus .abacus-inner{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .pex-abacus .rod-column{position:relative;min-height:300px;padding:10px 4px;background:rgba(255,255,255,.04);border-radius:16px}
      .pex-abacus .rod-label{text-align:center;color:#F7E2B7;font-weight:950;font-size:11px;letter-spacing:1px;margin-bottom:7px}
      .pex-abacus .upper-zone,.pex-abacus .lower-zone{display:flex;flex-direction:column;align-items:center;gap:8px;position:relative;z-index:2}
      .pex-abacus .divider{height:9px;margin:9px 0;border-radius:8px;background:#B8732F;position:relative;z-index:3}
      .pex-abacus .rod{position:absolute;top:39px;bottom:20px;left:50%;width:8px;transform:translateX(-50%);border-radius:7px;background:#E7A84B;z-index:1}
      .pex-abacus .bead{appearance:none;border:0;padding:0;width:58px;height:35px;border-radius:50%;background:radial-gradient(circle at 35% 25%,#F0BF78,#C98A3E 55%,#824B23);box-shadow:0 3px 5px rgba(0,0,0,.35);cursor:pointer;touch-action:none;transition:transform .22s ease,filter .15s ease}
      .pex-abacus .bead.upper{width:64px;height:42px}.pex-abacus .bead.lower.active{transform:translateY(-43px)}.pex-abacus .bead.upper.active{transform:translateY(38px)}
      .pex-practice-card{padding-bottom:28px}
      .pex-target{margin:12px 0;padding:14px 12px;border-radius:18px;background:#FFF4DB;border:2px solid #E5C98F;text-align:center;color:#6B4226;font-weight:950}
      .pex-target b{display:block;font-size:28px;margin-top:4px}.pex-feedback{min-height:25px;text-align:center;color:#6B665E;font-weight:800;margin:10px 0}
      @media(max-width:520px){.pex-abacus .abacus-inner{gap:8px}.pex-abacus .rod-column{min-height:275px}.pex-abacus .bead{width:50px;height:31px}.pex-abacus .bead.upper{width:56px;height:37px}.pex-abacus .bead.lower.active{transform:translateY(-39px)}.pex-abacus .bead.upper.active{transform:translateY(34px)}}
    `;document.head.appendChild(s);
  }

  function babi(){return '<div style="text-align:center;font-size:74px;line-height:1;margin:6px 0 8px">🧮</div>'}
  function abacusHtml(a){
    const rods=a.rods.map((r,ri)=>{
      const beads=Array.from({length:5},(_,i)=>`<button type="button" class="bead lower ${i<r.lower?'active':''}" data-lower="${ri}" data-index="${i}" aria-label="${['one','two','three','four','five'][i]} bead"></button>`).join('');
      return `<div class="rod-column"><div class="rod-label">${ri===1?'TENS':'ONES'}</div><div class="rod"></div><div class="upper-zone"><button type="button" class="bead upper ${r.upper?'active':''}" data-upper="${ri}" aria-label="five bead"></button></div><div class="divider"></div><div class="lower-zone">${beads}</div></div>`;
    }).join('');
    return `<div class="abacus-wrap pex-abacus"><div class="abacus"><div class="abacus-inner">${rods}</div></div></div>`;
  }

  function bind(a,root,onChange){
    root.querySelectorAll('[data-upper]').forEach(b=>b.onclick=()=>{const r=Number(b.dataset.upper);a.rods[r].upper=!a.rods[r].upper;onChange()});
    root.querySelectorAll('[data-lower]').forEach(b=>b.onclick=()=>{const r=Number(b.dataset.lower),i=Number(b.dataset.index),c=a.rods[r].lower;a.rods[r].lower=i<c?i:Math.min(4,i+1);onChange()});
  }

  async function openPractice(){
    if(active)return;
    const profile=load(PROFILE,null);
    const state=load(PROGRESS,{currentLevel:1,streak:0,levels:{},rules:{direct:{correct:0,wrong:0},small:{correct:0,wrong:0},big:{correct:0,wrong:0},mixed:{correct:0,wrong:0}},sessions:0,learn:{completed:false},practiceCompleted:false});
    state.learn??={completed:false};
    if(!profile||!state.learn.completed)return;
    active=true;
    style();

    const engine=await import('./abacusEngine.js');
    let level=Math.min(Math.max(Number(state.currentLevel)||1,1),6);
    let problem=engine.generateProblem(level),a=engine.createAbacus(),streak=0,wrong=0;

    function draw(){
      app.innerHTML=`<div class="screen world-screen"><header class="topbar"><button type="button" class="icon-btn" id="pexBack">←</button><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>For Kids</small></span></div><div class="top-actions"><span class="streak">★ ${streak}</span></div></header><main class="content pex-practice-card">${babi()}<div class="practice-meta"><span>LEVEL ${level} · ${esc(levelName(level))}</span><span>${streak}/3 ⭐</span></div><div class="problem">${problem.operands[0]} ${problem.operation==='add'?'+':'−'} ${problem.operands[1]} <span>= ?</span></div><p class="hint">Move the beads to make your answer.</p>${abacusHtml(a)}<div class="answer-card"><small>Your number</small><strong id="pexValue">${engine.valueOf(a)}</strong></div><div class="actions"><button type="button" class="primary" id="pexCheck">Check ✓</button><button type="button" class="secondary" id="pexHint">💡 Babi Hint</button></div><p id="pexFeedback" class="pex-feedback">Build the answer, then press Check.</p></main><div class="footer">Powered by PromptStudioAI<br><small>promptstudioai.in</small></div></div>`;
      window.scrollTo({top:0,left:0,behavior:'auto'});
      const root=app.querySelector('.pex-abacus');
      const update=()=>{app.querySelector('#pexValue').textContent=String(engine.valueOf(a));const p=root?.closest('.screen');if(p)p.querySelector('.streak').textContent=`★ ${streak}`};
      bind(a,root,update);update();
      app.querySelector('#pexBack').onclick=()=>{location.reload()};
      app.querySelector('#pexHint').onclick=()=>{app.querySelector('#pexFeedback').textContent=`Think about the ${problem.expectedRule} move. Babi says: one bead at a time!`};
      app.querySelector('#pexCheck').onclick=()=>{
        const ok=engine.checkAnswer(problem,a).correct;
        const feedback=app.querySelector('#pexFeedback');
        state.rules[problem.expectedRule]??={correct:0,wrong:0};
        state.levels[level]??={correct:0,wrong:0,completed:false};
        if(ok){
          state.rules[problem.expectedRule].correct++;state.levels[level].correct++;streak++;wrong=0;
          state.streak=streak;
          if(streak>=3){
            state.levels[level].completed=true;
            if(level===1)state.practiceCompleted=true;
            state.currentLevel=engine.getNextLevel(level,streak,0);
            save(state);
            feedback.textContent=level===1?'Amazing! Your first practice is complete. Master is unlocked. 🌟':'Great! Level complete. 🌟';
            setTimeout(()=>location.reload(),650);
            return;
          }
          feedback.textContent=`Great! ${streak}/3 correct. Next challenge is ready.`;
        }else{
          state.rules[problem.expectedRule].wrong++;state.levels[level].wrong++;wrong++;streak=0;state.streak=0;
          if(wrong>=2){level=Math.max(1,engine.getNextLevel(level,0,wrong));wrong=0;state.currentLevel=level}
          feedback.textContent=`Not yet. The answer is ${problem.answer}. Try again with the beads.`;
        }
        save(state);problem=engine.generateProblem(level);a=engine.createAbacus();draw();
      };
    }
    draw();
  }

  document.addEventListener('click',e=>{
    const button=e.target.closest?.('#practice');
    if(!button)return;
    if(button.disabled)return;
    const learnComplete=!!load(PROGRESS,{learn:{completed:false}})?.learn?.completed;
    if(!learnComplete)return;
    e.preventDefault();e.stopImmediatePropagation();openPractice();
  },true);
})();