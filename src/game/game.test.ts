import { describe, expect, it } from 'vitest';
import { GuessRejectedError, newGame, submitGuess } from './game.ts';

const VALID = new Set(['crane', 'slate', 'abide', 'speed', 'blimp', 'aided', 'fight', 'night', 'light', 'might', 'sight', 'tight']);

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
    expect(() => submitGuess(state, 'abide', VALID)).toThrow('The game is over');
  });

  it('rejects short guesses and words outside the list', () => {
    expect(() => submitGuess(newGame('abide', false), 'abid', VALID)).toThrow('Not enough letters');
    expect(() => submitGuess(newGame('abide', false), 'zzzzz', VALID)).toThrow(GuessRejectedError);
  });

  it('enforces hard mode with a precise reason', () => {
    const state = submitGuess(newGame('light', true), 'fight', VALID);
    expect(() => submitGuess(state, 'crane', VALID)).toThrow('2nd letter must be I');
    expect(submitGuess(state, 'night', VALID).guesses).toHaveLength(2);
  });

  it('does not enforce hard mode when it is off', () => {
    const state = submitGuess(newGame('light', false), 'fight', VALID);
    expect(submitGuess(state, 'crane', VALID).guesses).toHaveLength(2);
  });
});
