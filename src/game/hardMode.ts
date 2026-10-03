import { deriveClues, type Clues, type GuessRecord } from './clues.ts';

/** A broken hard-mode rule; position is zero-based. */
export type HardModeViolation =
  | { kind: 'misplaced'; position: number; letter: string }
  | { kind: 'missing'; letter: string; count: number };

/** Every revealed green must stay in place and every revealed letter must be reused. */
export function findHardModeViolations(guess: string, history: GuessRecord[]): HardModeViolation[] {
  return violationsAgainst(guess, deriveClues(history));
}

/** A predicate for filtering many guesses against the same history. */
export function hardModeLegality(history: GuessRecord[]): (guess: string) => boolean {
  const clues = deriveClues(history);
  return (guess) => violationsAgainst(guess, clues).length === 0;
}

function violationsAgainst(guess: string, clues: Clues): HardModeViolation[] {
  const violations: HardModeViolation[] = [];
  clues.greens.forEach((letter, position) => {
    if (letter && guess[position] !== letter) violations.push({ kind: 'misplaced', position, letter });
  });
  for (const [letter, count] of clues.minCounts) {
    if (countLetter(guess, letter) < count) violations.push({ kind: 'missing', letter, count });
  }
  return violations;
}

function countLetter(word: string, letter: string): number {
  return [...word].filter((candidate) => candidate === letter).length;
}
