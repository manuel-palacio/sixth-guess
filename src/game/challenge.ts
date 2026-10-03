import type { TileState } from './feedback.ts';
import type { GameStatus } from './game.ts';
import { isPlayableWord, normalizeWord, type LanguageCode } from './language.ts';

export interface Challenge {
  language: LanguageCode;
  word: string;
  clue: string;
  /** The challenger's name, shown to the friend. */
  from: string;
}

export interface ChallengeDraft {
  language: LanguageCode;
  word: string;
  clue?: string;
  from?: string;
}

/** What the server returns for a friend's challenge: the word itself stays hidden until the game ends. */
export interface Verdict {
  results: TileState[][];
  status: GameStatus;
  answer?: string;
}

export class ChallengeError extends Error {}

const MAX_CLUE_LENGTH = 80;
const MAX_NAME_LENGTH = 30;

/** Any five letters of the language's alphabet; the word need not be in a dictionary. */
export function createChallenge({ language, word: rawWord, clue = '', from = '' }: ChallengeDraft): Challenge {
  const word = normalizeWord(language, rawWord.trim());
  if (!isPlayableWord(language, word)) throw new ChallengeError('The word must be exactly five letters');
  return { language, word, clue: trimTo(clue, MAX_CLUE_LENGTH), from: trimTo(from, MAX_NAME_LENGTH) };
}

function trimTo(text: string, maxLength: number): string {
  return [...text.trim()].slice(0, maxLength).join('');
}
