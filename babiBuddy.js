/* Babi Buddy: original, lightweight child interaction + deterministic demonstrations.
   Tiny AI can later consume the same events/context; it must never be required for core UI correctness. */
(() => {
  const DEMO_STYLE = `
    .babi{cursor:pointer;transition:transform .18s ease;touch-action:manipulation}
    .babi.babi-bounce{animation:babiBuddyBounce .72s ease}
    @keyframes babiBuddyBounce{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-14px) rotate(-5deg)}50%{transform:translateY(0) rotate(5deg)}75%{transform:translateY(-7px) rotate(-2deg)}}
    .babi-demo-backdrop{position:fixed;inset:0;z-index:3000;background:rgba(45,27,16,.55);display:grid;place-items:center;padding:18px;animation:babiFade .18s ease}
    .babi-demo{width:min(560px,94vw);max-height:88vh;overflow:auto;background:#fffaf0;border:3px solid #d8b77e;border-radius:28px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.28);text-align:center;color:#4b2c18}
    .babi-demo h2{margin:4px 0 8px;font-size:28px}.babi-demo p{margin:8px 0 14px;font-size:17px;line-height:1.4}
    .babi-demo .demo-babi{width:100px;height:100px}.babi-demo .demo-number{font-size:46px;font-weight:900;margin:8px}
    .babi-demo .demo-beads{position:relative;min-height:190px;margin:8px auto 14px;padding:18px;background:#402515;border-radius:20px;max-width:360px}
    .babi-demo .demo-rod{position:relative;height:150px;width:80px;margin:auto;border-left:7px solid #c98b3c;border-right:7px solid #c98b3c;display:flex;flex-direction:column;align-items:center;gap:7px;padding-top:4px}
    .babi-demo .demo-bead{width:46px;height:25px;border-radius:50%;background:#d89a45;border:3px solid #8a572b;box-shadow:0 3px 5px rgba(0,0,0,.25);transition:transform .3s ease,opacity .3s ease}
    .babi-demo .demo-bead.active{transform:translateY(42px)}
    .babi-demo .demo-bead.upper{margin-bottom:28px}.babi-demo .demo-bead.upper.active{transform:translateY(30px)}
    .babi-demo .demo-caption{font-weight:800;font-size:16px;background:#f3dfb5;border-radius:14px;padding:10px}
    .babi-demo button{border:0;border-radius:16px;padding:13px 20px;font-size:17px;font-weight:900;background:#c98732;color:white;box-shadow:0 4px 0 #74441e;min-width:140px}
    @keyframes babiFade{from{opacity:0}to{opacity:1}}
  `;
  const style=document.createElement('style');style.textContent=DEMO_STYLE;document.head.appendChild(style);

  const moods=[
    ['happy','Hi! Tap me when you need Babi. 🌟'],
    ['encourage','Beep-beep! Let’s move some beads! 🧮'],
    ['celebrate','Yaaaay! You and me make a great team! 🎉'],
    ['happy','I’m watching the beads. You’ve got this! 💛']
  ];
  let moodIndex=0;

  function attach(){
    document.querySelectorAll('.babi:not([data-babi-wired])').forEach(el=>{
      el.dataset.babiWired='1';
      el.addEventListener('click',e=>{
        e.preventDefault();e.stopPropagation();
        el.classList.remove('babi-bounce');void el.offsetWidth;el.classList.add('babi-bounce');
        const [,msg]=moods[moodIndex++%moods.length];
        if(window.abacusSound?.cheer)window.abacusSound.cheer();
        showToast(msg);
      },{capture:true});
    });
    document.querySelectorAll('#hint,[data-babi-hint]').forEach(btn=>{
      if(btn.dataset.babiHintWired==='1')return;
      btn.dataset.babiHintWired='1';
      btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();demoFromScreen();},{capture:true});
    });
    if(document.querySelector('.lesson-card')&&!document.querySelector('#lessonBabiHint')){
      const card=document.querySelector('.lesson-card');
      const b=document.createElement('button');b.id='lessonBabiHint';b.className='secondary';b.type='button';b.textContent='🤖 Let Babi show me';
      const primary=card.querySelector('#lessonGo');
      if(primary)primary.before(b);else card.appendChild(b);
      b.addEventListener('click',()=>demoFromScreen());
    }
  }

  function showToast(text){
    const old=document.querySelector('.babi-toast');old?.remove();
    const t=document.createElement('div');t.className='babi-toast';t.textContent=text;
    Object.assign(t.style,{position:'fixed',left:'50%',bottom:'78px',transform:'translateX(-50%)',zIndex:3500,maxWidth:'88vw',padding:'12px 16px',borderRadius:'16px',background:'#fff8e8',border:'2px solid #d7b577',color:'#4b2c18',fontWeight:'800',textAlign:'center',boxShadow:'0 8px 24px rgba(0,0,0,.2)'});
    document.body.appendChild(t);setTimeout(()=>t.remove(),2400);
  }

  function screenData(){
    const lesson=document.querySelector('.lesson-card');
    const target=lesson?.querySelector('.mini-number')?.textContent?.trim();
    const problem=document.querySelector('.problem')?.textContent||'';
    let a=null,b=null,op='';
    const m=problem.match(/(\d+)\s*([+−-])\s*(\d+)/);
    if(m){a=Number(m[1]);op=m[2];b=Number(m[3]);}
    if(Number.isFinite(a)&&Number.isFinite(b))return {target:op==='−'||op==='-'?Math.max(0,a-b):a+b,caption:`Watch: ${a} ${op} ${b}`};
    if(target!==undefined&&target!=='')return {target:Number(target),caption:`Babi will build ${target} for you.`};
    const answer=document.querySelector('.answer-card strong')?.textContent?.trim();
    if(answer&&/^\d+$/.test(answer))return {target:Number(answer),caption:`Here is the answer on the beads.`};
    return {target:3,caption:'Watch Babi make a simple number.'};
  }

  function demoFromScreen(){
    const {target,caption}=screenData();
    const n=Math.max(0,Math.min(99,Number(target)||0));
    const ones=n%10, tens=Math.floor(n/10);
    const lower=(count)=>Array.from({length:4},(_,i)=>`<span class="demo-bead ${i<count?'active':''}"></span>`).join('');
    const rod=(label,d)=>`<div><div style="font-weight:900;margin-bottom:5px">${label}</div><div class="demo-rod"><span class="demo-bead upper ${d>=5?'active':''}"></span>${lower(d%5)}</div></div>`;
    const wrap=document.createElement('div');wrap.className='babi-demo-backdrop';
    wrap.innerHTML=`<div class="babi-demo" role="dialog" aria-modal="true" aria-label="Babi demonstration"><svg class="demo-babi babi babi-happy" viewBox="0 0 160 160" aria-label="Babi"><use href="./assets/mascot/babi.svg#happy"></use></svg><h2>Watch Babi 👀</h2><p>${caption}</p><div class="demo-beads" style="display:flex;justify-content:space-around;gap:18px">${rod('TENS',tens)}${rod('ONES',ones)}</div><div class="demo-number">${n}</div><div class="demo-caption">${n>=5?'Big bead = 5. Small beads = 1 each.':'Each small bead = 1.'}</div><br><button type="button" id="closeBabiDemo">Got it! →</button></div>`;
    document.body.appendChild(wrap);
    wrap.querySelector('#closeBabiDemo').onclick=()=>wrap.remove();
    wrap.addEventListener('click',e=>{if(e.target===wrap)wrap.remove()});
  }

  new MutationObserver(attach).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
