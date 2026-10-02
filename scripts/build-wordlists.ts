// Regenerates src/data/<lang>.json: answer list, valid-guess list and the best opening guess.
//
// English answers: SCOWL frequency tiers 10–35 via `wordlist-english` (most common words).
// English guesses: every SCOWL tier plus the CC0 Letterpress list (`an-array-of-english-words`).
// Spanish/French guesses: `an-array-of-spanish-words` / `an-array-of-french-words`.
// Spanish/French answers: most frequent dictionary words in hermitdave/FrequencyWords
// (OpenSubtitles 2018, CC BY-SA 4.0), downloaded at generation time.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { isPlayableWord, normalizeWord, type LanguageCode } from '../src/game/language.ts';
import { suggestGuess } from '../src/game/suggest.ts';

const require = createRequire(import.meta.url);
const OUT_DIR = new URL('../src/data/', import.meta.url);
const ANSWER_TARGET = 2000;
const FREQUENCY_URL = (code: string) =>
  `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${code}_50k.txt`;

// subió, llegó, comí: almost always a conjugated verb form.
const SPANISH_STRESSED_ENDING = /[áéíóú]$/;

const SCOWL_VARIANTS = ['english', 'american', 'british'];
const SCOWL_ANSWER_TIERS = [10, 20, 35];
const SCOWL_ALL_TIERS = [10, 20, 35, 40, 50, 55, 60, 70];

// Familiar but unwelcome as a daily answer; they stay valid guesses.
const ANSWER_BLOCKLIST: Record<LanguageCode, string[]> = {
  en: ['bitch', 'boobs', 'booby', 'dildo', 'fagot', 'feces', 'horny', 'kinky', 'negro', 'penis', 'porno',
    'pubic', 'pussy', 'queer', 'semen', 'slutty', 'sperm', 'titty', 'vulva', 'whore', 'nazis', 'crap', 'hussy',
    'aryan', 'lynch', 'enema', 'urine', 'vomit', 'pubes', 'nooky', 'wench', 'gypsy', 'rapist'],
  es: ['putas', 'putos', 'coger', 'verga', 'polla', 'joder', 'culos', 'mamon', 'cagar', 'pinga', 'perra',
    'zorra', 'nazis', 'pedos', 'tetas', 'chupa', 'henry', 'venus', 'sioux', 'drink', 'curry'],
  fr: ['merde', 'conne', 'putes', 'bites', 'chier', 'nazis', 'pedes', 'salop', 'nique', 'elise', 'drink',
    'cross', 'store', 'inter', 'major', 'medoc'],
};

interface WordData {
  answers: string[];
  guesses: string[];
  opener: string;
}

async function main(): Promise<void> {
  const builders: Record<LanguageCode, () => Promise<{ answers: string[]; guesses: string[] }>> = {
    en: async () => buildEnglish(),
    es: () => buildFromFrequency('es', 'an-array-of-spanish-words'),
    fr: () => buildFromFrequency('fr', 'an-array-of-french-words'),
  };
  for (const [code, build] of Object.entries(builders) as [LanguageCode, () => Promise<{ answers: string[]; guesses: string[] }>][]) {
    const { answers, guesses } = await build();
    const opener = suggestGuess(answers, guesses, []).word;
    const data: WordData = { answers, guesses, opener };
    writeFileSync(new URL(`${code}.json`, OUT_DIR), JSON.stringify(data) + '\n');
    console.log(`${code}: ${answers.length} answers, ${guesses.length} valid guesses, opener ${opener.toUpperCase()}`);
  }
}

function buildEnglish(): { answers: string[]; guesses: string[] } {
  const dictionary = new Set(SCOWL_ALL_TIERS.flatMap(loadScowlTier));
  const toPlayable = (words: Iterable<string>) => playableWords('en', words);
  const answers = [...toPlayable(SCOWL_ANSWER_TIERS.flatMap(loadScowlTier))]
    .filter((word) => !isEnglishInflection(word, dictionary) && !ANSWER_BLOCKLIST.en.includes(word))
    .sort();
  const letterpress = loadJsonPackage('an-array-of-english-words');
  const guesses = [...new Set([...answers, ...toPlayable(dictionary), ...toPlayable(letterpress)])].sort();
  return { answers, guesses };
}

