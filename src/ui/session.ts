import { dailyAnswer, dayNumber } from '../game/daily.ts';
import { newGame, type GameState } from '../game/game.ts';
import type { LanguageCode } from '../game/language.ts';
import { pickPracticeWord } from '../game/practice.ts';
import { emptyStats, recordResult, recordStrategyScore, type Stats } from '../game/stats.ts';
import type { Mode, PlayMode } from './settings.ts';
import { loadJson, saveJson } from './storage.ts';
import type { WordBank } from './wordBank.ts';

export interface SavedGame extends GameState {
  /** Daily mode: which day this game belongs to. */
  day?: number;
  /** Challenge mode: the link's code and the friend's clue. The answer stays empty until the server reveals it. */
  challengeCode?: string;
  clue?: string;
  statsRecorded: boolean;
  strategyRecorded?: boolean;
}

const gameKey = (language: LanguageCode, mode: PlayMode) => `sixth-guess:game:${language}:${mode}`;
const statsKey = (language: LanguageCode, mode: Mode) => `sixth-guess:stats:${language}:${mode}`;
const practiceUsedKey = (language: LanguageCode) => `sixth-guess:practice-used:${language}`;

export function openGame(language: LanguageCode, mode: Mode, bank: WordBank, hardMode: boolean, now: Date): SavedGame {
  const saved = loadJson<SavedGame | null>(gameKey(language, mode), null);
  if (mode === 'daily') return resumeDaily(saved, bank, hardMode, dayNumber(now));
  if (saved && bank.answers.includes(saved.answer)) return saved;
  return startPracticeGame(language, bank, hardMode);
}

export function startPracticeGame(language: LanguageCode, bank: WordBank, hardMode: boolean): SavedGame {
  const pick = pickPracticeWord(bank.answers, loadJson<string[]>(practiceUsedKey(language), []));
  saveJson(practiceUsedKey(language), pick.used);
  const game: SavedGame = { ...newGame(pick.word, hardMode), statsRecorded: false };
  saveGame(language, 'practice', game);
  return game;
}

export interface ChallengeTicket {
  code: string;
  language: LanguageCode;
  clue: string;
}

/** Resumes the same challenge after a reload; a different link starts fresh. */
export function openChallengeGame({ code, language, clue }: ChallengeTicket, hardMode: boolean): SavedGame {
  const saved = loadJson<SavedGame | null>(gameKey(language, 'challenge'), null);
  if (saved && saved.challengeCode === code) return saved;
  const game: SavedGame = { ...newGame('', hardMode), challengeCode: code, clue, statsRecorded: false };
  saveGame(language, 'challenge', game);
  return game;
}

export function saveGame(language: LanguageCode, mode: PlayMode, game: SavedGame): void {
  saveJson(gameKey(language, mode), game);
}

export function loadStats(language: LanguageCode, mode: Mode): Stats {
  return { ...emptyStats(), ...loadJson<Partial<Stats>>(statsKey(language, mode), {}) };
}

/** Records a finished game once, however many times the page is reloaded afterwards. Challenges are not counted. */
export function recordFinishedGame(language: LanguageCode, mode: PlayMode, game: SavedGame): SavedGame {
  if (game.status === 'playing' || game.statsRecorded) return game;
  if (mode === 'challenge') return markRecorded(language, mode, { ...game, statsRecorded: true });
  const result = { won: game.status === 'won', guessCount: game.guesses.length, day: game.day };
  saveJson(statsKey(language, mode), recordResult(loadStats(language, mode), result));
  return markRecorded(language, mode, { ...game, statsRecorded: true });
}

export function recordGameStrategy(language: LanguageCode, mode: PlayMode, game: SavedGame, score: number): SavedGame {
  if (game.strategyRecorded || game.status === 'playing') return game;
  if (mode !== 'challenge') saveJson(statsKey(language, mode), recordStrategyScore(loadStats(language, mode), score));
  return markRecorded(language, mode, { ...game, strategyRecorded: true });
}

function markRecorded(language: LanguageCode, mode: PlayMode, game: SavedGame): SavedGame {
  saveGame(language, mode, game);
  return game;
}

function resumeDaily(saved: SavedGame | null, bank: WordBank, hardMode: boolean, today: number): SavedGame {
  const answer = dailyAnswer(bank.answers, today);
  if (saved && saved.day === today && saved.answer === answer) return saved;
  return { ...newGame(answer, hardMode), day: today, statsRecorded: false };
}
