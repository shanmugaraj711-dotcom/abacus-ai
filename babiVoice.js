// Babi voice guidance: simple Tamil + English for children who may not read English yet.
// Uses the device/browser SpeechSynthesis API; no network or external service.
(function(){
  const T={greeting:(name)=>`Hi ${name}! Shall we start with some dance?`,greetingTa:(name)=>`ஹாய் ${name}! ஒரு சின்ன டான்ஸ் பண்ணலாமா?`,tryIt:'Try it!',tryItTa:'நீயே செய்து பார்!',look:'Look at the abacus.',lookTa:'அபாகஸைப் பாரு.',moveOne:'Move one bead.',moveOneTa:'ஒரு மணியை நகர்த்து.',great:'Great job!',greatTa:'சூப்பர்! நல்லா செய்தாய்!',again:'Try again.',againTa:'மறுபடியும் முயற்சி செய்!',choose:'Tap and choose one.',chooseTa:'ஒன்றைத் தொட்டு தேர்வு செய்.',listen:'Listen to Babi.',listenTa:'பாபி சொல்வதைக் கேள்!'};
  let lang=localStorage.getItem('abacus-ai-language')||'ta-en';
  function speak(text,code){if(!('speechSynthesis' in window))return false;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=code||'en-IN';u.rate=.88;u.pitch=1.08;u.volume=1;speechSynthesis.speak(u);return true}catch(e){return false}}
  function say(en,ta){if(lang==='en')return speak(en,'en-IN');if(lang==='ta')return speak(ta,'ta-IN');speak(ta,'ta-IN');setTimeout(()=>speak(en,'en-IN'),1200);return true}
  function greeting(name){if(lang==='en')return speak(T.greeting(name),'en-IN');if(lang==='ta')return speak(T.greetingTa(name),'ta-IN');speak(T.greetingTa(name),'ta-IN');setTimeout(()=>speak(T.greeting(name),'en-IN'),1500)}
  function setLanguage(value){lang=value;localStorage.setItem('abacus-ai-language',value)}
  function current(){return lang}
  function getName(){try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')?.name||'friend'}catch(e){return 'friend'}}
  document.addEventListener('click',function(e){const el=e.target?.closest?.('.babi-component');if(!el)return;const now=Date.now();if(now-(window.__lastBabiVoice||0)<700)return;window.__lastBabiVoice=now;greeting(getName())},{passive:true});
  window.BabiVoice={say,greeting,setLanguage,current,supported:('speechSynthesis' in window)};
})();
