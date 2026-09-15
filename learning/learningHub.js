import { createAbacus, valueOf } from '../abacusEngine.js';
import { FOUNDATION } from './01-foundation.js';
import { FIVE_BEAD } from './02-five-bead.js';
import { NUMBER_BUILDING } from './03-number-building.js';
import { READY } from './04-ready.js';

const app = document.querySelector('#app');
const PROFILE_KEY = 'abacus-ai-profile-v2';
const groups = [
  { id: 'foundation', title: '1. Abacus Basics', sub: 'Start from zero — no experience needed.', icon: '🌱', lessons: FOUNDATION },
  { id: 'five', title: '2. The 5 Bead', sub: 'Meet the special upper bead.', icon: '🖐️', lessons: FIVE_BEAD },
  { id: 'numbers', title: '3. Build Bigger Numbers', sub: 'Use 5 + lower beads to make 6–9.', icon: '🧮', lessons: NUMBER_BUILDING }
];
const allLessons = [...FOUNDATION, ...FIVE_BEAD, ...NUMBER_BUILDING];
const HINTS = {
  1: {
    title: 'Babi’s tiny tutorial 💡',
    steps: ['An abacus is a counting tool — the beads help you see numbers with your hands.', 'The little beads below the bar are worth 1 each.', 'Tap a little bead to move it UP to the bar. Three beads up means 3.']
  },
  2: {
    title: 'Babi’s hint 💡',
    steps: ['Each lower bead is worth 1.', 'Move the beads UP to the bar.', 'For 3, bring three lower beads up.']
  },
  3: {
    title: 'Babi’s hint 💡',
    steps: ['The upper bead is worth 5.', 'Tap the upper bead to bring it down to the bar.', 'One upper bead means 5.']
  },
  4: {
    title: 'Babi’s hint 💡',
    steps: ['The upper bead gives you 5.', 'Then add lower beads: 6 = 5 + 1, 7 = 5 + 2, 8 = 5 + 3, 9 = 5 + 4.', 'For 8, use the 5 bead and three little beads.']
  },
  5: {
    title: 'Babi’s hint 💡',
    steps: ['Read the number Babi asks for.', 'Use only the beads — no typing.', 'For 4, move four lower beads up.']
  }
};
let wiredLearn = null;
let activeLesson = null;
let activeAbacus = null;
let lessonLocked = false;

