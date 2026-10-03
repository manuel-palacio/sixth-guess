import { describe, expect, it } from 'vitest';
import { GuessRejectedError } from '../src/game/game.ts';
import { acceptsAnyLetters, judgeGuesses } from './challengeRules.ts';

const VALID = new Set(['crane', 'slate', 'speed', 'abide', 'fight', 'light', 'night', 'might', 'tight', 'sight']);
const zorbo = { language: 'en', word: 'zorbo', clue: '', from: '' } as const;
const abide = { language: 'en', word: 'abide', clue: '', from: '' } as const;

const reasonOf = (attempt: () => unknown) => {
  try {
    attempt();
  } catch (error) {
    if (error instanceof GuessRejectedError) return error.reason;
  }
  throw new Error('not rejected');
};

describe('judgeGuesses', () => {
  it('scores every guess without revealing the answer mid-game', () => {
    const verdict = judgeGuesses(abide, ['speed'], VALID);
    expect(verdict).toEqual({ results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
  });

  it('reveals the answer once the game is won or lost', () => {
    expect(judgeGuesses(abide, ['speed', 'abide'], VALID)).toMatchObject({ status: 'won', answer: 'abide' });
    const sixMisses = ['crane', 'slate', 'speed', 'fight', 'light', 'night'];
    expect(judgeGuesses(abide, sixMisses, VALID)).toMatchObject({ status: 'lost', answer: 'abide' });
  });

  it('rejects dictionary misses for a dictionary word, naming the guess', () => {
    expect(reasonOf(() => judgeGuesses(abide, ['speed', 'qxzvb'], VALID))).toEqual({ kind: 'notInList' });
  });

  it('accepts any five letters when the answer is outside the dictionary', () => {
    expect(judgeGuesses(zorbo, ['qxzvb', 'zorbo'], VALID).status).toBe('won');
  });

  it('rejects malformed requests and guesses after the end', () => {
    expect(reasonOf(() => judgeGuesses(abide, ['abide', 'crane'], VALID))).toEqual({ kind: 'gameOver' });
    expect(reasonOf(() => judgeGuesses(abide, ['abc'], VALID))).toEqual({ kind: 'tooShort' });
  });
});

describe('acceptsAnyLetters', () => {
  it('is true only for words outside the valid-guess list', () => {
    expect(acceptsAnyLetters(zorbo, VALID)).toBe(true);
    expect(acceptsAnyLetters(abide, VALID)).toBe(false);
  });
});
