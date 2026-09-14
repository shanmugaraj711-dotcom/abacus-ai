import {createAbacus,valueOf,setValue,generateProblem,checkAnswer,getNextLevel,LEVEL_CONFIG,friendComplements} from './abacusEngine.js';

// Phase 1 staging-only deterministic invariant audit. No production side effects.
const report={ok:true,levels:{},checks:{}};
const fail=(name,detail)=>{report.ok=false;report.checks[name]={ok:false,detail};};

try{
  // Representation invariants: every digit must stay within soroban bounds and round-trip exactly for 0..99.
  for(let n=0;n<=99;n++){
    const a=createAbacus();setValue(a,n);const got=valueOf(a);
    if(got!==n)fail(`roundTrip_${n}`,`expected ${n}, got ${got}`);
    a.rods.forEach((r,i)=>{if(![0,1,2,3,4].includes(Number(r.lower))||typeof r.upper!=='boolean')fail(`rodInvariant_${i}_${n}`,JSON.stringify(r));});
  }
  report.checks.roundTrip={ok:report.ok};

  // Generation invariants: many samples per level must satisfy the configured rule, operation, answer and bounds.
  for(let level=1;level<=15;level++){
    const cfg=LEVEL_CONFIG[level];let samples=0;
    for(let i=0;i<2000;i++){
      const p=generateProblem(level);samples++;
      const [a,b]=p.operands;
      const answer=p.operation==='add'?a+b:a-b;
      if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1)throw new Error(`invalid operands ${JSON.stringify(p)}`);
      if(a>cfg.maxA||b>cfg.maxB)throw new Error(`bounds exceeded L${level}: ${JSON.stringify(p)}`);
      if(answer<0||answer>99)throw new Error(`invalid answer L${level}: ${JSON.stringify(p)}`);
      if(p.answer!==answer)throw new Error(`answer mismatch L${level}: ${JSON.stringify(p)}`);
      const direct=p.expectedRule==='direct' && (p.operation==='add'?(a%5)+b<=4:(a%5)>=b);
      const small=p.expectedRule==='small' && (p.operation==='add'?a+b<10&&(a%5)+b>4:a<10&&a%5<b);
      const big=p.expectedRule==='big' && (p.operation==='add'?a+b>=10:a>=10&&b>a%10);
      const mixed=level>=13 && ['direct','small','big'].includes(p.expectedRule);
      if(!(direct||small||big||mixed))throw new Error(`rule mismatch L${level}: ${JSON.stringify(p)}`);
      const empty=createAbacus();if(checkAnswer(p,empty).correct && p.answer!==0)throw new Error(`empty abacus accepted L${level}`);
    }
    report.levels[level]={ok:true,samples};
  }

  // Transition contract: exactly 3 correct advances; exactly 2 wrong drops, never below 1 or above 15.
  const transitions=[
    [1,3,0,2],[7,3,0,8],[15,3,0,15],
    [1,0,2,1],[7,0,2,6],[15,0,2,14]
  ];
  transitions.forEach(([level,streak,wrong,expected],i)=>{
    const got=getNextLevel(level,streak,wrong);if(got!==expected)fail(`transition_${i}`,`L${level}, streak ${streak}, wrong ${wrong}: expected ${expected}, got ${got}`);
  });
  report.checks.transitions={ok:report.ok};
  report.checks.friendComplements={ok:friendComplements.small[1]===4&&friendComplements.big[1]===9};
}catch(err){fail('engineException',String(err?.message||err));}

window.__phase1EngineAudit=report;
console.info('[Phase1 Engine Audit]',report);
