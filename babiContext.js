// Context bridge for Babi. It exposes the current problem context without
// speaking automatically; the page-aware Babi AI helper or result celebration
// owns spoken feedback so children never hear overlapping/repeated dialogue.
(function(){
  function problem(){try{return window.__abacusProblem||null}catch{return null}}
  function setProblem(value){try{window.__abacusProblem=value||null}catch{}}
  window.BabiContext={problem,setProblem};
})();
