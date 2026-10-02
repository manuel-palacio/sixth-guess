import type { GuessRecord } from './clues.ts';
import { encodePattern, patternCode } from './feedback.ts';

/** Words that would have produced exactly the feedback seen so far. */
export function filterCandidates(words: readonly string[], history: GuessRecord[]): string[] {
  const observed = history.map(({ word, states }) => ({ word, code: encodePattern(states) }));
  return words.filter((answer) => observed.every(({ word, code }) => patternCode(word, answer) === code));
}
