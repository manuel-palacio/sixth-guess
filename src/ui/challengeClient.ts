import { ChallengeError, type Challenge, type Verdict } from '../game/challenge.ts';
import { GuessRejectedError, type RejectionReason } from '../game/game.ts';
import type { LanguageCode } from '../game/language.ts';
import type { PlayerResult, SeriesScore } from '../game/series.ts';

const PARAM = 'c';

export interface RemoteChallenge {
  code: string;
  language: LanguageCode;
  clue: string;
  from: string;
  /** The word is outside the dictionary, so any five letters are accepted. */
  anyLetters: boolean;
  series?: SeriesScore;
}

export interface NewChallenge {
  challenge: Challenge;
  story: string;
  playerId: string;
  /** Answering a friend's challenge starts or continues a series with them. */
  replyTo?: string;
}

/** The server could not be reached or failed; distinct from a broken link. */
export class ChallengeUnavailableError extends Error {}

export function challengeCodeFromUrl(): string | undefined {
  return new URLSearchParams(location.search).get(PARAM) ?? undefined;
}

export function challengeUrl(code: string): string {
  return `${location.origin}${location.pathname}?${PARAM}=${code}`;
}

export function clearChallengeFromUrl(): void {
  history.replaceState(null, '', location.pathname);
}

export async function createChallengeCode({ challenge, story, playerId, replyTo }: NewChallenge): Promise<string> {
  const response = await request('/api/challenges', { method: 'POST', body: JSON.stringify({ ...challenge, story, playerId, replyTo }) });
  if (response.status === 422) throw new ChallengeError('badWord');
  return ((await readOk(response)) as { id: string }).id;
}

export async function fetchChallenge(code: string): Promise<RemoteChallenge> {
  const response = await request(`/api/challenges/${encodeURIComponent(code)}`);
  if (response.status === 404) throw new ChallengeError('broken');
  return { code, ...((await readOk(response)) as Omit<RemoteChallenge, 'code'>) };
}

/** Sends the whole guess history; the server scores it against the hidden word. */
export async function judgeRemotely(code: string, guesses: string[], player: { playerId: string; name: string }): Promise<Verdict> {
  const body = JSON.stringify({ guesses, ...player });
  const response = await request(`/api/challenges/${encodeURIComponent(code)}/guesses`, { method: 'POST', body });
  if (response.status === 422) throw new GuessRejectedError(((await response.json()) as { reason: RejectionReason }).reason);
  if (response.status === 404) throw new ChallengeError('broken');
  return (await readOk(response)) as Verdict;
}

export async function fetchScoreboard(code: string): Promise<PlayerResult[]> {
  const response = await request(`/api/challenges/${encodeURIComponent(code)}/results`);
  if (response.status === 404) throw new ChallengeError('broken');
  return ((await readOk(response)) as { scoreboard: PlayerResult[] }).scoreboard;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(new URL(`.${path}`, location.href.replace(/[?#].*$/, '')), { ...init, headers: { 'Content-Type': 'application/json' } });
  } catch {
    throw new ChallengeUnavailableError('Network error');
  }
}

async function readOk(response: Response): Promise<unknown> {
  if (!response.ok) throw new ChallengeUnavailableError(`Server answered ${response.status}`);
  return response.json();
}
