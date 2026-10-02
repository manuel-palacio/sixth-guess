import type { LanguageCode } from '../game/language.ts';

export interface WordBank {
  answers: string[];
  guesses: string[];
  validGuesses: Set<string>;
  opener: string;
}

interface WordData {
  answers: string[];
  guesses: string[];
  opener: string;
}

const LOADERS: Record<LanguageCode, () => Promise<{ default: WordData }>> = {
  en: () => import('../data/en.json'),
  es: () => import('../data/es.json'),
  fr: () => import('../data/fr.json'),
};

const cache = new Map<LanguageCode, Promise<WordBank>>();

export function loadWordBank(code: LanguageCode): Promise<WordBank> {
  if (!cache.has(code)) cache.set(code, LOADERS[code]().then(({ default: data }) => toWordBank(data)));
  return cache.get(code)!;
}

function toWordBank(data: WordData): WordBank {
  return { ...data, validGuesses: new Set(data.guesses) };
}
