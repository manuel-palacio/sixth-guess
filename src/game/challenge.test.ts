import { describe, expect, it } from 'vitest';
import { boardFromVerdict, ChallengeError, createChallenge } from './challenge.ts';
import { newGame } from './game.ts';

describe('createChallenge', () => {
  it('normalizes the word for its language', () => {
    expect(createChallenge({ language: 'fr', word: ' Élève ', clue: '' })).toEqual({ language: 'fr', word: 'eleve', clue: '', from: '' });
    expect(createChallenge({ language: 'es', word: 'SEÑOR', clue: 'el profe' })).toEqual({ language: 'es', word: 'señor', clue: 'el profe', from: '' });
  });

  it('accepts words that are not in any dictionary', () => {
    expect(createChallenge({ language: 'en', word: 'zorbo', clue: 'our dog' }).word).toBe('zorbo');
  });

  it('rejects words that are not five letters of the alphabet', () => {
    expect(() => createChallenge({ language: 'en', word: 'four', clue: '' })).toThrow(ChallengeError);
    expect(() => createChallenge({ language: 'en', word: 'ab1de', clue: '' })).toThrow(ChallengeError);
    expect(() => createChallenge({ language: 'en', word: 'ab de', clue: '' })).toThrow(ChallengeError);
  });

  it('folds letters the language does not have', () => {
    expect(createChallenge({ language: 'en', word: 'señor', clue: '' }).word).toBe('senor');
  });

  it('trims the clue and caps its length', () => {
    expect(createChallenge({ language: 'en', word: 'crane', clue: `  ${'x'.repeat(200)}  ` }).clue).toHaveLength(80);
  });
});

describe('challenger name', () => {
  it('is optional, trimmed and capped', () => {
    expect(createChallenge({ language: 'en', word: 'crane', from: '  Ana  ' }).from).toBe('Ana');
    expect(createChallenge({ language: 'en', word: 'crane', from: 'x'.repeat(50) }).from).toHaveLength(30);
  });
});

describe('boardFromVerdict', () => {
  it('rebuilds guesses, status and the revealed answer from the server copy', () => {
    const verdict = { results: [['absent', 'absent', 'present', 'absent', 'present'], ['correct', 'correct', 'correct', 'correct', 'correct']], status: 'won', answer: 'abide' } as const;
    const board = boardFromVerdict({ ...newGame('', true), clue: 'x' }, ['speed', 'abide'], { ...verdict, results: verdict.results.map((row) => [...row]) });
    expect(board).toEqual({
      answer: 'abide',
      status: 'won',
      hardMode: true,
      clue: 'x',
      guesses: [
        { word: 'speed', states: ['absent', 'absent', 'present', 'absent', 'present'] },
        { word: 'abide', states: ['correct', 'correct', 'correct', 'correct', 'correct'] },
      ],
    });
  });

  it('keeps the answer hidden while the game is still going', () => {
    const board = boardFromVerdict(newGame('', false), ['speed'], { results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    expect(board.answer).toBe('');
    expect(board.status).toBe('playing');
  });
});
