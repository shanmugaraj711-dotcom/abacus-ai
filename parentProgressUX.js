// Parent-facing progress/value layer. Read-only: never creates or mutates learning state.
(function(){
  const KEY='abacus-ai-progress-v2';
  const PROFILE='abacus-ai-profile-v2';
  const STYLE='parent-progress-ux-style';
  const CARD='parent-progress-passport';
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const read=(key,f)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??f}catch{return f}};
  const pct=(n,d)=>d?Math.round((n/d)*100):0;
  const safeRule=(r)=>{const x=r&&typeof r==='object'?r:{};return {correct:Number(x.correct)||0,wrong:Number(x.wrong)||0}};
  function data(){
    const state=read(KEY,{}),profile=read(PROFILE,{});
    const levels=state&&state.levels&&typeof state.levels==='object'?state.levels:{};
    const rules=state&&state.rules&&typeof state.rules==='object'?state.rules:{};
    const completed=Object.keys(levels).filter(k=>levels[k]?.completed&&Number(k)>=1&&Number(k)<=15).map(Number).sort((a,b)=>a-b);
    const rulesOut=['direct','small','big','mixed'].map(name=>{const r=safeRule(rules[name]),total=r.correct+r.wrong;return {name,correct:r.correct,wrong:r.wrong,total,accuracy:pct(r.correct,total)}});
    const attempted=rulesOut.filter(r=>r.total>0);
    const focus=attempted.slice().sort((a,b)=>a.accuracy-b.accuracy||a.total-b.total)[0]||null;
    const totalCorrect=rulesOut.reduce((n,r)=>n+r.correct,0),totalWrong=rulesOut.reduce((n,r)=>n+r.wrong,0),total=totalCorrect+totalWrong;
    return {state,profile,completed,rules:rulesOut,focus,accuracy:pct(totalCorrect,total),sessions:Number(state.sessions)||0,currentLevel:Math.max(1,Math.min(15,Number(state.currentLevel)||1)),streak:Math.max(0,Number(state.streak)||0)};
  }
  function style(){
    if(document.getElementById(STYLE))return;
    const s=document.createElement('style');s.id=STYLE;s.textContent=`
      .pux-card{margin:18px 0 6px;padding:20px;border-radius:24px;background:linear-gradient(145deg,#fff,#f4f9ff);border:1px solid rgba(62,99,139,.14);box-shadow:0 12px 30px rgba(42,63,88,.09);font-family:ui-rounded,system-ui,sans-serif;color:#243447}
      .pux-head{display:flex;gap:12px;align-items:center;margin-bottom:16px}.pux-icon{font-size:30px}.pux-head h2{margin:0;font-size:20px}.pux-head p{margin:3px 0 0;font-size:12px;font-weight:700;opacity:.66}
      .pux-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}.pux-stat{padding:13px 10px;border-radius:17px;background:#fff;border:1px solid rgba(62,99,139,.1);text-align:center}.pux-stat b{display:block;font-size:21px}.pux-stat span{font-size:10px;font-weight:800;opacity:.62;text-transform:uppercase;letter-spacing:.04em}
      .pux-progress{height:9px;border-radius:99px;background:#e8eef5;overflow:hidden}.pux-progress i{display:block;height:100%;width:var(--p,0%);border-radius:inherit;background:#5b8def}.pux-row{display:flex;justify-content:space-between;gap:12px;margin:8px 0 0;font-size:12px;font-weight:800}.pux-focus{margin-top:14px;padding:13px 14px;border-radius:17px;background:#f8f3e8}.pux-focus b{display:block;font-size:13px}.pux-focus span{display:block;margin-top:3px;font-size:12px;line-height:1.35;opacity:.76}.pux-rules{display:grid;gap:8px;margin-top:14px}.pux-rule{display:grid;grid-template-columns:72px 1fr 44px;align-items:center;gap:9px;font-size:11px;font-weight:800}.pux-rule .pux-progress{height:7px}.pux-rule em{font-style:normal;text-align:right;opacity:.7}.pux-levels{margin-top:14px;font-size:12px;font-weight:750;line-height:1.4}.pux-muted{opacity:.65}
      @media(max-width:560px){.pux-grid{grid-template-columns:1fr 1fr 1fr}.pux-stat b{font-size:18px}.pux-card{padding:16px}}
    `;document.head.appendChild(s);
  }
  function isParentScreen(){
    const root=document.querySelector('.screen');if(!root||root.classList.contains('onboarding'))return false;
    const text=(root.querySelector('.content')?.textContent||root.textContent||'').toLowerCase();
    return /parent|progress|accuracy|sessions|child|learning/.test(text) && !document.getElementById('childName');
  }
  function render(){
    if(!isParentScreen()||document.getElementById(CARD))return;
    const d=data();style();
    const completed=d.completed.length, levelText=completed?`Levels completed: ${completed.join(', ')}`:'No levels completed yet';
    const focus=d.focus?`${d.focus.name==='direct'?'Direct':d.focus.name==='small'?'Small friend':d.focus.name==='big'?'Big friend':'Mixed'} is the current practice focus (${d.focus.accuracy}% across ${d.focus.total} attempts).`:'Keep practising to build enough attempts for a useful rule-level signal.';
    const rules=d.rules.map(r=>`<div class="pux-rule"><span>${r.name==='direct'?'Direct':r.name==='small'?'Small':r.name==='big'?'Big':'Mixed'}</span><div class="pux-progress"><i style="--p:${r.accuracy}%"></i></div><em>${r.total?r.accuracy+'%':'—'}</em></div>`).join('');
    const card=document.createElement('section');card.id=CARD;card.className='pux-card';card.innerHTML=`<div class="pux-head"><div class="pux-icon">📘</div><div><h2>${esc(d.profile.name||'Child')}’s Learning Passport</h2><p>Simple progress view · stored on this device</p></div></div><div class="pux-grid"><div class="pux-stat"><b>${d.currentLevel}</b><span>Current level</span></div><div class="pux-stat"><b>${d.accuracy}%</b><span>Accuracy</span></div><div class="pux-stat"><b>${d.sessions}</b><span>Sessions</span></div></div><div class="pux-row"><span>Level progress</span><span>${completed}/15</span></div><div class="pux-progress"><i style="--p:${pct(completed,15)}%"></i></div><div class="pux-focus"><b>🎯 Practice focus</b><span>${esc(focus)}</span></div><div class="pux-rules">${rules}</div><div class="pux-levels"><span>${esc(levelText)}</span><br><span class="pux-muted">⭐ Current streak: ${d.streak}</span></div>`;
    const host=document.querySelector('.content')||document.querySelector('.screen');if(host)host.appendChild(card);
  }
  function boot(){
    render();
    new MutationObserver(()=>render()).observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
