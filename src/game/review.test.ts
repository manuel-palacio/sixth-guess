import { describe, expect, it } from 'vitest';
import { buildReview, strategyScore, type ReviewEntry } from './review.ts';
import { scoreGuess } from './feedback.ts';

const ANSWERS = ['fight', 'light', 'might', 'night', 'sight', 'tight', 'crane', 'abide'];
const POOL = [...ANSWERS, 'flmns', 'bight'];
const play = (answer: string, ...words: string[]) => words.map((word) => ({ word, states: scoreGuess(word, answer) }));

describe('buildReview', () => {
  it('reports candidates before and after each guess', () => {
    const review = buildReview({ answers: ANSWERS, guessPool: POOL, history: play('night', 'bight', 'fight', 'night'), hardMode: false, opener: 'bight' });
    expect(review.map((entry) => [entry.candidatesBefore, entry.candidatesAfter])).toEqual([[8, 6], [6, 5], [5, 1]]);
  });

  it('names the best available guess and whether the player matched it', () => {
    const review = buildReview({ answers: ANSWERS, guessPool: POOL, history: play('night', 'bight', 'fight'), hardMode: false, opener: 'bight' });
    expect(review[1].best.word).toBe('flmns');
    expect(review[1].matchedBest).toBe(false);
  });

  it('only considers hard-mode legal guesses in hard mode', () => {
    const review = buildReview({ answers: ANSWERS, guessPool: POOL, history: play('night', 'bight', 'fight'), hardMode: true, opener: 'bight' });
    expect(review[1].best.word).not.toBe('flmns');
    expect(review[1].best.word).toMatch(/ight$/);
  });

  it('counts a final correct guess from two candidates as best', () => {
    const review = buildReview({ answers: ['light', 'might'], guessPool: POOL, history: play('might', 'might'), hardMode: false, opener: 'light' });
    expect(review[0].matchedBest).toBe(true);
  });
});

describe('guess quality', () => {
  it('is 1 for the best split and proportionally less for weaker guesses', () => {
    const review = buildReview({ answers: ANSWERS, guessPool: POOL, history: play('night', 'bight', 'fight'), hardMode: false, opener: 'bight' });
    // FIGHT splits the six _IGHT words into 2 groups; FLMNS splits them into 6.
    expect(review[1].quality).toBeCloseTo(2 / 6);
  });

  it('gives full credit for guessing one of the last two words', () => {
    const review = buildReview({ answers: ['light', 'might'], guessPool: POOL, history: play('might', 'might'), hardMode: false, opener: 'light' });
    expect(review[0].quality).toBe(1);
  });

  it('gives no credit for a non-candidate when the answer is already known', () => {
    const review = buildReview({ answers: ['light'], guessPool: POOL, history: play('light', 'crane', 'light'), hardMode: false, opener: 'light' });
    expect(review[0].quality).toBe(0);
  });
});

describe('strategyScore', () => {
  const entry = (quality: number) => ({ quality }) as ReviewEntry;

  it('averages guess quality as a percentage', () => {
    expect(strategyScore([entry(1), entry(0.5), entry(1)])).toBe(83);
  });

  it('is zero for an empty review', () => {
    expect(strategyScore([])).toBe(0);
  });
});
