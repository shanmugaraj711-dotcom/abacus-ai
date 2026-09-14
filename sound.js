const KEY='abacus-ai-sound-v1';
let enabled=true;
try{enabled=localStorage.getItem(KEY)!=='off'}catch{}
let audio=null;

function ctx(){
  if(!audio) audio=new (window.AudioContext||window.webkitAudioContext)();
  if(audio.state==='suspended') audio.resume();
  return audio;
}
function tone(freq,duration=.12,type='sine',gain=.06,delay=0){
  if(!enabled) return;
  try{
    const c=ctx(),o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay;
    o.type=type;o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(c.destination);o.start(t);o.stop(t+duration+.03);
  }catch(e){}
}
function tap(){tone(620,.055,'square',.035)}
function bead(){tone(330,.08,'triangle',.055);tone(470,.09,'triangle',.045,.035)}
function correct(){[523,659,784].forEach((f,i)=>tone(f,.18,'triangle',.075,i*.075))}
function wrong(){tone(260,.16,'sine',.055);tone(190,.2,'sine',.045,.1)}
function levelup(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,.2,'triangle',.08,i*.09))}
function cheer(){tone(880,.12,'triangle',.07);tone(1175,.18,'triangle',.06,.09)}
function setEnabled(v){enabled=v;try{localStorage.setItem(KEY,v?'on':'off')}catch{}renderButton();if(v)correct()}
function renderButton(){
  let b=document.querySelector('#sound-toggle');
  if(!b){
    b=document.createElement('button');b.id='sound-toggle';b.type='button';b.setAttribute('aria-label','Toggle sound');
    b.onclick=e=>{e.stopPropagation();setEnabled(!enabled)};
    document.body.appendChild(b);
  }
  b.textContent=enabled?'🔊':'🔇';b.title=enabled?'Sound on':'Sound off';
}
const css=document.createElement('style');
css.textContent=`#sound-toggle{position:fixed;right:14px;bottom:14px;z-index:999;width:48px;height:48px;border:0;border-radius:50%;background:#4B2C18;color:#fff;font-size:21px;box-shadow:0 5px 12px rgba(50,25,10,.3);cursor:pointer}#sound-toggle:active{transform:scale(.9)}`;
document.head.appendChild(css);

document.addEventListener('click',e=>{
  const el=e.target.closest('button');
  if(!el||el.id==='sound-toggle')return;
  if(el.matches('.bead,[data-upper],[data-lower]')) bead();
  else tap();
  if(el.id==='check'){
    setTimeout(()=>{
      if(document.querySelector('.result-title.coral')) correct();
      else if(document.querySelector('.result-title:not(.coral)')) wrong();
    },60);
  }
  if(el.id==='continue' && document.querySelector('.levelup-title')) levelup();
});

let celebratedLevelup=false;
const observer=new MutationObserver(()=>{
  const visible=!!document.querySelector('.levelup-title');
  if(visible&&!celebratedLevelup){celebratedLevelup=true;levelup();}
  if(!visible)celebratedLevelup=false;
});
observer.observe(document.body,{childList:true,subtree:true});
window.abacusSound={setEnabled,isEnabled:()=>enabled,correct,wrong,levelup,cheer};
renderButton();
