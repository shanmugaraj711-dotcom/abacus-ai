// Batch 8 — production self-check. Avoids false failures for optional/legacy globals.
(function(){
 function run(){
  const checks={
   boot:!!document.querySelector('#app'),
   engine:!!(window.generateProblem||window.AbacusEngine||document.querySelector('.abacus')),
   babiVoice:!!window.BabiVoice,
   tinyAI:!!window.TinyAI,
   levelZero:!!window.LevelZero,
   mastery:!!window.Mastery,
   dailyMission:!!window.DailyMission,
   parentInsights:!!window.ParentInsights,
   serviceWorker:'serviceWorker' in navigator,
   storage:(()=>{try{localStorage.setItem('__abacus_q','1');localStorage.removeItem('__abacus_q');return true}catch{return false}})()
  };
  return {ok:Object.values(checks).every(Boolean),checks};
 }
 window.AbacusQAGate={run};
 // Staging-only adaptive QA harness. This branch is never production until QA approval.
 if(location.hostname.includes('github.io')||location.hostname.includes('pages.dev')||location.hostname==='localhost'){
  const s=document.createElement('script');s.src='./phase1AdaptiveStaging.js?v=phase1-staging1';document.head.appendChild(s);
 }
})();
