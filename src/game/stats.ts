import { MAX_GUESSES } from './game.ts';

export interface Stats {
  played: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  /** distribution[n] = games won in n + 1 guesses */
  distribution: number[];
  /** Daily mode only: the day of the last recorded game, to break streaks on skipped days. */
  lastDay?: number;
  /** Sum and count of per-game strategy scores, for the running average. */
  strategyTotal?: number;
  strategyGames?: number;
}

export interface GameResult {
  won: boolean;
  guessCount: number;
  day?: number;
}

export function emptyStats(): Stats {
  return { played: 0, wins: 0, currentStreak: 0, bestStreak: 0, distribution: new Array(MAX_GUESSES).fill(0) };
}

export function recordResult(stats: Stats, result: GameResult): Stats {
  const skippedADay = result.day !== undefined && stats.lastDay !== undefined && result.day > stats.lastDay + 1;
  const streakSoFar = skippedADay ? 0 : stats.currentStreak;
  const currentStreak = result.won ? streakSoFar + 1 : 0;
  const distribution = [...stats.distribution];
  if (result.won) distribution[result.guessCount - 1]++;
  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(stats.bestStreak, currentStreak),
    distribution,
    lastDay: result.day ?? stats.lastDay,
    strategyTotal: stats.strategyTotal,
    strategyGames: stats.strategyGames,
  };
}

export function recordStrategyScore(stats: Stats, score: number): Stats {
  return { ...stats, strategyTotal: (stats.strategyTotal ?? 0) + score, strategyGames: (stats.strategyGames ?? 0) + 1 };
}

/** Average strategy score, or undefined before any game has been reviewed. */
export function averageStrategy(stats: Stats): number | undefined {
  if (!stats.strategyGames) return undefined;
  return Math.round((stats.strategyTotal ?? 0) / stats.strategyGames);
}

/** A daily streak also ends when yesterday's game was never played. */
export function visibleStreak(stats: Stats, today?: number): number {
  if (today === undefined || stats.lastDay === undefined) return stats.currentStreak;
  return today > stats.lastDay + 1 ? 0 : stats.currentStreak;
}

export function winRate(stats: Stats): number {
  return stats.played === 0 ? 0 : Math.round((stats.wins / stats.played) * 100);
}
