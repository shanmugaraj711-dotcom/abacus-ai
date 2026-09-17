(function(){
  const POSES={idle:'./assets/mascot/babi-idle.svg',pointing:'./assets/mascot/babi-pointing.svg',celebrating:'./assets/mascot/babi-celebrating.svg',encouraging:'./assets/mascot/babi-encouraging.svg',teaching:'./assets/mascot/babi-teaching.svg'};
  function apply(){
    const host=document.querySelector('.world-hero .world-babi');
    if(!host||host.dataset.poseReady)return;
    host.dataset.poseReady='1';
    host.innerHTML='<img class="babi babi-small babi-home-pointing" src="'+POSES.pointing+'" alt="Babi pointing the way">';
    const mission=document.querySelector('.mission');
    if(mission&&!mission.querySelector('.mission-babi')){
      const img=document.createElement('img');img.className='mission-babi';img.src=POSES.encouraging;img.alt='Babi encouraging you';mission.prepend(img);
    }
  }
  if(!document.getElementById('homeBabiStyle')){const s=document.createElement('style');s.id='homeBabiStyle';s.textContent='.babi-home-pointing{width:70px;height:70px;object-fit:contain}.mission{position:relative}.mission-babi{position:absolute;right:74px;bottom:4px;width:48px;height:48px;object-fit:contain;pointer-events:none}';document.head.appendChild(s)}
  const app=document.querySelector('#app');
  if(!app)return;
  apply();
  new MutationObserver(apply).observe(app,{childList:true,subtree:true});
})();
