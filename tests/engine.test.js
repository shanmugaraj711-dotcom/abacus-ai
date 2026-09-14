import {createAbacus,valueOf,setValue,generateProblem,checkAnswer,getNextLevel} from '../abacusEngine.js';

const tests=[];
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

function isRuleValid(a,b,operation,rule){
  const result=operation==='add'?a+b:a-b;
  if(result<0)return false;
  if(rule==='direct')return operation==='add'?(a%5)+b<=4:a<=5;
  if(rule==='small')return operation==='add'?a+b<10&&(a%5)+b>4:a<10&&a%5<b;
  if(rule==='big')return operation==='add'?a+b>=10:a>=10&&b>a%10;
  return false;
}

tests.push(()=>{
  const a=createAbacus();
  setValue(a,9);
  assert(valueOf(a)===9,'9 representation failed');
});

tests.push(()=>{
  const p={operands:[2,3],operation:'add',expectedRule:'direct',answer:5};
  assert(checkAnswer(p,5).correct,'answer check failed');
  assert(checkAnswer(p,4).correct===false,'wrong answer accepted');
});

tests.push(()=>assert(getNextLevel(1,3)===2,'advance failed'));
tests.push(()=>assert(getNextLevel(5,0,2)===4,'drop-back failed'));

// Boundary checks for the corrected Level 1-6 curriculum.
tests.push(()=>{
  assert(isRuleValid(5,4,'add','direct'),'Level 2 should allow 5+4 as direct');
  assert(!isRuleValid(4,2,'add','direct'),'4+2 must not be direct');
  assert(isRuleValid(3,4,'add','small'),'3+4 should be small friend');
  assert(isRuleValid(6,4,'add','small'),'6+4 should be small friend');
  assert(isRuleValid(5,2,'sub','direct'),'Level 3 curriculum example 5-2 should be direct');
});

// Every generated problem must match its level's expected rule.
tests.push(()=>{
  for(let level=1;level<=15;level++){
    for(let i=0;i<100;i++){
      const p=generateProblem(level);
      assert(Number.isFinite(p.answer),'problem invalid '+level);
      assert(isRuleValid(p.operands[0],p.operands[1],p.operation,p.expectedRule),
        `rule mismatch at level ${level}: ${p.operands[0]} ${p.operation} ${p.operands[1]} -> ${p.expectedRule}`);
    }
  }
});

// Level 1-6 should never leak a later rule.
tests.push(()=>{
  const expected={1:'direct',2:'direct',3:'direct',4:'direct',5:'small',6:'small'};
  for(let level=1;level<=6;level++){
    for(let i=0;i<100;i++){
      const p=generateProblem(level);
      assert(p.expectedRule===expected[level],`unexpected rule at level ${level}`);
    }
  }
});

let passed=0;
for(const test of tests){test();passed++}
console.log(`PASS ${passed}/${tests.length}`);
