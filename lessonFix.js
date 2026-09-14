// Interactive lesson guard: the lesson copy promises bead interaction,
// so the first five lessons must visibly contain a working abacus.
import {createAbacus,valueOf} from './abacusEngine.js';

const TARGETS={1:3,2:3,3:5,4:8,5:4};
let lastKey='';

function abacusHtml(a){
  return `<div class="lesson-abacus" aria-label="Interactive lesson abacus"><div class="abacus-wrap"><div class="abacus"><div class="abacus-inner">${[0,1].map(r=>{const rod=a.rods[r];const lowers=[0,1,2,3].map(i=>`<button type="button" class="bead lower ${i<rod.lower?'active':''}" data-lesson-lower="${r}" data-index="${i}" aria-label="${r?'Tens':'Ones'} lower bead ${i+1}"></button>`).join('');return `<div class="rod-column"><span class="rod-label">${r?'TENS':'ONES'}</span><div class="upper-zone"><button type="button" class="bead upper ${rod.upper?'active':''}" data-lesson-upper="${r}" aria-label="${r?'Tens':'Ones'} upper bead worth five"></button></div><div class="beam"></div><div class="lower-zone">${lowers}</div></div>`}).join('')}</div></div></div></div>`;
}

function enhance(){
  const card=document.querySelector('.lesson-card');
  const eyebrow=card?.querySelector('.eyebrow')?.textContent||'';
  const match=eyebrow.match(/·\s*(\d+)\/6/);
  if(!card||!match)return;
  const step=Number(match[1]);
  if(step>=6)return;
  const target=TARGETS[step];
  if(!target)return;
  const key=`${step}:${card.textContent.slice(0,80)}`;
  if(card.dataset.lessonEnhanced===key)return;
  card.dataset.lessonEnhanced=key;

  const old=card.querySelector('.mini-number');
  if(old)old.outerHTML=`<div class="lesson-target"><small>Build this number</small><strong>${target}</strong></div><div id="lessonAbacusHost">${abacusHtml(createAbacus())}</div><div class="lesson-current">Your number: <b id="lessonCurrent">0</b></div>`;
  else return;

  const a=createAbacus();
  const host=card.querySelector('#lessonAbacusHost');
  const current=card.querySelector('#lessonCurrent');
  const next=card.querySelector('#lessonGo');
  if(!host||!current||!next)return;

  next.disabled=true;
  next.textContent='Build it first →';

  const draw=()=>{
    host.innerHTML=abacusHtml(a);
    current.textContent=String(valueOf(a));
    const correct=valueOf(a)===target;
    next.disabled=!correct;
    next.textContent=correct?'I got it →':'Build it first →';
    host.querySelectorAll('[data-lesson-upper]').forEach(btn=>btn.onclick=()=>{
      const r=Number(btn.dataset.lessonUpper);
      a.rods[r].upper=!a.rods[r].upper;
      draw();
    });
    host.querySelectorAll('[data-lesson-lower]').forEach(btn=>btn.onclick=()=>{
      const r=Number(btn.dataset.lessonLower),i=Number(btn.dataset.index),count=a.rods[r].lower;
      a.rods[r].lower=i<count?i:Math.min(4,i+1);
      draw();
    });
  };
  draw();
}

const observer=new MutationObserver(enhance);
observer.observe(document.body,{childList:true,subtree:true});
enhance();
