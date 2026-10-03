import { describe, expect, it } from 'vitest';
import { pointsFor, rankResults, type PlayerResult } from './series.ts';

const result = (name: string, won: boolean, guessCount: number, strategy: number, finishedAt: number): PlayerResult => ({
  playerId: name,
  name,
  won,
  guessCount,
  grid: [],
  strategy,
  finishedAt,
});

describe('pointsFor', () => {
  it('rewards fewer guesses: 6 for one guess down to 1 for six, none for a miss', () => {
    expect(pointsFor({ won: true, guessCount: 1 })).toBe(6);
    expect(pointsFor({ won: true, guessCount: 4 })).toBe(3);
    expect(pointsFor({ won: true, guessCount: 6 })).toBe(1);
    expect(pointsFor({ won: false, guessCount: 6 })).toBe(0);
  });
});

describe('rankResults', () => {
  it('puts solvers first, then fewer guesses, better strategy and the earliest finish', () => {
    const ranked = rankResults([
      result('miss', false, 6, 90, 1),
      result('slowWin', true, 5, 99, 1),
      result('fastLate', true, 3, 70, 9),
      result('fastEarly', true, 3, 70, 2),
      result('fastSmart', true, 3, 95, 5),
    ]);
    expect(ranked.map((entry) => entry.name)).toEqual(['fastSmart', 'fastEarly', 'fastLate', 'slowWin', 'miss']);
  });

  it('does not mutate its input', () => {
    const input = [result('b', false, 6, 0, 1), result('a', true, 2, 0, 1)];
    rankResults(input);
    expect(input[0].name).toBe('b');
  });
});
