// Batch 8 — non-invasive production self-check. Exposes diagnostics without changing gameplay.
(function(){
 function run(){
  const checks={boot:!!document.querySelector('#app'),engine:!!(window.AbacusEngine||window.generateProblem),babiVoice:!!window.BabiVoice,tinyAI:!!window.TinyAI,liveVoice:!!window.LiveBabiVoice,levelZero:!!window.LevelZero,mastery:!!window.Mastery,dailyMission:!!window.DailyMission,parentInsights:!!window.ParentInsights,serviceWorker:'serviceWorker' in navigator,storage:(()=>{try{localStorage.setItem('__abacus_q','1');localStorage.removeItem('__abacus_q');return true}catch{return false}})()};
  return {ok:Object.values(checks).every(Boolean),checks};
 }
 window.AbacusQAGate={run};
})();
