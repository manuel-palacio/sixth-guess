import { filterCandidates } from './candidates.ts';
import type { GuessRecord } from './clues.ts';
import { hardModeLegality } from './hardMode.ts';
import { measureSplit, suggestGuess, type Suggestion } from './suggest.ts';

export interface ReviewEntry {
  guess: string;
  candidatesBefore: number;
  candidatesAfter: number;
  best: Suggestion;
  /** 0–1: how well the guess split the candidates compared with the best available guess. */
  quality: number;
  /** True when the guess was as good as the best guess. */
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
    // Solving it is the best possible move, whatever the split would have been.
    const solved = record.states.every((state) => state === 'correct');
    const quality = solved ? 1 : rateGuess(record.word, candidates, best);
    const entry: ReviewEntry = {
      guess: record.word,
      candidatesBefore: candidates.length,
      candidatesAfter: remaining.length,
      best,
      quality,
      matchedBest: quality >= 1,
    };
    candidates = remaining;
    return entry;
  });
}

/** Average guess quality as a whole percentage: rewards reasoning rather than lucky guesses. */
export function strategyScore(entries: ReviewEntry[]): number {
  if (entries.length === 0) return 0;
  const total = entries.reduce((sum, entry) => sum + entry.quality, 0);
  return Math.round((total / entries.length) * 100);
}

export function legalGuessPool(guessPool: readonly string[], history: GuessRecord[], hardMode: boolean): readonly string[] {
  return hardMode ? guessPool.filter(hardModeLegality(history)) : guessPool;
}

/**
 * With one or two words left the best move is to guess one of them; anything else
 * earns credit only for the words it still tells apart.
 */
function rateGuess(guess: string, candidates: string[], best: Suggestion): number {
  const { groupCount } = measureSplit(guess, candidates);
  if (candidates.length <= 2) return candidates.includes(guess) ? 1 : (groupCount - 1) / candidates.length;
  return Math.min(1, groupCount / best.groupCount);
}

function bestGuessFor(candidates: string[], earlier: GuessRecord[], input: ReviewInput): Suggestion {
  const pool = earlier.length === 0 ? [input.opener] : legalGuessPool(input.guessPool, earlier, input.hardMode);
  return suggestGuess(candidates, pool, earlier);
}
