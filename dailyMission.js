// Batch 5 — lightweight daily mission, generated locally from progress.
(function(){
 const KEY='abacus-ai-mission-v1';
 function today(){return new Date().toISOString().slice(0,10)}
 function get(){try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x?.date===today())return x}catch{}return {date:today(),goal:3,done:0,kind:'wins'}}
 function save(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
 function recordWin(){const x=get();x.done=Math.min(x.goal,x.done+1);save(x);return x}
 function reset(){const x={date:today(),goal:3,done:0,kind:'wins'};save(x);return x}
 window.DailyMission={get,recordWin,reset};
})();
