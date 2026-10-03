import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { ChallengeError, createChallenge, type Challenge } from '../src/game/challenge.ts';
import { LANGUAGE_CODES, type LanguageCode } from '../src/game/language.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** Encrypts and authenticates a challenge so the link reveals nothing and cannot be forged. */
export function sealChallenge({ language, word, clue, from }: Challenge, key: Buffer): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const sealed = Buffer.concat([cipher.update(JSON.stringify([language, word, clue, from]), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64url');
}

export function openChallenge(code: string, key: Buffer): Challenge {
  const bytes = Buffer.from(code, 'base64url');
  if (bytes.length <= IV_BYTES + TAG_BYTES) throw new ChallengeError('This challenge link is broken');
  let fields: unknown;
  try {
    const decipher = createDecipheriv(ALGORITHM, key, bytes.subarray(0, IV_BYTES));
    decipher.setAuthTag(bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const plain = Buffer.concat([decipher.update(bytes.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]);
    fields = JSON.parse(plain.toString('utf8'));
  } catch {
    throw new ChallengeError('This challenge link is broken');
  }
  return toChallenge(fields);
}

export function parseKey(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== KEY_BYTES) throw new Error(`CHALLENGE_KEY must be ${KEY_BYTES} bytes, base64-encoded`);
  return key;
}

function toChallenge(fields: unknown): Challenge {
  if (!Array.isArray(fields)) throw new ChallengeError('This challenge link is broken');
  const [language, word, clue, from] = fields as unknown[];
  const known = LANGUAGE_CODES.includes(language as LanguageCode);
  if (!known || typeof word !== 'string' || typeof clue !== 'string' || typeof from !== 'string') {
    throw new ChallengeError('This challenge link is broken');
  }
  return createChallenge({ language: language as LanguageCode, word, clue, from });
}
