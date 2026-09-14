// Tiny AI — deterministic, child-safe abacus teaching brain.
// It does NOT invent math. Abacus calculations remain owned by abacusEngine.js.
(function(){
  const PROFILE_KEY='abacus-ai-profile-v2';
  const PROGRESS_KEY='abacus-ai-progress-v2';
  const clean=s=>String(s||'').toLowerCase().trim();
  function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
  function context(){
    const p=read(PROFILE_KEY,null), g=read(PROGRESS_KEY,{currentLevel:1,streak:0,levels:{},rules:{}});
    const text=(document.body?.innerText||'').toLowerCase();
    let screen='world';
    if(document.querySelector('.practice-meta,.problem,#check'))screen='practice';
    else if(document.querySelector('.lesson-card'))screen='learn';
    else if(document.querySelector('.game-grid'))screen='play';
    else if(document.querySelector('.world-levels'))screen='master';
    const level=Number(g.currentLevel||1);
    const rule=level<=4?'direct':level<=8?'small':level<=12?'big':'mixed';
    const rules=g.rules||{};
    const totals=Object.values(rules).reduce((a,r)=>({correct:a.correct+(r?.correct||0),wrong:a.wrong+(r?.wrong||0)}),{correct:0,wrong:0});
    return {name:p?.name||'friend',age:p?.age||'6-8',experience:p?.experience||'new',level,rule,streak:Number(g.streak||0),screen,totals,text,levels:g.levels||{},rules};
  }
  function has(q, text){return q.some(x=>text.includes(x))}
  function response(input,c){
    const q=clean(input);
    if(!q) return {text:`Hi ${c.name}! Ask me about the abacus and I will help you one small step at a time.`,kind:'welcome'};
    if(has(['hello','hi','hey','வணக்கம்','ஹாய்'],q)) return {text:c.age==='3-5'?`Hi ${c.name}! Babi is ready for a tiny bead adventure!`:`Hi ${c.name}! I’m Babi. Ready for your next bead challenge?`,kind:'greeting'};
    if(has(['hint','help','stuck','சிரமம்','உதவி','ஹெல்ப்'],q)) return {text:`That’s okay, ${c.name}. Look at the question first. Move only the beads you need, then check your number. I’ll give you one small clue at a time.`,kind:'hint'};
    if(has(['upper','top','five','5','மேல்','ஐந்து'],q)) return {text:'The upper bead is worth 5. Bring it to the bar to make five, then add lower beads for six, seven, eight or nine.',kind:'concept'};
    if(has(['lower','bottom','one','1','bead value','மணி','ஒன்று'],q)) return {text:'Each lower bead is worth 1. Bring one lower bead to the bar for one, two for two, and so on.',kind:'concept'};
    if(has(['make 9','make nine','9','ஒன்பது'],q)) return {text:'To make 9, bring the upper 5 bead to the bar, then bring four lower beads to the bar. Five plus four makes nine.',kind:'worked-example'};
    if(has(['make 8','make eight','8','எட்டு'],q)) return {text:'To make 8, use the 5 bead and three lower beads. Five plus three makes eight.',kind:'worked-example'};
    if(has(['place value','ones','tens','இடமதிப்பு','ஒற்றை'],q)) return {text:'Each rod has a place value. Start with the ones rod. When you are ready, the rod to its left is tens.',kind:'concept'};
    if(has(['small friend','small friends','சின்ன நண்பர்'],q)) return {text:'Small friends help when you need to make or take away 5. Babi will teach the pair you need when that rule appears.',kind:'rule'};
    if(has(['big friend','big friends','பெரிய நண்பர்'],q)) return {text:'Big friends help when a move crosses 10. We use them only when your level is ready for that skill.',kind:'rule'};
    if(has(['level','லெவல்'],q)) return {text:`You are working around Level ${c.level}. Your current path focuses on ${c.rule} moves. Keep building correct answers rather than rushing.`,kind:'progress'};
    if(has(['streak','score','progress','ஸ்ட்ரீக்','முன்னேற்றம்'],q)) return {text:`You have a ${c.streak}-star current streak. Keep going one correct answer at a time.`,kind:'progress'};
    if(has(['what can you do','what do you do','who are you','நீ யார்'],q)) return {text:`I’m Babi’s Tiny AI helper. I can explain abacus ideas, give small hints, and use your current learning context. I won’t make up an answer.`,kind:'about'};
    if(c.screen==='practice') return {text:`Look at your ${c.level <= 4?'direct':'friend'} move, build the answer with the beads, and check it. If you’re stuck, ask me for a hint.`,kind:'practice'};
    return {text:`I can help with the abacus, ${c.name}. Try asking “How do I make 9?”, “What is the 5 bead?”, or “Give me a hint.”`,kind:'fallback'};
  }
  window.TinyAI={context,response,ask:(input)=>response(input,context())};
})();
