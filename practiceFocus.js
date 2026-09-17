// Practice-first visual layer: make the bead challenge feel like the app's main attraction.
(function(){
  const STYLE=`
    .kid-practice .practice-magnet{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:10px 13px;border-radius:18px;background:linear-gradient(135deg,#fff7d8,#ffe4a9);border:3px solid #f0c46d;box-shadow:0 5px 0 rgba(107,66,38,.16)}
    .practice-magnet .pm-face{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:29px;box-shadow:inset 0 -3px 0 rgba(90,45,10,.12)}
    .practice-magnet b{display:block;color:#4b2c18;font-size:17px}.practice-magnet small{display:block;margin-top:2px;color:#72563f;font-weight:800}
    .kid-practice .problem{margin:8px 0 4px;padding:13px 8px;border-radius:22px;background:rgba(255,255,255,.78);border:3px solid rgba(255,255,255,.9);box-shadow:0 6px 18px rgba(57,90,110,.09)}
    .kid-practice .abacus-wrap{margin-top:8px}.kid-practice .answer-card{background:#fff9e9;border-color:#e4c477;transform:scale(1.03)}
    .kid-practice #check{min-width:220px;font-size:18px;border-radius:18px}.kid-practice #hint{border-radius:18px}
    .kid-practice .practice-meta{padding:6px 2px}.kid-practice .practice-meta span:first-child{background:#e8f7e9;border-radius:999px;padding:7px 10px}.kid-practice .practice-meta span:last-child{background:#fff1c8;border-radius:999px;padding:7px 10px}
    @media(max-width:520px){.practice-magnet{margin-bottom:7px!important}.practice-magnet .pm-face{width:43px;height:43px}.practice-magnet b{font-size:15px}.kid-practice .problem{font-size:clamp(50px,15vw,82px)}}
  `;
  function inject(){
    const screen=document.querySelector('.world-screen.kid-practice,.world-screen .practice-meta')?.closest('.world-screen')||document.querySelector('.world-screen');
    if(!screen||!screen.querySelector('.practice-meta'))return;
    screen.classList.add('kid-practice');
    if(!document.getElementById('practice-focus-style')){const s=document.createElement('style');s.id='practice-focus-style';s.textContent=STYLE;document.head.appendChild(s)}
    if(!screen.querySelector('.practice-magnet')){
      const meta=screen.querySelector('.practice-meta');
      const p=document.createElement('section');p.className='practice-magnet';p.innerHTML='<span class="pm-face">🐻</span><div><b>🎯 Your Bead Challenge</b><small>Build the answer with your hands. Babi is cheering!</small></div>';
      meta?.insertAdjacentElement('afterend',p);
    }
  }
  const afterRender=()=>queueMicrotask(inject);
  inject();
  document.addEventListener('click',afterRender,{passive:true});
})();
