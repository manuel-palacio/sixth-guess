import { describe, expect, it } from 'vitest';
import { buildShareText } from './share.ts';
import { scoreGuess } from './feedback.ts';

const guesses = ['speed', 'aided', 'abide'].map((word) => ({ word, states: scoreGuess(word, 'abide') }));
const details = { gameName: 'Palabrita', modeLabel: 'Daily #274', languageCode: 'en', guesses, won: true, hardMode: false, highContrast: false };

describe('buildShareText', () => {
  it('has the game name, mode, language and score, then the grid', () => {
    expect(buildShareText(details)).toBe(['Palabrita · Daily #274 · EN · 3/6', '', '⬜⬜🟪⬜🟪', '🟩🟪🟪🟪⬜', '🟩🟩🟩🟩🟩'].join('\n'));
  });

  it('marks hard mode and losses', () => {
    expect(buildShareText({ ...details, won: false, hardMode: true })).toContain('X/6*');
  });

  it('uses the high-contrast pair in colour-blind mode', () => {
    expect(buildShareText({ ...details, highContrast: true })).toContain('🟦🟦🟦🟦🟦');
  });

  it('never contains the guessed letters', () => {
    expect(buildShareText(details).toLowerCase()).not.toMatch(/abide|speed|aided/);
  });
});
