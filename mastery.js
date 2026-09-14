// Batch 4 — local mastery model, derived only from real answer history.
(function(){
 const KEY='abacus-ai-mastery-v1';
 function read(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return {}}}
 function write(x){try{localStorage.setItem(KEY,JSON.stringify(x))}catch{}}
 function record(rule,correct){const x=read();x[rule]=x[rule]||{correct:0,wrong:0};x[rule][correct?'correct':'wrong']++;write(x)}
 function get(){const x=read();return Object.entries(x).map(([rule,v])=>{const total=v.correct+v.wrong,accuracy=total?Math.round(v.correct/total*100):0;return {rule,...v,accuracy,status:accuracy>=90&&total>=5?'mastered':accuracy>=70?'strong':'needs-practice'}})}
 function weakest(){return get().sort((a,b)=>a.accuracy-b.accuracy)[0]||null}
 window.Mastery={record,get,weakest};
})();
