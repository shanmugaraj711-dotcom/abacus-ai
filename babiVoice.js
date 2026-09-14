// Babi voice: child-friendly Tamil OR English, page-aware and offline/PWA safe.
// Uses device SpeechSynthesis voices. Persona is an original playful bear/cartoon style.
(function(){
  const T={
    greeting:(name)=>`Hi ${name}! Ready for a tiny abacus adventure?`,
    greetingTa:(name)=>`ஹாய் ${name}! ஒரு சின்ன அபாகஸ் அட்வென்ச்சருக்கு ரெடியா?`,
    world:(name,level,streak)=>streak?`Welcome back, ${name}! You are on Level ${level} with a ${streak}-star streak. Let’s keep it going!`:`Hi ${name}! Babi is ready. Pick Learn, Practise or Play and let’s have some bead fun!`,
    worldTa:(name,level,streak)=>streak?`மீண்டும் வந்துட்டியா, ${name}! நீ இப்போது லெவல் ${level}. ${streak} ஸ்டார் ஸ்ட்ரீக் இருக்கு. தொடர்ந்து போகலாம்!`:`ஹாய் ${name}! பாபி ரெடி. Learn, Practise அல்லது Play-ஐ தேர்வு செய்து மணிகளோடு விளையாடிக் கற்போம்!`,
    learn:(name,title)=>`Nice choice, ${name}! We’re learning ${title||'one small abacus idea'}. Watch first, then you get to try it.`,
    learnTa:(name,title)=>`சூப்பர் தேர்வு, ${name}! இப்போது ${title||'ஒரு சின்ன அபாகஸ் விஷயத்தை'} கற்றுக்கொள்வோம். முதலில் பாரு, பிறகு நீயே செய்து பார்.`,
    practice:(name,problem)=>`Your turn, ${name}! ${problem?`The question is ${problem}. `:''}Move the beads slowly, look at your number, and then check it.`,
    practiceTa:(name,problem)=>`இப்போது உன் டர்ன், ${name}! ${problem?`கேள்வி ${problem}. `:''}மணிகளை மெதுவாக நகர்த்து, எண்ணைப் பார்த்து, பிறகு Check செய்.`,
    play:(name)=>`Game time, ${name}! Try the challenge yourself first. Babi will cheer you on!`,
    playTa:(name)=>`கேம் டைம், ${name}! முதலில் நீயே முயற்சி செய். பாபி உன்னை உற்சாகப்படுத்தும்!`,
    levels:(name,level)=>`Look at your Master Path, ${name}. Level ${level} is your current adventure. Keep building skill, not just speed.`,
    levelsTa:(name,level)=>`உன் Master Path-ஐ பாரு, ${name}. லெவல் ${level} தான் இப்போதைய அட்வென்ச்சர். வேகத்தை விட திறமையை வளர்ப்போம்.`,
    result:(name,correct)=>correct?`Yay, ${name}! That answer is right. Take your little victory, then try the next bead challenge.`:`That’s okay, ${name}. Mistakes help your abacus brain grow. Look at the beads and have another go.`,
    resultTa:(name,correct)=>correct?`யேய், ${name}! அந்த பதில் சரி. இந்த சின்ன வெற்றியை ரசிச்சுட்டு அடுத்த மணிச் சவாலை முயற்சி செய்.`:`பரவாயில்லை, ${name}. தவறுகள் உன் அபாகஸ் மூளை வளர உதவும். மணிகளைப் பார்த்து இன்னொரு முறை முயற்சி செய்.`,
    locked:(name)=>`You found a future adventure, ${name}! Test, Exam and Competition are being built. For now, keep mastering your free levels.` ,
    lockedTa:(name)=>`நீ ஒரு future adventure-ஐ கண்டுபிடிச்சுட்ட, ${name}! Test, Exam, Competition இன்னும் உருவாகிக் கொண்டிருக்கிறது. இப்போது free levels-ஐ master பண்ணலாம்.`,
    hint:'Here is your tiny clue: look at the operation first, then move only the beads you need. Babi will not steal the answer from you!',
    hintTa:'இதோ ஒரு சின்ன clue: முதலில் operation-ஐ பாரு. பிறகு தேவையான மணிகளை மட்டும் நகர்த்து. பதிலை பாபி உன்னிடம் இருந்து பறிக்காது!',
    help:'I’m right here! Tell me what feels tricky, or use the Hint button and I’ll give you one small clue.',
    helpTa:'பாபி இங்கேதான் இருக்கேன்! எது கஷ்டமாக இருக்கிறது என்று சொல்லு. அல்லது Hint-ஐ அழுத்து; ஒரு சின்ன clue தருகிறேன்.',
    again:'No rush. Reset your eyes on the abacus and try one calm move.',
    againTa:'அவசரம் வேண்டாம். மீண்டும் அபாகஸைப் பார்த்து ஒரு அமைதியான move முயற்சி செய்.'
  };

  let lang='ta';
  try{lang=localStorage.getItem('abacus-ai-language')==='en'?'en':'ta'}catch{}
  let speaking=false;

  function voices(){return ('speechSynthesis' in window&&speechSynthesis.getVoices)?speechSynthesis.getVoices():[]}
  function pickVoice(code){
    const vs=voices(),base=code.split('-')[0];
    const exact=vs.filter(v=>v.lang?.toLowerCase()===code.toLowerCase());
    const same=vs.filter(v=>v.lang?.toLowerCase().startsWith(base));
    const pool=exact.length?exact:same;
    return pool.find(v=>/natural|neural|enhanced|premium|female|woman|girl/i.test(v.name))||pool[0]||null;
  }
  function styleFor(code){return code.startsWith('ta')?{rate:.82,pitch:1.08}:{rate:.88,pitch:1.22}}
  function splitText(text){return String(text).replace(/\s+/g,' ').trim().match(/[^.!?।！？]+[.!?।！？]?/g)||[String(text)]}
  function speak(text,code){
    if(!('speechSynthesis' in window))return false;
    try{
      speechSynthesis.cancel();
      const parts=splitText(text);let i=0;speaking=true;
      const next=()=>{if(i>=parts.length){speaking=false;return}const u=new SpeechSynthesisUtterance(parts[i++]);u.lang=code;u.voice=pickVoice(code);const s=styleFor(code);u.rate=s.rate;u.pitch=s.pitch;u.volume=1;u.onend=next;u.onerror=next;speechSynthesis.speak(u)};
      next();return true;
    }catch(e){speaking=false;return false}
  }
  function say(en,ta){return lang==='en'?speak(en,'en-IN'):speak(ta,'ta-IN')}
  function greeting(name){return lang==='en'?speak(T.greeting(name),'en-IN'):speak(T.greetingTa(name),'ta-IN')}
  function setLanguage(value){
    lang=value==='en'?'en':'ta';
    try{localStorage.setItem('abacus-ai-language',lang)}catch{}
    document.querySelectorAll('[data-voice-lang]').forEach(b=>b.classList.toggle('selected',b.dataset.voiceLang===lang));
  }
  function current(){return lang}
  function getProfile(){try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')||{}}catch{return {}}}
  function getProgress(){try{return JSON.parse(localStorage.getItem('abacus-ai-progress-v2')||'null')||{}}catch{return {}}}
  function getName(){return getProfile().name||'friend'}

  function context(){
    const p=getProfile(),g=getProgress(),name=p.name||'friend',level=Number(g.currentLevel||1),streak=Number(g.streak||0);
    const has=s=>!!document.querySelector(s);
    const text=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
    if(has('.result-title')&&has('.result-problem')){
      const correct=!!document.querySelector('.result-title.coral');
      return [T.result(name,correct),T.resultTa(name,correct)];
    }
    if(has('.levelup-title'))return [
      `${name}, Level ${Math.max(1,level-1)} is mastered! Your next adventure is Level ${level}.`,
      `${name}, லெவல் ${Math.max(1,level-1)}-ஐ master பண்ணிட்ட! அடுத்த அட்வென்ச்சர் லெவல் ${level}.`
    ];
    if(has('.wall-card'))return [T.locked(name),T.lockedTa(name)];
    if(has('.practice-meta')||has('.problem')||has('#check')){
      const m=text.match(/(\d+)\s*([+−-])\s*(\d+)\s*=\s*\?/);
      const problem=m?`${m[1]} ${m[2]} ${m[3]}`:'';
      return [T.practice(name,problem),T.practiceTa(name,problem)];
    }
    if(has('.lesson-card')||text.toLowerCase().includes('abacus adventure')){
      const title=document.querySelector('.lesson-card h1')?.textContent?.trim()||'';
      return [T.learn(name,title),T.learnTa(name,title)];
    }
    if(has('.game-grid')||text.toLowerCase().includes('playroom'))return [T.play(name),T.playTa(name)];
    if(has('.world-levels')||text.toLowerCase().includes('master path'))return [T.levels(name,level),T.levelsTa(name,level)];
    return [T.world(name,level,streak),T.worldTa(name,level,streak)];
  }

  function addVoiceChoice(){
    const ob=document.querySelector('.onboarding');if(!ob||ob.querySelector('#voiceChoice'))return;
    const box=document.createElement('section');box.id='voiceChoice';box.className='voice-choice';
    box.innerHTML=`<div class="voice-choice-title">🔊 Choose Babi's voice</div><div class="voice-choice-sub">Pick one language. Babi will speak only that language.</div><div class="voice-choice-buttons"><button type="button" data-voice-lang="ta">🇮🇳 தமிழ்</button><button type="button" data-voice-lang="en">🇬🇧 English</button></div>`;
    const brand=ob.querySelector('.ob-card');if(brand)brand.prepend(box);else ob.appendChild(box);
    ob.querySelectorAll('[data-voice-lang]').forEach(b=>b.addEventListener('click',()=>{setLanguage(b.dataset.voiceLang);if(lang==='ta')speak('ஹாய்! நான் பாபி. தமிழில் பேசலாம்!','ta-IN');else speak('Hi! I am Babi. Let’s learn together!','en-IN')}));
    setLanguage(lang);
  }

  function inject(){
    addVoiceChoice();
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.textContent=`
      .voice-choice{margin:0 0 16px;padding:14px;border-radius:18px;background:#fff8e8;border:2px solid rgba(107,66,38,.12)}
      .voice-choice-title{font:900 16px/1.2 ui-rounded,system-ui,sans-serif;color:#4b2c18}.voice-choice-sub{margin:5px 0 10px;font:700 12px/1.3 ui-rounded,system-ui,sans-serif;color:#79583e}.voice-choice-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.voice-choice-buttons button{border:2px solid rgba(107,66,38,.12);border-radius:14px;padding:11px;background:#fff;font:900 14px ui-rounded,system-ui,sans-serif;color:#4b2c18}.voice-choice-buttons button.selected{border-color:#6b4226;box-shadow:0 0 0 3px rgba(107,66,38,.1)}
      #babi-global-helper{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;border:0;border-radius:999px;padding:8px 14px 8px 8px;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#fff7df,#ffe7b5);box-shadow:0 7px 22px rgba(70,38,12,.2);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;transition:transform .15s ease,box-shadow .15s ease}#babi-global-helper:active{transform:scale(.95)}#babi-global-helper .face{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:22px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}#babi-global-helper.is-speaking{box-shadow:0 0 0 4px rgba(107,66,38,.12),0 7px 22px rgba(70,38,12,.2)}#babi-helper-bubble{position:fixed;right:14px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:9998;max-width:min(310px,calc(100vw - 28px));padding:12px 14px;border-radius:18px 18px 6px 18px;background:#fff;box-shadow:0 8px 25px rgba(70,38,12,.16);color:#4b2c18;font:800 14px/1.35 ui-rounded,system-ui,sans-serif;display:none}#babi-helper-bubble.show{display:block;animation:babiHelperIn .22s ease}@keyframes babiHelperIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}
    `;document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🐻</span><span>Babi AI • Help</span>';b.setAttribute('aria-label','Ask Babi for page-aware help');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{
      const [en,ta]=context();
      bubble.textContent=lang==='ta'?ta:en;
      bubble.classList.add('show');
      b.classList.add('is-speaking');
      say(en,ta);
      clearTimeout(window.__babiHelperTimer);window.__babiHelperTimer=setTimeout(()=>{bubble.classList.remove('show');b.classList.remove('is-speaking')},7500);
    });
  }
  function hintMessage(){const [en,ta]=[T.hint,T.hintTa];say(en,ta)}
  document.addEventListener('click',function(e){
    const el=e.target?.closest?.('.babi-component');if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>900){window.__lastBabiVoice=now;greeting(getName())}}
    const hint=e.target?.closest?.('#hint,.hint-btn,[data-hint]');if(hint)setTimeout(hintMessage,80);
  },{passive:true});
  if('speechSynthesis' in window)speechSynthesis.onvoiceschanged=()=>{};
  window.BabiVoice={say,greeting,setLanguage,current,hint:hintMessage,supported:('speechSynthesis' in window),stop:()=>{try{speechSynthesis.cancel()}catch{}},context};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
