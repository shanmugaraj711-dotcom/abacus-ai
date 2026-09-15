(function(){
  const PROFILE='abacus-ai-profile-v2';
  function profile(){try{return JSON.parse(localStorage.getItem(PROFILE)||'{}')}catch{return {}}}
  function done(){try{return JSON.parse(localStorage.getItem('abacus-ai-zero-start-v2')||'{}').completed?.length===7}catch{return false}}
  function route(){
    const learn=document.getElementById('learn');
    if(!learn || learn.dataset.zeroStartRouter==='1')return;
    learn.dataset.zeroStartRouter='1';
    learn.addEventListener('click',function(){
      if(profile().experience==='known'||done())return;
      setTimeout(function(){
        const first=document.querySelector('[data-learning-id="1"]');
        if(first)first.click();
      },80);
    },false);
  }
  new MutationObserver(route).observe(document.getElementById('app'),{childList:true,subtree:true});
  setTimeout(route,200);
})();
