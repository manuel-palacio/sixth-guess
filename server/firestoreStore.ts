import { Firestore } from '@google-cloud/firestore';
import type { PlayerResult } from '../src/game/series.ts';
import type { Attempt, ChallengeStore, NewGuess, SeriesRecord, StoredChallenge } from './store.ts';

const ALREADY_EXISTS = 6;

/**
 * challenges/{id}, challenges/{id}/results/{playerId} and series/{id}.
 * On Cloud Run the project and credentials come from the environment.
 */
export class FirestoreStore implements ChallengeStore {
  private readonly db = new Firestore({ ignoreUndefinedProperties: true });

  async saveChallenge(challenge: StoredChallenge): Promise<void> {
    await this.db.collection('challenges').doc(challenge.id).set(challenge);
  }

  async findChallenge(id: string): Promise<StoredChallenge | undefined> {
    const snapshot = await this.db.collection('challenges').doc(id).get();
    return snapshot.exists ? (snapshot.data() as StoredChallenge) : undefined;
  }

  async recordResultOnce(challengeId: string, result: PlayerResult): Promise<boolean> {
    try {
      // Firestore cannot store nested arrays, so the grid is kept as one string per guess.
      await this.resultRef(challengeId, result.playerId).create({ ...result, grid: result.grid.map((row) => row.join(',')) });
      return true;
    } catch (error) {
      if ((error as { code?: number }).code === ALREADY_EXISTS) return false;
      throw error;
    }
  }

  async findResult(challengeId: string, playerId: string): Promise<PlayerResult | undefined> {
    const snapshot = await this.resultRef(challengeId, playerId).get();
    return snapshot.exists ? toResult(snapshot.data()!) : undefined;
  }

  async listResults(challengeId: string): Promise<PlayerResult[]> {
    const snapshot = await this.db.collection('challenges').doc(challengeId).collection('results').get();
    return snapshot.docs.map((doc) => toResult(doc.data()));
  }

  async findAttempt(challengeId: string, playerId: string): Promise<Attempt | undefined> {
    const snapshot = await this.attemptRef(challengeId, playerId).get();
    return snapshot.exists ? (snapshot.data() as Attempt) : undefined;
  }

  async appendGuess(challengeId: string, playerId: string, { guess, expectedCount, originHash, now }: NewGuess): Promise<boolean> {
    const ref = this.attemptRef(challengeId, playerId);
    return this.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const attempt = snapshot.exists ? (snapshot.data() as Attempt) : { guesses: [], originHash, startedAt: now };
      if (attempt.guesses.length !== expectedCount) return false;
      transaction.set(ref, { ...attempt, guesses: [...attempt.guesses, guess] });
      return true;
    });
  }

  async countAttemptsFrom(challengeId: string, originHash: string): Promise<number> {
    const query = this.db.collection('challenges').doc(challengeId).collection('attempts').where('originHash', '==', originHash);
    return (await query.count().get()).data().count;
  }

  async saveSeries(series: SeriesRecord): Promise<void> {
    await this.db.collection('series').doc(series.id).set(series);
  }

  async findSeries(id: string): Promise<SeriesRecord | undefined> {
    const snapshot = await this.db.collection('series').doc(id).get();
    return snapshot.exists ? (snapshot.data() as SeriesRecord) : undefined;
  }

  async addPoints(seriesId: string, playerId: string, points: number): Promise<SeriesRecord> {
    const ref = this.db.collection('series').doc(seriesId);
    return this.db.runTransaction(async (transaction) => {
      const series = (await transaction.get(ref)).data() as SeriesRecord;
      const players = series.players.map((player) => (player.playerId === playerId ? { ...player, points: player.points + points } : player));
      transaction.update(ref, { players });
      return { ...series, players };
    });
  }

  private attemptRef(challengeId: string, playerId: string) {
    return this.db.collection('challenges').doc(challengeId).collection('attempts').doc(playerId);
  }

  private resultRef(challengeId: string, playerId: string) {
    return this.db.collection('challenges').doc(challengeId).collection('results').doc(playerId);
  }
}

function toResult(data: FirebaseFirestore.DocumentData): PlayerResult {
  return { ...(data as PlayerResult), grid: (data.grid as string[]).map((row) => row.split(',')) as PlayerResult['grid'] };
}
