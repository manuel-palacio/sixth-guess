import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChallengeError } from '../src/game/challenge.ts';
import { GuessRejectedError } from '../src/game/game.ts';
import { sealChallenge } from './challengeCrypto.ts';
import { BadRequestError, ChallengeService } from './challengeService.ts';
import { MemoryStore } from './memoryStore.ts';
import { loadWordBanks } from './wordSets.ts';

const banks = loadWordBanks();
const key = randomBytes(32);
const ANA = 'player-ana-0001';
const MANU = 'player-manu-001';
const LUIS = 'player-luis-001';

let service: ChallengeService;
let clock: number;

beforeEach(() => {
  clock = 1000;
  let counter = 0;
  service = new ChallengeService(new MemoryStore(), banks, key, { now: () => clock++, newId: () => `id${String(++counter).padStart(10, '0')}` });
});

const create = (word: string, playerId: string, from: string, extra: { story?: string; replyTo?: string; language?: 'en' | 'es' } = {}) =>
  service.create({ draft: { language: extra.language ?? 'en', word, from }, story: extra.story ?? '', playerId, replyTo: extra.replyTo });

describe('creating and describing', () => {
  it('stores the challenge under a short id and never describes the word', async () => {
    const { id } = await create('zorbo', ANA, 'Ana');
    expect(id).toHaveLength(12);
    const view = await service.describe(id);
    expect(view).toEqual({ language: 'en', clue: '', from: 'Ana', anyLetters: true });
    expect(JSON.stringify(view)).not.toContain('zorbo');
  });

  it('rejects a missing player id and unknown links', async () => {
    await expect(create('crane', 'x', 'Ana')).rejects.toThrow(BadRequestError);
    await expect(service.describe('nope')).rejects.toThrow(ChallengeError);
  });

  it('still opens links sealed before challenges were stored', async () => {
    const code = sealChallenge({ language: 'en', word: 'crane', clue: 'old', from: 'Ana' }, key);
    expect((await service.describe(code)).clue).toBe('old');
    expect((await service.judge(code, { guesses: ['crane'], playerId: MANU, name: 'Manu' })).status).toBe('won');
  });
});

describe('judging and results', () => {
  it('reveals nothing mid-game, then the word, story and scoreboard at the end', async () => {
    const { id } = await create('abide', ANA, 'Ana', { story: 'Our first flat' });
    const midGame = await service.judge(id, { guesses: ['speed'], playerId: MANU, name: 'Manu' });
    expect(midGame).toEqual({ results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    const end = await service.judge(id, { guesses: ['speed', 'abide'], playerId: MANU, name: 'Manu' });
    expect(end).toMatchObject({ status: 'won', answer: 'abide', story: 'Our first flat' });
    expect(end.scoreboard).toEqual([
      expect.objectContaining({ playerId: MANU, name: 'Manu', won: true, guessCount: 2, strategy: expect.any(Number) }),
    ]);
  });

  it('keeps each player’s first finished game and ranks everyone who played the link', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await service.judge(id, { guesses: ['crane', 'slate', 'speed', 'fight', 'light', 'night'], playerId: LUIS, name: 'Luis' });
    await service.judge(id, { guesses: ['speed', 'abide'], playerId: MANU, name: 'Manu' });
    await service.judge(id, { guesses: ['abide'], playerId: MANU, name: 'Manu' });
    const { scoreboard } = await service.scoreboard(id);
    expect(scoreboard.map((result) => [result.name, result.won, result.guessCount])).toEqual([
      ['Manu', true, 2],
      ['Luis', false, 6],
    ]);
  });

  it('does not put the creator on their own scoreboard', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await service.judge(id, { guesses: ['abide'], playerId: ANA, name: 'Ana' });
    expect((await service.scoreboard(id)).scoreboard).toEqual([]);
  });

  it('passes word-list rejections through', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await expect(service.judge(id, { guesses: ['qxzvb'], playerId: MANU, name: '' })).rejects.toThrow(GuessRejectedError);
  });
});

describe('series', () => {
  it('starts on the first reply, crediting the reply’s earlier solve, and alternates rounds', async () => {
    const first = await create('abide', ANA, 'Ana');
    await service.judge(first.id, { guesses: ['speed', 'aided', 'abide'], playerId: MANU, name: 'Manu' });

    const second = await create('crane', MANU, 'Manu', { replyTo: first.id });
    const view = await service.describe(second.id);
    expect(view.series).toEqual({
      round: 2,
      players: [
        { playerId: ANA, name: 'Ana', points: 0 },
        { playerId: MANU, name: 'Manu', points: 4 },
      ],
    });

    const end = await service.judge(second.id, { guesses: ['slate', 'crane'], playerId: ANA, name: 'Ana' });
    expect(end.series?.players).toEqual([
      { playerId: ANA, name: 'Ana', points: 5 },
      { playerId: MANU, name: 'Manu', points: 4 },
    ]);

    const third = await create('light', ANA, 'Ana', { replyTo: second.id });
    expect((await service.describe(third.id)).series?.round).toBe(3);
  });

  it('awards points only once and never to outsiders playing a series link', async () => {
    const first = await create('abide', ANA, 'Ana');
    const second = await create('crane', MANU, 'Manu', { replyTo: first.id });
    await service.judge(second.id, { guesses: ['crane'], playerId: ANA, name: 'Ana' });
    await service.judge(second.id, { guesses: ['crane'], playerId: ANA, name: 'Ana' });
    const end = await service.judge(second.id, { guesses: ['crane'], playerId: LUIS, name: 'Luis' });
    expect(end.series?.players.map((player) => player.points)).toEqual([6, 0]);
    expect(end.scoreboard?.map((result) => result.name)).toEqual(['Ana', 'Luis']);
  });

  it('does not start a series when replying to your own challenge', async () => {
    const first = await create('abide', ANA, 'Ana');
    const second = await create('crane', ANA, 'Ana', { replyTo: first.id });
    expect((await service.describe(second.id)).series).toBeUndefined();
  });
});
