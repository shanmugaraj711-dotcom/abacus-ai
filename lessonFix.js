// Child-first lesson + Babi Buddy enhancement.
// Core math/UI remains deterministic; Babi is a playful guide, not a dependency.
import {createAbacus,valueOf} from './abacusEngine.js';

const TARGETS={1:3,2:3,3:5,4:8,5:4};
const moods=['Hi! Tap me! 🌟','Beep-beep! Let’s move some beads! 🧮','Yaaaay! Great team! 🎉','I’m watching the beads. You’ve got this! 💛'];
let moodIndex=0;

const style=document.createElement('style');
style.textContent=`
.babi{cursor:pointer;touch-action:manipulation;transition:transform .18s ease}
.babi.babi-buddy-dance{animation:babiBuddyDance .78s ease}
@keyframes babiBuddyDance{0%,100%{transform:translateY(0) rotate(0)}20%{transform:translateY(-12px) rotate(-6deg)}40%{transform:translateY(0) rotate(6deg)}60%{transform:translateY(-8px) rotate(-4deg)}80%{transform:translateY(0) rotate(3deg)}}
.babi-demo-backdrop{position:fixed;inset:0;z-index:3000;background:rgba(45,27,16,.55);display:grid;place-items:center;padding:18px}
.babi-demo{width:min(560px,94vw);max-height:88vh;overflow:auto;background:#fffaf0;border:3px solid #d8b77e;border-radius:28px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.28);text-align:center;color:#4b2c18}
.babi-demo h2{margin:4px 0 8px;font-size:28px}.babi-demo p{margin:8px 0 14px;font-size:17px;line-height:1.4}
.babi-demo .demo-babi{width:96px;height:96px}.babi-demo .demo-number{font-size:46px;font-weight:900;margin:8px}
.babi-demo .demo-beads{position:relative;min-height:180px;margin:8px auto 14px;padding:18px;background:#402515;border-radius:20px;max-width:360px}
.babi-demo .demo-rod{position:relative;height:145px;width:70px;margin:auto;border-left:7px solid #c98b3c;border-right:7px solid #c98b3c;display:flex;flex-direction:column;align-items:center;gap:6px;padding-top:4px}
.babi-demo .demo-bead{width:43px;height:24px;border-radius:50%;background:#d89a45;border:3px solid #8a572b;box-shadow:0 3px 5px rgba(0,0,0,.25);transition:transform .3s ease,opacity .3s ease}
.babi-demo .demo-bead.active{transform:translateY(39px)}.babi-demo .demo-bead.upper{margin-bottom:26px}.babi-demo .demo-bead.upper.active{transform:translateY(28px)}
.babi-demo .demo-caption{font-weight:800;font-size:16px;background:#f3dfb5;border-radius:14px;padding:10px}
.babi-demo button{border:0;border-radius:16px;padding:13px 20px;font-size:17px;font-weight:900;background:#c98732;color:white;box-shadow:0 4px 0 #74441e;min-width:140px}
.lesson-target{background:#f3dfb5;border-radius:16px;padding:10px;margin:10px 0;text-align:center}.lesson-target small{display:block}.lesson-target strong{font-size:42px}
`;
document.head.appendChild(style);

