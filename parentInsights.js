// Parent-facing summary derived from local progress only.
(function(){
 const P='abacus-ai-profile-v2',G='abacus-ai-progress-v2';
 function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
 function pct(n,d){return d?Math.round(n/d*100):0}
 function label(rule){return ({direct:'Direct moves',small:'Small friends',big:'Big friends',mixed:'Mixed mastery'})[rule]||rule}
 function summary(){
  const p=read(P,{}),g=read(G,{currentLevel:1,streak:0,levels:{},rules:{},sessions:0});
  const rules=g.rules||{};
  const rows=Object.entries(rules).map(([rule,v])=>{
   const correct=Number(v?.correct)||0,wrong=Number(v?.wrong)||0,total=correct+wrong;
   return {rule,label:label(rule),correct,wrong,total,accuracy:pct(correct,total)};
  });
  const attempts=rows.reduce((n,r)=>n+r.total,0),correct=rows.reduce((n,r)=>n+r.correct,0);
  const completed=Object.values(g.levels||{}).filter(v=>v&&v.completed).length;
  const active=rows.filter(r=>r.total>0);
  const strongest=active.slice().sort((a,b)=>b.accuracy-a.accuracy||b.total-a.total)[0]||null;
  const needsPractice=active.slice().sort((a,b)=>a.accuracy-b.accuracy||b.total-a.total)[0]||null;
  let next='Keep building confidence with three correct answers in a row.';
  if(!attempts) next='Start Level 1 together and aim for three calm, correct answers.';
  else if(needsPractice&&needsPractice.accuracy<80) next=`Give ${needsPractice.label.toLowerCase()} a little extra practice before pushing ahead.`;
  else if(g.currentLevel>=6) next='The free path is progressing well. Keep practising to make the skills automatic.';
  else if(g.streak>=2) next='One more correct answer will complete the current three-win streak.';
  return {
   child:p.name||'Child',age:p.age||'',currentLevel:Number(g.currentLevel)||1,streak:Number(g.streak)||0,
   sessions:Number(g.sessions)||0,attempts,correct,wrong:Math.max(0,attempts-correct),accuracy:pct(correct,attempts),
   completedLevels:completed,rules:rows,strongest,needsPractice,next,hasPracticeData:attempts>0
  };
 }
 window.ParentInsights={summary,label};
})();
