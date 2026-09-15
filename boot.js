// Tiny boot layer: the first screen is real HTML, not a JS-rendered placeholder.
(function(){
  const PROFILE='abacus-ai-profile-v2';
  const app=document.getElementById('app');
  if(!app)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem(PROFILE)||'null')}catch{return null}};
  const fail=()=>{app.innerHTML='<div class="screen onboarding center"><div style="max-width:520px;margin:auto"><div style="font-size:56px">🧮</div><h1>Babi is waking up…</h1><p>We could not start Abacus World.</p><button class="primary" type="button" onclick="location.reload()">Try Again</button></div></div>'};
  const startApp=async()=>{
    const sw=navigator.serviceWorker?.register;
    if(sw)navigator.serviceWorker.register=()=>Promise.resolve(null);
    try{await import('./challengeApp.js?v=20260915-appshell1');await import('./runtimeGuards.js?v=20260915-runtime1')}
    catch(err){console.error(err);fail()}
    finally{if(sw)navigator.serviceWorker.register=sw}
  };
  const wire=()=>{
    let age='',exp='',busy=false;
    const next=document.getElementById('obNext');
    const name=document.getElementById('childName');
    const ages=[...document.querySelectorAll('[data-age]')];
    const exps=[...document.querySelectorAll('[data-exp]')];
    if(!next||!name)return;
    const ready=()=>{next.disabled=!(name.value.trim()&&age&&exp)};
    ages.forEach(b=>b.addEventListener('click',()=>{age=b.dataset.age;ages.forEach(x=>x.classList.toggle('selected',x===b));ready()}));
    exps.forEach(b=>b.addEventListener('click',()=>{exp=b.dataset.exp;exps.forEach(x=>x.classList.toggle('selected',x===b));ready()}));
    name.addEventListener('input',ready);
    next.addEventListener('click',async()=>{
      if(busy||next.disabled)return;
      busy=true;next.disabled=true;
      const profile={name:name.value.trim(),age,experience:exp,createdAt:Date.now()};
      try{localStorage.setItem(PROFILE,JSON.stringify(profile))}catch{busy=false;next.disabled=false;return}
      if(exp==='known'){
        try{await import('./experiencedAssessment.js?v=20260915-assess1');setTimeout(()=>document.getElementById('obNext')?.click(),0)}
        catch(err){console.error(err);busy=false;next.disabled=false;fail()}
        return;
      }
      await startApp();
    });
  };
  const profile=read();
  if(profile){
    app.innerHTML='<div class="screen onboarding center"><div style="margin:auto"><div style="font-size:52px">🧮</div><h1>Babi is waking up…</h1></div></div>';
    startApp();
  }else wire();
  window.addEventListener('load',()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=20260915-v12').catch(()=>{})});
})();
