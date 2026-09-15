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
    if(!document.getElementById('bootVoiceStyle')){const s=document.createElement('style');s.id='bootVoiceStyle';s.textContent='.boot-voice-choice{margin:0 0 15px;padding:14px;border-radius:19px;background:linear-gradient(135deg,#eef9ff,#fff4d8);border:2px solid rgba(82,206,247,.35);text-align:center}.boot-voice-title{font:950 17px ui-rounded,system-ui,sans-serif;color:#4b2c18}.boot-voice-sub{margin:5px 0 10px;font:700 12px/1.3 ui-rounded,system-ui,sans-serif;color:#725e50}.boot-voice-buttons{display:grid;grid-template-columns:1fr 1fr;gap:9px}.boot-voice-buttons button{min-height:48px;border:2px solid #d9c49d;border-radius:15px;background:#fff;font:900 15px ui-rounded,system-ui,sans-serif;color:#4b2c18;box-shadow:0 3px 0 rgba(107,66,38,.12)}.boot-voice-buttons button.selected{border-color:#f1a52b;background:#fff1ca;box-shadow:0 4px 0 #d38a20}.boot-voice-buttons button:active{transform:scale(.97)}';document.head.appendChild(s)}
    const box=document.createElement('section');box.id='bootVoiceChoice';box.className='boot-voice-choice';
    box.innerHTML='<div class="boot-voice-title">🔊 How should Babi talk?</div><div class="boot-voice-sub">Pick a voice. Tap 🔊 Babi anytime to hear the page.</div><div class="boot-voice-buttons"><button type="button" data-boot-lang="en">🇬🇧 English</button><button type="button" data-boot-lang="ta">🇮🇳 Tamil • Tanglish</button></div>';
    card.prepend(box);
    const current=localStorage.getItem(LANG)==='ta'?'ta':'en';
    const speak=(lang)=>{if(!('speechSynthesis' in window))return;speechSynthesis.cancel();const text=lang==='ta'?'ஹாய்! நான் Babi. இப்போ நாம Abacus கத்துக்கலாம். ஏதாவது doubt இருந்தா Babi-யை கேளு!':'Hey! I am Babi. Let’s learn Abacus together. If you get stuck, ask me!';const parts=text.match(/[\u0B80-\u0BFF]+(?:\s+[\u0B80-\u0BFF]+)*|[A-Za-z0-9]+(?:\s+[A-Za-z0-9]+)*/g)||[text];let i=0;const next=()=>{if(i>=parts.length)return;const part=parts[i++].trim();const ta=/[\u0B80-\u0BFF]/.test(part);const u=new SpeechSynthesisUtterance(part);u.lang=ta?'ta-IN':'en-IN';u.rate=ta?.88:.93;u.pitch=1.16;u.onend=next;speechSynthesis.speak(u)};next()};
    box.querySelectorAll('[data-boot-lang]').forEach(b=>b.addEventListener('click',()=>{localStorage.setItem(LANG,b.dataset.bootLang);box.querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));speak(b.dataset.bootLang)}));
    box.querySelectorAll('button').forEach(b=>b.classList.toggle('selected',b.dataset.bootLang===current));
  }
  function startApp(){return (async()=>{try{
    await import('./challengeApp.js');
    await import('./babiVoice.js');
    await import('./audioFx.js');
    await import('./kidUi.js');
    await import('./practiceFocus.js');
    await import('./sessionSummary.js');
  }catch(err){console.error(err);fail()}})()}
  const wire=()=>{
    let age='',exp='',busy=false;
    const next=document.getElementById('obNext');const name=document.getElementById('childName');const ages=[...document.querySelectorAll('[data-age]')];const exps=[...document.querySelectorAll('[data-exp]')];
    if(!next||!name)return;
    voicePicker();
    const ready=()=>{next.disabled=!(name.value.trim()&&age&&exp)};
    ages.forEach(b=>b.addEventListener('click',()=>{age=b.dataset.age;ages.forEach(x=>x.classList.toggle('selected',x===b));ready()}));
    exps.forEach(b=>b.addEventListener('click',()=>{exp=b.dataset.exp;exps.forEach(x=>x.classList.toggle('selected',x===b));ready()}));
    name.addEventListener('input',ready);
    next.addEventListener('click',async()=>{if(busy||next.disabled)return;busy=true;next.disabled=true;const profile={name:name.value.trim(),age,experience:exp,createdAt:Date.now()};try{localStorage.setItem(PROFILE,JSON.stringify(profile))}catch{busy=false;next.disabled=false;return}if(exp==='known'){try{await import('./experiencedAssessment.js');setTimeout(()=>document.getElementById('obNext')?.click(),0)}catch(err){console.error(err);busy=false;next.disabled=false;fail()}return}await startApp()});
  };
  const profile=read();
  if(profile){app.innerHTML='<div class="screen onboarding center"><div style="margin:auto"><div style="font-size:52px">🧮</div><h1>Babi is waking up…</h1></div></div>';startApp()}else wire();
  window.addEventListener('load',()=>{if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js?v=20260915-v26').catch(()=>{})});
})();
