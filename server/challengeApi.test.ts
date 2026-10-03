import { randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createChallengeApi } from './challengeApi.ts';
import { loadValidGuesses } from './wordSets.ts';

let server: Server;
let base: string;

beforeAll(async () => {
  const api = createChallengeApi(randomBytes(32), loadValidGuesses());
  server = createServer(async (request, response) => {
    if (!(await api(request, response))) response.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

async function createCode(word: string, clue = '', from = '') {
  const response = await post('/api/challenges', { language: 'en', word, clue, from });
  expect(response.status).toBe(201);
  return ((await response.json()) as { code: string }).code;
}

describe('challenge API', () => {
  it('creates a code that hides the word and describes it without the answer', async () => {
    const code = await createCode('Zorbo', 'our old dog', 'Ana');
    expect(code.toLowerCase()).not.toContain('zorbo');
    const response = await fetch(`${base}/api/challenges/${code}`);
    const body = await response.json();
    expect(body).toEqual({ language: 'en', clue: 'our old dog', from: 'Ana', anyLetters: true });
    expect(JSON.stringify(body)).not.toContain('zorbo');
  });

  it('scores guesses and reveals the answer only at the end', async () => {
    const code = await createCode('abide');
    const midGame = await (await post(`/api/challenges/${code}/guesses`, { guesses: ['speed'] })).json();
    expect(midGame).toEqual({ results: [['absent', 'absent', 'present', 'absent', 'present']], status: 'playing' });
    const won = await (await post(`/api/challenges/${code}/guesses`, { guesses: ['speed', 'abide'] })).json();
    expect(won).toMatchObject({ status: 'won', answer: 'abide' });
  });

  it('rejects words outside the list with 422 and the reason', async () => {
    const code = await createCode('abide');
    const response = await post(`/api/challenges/${code}/guesses`, { guesses: ['qxzvb'] });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'rejected', reason: { kind: 'notInList' } });
  });

  it('answers 404 for broken codes, 422 for bad words and 400 for bad bodies', async () => {
    expect((await fetch(`${base}/api/challenges/garbage`)).status).toBe(404);
    expect((await post('/api/challenges', { language: 'en', word: 'dog' })).status).toBe(422);
    expect((await post('/api/challenges', { language: 'xx', word: 'crane' })).status).toBe(400);
    const code = await createCode('abide');
    expect((await post(`/api/challenges/${code}/guesses`, { guesses: 'speed' })).status).toBe(400);
  });

  it('leaves other paths alone', async () => {
    expect((await fetch(`${base}/index.html`)).status).toBe(404);
  });
});
