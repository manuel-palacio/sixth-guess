import type { GuessRecord } from './clues.ts';
import { scoreGuess, WORD_LENGTH } from './feedback.ts';
import { findHardModeViolations } from './hardMode.ts';

export const MAX_GUESSES = 6;

export type GameStatus = 'playing' | 'won' | 'lost';

export interface GameState {
  answer: string;
  guesses: GuessRecord[];
  status: GameStatus;
  hardMode: boolean;
}

export class GuessRejectedError extends Error {}

export function newGame(answer: string, hardMode: boolean): GameState {
  return { answer, guesses: [], status: 'playing', hardMode };
}

export function submitGuess(state: GameState, guess: string, validGuesses: ReadonlySet<string>): GameState {
  rejectInvalidGuess(state, guess, validGuesses);
  const guesses = [...state.guesses, { word: guess, states: scoreGuess(guess, state.answer) }];
  return { ...state, guesses, status: statusAfter(guess, state.answer, guesses.length) };
}

function rejectInvalidGuess(state: GameState, guess: string, validGuesses: ReadonlySet<string>): void {
  if (state.status !== 'playing') throw new GuessRejectedError('The game is over');
  if ([...guess].length !== WORD_LENGTH) throw new GuessRejectedError('Not enough letters');
  if (!validGuesses.has(guess)) throw new GuessRejectedError('Not in word list');
  if (!state.hardMode) return;
  const [firstViolation] = findHardModeViolations(guess, state.guesses);
  if (firstViolation) throw new GuessRejectedError(firstViolation);
}

function statusAfter(guess: string, answer: string, guessCount: number): GameStatus {
  if (guess === answer) return 'won';
  return guessCount >= MAX_GUESSES ? 'lost' : 'playing';
}
