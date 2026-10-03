import { readFileSync } from 'node:fs';
import type { LanguageCode } from '../src/game/language.ts';

export type WordSets = Record<LanguageCode, ReadonlySet<string>>;

/** Valid guesses per language, read once from the generated lists the client also uses. */
export function loadValidGuesses(dataDir: URL = new URL('../src/data/', import.meta.url)): WordSets {
  const read = (code: LanguageCode): ReadonlySet<string> =>
    new Set((JSON.parse(readFileSync(new URL(`${code}.json`, dataDir), 'utf8')) as { guesses: string[] }).guesses);
  return { en: read('en'), es: read('es'), fr: read('fr') };
}
