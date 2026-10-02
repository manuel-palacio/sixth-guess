import { deriveClues, type Clues, type GuessRecord } from './clues.ts';

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th'];

/** Every revealed green must stay in place and every revealed letter must be reused. Returns the broken rules. */
export function findHardModeViolations(guess: string, history: GuessRecord[]): string[] {
  return violationsAgainst(guess, deriveClues(history));
}

/** A predicate for filtering many guesses against the same history. */
export function hardModeLegality(history: GuessRecord[]): (guess: string) => boolean {
  const clues = deriveClues(history);
  return (guess) => violationsAgainst(guess, clues).length === 0;
}

function violationsAgainst(guess: string, clues: Clues): string[] {
  const violations: string[] = [];
  clues.greens.forEach((letter, position) => {
    if (letter && guess[position] !== letter) {
      violations.push(`${ORDINALS[position]} letter must be ${letter.toUpperCase()}`);
    }
  });
  for (const [letter, required] of clues.minCounts) {
    if (countLetter(guess, letter) < required) violations.push(describeMissingLetter(letter, required));
  }
  return violations;
}

function describeMissingLetter(letter: string, required: number): string {
  const upper = letter.toUpperCase();
  return required === 1 ? `Guess must contain ${upper}` : `Guess must contain ${required} ${upper}s`;
}

function countLetter(word: string, letter: string): number {
  return [...word].filter((candidate) => candidate === letter).length;
}
