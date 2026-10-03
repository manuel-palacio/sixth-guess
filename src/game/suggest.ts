import type { GuessRecord } from './clues.ts';
import { patternCode, WINNING_PATTERN } from './feedback.ts';

/** Why a word was suggested; the UI turns this into a sentence in the player's language. */
export type SuggestionBasis =
  | { kind: 'only' }
  | { kind: 'pair'; words: string[] }
  | { kind: 'split'; freshLetters: string[]; candidateCount: number; isCandidate: boolean };

export interface Suggestion {
  word: string;
  groupCount: number;
  largestGroup: number;
  basis: SuggestionBasis;
}

interface Split {
  groupCount: number;
  largestGroup: number;
}

const groupSizes = new Uint16Array(WINNING_PATTERN + 1);
/** Above this many candidates the search ranks guesses on an even sample; the winner is then measured exactly. */
export const SEARCH_SAMPLE_SIZE = 300;

/**
 * The guess that splits the candidates into the most distinct feedback patterns.
 * Ties prefer a word that could itself be the answer, then the smallest worst-case group.
 */
export function suggestGuess(candidates: readonly string[], guessPool: readonly string[], history: GuessRecord[]): Suggestion {
  if (candidates.length === 0) throw new Error('No candidates fit the clues');
  if (candidates.length <= 2) return suggestCandidate(candidates);
  const candidateSet = new Set(candidates);
  const sample = evenSample(candidates, SEARCH_SAMPLE_SIZE);
  let best = { word: candidates[0], ...measureSplit(candidates[0], sample) };
  for (const word of guessPool) {
    const split = measureSplit(word, sample);
    if (isBetterSplit(split, candidateSet.has(word), best, candidateSet.has(best.word))) best = { word, ...split };
  }
  if (sample !== candidates) best = { word: best.word, ...measureSplit(best.word, candidates) };
  const basis: SuggestionBasis = {
    kind: 'split',
    freshLetters: untestedLetters(best.word, history),
    candidateCount: candidates.length,
    isCandidate: candidateSet.has(best.word),
  };
  return { ...best, basis };
}

export function measureSplit(guess: string, candidates: readonly string[]): Split {
  groupSizes.fill(0);
  let groupCount = 0;
  let largestGroup = 0;
  for (const answer of candidates) {
    const code = patternCode(guess, answer);
    if (groupSizes[code]++ === 0) groupCount++;
    if (groupSizes[code] > largestGroup) largestGroup = groupSizes[code];
  }
  return { groupCount, largestGroup };
}

/** Deterministic, so the browser and the server reach the same suggestion. */
function evenSample(words: readonly string[], size: number): readonly string[] {
  if (words.length <= size) return words;
  const step = words.length / size;
  return Array.from({ length: size }, (_, index) => words[Math.floor(index * step)]);
}

function isBetterSplit(split: Split, isCandidate: boolean, best: Split, bestIsCandidate: boolean): boolean {
  if (split.groupCount !== best.groupCount) return split.groupCount > best.groupCount;
  if (isCandidate !== bestIsCandidate) return isCandidate;
  return split.largestGroup < best.largestGroup;
}

function suggestCandidate(candidates: readonly string[]): Suggestion {
  const basis: SuggestionBasis = candidates.length === 1 ? { kind: 'only' } : { kind: 'pair', words: [...candidates] };
  return { word: candidates[0], groupCount: candidates.length, largestGroup: 1, basis };
}

function untestedLetters(word: string, history: GuessRecord[]): string[] {
  const tried = new Set(history.flatMap(({ word: guessed }) => [...guessed]));
  return [...new Set(word)].filter((letter) => !tried.has(letter));
}
