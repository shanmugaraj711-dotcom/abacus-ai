// Kid-first visual layer: lightweight, offline-safe, and applied after the app shell renders.
(function(){
  const STYLE=`
    .kid-audio{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:7px 11px;border-radius:999px;background:#fff;border:2px solid rgba(107,66,38,.16);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;box-shadow:0 3px 0 rgba(107,66,38,.14);touch-action:manipulation}
    .kid-audio:active{transform:scale(.96)}.kid-audio.speaking{box-shadow:0 0 0 4px rgba(255,177,55,.25),0 3px 0 rgba(107,66,38,.14)}
    .kid-page-hint{margin:0 auto 12px;width:min(620px,100%);display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:16px;background:rgba(255,255,255,.78);border:2px solid rgba(107,66,38,.09);color:#5d493b;font:800 13px/1.25 ui-rounded,system-ui,sans-serif}
    .kid-page-hint .dot{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#ffd166;font-size:18px;flex:none}
    .world-screen{background:linear-gradient(180deg,#fffdf7 0%,#f7f1ff 55%,#eef9ff 100%)}
    .world-screen.kid-home{background:linear-gradient(180deg,#e9fbff,#fff8e9 48%,#f1ffe9)}
    .world-screen.kid-learn{background:linear-gradient(180deg,#effff1,#fffdf1 55%,#e9f8ff)}
    .world-screen.kid-play{background:linear-gradient(180deg,#f7efff,#fff7ea 58%,#eaf7ff)}
    .world-screen.kid-levels{background:linear-gradient(180deg,#fff7db,#fffaf1 52%,#eaf8ff)}
    .world-screen.kid-practice{background:linear-gradient(180deg,#eaf7ff,#fffdf4 52%,#eefbea)}
    .world-screen.kid-result{background:linear-gradient(180deg,#fff0f5,#fffbe8 55%,#eafaff)}
    .world-screen.kid-levelup{background:linear-gradient(180deg,#fff0bd,#fff7e7 50%,#f1eaff)}
    .world-screen.kid-locked{background:linear-gradient(180deg,#eef1f7,#fffaf0 55%,#f2ecff)}
    .world-screen.kid-settings{background:linear-gradient(180deg,#eefcff,#fffdf5 55%,#efffea)}
    .world-screen.kid-parent{background:linear-gradient(180deg,#fff5eb,#fffdf8 55%,#edf8ff)}
    .world-screen.kid-assessment{background:linear-gradient(180deg,#edf9ff,#fffbe9 55%,#f2edff)}
    .world-screen.kid-brain{background:linear-gradient(180deg,#f0edff,#fff9e9 55%,#eafff3)}
    .kid-home .journey-card{min-height:145px;border:3px solid rgba(255,255,255,.42);position:relative;overflow:hidden}
    .kid-home .journey-card:after{content:'✦';position:absolute;right:12px;top:9px;font-size:22px;opacity:.65;animation:kidTwinkle 1.8s ease-in-out infinite}
    .kid-learn .lesson-list button{background:linear-gradient(135deg,#fff,#f3fff0);border-color:#b8dfb1;min-height:70px;transition:transform .15s ease}
    .kid-learn .lesson-list button:nth-child(2n){background:linear-gradient(135deg,#fff,#eef8ff);border-color:#b9dced}
    .kid-learn .lesson-list button:active,.kid-home .journey-card:active{transform:scale(.98)}
    .kid-play .game-grid button:nth-child(1){background:#fff5d9;border-color:#f2cf7a}.kid-play .game-grid button:nth-child(2){background:#eaf8ff;border-color:#a9d8ef}.kid-play .game-grid button:nth-child(3){background:#f4eaff;border-color:#cdb0eb}.kid-play .game-grid button:nth-child(4){background:#ecffe9;border-color:#b8dfaa}
    .kid-levels .world-level:not(.locked):nth-child(3n+1){background:linear-gradient(145deg,#54a85e,#277443)}.kid-levels .world-level:not(.locked):nth-child(3n+2){background:linear-gradient(145deg,#e69b31,#b96a18)}.kid-levels .world-level:not(.locked):nth-child(3n){background:linear-gradient(145deg,#8060c6,#5d3d99)}
    .kid-practice .problem{letter-spacing:1px;text-shadow:0 3px 0 rgba(255,255,255,.8)}.kid-practice .abacus-wrap{filter:drop-shadow(0 8px 12px rgba(57,90,110,.12))}
    .kid-result .result-problem{background:#fff;border-color:#f2b8c9}.kid-result .result-title{font-size:42px}
    .kid-levelup .levelup-title{text-shadow:0 3px 0 #fff}.kid-levelup .levelup-card{background:linear-gradient(135deg,#fff3bd,#f0e5ff);border:2px solid #e3bd55}
    .kid-page-stickers{display:flex;justify-content:center;gap:8px;margin:8px 0 2px;font-size:22px}.kid-page-stickers span{animation:kidFloat 2.4s ease-in-out infinite}.kid-page-stickers span:nth-child(2){animation-delay:.2s}.kid-page-stickers span:nth-child(3){animation-delay:.4s}.kid-page-stickers span:nth-child(4){animation-delay:.6s}
    @keyframes kidFloat{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-5px) rotate(3deg)}}@keyframes kidTwinkle{0%,100%{transform:scale(.8) rotate(0)}50%{transform:scale(1.15) rotate(18deg)}}
    @media(max-width:520px){.kid-audio{min-height:38px;padding:6px 9px;font-size:12px}.kid-page-hint{font-size:12px}.kid-home .journey-card{min-height:128px}}
  `;
  function theme(screen){
    const text=(screen.innerText||'').toLowerCase();
    const c=[['kid-levelup',text.includes('level up')||!!screen.querySelector('.levelup-title')],['kid-result',!!screen.querySelector('.result-title')],['kid-practice',!!screen.querySelector('.practice-meta')||!!screen.querySelector('.problem')],['kid-learn',text.includes('abacus adventure')||!!screen.querySelector('.lesson-list')],['kid-play',text.includes('playroom')||!!screen.querySelector('.game-grid')],['kid-levels',text.includes('master path')||!!screen.querySelector('.world-levels')],['kid-locked',!!screen.querySelector('.wall-card')],['kid-settings',!!screen.querySelector('.settings-card')],['kid-parent',!!screen.querySelector('.parent-card')],['kid-assessment',!!screen.querySelector('.assessment')],['kid-brain',!!screen.querySelector('.brain-card')]];
    c.forEach(([k,on])=>screen.classList.toggle(k,on));
    if(!c.some(x=>x[1]))screen.classList.add('kid-home');
  }
  function audio(screen){
    const actions=screen.querySelector('.top-actions');
    if(!actions||actions.querySelector('.kid-audio'))return;
    const b=document.createElement('button');b.className='kid-audio';b.type='button';b.innerHTML='🔊 <span>Babi</span>';b.setAttribute('aria-label','Tap Babi to hear this page');
    b.onclick=()=>{const v=window.BabiVoice;if(!v?.context)return;const [en,ta]=v.context();b.classList.add('speaking');v.say(en,ta);setTimeout(()=>b.classList.remove('speaking'),4200)};
    actions.prepend(b);
  }
  function decorate(){
    const screen=document.querySelector('.world-screen');if(!screen)return;
    theme(screen);audio(screen);
    if(!screen.querySelector('.kid-page-stickers')){
      const main=screen.querySelector('.content');
      if(main){const s=document.createElement('div');s.className='kid-page-stickers';s.innerHTML='<span>⭐</span><span>🌈</span><span>🧮</span><span>💛</span>';main.prepend(s)}
    }
  }
  function inject(){
    if(!document.getElementById('kid-ui-style')){const s=document.createElement('style');s.id='kid-ui-style';s.textContent=STYLE;document.head.appendChild(s)}
    decorate();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
