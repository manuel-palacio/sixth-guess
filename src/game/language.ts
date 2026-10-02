export type LanguageCode = 'en' | 'es' | 'fr';

export interface Language {
  code: LanguageCode;
  name: string;
  alphabet: string[];
  keyboardRows: string[][];
}

const LATIN = [...'abcdefghijklmnopqrstuvwxyz'];

export const LANGUAGES: Record<LanguageCode, Language> = {
  en: {
    code: 'en',
    name: 'English',
    alphabet: LATIN,
    keyboardRows: [[...'qwertyuiop'], [...'asdfghjkl'], [...'zxcvbnm']],
  },
  es: {
    code: 'es',
    name: 'Español',
    alphabet: [...LATIN.slice(0, 14), 'ñ', ...LATIN.slice(14)],
    keyboardRows: [[...'qwertyuiop'], [...'asdfghjklñ'], [...'zxcvbnm']],
  },
  fr: {
    code: 'fr',
    name: 'Français',
    alphabet: LATIN,
    keyboardRows: [[...'azertyuiop'], [...'qsdfghjklm'], [...'wxcvbn']],
  },
};

export const LANGUAGE_CODES = Object.keys(LANGUAGES) as LanguageCode[];

const TILDE_N = /ñ/g;
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Folds accents away (é → e, ç → c); Spanish keeps ñ as its own letter. */
export function normalizeWord(code: LanguageCode, raw: string): string {
  let decomposed = raw.toLowerCase().normalize('NFD');
  if (code === 'es') decomposed = decomposed.replace(TILDE_N, 'ñ');
  return decomposed.replace(COMBINING_MARKS, '');
}

export function isPlayableWord(code: LanguageCode, word: string): boolean {
  const alphabet = LANGUAGES[code].alphabet;
  return [...word].length === 5 && [...word].every((letter) => alphabet.includes(letter));
}
