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

/** One player's guesses on a challenge, kept by the server so a reload or a script cannot start over. */
export interface Attempt {
  guesses: string[];
  /** Salted hash of the connection that started it; never the raw address. */
  originHash: string;
  startedAt: number;
}

export interface NewGuess {
  guess: string;
  /** The number of guesses the attempt must already have: a compare-and-set against concurrent requests. */
  expectedCount: number;
  originHash: string;
  now: number;
}

/** Persistence for challenges, their results and head-to-head series. */
export interface ChallengeStore {
  saveChallenge(challenge: StoredChallenge): Promise<void>;
  findChallenge(id: string): Promise<StoredChallenge | undefined>;
  /** Keeps a player's first finished game only; resolves true when this call stored it. */
  recordResultOnce(challengeId: string, result: PlayerResult): Promise<boolean>;
  findResult(challengeId: string, playerId: string): Promise<PlayerResult | undefined>;
  listResults(challengeId: string): Promise<PlayerResult[]>;
  findAttempt(challengeId: string, playerId: string): Promise<Attempt | undefined>;
  /** Appends a guess, creating the attempt for the first one; resolves false if the attempt moved on meanwhile. */
  appendGuess(challengeId: string, playerId: string, guess: NewGuess): Promise<boolean>;
  countAttemptsFrom(challengeId: string, originHash: string): Promise<number>;
  saveSeries(series: SeriesRecord): Promise<void>;
  findSeries(id: string): Promise<SeriesRecord | undefined>;
  /** Atomically adds points for a participant and returns the updated series. */
  addPoints(seriesId: string, playerId: string, points: number): Promise<SeriesRecord>;
}
