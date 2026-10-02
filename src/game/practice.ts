export interface PracticePick {
  word: string;
  used: string[];
}

/** Random unused answer; once every word has been played the cycle starts again. */
export function pickPracticeWord(answers: readonly string[], used: readonly string[], random: () => number = Math.random): PracticePick {
  const usedSet = new Set(used);
  let unused = answers.filter((word) => !usedSet.has(word));
  let history = [...used];
  if (unused.length === 0) {
    unused = [...answers];
    history = [];
  }
  const word = unused[Math.floor(random() * unused.length)];
  return { word, used: [...history, word] };
}
