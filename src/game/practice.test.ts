import { describe, expect, it } from 'vitest';
import { pickPracticeWord } from './practice.ts';

const WORDS = ['crane', 'slate', 'pious', 'abide'];

describe('pickPracticeWord', () => {
  it('never repeats until the list is exhausted', () => {
    let used: string[] = [];
    const picked: string[] = [];
    for (let i = 0; i < WORDS.length; i++) {
      const pick = pickPracticeWord(WORDS, used);
      picked.push(pick.word);
      used = pick.used;
    }
    expect(new Set(picked).size).toBe(WORDS.length);
  });

  it('starts a new cycle once every word was used', () => {
    const pick = pickPracticeWord(WORDS, WORDS, () => 0);
    expect(pick.word).toBe('crane');
    expect(pick.used).toEqual(['crane']);
  });

  it('ignores used words that are no longer in the list', () => {
    const pick = pickPracticeWord(WORDS, ['zzzzz', 'crane', 'slate', 'pious'], () => 0.5);
    expect(pick.word).toBe('abide');
  });
});
