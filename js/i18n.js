// All of Babi's words live here, in English and Tamil, side by side.
// The screen text and the spoken line always come from the SAME entry, so they can never disagree.
// Tamil lines are written the way a Tamil teacher speaks to a small child (everyday Tanglish).
// Safe to edit: change only the text inside the quotes.
import { placeName } from './engine.js';

const PLACE_TA = ['ஒன்ஸ்', 'டென்ஸ்', 'ஹண்ட்ரெட்ஸ்'];
const bead = n => (n === 1 ? 'bead' : 'beads');
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

const S = {
  // --- Babi's reactions ---
  praise: {
    en: () => pick(['Super!', 'You did it!', 'Well done!', 'Great job!', 'Brilliant!']),
    ta: () => pick(['சூப்பர்!', 'நீ பண்ணிட்ட!', 'அருமை!', 'செம்ம நல்லா பண்ண!', 'கலக்கிட்ட!']),
  },
  tryAgain: {
    en: () => pick(['Almost! Try again.', 'Nearly there!', "That's okay — one more try."]),
    ta: () => pick(['கிட்டத்தட்ட சரி! இன்னொரு முறை.', 'பரவாயில்லை, மறுபடியும் முயற்சி பண்ணு.', 'கொஞ்சம் மாறிடுச்சு — திரும்ப பாரு.']),
  },

  // --- one bead move (from the engine's move plan) ---
  step: {
    en: (st) => {
      const p = placeName(st.rod), n = st.n;
      switch (st.k) {
        case 'pushUp': return `Push up ${n} little ${bead(n)} on the ${p} rod.`;
        case 'takeAway': return `Take away ${n} little ${bead(n)} on the ${p} rod.`;
        case 'fiveDown': return `Bring the 5 bead down to the bar on the ${p} rod.`;
        case 'fiveLift': return `Lift the 5 bead away on the ${p} rod.`;
        case 'fiveAndPush': return `Bring down the 5 bead and push up ${n - 5} little ${bead(n - 5)}. That makes ${n}!`;
        case 'fiveAndTake': return `Lift away the 5 bead and take away ${n - 5} little ${bead(n - 5)}.`;
        case 'lfAddIntro': return `Not enough little beads! Little Friends: ${n} + ${5 - n} = 5. So bring the 5 bead down.`;
        case 'lfAddTake': return `Now take away ${5 - n} little ${bead(5 - n)} — the Little Friend of ${n}.`;
        case 'lfSubPush': return `Not enough little beads! Little Friends: ${n} + ${5 - n} = 5. So push up ${5 - n} little ${bead(5 - n)}.`;
        case 'lfSubLift': return `Now lift the 5 bead away.`;
        case 'bfAddIntro': return `No room on this rod! Big Friends: ${n} + ${10 - n} = 10. Take away ${10 - n} here, then add 1 ten.`;
        case 'bfSubIntro': return `Not enough here! Big Friends: ${n} + ${10 - n} = 10. Take away 1 ten, then add ${10 - n} here.`;
        default: return '';
      }
    },
    ta: (st) => {
      const p = PLACE_TA[st.rod] || PLACE_TA[0], n = st.n;
      switch (st.k) {
        case 'pushUp': return `${p} ராட்ல ${n} சின்ன மணிய மேல தள்ளு.`;
        case 'takeAway': return `${p} ராட்ல ${n} சின்ன மணிய கீழ இறக்கு.`;
        case 'fiveDown': return `${p} ராட்ல 5 மணிய பட்டையை நோக்கி கீழ இறக்கு.`;
        case 'fiveLift': return `${p} ராட்ல 5 மணிய மேல தூக்கிடு.`;
        case 'fiveAndPush': return `5 மணிய கீழ இறக்கி, ${n - 5} சின்ன மணிய மேல தள்ளு. அது ${n}!`;
        case 'fiveAndTake': return `5 மணிய மேல தூக்கிட்டு, ${n - 5} சின்ன மணிய கீழ இறக்கு.`;
        case 'lfAddIntro': return `சின்ன மணி போதலையே! லிட்டில் ஃபிரெண்ட்: ${n} + ${5 - n} = 5. அதனால 5 மணிய கீழ இறக்கு.`;
        case 'lfAddTake': return `இப்போ ${5 - n} சின்ன மணிய கீழ இறக்கு — அது ${n}ஓட லிட்டில் ஃபிரெண்ட்.`;
        case 'lfSubPush': return `சின்ன மணி போதலையே! லிட்டில் ஃபிரெண்ட்: ${n} + ${5 - n} = 5. அதனால ${5 - n} சின்ன மணிய மேல தள்ளு.`;
        case 'lfSubLift': return `இப்போ 5 மணிய மேல தூக்கிடு.`;
        case 'bfAddIntro': return `இந்த ராட்ல இடம் இல்லை! பிக் ஃபிரெண்ட்: ${n} + ${10 - n} = 10. இங்க ${10 - n} எடுத்துட்டு, 1 டென் சேர்க்கணும்.`;
        case 'bfSubIntro': return `இங்க போதலை! பிக் ஃபிரெண்ட்: ${n} + ${10 - n} = 10. 1 டென் எடுத்துட்டு, இங்க ${10 - n} சேர்க்கணும்.`;
        default: return '';
      }
    },
  },

  // --- sums ---
  startWith: { en: (a, sg, b) => `${a} ${sg} ${b}. Start with ${a}.`, ta: (a, sg, b) => `${a} ${sg} ${b}. முதல்ல ${a} வை.` },
  sumIs: { en: (a, sg, b, ans) => `${a} ${sg} ${b} = ${ans}!`, ta: (a, sg, b, ans) => `${a} ${sg} ${b} = ${ans}!` },
  babiPut: { en: (a, op, b) => `Babi put ${a} on the abacus. Now ${op === 'add' ? 'add' : 'take away'} ${b}.`, ta: (a, op, b) => `Babi ${a} வச்சிட்டாரு. இப்போ ${b} ${op === 'add' ? 'சேர்' : 'எடு'}.` },
  wrongValue: { en: (v) => `The abacus says ${v}. Try again!`, ta: (v) => `அபாகஸ் ${v} காட்டுது. திரும்ப முயற்சி பண்ணு!` },
  wrongSum: { en: (v, a, sg, b) => `The abacus says ${v}, but we want ${a} ${sg} ${b}. Try again!`, ta: (v, a, sg, b) => `அபாகஸ் ${v} காட்டுது, ஆனா நமக்கு ${a} ${sg} ${b} வேணும். திரும்ப பண்ணு!` },
  clue: { en: (line) => `Clue: ${line}`, ta: (line) => `சின்ன உதவி: ${line}`},
  watchTogether: { en: () => "Let's watch Babi do this one together.", ta: () => 'Babi இத பண்ணி காட்டுறாரு, பாரு.' },
  yourTurn: { en: () => 'Your turn! Do the same moves.', ta: () => 'இப்போ உன் முறை! அதே மாதிரி பண்ணு.' },
  likeBabi: { en: () => 'Now you do it, just like Babi!', ta: () => 'இப்போ நீயே பண்ணு, Babi மாதிரி!' },

  // --- building and reading numbers ---
  thatIs: { en: (n) => `That is ${n}!`, ta: (n) => `அது ${n}!` },
  itIs: { en: (n) => `It is ${n}.`, ta: (n) => `அது ${n}.` },
  lookThisIs: { en: (n) => `Look! This is ${n}. Now you try.`, ta: (n) => `பாரு! இது ${n}. இப்போ நீ பண்ணு.` },
  countAgain: { en: () => 'Not that one. Count the beads touching the bar again!', ta: () => 'அது இல்லை. பட்டையை தொடுற மணிகளை மறுபடி எண்ணு!' },
  allClear: { en: () => 'All clear. That is 0.', ta: () => 'எல்லாம் காலி. அது 0.' },
  freePlay: { en: () => 'Move any bead you like. I will tell you the number!', ta: () => 'எந்த மணியையும் நகர்த்து. நான் எண்ணை சொல்றேன்!' },

  // --- friends quiz ---
  friendQ: { en: (kind, n) => `${kind === 'big' ? 'Big' : 'Little'} Friend of ${n} is…?`, ta: (kind, n) => `${n}ஓட ${kind === 'big' ? 'பிக்' : 'லிட்டில்'} ஃபிரெண்ட் எது?` },
  friendRight: { en: (n, r, total) => `${n} and ${r} make ${total}.`, ta: (n, r, total) => `${n}ம் ${r}ம் சேர்ந்தா ${total}.` },
  friendHint: { en: (n, total) => `Look at the pairs above. What goes with ${n} to make ${total}?`, ta: (n, total) => `மேல இருக்க ஜோடிகளை பாரு. ${n}ஓட எது சேர்ந்தா ${total} வரும்?` },

  // --- screens ---
  hello: { en: (name, mission) => `Hi ${name}! ${mission}`, ta: (name, mission) => `ஹாய் ${name}! ${mission}` },
  missionLearn: { en: (title) => `Next, let's learn ${title}.`, ta: (title) => `அடுத்து ${title} கத்துக்கலாம்.` },
  missionPractise: { en: (name) => `Ready to practise ${name}?`, ta: (name) => `${name} பயிற்சி பண்ண ரெடியா?` },
  pickLesson: { en: () => 'Pick a lesson. Each one is short — just a few taps!', ta: () => 'ஒரு பாடத்தை தேர்ந்தெடு. ஒவ்வொன்னும் ரொம்ப சின்னது!' },
  pickLevel: { en: () => 'Pick a level. Get stars to open the next one!', ta: () => 'ஒரு லெவலை தேர்ந்தெடு. நட்சத்திரம் வாங்கினா அடுத்தது திறக்கும்!' },
  pickGame: { en: () => 'Pick a game! They use the same bead skills you learn.', ta: () => 'ஒரு கேம் தேர்ந்தெடு! நீ கத்துக்கிட்ட மணி வித்தைதான்!' },
  buildAnswer: { en: () => 'Build the answer with beads, then press Check.', ta: () => 'மணிகளால பதிலை உருவாக்கு, அப்புறம் Check அழுத்து.' },
  lessonDone: { en: (name) => `Hooray ${name}! Lesson done!`, ta: (name) => `சபாஷ் ${name}! பாடம் முடிஞ்சது!` },
  levelIntro: { en: (n, name, tip) => `Level ${n}. ${name}. ${tip}`, ta: (n, name, tip) => `லெவல் ${n}. ${name}. ${tip}` },
  quickCheck: { en: () => "Let's see what you already know. 6 quick sums!", ta: () => 'உனக்கு என்ன தெரியும்னு பாக்கலாம். 6 சின்ன கணக்கு!' },
  startAt: { en: (n) => `Great! You can start at level ${n}.`, ta: (n) => `சூப்பர்! நீ லெவல் ${n}ல ஆரம்பிக்கலாம்.` },
  mysteryQ: { en: () => 'What number are the beads showing?', ta: () => 'மணிகள் எந்த எண்ணை காட்டுது?' },
  mysteryHint: { en: () => 'Look again: the top bead is 5, little beads are 1 each. Tens rod is on the left!', ta: () => 'மறுபடி பாரு: மேல மணி 5, சின்ன மணி ஒவ்வொன்னும் 1. இடது பக்கம் டென்ஸ் ராடு!' },
  timeUp: { en: (n) => `Time's up! You solved ${n}.`, ta: (n) => `நேரம் முடிஞ்சது! நீ ${n} கணக்கு போட்ட.` },
  stickerCount: { en: (got, all) => `You have ${got} of ${all} stickers. Keep going!`, ta: (got, all) => `உன்கிட்ட ${all}ல ${got} ஸ்டிக்கர் இருக்கு. தொடர்ந்து பண்ணு!` },
  welcomeKid: { en: (name) => `Hi ${name}! Let's play with the abacus.`, ta: (name) => `ஹாய் ${name}! அபாகஸ் விளையாடலாம்.` },
  // --- tests and game reactions ---
  readyTest: { en: () => 'Ready for a real test?', ta: () => 'நிஜமான டெஸ்டுக்கு ரெடியா?' },
  testPassed: { en: () => 'Well done! You passed.', ta: () => 'சூப்பரா பண்ண! நீ பாஸ் பண்ணிட்ட!' },
  testRetry: { en: () => 'Good effort. Try once more.', ta: () => 'நல்ல முயற்சி. இன்னொரு முறை முயற்சி பண்ணு.' },
  wasNumber: { en: (n) => `It was ${n}.`, ta: (n) => `அது ${n}.` },
  wasNumberLook: { en: (n) => `It was ${n}. Look again.`, ta: (n) => `அது ${n}. மறுபடி பாரு.` },
  wasNumberClimb: { en: (n) => `It was ${n}. Keep climbing!`, ta: (n) => `அது ${n}. தொடர்ந்து ஏறு!` },
  gameDone: { en: () => 'Game complete!', ta: () => 'கேம் முடிஞ்சது!' },
  resultMsg: {
    en: (stars) => stars === 3 ? 'Perfect beads!' : stars === 2 ? 'Great work!' : stars === 1 ? 'Good job — keep going!' : 'You worked hard! Practise again to get a star.',
    ta: (stars) => stars === 3 ? 'அத்தனையும் சரி!' : stars === 2 ? 'நல்லா பண்ணின!' : stars === 1 ? 'நல்லா போகுது — தொடர்ந்து பண்ணு!' : 'நல்லா முயற்சி பண்ண! இன்னொரு முறை பண்ணா நட்சத்திரம் கிடைக்கும்.',
  },
};

export function t(lang, key, ...args) {
  const entry = S[key];
  if (!entry) return '';
  return (entry[lang] || entry.en)(...args);
}
export const LANG_NAMES = { en: 'English', ta: 'தமிழ் Tamil' };
