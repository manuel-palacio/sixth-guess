import { describe, expect, it } from 'vitest';
import { averageStrategy, emptyStats, recordResult, recordStrategyScore, visibleStreak, winRate } from './stats.ts';

describe('recordResult', () => {
  it('counts plays, wins and the guess distribution', () => {
    let stats = recordResult(emptyStats(), { won: true, guessCount: 3 });
    stats = recordResult(stats, { won: false, guessCount: 6 });
    expect(stats.played).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.distribution).toEqual([0, 0, 1, 0, 0, 0]);
    expect(winRate(stats)).toBe(50);
  });

  it('tracks current and best streak', () => {
    let stats = emptyStats();
    for (const won of [true, true, true, false, true]) stats = recordResult(stats, { won, guessCount: 4 });
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(3);
  });

  it('breaks a daily streak when a day is skipped', () => {
    let stats = recordResult(emptyStats(), { won: true, guessCount: 4, day: 10 });
    stats = recordResult(stats, { won: true, guessCount: 4, day: 11 });
    expect(stats.currentStreak).toBe(2);
    stats = recordResult(stats, { won: true, guessCount: 4, day: 13 });
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(2);
  });

  it('does not mutate the input', () => {
    const stats = emptyStats();
    recordResult(stats, { won: true, guessCount: 1 });
    expect(stats).toEqual(emptyStats());
  });
});

describe('visibleStreak', () => {
  it('shows zero once yesterday was missed', () => {
    const stats = recordResult(emptyStats(), { won: true, guessCount: 4, day: 10 });
    expect(visibleStreak(stats, 11)).toBe(1);
    expect(visibleStreak(stats, 12)).toBe(0);
    expect(visibleStreak(stats)).toBe(1);
  });
});

describe('winRate', () => {
  it('is zero with no games', () => {
    expect(winRate(emptyStats())).toBe(0);
  });
});

describe('strategy average', () => {
  it('is undefined before any reviewed game', () => {
    expect(averageStrategy(emptyStats())).toBeUndefined();
  });

  it('averages recorded scores and survives later results', () => {
    let stats = recordStrategyScore(emptyStats(), 80);
    stats = recordStrategyScore(stats, 91);
    stats = recordResult(stats, { won: true, guessCount: 3 });
    expect(averageStrategy(stats)).toBe(86);
  });
});
