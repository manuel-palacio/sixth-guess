import type { LanguageCode } from '../game/language.ts';
import { loadJson, saveJson } from './storage.ts';

const SENT_KEY = 'sixth-guess:sent-challenges';
const KEEP = 10;

/** A challenge this browser created, so its results can be followed. The word is the sender's own. */
export interface SentChallenge {
  id: string;
  word: string;
  language: LanguageCode;
  createdAt: number;
  /** How many results the sender has already seen. */
  seen: number;
}

export function listSentChallenges(): SentChallenge[] {
  return loadJson<SentChallenge[]>(SENT_KEY, []);
}

export function rememberSentChallenge(challenge: Omit<SentChallenge, 'seen'>): void {
  saveJson(SENT_KEY, [{ ...challenge, seen: 0 }, ...listSentChallenges()].slice(0, KEEP));
}

export function markResultsSeen(id: string, seen: number): void {
  saveJson(SENT_KEY, listSentChallenges().map((sent) => (sent.id === id ? { ...sent, seen } : sent)));
}
