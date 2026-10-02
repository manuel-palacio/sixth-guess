import type { GuessRecord } from './clues.ts';
import type { TileState } from './feedback.ts';
import { MAX_GUESSES } from './game.ts';

export interface ShareDetails {
  gameName: string;
  modeLabel: string;
  languageCode: string;
  guesses: GuessRecord[];
  won: boolean;
  hardMode: boolean;
  highContrast: boolean;
}

const STANDARD_SQUARES: Record<TileState, string> = { correct: '🟩', present: '🟪', absent: '⬜' };
const HIGH_CONTRAST_SQUARES: Record<TileState, string> = { correct: '🟦', present: '🟧', absent: '⬜' };

/** Header plus an emoji grid; never includes letters, so it cannot spoil the answer. */
export function buildShareText(details: ShareDetails): string {
  const score = details.won ? `${details.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const header = [details.gameName, details.modeLabel, details.languageCode.toUpperCase(), score + (details.hardMode ? '*' : '')].join(' · ');
  const squares = details.highContrast ? HIGH_CONTRAST_SQUARES : STANDARD_SQUARES;
  const grid = details.guesses.map(({ states }) => states.map((state) => squares[state]).join(''));
  return [header, '', ...grid].join('\n');
}
