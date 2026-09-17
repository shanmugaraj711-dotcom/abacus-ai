/* Learn progression controller.
   One correct Check completes the current lesson and unlocks Next.
   It deliberately reads the real lesson value instead of parsing feedback copy.
   challengeApp remains the source of numeric truth and navigation.
*/
(function(){
  const app=document.getElementById('app');
  if(!app)return;

  const numberFromTask=card=>{
    const task=card?.querySelector('strong');
    const m=task?.textContent?.match(/(?:build|make|show)\s+(\d+)/i);
    return m?Number(m[1]):null;
  };

  const sync=card=>{
    if(!card)return;
    const check=card.querySelector('#lessonCheck');
    const next=card.querySelector('#lessonGo');
    const valueNode=card.querySelector('#lessonValue');
    if(!check||!next||!valueNode)return;
    const target=numberFromTask(card);
    const value=Number(valueNode.textContent)||0;
    if(Number.isFinite(target)&&value===target){
      next.disabled=false;
      next.dataset.lessonComplete='1';
    }
  };

  let lastCard=null;
  const scan=()=>{
    const card=app.querySelector('.lesson-card');
    if(card!==lastCard){lastCard=card;if(card)sync(card)}
  };

  app.addEventListener('click',event=>{
    const check=event.target.closest?.('#lessonCheck');
    if(!check)return;
    const card=check.closest('.lesson-card');
    setTimeout(()=>sync(card),0);
  },true);

  new MutationObserver(()=>scan()).observe(app,{childList:true,subtree:true,characterData:true});
  scan();
})();
