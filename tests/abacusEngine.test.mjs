import assert from 'node:assert/strict';
import { createAbacus, valueOf, setValue, generateProblem, checkAnswer, getNextLevel } from '../abacusEngine.js';

const expected = {
  1: ['add','direct'], 2: ['add','direct'], 3: ['sub','direct'], 4: ['sub','direct'],
  5: ['add','small'], 6: ['add','small'], 7: ['sub','small'], 8: ['sub','small'],
  9: ['add','big'], 10: ['add','big'], 11: ['sub','big'], 12: ['sub','big']
};

function valid(a,b,op,rule){
  const result=op==='add'?a+b:a-b;
  if(result<0)return false;
  if(rule==='direct')return op==='add'?(a%5)+b<=4:(a%5)>=b;
  if(rule==='small')return op==='add'?a+b<10&&(a%5)+b>4:a<10&&a%5<b;
  if(rule==='big')return op==='add'?a+b>=10:a>=10&&b>a%10;
  return false;
}

// Abacus representation must round-trip all legal 0..99 values exactly.
for(let n=0;n<=99;n++) assert.equal(valueOf(setValue(createAbacus(),n)),n,`round-trip ${n}`);

// Generate large samples and enforce every level's rule contract.
for(let level=1;level<=15;level++){
  for(let i=0;i<5000;i++){
    const p=generateProblem(level);
    assert.equal(p.answer,p.operation==='add'?p.operands[0]+p.operands[1]:p.operands[0]-p.operands[1]);
    if(level<=12){
      assert.deepEqual([p.operation,p.expectedRule],expected[level],`level ${level} family`);
    }else{
      assert.ok(['direct','small','big'].includes(p.expectedRule),`mixed rule ${level}`);
    }
    assert.ok(valid(p.operands[0],p.operands[1],p.operation,p.expectedRule),`invalid generated problem L${level}: ${JSON.stringify(p)}`);
  }
}

// Exact answer contract.
const p={operands:[3,4],operation:'add',expectedRule:'small',answer:7};
assert.equal(checkAnswer(p,7).correct,true);
assert.equal(checkAnswer(p,6).correct,false);
assert.equal(checkAnswer(p,'7').correct,false); // API is deliberately type-strict for numeric answers.
assert.equal(checkAnswer(null,7).correct,false);

// Adaptive transition boundaries.
assert.equal(getNextLevel(5,2,0),5);
assert.equal(getNextLevel(5,3,0),6);
assert.equal(getNextLevel(5,0,1),5);
assert.equal(getNextLevel(5,0,2),4);
assert.equal(getNextLevel(1,0,2),1);
assert.equal(getNextLevel(15,3,0),15);

console.log('PASS: abacus engine contract tests');
