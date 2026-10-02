import { describe, expect, it } from 'vitest';
import { deriveClues, letterPool, type GuessRecord } from './clues.ts';
import { scoreGuess } from './feedback.ts';

const play = (answer: string, ...words: string[]): GuessRecord[] =>
  words.map((word) => ({ word, states: scoreGuess(word, answer) }));

describe('deriveClues', () => {
  it('fills greens into the pattern', () => {
    expect(deriveClues(play('light', 'night')).greens).toEqual(['', 'i', 'g', 'h', 't']);
  });

  it('records yellows as ruled out for the position they were tried in', () => {
    const clues = deriveClues(play('abide', 'speed', 'debts'));
    expect(clues.excludedByPosition[2]).toEqual(['e', 'b']);
    expect(clues.excludedByPosition[0]).toEqual(['d']);
  });

  it('does not mark a repeated letter absent when another copy was found', () => {
    const clues = deriveClues(play('abide', 'speed'));
    expect(clues.absentLetters.has('e')).toBe(false);
    expect(clues.absentLetters.has('s')).toBe(true);
    expect(clues.minCounts.get('e')).toBe(1);
  });

  it('keeps the best state per letter for the keyboard', () => {
    const clues = deriveClues(play('abide', 'speed', 'abide'));
    expect(clues.keyStates.get('e')).toBe('correct');
    expect(clues.keyStates.get('s')).toBe('absent');
  });

  it('removes absent letters from the letter pool', () => {
    const pool = letterPool([...'abcdefghijklmnopqrstuvwxyz'], deriveClues(play('abide', 'speed')));
    expect(pool).not.toContain('s');
    expect(pool).not.toContain('p');
    expect(pool).toContain('e');
    expect(pool).toHaveLength(24);
  });
});
