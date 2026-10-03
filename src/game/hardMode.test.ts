import { describe, expect, it } from 'vitest';
import { findHardModeViolations, hardModeLegality } from './hardMode.ts';
import { scoreGuess } from './feedback.ts';
import type { GuessRecord } from './clues.ts';

const play = (answer: string, ...words: string[]): GuessRecord[] =>
  words.map((word) => ({ word, states: scoreGuess(word, answer) }));

describe('findHardModeViolations', () => {
  it('allows anything before the first guess', () => {
    expect(findHardModeViolations('zzzzz', [])).toEqual([]);
  });

  it('requires greens to stay in place, reporting the position', () => {
    expect(findHardModeViolations('fight', play('night', 'bolts'))).toEqual([]);
    expect(findHardModeViolations('tubes', play('light', 'fight'))).toContainEqual({ kind: 'misplaced', position: 3, letter: 'h' });
    expect(findHardModeViolations('tubes', play('light', 'fight'))).toContainEqual({ kind: 'misplaced', position: 1, letter: 'i' });
  });

  it('requires yellows to be reused', () => {
    expect(findHardModeViolations('blimp', play('abide', 'speed'))).toEqual([
      { kind: 'missing', letter: 'e', count: 1 },
      { kind: 'missing', letter: 'd', count: 1 },
    ]);
  });

  it('counts repeated letters', () => {
    const history = play('geese', 'eerie');
    expect(findHardModeViolations('beige', history)).toEqual([{ kind: 'missing', letter: 'e', count: 3 }]);
    expect(hardModeLegality(history)('geese')).toBe(true);
  });

  it('accepts a guess that uses every hint', () => {
    expect(hardModeLegality(play('abide', 'speed', 'aided'))('abide')).toBe(true);
  });
});
