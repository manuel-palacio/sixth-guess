import { WORD_LENGTH, type TileState } from './feedback.ts';

export interface GuessRecord {
  word: string;
  states: TileState[];
}

export interface Clues {
  /** Known letter per position, '' when unknown. */
  greens: string[];
  /** Yellow letters ruled out for each position. */
  excludedByPosition: string[][];
  /** Letters proven absent from the answer. */
  absentLetters: Set<string>;
  /** Minimum number of copies of each letter the answer must contain. */
  minCounts: Map<string, number>;
  /** Best known state per letter, for colouring the keyboard. */
  keyStates: Map<string, TileState>;
}

const STATE_RANK: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };

export function deriveClues(history: GuessRecord[]): Clues {
  const clues: Clues = {
    greens: new Array(WORD_LENGTH).fill(''),
    excludedByPosition: Array.from({ length: WORD_LENGTH }, () => []),
    absentLetters: new Set(),
    minCounts: new Map(),
    keyStates: new Map(),
  };
  for (const guess of history) applyGuess(clues, guess);
  for (const letter of clues.minCounts.keys()) clues.absentLetters.delete(letter);
  return clues;
}

export function letterPool(alphabet: string[], clues: Clues): string[] {
  return alphabet.filter((letter) => !clues.absentLetters.has(letter));
}

function applyGuess(clues: Clues, { word, states }: GuessRecord): void {
  const foundCopies = new Map<string, number>();
  [...word].forEach((letter, position) => {
    const state = states[position];
    recordKeyState(clues, letter, state);
    if (state === 'absent') {
      clues.absentLetters.add(letter);
      return;
    }
    foundCopies.set(letter, (foundCopies.get(letter) ?? 0) + 1);
    if (state === 'correct') clues.greens[position] = letter;
    else if (!clues.excludedByPosition[position].includes(letter)) clues.excludedByPosition[position].push(letter);
  });
  for (const [letter, copies] of foundCopies) {
    clues.minCounts.set(letter, Math.max(copies, clues.minCounts.get(letter) ?? 0));
  }
}

function recordKeyState(clues: Clues, letter: string, state: TileState): void {
  const known = clues.keyStates.get(letter);
  if (!known || STATE_RANK[state] > STATE_RANK[known]) clues.keyStates.set(letter, state);
}
