import { randomBytes } from 'node:crypto';
import { ChallengeError, createChallenge, type ChallengeDraft, type Verdict } from '../src/game/challenge.ts';
import { buildReview, strategyScore } from '../src/game/review.ts';
import { pointsFor, rankResults, type PlayerResult, type SeriesScore } from '../src/game/series.ts';
import { openChallenge } from './challengeCrypto.ts';
import { judgeGuesses, acceptsAnyLetters } from './challengeRules.ts';
import type { ChallengeStore, SeriesRecord, StoredChallenge } from './store.ts';
import type { WordBanks } from './wordSets.ts';

const MAX_STORY_LENGTH = 280;
const MAX_NAME_LENGTH = 30;
const PLAYER_ID = /^[A-Za-z0-9_-]{8,64}$/;
// Links made before challenges were stored are sealed codes; they still open, without a creator.
const SEALED_CODE_MIN_LENGTH = 41;

export class BadRequestError extends Error {}

export interface CreateRequest {
  draft: ChallengeDraft;
  story: string;
  playerId: string;
  /** The challenge being answered with "Challenge back", which starts or continues a series. */
  replyTo?: string;
}

export interface ChallengeView {
  language: StoredChallenge['language'];
  clue: string;
  from: string;
  anyLetters: boolean;
  series?: SeriesScore;
}

export interface JudgeRequest {
  guesses: string[];
  playerId: string;
  name: string;
}

interface ServiceOptions {
  now?: () => number;
  newId?: () => string;
}

export class ChallengeService {
  private readonly store: ChallengeStore;
  private readonly banks: WordBanks;
  private readonly legacyKey: Buffer;
  private readonly now: () => number;
  private readonly newId: () => string;

  constructor(store: ChallengeStore, banks: WordBanks, legacyKey: Buffer, options: ServiceOptions = {}) {
    this.store = store;
    this.banks = banks;
    this.legacyKey = legacyKey;
    this.now = options.now ?? Date.now;
    this.newId = options.newId ?? (() => randomBytes(9).toString('base64url'));
  }

  async create({ draft, story, playerId, replyTo }: CreateRequest): Promise<{ id: string }> {
    requirePlayerId(playerId);
    const challenge = createChallenge({ ...draft, from: trimTo(draft.from ?? '', MAX_NAME_LENGTH) });
    const record: StoredChallenge = { ...challenge, id: this.newId(), story: trimTo(story, MAX_STORY_LENGTH), creatorId: playerId, createdAt: this.now() };
    if (replyTo) record.seriesId = await this.continueSeries(replyTo, playerId, challenge.from);
    await this.store.saveChallenge(record);
    return { id: record.id };
  }

  async describe(id: string): Promise<ChallengeView> {
    const record = await this.load(id);
    const view: ChallengeView = {
      language: record.language,
      clue: record.clue,
      from: record.from,
      anyLetters: acceptsAnyLetters(record, this.banks[record.language].validGuesses),
    };
    const series = record.seriesId ? await this.store.findSeries(record.seriesId) : undefined;
    return series ? { ...view, series: toScore(series) } : view;
  }

  /** Scores the guesses; once the game ends, records the result and reveals the word, story and scoreboard. */
  async judge(id: string, { guesses, playerId, name }: JudgeRequest): Promise<Verdict> {
    requirePlayerId(playerId);
    const record = await this.load(id);
    const verdict = judgeGuesses(record, guesses, this.banks[record.language].validGuesses);
    if (verdict.status === 'playing') return verdict;
    let series = record.seriesId ? await this.store.findSeries(record.seriesId) : undefined;
    if (playerId !== record.creatorId) {
      const result = this.buildResult(record, guesses, verdict, playerId, trimTo(name, MAX_NAME_LENGTH));
      const isNew = await this.store.recordResultOnce(id, result);
      const isParticipant = series?.players.some((player) => player.playerId === playerId);
      if (isNew && series && isParticipant) series = await this.store.addPoints(series.id, playerId, pointsFor(result));
    }
    const scoreboard = rankResults(await this.store.listResults(id));
    return { ...verdict, story: record.story, scoreboard, ...(series ? { series: toScore(series) } : {}) };
  }

  async scoreboard(id: string): Promise<{ scoreboard: PlayerResult[] }> {
    await this.load(id);
    return { scoreboard: rankResults(await this.store.listResults(id)) };
  }

  private async load(id: string): Promise<StoredChallenge> {
    const stored = await this.store.findChallenge(id);
    if (stored) return stored;
    if (id.length < SEALED_CODE_MIN_LENGTH) throw new ChallengeError('broken');
    return { ...openChallenge(id, this.legacyKey), id, story: '', creatorId: '', createdAt: 0 };
  }

  /** The first reply starts a series between the two players, crediting the replier's result on the word they answer. */
  private async continueSeries(replyTo: string, playerId: string, name: string): Promise<string | undefined> {
    const previous = await this.load(replyTo);
    const existing = previous.seriesId ? await this.store.findSeries(previous.seriesId) : undefined;
    if (existing) {
      const players = existing.players.map((player) => (player.playerId === playerId && name ? { ...player, name } : player));
      await this.store.saveSeries({ ...existing, round: existing.round + 1, players });
      return existing.id;
    }
    if (!previous.creatorId || previous.creatorId === playerId) return undefined;
    const earlier = await this.store.findResult(previous.id, playerId);
    const series: SeriesRecord = {
      id: this.newId(),
      round: 2,
      players: [
        { playerId: previous.creatorId, name: previous.from, points: 0 },
        { playerId, name, points: earlier ? pointsFor(earlier) : 0 },
      ],
    };
    await this.store.saveSeries(series);
    return series.id;
  }

  private buildResult(record: StoredChallenge, guesses: string[], verdict: Verdict, playerId: string, name: string): PlayerResult {
    const bank = this.banks[record.language];
    const history = guesses.map((word, index) => ({ word, states: verdict.results[index] }));
    const universe = bank.validGuesses.has(record.word) ? bank.guesses : [...bank.guesses, record.word];
    const review = buildReview({ answers: universe, guessPool: bank.guesses, history, hardMode: false, opener: bank.opener });
    return {
      playerId,
      name,
      won: verdict.status === 'won',
      guessCount: guesses.length,
      grid: verdict.results,
      strategy: strategyScore(review),
      finishedAt: this.now(),
    };
  }
}

function toScore({ round, players }: SeriesRecord): SeriesScore {
  return { round, players };
}

function requirePlayerId(playerId: unknown): void {
  if (typeof playerId !== 'string' || !PLAYER_ID.test(playerId)) throw new BadRequestError('Missing player id');
}

function trimTo(text: string, maxLength: number): string {
  return [...text.trim()].slice(0, maxLength).join('');
}
