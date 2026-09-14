// Step-by-step Babi teacher hints. Uses the actual problem from practice or result screens.
function hintSteps(){
  const raw=document.querySelector('.problem')?.textContent||document.querySelector('.result-problem')?.textContent||'';
  const m=raw.match(/(\d+)\s*([+−-])\s*(\d+)/);
  if(!m){
    window.BabiVoice?.hint?.();
    return;
  }
  const a=Number(m[1]),op=m[2],b=Number(m[3]),answer=op==='−'||op==='-'?Math.max(0,a-b):a+b;
  const steps=op==='−'||op==='-'
    ? [`First, make ${a} →`,`Now take away ${b} →`,`Count what's left! 🎉`]
    : [`First, make ${a} →`,`Now add ${b} more →`,`Count them all! 🎉`];
  let index=0;
  const wrap=document.createElement('div');wrap.className='babi-steps-backdrop';
  wrap.innerHTML=`<div class="babi-steps" role="dialog" aria-modal="true" aria-label="Babi step hint"><div class="step-babi">🐻</div><p class="eyebrow">BABI HINT · <span id="stepNo">1</span>/3</p><h2 id="stepText">${steps[0]}</h2><p class="step-answer">${a} ${op} ${b} = ?</p><button type="button" id="stepNext">Show me →</button></div>`;
  document.body.appendChild(wrap);
  const text=wrap.querySelector('#stepText'),no=wrap.querySelector('#stepNo'),next=wrap.querySelector('#stepNext');
  next.onclick=()=>{index++;if(index>=steps.length){text.textContent=`Answer: ${answer} 🎉`;no.textContent='✓';next.textContent='Done!';next.onclick=()=>wrap.remove();window.abacusSound?.cheer?.();return}no.textContent=String(index+1);text.textContent=steps[index];if(index===steps.length-1)next.textContent='Show answer →'};
  wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
}
const style=document.createElement('style');style.textContent=`.babi-steps-backdrop{position:fixed;inset:0;z-index:3100;background:rgba(45,27,16,.56);display:grid;place-items:center;padding:18px}.babi-steps{width:min(430px,92vw);background:#fffaf0;border:3px solid #d8b77e;border-radius:26px;padding:24px;text-align:center;color:#4b2c18;box-shadow:0 18px 60px rgba(0,0,0,.3)}.step-babi{font-size:54px}.babi-steps h2{font-size:25px;line-height:1.25;min-height:64px}.step-answer{font-size:18px;background:#f3dfb5;padding:10px;border-radius:14px}.babi-steps button{border:0;border-radius:16px;padding:14px 22px;background:#c98732;color:#fff;font-weight:900;font-size:17px;box-shadow:0 4px 0 #74441e}`;document.head.appendChild(style);
document.addEventListener('click',e=>{const btn=e.target.closest('#hint,[data-babi-hint]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();hintSteps()},{capture:true});
