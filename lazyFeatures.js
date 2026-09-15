// On-demand feature loader. Do NOT preload the whole app after first paint.
(function(){
  const loaded=new Map();
  const classic=src=>{if(loaded.has(src))return loaded.get(src);const p=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=resolve;s.onerror=()=>reject(new Error('Feature failed: '+src));document.head.appendChild(s)});loaded.set(src,p);return p};
  const module=src=>{if(loaded.has(src))return loaded.get(src);const p=import(src);loaded.set(src,p);return p};
  const feature={learn:'./learning/learningHub.js?v=20260915-learnzero2',games:'./playModes.js?v=20260914-round5'};
  async function openLearn(){if(window.__abacusLearningOpen)return window.__abacusLearningOpen();try{await module(feature.learn);window.__abacusLearningOpen?.()}catch(err){console.error(err)}}
  async function openGames(){if(window.__abacusPlay)return window.__abacusPlay();try{await module(feature.games);window.__abacusPlay?.()}catch(err){console.error(err)}}
  document.addEventListener('click',e=>{const learn=e.target.closest?.('#learn');if(learn&&!window.__abacusLearningOpen){e.preventDefault();e.stopImmediatePropagation();openLearn();return}const games=e.target.closest?.('#games');if(games&&!window.__abacusPlay){e.preventDefault();e.stopImmediatePropagation();openGames() }},true);
  window.__abacusFeatureLoader={loadClassic:classic,loadModule:module,openLearn,openGames};
})();
