import { describe, expect, it } from 'vitest';
import { measureSplit, suggestGuess } from './suggest.ts';
import { scoreGuess } from './feedback.ts';
import { filterCandidates } from './candidates.ts';

const IGHT_TRAP = ['fight', 'light', 'might', 'night', 'sight', 'tight'];

describe('suggestGuess', () => {
  it('suggests a non-candidate that splits the _IGHT trap better than any candidate', () => {
    const pool = [...IGHT_TRAP, 'flems', 'fling', 'stomp'];
    const history = [{ word: 'bight', states: scoreGuess('bight', 'night') }];
    const candidates = filterCandidates(IGHT_TRAP, history);
    const suggestion = suggestGuess(candidates, pool, history);
    expect(IGHT_TRAP).not.toContain(suggestion.word);
    expect(suggestion.groupCount).toBeGreaterThan(measureSplit('fight', candidates).groupCount);
  });

  it('explains which untested letters the suggestion probes', () => {
    const history = [{ word: 'bight', states: scoreGuess('bight', 'night') }];
    const suggestion = suggestGuess(IGHT_TRAP, ['flmns', ...IGHT_TRAP], history);
    expect(suggestion.word).toBe('flmns');
    expect(suggestion.reason).toBe('Tests F, L, M, N, S at once: splits 6 words into 6 groups.');
  });

  it('prefers a candidate when it splits equally well', () => {
    const suggestion = suggestGuess(['abide', 'aside', 'crane'], ['zzzzz', 'abide', 'crane'], []);
    expect(['abide', 'crane']).toContain(suggestion.word);
    expect(suggestion.reason).toContain('could be the answer');
  });

  it('names the only remaining word', () => {
    const suggestion = suggestGuess(['crane'], ['zzzzz'], []);
    expect(suggestion.word).toBe('crane');
    expect(suggestion.reason).toBe('It is the only word that fits every clue.');
  });

  it('goes for one of two remaining words', () => {
    expect(suggestGuess(['light', 'might'], ['zzzzz'], []).word).toBe('light');
  });

  it('restricts itself to the pool it is given, such as hard-mode legal guesses', () => {
    const suggestion = suggestGuess(IGHT_TRAP, IGHT_TRAP, []);
    expect(IGHT_TRAP).toContain(suggestion.word);
  });

  it('throws when nothing fits', () => {
    expect(() => suggestGuess([], ['crane'], [])).toThrow();
  });
});

describe('measureSplit', () => {
  it('counts distinct patterns and the largest group', () => {
    expect(measureSplit('fight', IGHT_TRAP)).toEqual({ groupCount: 2, largestGroup: 5 });
  });
});
