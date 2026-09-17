// Universal child-page back button. Existing page-specific back buttons are left untouched.
(function(){
  const app=document.querySelector('#app');
  if(!app)return;
  function addBack(){
    const screen=app.querySelector('.screen');
    if(!screen || screen.classList.contains('onboarding'))return;
    const topbar=screen.querySelector('.topbar');
    if(!topbar || topbar.querySelector('.icon-btn'))return;
    const brand=topbar.querySelector('.brand');
    const back=document.createElement('button');
    back.type='button';
    back.className='icon-btn universal-back';
    back.setAttribute('aria-label','Back to My Abacus World');
    back.textContent='←';
    back.onclick=()=>{ location.hash=''; location.reload(); };
    topbar.insertBefore(back,brand||topbar.firstChild);
  }
  new MutationObserver(addBack).observe(app,{childList:true,subtree:true});
  addBack();
})();
