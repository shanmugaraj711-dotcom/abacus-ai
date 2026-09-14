import {createAbacus,valueOf,setValue,generateProblem,checkAnswer,getNextLevel} from '../abacusEngine.js';

const tests=[];
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

function isRuleValid(a,b,operation,rule){
  const result=operation==='add'?a+b:a-b;
  if(result<0)return false;
  if(rule==='direct')return operation==='add'?(a%5)+b<=4:(a%5)>=b;
  if(rule==='small')return operation==='add'?a+b<10&&(a%5)+b>4:a<10&&a%5<b;
  if(rule==='big')return operation==='add'?a+b>=10:a>=10&&b>a%10;
  return false;
}

tests.push(()=>{
  const a=createAbacus();
  for(const n of [0,9,18,50,99]){setValue(a,n);assert(valueOf(a)===n,`${n} representation failed`)}
});

tests.push(()=>{
  const p={operands:[2,3],operation:'add',expectedRule:'direct',answer:5};
  assert(checkAnswer(p,5).correct,'answer check failed');
  assert(!checkAnswer(p,4).correct,'wrong answer accepted');
  assert(checkAnswer(p,createAbacus()).correct===false,'empty abacus accepted');
});

tests.push(()=>assert(getNextLevel(1,3)===2,'advance failed'));
tests.push(()=>assert(getNextLevel(15,3)===15,'max level overflow'));
tests.push(()=>assert(getNextLevel(5,0,2)===4,'drop-back failed'));
tests.push(()=>assert(getNextLevel(1,0,2)===1,'minimum level underflow'));

tests.push(()=>{
  assert(isRuleValid(5,4,'add','direct'),'Level 2 should allow 5+4 as direct');
  assert(!isRuleValid(4,2,'add','direct'),'4+2 must not be direct');
  assert(isRuleValid(3,4,'add','small'),'3+4 should be small friend');
  assert(isRuleValid(6,4,'add','small'),'6+4 should be small friend');
  assert(isRuleValid(5,2,'sub','direct'),'5-2 should be direct');
  assert(isRuleValid(9,4,'sub','direct'),'9-4 should be direct');
  assert(isRuleValid(8,3,'sub','direct'),'8-3 should be direct');
  assert(!isRuleValid(8,4,'sub','direct'),'8-4 should require a small friend');
});

tests.push(()=>{
  for(let level=1;level<=15;level++){
    for(let i=0;i<200;i++){
      const p=generateProblem(level);
      assert(Array.isArray(p.operands)&&p.operands.length===2,'bad operands '+level);
      assert(Number.isFinite(p.answer),'problem invalid '+level);
      assert(['add','sub'].includes(p.operation),'bad operation '+level);
      assert(['direct','small','big'].includes(p.expectedRule),'bad rule '+level);
      assert(isRuleValid(p.operands[0],p.operands[1],p.operation,p.expectedRule),
        `rule mismatch at level ${level}: ${p.operands[0]} ${p.operation} ${p.operands[1]} -> ${p.expectedRule}`);
    }
  }
});

tests.push(()=>{
  const expected={1:'direct',2:'direct',3:'direct',4:'direct',5:'small',6:'small',7:'small',8:'small',9:'big',10:'big',11:'big',12:'big'};
  for(let level=1;level<=12;level++){
    for(let i=0;i<100;i++){
      const p=generateProblem(level);
      assert(p.expectedRule===expected[level],`unexpected rule at level ${level}`);
    }
  }
});

tests.push(()=>{
  const seen13=new Set(),seen14=new Set(),seen15=new Set();
  for(let i=0;i<1000;i++){
    seen13.add(generateProblem(13).expectedRule);
    seen14.add(generateProblem(14).expectedRule);
    const p15=generateProblem(15);
    seen15.add(p15.expectedRule);
    assert(p15.operation==='add'||p15.operation==='sub','Level 15 operation invalid');
  }
  assert(seen13.size>=1,'Level 13 generated nothing');
  assert(seen14.size>=1,'Level 14 generated nothing');
  assert(seen15.size>=1,'Level 15 generated nothing');
});

let passed=0;
for(const test of tests){test();passed++}
console.log(`PASS ${passed}/${tests.length}`);
