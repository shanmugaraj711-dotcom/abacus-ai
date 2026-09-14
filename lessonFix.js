// Clean lesson controller: one owner for lesson interactions.
// It enhances only the active lesson screen and never watches/rewrites the whole app.
import { createAbacus, valueOf } from './abacusEngine.js';

const TARGETS = {1:3, 2:3, 3:5, 4:8, 5:4};
let lastCard = null;

const style = document.createElement('style');
style.textContent = `
.lesson-target{background:#f3dfb5;border-radius:16px;padding:10px;margin:10px 0;text-align:center}
.lesson-target small{display:block}.lesson-target strong{font-size:42px}
.lesson-target-note{font-weight:800;text-align:center;margin:-3px 0 10px}
.lesson-abacus{margin:10px 0}.lesson-current{text-align:center;font-size:18px;font-weight:800;margin:10px 0}
.lesson-status{min-height:26px;text-align:center;font-weight:900;margin:6px 0}
.lesson-status.ok{color:#176b2c}.lesson-status.bad{color:#9b4d26}
.lesson-go-ready{box-shadow:0 0 0 3px rgba(80,170,80,.16)}
`;
document.head.appendChild(style);

function abacusHtml(a){
  return `<div class="lesson-abacus" aria-label="Interactive lesson abacus"><div class="abacus-wrap"><div class="abacus"><div class="abacus-inner">${[0,1].map(r=>{
    const rod=a.rods[r];
    const lowers=[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<rod.lower?'active':''}" data-lesson-lower="${r}" data-index="${i}" aria-label="${r?'Tens':'Ones'} lower bead ${i+1}"></button>`).join('');
    return `<div class="rod-column"><span class="rod-label">${r?'TENS':'ONES'}</span><div class="upper-zone"><button type="button" class="bead upper ${rod.upper?'active':''}" data-lesson-upper="${r}" aria-label="${r?'Tens':'Ones'} upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${lowers}</div></div>`;
  }).join('')}</div></div></div></div>`;
}

function enhance(){
  const card=document.querySelector('.lesson-card');
  if(!card || card===lastCard) return;
  const match=(card.querySelector('.eyebrow')?.textContent||'').match(/·\s*(\d+)\/6/);
  if(!match) return;
  const step=Number(match[1]);
  if(step>=6 || !TARGETS[step]) return;
  const target=TARGETS[step];
  const old=card.querySelector('.mini-number');
  if(!old) return;
  lastCard=card;

  old.outerHTML=`<div class="lesson-target"><small>🎯 Babi wants you to make</small><strong>${target}</strong></div><div class="lesson-target-note">Move the beads, then check your answer.</div><div id="lessonAbacusHost">${abacusHtml(createAbacus())}</div><div class="lesson-current">Your number: <b id="lessonCurrent">0</b></div><div id="lessonStatus" class="lesson-status" role="status" aria-live="polite"></div>`;

  const a=createAbacus();
  const host=card.querySelector('#lessonAbacusHost');
  const current=card.querySelector('#lessonCurrent');
  const status=card.querySelector('#lessonStatus');
  const next=card.querySelector('#lessonGo');
  if(!host||!current||!status||!next) return;

  next.disabled=false;
  next.removeAttribute('aria-disabled');
  next.classList.add('lesson-go-ready');
  next.textContent='Check my answer ✓';

  const draw=()=>{
    host.innerHTML=abacusHtml(a);
    current.textContent=String(valueOf(a));
    host.querySelectorAll('[data-lesson-upper]').forEach(btn=>btn.addEventListener('click',()=>{
      const r=Number(btn.dataset.lessonUpper); a.rods[r].upper=!a.rods[r].upper; draw();
    }));
    host.querySelectorAll('[data-lesson-lower]').forEach(btn=>btn.addEventListener('click',()=>{
      const r=Number(btn.dataset.lessonLower), i=Number(btn.dataset.index), count=a.rods[r].lower;
      a.rods[r].lower=i<count?i:Math.min(4,i+1); draw();
    }));
  };
  draw();

  // This screen owns the submit/check action. No second script should rewrite it.
  next.onclick=(e)=>{
    e.preventDefault();
    e.stopImmediatePropagation();
    const actual=valueOf(a);
    if(actual!==target){
      status.className='lesson-status bad';
      status.textContent=`Not yet — you made ${actual}. Try the beads again! 💛`;
      window.abacusSound?.wrong?.();
      return;
    }
    status.className='lesson-status ok';
    status.textContent='Correct! 🎉 Babi is cheering for you!';
    window.abacusSound?.correct?.();
    setTimeout(()=>{
      document.querySelector('#back')?.click();
      setTimeout(()=>document.querySelector(`[data-lesson="${step}"]`)?.click(),80);
    },450);
  };
}

function reset(){lastCard=null;requestAnimationFrame(enhance)}
const app=document.querySelector('#app');
if(app)new MutationObserver(()=>reset()).observe(app,{childList:true});
enhance();
window.LessonController={scan:enhance};
