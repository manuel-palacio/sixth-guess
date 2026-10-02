import { filterCandidates } from './candidates.ts';
import type { GuessRecord } from './clues.ts';
import { hardModeLegality } from './hardMode.ts';
import { measureSplit, suggestGuess, type Suggestion } from './suggest.ts';

export interface ReviewEntry {
  guess: string;
  candidatesBefore: number;
  candidatesAfter: number;
  best: Suggestion;
  /** True when the guess split the candidates at least as well as the best guess. */
  matchedBest: boolean;
}

export interface ReviewInput {
  answers: readonly string[];
  guessPool: readonly string[];
  history: GuessRecord[];
  hardMode: boolean;
  /** Precomputed best first guess, so the review does not redo the most expensive search. */
  opener: string;
}

export function buildReview(input: ReviewInput): ReviewEntry[] {
  let candidates = [...input.answers];
  return input.history.map((record, turn) => {
    const earlier = input.history.slice(0, turn);
    const best = bestGuessFor(candidates, earlier, input);
    const remaining = filterCandidates(candidates, [record]);
    const entry: ReviewEntry = {
      guess: record.word,
      candidatesBefore: candidates.length,
      candidatesAfter: remaining.length,
      best,
      matchedBest: candidates.length <= 2 ? candidates.includes(record.word) : measureSplit(record.word, candidates).groupCount >= best.groupCount,
    };
    candidates = remaining;
    return entry;
  });
}

export function legalGuessPool(guessPool: readonly string[], history: GuessRecord[], hardMode: boolean): readonly string[] {
  return hardMode ? guessPool.filter(hardModeLegality(history)) : guessPool;
}

function bestGuessFor(candidates: string[], earlier: GuessRecord[], input: ReviewInput): Suggestion {
  const pool = earlier.length === 0 ? [input.opener] : legalGuessPool(input.guessPool, earlier, input.hardMode);
  return suggestGuess(candidates, pool, earlier);
}
