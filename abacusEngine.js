const LEVELS = Object.freeze({
  1:{op:'add',rule:'direct',maxA:4,maxB:5},2:{op:'add',rule:'direct',maxA:5,maxB:4},
  3:{op:'sub',rule:'direct',maxA:9,maxB:4},4:{op:'sub',rule:'direct',maxA:9,maxB:5},
  5:{op:'add',rule:'small',maxA:4,maxB:4},6:{op:'add',rule:'small',maxA:5,maxB:4},
  7:{op:'sub',rule:'small',maxA:9,maxB:4},8:{op:'sub',rule:'small',maxA:9,maxB:5},
  9:{op:'add',rule:'big',maxA:9,maxB:9},10:{op:'add',rule:'big',maxA:9,maxB:9},
  11:{op:'sub',rule:'big',maxA:18,maxB:9},12:{op:'sub',rule:'big',maxA:18,maxB:9},
  13:{op:'mixedSmall',rule:'mixed',maxA:9,maxB:9},14:{op:'mixedBig',rule:'mixed',maxA:18,maxB:9},
  15:{op:'mixed',rule:'mixed',maxA:18,maxB:9}
});
export const LEVEL_CONFIG=LEVELS;
export const friendComplements=Object.freeze({small:{1:4,2:3,3:2,4:1},big:{1:9,2:8,3:7,4:6,5:5,6:4,7:3,8:2,9:1}});
export function createAbacus(){return {rods:[{upper:false,lower:0},{upper:false,lower:0}]};}
export function valueOf(abacus){return abacus.rods.reduce((sum,r,i)=>sum+(r.upper?5:0)+r.lower*Math.pow(10,i),0);}
export function setValue(abacus,value){let n=Math.max(0,Math.floor(value));abacus.rods=abacus.rods.map((_,i)=>{const d=Math.floor(n/Math.pow(10,i))%10;return {upper:d>=5,lower:d%5};});return abacus;}
function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min;}
function valid(a,b,op,rule){const result=op==='add'?a+b:a-b;if(result<0)return false;if(rule==='direct')return op==='add'?a+b<=5:a<=5; if(rule==='small')return op==='add'?a<=5&&b>=(6-a):a>=5&&b<=(a-5); if(rule==='big')return op==='add'?a+b>=10:a>=10&&b>=5; return true;}
export function generateProblem(level){const cfg=LEVELS[level]||LEVELS[1];let a,b,op=cfg.op==='sub'?'sub':'add';for(let i=0;i<200;i++){a=rand(op==='sub'?1:1,cfg.maxA);b=rand(1,cfg.maxB);if(cfg.op==='mixedSmall'||cfg.op==='mixedBig'||cfg.op==='mixed'){const choices=cfg.op==='mixedSmall'?['direct','small']:cfg.op==='mixedBig'?['small','big']:['direct','small','big'];const rule=choices[rand(0,choices.length-1)];if(valid(a,b,op,rule))return {operands:[a,b],operation:op,expectedRule:rule,answer:op==='add'?a+b:a-b};}else if(valid(a,b,op,cfg.rule))return {operands:[a,b],operation:op,expectedRule:cfg.rule,answer:op==='add'?a+b:a-b};}return {operands:op==='add'?[2,3]:[5,2],operation:op,expectedRule:'direct',answer:op==='add'?5:3};}
export function checkAnswer(problem,childAnswer){const n=typeof childAnswer==='number'?childAnswer:valueOf(childAnswer);const correct=n===problem.answer;return {correct,ruleUsed:problem.expectedRule};}
export function getNextLevel(currentLevel,streak,wrongCount=0){if(streak>=3)return Math.min(15,currentLevel+1);if(wrongCount>=2)return Math.max(1,currentLevel-1);return currentLevel;}
