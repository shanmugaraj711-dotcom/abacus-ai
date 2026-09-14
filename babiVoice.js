// Babi voice: child-friendly Tamil OR English, offline/PWA safe.
// Uses device SpeechSynthesis voices. Persona is an original playful bear/cartoon style;
// it does not imitate any specific copyrighted character voice.
(function(){
  const T={
    greeting:(name)=>`Hi ${name}! Shall we start with some dance?`, greetingTa:(name)=>`ஹாய் ${name}! ஒரு சின்ன டான்ஸ் பண்ணலாமா?`,
    help:'Hi! I am Babi. I am here to help. Look at the page and try the next little step. If you are stuck, press Hint.',
    helpTa:'ஹாய்! நான் பாபி. உனக்கு உதவ நான் இங்கே இருக்கிறேன். பக்கத்தைப் பார்த்து அடுத்த சின்ன படியை முயற்சி செய். சிரமமாக இருந்தால் Hint-ஐ அழுத்து.',
    learn:'Let’s learn one small step. Watch Babi, then try it yourself.', learnTa:'சின்ன சின்னதாக கற்றுக்கொள்வோம். முதலில் பாபியைப் பாரு. பிறகு நீயே செய்து பார்.',
    practice:'Your turn! Look at the question and move the beads. If you are stuck, press Hint. I will help one small step at a time.', practiceTa:'இப்போது உன் டர்ன்! கேள்வியைப் பார்த்து மணிகளை நகர்த்து. சிரமமாக இருந்தால் Hint-ஐ அழுத்து. நான் ஒரு சின்ன படியாக உதவி செய்வேன்.',
    play:'Let’s play! Choose a game and try it yourself first.', playTa:'விளையாடலாமா! ஒரு கேமை தேர்வு செய்து முதலில் நீயே முயற்சி செய்.',
    levels:'Choose your level. Start where you are and keep learning.', levelsTa:'உன் லெவலை தேர்வு செய். நீ இருக்கும் இடத்திலிருந்து தொடங்கி தொடர்ந்து கற்றுக்கொள்.',
    hint:'That’s okay! Press Hint. I will give you one small clue, not the whole answer. You figure out the rest!', hintTa:'பரவாயில்லை! Hint-ஐ அழுத்து. நான் ஒரு சின்ன குறிப்பு மட்டும் தருவேன்; முழு பதிலை சொல்ல மாட்டேன். மீதியை நீயே கண்டுபிடி!',
    again:'Take your time. Try one more time.', againTa:'அவசரம் வேண்டாம். இன்னொரு முறை முயற்சி செய்!',
    great:'Great job! You figured it out!', greatTa:'சூப்பர்! நீயே கண்டுபிடித்துவிட்டாய்!'
  };

  // IMPORTANT: Babi is intentionally single-language now.
  // Older builds used "ta-en" bilingual mode. Normalize that legacy value to Tamil.
  let stored=localStorage.getItem('abacus-ai-language');
  let lang=stored==='en'?'en':'ta';
  let speaking=false;

  function voices(){return ('speechSynthesis' in window&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[]}
  function pickVoice(code){
    const vs=voices(),base=code.split('-')[0];
    const exact=vs.filter(v=>v.lang?.toLowerCase()===code.toLowerCase());
    const same=vs.filter(v=>v.lang?.toLowerCase().startsWith(base));
    const pool=exact.length?exact:same;
    return pool.find(v=>/natural|neural|enhanced|premium|female|woman|girl/i.test(v.name))||pool[0]||null;
  }
  function styleFor(code){return code.startsWith('ta')?{rate:.78,pitch:.88}:{rate:.86,pitch:1.28}}
  function splitText(text){return String(text).replace(/\s+/g,' ').trim().match(/[^.!?。！？]+[.!?。！？]?/g)||[String(text)]}

  function speak(text,code){
    if(!('speechSynthesis' in window))return false;
    try{
      speechSynthesis.cancel();
      const parts=splitText(text);let i=0;speaking=true;
      const next=()=>{if(i>=parts.length){speaking=false;return}const u=new SpeechSynthesisUtterance(parts[i++]);u.lang=code;u.voice=pickVoice(code);const s=styleFor(code);u.rate=s.rate;u.pitch=s.pitch;u.volume=1;u.onend=next;u.onerror=next;speechSynthesis.speak(u)};
      next();return true;
    }catch(e){speaking=false;return false}
  }

  // The public say() API keeps both strings for compatibility, but speaks ONLY the selected language.
  function say(en,ta){return lang==='en'?speak(en,'en-IN'):speak(ta,'ta-IN')}
  function greeting(name){return lang==='en'?speak(T.greeting(name),'en-IN'):speak(T.greetingTa(name),'ta-IN')}
  function setLanguage(value){
    lang=value==='en'?'en':'ta';
    localStorage.setItem('abacus-ai-language',lang);
    document.querySelectorAll('[data-voice-lang]').forEach(b=>b.classList.toggle('selected',b.dataset.voiceLang===lang));
  }
  function current(){return lang}
  function getName(){try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')?.name||'friend'}catch(e){return 'friend'}}

  function context(){
    const has=s=>!!document.querySelector(s);const body=(document.body?.innerText||'').toLowerCase();
    if(has('.practice-meta')||has('.problem')||has('#check'))return [T.practice,T.practiceTa];
    if(has('.lesson-card')||body.includes('abacus adventure'))return [T.learn,T.learnTa];
    if(has('.game-grid')||body.includes('playroom'))return [T.play,T.playTa];
    if(has('.world-levels')||body.includes('master path'))return [T.levels,T.levelsTa];
    return [T.help,T.helpTa];
  }

  function addVoiceChoice(){
    const ob=document.querySelector('.onboarding');if(!ob||ob.querySelector('#voiceChoice'))return;
    const box=document.createElement('section');box.id='voiceChoice';box.className='voice-choice';
    box.innerHTML=`<div class="voice-choice-title">🔊 Choose Babi's voice</div><div class="voice-choice-sub">Pick one language. Babi will speak only that language.</div><div class="voice-choice-buttons"><button type="button" data-voice-lang="ta">🇮🇳 தமிழ்</button><button type="button" data-voice-lang="en">🇬🇧 English</button></div>`;
    const brand=ob.querySelector('.ob-card');if(brand)brand.prepend(box);else ob.appendChild(box);
    ob.querySelectorAll('[data-voice-lang]').forEach(b=>b.addEventListener('click',()=>{
      setLanguage(b.dataset.voiceLang);
      if(b.dataset.voiceLang==='ta')speak('ஹாய்! நான் பாபி. தமிழில் பேசலாமா?','ta-IN');
      else speak('Hi! I am Babi. Shall we learn together?','en-IN');
    }));
    setLanguage(localStorage.getItem('abacus-ai-language')==='en'?'en':'ta');
  }

  function inject(){
    addVoiceChoice();
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.textContent=`
      .voice-choice{margin:0 0 16px;padding:14px;border-radius:18px;background:#fff8e8;border:2px solid rgba(107,66,38,.12)}
      .voice-choice-title{font:900 16px/1.2 ui-rounded,system-ui,sans-serif;color:#4b2c18}.voice-choice-sub{margin:5px 0 10px;font:700 12px/1.3 ui-rounded,system-ui,sans-serif;color:#79583e}.voice-choice-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.voice-choice-buttons button{border:2px solid rgba(107,66,38,.12);border-radius:14px;padding:11px;background:#fff;font:900 14px ui-rounded,system-ui,sans-serif;color:#4b2c18}.voice-choice-buttons button.selected{border-color:#6b4226;box-shadow:0 0 0 3px rgba(107,66,38,.1)}
      #babi-global-helper{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;border:0;border-radius:999px;padding:8px 14px 8px 8px;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#fff7df,#ffe7b5);box-shadow:0 7px 22px rgba(70,38,12,.2);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation}#babi-global-helper .face{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:22px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}#babi-global-helper:active{transform:scale(.95)}#babi-helper-bubble{position:fixed;right:14px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:9998;max-width:min(310px,calc(100vw - 28px));padding:12px 14px;border-radius:18px 18px 6px 18px;background:#fff;box-shadow:0 8px 25px rgba(70,38,12,.16);color:#4b2c18;font:800 14px/1.35 ui-rounded,system-ui,sans-serif;display:none}#babi-helper-bubble.show{display:block;animation:babiHelperIn .22s ease}@keyframes babiHelperIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
    `;document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🐻</span><span>Babi AI • Help</span>';b.setAttribute('aria-label','Ask Babi for help');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:en;bubble.classList.add('show');say(en,ta);setTimeout(()=>bubble.classList.remove('show'),7000)});
  }
  function hintMessage(){say(T.hint,T.hintTa)}
  document.addEventListener('click',function(e){
    const el=e.target?.closest?.('.babi-component');if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>700){window.__lastBabiVoice=now;greeting(getName())}}
    const hint=e.target?.closest?.('#hint,.hint-btn,[data-hint]');if(hint)setTimeout(hintMessage,80);
  },{passive:true});
  if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{};
  window.BabiVoice={say,greeting,setLanguage,current,hint:hintMessage,supported:('speechSynthesis' in window),stop:()=>speechSynthesis?.cancel()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
