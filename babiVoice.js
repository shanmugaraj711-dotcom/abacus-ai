// Babi voice: playful, page-aware and offline/PWA safe.
// Tamil mode intentionally uses easy Tanglish: Tamil + familiar English product words.
// Uses the device's SpeechSynthesis voice; no network voice service is required.
(function(){
  const T={
    world:(n,l,s)=>s?`Hey ${n}! 🌟 Level ${l}, ${s} stars! Let's beat your best!`:`Hi ${n}! 👋 Babi is ready! Pick Learn, Practise or Play!`,
    worldTa:(n,l,s)=>s?`ஹேய் ${n}! 🌟 லெவல் ${l}, ${s} ஸ்டார்ஸ்! உன் பெஸ்ட்டை beat பண்ணலாம்!`:`ஹாய் ${n}! 👋 பாபி ரெடி! Learn, Practise அல்லது Play-ஐ தேர்வு பண்ணு!`,
    learn:(n,t)=>`Awesome choice, ${n}! ✨ ${t||'One tiny abacus idea'}. Watch me, then you try!`,
    learnTa:(n,t)=>`சூப்பர் சாய்ஸ், ${n}! ✨ ${t||'ஒரு சின்ன Abacus idea'}. முதலில் பாரு, அப்புறம் நீ try பண்ணலாம்!`,
    practice:(n,p)=>`Your turn, ${n}! 🎯 ${p?`${p} — `:''}Move the beads, make the number, then tap Check!`,
    practiceTa:(n,p)=>`இப்போ உன் turn, ${n}! 🎯 ${p?`${p} — `:''}மணிகளை move பண்ணி, answer உருவாக்கி, Check பண்ணு!`,
    play:n=>`Game time, ${n}! 🎮 Ready... set... beads! Babi is cheering for you!`,
    playTa:n=>`கேம் டைம், ${n}! 🎮 ரெடி... செட்... மணிகள்! பாபி உன்னை cheer பண்ணுறேன்!`,
    levels:(n,l)=>`Master Path time, ${n}! 🏆 Level ${l} is your next little adventure.`,
    levelsTa:(n,l)=>`Master Path டைம், ${n}! 🏆 லெவல் ${l} உன் அடுத்த சின்ன adventure.`,
    right:n=>`Woohoo, ${n}! 🎉 Nailed it! Your beads got it right!`,
    rightTa:n=>`வூஹூ, ${n}! 🎉 சூப்பர்! உன் மணிகள் சரியான answer கண்டுபிடிச்சுடுச்சு!`,
    wrong:n=>`Oopsie, ${n}! 💛 That's okay. Shake it off and try one more bead move!`,
    wrongTa:n=>`அச்சச்சோ, ${n}! 💛 பரவாயில்லை. மீண்டும் ஒரு bead move பண்ணிப் பாரு!`,
    level:n=>`Ta-da, ${n}! 🏆 Level complete! Babi is super proud.`,
    levelTa:n=>`டா-டா, ${n}! 🏆 Level முடிச்சிட்ட! பாபிக்கு ரொம்ப சந்தோஷம்!`,
    hint:`Tiny clue! 💡 Look at the operation, then move only the beads you need.`,
    hintTa:`சின்ன clue! 💡 முதலில் operation-ஐ பாரு. தேவையான beads-ஐ மட்டும் move பண்ணு.`,
    help:`Babi is here! 🐻 Tell me what's tricky and we'll solve it one tiny step at a time.`,
    helpTa:`பாபி இங்கேதான்! 🐻 எது கஷ்டம் என்று சொல்லு. ஒவ்வொரு சின்ன step-ஆக சேர்ந்து செய்வோம்!`,
    locked:n=>`Aha! 🔒 You found a future adventure, ${n}. First, let's master your free levels!`,
    lockedTa:n=>`ஆஹா! 🔒 Future adventure கிடைச்சுடுச்சு, ${n}. முதலில் free levels-ஐ master பண்ணலாம்!`,
    greeting:n=>`Hey ${n}! 👋 It's Babi! Let's make some bead magic!`,
    greetingTa:n=>`ஹாய் ${n}! 👋 நான் பாபி பேசுகிறேன்! நம்ம இப்போ Abacus கத்துக்கலாம்!`
  };
  let lang='en',speaking=false;try{lang=localStorage.getItem('abacus-ai-language')==='ta'?'ta':'en'}catch{}
  const hasSpeech='speechSynthesis' in window;
  const voices=()=>hasSpeech&&speechSynthesis.getVoices?speechSynthesis.getVoices():[];
  const pickVoice=code=>{const list=voices(),base=code.split('-')[0],exact=list.filter(v=>v.lang?.toLowerCase()===code.toLowerCase()),same=list.filter(v=>v.lang?.toLowerCase().startsWith(base));const pool=exact.length?exact:same;return pool.find(v=>/natural|neural|enhanced|premium|google|microsoft|female|woman|girl/i.test(v.name))||pool[0]||null};
  const split=text=>String(text).replace(/\s+/g,' ').trim().match(/[^.!?।！？]+[.!?।！？]?/g)||[String(text)];
  function speak(text,code){
    if(!hasSpeech)return false;
    try{speechSynthesis.cancel();const parts=split(text);let i=0;speaking=true;window.AbacusAudio?.babiCue?.();const next=()=>{if(i>=parts.length){speaking=false;return}const u=new SpeechSynthesisUtterance(parts[i++]);u.lang=code;u.voice=pickVoice(code);u.volume=1;u.rate=code.startsWith('ta')?.84:.91;u.pitch=code.startsWith('ta')?1.16:(i%2?1.24:1.32);u.onend=()=>setTimeout(next,100);u.onerror=()=>setTimeout(next,50);speechSynthesis.speak(u)};next();return true}catch{speaking=false;return false}
  }
  const say=(en,ta)=>lang==='ta'?speak(ta,'ta-IN'):speak(en,'en-IN');
  const profile=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')||{}}catch{return {}}};
  const progress=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-progress-v2')||'null')||{}}catch{return {}}};
  const name=()=>profile().name||'friend';
  function setLanguage(v){lang=v==='ta'?'ta':'en';try{localStorage.setItem('abacus-ai-language',lang)}catch{}document.querySelectorAll('[data-voice-lang],[data-boot-lang]').forEach(b=>b.classList.toggle('selected',(b.dataset.voiceLang||b.dataset.bootLang)===lang))}
  function context(){
    const n=name(),g=progress(),l=Number(g.currentLevel||1),s=Number(g.streak||0),has=s=>!!document.querySelector(s),text=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
    if(has('.levelup-title'))return [T.level(n),T.levelTa(n)];
    if(has('.result-title')){const ok=!!document.querySelector('.result-title.coral');return [ok?T.right(n):T.wrong(n),ok?T.rightTa(n):T.wrongTa(n)];}
    if(has('.wall-card'))return [T.locked(n),T.lockedTa(n)];
    if(has('.practice-meta')||has('.problem')||has('#check')){const m=text.match(/(\d+)\s*([+−-])\s*(\d+)\s*=\s*\?/);const p=m?`${m[1]} ${m[2]} ${m[3]}`:'';return [T.practice(n,p),T.practiceTa(n,p)];}
    if(has('.learning-lesson-card')||text.toLowerCase().includes('learn, one little step')){const t=document.querySelector('.learning-lesson-card h1')?.textContent?.trim()||'';return [T.learn(n,t),T.learnTa(n,t)];}
    if(has('.lesson-card')||text.toLowerCase().includes('abacus adventure')){const t=document.querySelector('.lesson-card h1')?.textContent?.trim()||'';return [T.learn(n,t),T.learnTa(n,t)];}
    if(has('.game-grid')||text.toLowerCase().includes('playroom'))return [T.play(n),T.playTa(n)];
    if(has('.world-levels')||text.toLowerCase().includes('master path'))return [T.levels(n,l),T.levelsTa(n,l)];
    return [T.world(n,l,s),T.worldTa(n,l,s)];
  }
  function inject(){
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.id='babi-voice-style';style.textContent=`#babi-global-helper{position:fixed;right:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:9999;border:0;border-radius:999px;padding:8px 14px 8px 8px;display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#fff7df,#ffe7b5);box-shadow:0 7px 22px rgba(70,38,12,.2);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;cursor:pointer;touch-action:manipulation;transition:transform .15s ease,box-shadow .15s ease}#babi-global-helper:active{transform:scale(.95)}#babi-global-helper .face{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:23px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}#babi-global-helper.is-speaking{animation:babiTalk .5s ease-in-out infinite alternate;box-shadow:0 0 0 5px rgba(255,177,55,.18),0 7px 22px rgba(70,38,12,.2)}#babi-helper-bubble{position:fixed;right:14px;bottom:calc(74px + env(safe-area-inset-bottom));z-index:9998;max-width:min(320px,calc(100vw - 28px));padding:13px 15px;border-radius:19px 19px 7px 19px;background:#fff;box-shadow:0 8px 25px rgba(70,38,12,.16);color:#4b2c18;font:800 14px/1.4 ui-rounded,system-ui,sans-serif;display:none}#babi-helper-bubble.show{display:block;animation:babiIn .22s ease}@keyframes babiIn{from{opacity:0;transform:translateY(8px) scale(.96)}to{opacity:1;transform:none}}@keyframes babiTalk{to{transform:translateY(-3px) rotate(2deg)}}`;document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🐻</span><span>Babi • Let\'s go!</span>';b.setAttribute('aria-label','Tap Babi to hear the page');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:en;bubble.classList.add('show');b.classList.add('is-speaking');say(en,ta);clearTimeout(window.__babiHelperTimer);window.__babiHelperTimer=setTimeout(()=>{bubble.classList.remove('show');b.classList.remove('is-speaking')},7000)});
  }
  function hint(){say(T.hint,T.hintTa)}
  document.addEventListener('click',e=>{const el=e.target?.closest?.('.babi-component');if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>900){window.__lastBabiVoice=now;say(T.greeting(name()),T.greetingTa(name()))}}if(e.target?.closest?.('#hint,.hint-btn,[data-hint]'))setTimeout(hint,100)},{passive:true});
  window.BabiVoice={say,greeting:n=>say(T.greeting(n),T.greetingTa(n)),setLanguage,current:()=>lang,hint,supported:hasSpeech,stop:()=>{try{speechSynthesis.cancel()}catch{}},context};
  if(hasSpeech)speechSynthesis.onvoiceschanged=()=>{};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
