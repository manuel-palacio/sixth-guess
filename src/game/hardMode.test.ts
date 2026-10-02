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

  it('requires greens to stay in place, naming the position', () => {
    expect(findHardModeViolations('fight', play('night', 'bolts'))).toEqual([]);
    expect(findHardModeViolations('tubes', play('light', 'fight'))).toContain('4th letter must be H');
    expect(findHardModeViolations('tubes', play('light', 'fight'))).toContain('2nd letter must be I');
  });

  it('requires yellows to be reused', () => {
    expect(findHardModeViolations('blimp', play('abide', 'speed'))).toEqual(['Guess must contain E', 'Guess must contain D']);
  });

  it('counts repeated letters', () => {
    const history = play('geese', 'eerie');
    expect(findHardModeViolations('beige', history)).toEqual(['Guess must contain 3 Es']);
    expect(hardModeLegality(history)('geese')).toBe(true);
  });

  it('accepts a guess that uses every hint', () => {
    expect(hardModeLegality(play('abide', 'speed', 'aided'))('abide')).toBe(true);
  });
});
