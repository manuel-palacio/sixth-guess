import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ChallengeError } from '../src/game/challenge.ts';
import { openChallenge, parseKey, sealChallenge } from './challengeCrypto.ts';

const key = randomBytes(32);
const challenge = { language: 'es', word: 'señor', clue: 'Lisboa, 2009 🍷', from: 'Ana' } as const;

describe('sealChallenge / openChallenge', () => {
  it('round-trips a challenge', () => {
    expect(openChallenge(sealChallenge(challenge, key), key)).toEqual(challenge);
  });

  it('produces URL-safe codes that reveal nothing, different every time', () => {
    const first = sealChallenge(challenge, key);
    const second = sealChallenge(challenge, key);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(first).not.toBe(second);
    expect(Buffer.from(first, 'base64url').toString('latin1')).not.toMatch(/se.or|Lisboa/);
  });

  it('rejects a code sealed with another key', () => {
    expect(() => openChallenge(sealChallenge(challenge, randomBytes(32)), key)).toThrow(ChallengeError);
  });

  it('rejects tampered and garbled codes', () => {
    const code = sealChallenge(challenge, key);
    const tampered = code.slice(0, -2) + (code.endsWith('A') ? 'BB' : 'AA');
    expect(() => openChallenge(tampered, key)).toThrow(ChallengeError);
    expect(() => openChallenge('garbage', key)).toThrow(ChallengeError);
    expect(() => openChallenge('', key)).toThrow(ChallengeError);
  });
});

describe('parseKey', () => {
  it('accepts a base64 32-byte key and rejects anything else', () => {
    expect(parseKey(key.toString('base64'))).toEqual(key);
    expect(() => parseKey('short')).toThrow();
  });
});
