import { describe, expect, it } from 'vitest';
import { dailyAnswer, dayNumber, msUntilNextDay } from './daily.ts';

const WORDS = Array.from({ length: 50 }, (_, i) => `w${String(i).padStart(4, '0')}`);

describe('dayNumber', () => {
  it('counts local calendar days from 2026-01-01', () => {
    expect(dayNumber(new Date(2026, 0, 1, 0, 1))).toBe(0);
    expect(dayNumber(new Date(2026, 0, 1, 23, 59))).toBe(0);
    expect(dayNumber(new Date(2026, 0, 2, 0, 0))).toBe(1);
    expect(dayNumber(new Date(2026, 9, 2, 12))).toBe(274);
  });
});

describe('dailyAnswer', () => {
  it('is deterministic for a given day', () => {
    expect(dailyAnswer(WORDS, 274)).toBe(dailyAnswer([...WORDS], 274));
  });

  it('does not repeat until the list is exhausted', () => {
    const seen = new Set(Array.from({ length: WORDS.length }, (_, day) => dailyAnswer(WORDS, day)));
    expect(seen.size).toBe(WORDS.length);
  });

  it('is not simply alphabetical', () => {
    const firstWeek = Array.from({ length: 7 }, (_, day) => dailyAnswer(WORDS, day));
    expect(firstWeek).not.toEqual(WORDS.slice(0, 7));
  });
});

describe('msUntilNextDay', () => {
  it('counts down to local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 9, 2, 23, 0, 0))).toBe(3_600_000);
  });
});
