import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { ChallengeError } from '../src/game/challenge.ts';
import { GuessRejectedError } from '../src/game/game.ts';
import { sealChallenge } from './challengeCrypto.ts';
import { BadRequestError, ChallengeService, ConflictError, TooManyAttemptsError } from './challengeService.ts';
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

/** Plays guesses one request at a time, as the browser does; resolves with the last verdict. */
async function play(id: string, playerId: string, name: string, words: string[], origin = '203.0.113.1') {
  let verdict;
  for (let count = 1; count <= words.length; count++) {
    verdict = await service.judge(id, { guesses: words.slice(0, count), playerId, name, origin });
  }
  return verdict!;
}

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
    expect((await play(code, MANU, 'Manu', ['crane'])).status).toBe('won');
  });
});

describe('judging and results', () => {
  it('reveals nothing mid-game, then the word, story and scoreboard at the end', async () => {
    const { id } = await create('abide', ANA, 'Ana', { story: 'Our first flat' });
    const midGame = await play(id, MANU, 'Manu', ['speed']);
    expect(midGame).toEqual({ results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    const end = await service.judge(id, { guesses: ['speed', 'abide'], playerId: MANU, name: 'Manu', origin: 'x' });
    expect(end).toMatchObject({ status: 'won', answer: 'abide', story: 'Our first flat' });
    expect(end.scoreboard).toEqual([
      expect.objectContaining({ playerId: MANU, name: 'Manu', won: true, guessCount: 2, strategy: expect.any(Number) }),
    ]);
  });

  it('keeps each player’s first finished game and ranks everyone who played the link', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await play(id, LUIS, 'Luis', ['crane', 'slate', 'speed', 'fight', 'light', 'night']);
    await play(id, MANU, 'Manu', ['speed', 'abide']);
    const { scoreboard } = await service.scoreboard(id);
    expect(scoreboard.map((result) => [result.name, result.won, result.guessCount])).toEqual([
      ['Manu', true, 2],
      ['Luis', false, 6],
    ]);
  });

  it('does not put the creator on their own scoreboard', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await play(id, ANA, 'Ana', ['abide']);
    expect((await service.scoreboard(id)).scoreboard).toEqual([]);
  });

  it('passes word-list rejections through', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await expect(play(id, MANU, '', ['qxzvb'])).rejects.toThrow(GuessRejectedError);
  });
});

describe('series', () => {
  it('starts on the first reply, crediting the reply’s earlier solve, and alternates rounds', async () => {
    const first = await create('abide', ANA, 'Ana');
    await play(first.id, MANU, 'Manu', ['speed', 'aided', 'abide']);

    const second = await create('crane', MANU, 'Manu', { replyTo: first.id });
    const view = await service.describe(second.id);
    expect(view.series).toEqual({
      round: 2,
      players: [
        { playerId: ANA, name: 'Ana', points: 0 },
        { playerId: MANU, name: 'Manu', points: 4 },
      ],
    });

    const end = await play(second.id, ANA, 'Ana', ['slate', 'crane']);
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
    await play(second.id, ANA, 'Ana', ['crane']);
    await service.judge(second.id, { guesses: ['crane'], playerId: ANA, name: 'Ana', origin: 'x' });
    const end = await play(second.id, LUIS, 'Luis', ['crane']);
    expect(end.series?.players.map((player) => player.points)).toEqual([6, 0]);
    expect(end.scoreboard?.map((result) => result.name)).toEqual(['Ana', 'Luis']);
  });

  it('does not start a series when replying to your own challenge', async () => {
    const first = await create('abide', ANA, 'Ana');
    const second = await create('crane', ANA, 'Ana', { replyTo: first.id });
    expect((await service.describe(second.id)).series).toBeUndefined();
  });
});

describe('server-side guess tracking', () => {
  it('lets a request add only one guess to what the server already holds', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await expect(service.judge(id, { guesses: ['speed', 'abide'], playerId: MANU, name: '', origin: 'x' })).rejects.toThrow(ConflictError);
    await play(id, MANU, 'Manu', ['speed']);
    await expect(service.judge(id, { guesses: ['crane', 'abide'], playerId: MANU, name: '', origin: 'x' })).rejects.toThrow(ConflictError);
    await expect(service.judge(id, { guesses: ['abide'], playerId: MANU, name: '', origin: 'x' })).rejects.toThrow(ConflictError);
  });

  it('answers a resent history without counting it twice', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await play(id, MANU, 'Manu', ['speed']);
    const again = await service.judge(id, { guesses: ['speed'], playerId: MANU, name: '', origin: 'x' });
    expect(again.results).toHaveLength(1);
  });

  it('does not store a rejected word', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    await expect(play(id, MANU, 'Manu', ['qxzvb'])).rejects.toThrow(GuessRejectedError);
    expect((await play(id, MANU, 'Manu', ['speed'])).results).toHaveLength(1);
  });

  it('stops after six guesses, whatever the client claims', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    const misses = ['crane', 'slate', 'speed', 'fight', 'light', 'night'];
    expect((await play(id, MANU, 'Manu', misses)).status).toBe('lost');
    await expect(service.judge(id, { guesses: [...misses, 'abide'], playerId: MANU, name: '', origin: 'x' })).rejects.toThrow(GuessRejectedError);
  });

  it('returns the board as the server holds it, so a reload cannot reset it', async () => {
    const { id } = await create('abide', ANA, 'Ana', { story: 'flat' });
    await play(id, MANU, 'Manu', ['speed']);
    expect((await service.describe(id, MANU)).progress).toEqual({ guesses: ['speed'], results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    await play(id, MANU, 'Manu', ['speed', 'abide']);
    expect((await service.describe(id, MANU)).progress).toMatchObject({ status: 'won', answer: 'abide', story: 'flat' });
    expect((await service.describe(id, LUIS)).progress).toBeUndefined();
    expect((await service.describe(id)).progress).toBeUndefined();
  });

  it('caps how many players one connection can start on a challenge', async () => {
    const { id } = await create('abide', ANA, 'Ana');
    for (let n = 0; n < 4; n++) await play(id, `fresh-player-${n}000`, '', ['speed'], '198.51.100.7');
    await expect(play(id, 'fresh-player-9000', '', ['speed'], '198.51.100.7')).rejects.toThrow(TooManyAttemptsError);
    expect((await play(id, 'fresh-player-9000', '', ['speed'], '198.51.100.8')).status).toBe('playing');
    expect((await play(id, 'fresh-player-0000', '', ['speed', 'crane'], '198.51.100.7')).results).toHaveLength(2);
  });
});
