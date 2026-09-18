// Learn path. Each lesson = tiny steps; one idea per screen. Kids read little, see a lot.
// Step types: talk | build | read | demo | solve | friends
// `say` = English line, `ta` = the same line in Tamil (shown AND spoken in Tamil mode).
export const LESSONS = [
  { id: 1, emoji: '🧮', title: 'Meet the Abacus', titleTa: 'அபாகஸ் அறிமுகம்', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 0, parts: true, say: 'This is an abacus! It has a wooden frame, a middle bar, and beads that slide on a rod.', ta: 'இது அபாகஸ்! மர சட்டம், நடுவுல ஒரு பட்டை, ராட்ல நகரும் மணிகள் இருக்கு.' },
    { t: 'talk', rods: 1, value: 0, say: 'Beads only count when they touch the middle bar. Right now nothing touches it, so the abacus says 0.', ta: 'மணிகள் நடு பட்டையை தொட்டா மட்டும்தான் எண்ணும். இப்போ ஒண்ணும் தொடலை, அதனால அபாகஸ் 0.' },
    { t: 'build', rods: 1, target: 1, say: 'Tap the little bead closest to the bar. It moves up and makes 1!', ta: 'பட்டைக்கு பக்கத்துல இருக்க சின்ன மணிய தொடு. அது மேல போய் 1 ஆகும்!' },
  ] },
  { id: 2, emoji: '🐣', title: 'Little Beads: 1 to 4', titleTa: 'சின்ன மணிகள்: 1 முதல் 4', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 3, say: 'Each little bead below the bar is worth 1. Three little beads up means 3.', ta: 'பட்டைக்கு கீழ இருக்க ஒவ்வொரு சின்ன மணியும் 1. மூணு மணி மேல இருந்தா அது 3.' },
    { t: 'build', rods: 1, target: 2, say: 'Make 2. Push up two little beads.', ta: '2 உருவாக்கு. ரெண்டு சின்ன மணிய மேல தள்ளு.' },
    { t: 'build', rods: 1, target: 4, say: 'Now make 4. All four little beads up!', ta: 'இப்போ 4 உருவாக்கு. நாலு சின்ன மணியும் மேல!' },
    { t: 'read', rods: 1, value: 3, options: [2, 3, 4], say: 'What number is this? Count the beads touching the bar.', ta: 'இது என்ன எண்? பட்டையை தொடுற மணிகளை எண்ணு.' },
  ] },
  { id: 3, emoji: '⭐', title: 'The Magic 5 Bead', titleTa: 'மாய 5 மணி', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 5, say: 'The bead above the bar is magic. It is worth 5 all by itself!', ta: 'பட்டைக்கு மேல இருக்க மணி மாயம். அது தனியா 5 மதிப்பு!' },
    { t: 'build', rods: 1, target: 5, say: 'Tap the top bead to bring it down to the bar. That is 5.', ta: 'மேல இருக்க மணிய தொட்டு பட்டைக்கு கீழ இறக்கு. அது 5.' },
    { t: 'read', rods: 1, value: 1, options: [1, 5, 4], say: 'Careful! Which number is this?', ta: 'கவனமா! இது என்ன எண்?' },
  ] },
  { id: 4, emoji: '🌈', title: 'Numbers 6 to 9', titleTa: '6 முதல் 9 வரை', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 6, say: '5 bead plus 1 little bead makes 6. Five and one, six!', ta: '5 மணியோட 1 சின்ன மணி சேர்ந்தா 6. ஐந்தும் ஒண்ணும் ஆறு!' },
    { t: 'build', rods: 1, target: 7, say: 'Make 7. Bring down the 5 bead, then push up 2 little beads.', ta: '7 உருவாக்கு. 5 மணிய கீழ இறக்கி, 2 சின்ன மணிய மேல தள்ளு.' },
    { t: 'build', rods: 1, target: 9, say: 'Make 9, the biggest number on one rod.', ta: '9 உருவாக்கு — ஒரு ராட்ல இதுதான் பெரிய எண்.' },
    { t: 'read', rods: 1, value: 8, options: [3, 8, 9], say: 'What number is this?', ta: 'இது என்ன எண்?' },
  ] },
  { id: 5, emoji: '🏠', title: 'The Tens Rod', titleTa: 'டென்ஸ் ராடு', unlocks: [], steps: [
    { t: 'talk', rods: 2, value: 10, highlight: 1, say: 'Each rod to the left is worth ten times more. One little bead on the tens rod means 10.', ta: 'இடது பக்கம் இருக்க ஒவ்வொரு ராடும் பத்து மடங்கு. டென்ஸ் ராட்ல ஒரு சின்ன மணி 10.' },
    { t: 'build', rods: 2, target: 10, say: 'Make 10. Use the tens rod on the left.', ta: '10 உருவாக்கு. இடது பக்கம் இருக்க டென்ஸ் ராட்டை பயன்படுத்து.' },
    { t: 'build', rods: 2, target: 23, say: 'Make 23. That is 2 tens and 3 ones.', ta: '23 உருவாக்கு. அதாவது 2 டென்ஸ், 3 ஒன்ஸ்.' },
    { t: 'read', rods: 2, value: 45, options: [54, 45, 9], say: 'Read this number. Tens first, then ones.', ta: 'இந்த எண்ணை படி. முதல்ல டென்ஸ், அப்புறம் ஒன்ஸ்.' },
  ] },
  { id: 6, emoji: '➕', title: 'Easy Adding', titleTa: 'சுலபமா கூட்டுதல்', unlocks: [1, 2], steps: [
    { t: 'demo', a: 2, b: 2, op: 'add', say: 'Watch Babi do 2 + 2. Press play!', ta: 'Babi 2 + 2 பண்றத பாரு. Play அழுத்து!' },
    { t: 'solve', a: 3, b: 1, op: 'add', say: 'Your turn! The abacus already shows 3. Add 1.', ta: 'உன் முறை! அபாகஸ்ல 3 இருக்கு. 1 சேர்.' },
    { t: 'demo', a: 3, b: 5, op: 'add', say: 'Adding 5? Just bring down the 5 bead.', ta: '5 சேர்க்கணுமா? 5 மணிய கீழ இறக்கினா போதும்.' },
    { t: 'solve', a: 1, b: 6, op: 'add', say: 'The abacus shows 1. Add 6.', ta: 'அபாகஸ்ல 1 இருக்கு. 6 சேர்.' },
  ] },
  { id: 7, emoji: '➖', title: 'Easy Take Away', titleTa: 'சுலபமா கழித்தல்', unlocks: [3, 4], steps: [
    { t: 'demo', a: 4, b: 3, op: 'sub', say: 'Watch Babi do 4 − 3.', ta: 'Babi 4 − 3 பண்றத பாரு.' },
    { t: 'solve', a: 3, b: 2, op: 'sub', say: 'The abacus shows 3. Take away 2.', ta: 'அபாகஸ்ல 3 இருக்கு. 2 எடு.' },
    { t: 'demo', a: 8, b: 5, op: 'sub', say: 'Take away 5? Lift away the 5 bead.', ta: '5 எடுக்கணுமா? 5 மணிய மேல தூக்கிடு.' },
    { t: 'solve', a: 9, b: 6, op: 'sub', say: 'The abacus shows 9. Take away 6.', ta: 'அபாகஸ்ல 9 இருக்கு. 6 எடு.' },
  ] },
  { id: 8, emoji: '🐰', title: 'Little Friends', titleTa: 'லிட்டில் ஃபிரெண்ட்ஸ்', unlocks: [5], steps: [
    { t: 'friends', kind: 'little', say: 'Little Friends are pairs that make 5. 1 and 4. 2 and 3. They help when you run out of beads!', ta: '5 ஆக்குற ஜோடிகள்தான் லிட்டில் ஃபிரெண்ட்ஸ். 1ம் 4ம். 2ம் 3ம். மணி போதலைன்னா இதுதான் உதவும்!' },
    { t: 'demo', a: 4, b: 3, op: 'add', say: '4 + 3: there are no little beads left! Watch the Little Friend trick.', ta: '4 + 3: சின்ன மணி மிச்சம் இல்லை! லிட்டில் ஃபிரெண்ட் வித்தையை பாரு.' },
    { t: 'solve', a: 3, b: 4, op: 'add', say: 'Your turn: 3 + 4. Bring down 5, take away the Little Friend of 4.', ta: 'உன் முறை: 3 + 4. 5 மணிய இறக்கி, 4ஓட லிட்டில் ஃபிரெண்ட்ட எடு.' },
    { t: 'solve', a: 2, b: 4, op: 'add', say: 'Try 2 + 4.', ta: '2 + 4 பண்ணி பாரு.' },
  ] },
  { id: 9, emoji: '🐼', title: 'Little Friends Take Away', titleTa: 'லிட்டில் ஃபிரெண்ட்ஸ் கழித்தல்', unlocks: [6, 7], steps: [
    { t: 'demo', a: 7, b: 4, op: 'sub', say: '7 − 4: only 2 little beads. Watch the Little Friend trick again.', ta: '7 − 4: 2 சின்ன மணிதான் இருக்கு. லிட்டில் ஃபிரெண்ட் வித்தையை மறுபடி பாரு.' },
    { t: 'solve', a: 6, b: 3, op: 'sub', say: 'Your turn: 6 − 3. Push up the Little Friend, lift away the 5.', ta: 'உன் முறை: 6 − 3. லிட்டில் ஃபிரெண்ட்ட மேல தள்ளி, 5 மணிய தூக்கிடு.' },
    { t: 'solve', a: 5, b: 2, op: 'sub', say: 'Try 5 − 2.', ta: '5 − 2 பண்ணி பாரு.' },
  ] },
  { id: 10, emoji: '🦁', title: 'Big Friends', titleTa: 'பிக் ஃபிரெண்ட்ஸ்', unlocks: [8], steps: [
    { t: 'friends', kind: 'big', say: 'Big Friends are pairs that make 10. 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5.', ta: '10 ஆக்குற ஜோடிகள்தான் பிக் ஃபிரெண்ட்ஸ். 1ம் 9ம், 2ம் 8ம், 3ம் 7ம், 4ம் 6ம், 5ம் 5ம்.' },
    { t: 'demo', a: 8, b: 5, op: 'add', say: '8 + 5 is too big for one rod. Watch Babi use a Big Friend.', ta: '8 + 5 ஒரு ராட்டுக்கு பெரிசு. Babi பிக் ஃபிரெண்ட் பயன்படுத்துறத பாரு.' },
    { t: 'solve', a: 7, b: 6, op: 'add', say: 'Your turn: 7 + 6. Take away the Big Friend of 6, then add 1 ten.', ta: 'உன் முறை: 7 + 6. 6ஓட பிக் ஃபிரெண்ட்ட எடுத்துட்டு, 1 டென் சேர்.' },
    { t: 'solve', a: 9, b: 4, op: 'add', say: 'Try 9 + 4.', ta: '9 + 4 பண்ணி பாரு.' },
  ] },
  { id: 11, emoji: '🐘', title: 'Big Friends Take Away', titleTa: 'பிக் ஃபிரெண்ட்ஸ் கழித்தல்', unlocks: [9, 10], steps: [
    { t: 'demo', a: 13, b: 6, op: 'sub', say: '13 − 6: not enough ones! Watch Babi borrow a ten.', ta: '13 − 6: ஒன்ஸ் போதலை! Babi ஒரு டென் கடன் வாங்குறத பாரு.' },
    { t: 'solve', a: 12, b: 7, op: 'sub', say: 'Your turn: 12 − 7. Take away 1 ten, then add the Big Friend of 7.', ta: 'உன் முறை: 12 − 7. 1 டென் எடுத்துட்டு, 7ஓட பிக் ஃபிரெண்ட்ட சேர்.' },
    { t: 'solve', a: 15, b: 8, op: 'sub', say: 'Try 15 − 8.', ta: '15 − 8 பண்ணி பாரு.' },
  ] },
];

// Which lesson teaches the trick a practice level needs.
export const LESSON_FOR_LEVEL = { 1: 6, 2: 6, 3: 7, 4: 7, 5: 8, 6: 9, 7: 9, 8: 10, 9: 11, 10: 11, 11: 10, 12: 11 };
