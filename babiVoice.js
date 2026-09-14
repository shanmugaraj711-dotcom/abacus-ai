// Babi voice guidance + always-available bilingual child helper.
// Offline/PWA safe: browser SpeechSynthesis only; no network or AI API.
(function(){
  const T={
    greeting:(name)=>`Hi ${name}! Shall we start with some dance?`,
    greetingTa:(name)=>`ஹாய் ${name}! ஒரு சின்ன டான்ஸ் பண்ணலாமா?`,
    help:'Hi! I am Babi. I will help you. Tell me what you want to do.',
    helpTa:'ஹாய்! நான் பாபி. நான் உனக்கு உதவி செய்கிறேன். என்ன செய்ய வேண்டும் என்று சொல்கிறேன்.',
    learn:'Let’s learn one small step. Look at the abacus, then try it yourself.',
    learnTa:'சின்ன சின்னதாக கற்றுக்கொள்வோம். அபாகஸைப் பாரு. பிறகு நீயே செய்து பார்.',
    practice:'Your turn! Look at the question and move the beads. You can do it!',
    practiceTa:'இப்போது உன் டர்ன்! கேள்வியைப் பார்த்து மணிகளை நகர்த்து. நீ செய்யலாம்!',
    play:'Let’s play! Choose a game and have fun with your abacus.',
    playTa:'விளையாடலாமா! ஒரு கேமை தேர்வு செய்து அபாகஸுடன் ஜாலியாக விளையாடு.',
    levels:'Choose your level. Start with your current level and keep going.',
    levelsTa:'உன் லெவலை தேர்வு செய். இப்போதைய லெவலில் தொடங்கி தொடர்ந்து செய்.',
    tryIt:'Try it yourself!',tryItTa:'நீயே செய்து பார்!',
    hint:'That’s okay! Press the Hint button and I will show you one small step. I won’t give you the whole answer.',
    hintTa:'பரவாயில்லை! Hint பட்டனை அழுத்து. நான் ஒரு சின்ன படியாக உதவி செய்கிறேன். முழு பதிலை சொல்ல மாட்டேன்.',
    again:'Take your time. Try one more time.',againTa:'அவசரம் வேண்டாம். இன்னொரு முறை முயற்சி செய்!',
    great:'Great job! You figured it out!',greatTa:'சூப்பர்! நீயே கண்டுபிடித்துவிட்டாய்!'
  };
  let lang=localStorage.getItem('abacus-ai-language')||'ta-en';
  let speakingUntil=0;
  function speak(text,code){
    if(!('speechSynthesis' in window))return false;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=code||'en-IN';u.rate=.84;u.pitch=1.18;u.volume=1;speechSynthesis.speak(u);speakingUntil=Date.now()+Math.max(1200,text.length*55);return true}catch(e){return false}
  }
  function say(en,ta){
    if(lang==='en')return speak(en,'en-IN');
    if(lang==='ta')return speak(ta,'ta-IN');
    speak(ta,'ta-IN');setTimeout(()=>{if(Date.now()<speakingUntil+2500)speak(en,'en-IN')},Math.max(1400,ta.length*48));
    return true;
  }
  function greeting(name){return say(T.greeting(name),T.greetingTa(name))}
  function setLanguage(value){lang=value;localStorage.setItem('abacus-ai-language',value)}
  function current(){return lang}
  function getName(){try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')?.name||'friend'}catch(e){return 'friend'}}

  function context(){
    const body=(document.body?.innerText||'').toLowerCase();
    if(body.includes('practice-meta')||body.includes('move the beads')||body.includes('check ✓'))return [T.practice,T.practiceTa];
    if(body.includes('abacus adventure')||body.includes('start from zero')||body.includes('lesson'))return [T.learn,T.learnTa];
    if(body.includes('playroom')||body.includes('bead builder')||body.includes('number hunt')||body.includes('speed challenge'))return [T.play,T.playTa];
    if(body.includes('master path')||body.includes('level 1')&&body.includes('level 15'))return [T.levels,T.levelsTa];
    return [T.help,T.helpTa];
  }

  function inject(){
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.textContent=`
      #babi-global-helper{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;border:0;border-radius:999px;padding:10px 14px 10px 10px;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#fff7df,#ffe7b5);box-shadow:0 7px 22px rgba(70,38,12,.2);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}
      #babi-global-helper .face{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:22px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}
      #babi-global-helper:active{transform:scale(.95)}
      #babi-helper-bubble{position:fixed;right:14px;bottom:calc(70px + env(safe-area-inset-bottom));z-index:9998;max-width:min(300px,calc(100vw - 28px));padding:12px 14px;border-radius:18px 18px 6px 18px;background:#fff;box-shadow:0 8px 25px rgba(70,38,12,.16);color:#4b2c18;font:800 14px/1.35 ui-rounded,system-ui,sans-serif;display:none}
      #babi-helper-bubble.show{display:block;animation:babiHelperIn .22s ease}@keyframes babiHelperIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
    `;document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🤖</span><span>Babi AI • Help</span>';b.setAttribute('aria-label','Ask Babi for help');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:lang==='en'?en:`${ta}  ${en}`;bubble.classList.add('show');say(en,ta);setTimeout(()=>bubble.classList.remove('show'),6500)},{passive:true});
  }

  function hintMessage(){say(T.hint,T.hintTa)}
  document.addEventListener('click',function(e){
    const el=e.target?.closest?.('.babi-component');
    if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>700){window.__lastBabiVoice=now;greeting(getName())}}
    const hint=e.target?.closest?.('#hint,.hint-btn,[data-hint]');
    if(hint) setTimeout(hintMessage,80);
  },{passive:true});

  window.BabiVoice={say,greeting,setLanguage,current,hint:hintMessage,supported:('speechSynthesis' in window)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();