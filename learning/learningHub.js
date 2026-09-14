import { createAbacus, valueOf } from '../abacusEngine.js';
import { FOUNDATION } from './01-foundation.js';
import { FIVE_BEAD } from './02-five-bead.js';
import { NUMBER_BUILDING } from './03-number-building.js';
import { READY } from './04-ready.js';

const app = document.querySelector('#app');
const PROFILE_KEY = 'abacus-ai-profile-v2';
const groups = [
  { id: 'foundation', title: '1. Abacus Basics', sub: 'Meet the rods, lower beads and numbers 1–4.', icon: '🌱', lessons: FOUNDATION },
  { id: 'five', title: '2. The 5 Bead', sub: 'Meet the special upper bead.', icon: '🖐️', lessons: FIVE_BEAD },
  { id: 'numbers', title: '3. Build Bigger Numbers', sub: 'Use 5 + lower beads to make 6–9.', icon: '🧮', lessons: NUMBER_BUILDING }
];
const allLessons = [...FOUNDATION, ...FIVE_BEAD, ...NUMBER_BUILDING];
let wiredWorld = false;
let activeLesson = null;
let activeAbacus = null;
let lessonLocked = false;

function profile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; } catch { return {}; } }
function esc(v){ return String(v ?? '').replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c])); }
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
  app.innerHTML=`<div class="screen world-screen"><header class="topbar"><button class="icon-btn" id="learningLessonBack" aria-label="Back to Learn">←</button><div class="brand"><span class="brand-mark">🧮</span><span><strong>Abacus AI</strong><small>Learn</small></span></div></header><main class="content"><div class="learning-lesson-card">${babi('happy','large')}<p class="eyebrow">LEARN · ${activeLesson.id}/5</p><h1>${activeLesson.title}</h1><p>${activeLesson.text}</p><strong>🎯 ${activeLesson.task}</strong><div class="learning-target"><small>Babi wants you to make</small><strong>${activeLesson.target}</strong></div><p class="learning-note">${activeLesson.note}</p>${abacusHtml(activeAbacus)}<div class="learning-current">Your number: <b id="learningCurrent">0</b></div><div id="learningStatus" class="learning-status" role="status" aria-live="polite"></div><button class="primary learning-check" id="learningCheck">Check my answer ✓</button></div></main></div>`;
  document.getElementById('learningLessonBack').onclick=renderHub;
  bindLesson();
}
function bindLesson(){
  const host=app.querySelector('.learning-abacus'); const current=document.getElementById('learningCurrent'); const status=document.getElementById('learningStatus'); const check=document.getElementById('learningCheck');
  const draw=()=>{
    host.outerHTML=abacusHtml(activeAbacus); const h=app.querySelector('.learning-abacus'); current.textContent=String(valueOf(activeAbacus));
    h.querySelectorAll('[data-learning-upper]').forEach(b=>b.onclick=()=>{if(lessonLocked)return; const r=Number(b.dataset.learningUpper); activeAbacus.rods[r].upper=!activeAbacus.rods[r].upper; draw();});
    h.querySelectorAll('[data-learning-lower]').forEach(b=>b.onclick=()=>{if(lessonLocked)return; const r=Number(b.dataset.learningLower), i=Number(b.dataset.index), c=activeAbacus.rods[r].lower; activeAbacus.rods[r].lower=i<c?i:Math.min(4,i+1); draw();});
  };
  draw();
  check.onclick=()=>{
    if(lessonLocked) return;
    const actual=valueOf(activeAbacus);
    if(actual!==activeLesson.target){ status.className='learning-status bad'; status.textContent=`Not yet — you made ${actual}. Try the beads again! 💛`; window.abacusSound?.wrong?.(); return; }
    lessonLocked=true; check.disabled=true; check.textContent='Awesome! 🎉'; check.classList.add('learning-next'); status.className='learning-status ok'; status.textContent=`${sayCorrect()} Babi is cheering for you!`; window.abacusSound?.correct?.();
    // Kids need a moment to see the win before the next lesson appears.
    setTimeout(()=>{
      const nextId=activeLesson.id+1;
      if(nextId<=5){ openLesson(nextId); }
      else { renderHub(); }
    },1400);
  };
}
function wireWorld(){
  const learn=document.getElementById('learn'); if(!learn || wiredWorld) return;
  wiredWorld=true; learn.onclick=(e)=>{e.preventDefault(); openHub();};
  if(location.hash==='#start-level-1') setTimeout(()=>{ const practice=document.getElementById('practice'); location.hash=''; practice?.click(); },120);
}
const observer=new MutationObserver(wireWorld); observer.observe(app,{childList:true,subtree:true});
setTimeout(wireWorld,0);
addStyle();
