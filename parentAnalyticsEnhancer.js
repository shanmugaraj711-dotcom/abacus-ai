// Phase 4 — parent dashboard layered onto the existing parent-gated screen.
(function(){
 const ID='phase4-parent-dashboard';
 const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 const cap=s=>s?String(s).charAt(0).toUpperCase()+String(s).slice(1):s;
 function styles(){if(document.getElementById(ID+'-style'))return;const st=document.createElement('style');st.id=ID+'-style';st.textContent=`
  #${ID}{margin:18px 0 6px;display:grid;gap:14px}
  #${ID} .p4-hero,#${ID} .p4-card{background:linear-gradient(145deg,#fffdf7,#f7efe2);border:1px solid rgba(107,66,38,.12);border-radius:20px;padding:16px;box-shadow:0 8px 24px rgba(75,44,24,.07)}
  #${ID} .p4-hero{display:flex;align-items:center;gap:12px}
  #${ID} .p4-babi{font-size:34px;line-height:1}
  #${ID} h2,#${ID} h3,#${ID} p{margin:0}
  #${ID} h2{font-size:20px;color:#4b2c18}
  #${ID} h3{font-size:16px;color:#4b2c18;margin-bottom:10px}
  #${ID} .p4-muted{font-size:12px;color:#806b5b;margin-top:4px}
  #${ID} .p4-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #${ID} .p4-stat{background:#fff;border-radius:15px;padding:12px;text-align:center;border:1px solid rgba(107,66,38,.08)}
  #${ID} .p4-stat b{display:block;font-size:23px;color:#6b4226}
  #${ID} .p4-stat small{font-size:11px;color:#806b5b}
  #${ID} .p4-skill{display:grid;grid-template-columns:1fr auto;gap:7px 10px;align-items:center;margin:9px 0}
  #${ID} .p4-skill-label{font-size:13px;font-weight:800;color:#4b2c18}
  #${ID} .p4-bar{grid-column:1/-1;height:9px;background:#eadfce;border-radius:99px;overflow:hidden}
  #${ID} .p4-bar span{display:block;height:100%;border-radius:99px;background:#6b4226}
  #${ID} .p4-badge{font-size:11px;font-weight:900;color:#6b4226}
  #${ID} .p4-next{font-size:13px;line-height:1.45;color:#5e4939}
  #${ID} .p4-refresh{margin-top:11px;border:0;border-radius:12px;padding:10px 13px;font-weight:900;background:#eadbc9;color:#4b2c18}
  @media(min-width:600px){#${ID} .p4-stats{grid-template-columns:repeat(4,minmax(0,1fr))}}
 `;document.head.appendChild(st)}
 function getData(){return window.ParentInsights?.summary?window.ParentInsights.summary():null}
 function isGate(screen){const text=(screen.textContent||'').replace(/\s+/g,' ');return /8\s*\+\s*7\s*=\s*15/.test(text)||/parent zone/i.test(text)&&/solve|answer|challenge/i.test(text)}
 function isParentScreen(screen){const heading=screen.querySelector('h1,h2');const text=heading?.textContent||'';return /parent/i.test(text)||/parent/i.test(screen.getAttribute('data-screen')||'')}
 function render(){
  const screen=document.querySelector('#app .screen');if(!screen||isGate(screen)||!isParentScreen(screen))return;
  styles();let root=document.getElementById(ID);if(!root){root=document.createElement('section');root.id=ID;const content=screen.querySelector('.content')||screen.querySelector('main')||screen;content.appendChild(root)}
  const d=getData();if(!d)return;
  const strongest=d.strongest?`${esc(d.strongest.label)} · ${d.strongest.accuracy}%`:'Not enough practice yet';
  const needs=d.needsPractice?`${esc(d.needsPractice.label)} · ${d.needsPractice.accuracy}%`:'Start practising to discover strengths';
  const skills=d.rules.filter(r=>r.total>0).map(r=>`<div class="p4-skill"><span class="p4-skill-label">${esc(r.label)}</span><span class="p4-badge">${r.accuracy}%</span><div class="p4-bar"><span style="width:${Math.max(0,Math.min(100,r.accuracy))}%"></span></div></div>`).join('');
  root.innerHTML=`<div class="p4-hero"><div class="p4-babi">🧮</div><div><h2>${esc(d.child)}'s learning snapshot</h2><p class="p4-muted">Private on this device · based on practice already completed</p></div></div><div class="p4-stats"><div class="p4-stat"><b>Lv ${d.currentLevel}</b><small>Current level</small></div><div class="p4-stat"><b>${d.accuracy}%</b><small>Overall accuracy</small></div><div class="p4-stat"><b>${d.streak}★</b><small>Current streak</small></div><div class="p4-stat"><b>${d.completedLevels}</b><small>Levels mastered</small></div></div><div class="p4-card"><h3>🌟 What is going well?</h3><p class="p4-next">${strongest}</p></div><div class="p4-card"><h3>🌱 Where to practise?</h3><p class="p4-next">${needs}</p>${skills?`<div style="margin-top:12px">${skills}</div>`:'<p class="p4-muted" style="margin-top:8px">No practice results yet. That is perfectly fine — the first few sessions will create a useful picture.</p>'}</div><div class="p4-card"><h3>🎯 Babi's next suggestion</h3><p class="p4-next">${esc(cap(d.next))}</p><button class="p4-refresh" type="button">↻ Refresh snapshot</button></div>`;
  root.querySelector('.p4-refresh').onclick=render;
 }
 const app=document.querySelector('#app');if(!app)return;
 new MutationObserver(()=>setTimeout(render,0)).observe(app,{childList:true,subtree:true});
 window.ParentAnalytics={render};
 setTimeout(render,50);
})();
