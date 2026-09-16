/* Practice entry adapter.
   Practice owns one authoritative state -> DOM renderer for bead interaction.
   Learn remains untouched. Master unlock remains tied to first Practice completion.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  const PROFILE='abacus-ai-profile-v2',PROGRESS='abacus-ai-progress-v2';
  const load=(key,fallback)=>{try{const v=JSON.parse(localStorage.getItem(key));return v??fallback}catch{return fallback}};
  const save=(state)=>{try{localStorage.setItem(PROGRESS,JSON.stringify(state));return true}catch{return false}};
  const esc=v=>String(v).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const levelName=n=>n<=2?'Direct addition':n<=4?'Direct subtraction':n<=6?'Small friend addition':n<=8?'Small friend subtraction':n<=10?'Big friend addition':n<=12?'Big friend subtraction':n===13?'Mixed direct + small':n===14?'Mixed small + big':'Full mixed mastery';

  function style(){
    if(document.getElementById('practiceEntryUXStyle'))return;
    const s=document.createElement('style');s.id='practiceEntryUXStyle';s.textContent=`
      .pex-practice-card{padding-bottom:28px}
      .pex-abacus{margin:18px auto 14px}
      .pex-abacus .abacus{width:min(520px,100%);padding:18px 14px;border-radius:24px}
      .pex-abacus .abacus-inner{display:flex;justify-content:center;gap:18px;padding:18px 12px;border-radius:16px;min-height:390px}
      .pex-abacus .rod-column{position:relative;width:min(300px,92%);min-height:350px;padding:8px 4px;background:rgba(255,255,255,.035);border-radius:18px}
      .pex-abacus .rod-label{position:relative;z-index:6;text-align:center;color:#F7E2B7;font-weight:950;font-size:13px;letter-spacing:1.4px;margin:2px 0 8px}
      .pex-abacus .rod{position:absolute;top:58px;bottom:26px;left:50%;width:10px;transform:translateX(-50%);border-radius:8px;background:linear-gradient(90deg,#B87836,#E2B16D,#9B5F2A);z-index:1}
      .pex-abacus .upper-zone{position:absolute;top:42px;left:0;right:0;height:64px;display:flex;justify-content:center;align-items:flex-start;z-index:5}
      .pex-abacus .divider{position:absolute;top:104px;left:9%;right:9%;height:12px;margin:0;border-radius:8px;background:#B8732F;box-shadow:0 2px 0 rgba(75,44,24,.35);z-index:6}
      .pex-abacus .lower-zone{position:absolute;top:122px;left:0;right:0;height:205px;display:block;z-index:5}
      .pex-abacus .bead{appearance:none;border:2px solid #633716;padding:0;width:72px;height:44px;border-radius:50%;background:radial-gradient(circle at 34% 27%,#F4C57E,#C98A3E 52%,#824B23);box-shadow:inset 0 3px 4px rgba(255,255,255,.22),0 4px 6px rgba(0,0,0,.3);cursor:pointer;touch-action:none;-webkit-tap-highlight-color:transparent;transition:bottom .28s cubic-bezier(.2,.8,.2,1),transform .18s ease,filter .15s ease,box-shadow .15s ease}
      .pex-abacus .bead.lower{position:absolute;left:50%;bottom:calc(var(--slot,0) * 37px);transform:translateX(-50%)}
      .pex-abacus .bead.lower.active{filter:brightness(1.1);box-shadow:inset 0 3px 5px rgba(255,255,255,.28),0 5px 8px rgba(0,0,0,.35)}
      .pex-abacus .bead.upper{width:82px;height:50px;transform:translateY(0)}
      .pex-abacus .bead.upper.active{transform:translateY(48px);filter:brightness(1.1)}
      .pex-feedback{min-height:25px;text-align:center;color:#6B665E;font-weight:800;margin:10px 0}
      .pex-step{display:flex;justify-content:center;gap:7px;flex-wrap:wrap;margin:10px 0 14px}.pex-step span{padding:7px 11px;border-radius:999px;background:#FFF7E7;border:1px solid #D8C09A;color:#6B4226;font-size:12px;font-weight:900}
      @media(max-width:520px){
        .pex-abacus{margin-top:14px}.pex-abacus .abacus{padding:12px 9px;border-width:7px}.pex-abacus .abacus-inner{min-height:350px;padding:15px 7px}.pex-abacus .rod-column{min-height:315px}.pex-abacus .rod{top:52px;bottom:22px}.pex-abacus .divider{top:96px;left:7%;right:7%;height:10px}.pex-abacus .upper-zone{top:37px;height:58px}.pex-abacus .lower-zone{top:113px;height:184px}.pex-abacus .bead{width:66px;height:40px}.pex-abacus .bead.upper{width:76px;height:46px}.pex-abacus .bead.lower{bottom:calc(var(--slot,0) * 33px)}.pex-abacus .bead.upper.active{transform:translateY(42px)}
      }
    `;document.head.appendChild(s);
  }

  function babi(){return '<div style="text-align:center;font-size:58px;line-height:1;margin:0 0 4px">🧮</div>'}

  function abacusHtml(a,oneRodOnly){
    const rods=oneRodOnly?a.rods.slice(0,1):a.rods;
    return `<div class="abacus-wrap pex-abacus" data-pex-practice="1"><div class="abacus"><div class="abacus-inner">${rods.map((r,ri)=>{
      const beads=Array.from({length:5},(_,i)=>`<button type="button" class="bead lower ${i<r.lower?'active':''}" data-lower="${ri}" data-index="${i}" aria-label="${['one','two','three','four','five'][i]} bead"></button>`).join('');
      return `<div class="rod-column"><div class="rod-label">${ri===1?'TENS':'ONES'}</div><div class="rod"></div><div class="upper-zone"><button type="button" class="bead upper ${r.upper?'active':''}" data-upper="${ri}" aria-label="five bead"></button></div><div class="divider"></div><div class="lower-zone">${beads}</div></div>`;
    }).join('')}</div></div></div>`;
  }

  // Single renderer: current engine state determines every bead's physical slot.
  function render(a,root){
    if(!root)return;
    root.querySelectorAll('.rod-column').forEach((column,rodIndex)=>{
      const state=a.rods[rodIndex]||{lower:0,upper:false};
      const count=Math.max(0,Math.min(5,Number(state.lower)||0));
      column.querySelectorAll('.lower-zone .bead').forEach((bead,i)=>{
        const active=i<count;
        const slot=active?(4-i):(i-count);
        bead.style.setProperty('--slot',String(slot));
        bead.classList.toggle('active',active);
      });
      const upper=column.querySelector('.upper-zone .bead');
      if(upper)upper.classList.toggle('active',!!state.upper);
    });
  }

  function bind(a,root,onChange){
    if(!root)return;
    let down=null,suppressClick=false;
    const commit=()=>{render(a,root);onChange?.()};

    function activate(bead){
      if(bead.dataset.upper!=null){
        const r=Number(bead.dataset.upper);if(a.rods[r])a.rods[r].upper=!a.rods[r].upper;return;
      }
      if(bead.dataset.lower!=null){
        const r=Number(bead.dataset.lower),i=Number(bead.dataset.index),current=Number(a.rods[r]?.lower)||0;
        if(!a.rods[r])return;
        // Practice interaction is deliberately incremental: every tap moves exactly one bead.
        // Tapping an inactive bead adds one; tapping an active bead returns one.
        a.rods[r].lower=i<current?Math.max(0,current-1):Math.min(5,current+1);
      }
    }

    root.addEventListener('pointerdown',e=>{
      const bead=e.target.closest('.bead');if(!bead||!root.contains(bead))return;
      down={bead,x:e.clientX,y:e.clientY};
    },{passive:true});
    root.addEventListener('pointerup',e=>{
      if(!down)return;
      const bead=down.bead,moved=Math.hypot(e.clientX-down.x,e.clientY-down.y)>12;down=null;
      if(!moved)return;
      e.preventDefault();suppressClick=true;activate(bead);commit();setTimeout(()=>{suppressClick=false},0);
    },{passive:false});
    root.addEventListener('pointercancel',()=>{down=null});
    root.addEventListener('click',e=>{
      const bead=e.target.closest('.bead');if(!bead||!root.contains(bead)||suppressClick)return;
      activate(bead);commit();
    });
    render(a,root);
  }

  let active=false;
  async function openPractice(){
    if(active)return;
    const profile=load(PROFILE,null);
    const state=load(PROGRESS,{currentLevel:1,streak:0,levels:{},rules:{direct:{correct:0,wrong:0},small:{correct:0,wrong:0},big:{correct:0,wrong:0},mixed:{correct:0,wrong:0}},sessions:0,learn:{completed:false},practiceCompleted:false});
    state.learn??={completed:false};
    if(!profile||!state.learn.completed)return;
    active=true;style();

    const engine=await import('./abacusEngine.js');
    let level=Math.min(Math.max(Number(state.currentLevel)||1,1),6);
    let problem=engine.generateProblem(level),a=engine.createAbacus(),streak=0,wrong=0;
    const oneRodOnly=level<=6;

    function draw(){
      app.innerHTML=`<div class="screen world-screen"><header class="topbar"><button type="button" class="icon-btn" id="pexBack">←</button><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>For Kids</small></span></div><div class="top-actions"><span class="streak">★ ${streak}</span></div></header><main class="content pex-practice-card">${babi()}<div class="practice-meta"><span>LEVEL ${level} · ${esc(levelName(level))}</span><span>${streak}/3 ⭐</span></div><div class="pex-step"><span>👆 Tap a bead</span><span>🔢 Watch your number</span><span>✨ Press Check</span></div><div class="problem">${problem.operands[0]} ${problem.operation==='add'?'+':'−'} ${problem.operands[1]} <span>= ?</span></div><p class="hint">Move the beads to make your answer.</p>${abacusHtml(a,oneRodOnly)}<div class="answer-card"><small>Your number</small><strong id="pexValue">0</strong></div><div class="actions"><button type="button" class="primary" id="pexCheck">Check ✓</button><button type="button" class="secondary" id="pexHint">💡 Babi Hint</button></div><p id="pexFeedback" class="pex-feedback">Build the answer, then press Check.</p></main><div class="footer">Powered by PromptStudioAI<br><small>promptstudioai.in</small></div></div>`;
      window.scrollTo({top:0,left:0,behavior:'auto'});
      const root=app.querySelector('.pex-abacus');
      const update=()=>{const value=app.querySelector('#pexValue');if(value)value.textContent=String(engine.valueOf(a));const p=root?.closest('.screen');if(p)p.querySelector('.streak').textContent=`★ ${streak}`};
      bind(a,root,update);update();
      app.querySelector('#pexBack').onclick=()=>{active=false;location.reload()};
      app.querySelector('#pexHint').onclick=()=>{app.querySelector('#pexFeedback').textContent=`Think about the ${problem.expectedRule} move. Babi says: one bead at a time!`};
      app.querySelector('#pexCheck').onclick=()=>{
        const ok=engine.checkAnswer(problem,a).correct;
        const feedback=app.querySelector('#pexFeedback');
        state.rules[problem.expectedRule]??={correct:0,wrong:0};
        state.levels[level]??={correct:0,wrong:0,completed:false};
        if(ok){
          state.rules[problem.expectedRule].correct++;state.levels[level].correct++;streak++;wrong=0;state.streak=streak;
          if(streak>=3){
            state.levels[level].completed=true;
            if(level===1)state.practiceCompleted=true;
            state.currentLevel=engine.getNextLevel(level,streak,0);
            save(state);
            feedback.textContent=level===1?'Amazing! Your first practice is complete. Master is unlocked. 🌟':'Great! Level complete. 🌟';
            setTimeout(()=>{active=false;location.reload()},650);return;
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
    const button=e.target.closest?.('#practice');if(!button||button.disabled)return;
    const learnComplete=!!load(PROGRESS,{learn:{completed:false}})?.learn?.completed;
    if(!learnComplete)return;
    e.preventDefault();e.stopImmediatePropagation();openPractice();
  },true);
})();