async function buildFromFrequency(code: LanguageCode, dictionaryPackage: string): Promise<{ answers: string[]; guesses: string[] }> {
  const rawDictionary = loadJsonPackage(dictionaryPackage);
  const allForms = new Set(rawDictionary.map((word) => normalizeWord(code, word)));
  const dictionary = playableWords(code, rawDictionary);
  const ranked = await fetchFrequencyRanking(code);
  const answers = ranked
    .filter((word) => dictionary.has(word) && !isInflection(code, word, allForms) && !ANSWER_BLOCKLIST[code].includes(word))
    .slice(0, ANSWER_TARGET)
    .sort();
  const guesses = [...new Set([...answers, ...dictionary, ...ranked])].sort();
  return { answers, guesses };
}

async function fetchFrequencyRanking(code: LanguageCode): Promise<string[]> {
  const response = await fetch(FREQUENCY_URL(code));
  if (!response.ok) throw new Error(`Could not download ${code} frequencies: ${response.status}`);
  const ranked = (await response.text())
    .split('\n')
    .map((line) => line.split(' ')[0] ?? '')
    .filter((raw) => !(code === 'es' && SPANISH_STRESSED_ENDING.test(raw)))
    .map((raw) => normalizeWord(code, raw))
    .filter((word) => isPlayableWord(code, word));
  return [...new Set(ranked)];
}

function playableWords(code: LanguageCode, words: Iterable<string>): Set<string> {
  const playable = new Set<string>();
  for (const raw of words) {
    if (raw !== raw.toLowerCase()) continue; // proper nouns
    const word = normalizeWord(code, raw);
    if (isPlayableWord(code, word)) playable.add(word);
  }
  return playable;
}

function isInflection(code: LanguageCode, word: string, allForms: Set<string>): boolean {
  if (isPlural(word, allForms)) return true;
  if (code === 'fr') return /(ez|ons)$/.test(word);
  const stem = word.slice(0, -2);
  return (
    word.endsWith('mos') ||
    (word.endsWith('n') && allForms.has(word.slice(0, -1))) ||
    (word.endsWith('ia') && (allForms.has(stem + 'er') || allForms.has(stem + 'ir')))
  );
}

function isPlural(word: string, allForms: Set<string>): boolean {
  if (!word.endsWith('s') || /(ss|us|is)$/.test(word)) return false;
  return allForms.has(word.slice(0, -1)) || (word.endsWith('es') && allForms.has(word.slice(0, -2)));
}

function isEnglishInflection(word: string, dictionary: Set<string>): boolean {
  const has = (stem: string) => stem.length >= 2 && dictionary.has(stem);
  if (word.endsWith('s') && !/(ss|us|is)$/.test(word)) {
    if (has(word.slice(0, -1)) || (word.endsWith('es') && has(word.slice(0, -2)))) return true;
    if (word.endsWith('ies') && has(word.slice(0, -3) + 'y')) return true;
  }
  if (word.endsWith('ed') && (has(word.slice(0, -2)) || has(word.slice(0, -1)))) return true;
  if (word.endsWith('ied') && has(word.slice(0, -3) + 'y')) return true;
  if (word.endsWith('est') && (has(word.slice(0, -3)) || has(word.slice(0, -2)))) return true;
  return word.endsWith('ier') && has(word.slice(0, -3) + 'y');
}

function loadScowlTier(tier: number): string[] {
  const sourceDir = dirname(require.resolve('wordlist-english/package.json'));
  return SCOWL_VARIANTS.flatMap((variant) =>
    JSON.parse(readFileSync(join(sourceDir, `${variant}-words-${tier}.json`), 'utf8')) as string[],
  );
}

function loadJsonPackage(name: string): string[] {
  return JSON.parse(readFileSync(require.resolve(`${name}/index.json`), 'utf8')) as string[];
}

await main();
