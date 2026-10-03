import type { LanguageCode } from '../game/language.ts';
import { loadJson, saveJson } from './storage.ts';

export type Mode = 'daily' | 'practice';
/** Challenges come from a link and are never saved as the preferred mode. */
export type PlayMode = Mode | 'challenge';
export type ThemeChoice = 'system' | 'light' | 'dark';
export type Palette = 'notebook' | 'sage' | 'lavender';

export interface Settings {
  language: LanguageCode;
  mode: Mode;
  theme: ThemeChoice;
  palette: Palette;
  highContrast: boolean;
  hardMode: boolean;
  showScratchpad: boolean;
}

const SETTINGS_KEY = 'sixth-guess:settings';

const DEFAULTS: Settings = {
  language: 'en',
  mode: 'daily',
  theme: 'system',
  palette: 'notebook',
  highContrast: false,
  hardMode: false,
  showScratchpad: true,
};

export function loadSettings(): Settings {
  return { ...DEFAULTS, ...loadJson<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings): void {
  saveJson(SETTINGS_KEY, settings);
}
