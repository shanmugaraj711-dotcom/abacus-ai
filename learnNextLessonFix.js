/* Learn progression: authoritative UI sync adapter. Core challengeApp remains owner. */
(function(){
  const app=document.getElementById('app'); if(!app)return;
  const targetOf=card=>{const s=card?.querySelector('.lesson-card > strong');const m=s?.textContent?.match(/(?:build|make|show)\s+(\d+)/i);return m?Number(m[1]):null};
  const sync=card=>{if(!card)return;const next=card.querySelector('#lessonGo'),value=card.querySelector('#lessonValue');if(!next||!value)return;const t=targetOf(card),v=Number(value.textContent)||0;if(Number.isFinite(t)&&v===t){next.disabled=false;next.dataset.lessonComplete='1'}};
  const scan=()=>sync(app.querySelector('.lesson-card'));
  app.addEventListener('click',e=>{if(e.target.closest?.('#lessonCheck'))setTimeout(scan,0)},true);
  new MutationObserver(scan).observe(app,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled']});
  scan();
})();
