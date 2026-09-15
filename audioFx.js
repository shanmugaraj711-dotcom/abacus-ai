// Offline kid-friendly audio. No external files or network audio.
(function(){
  let ctx=null, master=null, musicTimer=null, musicOn=false;
  const supported=!!(window.AudioContext||window.webkitAudioContext);
  const get=()=>{
    if(!supported)return null;
    try{
      if(!ctx){ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();master.gain.value=.72;master.connect(ctx.destination)}
      if(ctx.state==='suspended')ctx.resume().catch(()=>{});
      return ctx;
    }catch{return null}
  };
  const tone=(freq,start=0,duration=.12,type='sine',gain=.06)=>{
    const c=get();if(!c||!master)return;
    try{const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+start;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.03)}catch{}
  };
  const click=()=>{tone(720,0,.045,'triangle',.035);tone(980,.035,.055,'sine',.025)};
  const babiCue=()=>{tone(587,0,.07,'triangle',.045);tone(880,.07,.11,'sine',.05)};
  const success=()=>{[523,659,784,988].forEach((n,i)=>tone(n,i*.075,.16,'sine',.065));tone(1175,.29,.20,'triangle',.05)};
  const levelup=()=>{[392,523,659,784,988,1175].forEach((n,i)=>tone(n,i*.09,.20,'triangle',.07));tone(1319,.55,.34,'sine',.075)};
  const musicTick=()=>{if(!musicOn)return;const notes=[523,659,784,659,587,698,880,698,523,659,784,988,784,659,587,523];notes.forEach((n,i)=>tone(n,i*.19,.16,i%4===0?'triangle':'sine',.035));musicTimer=setTimeout(musicTick,3100)};
  const musicToggle=()=>{const c=get();if(!c)return false;musicOn=!musicOn;clearTimeout(musicTimer);if(musicOn){tone(659,0,.10,'triangle',.055);tone(784,.10,.14,'triangle',.06);musicTick()}return musicOn};
  const stopMusic=()=>{musicOn=false;clearTimeout(musicTimer)};
  let lastResult=0,lastLevel=0;
  const checkState=()=>{const now=Date.now();const result=document.querySelector('.result-title');if(result&&now-lastResult>700){lastResult=now;result.classList.contains('coral')?success():tone(220,0,.12,'sine',.035)}const level=document.querySelector('.levelup-title');if(level&&now-lastLevel>1200){lastLevel=now;levelup()}};
  document.addEventListener('click',e=>{const el=e.target?.closest?.('button,[role="button"],.bead');if(el&&!el.matches('#check,#continue,.kid-music'))click();if(e.target?.closest?.('#check,#continue'))setTimeout(checkState,40)},true);
  new MutationObserver(checkState).observe(document.getElementById('app')||document.documentElement,{childList:true,subtree:true});
  window.AbacusAudio={click,babiCue,success,levelup,musicToggle,stopMusic,isMusicOn:()=>musicOn,supported};
})();
