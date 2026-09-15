/* Zero-start learning coach: makes the first abacus explanation impossible to miss. */
(function(){
  const STYLE_ID='zero-start-coach-style';
  const style=()=>{
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style'); s.id=STYLE_ID; s.textContent=`
      .zero-start-card{margin:12px 0 14px;padding:16px;border-radius:20px;background:#fff7d8;border:2px solid rgba(107,66,38,.14);text-align:left;box-shadow:0 5px 0 rgba(107,66,38,.06)}
      .zero-start-card h2{margin:0 0 6px;font-size:20px}.zero-start-card p{margin:5px 0;line-height:1.45}.zero-start-card ol{margin:10px 0 0;padding-left:23px}.zero-start-card li{margin:7px 0;line-height:1.4}
      .zero-start-label{display:inline-block;margin-bottom:5px;font-weight:1000;font-size:13px;letter-spacing:.06em;text-transform:uppercase;opacity:.72}
      .zero-start-hint{display:flex;align-items:center;gap:9px;width:100%;margin:0 0 12px;padding:13px 15px;border:2px solid rgba(107,66,38,.14);border-radius:16px;background:#fff;color:#4b2c18;font-weight:1000;text-align:left;cursor:pointer}
      .zero-start-hint span{font-size:22px}.zero-start-hint-panel{display:none;margin:-4px 0 14px;padding:13px 15px;border-radius:16px;background:#fffdf2;border:2px dashed rgba(107,66,38,.16);line-height:1.45;text-align:left}.zero-start-hint-panel.show{display:block}
      .zero-start-bead-note{margin:0 0 12px;padding:10px 13px;border-radius:14px;background:#f5ead3;font-weight:900;font-size:14px;text-align:center}
    `; document.head.appendChild(s);
  };
  function lessonNumber(card){
    const e=card.querySelector('.eyebrow'); const m=e?.textContent?.match(/LEARN\s*·\s*(\d+)/i); return m?Number(m[1]):0;
  }
  function install(){
    const card=document.querySelector('.learning-lesson-card'); if(!card || card.dataset.zeroCoach==='1') return;
    style(); card.dataset.zeroCoach='1';
    const n=lessonNumber(card);
    const target=card.querySelector('.learning-target');
    const abacus=card.querySelector('.learning-abacus');
    if(!target || !abacus) return;

    const guide=document.createElement('section'); guide.className='zero-start-card';
    if(n===1){
      guide.innerHTML='<span class="zero-start-label">Babi’s first lesson 🌱</span><h2>What is this thing?</h2><p>An abacus is a counting tool. You move beads with your fingers to make numbers.</p><ol><li><b>ONES</b> means the little numbers: 1, 2, 3…</li><li>Each little bead below the bar is worth <b>1</b>.</li><li>Move a little bead <b>UP to the bar</b> and watch the number change.</li></ol>';
    } else if(n===2){
      guide.innerHTML='<span class="zero-start-label">Babi’s reminder 👆</span><h2>Let’s make 3 together</h2><p>Find the <b>ONES</b> rod. The three little beads below the bar are the ones we need.</p><ol><li>Touch the first little bead.</li><li>Move it up to the middle bar.</li><li>Do the same with two more beads. <b>3 beads = 3.</b></li></ol>';
    } else return;
    target.parentNode.insertBefore(guide,target);

    const oldHint=card.querySelector('#learningHint');
    const oldPanel=card.querySelector('#learningHintPanel');
    const hint=document.createElement('button'); hint.type='button'; hint.className='zero-start-hint'; hint.innerHTML='<span>💡</span><span>Babi Hint — show me what to do</span>';
    const panel=document.createElement('div'); panel.className='zero-start-hint-panel';
    panel.textContent=n===1?'Touch one little bead on the ONES rod and move it UP to the middle bar. That makes 1.': 'Use the ONES rod. Move three little beads UP to the middle bar. Three beads make 3.';
    guide.after(hint,panel);
    hint.onclick=()=>{ const show=panel.classList.toggle('show'); hint.setAttribute('aria-expanded',String(show)); if(show && 'speechSynthesis' in window){ try{ speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(panel.textContent); u.rate=.88; u.pitch=1.08; speechSynthesis.speak(u); }catch{} } };
    if(oldHint) oldHint.style.display='none'; if(oldPanel) oldPanel.style.display='none';
    const note=document.createElement('div'); note.className='zero-start-bead-note'; note.textContent=n===1?'👆 Try one little bead first — Babi is watching with you.':'👆 The little beads below the bar are 1 each. Move three up.';
    abacus.parentNode.insertBefore(note,abacus);
  }
  const observer=new MutationObserver(()=>setTimeout(install,0));
  const start=()=>{ if(document.body) observer.observe(document.body,{childList:true,subtree:true}); install(); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
