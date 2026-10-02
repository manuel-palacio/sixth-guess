import type { Clues } from '../game/clues.ts';
import type { Suggestion } from '../game/suggest.ts';
import { byId } from './dom.ts';

export interface ScratchpadView {
  clues: Clues;
  pool: string[];
  candidates: string[];
}

const WORD_LIST_LIMIT = 500;

export class Scratchpad {
  private readonly pattern = byId('pattern');
  private readonly pool = byId('pool');
  private readonly fitCount = byId('fit-count');
  private readonly summary = byId('pad-summary');
  private readonly wordsButton = byId<HTMLButtonElement>('toggle-words');
  private readonly words = byId<HTMLOListElement>('fit-words');
  private readonly suggestButton = byId<HTMLButtonElement>('suggest');
  private readonly suggestion = byId('suggestion');
  private candidates: string[] = [];

  constructor(onSuggest: () => void) {
    this.wordsButton.addEventListener('click', () => this.setWordsVisible(this.wordsButton.getAttribute('aria-expanded') !== 'true'));
    this.suggestButton.addEventListener('click', onSuggest);
  }

  update({ clues, pool, candidates }: ScratchpadView): void {
    this.candidates = candidates;
    this.pattern.replaceChildren(...clues.greens.map((green, position) => patternSlot(green, clues.excludedByPosition[position])));
    this.pool.replaceChildren(...pool.map((letter) => poolLetter(letter, clues.minCounts.has(letter))));
    const fits = candidates.length === 1 ? '1 word still fits' : `${candidates.length} words still fit`;
    this.fitCount.textContent = fits;
    this.summary.textContent = fits;
    this.suggestion.textContent = '';
    if (!this.words.hidden) this.renderWords();
  }

  showThinking(): void {
    this.suggestButton.disabled = true;
    this.suggestion.textContent = 'Working it out…';
  }

  showSuggestion(suggestion: Suggestion, hardMode: boolean): void {
    this.suggestButton.disabled = false;
    const word = document.createElement('strong');
    word.className = 'suggested-word';
    word.textContent = suggestion.word.toUpperCase();
    const note = hardMode ? ' Only hard-mode legal guesses were considered.' : '';
    this.suggestion.replaceChildren('Try ', word, `. ${suggestion.reason}${note}`);
  }

  showUnavailable(message: string): void {
    this.suggestButton.disabled = false;
    this.suggestion.textContent = message;
  }

  setSuggestEnabled(enabled: boolean): void {
    this.suggestButton.disabled = !enabled;
  }

  private setWordsVisible(visible: boolean): void {
    this.words.hidden = !visible;
    this.wordsButton.setAttribute('aria-expanded', String(visible));
    this.wordsButton.textContent = visible ? 'Hide words' : 'Show words that fit';
    if (visible) this.renderWords();
  }

  private renderWords(): void {
    const shown = this.candidates.slice(0, WORD_LIST_LIMIT).map((word) => {
      const item = document.createElement('li');
      item.textContent = word.toUpperCase();
      return item;
    });
    if (this.candidates.length > WORD_LIST_LIMIT) {
      const more = document.createElement('li');
      more.className = 'more';
      more.textContent = `and ${this.candidates.length - WORD_LIST_LIMIT} more`;
      shown.push(more);
    }
    this.words.replaceChildren(...shown);
  }
}

function patternSlot(green: string, excluded: string[]): HTMLElement {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const letter = document.createElement('span');
  letter.className = 'slot-letter';
  letter.textContent = green ? green.toUpperCase() : '_';
  const ruledOut = document.createElement('span');
  ruledOut.className = 'slot-excluded';
  ruledOut.textContent = green ? '' : excluded.map((x) => x.toUpperCase()).join(' ');
  slot.setAttribute('aria-label', describeSlot(green, excluded));
  slot.append(letter, ruledOut);
  return slot;
}

function describeSlot(green: string, excluded: string[]): string {
  if (green) return `Known: ${green.toUpperCase()}`;
  return excluded.length ? `Unknown, not ${excluded.map((x) => x.toUpperCase()).join(', ')}` : 'Unknown';
}

function poolLetter(letter: string, knownPresent: boolean): HTMLElement {
  const span = document.createElement('span');
  span.textContent = letter.toUpperCase();
  if (knownPresent) span.className = 'known';
  return span;
}
