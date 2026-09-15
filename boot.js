// Tiny boot layer: the first screen is real HTML, not a JS-rendered placeholder.
(function(){
  const PROFILE='abacus-ai-profile-v2';
  const LANG='abacus-ai-language';
  const app=document.getElementById('app');
  if(!app)return;
  const read=()=>{try{return JSON.parse(localStorage.getItem(PROFILE)||'null')}catch{return null}};
  const fail=()=>{app.innerHTML='<div class="screen onboarding center"><div style="max-width:520px;margin:auto"><div style="font-size:56px">🧮</div><h1>Babi is waking up…</h1><p>We could not start Abacus World.</p><button class="primary" type="button" onclick="location.reload()">Try Again</button></div></div>';};
  function voicePicker(){
    const card=document.querySelector('.ob-card');
    if(!card||document.getElementById('bootVoiceChoice'))return;
    const box=document.createElement('section');box.id='bootVoiceChoice';box.className='boot-voice-choice';
    box.innerHTML='<div class="boot-voice-title">🔊 How should Babi talk?</div><div class="boot-voice-sub">Pick a voice. Tap 🔊 Babi anytime to hear the page.</div><div class="boot-voice-buttons"><button type="button" data-boot-lang="en">🇬🇧 English</button><button type="button" data-boot-lang="ta">🇮🇳 தமிழ்</button></div>';
    card.prepend(box);
    const current=localStorage.getItem(LANG)==='ta'?'ta':'en';
    const speak=(lang)=>{
      if(!('speechSynthesis' in window))return;
      speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(lang==='ta'?'வணக்கம்! நான் பாபி. சேர்ந்து கற்போம்!':'Hi! I am Babi. Let’s learn together!');u.lang=lang==='ta'?'ta-IN':'en-IN';u.rate=.88;u.pitch=1.18;speechSynthesis.speak(u);
    };
    box.querySelectorAll('[data-boot-lang]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(LANG,b.dataset.bootLang);box.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));speak(b.dataset.bootLang)}));
    box.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.bootLang===current));
  }
  function startApp(){return (async()=>{
    const sw=navigator.serviceWorker?.register;
    if(sw)navigator.serviceWorker.register=()=>Promise.resolve(null);
    try{
      await import('./challengeApp.js?v=20260915-appshell1');
      await import('./runtimeGuards.js?v=20260915-runtime1');
      // Voice, sound and kid UI stay after the shell so the first paint remains fast.
      await import('./babiVoice.js?v=20260915-voice1');
      await import('./audioFx.js?v=20260915-audio1');
      await import('./kidUi.js?v=20260915-kid1');
    }
    catch(err){console.error(err);fail()}
    finally{if(sw)navigator.serviceWorker.register=sw}
  })()}
  const wire=()=>{
    let age='',exp='',busy=false;
    const next=document.getElementById('obNext');
    const name=document.getElementById('childName');
    const ages=[...document.querySelectorAll('[data-age]')];
    const exps=[...document.querySelectorAll('[data-exp]')];
    if(!next||!name)return;
    voicePicker();
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
  window.addEventListener('load',()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=20260915-v14').catch(()=>{})});
})();
