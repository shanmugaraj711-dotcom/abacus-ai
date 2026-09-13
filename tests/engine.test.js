import {createAbacus,valueOf,setValue,generateProblem,checkAnswer,getNextLevel} from '../abacusEngine.js';
const tests=[];const assert=(c,m)=>{if(!c)throw new Error(m)};
tests.push(()=>{const a=createAbacus();setValue(a,9);assert(valueOf(a)===9,'9 representation failed')});
tests.push(()=>{const p={operands:[2,3],operation:'add',expectedRule:'direct',answer:5};assert(checkAnswer(p,5).correct,'answer check failed')});
tests.push(()=>assert(getNextLevel(1,3)===2,'advance failed'));
tests.push(()=>assert(getNextLevel(5,0,2)===4,'drop-back failed'));
tests.push(()=>{for(let l=1;l<=15;l++){const p=generateProblem(l);assert(Number.isFinite(p.answer),'problem invalid '+l)}});
let passed=0;for(const t of tests){t();passed++}console.log(`PASS ${passed}/${tests.length}`);
