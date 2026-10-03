import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChallengeError } from '../src/game/challenge.ts';
import { GuessRejectedError } from '../src/game/game.ts';
import { LANGUAGE_CODES, type LanguageCode } from '../src/game/language.ts';
import { BadRequestError, ConflictError, TooManyAttemptsError, type ChallengeService } from './challengeService.ts';
import { originFromForwardedFor } from './origin.ts';

const MAX_BODY_BYTES = 4096;
const ROUTE = /^\/api\/challenges(?:\/([A-Za-z0-9_-]+)(?:\/(guesses|results))?)?$/;

class HttpError extends Error {
  readonly status: number;
  readonly body: object;

  constructor(status: number, body: object) {
    super(String(status));
    this.status = status;
    this.body = body;
  }
}

/** Maps /api/challenges requests onto the service; resolves false for other paths so the caller can serve files. */
export function createChallengeApi(service: ChallengeService) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<boolean> => {
    const match = ROUTE.exec(new URL(request.url ?? '/', 'http://localhost').pathname);
    if (!match) return false;
    const [, id, action] = match;
    try {
      const body = await route(request.method ?? 'GET', id, action, request);
      sendJson(response, !id && request.method === 'POST' ? 201 : 200, body);
    } catch (error) {
      const { status, body } = toHttpError(error);
      sendJson(response, status, body);
    }
    return true;
  };

  async function route(method: string, id: string | undefined, action: string | undefined, request: IncomingMessage): Promise<object> {
    if (!id && method === 'POST') return create(await readJson(request));
    if (id && !action && method === 'GET') return service.describe(id, playerIdHeader(request));
    if (id && action === 'guesses' && method === 'POST') return judge(id, await readJson(request), originOf(request));
    if (id && action === 'results' && method === 'GET') return service.scoreboard(id);
    throw new HttpError(405, { error: 'methodNotAllowed' });
  }

  function create(body: Record<string, unknown>): Promise<object> {
    const { language, word, clue, from, story, playerId, replyTo } = body;
    if (!LANGUAGE_CODES.includes(language as LanguageCode) || typeof word !== 'string') throw new HttpError(400, { error: 'badRequest' });
    return service.create({
      draft: { language: language as LanguageCode, word, clue: text(clue), from: text(from) },
      story: text(story),
      playerId: text(playerId),
      replyTo: typeof replyTo === 'string' && replyTo ? replyTo : undefined,
    });
  }

  function judge(id: string, body: Record<string, unknown>, origin: string): Promise<object> {
    const { guesses, playerId, name } = body;
    if (!Array.isArray(guesses) || guesses.length === 0 || !guesses.every((guess) => typeof guess === 'string')) {
      throw new HttpError(400, { error: 'badRequest' });
    }
    return service.judge(id, { guesses, playerId: text(playerId), name: text(name), origin });
  }
}

function toHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof BadRequestError) return new HttpError(400, { error: 'badRequest' });
  if (error instanceof ConflictError) return new HttpError(409, { error: 'conflict' });
  if (error instanceof TooManyAttemptsError) return new HttpError(429, { error: 'tooManyAttempts' });
  if (error instanceof GuessRejectedError) return new HttpError(422, { error: 'rejected', reason: error.reason });
  if (error instanceof ChallengeError) return new HttpError(error.reason === 'badWord' ? 422 : 404, { error: error.reason });
  throw error;
}

/** Sent as a header rather than in the URL, which access logs record. */
function playerIdHeader(request: IncomingMessage): string | undefined {
  const value = request.headers['x-player-id'];
  return Array.isArray(value) ? value[0] : value;
}

function originOf(request: IncomingMessage): string {
  const forwarded = request.headers['x-forwarded-for'];
  return originFromForwardedFor(Array.isArray(forwarded) ? forwarded.join(',') : forwarded, request.socket.remoteAddress ?? 'unknown');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
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
