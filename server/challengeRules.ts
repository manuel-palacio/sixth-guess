import type { Challenge, Verdict } from '../src/game/challenge.ts';
import { newGame, submitGuess } from '../src/game/game.ts';
import { isPlayableWord } from '../src/game/language.ts';

/** A friend's word outside the dictionary could never be typed otherwise, and rejections would leak it. */
export function acceptsAnyLetters(challenge: Challenge, validGuesses: ReadonlySet<string>): boolean {
  return !validGuesses.has(challenge.word);
}

/**
 * Replays the whole guess history against the hidden word. Stateless: the browser sends every guess
 * each time, which also lets a reloaded page recover its board.
 */
export function judgeGuesses(challenge: Challenge, guesses: string[], validGuesses: ReadonlySet<string>): Verdict {
  const anyLetters = acceptsAnyLetters(challenge, validGuesses);
  const isValid = (word: string) => validGuesses.has(word) || (anyLetters && isPlayableWord(challenge.language, word));
  const game = guesses.reduce((state, guess) => submitGuess(state, guess, isValid), newGame(challenge.word, false));
  const verdict: Verdict = { results: game.guesses.map(({ states }) => states), status: game.status };
  return game.status === 'playing' ? verdict : { ...verdict, answer: challenge.word };
}
