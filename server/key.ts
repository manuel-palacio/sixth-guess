import { randomBytes } from 'node:crypto';
import { parseKey } from './challengeCrypto.ts';

/**
 * CHALLENGE_KEY is required in production, or links would stop working on every restart.
 * Development gets a throwaway key per process.
 */
export function challengeKeyFromEnvironment(): Buffer {
  const configured = process.env.CHALLENGE_KEY;
  if (configured) return parseKey(configured);
  if (process.env.NODE_ENV === 'production') throw new Error('CHALLENGE_KEY is not set');
  return randomBytes(32);
}

/** For the local dev and preview servers: CHALLENGE_KEY if given, otherwise a throwaway key. */
export function localChallengeKey(): Buffer {
  return process.env.CHALLENGE_KEY ? parseKey(process.env.CHALLENGE_KEY) : randomBytes(32);
}
