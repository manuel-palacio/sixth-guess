import { readFileSync } from 'node:fs';
import type { LanguageCode } from '../src/game/language.ts';

export interface ServerWordBank {
  guesses: string[];
  validGuesses: ReadonlySet<string>;
  opener: string;
}

export type WordBanks = Record<LanguageCode, ServerWordBank>;

/** The generated lists the client also uses, read once at startup. */
export function loadWordBanks(dataDir: URL = new URL('../src/data/', import.meta.url)): WordBanks {
  const read = (code: LanguageCode): ServerWordBank => {
    const { guesses, opener } = JSON.parse(readFileSync(new URL(`${code}.json`, dataDir), 'utf8')) as { guesses: string[]; opener: string };
    return { guesses, validGuesses: new Set(guesses), opener };
  };
  return { en: read('en'), es: read('es'), fr: read('fr') };
}
