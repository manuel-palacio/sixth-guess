import { describe, expect, it } from 'vitest';
import { abandonGame, checkGuess, GuessRejectedError, newGame, recordGuess, submitGuess } from './game.ts';

const WORDS = new Set(['crane', 'slate', 'abide', 'speed', 'blimp', 'aided', 'fight', 'night', 'light', 'might', 'sight', 'tight']);
const VALID = (word: string) => WORDS.has(word);

const rejectionOf = (attempt: () => unknown) => {
  try {
    attempt();
  } catch (error) {
    if (error instanceof GuessRejectedError) return error.reason;
  }
  throw new Error('Guess was not rejected');
};

describe('submitGuess', () => {
  it('records the scored guess', () => {
    const state = submitGuess(newGame('abide', false), 'speed', VALID);
    expect(state.guesses).toEqual([{ word: 'speed', states: ['absent', 'absent', 'present', 'absent', 'present'] }]);
    expect(state.status).toBe('playing');
  });

  it('wins on the answer', () => {
    expect(submitGuess(newGame('abide', false), 'abide', VALID).status).toBe('won');
  });

  it('loses after six misses', () => {
    let state = newGame('abide', false);
    for (const word of ['crane', 'slate', 'speed', 'blimp', 'fight', 'night']) state = submitGuess(state, word, VALID);
    expect(state.status).toBe('lost');
    expect(rejectionOf(() => submitGuess(state, 'abide', VALID))).toEqual({ kind: 'gameOver' });
  });

  it('rejects short guesses and words outside the list', () => {
    expect(rejectionOf(() => submitGuess(newGame('abide', false), 'abid', VALID))).toEqual({ kind: 'tooShort' });
    expect(rejectionOf(() => submitGuess(newGame('abide', false), 'zzzzz', VALID))).toEqual({ kind: 'notInList' });
  });

  it('enforces hard mode with a precise reason', () => {
    const state = submitGuess(newGame('light', true), 'fight', VALID);
    expect(rejectionOf(() => submitGuess(state, 'crane', VALID))).toEqual({
      kind: 'hardMode',
      violation: { kind: 'misplaced', position: 1, letter: 'i' },
    });
    expect(submitGuess(state, 'night', VALID).guesses).toHaveLength(2);
  });

  it('always accepts the answer, even when it is not in the word list', () => {
    expect(submitGuess(newGame('xyzzy', false), 'xyzzy', VALID).status).toBe('won');
  });

  it('does not enforce hard mode when it is off', () => {
    const state = submitGuess(newGame('light', false), 'fight', VALID);
    expect(submitGuess(state, 'crane', VALID).guesses).toHaveLength(2);
  });
});

describe('checkGuess and recordGuess', () => {
  it('validate without the answer and record a guess scored elsewhere', () => {
    const hidden = newGame('', true);
    expect(() => checkGuess(hidden, 'crane', () => true)).not.toThrow();
    const after = recordGuess(hidden, 'fight', ['absent', 'correct', 'correct', 'correct', 'correct']);
    expect(after.status).toBe('playing');
    expect(rejectionOf(() => checkGuess(after, 'crane', () => true))).toEqual({
      kind: 'hardMode',
      violation: { kind: 'misplaced', position: 1, letter: 'i' },
    });
    expect(recordGuess(after, 'light', ['correct', 'correct', 'correct', 'correct', 'correct']).status).toBe('won');
  });
});

describe('abandonGame', () => {
  it('ends a game in progress as lost, keeping its guesses', () => {
    const state = submitGuess(newGame('abide', false), 'speed', VALID);
    const abandoned = abandonGame(state);
    expect(abandoned.status).toBe('lost');
    expect(abandoned.guesses).toEqual(state.guesses);
  });

  it('leaves a finished game alone', () => {
    const won = submitGuess(newGame('abide', false), 'abide', VALID);
    expect(abandonGame(won)).toBe(won);
  });
});
