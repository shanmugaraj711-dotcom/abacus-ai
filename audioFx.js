// Tiny offline audio layer. No external files, no network, loaded after the app shell.
(function(){
  let ctx=null,musicTimer=null,musicOn=false;
  const get=()=>{try{ctx??=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==='suspended')ctx.resume();return ctx}catch{return null}};
  const tone=(freq,start,duration,type='sine',gain=.045)=>{const c=get();if(!c)return;try{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+start);g.gain.setValueAtTime(0,c.currentTime+start);g.gain.linearRampToValueAtTime(gain,c.currentTime+start+.015);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+start+duration);o.connect(g);g.connect(c.destination);o.start(c.currentTime+start);o.stop(c.currentTime+start+duration+.02)}catch{}};
  const success=()=>{tone(523,0,.10,'sine',.05);tone(659,.09,.12,'sine',.05);tone(784,.20,.18,'sine',.055)};
  const levelup=()=>{tone(523,0,.10,'triangle',.05);tone(659,.10,.10,'triangle',.05);tone(784,.20,.10,'triangle',.055);tone(1047,.30,.25,'triangle',.06)};
  const musicTick=()=>{if(!musicOn)return;const notes=[392,440,523,659,523,440,392,330];notes.forEach((n,i)=>tone(n,i*.34,.24,'sine',.012));musicTimer=setTimeout(musicTick,3000)};
  const musicToggle=()=>{const c=get();if(!c)return false;musicOn=!musicOn;if(musicOn){clearTimeout(musicTimer);musicTick()}else clearTimeout(musicTimer);return musicOn};
  const stopMusic=()=>{musicOn=false;clearTimeout(musicTimer)};
  let lastResult=0,lastLevel=0;
  const check=()=>{const now=Date.now();if(document.querySelector('.result-title.coral')&&now-lastResult>700){lastResult=now;success()}if(document.querySelector('.levelup-title')&&now-lastLevel>1200){lastLevel=now;levelup()}};
  document.addEventListener('click',e=>{if(e.target?.closest?.('#check'))setTimeout(check,0);if(e.target?.closest?.('#continue'))setTimeout(check,0)},true);
  new MutationObserver(check).observe(document.getElementById('app')||document.documentElement,{childList:true,subtree:true});
  window.AbacusAudio={success,levelup,musicToggle,stopMusic,isMusicOn:()=>musicOn,supported:!!(window.AudioContext||window.webkitAudioContext)};
})();
