import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createChallengeApi } from './challengeApi.ts';
import { ChallengeService } from './challengeService.ts';
import { MemoryStore } from './memoryStore.ts';
import { loadWordBanks } from './wordSets.ts';

const PLAYER = 'player-test-0001';
let server: Server;
let base: string;

beforeAll(async () => {
  const api = createChallengeApi(new ChallengeService(new MemoryStore(), loadWordBanks(), randomBytes(32)));
  server = createServer(async (request, response) => {
    if (!(await api(request, response))) response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function createId(word: string, extra: Record<string, string> = {}) {
  const response = await post('/api/challenges', { language: 'en', word, playerId: 'player-maker-01', ...extra });
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

describe('challenge API', () => {
  it('creates a short id and describes the challenge without the word', async () => {
    const id = await createId('Zorbo', { clue: 'our old dog', from: 'Ana' });
    expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    const body = await (await fetch(`${base}/api/challenges/${id}`)).json();
    expect(body).toEqual({ language: 'en', clue: 'our old dog', from: 'Ana', anyLetters: true });
  });

  it('scores guesses, then reveals the answer, story and scoreboard', async () => {
    const id = await createId('abide', { story: 'first flat' });
    const midGame = await (await post(`/api/challenges/${id}/guesses`, { guesses: ['speed'], playerId: PLAYER, name: 'Manu' })).json();
    expect(midGame).toEqual({ results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    const end = await (await post(`/api/challenges/${id}/guesses`, { guesses: ['speed', 'abide'], playerId: PLAYER, name: 'Manu' })).json();
    expect((await post(`/api/challenges/${id}/guesses`, { guesses: ['crane'], playerId: PLAYER })).status).toBe(409);
    expect(end).toMatchObject({ status: 'won', answer: 'abide', story: 'first flat', scoreboard: [{ name: 'Manu', guessCount: 2 }] });
    const board = await (await fetch(`${base}/api/challenges/${id}/results`)).json();
    expect(board.scoreboard).toHaveLength(1);
  });

  it('returns the asking player’s progress', async () => {
    const id = await createId('abide');
    await post(`/api/challenges/${id}/guesses`, { guesses: ['speed'], playerId: PLAYER });
    const body = await (await fetch(`${base}/api/challenges/${id}?player=${PLAYER}`)).json();
    expect(body.progress).toMatchObject({ guesses: ['speed'], status: 'playing' });
  });

  it('maps errors to status codes', async () => {
    const id = await createId('abide');
    expect((await post(`/api/challenges/${id}/guesses`, { guesses: ['qxzvb'], playerId: PLAYER })).status).toBe(422);
    expect((await post(`/api/challenges/${id}/guesses`, { guesses: ['speed'] })).status).toBe(400);
    expect((await fetch(`${base}/api/challenges/garbage`)).status).toBe(404);
    expect((await post('/api/challenges', { language: 'en', word: 'dog', playerId: PLAYER })).status).toBe(422);
    expect((await post('/api/challenges', { language: 'xx', word: 'crane', playerId: PLAYER })).status).toBe(400);
    expect((await post('/api/challenges', { language: 'en', word: 'crane' })).status).toBe(400);
  });

  it('leaves other paths alone', async () => {
    expect((await fetch(`${base}/index.html`)).status).toBe(404);
  });
});
