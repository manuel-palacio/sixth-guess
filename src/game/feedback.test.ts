import { describe, expect, it } from 'vitest';
import { encodePattern, patternCode, scoreGuess } from './feedback.ts';

const letters = (guess: string, answer: string) =>
  scoreGuess(guess, answer).map((state) => state[0]).join('');

describe('scoreGuess', () => {
  it('marks every tile correct when the guess is the answer', () => {
    expect(letters('crane', 'crane')).toBe('ccccc');
  });

  it('marks letters absent when they are not in the answer', () => {
    expect(letters('blimp', 'crane')).toBe('aaaaa');
  });

  it('marks letters present when they are in the wrong place', () => {
    expect(letters('nacre', 'crane')).toBe('ppppc');
  });

  it('gives SPEED against ABIDE one yellow E and one grey E', () => {
    expect(letters('speed', 'abide')).toBe('aapap');
  });

  it('assigns greens before yellows for a repeated letter', () => {
    // THERE: final E is green, so only one E is left for the first E of EERIE.
    expect(letters('eerie', 'there')).toBe('papac');
  });

  it('limits yellows by the number of copies left after greens', () => {
    // ABBEY has two Bs; KEBAB: B at 3 is green, B at 5 takes the second B as yellow.
    expect(letters('kebab', 'abbey')).toBe('apcpp');
    // HELLO has two Ls, so both Ls of LLAMA are yellow.
    expect(letters('llama', 'hello')).toBe('ppaaa');
    // ROBOT has two Os: the first O of BOOST is green, the second yellow.
    expect(letters('boost', 'robot')).toBe('pcpac');
  });

  it('assigns yellows left to right when copies run out', () => {
    expect(letters('eeeee', 'abide')).toBe('aaaac');
    expect(letters('eexxx', 'abied')).toBe('paaaa');
  });

  it('treats ñ as a distinct letter', () => {
    expect(letters('señor', 'sueño')).toBe('cpppa');
    expect(letters('senor', 'señor')).toBe('ccacc');
  });
});

describe('patternCode', () => {
  it('is 242 for a win and 0 for all absent', () => {
    expect(patternCode('crane', 'crane')).toBe(242);
    expect(patternCode('blimp', 'crane')).toBe(0);
  });

  it('agrees with scoreGuess', () => {
    const words = ['speed', 'abide', 'kebab', 'abbey', 'robot', 'boost', 'eerie', 'there'];
    for (const guess of words) {
      for (const answer of words) {
        expect(patternCode(guess, answer)).toBe(encodePattern(scoreGuess(guess, answer)));
      }
    }
  });
});
