// Bridge the Babi Brain screen to the deterministic TinyAI engine.
// Event delegation keeps it working after challengeApp rerenders the screen.
(function(){
  document.addEventListener('click',function(e){
    const btn=e.target.closest('#brainAsk');
    if(!btn)return;
    const input=document.querySelector('#brainInput');
    const reply=document.querySelector('#brainReply');
    if(!input||!reply||!window.TinyAI?.ask)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const result=window.TinyAI.ask(input.value);
    reply.textContent=result.text;
    reply.setAttribute('role','status');
  },true);
})();
