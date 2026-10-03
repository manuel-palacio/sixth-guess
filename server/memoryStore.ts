import type { PlayerResult } from '../src/game/series.ts';
import type { Attempt, ChallengeStore, NewGuess, SeriesRecord, StoredChallenge } from './store.ts';

/** For local development and tests; everything is lost on restart. */
export class MemoryStore implements ChallengeStore {
  private readonly challenges = new Map<string, StoredChallenge>();
  private readonly results = new Map<string, Map<string, PlayerResult>>();
  private readonly series = new Map<string, SeriesRecord>();
  private readonly attempts = new Map<string, Map<string, Attempt>>();

  async saveChallenge(challenge: StoredChallenge): Promise<void> {
    this.challenges.set(challenge.id, structuredClone(challenge));
  }

  async findChallenge(id: string): Promise<StoredChallenge | undefined> {
    return structuredClone(this.challenges.get(id));
  }

  async recordResultOnce(challengeId: string, result: PlayerResult): Promise<boolean> {
    const results = this.results.get(challengeId) ?? new Map<string, PlayerResult>();
    this.results.set(challengeId, results);
    if (results.has(result.playerId)) return false;
    results.set(result.playerId, structuredClone(result));
    return true;
  }

  async findResult(challengeId: string, playerId: string): Promise<PlayerResult | undefined> {
    return structuredClone(this.results.get(challengeId)?.get(playerId));
  }

  async listResults(challengeId: string): Promise<PlayerResult[]> {
    return [...(this.results.get(challengeId)?.values() ?? [])].map((result) => structuredClone(result));
  }

  async findAttempt(challengeId: string, playerId: string): Promise<Attempt | undefined> {
    return structuredClone(this.attempts.get(challengeId)?.get(playerId));
  }

  async appendGuess(challengeId: string, playerId: string, { guess, expectedCount, originHash, now }: NewGuess): Promise<boolean> {
    const attempts = this.attempts.get(challengeId) ?? new Map<string, Attempt>();
    this.attempts.set(challengeId, attempts);
    const attempt = attempts.get(playerId) ?? { guesses: [], originHash, startedAt: now };
    if (attempt.guesses.length !== expectedCount) return false;
    attempts.set(playerId, { ...attempt, guesses: [...attempt.guesses, guess] });
    return true;
  }

  async countAttemptsFrom(challengeId: string, originHash: string): Promise<number> {
    return [...(this.attempts.get(challengeId)?.values() ?? [])].filter((attempt) => attempt.originHash === originHash).length;
  }

  async saveSeries(series: SeriesRecord): Promise<void> {
    this.series.set(series.id, structuredClone(series));
  }

  async findSeries(id: string): Promise<SeriesRecord | undefined> {
    return structuredClone(this.series.get(id));
  }

  async addPoints(seriesId: string, playerId: string, points: number): Promise<SeriesRecord> {
    const series = this.series.get(seriesId);
    if (!series) throw new Error(`Unknown series ${seriesId}`);
    for (const player of series.players) if (player.playerId === playerId) player.points += points;
    return structuredClone(series);
  }
}
