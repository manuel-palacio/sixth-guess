import type { Challenge } from '../src/game/challenge.ts';
import type { PlayerResult, SeriesScore } from '../src/game/series.ts';

export interface StoredChallenge extends Challenge {
  id: string;
  /** Revealed to the player once the game ends; may be empty. */
  story: string;
  creatorId: string;
  seriesId?: string;
  createdAt: number;
}

export interface SeriesRecord extends SeriesScore {
  id: string;
}

/** Persistence for challenges, their results and head-to-head series. */
export interface ChallengeStore {
  saveChallenge(challenge: StoredChallenge): Promise<void>;
  findChallenge(id: string): Promise<StoredChallenge | undefined>;
  /** Keeps a player's first finished game only; resolves true when this call stored it. */
  recordResultOnce(challengeId: string, result: PlayerResult): Promise<boolean>;
  findResult(challengeId: string, playerId: string): Promise<PlayerResult | undefined>;
  listResults(challengeId: string): Promise<PlayerResult[]>;
  saveSeries(series: SeriesRecord): Promise<void>;
  findSeries(id: string): Promise<SeriesRecord | undefined>;
  /** Atomically adds points for a participant and returns the updated series. */
  addPoints(seriesId: string, playerId: string, points: number): Promise<SeriesRecord>;
}