function profile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; } }
function esc(v){ return String(v ?? '').replace(/[&<>\\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\\"':'&quot;',"'":'&#39;'}[c])); }
function babi(expr='happy', size='small'){ return `<svg class="babi babi-${size} babi-${expr}" viewBox="0 0 160 160" aria-label="Babi"><use href="./assets/mascot/babi.svg#${expr}"></use></svg>`; }
function speak(text){ try { if('speechSynthesis' in window){ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(text); u.rate=.88; u.pitch=1.08; speechSynthesis.speak(u); } } catch {} }
function sayCorrect(){ const words=['Awesome!','Great job!','You did it!','Brilliant!']; const text=words[Math.floor(Math.random()*words.length)]; speak(text); return text; }
function abacusHtml(a){
  return `<div class="abacus-wrap learning-abacus"><div class="abacus"><div class="abacus-inner">${[0,1].map(r=>{
    const rod=a.rods[r];
    const lowers=[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<rod.lower?'active':''}" data-learning-lower="${r}" data-index="${i}" aria-label="${r?'Tens':'Ones'} lower bead ${i+1}"></button>`).join('');
    return `<div class="rod-column"><span class="rod-label">${r?'TENS':'ONES'}</span><div class="upper-zone"><button type="button" class="bead upper ${rod.upper?'active':''}" data-learning-upper="${r}" aria-label="${r?'Tens':'Ones'} upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${lowers}</div></div>`;
  }).join('')}</div></div></div>`;
}
function addStyle(){
  if(document.getElementById('learning-architecture-style')) return;
  const s=document.createElement('style'); s.id='learning-architecture-style'; s.textContent=`
  .learning-groups{display:grid;gap:14px;margin-top:14px}.learning-group{border-radius:22px;padding:14px;background:#fff;border:2px solid rgba(107,66,38,.10)}
  .learning-group-head{display:flex;gap:10px;align-items:center;margin-bottom:10px}.learning-group-icon{font-size:30px}.learning-group-head h2{margin:0;font-size:20px}.learning-group-head p{margin:3px 0 0;font-size:13px;opacity:.72}
  .learning-lesson-list{display:grid;gap:9px}.learning-lesson{width:100%;text-align:left;border:0;border-radius:16px;padding:13px 14px;background:#FAF6EE;color:#4B2C18;cursor:pointer}.learning-lesson b{display:block;font-size:16px}.learning-lesson small{display:block;margin-top:3px;opacity:.7}
  .learning-ready{margin-top:14px;padding:16px;border-radius:20px;background:#fff3c9;border:2px solid rgba(107,66,38,.12);text-align:center}.learning-ready h2{margin:4px 0}.learning-ready p{margin:5px 0 12px}.learning-lesson-card{max-width:620px;margin:0 auto;text-align:center}.learning-lesson-card .learning-target{background:#f3dfb5;border-radius:18px;padding:12px;margin:12px 0}.learning-target small{display:block}.learning-target strong{font-size:48px}.learning-note{font-weight:800;opacity:.8}.learning-current{font-size:19px;font-weight:900;margin:10px}.learning-status{min-height:30px;font-weight:900;margin:7px}.learning-status.ok{color:#176b2c}.learning-status.bad{color:#9b4d26}.learning-check{min-width:190px}.learning-check:disabled{opacity:.75}.learning-next{animation:learningPulse .9s ease-in-out infinite alternate}@keyframes learningPulse{from{transform:scale(1)}to{transform:scale(1.03)}}
  .learning-guide{margin:12px 0;padding:15px 16px;border-radius:20px;background:#fff8dc;border:2px solid rgba(107,66,38,.10);text-align:left}.learning-guide-head{display:flex;gap:10px;align-items:center}.learning-guide-head .babi{flex:0 0 auto}.learning-guide h2{font-size:18px;margin:0}.learning-guide p{margin:4px 0 0;font-size:14px;line-height:1.45}.learning-guide ol{margin:10px 0 0;padding-left:22px}.learning-guide li{margin:7px 0;line-height:1.45}.learning-hint{margin:10px auto 4px;display:inline-flex;align-items:center;gap:6px;border:2px solid rgba(107,66,38,.16);background:#fff;color:#4B2C18;border-radius:999px;padding:9px 15px;font-weight:900;cursor:pointer}.learning-hint-panel{display:none;margin:8px auto 12px;max-width:520px;padding:13px 15px;border-radius:18px;background:#fff8dc;border:2px solid rgba(107,66,38,.10);text-align:left}.learning-hint-panel.show{display:block}.learning-hint-panel strong{display:block;margin-bottom:6px}.learning-hint-panel p{margin:5px 0;line-height:1.45}.learning-abacus.guide-pulse{animation:guidePulse 1.2s ease-in-out 2}@keyframes guidePulse{50%{transform:scale(1.015)}}
  `; document.head.appendChild(s);
}
function backToWorld(){ location.hash=''; location.reload(); }
function openHub(){ addStyle(); renderHub(); }
function renderHub(){
  const p=profile();
  app.innerHTML=`<div class="screen world-screen"><header class="topbar"><button class="icon-btn" id="learningBack" aria-label="Back to My Abacus World">←</button><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>For Kids</small></span></div></header><main class="content"><div class="section-head">${babi('encourage','small')}<div><p class="eyebrow">${p.name?`HI ${esc(p.name).toUpperCase()}!`:'ABACUS ADVENTURE'}</p><h1>Learn, one little step at a time 🌱</h1><p>Babi teaches one idea, then lets you try it.</p></div></div><div class="learning-groups">${groups.map(g=>`<section class="learning-group"><div class="learning-group-head"><span class="learning-group-icon">${g.icon}</span><div><h2>${g.title}</h2><p>${g.sub}</p></div></div><div class="learning-lesson-list">${g.lessons.map(l=>`<button class="learning-lesson" data-learning-id="${l.id}"><b>${l.id}. ${l.title}</b><small>${l.note}</small></button>`).join('')}</div></section>`).join('')}</div><section class="learning-ready"><div>${babi('happy','small')}</div><h2>${READY.title}</h2><p>${READY.text}</p><button class="primary" id="learningReady">${READY.task} →</button></section></main><div class="footer">Powered by PromptStudioAI<br><small>promptstudioai.in</small></div></div>`;
  document.getElementById('learningBack').onclick=backToWorld;
  document.querySelectorAll('[data-learning-id]').forEach(b=>b.onclick=()=>openLesson(Number(b.dataset.learningId)));
  document.getElementById('learningReady').onclick=()=>{ location.hash='start-level-1'; location.reload(); };
}
function openLesson(id){
  activeLesson=allLessons.find(x=>x.id===id); if(!activeLesson) return;
  activeAbacus=createAbacus(); lessonLocked=false; addStyle();
  const hint=HINTS[activeLesson.id] || HINTS[1];
  const guide=activeLesson.id===1?`<section class="learning-guide" aria-label="First time abacus tutorial"><div class="learning-guide-head">${babi('encourage','small')}<div><h2>New to abacus? You’re in the right place. 🌱</h2><p>Babi will teach you from the beginning.</p></div></div><ol><li>An abacus is a counting tool.</li><li>Little beads = 1 each.</li><li>Move a little bead UP to the bar.</li></ol></section>`:'';
  app.innerHTML=`<div class="screen world-screen"><header class="topbar"><button class="icon-btn" id="learningLessonBack" aria-label="Back to Learn">←</button><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>Learn</small></span></div></header><main class="content"><div class="learning-lesson-card">${babi('happy','large')}<p class="eyebrow">LEARN · ${activeLesson.id}/5</p><h1>${activeLesson.title}</h1><p>${activeLesson.text}</p>${guide}<div class="learning-target"><small>Babi wants you to make</small><strong>${activeLesson.target}</strong></div><p class="learning-note">${activeLesson.note}</p>${abacusHtml(activeAbacus)}<div class="learning-current">Your number: <b id="learningCurrent">0</b></div><button type="button" class="learning-hint" id="learningHint" aria-expanded="false">💡 Babi Hint</button><div class="learning-hint-panel" id="learningHintPanel"><strong>${hint.title}</strong>${hint.steps.map((x,i)=>`<p>${i+1}. ${x}</p>`).join('')}</div><div id="learningStatus" class="learning-status" role="status" aria-live="polite"></div><button class="primary learning-check" id="learningCheck">Check my answer ✓</button></div></main></div>`;
  document.getElementById('learningLessonBack').onclick=renderHub;
  const hintButton=document.getElementById('learningHint'); const hintPanel=document.getElementById('learningHintPanel');
  hintButton.onclick=()=>{ const show=!hintPanel.classList.contains('show'); hintPanel.classList.toggle('show',show); hintButton.setAttribute('aria-expanded',String(show)); if(show){ speak(activeLesson.id===1?'An abacus is a counting tool. Move the little beads up to the bar.':'Babi has a hint for you.'); if(activeLesson.id===1) app.querySelector('.learning-abacus')?.classList.add('guide-pulse'); } };
  bindLesson();
}
function bindLesson(){
  const current=document.getElementById('learningCurrent'); const status=document.getElementById('learningStatus'); const check=document.getElementById('learningCheck');
  const draw=()=>{
    const host=app.querySelector('.learning-abacus'); if(!host) return;
    host.outerHTML=abacusHtml(activeAbacus);
    const h=app.querySelector('.learning-abacus'); current.textContent=String(valueOf(activeAbacus));
    h.querySelectorAll('[data-learning-upper]').forEach(b=>b.onclick=()=>{if(lessonLocked)return; const r=Number(b.dataset.learningUpper); activeAbacus.rods[r].upper=!activeAbacus.rods[r].upper; draw();});
    h.querySelectorAll('[data-learning-lower]').forEach(b=>b.onclick=()=>{if(lessonLocked)return; const r=Number(b.dataset.learningLower), i=Number(b.dataset.index), c=activeAbacus.rods[r].lower; activeAbacus.rods[r].lower=i<c?i:Math.min(4,i+1); draw();});
  };
  draw();
  check.onclick=()=>{
    if(lessonLocked) return;
    const actual=valueOf(activeAbacus);
    if(actual!==activeLesson.target){ status.className='learning-status bad'; status.textContent=`Not yet — you made ${actual}. Try the beads again! 💛`; window.abacusSound?.wrong?.(); return; }
    lessonLocked=true; check.disabled=true; check.textContent='Awesome! 🎉'; check.classList.add('learning-next'); status.className='learning-status ok';
    const praise=sayCorrect(); status.textContent=`${praise} Babi is cheering for you!`;
    window.BabiCelebration?.success?.(`${praise} 👏`,`learn:${activeLesson.id}:${actual}`);
    window.abacusSound?.correct?.();
    setTimeout(()=>{
      const nextId=activeLesson.id+1;
      if(nextId<=5){ openLesson(nextId); }
      else { renderHub(); }
    },3200);
  };
}
function wireWorld(){
  const learn=document.getElementById('learn'); if(!learn || learn===wiredLearn) return;
  wiredLearn=learn;
  learn.onclick=(e)=>{e.preventDefault(); openHub();};
  if(location.hash==='#start-level-1') setTimeout(()=>{ const practice=document.getElementById('practice'); location.hash=''; practice?.click(); },120);
}
const observer=new MutationObserver(wireWorld); observer.observe(app,{childList:true,subtree:true});
setTimeout(wireWorld,0);
addStyle();
