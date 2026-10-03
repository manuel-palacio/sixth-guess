import type { TileState } from './feedback.ts';
import { MAX_GUESSES } from './game.ts';

/** One player's finished game on a friend's challenge, as shown on its scoreboard. */
export interface PlayerResult {
  playerId: string;
  name: string;
  won: boolean;
  guessCount: number;
  grid: TileState[][];
  strategy: number;
  finishedAt: number;
}

/** A head-to-head series: each solve of the other player's word earns points. */
export interface SeriesScore {
  round: number;
  players: { playerId: string; name: string; points: number }[];
}

/** 6 points for one guess down to 1 for six; a miss earns nothing. */
export function pointsFor({ won, guessCount }: { won: boolean; guessCount: number }): number {
  return won ? MAX_GUESSES + 1 - guessCount : 0;
}

export function rankResults(results: readonly PlayerResult[]): PlayerResult[] {
  return [...results].sort(
    (a, b) =>
      Number(b.won) - Number(a.won) ||
      a.guessCount - b.guessCount ||
      b.strategy - a.strategy ||
      a.finishedAt - b.finishedAt,
  );
}
