import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChallengeError, createChallenge } from '../src/game/challenge.ts';
import { GuessRejectedError } from '../src/game/game.ts';
import { LANGUAGE_CODES, type LanguageCode } from '../src/game/language.ts';
import { openChallenge, sealChallenge } from './challengeCrypto.ts';
import { acceptsAnyLetters, judgeGuesses } from './challengeRules.ts';
import type { WordSets } from './wordSets.ts';

const MAX_BODY_BYTES = 4096;
const ROUTE = /^\/api\/challenges(?:\/([A-Za-z0-9_-]+)(\/guesses)?)?$/;

class HttpError extends Error {
  readonly status: number;
  readonly body: object;

  constructor(status: number, body: object) {
    super(String(status));
    this.status = status;
    this.body = body;
  }
}

/** Handles /api/challenges requests; resolves false for any other path so the caller can serve files. */
export function createChallengeApi(key: Buffer, validGuesses: WordSets) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const match = ROUTE.exec(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!match) return false;
    const [, code, guessesSuffix] = match;
    try {
      const body = await route(request, code, Boolean(guessesSuffix));
      sendJson(response, request.method === 'POST' && !code ? 201 : 200, body);
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      sendJson(response, error.status, error.body);
    }
    return true;
  };

  async function route(request: IncomingMessage, code: string | undefined, isGuesses: boolean): Promise<object> {
    if (!code && request.method === 'POST') return createCode(await readJson(request));
    if (code && !isGuesses && request.method === 'GET') return describe(code);
    if (code && isGuesses && request.method === 'POST') return judge(code, await readJson(request));
    throw new HttpError(405, { error: 'methodNotAllowed' });
  }

  function createCode(body: Record<string, unknown>): object {
    const { language, word, clue, from } = body;
    if (!LANGUAGE_CODES.includes(language as LanguageCode) || typeof word !== 'string') throw new HttpError(400, { error: 'badRequest' });
    const text = (value: unknown) => (typeof value === 'string' ? value : '');
    try {
      return { code: sealChallenge(createChallenge({ language: language as LanguageCode, word, clue: text(clue), from: text(from) }), key) };
    } catch (error) {
      if (error instanceof ChallengeError) throw new HttpError(422, { error: 'badWord' });
      throw error;
    }
  }

  function describe(code: string): object {
    const challenge = open(code);
    const anyLetters = acceptsAnyLetters(challenge, validGuesses[challenge.language]);
    return { language: challenge.language, clue: challenge.clue, from: challenge.from, anyLetters };
  }

  function judge(code: string, body: Record<string, unknown>): object {
    const challenge = open(code);
    const { guesses } = body;
    if (!Array.isArray(guesses) || guesses.length === 0 || !guesses.every((guess) => typeof guess === 'string')) {
      throw new HttpError(400, { error: 'badRequest' });
    }
    try {
      return judgeGuesses(challenge, guesses, validGuesses[challenge.language]);
    } catch (error) {
      if (error instanceof GuessRejectedError) throw new HttpError(422, { error: 'rejected', reason: error.reason });
      throw error;
    }
  }

  function open(code: string) {
    try {
      return openChallenge(code, key);
    } catch (error) {
      if (error instanceof ChallengeError) throw new HttpError(404, { error: 'broken' });
      throw error;
    }
  }
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) throw new HttpError(413, { error: 'tooLarge' });
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
  } catch {
    // fall through to the 400 below
  }
  throw new HttpError(400, { error: 'badRequest' });
}

function sendJson(response: ServerResponse, status: number, body: object): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
}
