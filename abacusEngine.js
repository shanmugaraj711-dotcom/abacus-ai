const LEVELS = Object.freeze({
  1:{op:'add',rule:'direct',maxA:4,maxB:4},
  2:{op:'add',rule:'direct',maxA:5,maxB:4},
  3:{op:'sub',rule:'direct',maxA:9,maxB:5},
  4:{op:'sub',rule:'direct',maxA:9,maxB:5},
  5:{op:'add',rule:'small',maxA:5,maxB:4},
  6:{op:'add',rule:'small',maxA:5,maxB:4},
  7:{op:'sub',rule:'small',maxA:9,maxB:5},
  8:{op:'sub',rule:'small',maxA:9,maxB:5},
  9:{op:'add',rule:'big',maxA:9,maxB:9},
  10:{op:'add',rule:'big',maxA:9,maxB:9},
  11:{op:'sub',rule:'big',maxA:18,maxB:9},
  12:{op:'sub',rule:'big',maxA:18,maxB:9},
  13:{op:'mixed',rule:'mixed',maxA:9,maxB:9},
  14:{op:'mixed',rule:'mixed',maxA:18,maxB:9},
  15:{op:'mixed',rule:'mixed',maxA:18,maxB:9}
});

export const LEVEL_CONFIG=LEVELS;
export const friendComplements=Object.freeze({
  small:{1:4,2:3,3:2,4:1},
  big:{1:9,2:8,3:7,4:6,5:5,6:4,7:3,8:2,9:1}
});

export function createAbacus(){return {rods:[{upper:false,lower:0},{upper:false,lower:0}]};}

export function valueOf(abacus){
  if(!abacus||!Array.isArray(abacus.rods))return 0;
  return abacus.rods.reduce((sum,r,i)=>sum+((r?.upper?5:0)+(Number(r?.lower)||0))*Math.pow(10,i),0);
}

export function setValue(abacus,value){
  const n=Math.max(0,Math.floor(Number(value)||0));
  abacus.rods=abacus.rods.map((_,i)=>{
    const d=Math.floor(n/Math.pow(10,i))%10;
    return {upper:d>=5,lower:d%5};
  });
  return abacus;
}

function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}

function valid(a,b,op,rule){
  const result=op==='add'?a+b:a-b;
  if(result<0)return false;
  if(rule==='direct')return op==='add'?(a%5)+b<=4:(a%5)>=b;
  if(rule==='small')return op==='add'?a+b<10&&(a%5)+b>4:a<10&&a%5<b;
  if(rule==='big')return op==='add'?a+b>=10:a>=10&&b>a%10;
  return false;
}

function choicesFor(level){
  if(level===13)return ['direct','small'];
  if(level===14)return ['small','big'];
  if(level===15)return ['direct','small','big'];
  return null;
}

function buildProblem(a,b,operation,rule){
  return {operands:[a,b],operation,expectedRule:rule,answer:operation==='add'?a+b:a-b};
}

export function generateProblem(level){
  const safeLevel=Math.min(15,Math.max(1,Math.floor(Number(level)||1)));
  const cfg=LEVELS[safeLevel];
  const mixedChoices=choicesFor(safeLevel);

  for(let i=0;i<1000;i++){
    const a=rand(1,cfg.maxA);
    const b=rand(1,cfg.maxB);
    const operation=(safeLevel>=13)?(Math.random()<0.5?'add':'sub'):(cfg.op.startsWith('sub')?'sub':'add');
    const rule=mixedChoices?mixedChoices[rand(0,mixedChoices.length-1)]:cfg.rule;
    if(valid(a,b,operation,rule))return buildProblem(a,b,operation,rule);
  }

  const fallbacks={
    1:[1,2,'add','direct'],2:[5,4,'add','direct'],3:[5,2,'sub','direct'],4:[9,4,'sub','direct'],
    5:[3,4,'add','small'],6:[2,4,'add','small'],7:[6,3,'sub','small'],8:[7,5,'sub','small'],
    9:[7,8,'add','big'],10:[6,9,'add','big'],11:[12,5,'sub','big'],12:[15,8,'sub','big'],
    13:[3,4,'add','small'],14:[7,5,'sub','small'],15:[7,8,'add','big']
  };
  const fallback=fallbacks[safeLevel];
  if(!fallback||!valid(fallback[0],fallback[1],fallback[2],fallback[3])){
    throw new Error(`No valid problem available for level ${safeLevel}`);
  }
  return buildProblem(fallback[0],fallback[1],fallback[2],fallback[3]);
}

export function checkAnswer(problem,childAnswer){
  if(!problem||!Array.isArray(problem.operands)||!Number.isFinite(problem.answer))return {correct:false,ruleUsed:problem?.expectedRule||null};
  const n=typeof childAnswer==='number'?childAnswer:valueOf(childAnswer);
  const correct=Number.isFinite(n)&&n===problem.answer;
  return {correct,ruleUsed:problem.expectedRule};
}

export function getNextLevel(currentLevel,streak,wrongCount=0){
  const level=Math.min(15,Math.max(1,Math.floor(Number(currentLevel)||1)));
  if(streak>=3)return Math.min(15,level+1);
  if(wrongCount>=2)return Math.max(1,level-1);
  return level;
}
