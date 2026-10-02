import type { LanguageCode } from '../game/language.ts';
import { loadJson, saveJson } from './storage.ts';

export type Mode = 'daily' | 'practice';
export type ThemeChoice = 'system' | 'light' | 'dark';

export interface Settings {
  language: LanguageCode;
  mode: Mode;
  theme: ThemeChoice;
  highContrast: boolean;
  hardMode: boolean;
  showScratchpad: boolean;
}

const SETTINGS_KEY = 'sixth-guess:settings';

const DEFAULTS: Settings = {
  language: 'en',
  mode: 'daily',
  theme: 'system',
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
