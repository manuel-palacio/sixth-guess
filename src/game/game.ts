import type { GuessRecord } from './clues.ts';
import { scoreGuess, WORD_LENGTH, type TileState } from './feedback.ts';
import { findHardModeViolations, type HardModeViolation } from './hardMode.ts';

export const MAX_GUESSES = 6;

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  answer: string;
  guesses: GuessRecord[];
  status: GameStatus;
  hardMode: boolean;
}

export type RejectionReason =
  | { kind: 'gameOver' }
  | { kind: 'tooShort' }
  | { kind: 'notInList' }
  | { kind: 'hardMode'; violation: HardModeViolation };

export class GuessRejectedError extends Error {
  readonly reason: RejectionReason;

  constructor(reason: RejectionReason) {
    super(reason.kind);
    this.reason = reason;
  }
}

export function newGame(answer: string, hardMode: boolean): GameState {
  return { answer, guesses: [], status: 'playing', hardMode };
}

export function submitGuess(state: GameState, guess: string, isValidGuess: (word: string) => boolean): GameState {
  checkGuess(state, guess, isValidGuess);
  return recordGuess(state, guess, scoreGuess(guess, state.answer));
}

/** Throws GuessRejectedError when the guess breaks a rule that can be checked without the answer. */
export function checkGuess(state: GameState, guess: string, isValidGuess: (word: string) => boolean): void {
  if (state.status !== 'playing') throw new GuessRejectedError({ kind: 'gameOver' });
  if ([...guess].length !== WORD_LENGTH) throw new GuessRejectedError({ kind: 'tooShort' });
  if (guess !== state.answer && !isValidGuess(guess)) throw new GuessRejectedError({ kind: 'notInList' });
  if (!state.hardMode) return;
  const [violation] = findHardModeViolations(guess, state.guesses);
  if (violation) throw new GuessRejectedError({ kind: 'hardMode', violation });
}

/** Adds a guess scored elsewhere (such as by the server for a friend's challenge). */
export function recordGuess(state: GameState, guess: string, states: TileState[]): GameState {
  const guesses = [...state.guesses, { word: guess, states }];
  return { ...state, guesses, status: statusAfter(states, guesses.length) };
}

function statusAfter(states: TileState[], guessCount: number): GameStatus {
  if (states.every((state) => state === 'correct')) return 'won';
  return guessCount >= MAX_GUESSES ? 'lost' : 'playing';
}
