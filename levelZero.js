// Batch 3 — persistent Level 0 foundation tracker.
(function(){
  const KEY='abacus-ai-foundation-v1';
  const defaults={meet:false,lower:false,five:false,nine:false,place:false,finger:false,challenge:false};
  function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
  function save(s){try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}}
  function progress(){const s=read();return Object.values(s).filter(Boolean).length}
  function mark(step){const s=read();if(step in s)s[step]=true;save(s);return s}
  window.LevelZero={state:read,mark,progress,total:7,complete:()=>progress()===7};
})();
