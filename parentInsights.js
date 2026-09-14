// Batch 6 — parent-facing summary derived from local progress only.
(function(){
 const P='abacus-ai-profile-v2',G='abacus-ai-progress-v2';
 function read(k,f){try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}}
 function summary(){const p=read(P,{}),g=read(G,{currentLevel:1,streak:0,levels:{},rules:{},sessions:0});const rules=g.rules||{};const rows=Object.entries(rules).map(([rule,v])=>{const n=(v.correct||0)+(v.wrong||0);return {rule,correct:v.correct||0,wrong:v.wrong||0,accuracy:n?Math.round((v.correct||0)/n*100):0}});return {child:p.name||'Child',age:p.age||'',currentLevel:g.currentLevel||1,streak:g.streak||0,sessions:g.sessions||0,rules:rows,strongest:[...rows].sort((a,b)=>b.accuracy-a.accuracy)[0]||null,needsPractice:[...rows].sort((a,b)=>a.accuracy-b.accuracy)[0]||null}}
 window.ParentInsights={summary};
})();
