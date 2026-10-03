import type { PlayerResult } from '../src/game/series.ts';
import type { ChallengeStore, SeriesRecord, StoredChallenge } from './store.ts';

/** For local development and tests; everything is lost on restart. */
export class MemoryStore implements ChallengeStore {
  private readonly challenges = new Map<string, StoredChallenge>();
  private readonly results = new Map<string, Map<string, PlayerResult>>();
  private readonly series = new Map<string, SeriesRecord>();

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
