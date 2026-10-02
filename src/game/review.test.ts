import { describe, expect, it } from 'vitest';
import { buildReview } from './review.ts';
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
