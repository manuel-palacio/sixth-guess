import { describe, expect, it } from 'vitest';
import type { Suggestion } from '../game/suggest.ts';
import { describeRejection, describeTiles, describeViolation, explainSuggestion, messagesFor } from './i18n.ts';

const en = messagesFor('en');
const es = messagesFor('es');
const fr = messagesFor('fr');

describe('hard-mode explanations', () => {
  it('name the position precisely in each language', () => {
    const violation = { kind: 'misplaced', position: 3, letter: 't' } as const;
    expect(describeViolation(en, violation)).toBe('4th letter must be T');
    expect(describeViolation(es, violation)).toBe('La 4.ª letra debe ser T');
    expect(describeViolation(fr, violation)).toBe('La 4e lettre doit être T');
  });

  it('name missing letters and their count', () => {
    expect(describeViolation(en, { kind: 'missing', letter: 'e', count: 1 })).toBe('Guess must contain E');
    expect(describeViolation(en, { kind: 'missing', letter: 'e', count: 2 })).toBe('Guess must contain 2 Es');
    expect(describeViolation(es, { kind: 'missing', letter: 'e', count: 1 })).toBe('Debe contener la E');
  });

  it('cover every rejection reason', () => {
    expect(describeRejection(en, { kind: 'notInList' })).toBe('Not in word list');
    expect(describeRejection(fr, { kind: 'tooShort' })).toBe('Pas assez de lettres');
    expect(describeRejection(es, { kind: 'hardMode', violation: { kind: 'misplaced', position: 0, letter: 'a' } })).toBe('La 1.ª letra debe ser A');
  });
});

describe('suggestion explanations', () => {
  const split: Suggestion = {
    word: 'flint',
    groupCount: 6,
    largestGroup: 1,
    basis: { kind: 'split', freshLetters: ['f', 'l', 'n', 't'], candidateCount: 6, isCandidate: false },
  };

  it('say which letters are tested and how the words split', () => {
    expect(explainSuggestion(en, split)).toBe('Tests F, L, N, T at once: splits 6 words into 6 groups.');
    expect(explainSuggestion(fr, split)).toBe('Teste F, L, N, T d’un coup : répartit 6 mots en 6 groupes.');
  });

  it('mention when the suggestion could win', () => {
    const candidate = { ...split, basis: { ...split.basis, isCandidate: true } } as Suggestion;
    expect(explainSuggestion(en, candidate)).toMatch(/could be the answer\.$/);
  });

  it('handle the last one or two words', () => {
    expect(explainSuggestion(en, { ...split, basis: { kind: 'only' } })).toBe('It is the only word that fits every clue.');
    expect(explainSuggestion(es, { ...split, basis: { kind: 'pair', words: ['luz', 'paz'] } })).toContain('LUZ y PAZ');
  });
});

describe('catalogues', () => {
  it('translate every key in every language', () => {
    const keys = Object.keys(en).sort();
    for (const messages of [es, fr]) {
      expect(Object.keys(messages).sort()).toEqual(keys);
      for (const value of Object.values(messages)) expect(value).toBeTruthy();
    }
  });

  it('describe tiles for screen readers', () => {
    expect(describeTiles(es, 'ab', ['correct', 'absent'])).toBe('A correcta, B no está');
  });
});
