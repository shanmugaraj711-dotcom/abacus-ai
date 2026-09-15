// Performance architecture: keep the first paint tiny, then load feature code on demand.
(function(){
  const loaded=new Map();
  const classic=(src)=>{if(loaded.has(src))return loaded.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Feature failed: '+src));document.head.appendChild(s)});loaded.set(src,p);return p};
  const module=(src)=>{if(loaded.has(src))return loaded.get(src);const p=import(src);loaded.set(src,p);return p};
  const idle=fn=>('requestIdleCallback'in window?requestIdleCallback(fn,{timeout:1800}):setTimeout(fn,900));
  const polish=[
    './babiCharacter.js?v=20260914-babi5','./babiVoice.js?v=20260914-babi6','./tinyAI.js?v=20260914-tiny4',
    './babiContext.js?v=20260914-b3','./levelZero.js?v=20260914-b4','./mastery.js?v=20260914-b5',
    './dailyMission.js?v=20260914-b6','./parentInsights.js?v=20260915-phase4insights1','./parentAnalyticsEnhancer.js?v=20260915-phase4dashboard1',
    './voiceHardening.js?v=20260914-b8','./globalBackNav.js?v=20260915-back1','./experiencedAssessment.js?v=20260915-assess2',
    './learning/lessonTutor.js?v=20260914-tutor2','./brainBridge.js?v=20260914-brain1','./interactionFix.js?v=20260914-round5',
    './celebration.js?v=20260914-applause5','./feedbackUX.js?v=20260914-audit2','./phase5CoreUX.js?v=20260915-phase5ux1'
  ];
  const polishModules=['./hintEnhancer.js?v=20260914-hint6','./sound.js?v=20260914-round5'];
  const loadPolish=async()=>{for(const src of polish){try{await classic(src)}catch(err){console.warn(err)}}await Promise.allSettled(polishModules.map(module))};
  document.addEventListener('click',async e=>{
    const learn=e.target.closest?.('#learn');
    if(learn&&!window.__abacusLearningOpen){e.preventDefault();e.stopImmediatePropagation();try{await module('./learning/learningHub.js?v=20260915-learnzero2');window.__abacusLearningOpen?.()}catch(err){console.error(err)}}
    const games=e.target.closest?.('#games');
    if(games&&!window.__abacusPlay){e.preventDefault();e.stopImmediatePropagation();try{await module('./playModes.js?v=20260914-round5');window.__abacusPlay?.()}catch(err){console.error(err)}}
  },true);
  window.__abacusFeatureLoader={loadPolish,loadClassic:classic,loadModule:module};
  idle(loadPolish);
})();
