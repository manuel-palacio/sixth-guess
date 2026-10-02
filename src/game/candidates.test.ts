import { describe, expect, it } from 'vitest';
import { filterCandidates } from './candidates.ts';
import { scoreGuess } from './feedback.ts';

const WORDS = ['light', 'might', 'night', 'fight', 'sight', 'tight', 'abide', 'aside', 'crane'];

describe('filterCandidates', () => {
  it('returns every word before any guess', () => {
    expect(filterCandidates(WORDS, [])).toEqual(WORDS);
  });

  it('keeps only words consistent with all feedback', () => {
    const history = [{ word: 'bight', states: scoreGuess('bight', 'night') }];
    expect(filterCandidates(WORDS, history)).toEqual(['light', 'might', 'night', 'fight', 'sight', 'tight']);
  });

  it('handles repeated-letter feedback exactly', () => {
    const history = [{ word: 'speed', states: scoreGuess('speed', 'abide') }];
    expect(filterCandidates(WORDS, history)).toEqual(['abide']);
  });

  it('always keeps the real answer', () => {
    for (const answer of WORDS) {
      const history = ['crane', 'tight'].map((word) => ({ word, states: scoreGuess(word, answer) }));
      expect(filterCandidates(WORDS, history)).toContain(answer);
    }
  });
});
