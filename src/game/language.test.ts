import { describe, expect, it } from 'vitest';
import { isPlayableWord, normalizeWord } from './language.ts';

describe('normalizeWord', () => {
  it('folds French accents and cedillas', () => {
    expect(normalizeWord('fr', 'Élève')).toBe('eleve');
    expect(normalizeWord('fr', 'garçon')).toBe('garcon');
  });

  it('keeps Spanish ñ but folds other accents', () => {
    expect(normalizeWord('es', 'Señor')).toBe('señor');
    expect(normalizeWord('es', 'cañón')).toBe('cañon');
    expect(normalizeWord('es', 'pingüino')).toBe('pinguino');
  });

  it('folds ñ in languages without it', () => {
    expect(normalizeWord('en', 'piñata')).toBe('pinata');
  });
});

describe('isPlayableWord', () => {
  it('requires five letters from the language alphabet', () => {
    expect(isPlayableWord('en', 'crane')).toBe(true);
    expect(isPlayableWord('en', 'cranes')).toBe(false);
    expect(isPlayableWord('en', 'señor')).toBe(false);
    expect(isPlayableWord('es', 'señor')).toBe(true);
    expect(isPlayableWord('fr', 'cœurs')).toBe(false);
  });
});