function showToast(text){
  document.querySelector('.babi-toast')?.remove();
  const t=document.createElement('div');t.className='babi-toast';t.textContent=text;
  Object.assign(t.style,{position:'fixed',left:'50%',bottom:'78px',transform:'translateX(-50%)',zIndex:3500,maxWidth:'88vw',padding:'12px 16px',borderRadius:'16px',background:'#fff8e8',border:'2px solid #d7b577',color:'#4b2c18',fontWeight:'800',textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,.2)'});
  document.body.appendChild(t);setTimeout(()=>t.remove(),2200);
}

function attachBabi(){
  document.querySelectorAll('.babi:not([data-babi-wired])').forEach(el=>{
    el.dataset.babiWired='1';
    el.addEventListener('click',e=>{
      e.preventDefault();e.stopPropagation();
      el.classList.remove('babi-buddy-dance');void el.offsetWidth;el.classList.add('babi-buddy-dance');
      showToast(moods[moodIndex++%moods.length]);
      window.abacusSound?.cheer?.();
    },{capture:true});
  });
}

function abacusHtml(a){
  return `<div class="lesson-abacus" aria-label="Interactive lesson abacus"><div class="abacus-wrap"><div class="abacus"><div class="abacus-inner">${[0,1].map(r=>{const rod=a.rods[r];const lowers=[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<rod.lower?'active':''}" data-lesson-lower="${r}" data-index="${i}" aria-label="${r?'Tens':'Ones'} lower bead ${i+1}"></button>`).join('');return `<div class="rod-column"><span class="rod-label">${r?'TENS':'ONES'}</span><div class="upper-zone"><button type="button" class="bead upper ${rod.upper?'active':''}" data-lesson-upper="${r}" aria-label="${r?'Tens':'Ones'} upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${lowers}</div></div>`}).join('')}</div></div></div></div>`;
}

function demo(){
  const card=document.querySelector('.lesson-card');
  const targetText=card?.querySelector('.lesson-target strong')?.textContent?.trim()||card?.querySelector('.mini-number')?.textContent?.trim()||document.querySelector('.answer-card strong')?.textContent?.trim()||'3';
  const problem=document.querySelector('.problem')?.textContent||'';const m=problem.match(/(\d+)\s*([+−-])\s*(\d+)/);
  let n=Number(targetText)||3,caption=`Watch Babi build ${n}.`;
  if(m){n=m[2]==='−'||m[2]==='-'?Math.max(0,Number(m[1])-Number(m[3])):Number(m[1])+Number(m[3]);caption=`Watch Babi: ${m[1]} ${m[2]} ${m[3]}.`}
  n=Math.max(0,Math.min(99,n));const ones=n%10,tens=Math.floor(n/10);
  const lower=count=>Array.from({length:4},(_,i)=>`<span class="demo-bead ${i<count?'active':''}"></span>`).join('');
  const rod=(label,d)=>`<div><div style="font-weight:900;margin-bottom:5px">${label}</div><div class="demo-rod"><span class="demo-bead upper ${d>=5?'active':''}"></span>${lower(d%5)}</div></div>`;
  const wrap=document.createElement('div');wrap.className='babi-demo-backdrop';
  wrap.innerHTML=`<div class="babi-demo" role="dialog" aria-modal="true" aria-label="Babi demonstration"><svg class="demo-babi babi babi-happy" viewBox="0 0 160 160" aria-label="Babi"><use href="./assets/mascot/babi.svg#happy"></use></svg><h2>Watch Babi 👀</h2><p>${caption}</p><div class="demo-beads" style="display:flex;justify-content:space-around;gap:18px">${rod('TENS',tens)}${rod('ONES',ones)}</div><div class="demo-number">${n}</div><div class="demo-caption">${n>=5?'Big bead = 5. Small beads = 1 each.':'Each small bead = 1.'}</div><br><button type="button" id="closeBabiDemo">Got it! →</button></div>`;
  document.body.appendChild(wrap);wrap.querySelector('#closeBabiDemo').onclick=()=>wrap.remove();wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
}

function wireHint(){
  document.querySelectorAll('#hint,[data-babi-hint]').forEach(btn=>{
    if(btn.dataset.babiHintWired==='1')return;btn.dataset.babiHintWired='1';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();demo()},{capture:true});
  });
  const card=document.querySelector('.lesson-card');
  if(card&&!document.querySelector('#lessonBabiHint')){
    const b=document.createElement('button');b.id='lessonBabiHint';b.className='secondary';b.type='button';b.textContent='🤖 Let Babi show me';
    const primary=card.querySelector('#lessonGo');if(primary)primary.before(b);else card.appendChild(b);b.onclick=demo;
  }
}

function enhance(){
  const card=document.querySelector('.lesson-card');const eyebrow=card?.querySelector('.eyebrow')?.textContent||'';const match=eyebrow.match(/·\s*(\d+)\/6/);
  if(!card||!match)return;const step=Number(match[1]);if(step>=6)return;const target=TARGETS[step];if(!target)return;
  const key=`${step}:${card.textContent.slice(0,80)}`;if(card.dataset.lessonEnhanced===key){attachBabi();wireHint();return}card.dataset.lessonEnhanced=key;
  const old=card.querySelector('.mini-number');if(!old)return;
  old.outerHTML=`<div class="lesson-target"><small>Build this number</small><strong>${target}</strong></div><div id="lessonAbacusHost">${abacusHtml(createAbacus())}</div><div class="lesson-current">Your number: <b id="lessonCurrent">0</b></div>`;
  const a=createAbacus(),host=card.querySelector('#lessonAbacusHost'),current=card.querySelector('#lessonCurrent'),next=card.querySelector('#lessonGo');if(!host||!current||!next)return;
  next.disabled=true;next.textContent='Build it first →';
  const draw=()=>{host.innerHTML=abacusHtml(a);current.textContent=String(valueOf(a));const correct=valueOf(a)===target;next.disabled=!correct;next.textContent=correct?'I got it →':'Build it first →';host.querySelectorAll('[data-lesson-upper]').forEach(btn=>btn.onclick=()=>{const r=Number(btn.dataset.lessonUpper);a.rods[r].upper=!a.rods[r].upper;draw()});host.querySelectorAll('[data-lesson-lower]').forEach(btn=>btn.onclick=()=>{const r=Number(btn.dataset.lessonLower),i=Number(btn.dataset.index),count=a.rods[r].lower;a.rods[r].lower=i<count?i:Math.min(4,i+1);draw()})};
  draw();attachBabi();wireHint();
}

const observer=new MutationObserver(()=>{enhance();attachBabi();wireHint()});observer.observe(document.body,{childList:true,subtree:true});
enhance();attachBabi();wireHint();
