// Batch 2 — contextual Babi hints and responses.
(function(){
  function problem(){try{return window.__abacusProblem||null}catch{return null}}
  function bind(){
    document.addEventListener('click',e=>{
      const target=e.target?.closest?.('#check'); if(!target)return;
      setTimeout(()=>{const p=problem();if(p&&window.TinyAI){const c=TinyAI.context();const msg=c.streak>=2?'You are close to a three-star streak! Build carefully and check your beads.':'Nice try! Look at the operation and change only the beads you need.'; if(window.BabiVoice)BabiVoice.say(msg,msg);}},120);
    },{passive:true});
  }
  window.BabiContext={problem};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
