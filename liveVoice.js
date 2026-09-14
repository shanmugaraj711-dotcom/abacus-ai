// Live Voice Babi — optional speech input + Tiny AI + Babi voice output.
// Core learning never depends on this feature. If speech recognition is unavailable,
// the app remains fully usable through normal taps and BabiVoice.
(function(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  let listening=false, recognition=null;
  function say(text){
    if(window.BabiVoice?.say){
      const ta=text,en=text;
      window.BabiVoice.say(en,ta);
    }
  }
  function inject(){
    if(document.getElementById('babi-live-voice'))return;
    const b=document.createElement('button');
    b.id='babi-live-voice';b.type='button';
    b.innerHTML='<span class="live-voice-icon">🎤</span><span class="live-voice-label">Talk to Babi</span>';
    b.setAttribute('aria-label','Talk to Babi');
    const style=document.createElement('style');
    style.textContent=`#babi-live-voice{position:fixed;left:14px;bottom:calc(14px + env(safe-area-inset-bottom));z-index:10000;border:0;border-radius:999px;padding:8px 14px 8px 9px;display:flex;align-items:center;gap:7px;background:#fff;box-shadow:0 7px 22px rgba(70,38,12,.18);color:#4b2c18;font:900 13px ui-rounded,system-ui,sans-serif;touch-action:manipulation}#babi-live-voice:active{transform:scale(.96)}#babi-live-voice.listening{box-shadow:0 0 0 4px rgba(214,70,50,.14),0 7px 22px rgba(70,38,12,.18)}.live-voice-icon{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#fff1df;font-size:19px}.live-voice-label{white-space:nowrap}`;
    document.head.appendChild(style);document.body.appendChild(b);
    b.onclick=()=>listen(b);
  }
  function listen(button){
    if(!SR){
      const r=window.prompt('Voice input is not available in this browser. Type your question for Babi:','');
      if(r)answer(r);return;
    }
    if(listening){try{recognition?.stop()}catch{}return}
    recognition=new SR();recognition.lang=(window.BabiVoice?.current?.()||'ta')==='en'?'en-IN':'ta-IN';recognition.interimResults=false;recognition.maxAlternatives=1;
    listening=true;button.classList.add('listening');button.querySelector('.live-voice-label').textContent='Listening…';
    recognition.onresult=e=>answer(e.results?.[0]?.[0]?.transcript||'');
    recognition.onerror=()=>finish(button,'Try again');
    recognition.onend=()=>finish(button,'Talk to Babi');
    try{recognition.start()}catch{finish(button,'Talk to Babi')}
  }
  function finish(button,label){listening=false;button.classList.remove('listening');if(button.querySelector('.live-voice-label'))button.querySelector('.live-voice-label').textContent=label}
  function answer(input){
    if(!window.TinyAI)return;
    const r=window.TinyAI.ask(input);show(r.text);say(r.text);
  }
  function show(text){
    let bubble=document.getElementById('babi-live-bubble');
    if(!bubble){bubble=document.createElement('div');bubble.id='babi-live-bubble';bubble.innerHTML='<span class="live-babi-face">🐻</span><span class="live-babi-text"></span>';document.body.appendChild(bubble);const s=document.createElement('style');s.textContent=`#babi-live-bubble{position:fixed;left:14px;bottom:calc(72px + env(safe-area-inset-bottom));z-index:9999;max-width:min(330px,calc(100vw - 28px));display:flex;gap:9px;align-items:flex-start;padding:13px 14px;border-radius:18px 18px 18px 6px;background:#fff;box-shadow:0 8px 26px rgba(70,38,12,.18);color:#4b2c18;font:800 14px/1.4 ui-rounded,system-ui,sans-serif;animation:liveBabiIn .2s ease}.live-babi-face{font-size:25px}.live-babi-text{flex:1}@keyframes liveBabiIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`;document.head.appendChild(s)}
    bubble.querySelector('.live-babi-text').textContent=text;clearTimeout(window.__liveBabiTimer);window.__liveBabiTimer=setTimeout(()=>bubble.remove(),9000);
  }
  window.LiveBabiVoice={supported:!!SR,start:()=>document.getElementById('babi-live-voice')?.click(),ask:answer};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',inject);else inject();
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
