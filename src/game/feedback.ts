export type TileState = 'correct' | 'present' | 'absent';

export const WORD_LENGTH = 5;
export const WINNING_PATTERN = 242;

const STATE_WEIGHT: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };
const letterBudget = new Int8Array(0x10000);

/** Greens first, then yellows left to right while copies of the letter remain unclaimed. */
export function scoreGuess(guess: string, answer: string): TileState[] {
  const states: TileState[] = new Array(WORD_LENGTH).fill('absent');
  const unclaimed = new Map<string, number>();
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) states[i] = 'correct';
    else unclaimed.set(answer[i], (unclaimed.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    const remaining = unclaimed.get(guess[i]) ?? 0;
    if (states[i] === 'correct' || remaining === 0) continue;
    states[i] = 'present';
    unclaimed.set(guess[i], remaining - 1);
  }
  return states;
}

/** Same result as scoreGuess, encoded base 3 (absent 0, present 1, correct 2); hot path for the solver. */
export function patternCode(guess: string, answer: string): number {
  let greenMask = 0;
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess.charCodeAt(i) === answer.charCodeAt(i)) greenMask |= 1 << i;
    else letterBudget[answer.charCodeAt(i)]++;
  }
  let code = 0;
  for (let i = 0; i < WORD_LENGTH; i++) {
    const letter = guess.charCodeAt(i);
    let weight = 0;
    if (greenMask & (1 << i)) weight = 2;
    else if (letterBudget[letter] > 0) {
      weight = 1;
      letterBudget[letter]--;
    }
    code = code * 3 + weight;
  }
  for (let i = 0; i < WORD_LENGTH; i++) letterBudget[answer.charCodeAt(i)] = 0;
  return code;
}

export function encodePattern(states: TileState[]): number {
  return states.reduce((code, state) => code * 3 + STATE_WEIGHT[state], 0);
}
