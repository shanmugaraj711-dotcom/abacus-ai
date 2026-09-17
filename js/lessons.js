// Learn path. Each lesson = tiny steps; one idea per screen. Kids read little, see a lot.
// Step types: talk | build | read | demo | solve | friends
export const LESSONS = [
  { id: 1, emoji: '🧮', title: 'Meet the Abacus', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 0, parts: true, say: 'This is an abacus! It has a wooden frame, a middle bar, and beads that slide on a rod.' },
    { t: 'talk', rods: 1, value: 0, say: 'Beads only count when they touch the middle bar. Right now nothing touches it, so the abacus says 0.' },
    { t: 'build', rods: 1, target: 1, say: 'Tap the little bead closest to the bar. It moves up and makes 1!' },
  ] },
  { id: 2, emoji: '🐣', title: 'Little Beads: 1 to 4', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 3, say: 'Each little bead below the bar is worth 1. Three little beads up means 3.' },
    { t: 'build', rods: 1, target: 2, say: 'Make 2. Push up two little beads.' },
    { t: 'build', rods: 1, target: 4, say: 'Now make 4. All four little beads up!' },
    { t: 'read', rods: 1, value: 3, options: [2, 3, 4], say: 'What number is this? Count the beads touching the bar.' },
  ] },
  { id: 3, emoji: '⭐', title: 'The Magic 5 Bead', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 5, say: 'The bead above the bar is magic. It is worth 5 all by itself!' },
    { t: 'build', rods: 1, target: 5, say: 'Tap the top bead to bring it down to the bar. That is 5.' },
    { t: 'read', rods: 1, value: 1, options: [1, 5, 4], say: 'Careful! Which number is this?' },
  ] },
  { id: 4, emoji: '🌈', title: 'Numbers 6 to 9', unlocks: [], steps: [
    { t: 'talk', rods: 1, value: 6, say: '5 bead plus 1 little bead makes 6. Five and one, six!' },
    { t: 'build', rods: 1, target: 7, say: 'Make 7. Bring down the 5 bead, then push up 2 little beads.' },
    { t: 'build', rods: 1, target: 9, say: 'Make 9, the biggest number on one rod.' },
    { t: 'read', rods: 1, value: 8, options: [3, 8, 9], say: 'What number is this?' },
  ] },
  { id: 5, emoji: '🏠', title: 'The Tens Rod', unlocks: [], steps: [
    { t: 'talk', rods: 2, value: 10, highlight: 1, say: 'Each rod to the left is worth ten times more. One little bead on the tens rod means 10.' },
    { t: 'build', rods: 2, target: 10, say: 'Make 10. Use the tens rod on the left.' },
    { t: 'build', rods: 2, target: 23, say: 'Make 23. That is 2 tens and 3 ones.' },
    { t: 'read', rods: 2, value: 45, options: [54, 45, 9], say: 'Read this number. Tens first, then ones.' },
  ] },
  { id: 6, emoji: '➕', title: 'Easy Adding', unlocks: [1, 2], steps: [
    { t: 'demo', a: 2, b: 2, op: 'add', say: 'Watch Babi do 2 + 2. Press play!' },
    { t: 'solve', a: 3, b: 1, op: 'add', say: 'Your turn! The abacus already shows 3. Add 1.' },
    { t: 'demo', a: 3, b: 5, op: 'add', say: 'Adding 5? Just bring down the 5 bead.' },
    { t: 'solve', a: 1, b: 6, op: 'add', say: 'The abacus shows 1. Add 6.' },
  ] },
  { id: 7, emoji: '➖', title: 'Easy Take Away', unlocks: [3, 4], steps: [
    { t: 'demo', a: 4, b: 3, op: 'sub', say: 'Watch Babi do 4 − 3.' },
    { t: 'solve', a: 3, b: 2, op: 'sub', say: 'The abacus shows 3. Take away 2.' },
    { t: 'demo', a: 8, b: 5, op: 'sub', say: 'Take away 5? Lift away the 5 bead.' },
    { t: 'solve', a: 9, b: 6, op: 'sub', say: 'The abacus shows 9. Take away 6.' },
  ] },
  { id: 8, emoji: '🐰', title: 'Little Friends', unlocks: [5], steps: [
    { t: 'friends', kind: 'little', say: 'Little Friends are pairs that make 5. 1 and 4. 2 and 3. They help when you run out of beads!' },
    { t: 'demo', a: 4, b: 3, op: 'add', say: '4 + 3: there are no little beads left! Watch the Little Friend trick.' },
    { t: 'solve', a: 3, b: 4, op: 'add', say: 'Your turn: 3 + 4. Bring down 5, take away the Little Friend of 4.' },
    { t: 'solve', a: 2, b: 4, op: 'add', say: 'Try 2 + 4.' },
  ] },
  { id: 9, emoji: '🐼', title: 'Little Friends Take Away', unlocks: [6, 7], steps: [
    { t: 'demo', a: 7, b: 4, op: 'sub', say: '7 − 4: only 2 little beads. Watch the Little Friend trick again.' },
    { t: 'solve', a: 6, b: 3, op: 'sub', say: 'Your turn: 6 − 3. Push up the Little Friend, lift away the 5.' },
    { t: 'solve', a: 5, b: 2, op: 'sub', say: 'Try 5 − 2.' },
  ] },
  { id: 10, emoji: '🦁', title: 'Big Friends', unlocks: [8], steps: [
    { t: 'friends', kind: 'big', say: 'Big Friends are pairs that make 10. 1 and 9, 2 and 8, 3 and 7, 4 and 6, 5 and 5.' },
    { t: 'demo', a: 8, b: 5, op: 'add', say: '8 + 5 is too big for one rod. Watch Babi use a Big Friend.' },
    { t: 'solve', a: 7, b: 6, op: 'add', say: 'Your turn: 7 + 6. Take away the Big Friend of 6, then add 1 ten.' },
    { t: 'solve', a: 9, b: 4, op: 'add', say: 'Try 9 + 4.' },
  ] },
  { id: 11, emoji: '🐘', title: 'Big Friends Take Away', unlocks: [9, 10], steps: [
    { t: 'demo', a: 13, b: 6, op: 'sub', say: '13 − 6: not enough ones! Watch Babi borrow a ten.' },
    { t: 'solve', a: 12, b: 7, op: 'sub', say: 'Your turn: 12 − 7. Take away 1 ten, then add the Big Friend of 7.' },
    { t: 'solve', a: 15, b: 8, op: 'sub', say: 'Try 15 − 8.' },
  ] },
];

// Which lesson teaches the trick a practice level needs.
export const LESSON_FOR_LEVEL = { 1: 6, 2: 6, 3: 7, 4: 7, 5: 8, 6: 9, 7: 9, 8: 10, 9: 11, 10: 11, 11: 10, 12: 11 };
