import { dailyAnswer, dayNumber } from '../game/daily.ts';
import { newGame, type GameState } from '../game/game.ts';
import type { LanguageCode } from '../game/language.ts';
import { pickPracticeWord } from '../game/practice.ts';
import { emptyStats, recordResult, type Stats } from '../game/stats.ts';
import type { Mode } from './settings.ts';
import { loadJson, saveJson } from './storage.ts';
import type { WordBank } from './wordBank.ts';

export interface SavedGame extends GameState {
  /** Daily mode: which day this game belongs to. */
  day?: number;
  statsRecorded: boolean;
}

const gameKey = (language: LanguageCode, mode: Mode) => `sixth-guess:game:${language}:${mode}`;
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

export function saveGame(language: LanguageCode, mode: Mode, game: SavedGame): void {
  saveJson(gameKey(language, mode), game);
}

export function loadStats(language: LanguageCode, mode: Mode): Stats {
  return { ...emptyStats(), ...loadJson<Partial<Stats>>(statsKey(language, mode), {}) };
}

/** Records a finished game once, however many times the page is reloaded afterwards. */
export function recordFinishedGame(language: LanguageCode, mode: Mode, game: SavedGame): SavedGame {
  if (game.status === 'playing' || game.statsRecorded) return game;
  const result = { won: game.status === 'won', guessCount: game.guesses.length, day: game.day };
  saveJson(statsKey(language, mode), recordResult(loadStats(language, mode), result));
  const recorded = { ...game, statsRecorded: true };
  saveGame(language, mode, recorded);
  return recorded;
}

function resumeDaily(saved: SavedGame | null, bank: WordBank, hardMode: boolean, today: number): SavedGame {
  const answer = dailyAnswer(bank.answers, today);
  if (saved && saved.day === today && saved.answer === answer) return saved;
  return { ...newGame(answer, hardMode), day: today, statsRecorded: false };
}
