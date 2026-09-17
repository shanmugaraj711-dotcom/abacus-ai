// Babi voice: single-utterance, responsive, offline-safe.
(function(){
  const T={
    world:(n,l,s)=>s?`Hi ${n}! You have ${s} stars on Level ${l}. Let's get one more!`:`Hi ${n}! Babi is ready. Shall we learn Abacus?`,
    worldTa:(n,l,s)=>s?`ஹாய் ${n}! Level ${l}-ல உனக்கு ${s} stars இருக்கு. இன்னொரு star வாங்கலாமா?`:`ஹாய் ${n}! இப்போ நாம Abacus கத்துக்கலாம்.`,
    learn:(n,t)=>`Hi ${n}! Let's learn ${t||'one small Abacus idea'} together. Watch, try, then check your beads!`,
    learnTa:(n,t)=>`ஹாய் ${n}! ${t||'ஒரு சின்ன Abacus idea'} கத்துக்கலாம். முதல்ல பாரு, அப்புறம் try பண்ணி check பண்ணு!`,
    practice:(n,p)=>`Your turn, ${n}! ${p?`${p}. `:''}Move the beads and tap Check.`,
    practiceTa:(n,p)=>`இப்போ உன் turn, ${n}! ${p?`${p}. `:''}Beads-ஐ move பண்ணி Check-ஐ tap பண்ணு.`,
    play:n=>`Game time, ${n}! Ready to play with the beads?`,
    playTa:n=>`கேம் time, ${n}! Beads-ல play பண்ணலாமா?`,
    levels:(n,l)=>`Hi ${n}! Level ${l} is your next challenge. Let's go!`,
    levelsTa:(n,l)=>`ஹாய் ${n}! Level ${l} உன் அடுத்த challenge. வாங்க போகலாம்!`,
    right:n=>`Wow ${n}! Super job! You got it right!`,
    rightTa:n=>`வாவ் ${n}! சூப்பர்! நீ சரியா பண்ணிட்ட!`,
    wrong:n=>`That's okay, ${n}! Look at the hint and try one small bead move again.`,
    wrongTa:n=>`பரவாயில்லை ${n}! Hint-ஐ பாரு. இன்னொரு சின்ன bead move பண்ணிப் பாரு.`,
    level:n=>`Yay ${n}! You finished the level! Babi is proud of you!`,
    levelTa:n=>`யேய் ${n}! நீ Level-ஐ முடிச்சிட்ட! Babi-க்கு ரொம்ப சந்தோஷம்!`,
    hint:`Tiny clue! Look at the numbers and move only the beads you need.`,
    hintTa:`சின்ன clue! Numbers-ஐ பாரு. தேவையான beads-ஐ மட்டும் move பண்ணு.`,
    locked:n=>`Let's finish your unlocked levels first, ${n}!`,
    lockedTa:n=>`முதல்ல unlock ஆன levels-ஐ முடிக்கலாம், ${n}!`,
    greeting:n=>`Hi ${n}! I am Babi. Shall we learn some bead magic?`,
    greetingTa:n=>`ஹாய் ${n}! நான் Babi. Beads-ல magic கத்துக்கலாமா?`
  };
  let lang='en';try{lang=localStorage.getItem('abacus-ai-language')==='ta'?'ta':'en'}catch{}
  const hasSpeech='speechSynthesis' in window;
  const profile=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')||{}}catch{return {}}};
  const progress=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-progress-v2')||'null')||{}}catch{return {}}};
  const name=()=>profile().name||'friend';
  let voiceCache=[];
  const refreshVoices=()=>{voiceCache=hasSpeech?(speechSynthesis.getVoices?.()||[]):[]};
  if(hasSpeech){refreshVoices();speechSynthesis.addEventListener?.('voiceschanged',refreshVoices)}
  const pickVoice=code=>{const base=code.split('-')[0].toLowerCase(),list=voiceCache.length?voiceCache:(refreshVoices(),voiceCache),same=list.filter(v=>(v.lang||'').toLowerCase().startsWith(base));return same.find(v=>/natural|neural|enhanced|premium|microsoft|google/i.test(v.name))||same[0]||null};
  const stop=()=>{try{speechSynthesis.cancel()}catch{}};
  function speak(text,code){if(!hasSpeech)return false;try{stop();const raw=String(text).replace(/\s+/g,' ').trim();if(!raw)return false;const u=new SpeechSynthesisUtterance(raw);u.lang=code;u.voice=pickVoice(code);u.volume=1;u.rate=code==='ta-IN'?1.08:1.12;u.pitch=1.08;u.onend=()=>window.dispatchEvent(new Event('babi:done'));u.onerror=()=>window.dispatchEvent(new Event('babi:done'));speechSynthesis.speak(u);return true}catch{return false}}
  const say=(en,ta)=>speak(lang==='ta'?ta:en,lang==='ta'?'ta-IN':'en-IN');
  function setLanguage(v){lang=v==='ta'?'ta':'en';try{localStorage.setItem('abacus-ai-language',lang)}catch{}document.querySelectorAll('[data-voice-lang],[data-boot-lang]').forEach(b=>b.classList.toggle('selected',(b.dataset.voiceLang||b.dataset.bootLang)===lang))}
  function context(){
    const n=name(),g=progress(),l=Number(g.currentLevel||1),s=Number(g.streak||0),has=s=>!!document.querySelector(s),text=(document.body?.innerText||'').replace(/\s+/g,' ').trim();
    if(has('.levelup-title'))return [T.level(n),T.levelTa(n)];
    if(has('.result-title')){const ok=!!document.querySelector('.result-title.coral');return [ok?T.right(n):T.wrong(n),ok?T.rightTa(n):T.wrongTa(n)];}
    if(has('.wall-card'))return [T.locked(n),T.lockedTa(n)];
    if(has('.practice-meta')||has('.problem')||has('#check')){const m=text.match(/(\d+)\s*([+−-])\s*(\d+)\s*=\s*\?/);const p=m?`${m[1]} ${m[2]} ${m[3]}`:'';return [T.practice(n,p),T.practiceTa(n,p)];}
    if(has('.lesson-card')||text.toLowerCase().includes('abacus adventure')){const t=document.querySelector('.lesson-card h1')?.textContent?.trim()||'';return [T.learn(n,t),T.learnTa(n,t)];}
    if(has('.game-grid')||text.toLowerCase().includes('playroom'))return [T.play(n),T.playTa(n)];
    if(has('.world-levels')||text.toLowerCase().includes('master path'))return [T.levels(n,l),T.levelsTa(n,l)];
    return [T.world(n,l,s),T.worldTa(n,l,s)];
  }
  function inject(){
    if(document.getElementById('babi-global-helper'))return;
    const style=document.createElement('style');style.id='babi-voice-style';style.textContent=`#babi-global-helper{position:fixed;right:10px;bottom:max(9px,env(safe-area-inset-bottom));z-index:9999;width:46px;height:46px;padding:0;border:2px solid rgba(107,66,38,.18);border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#fff7df,#ffd98d);box-shadow:0 5px 15px rgba(70,38,12,.20);cursor:pointer;touch-action:manipulation}#babi-global-helper .face{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:21px}#babi-helper-bubble{position:fixed;right:10px;bottom:max(62px,calc(53px + env(safe-area-inset-bottom)));z-index:9998;max-width:min(255px,calc(100vw - 30px));padding:11px 13px;border-radius:17px 17px 6px 17px;background:#fff;box-shadow:0 7px 20px rgba(70,38,12,.16);color:#4b2c18;font:800 13px/1.4 ui-rounded,system-ui,sans-serif;display:none;pointer-events:none}#babi-helper-bubble.show{display:block}`;document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🐻</span>';b.setAttribute('aria-label','Tap Babi to hear the page');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:en;bubble.classList.add('show');say(en,ta);clearTimeout(window.__babiHelperTimer);window.__babiHelperTimer=setTimeout(()=>bubble.classList.remove('show'),4500)});
  }
  function hint(){say(T.hint,T.hintTa)}
  document.addEventListener('click',e=>{if(e.target?.closest?.('#hint,.hint-btn,[data-hint]'))setTimeout(hint,60)},{passive:true});
  window.BabiVoice={say,greeting:n=>say(T.greeting(n),T.greetingTa(n)),setLanguage,current:()=>lang,hint,supported:hasSpeech,stop,context};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
