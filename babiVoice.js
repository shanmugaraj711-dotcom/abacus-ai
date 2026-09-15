// Babi voice: simple, child-friendly, page-aware and offline/PWA safe.
(function(){
  const T={
    world:(n,l,s)=>s?`Hi ${n}! You have ${s} stars on Level ${l}. Let's get one more!`:`Hi ${n}! Babi is ready. Shall we learn Abacus? If you have a doubt, ask Babi!`,
    worldTa:(n,l,s)=>s?`ஹாய் ${n}! Level ${l}-ல உனக்கு ${s} stars இருக்கு. இன்னொரு star வாங்கலாமா?`:`ஹாய் ${n}! இப்போ நாம Abacus கத்துக்கலாம். ஏதாவது doubt இருந்தா Babi-யை கேளு!`,
    learn:(n,t)=>`Hi ${n}! 🌱 Let's learn ${t||'one small Abacus idea'} together. First watch, then you try!`,
    learnTa:(n,t)=>`ஹாய் ${n}! 🌱 இப்போ நாம ${t||'ஒரு சின்ன Abacus idea'} கத்துக்கலாம். முதல்ல பாரு, அப்புறம் நீ try பண்ணு!`,
    practice:(n,p)=>`Your turn, ${n}! 🎯 ${p?`${p}. `:''}Move the beads and make the answer. Then tap Check!`,
    practiceTa:(n,p)=>`இப்போ உன் turn, ${n}! 🎯 ${p?`${p}. `:''}Beads-ஐ move பண்ணி answer பண்ணு. அப்புறம் Check-ஐ tap பண்ணு!`,
    play:n=>`Game time, ${n}! 🎮 Ready? Let's play with the beads!`,
    playTa:n=>`கேம் time, ${n}! 🎮 Ready-ஆ? வாங்க beads-ல play பண்ணலாம்!`,
    levels:(n,l)=>`Hi ${n}! 🏆 Level ${l} is your next little challenge. Let's go!`,
    levelsTa:(n,l)=>`ஹாய் ${n}! 🏆 Level ${l} உன் அடுத்த சின்ன challenge. வாங்க போகலாம்!`,
    right:n=>`Wow ${n}! 🎉 Super job! You got it right!`,
    rightTa:n=>`வாவ் ${n}! 🎉 சூப்பர்! நீ சரியா பண்ணிட்ட!`,
    wrong:n=>`That's okay, ${n}! 💛 Try one small bead move again.`,
    wrongTa:n=>`பரவாயில்லை ${n}! 💛 இன்னொரு சின்ன bead move பண்ணிப் பாரு.`,
    level:n=>`Yay ${n}! 🏆 You finished the level! Babi is proud of you!`,
    levelTa:n=>`யேய் ${n}! 🏆 நீ Level-ஐ முடிச்சிட்ட! Babi-க்கு ரொம்ப சந்தோஷம்!`,
    hint:`Tiny clue! 💡 Look at the numbers and move only the beads you need.`,
    hintTa:`சின்ன clue! 💡 Numbers-ஐ பாரு. தேவையான beads-ஐ மட்டும் move பண்ணு.`,
    locked:n=>`Let's finish the free levels first, ${n}! Then we can explore more.`,
    lockedTa:n=>`முதல்ல free levels-ஐ முடிக்கலாம், ${n}! அப்புறம் இன்னும் explore பண்ணலாம்.`,
    greeting:n=>`Hi ${n}! 👋 I am Babi. Shall we learn some bead magic?`,
    greetingTa:n=>`ஹாய் ${n}! 👋 நான் Babi. இப்போ நாம beads-ல magic கத்துக்கலாமா?`
  };
  let lang='en';try{lang=localStorage.getItem('abacus-ai-language')==='ta'?'ta':'en'}catch{}
  const hasSpeech='speechSynthesis' in window;
  const profile=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-profile-v2')||'null')||{}}catch{return {}}};
  const progress=()=>{try{return JSON.parse(localStorage.getItem('abacus-ai-progress-v2')||'null')||{}}catch{return {}}};
  const name=()=>profile().name||'friend';
  let voiceCache=[];
  const refreshVoices=()=>{voiceCache=hasSpeech?(speechSynthesis.getVoices?.()||[]):[]};
  if(hasSpeech){refreshVoices();speechSynthesis.addEventListener?.('voiceschanged',refreshVoices)}
  const voices=()=>voiceCache.length?voiceCache:(refreshVoices(),voiceCache);
  const pickVoice=code=>{const base=code.split('-')[0].toLowerCase(),list=voices(),same=list.filter(v=>(v.lang||'').toLowerCase().startsWith(base));return same.find(v=>/natural|neural|enhanced|premium|microsoft|google/i.test(v.name))||same[0]||null};
  const stop=()=>{try{speechSynthesis.cancel()}catch{}};
  function speakMixed(text){
    if(!hasSpeech)return false;
    try{
      stop();
      const raw=String(text).replace(/\s+/g,' ').trim();
      if(!raw)return false;
      // Keep code-switched speech in a few larger chunks. The old implementation
      // queued many tiny utterances, which made Android feel delayed and laggy.
      const parts=raw.match(/[\u0B80-\u0BFF]+(?:[\u0B80-\u0BFF'’\-]*\s+[\u0B80-\u0BFF'’\-]+)*|[A-Za-z0-9]+(?:[\s'’+−=-][A-Za-z0-9]+)*/g)||[raw];
      let i=0;
      const next=()=>{
        if(i>=parts.length)return;
        const part=parts[i++].trim();if(!part)return next();
        const tamil=/[\u0B80-\u0BFF]/.test(part);
        const u=new SpeechSynthesisUtterance(part);
        u.lang=tamil?'ta-IN':'en-IN';u.voice=pickVoice(u.lang);u.volume=1;u.rate=tamil?1.0:1.05;u.pitch=1.12;
        u.onend=next;u.onerror=next;speechSynthesis.speak(u);
      };
      next();return true;
    }catch{return false}
  }
  const say=(en,ta)=>lang==='ta'?speakMixed(ta):speakMixed(en);
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
    const style=document.createElement('style');style.id='babi-voice-style';style.textContent=`#babi-global-helper{position:fixed;right:10px;bottom:max(9px,env(safe-area-inset-bottom));z-index:9999;width:46px;height:46px;padding:0;border:2px solid rgba(107,66,38,.18);border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,#fff7df,#ffd98d);box-shadow:0 5px 15px rgba(70,38,12,.20);cursor:pointer;touch-action:manipulation;transition:transform .18s ease,box-shadow .18s ease}#babi-global-helper .face{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:#f3c38c;font-size:21px;box-shadow:inset 0 -2px 0 rgba(90,45,10,.12)}#babi-global-helper:active{transform:scale(.90)}#babi-global-helper.is-speaking{animation:babiTalk .55s ease-in-out infinite alternate;box-shadow:0 0 0 4px rgba(255,177,55,.20),0 5px 15px rgba(70,38,12,.20)}#babi-helper-bubble{position:fixed;right:10px;bottom:max(62px,calc(53px + env(safe-area-inset-bottom)));z-index:9998;max-width:min(255px,calc(100vw - 30px));padding:11px 13px;border-radius:17px 17px 6px 17px;background:#fff;box-shadow:0 7px 20px rgba(70,38,12,.16);color:#4b2c18;font:800 13px/1.4 ui-rounded,system-ui,sans-serif;display:none;pointer-events:none}#babi-helper-bubble.show{display:block;animation:babiIn .2s ease}@keyframes babiIn{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:none}}@keyframes babiTalk{to{transform:translateY(-3px) rotate(3deg)}}`;
    document.head.appendChild(style);
    const b=document.createElement('button');b.id='babi-global-helper';b.type='button';b.innerHTML='<span class="face">🐻</span>';b.setAttribute('aria-label','Tap Babi to hear the page');
    const bubble=document.createElement('div');bubble.id='babi-helper-bubble';document.body.appendChild(bubble);document.body.appendChild(b);
    b.addEventListener('click',()=>{const [en,ta]=context();bubble.textContent=lang==='ta'?ta:en;bubble.classList.add('show');b.classList.add('is-speaking');say(en,ta);clearTimeout(window.__babiHelperTimer);window.__babiHelperTimer=setTimeout(()=>{bubble.classList.remove('show');b.classList.remove('is-speaking')},6500)});
  }
  function hint(){say(T.hint,T.hintTa)}
  document.addEventListener('click',e=>{const el=e.target?.closest?.('.babi-component');if(el){const now=Date.now();if(now-(window.__lastBabiVoice||0)>900){window.__lastBabiVoice=now;say(T.greeting(name()),T.greetingTa(name()))}}if(e.target?.closest?.('#hint,.hint-btn,[data-hint]'))setTimeout(hint,100)},{passive:true});
  window.BabiVoice={say,greeting:n=>say(T.greeting(n),T.greetingTa(n)),setLanguage,current:()=>lang,hint,supported:hasSpeech,stop,context};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
})();
