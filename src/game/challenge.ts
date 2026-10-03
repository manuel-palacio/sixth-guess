import type { TileState } from './feedback.ts';
import type { GameStatus } from './game.ts';
import type { PlayerResult, SeriesScore } from './series.ts';
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

/**
 * What the server returns for a friend's challenge. The word, story, scoreboard and series score
 * only arrive once the game has ended.
 */
export interface Verdict {
  results: TileState[][];
  status: GameStatus;
  answer?: string;
  story?: string;
  scoreboard?: PlayerResult[];
  series?: SeriesScore;
}

export type ChallengeFailure = 'badWord' | 'broken';

export class ChallengeError extends Error {
  readonly reason: ChallengeFailure;

  constructor(reason: ChallengeFailure) {
    super(reason === 'badWord' ? 'The word must be exactly five letters' : 'This challenge link is broken');
    this.reason = reason;
  }
}

const MAX_CLUE_LENGTH = 80;
const MAX_NAME_LENGTH = 30;

/** Any five letters of the language's alphabet; the word need not be in a dictionary. */
export function createChallenge({ language, word: rawWord, clue = '', from = '' }: ChallengeDraft): Challenge {
  const word = normalizeWord(language, rawWord.trim());
  if (!isPlayableWord(language, word)) throw new ChallengeError('badWord');
  return { language, word, clue: trimTo(clue, MAX_CLUE_LENGTH), from: trimTo(from, MAX_NAME_LENGTH) };
}

function trimTo(text: string, maxLength: number): string {
  return [...text.trim()].slice(0, maxLength).join('');
}
