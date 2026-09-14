// Babi voice guidance + always-available bilingual child helper.
// Offline/PWA safe: browser SpeechSynthesis only; no network or AI API.
(function(){
  const T={
    greeting:(name)=>`Hi ${name}! Shall we start with some dance?`, greetingTa:(name)=>`ஹாய் ${name}! ஒரு சின்ன டான்ஸ் பண்ணலாமா?`,
    help:'Hi! I am Babi. I am here to help. Look at the page and try the next little step. If you are stuck, press Hint.',
    helpTa:'ஹாய்! நான் பாபி. உனக்கு உதவ நான் இங்கே இருக்கிறேன். பக்கத்தைப் பார்த்து அடுத்த சின்ன படியை முயற்சி செய். குழப்பமாக இருந்தால் Hint-ஐ அழுத்து.',
    learn:'Let’s learn one small step. Watch, then try it yourself.', learnTa:'சின்ன சின்னதாக கற்றுக்கொள்வோம். முதலில் பாரு. பிறகு நீயே செய்து பார்.',
    practice:'Your turn! Look at the question and move the beads. If you are stuck, press Hint. I will help one step at a time.', practiceTa:'இப்போது உன் டர்ன்! கேள்வியைப் பார்த்து மணிகளை நகர்த்து. சிரமமாக இருந்தால் Hint-ஐ அழுத்து. நான் ஒரு படியாக உதவி செய்வேன்.',
    play:'Let’s play! Choose a game and have fun. Try it yourself first.', playTa:'விளையாடலாமா! ஒரு கேமை தேர்வு செய்து ஜாலியாக விளையாடு. முதலில் நீயே முயற்சி செய்.',
    levels:'Choose your level. Start where you are and keep learning.', levelsTa:'உன் லெவலை தேர்வு செய். நீ இருக்கும் இடத்திலிருந்து தொடங்கி தொடர்ந்து கற்றுக்கொள்.',
    hint:'That’s okay! Press Hint. I will give you one small clue, not the whole answer. You figure out the rest!', hintTa:'பரவாயில்லை! Hint-ஐ அழுத்து. நான் ஒரு சின்ன குறிப்பு மட்டும் தருவேன்; முழு பதிலை சொல்ல மாட்டேன். மீதியை நீயே கண்டுபிடி!',
    again:'Take your time. Try one more time.', againTa:'அவசரம் வேண்டாம். இன்னொரு முறை முயற்சி செய்!',
    great:'Great job! You figured it out!', greatTa:'சூப்பர்! நீயே கண்டுபிடித்துவிட்டாய்!'
  };
  let lang=localStorage.getItem('abacus-ai-language')||'ta-en';
  let speakingUntil=0;
  function pickVoice(code){
    if(!('speechSynthesis' in window))return null;
    const voices=speechSynthesis.getVoices?.()||[];const base=code.split('-')[0];
    return voices.find(v=>v.lang?.toLowerCase()===code.toLowerCase()&&/female|girl|child|natural|neural/i.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith(base)&&/female|girl|child|natural|neural/i.test(v.name))||voices.find(v=>v.lang?.toLowerCase().startsWith(base))||null;
  }
  function speak(text,code){
    if(!('speechSynthesis' in window))return false;
    try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=code||'en-IN';u.voice=pickVoice(u.lang);u.rate=.82;u.pitch=1.24;u.volume=1;speechSynthesis.speak(u);speakingUntil=Date.now()+Math.max(1200,text.length*55);return true}catch(e){return false}
  }
  function say(en,ta){
    if(lang==='en')return speak(en,'en-IN'); if(lang==='ta')return speak(ta,'ta-IN');
    speak(ta,'ta-IN');setTimeout(()=>{if(Date.now()<speakingUntil+2500)speak(en,'en-IN')},Math.max(1500,ta.length*45));return true;
  }
  function greeting(name){return say(T.greeting(name),T.greetingTa(name))}
  function setLanguage(value){lang=value;localStorage.setItem('abacus-ai-language',value)} function current(){return lang}
  function getName(){try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')?.name||'friend'}catch(e){return 'friend'}}
  function context(){
    const has=s=>!!document.querySelector(s);const body=(document.body?.innerText||'').toLowerCase();
    if(has('.practice-meta')||has('.problem')||has('#check'))return [T.practice,T.practiceTa];
    if(has('.lesson-card')||body.includes('abacus adventure'))return [T.learn,T.learnTa];
    if(has('.game-grid')||body.includes('playroom'))return [T.play,T.playTa];
    if(has('.world-levels')||body.includes('master path'))return [T.levels,T.levelsTa];
    return [T.help,T.helpTa];
  }
  function inject(){
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.textContent=`#babi-global-helper{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;border:0;border-radius:999px;padding:8px 14px 8px 8px;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#fff7df,#ffe7b5);box-shadow:0 7px 22px rgba(70,38,12,.2);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}#babi-global-helper .face{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:22px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}#babi-global-helper:active{transform:scale(.95)}#babi-helper-bubble{position:fixed;right:14px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:9998;max-width:min(310px,calc(100vw - 28px));padding:12px 14px;border-radius:18px 18px 6px 18px;background:#fff;box-shadow:0 8px 25px rgba(70,38,12,.16);color:#4b2c18;font:800 14px/1.35 ui-rounded,system-ui,sans-serif;display:none}#babi-helper-bubble.show{display:block;animation:babiHelperIn .22s ease}@keyframes babiHelperIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}`;
    document.head.appendChild(style);const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🤖</span><span>Babi AI • Help</span>';b.setAttribute('aria-label','Ask Babi for help');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:lang==='en'?en:`${ta}  ${en}`;bubble.classList.add('show');say(en,ta);setTimeout(()=>bubble.classList.remove('show'),6500)});
  }
  function hintMessage(){say(T.hint,T.hintTa)}
  document.addEventListener('click',function(e){
    const el=e.target?.closest?.('.babi-component');if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>700){window.__lastBabiVoice=now;greeting(getName())}}
    const hint=e.target?.closest?.('#hint,.hint-btn,[data-hint]');if(hint)setTimeout(hintMessage,80);
  },{passive:true});
  window.BabiVoice={say,greeting,setLanguage,current,hint:hintMessage,supported:('speechSynthesis' in window)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();