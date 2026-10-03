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

  it('reports which untested letters the suggestion probes', () => {
    const history = [{ word: 'bight', states: scoreGuess('bight', 'night') }];
    const suggestion = suggestGuess(IGHT_TRAP, ['flmns', ...IGHT_TRAP], history);
    expect(suggestion.word).toBe('flmns');
    expect(suggestion.groupCount).toBe(6);
    expect(suggestion.basis).toEqual({ kind: 'split', freshLetters: ['f', 'l', 'm', 'n', 's'], candidateCount: 6, isCandidate: false });
  });

  it('prefers a candidate when it splits equally well', () => {
    const suggestion = suggestGuess(['abide', 'aside', 'crane'], ['zzzzz', 'abide', 'crane'], []);
    expect(['abide', 'crane']).toContain(suggestion.word);
    expect(suggestion.basis).toMatchObject({ kind: 'split', isCandidate: true });
  });

  it('names the only remaining word', () => {
    const suggestion = suggestGuess(['crane'], ['zzzzz'], []);
    expect(suggestion.word).toBe('crane');
    expect(suggestion.basis).toEqual({ kind: 'only' });
  });

  it('goes for one of two remaining words', () => {
    const suggestion = suggestGuess(['light', 'might'], ['zzzzz'], []);
    expect(suggestion.word).toBe('light');
    expect(suggestion.basis).toEqual({ kind: 'pair', words: ['light', 'might'] });
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
