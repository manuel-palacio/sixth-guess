import type { Clues } from '../game/clues.ts';
import type { Suggestion } from '../game/suggest.ts';
import { byId } from './dom.ts';
import { explainSuggestion, messagesFor, type Messages } from './i18n.ts';

export interface ScratchpadView {
  clues: Clues;
  pool: string[];
  candidates: string[];
  /** The answer may be outside the dictionary (a friend's challenge), so counts cannot be trusted. */
  offDictionary: boolean;
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
  private readonly offDictionaryNote = byId('off-dictionary');
  private candidates: string[] = [];
  private messages: Messages = messagesFor('en');

  constructor(onSuggest: () => void) {
    this.wordsButton.addEventListener('click', () => this.setWordsVisible(!this.isShowingWords()));
    this.suggestButton.addEventListener('click', onSuggest);
  }

  setMessages(messages: Messages): void {
    this.messages = messages;
    this.labelWordsButton(this.isShowingWords());
  }

  update({ clues, pool, candidates, offDictionary }: ScratchpadView): void {
    this.candidates = candidates;
    this.offDictionaryNote.hidden = !offDictionary;
    this.pattern.replaceChildren(
      ...clues.greens.map((green, position) => patternSlot(green, clues.excludedByPosition[position], this.messages)),
    );
    this.pool.replaceChildren(...pool.map((letter) => poolLetter(letter, clues.minCounts.has(letter))));
    const fits = this.messages.fitCount(candidates.length);
    this.fitCount.textContent = fits;
    this.summary.textContent = offDictionary ? this.messages.customWord : fits;
    this.suggestion.textContent = '';
    if (!this.words.hidden) this.renderWords();
  }

  showThinking(): void {
    this.suggestButton.disabled = true;
    this.suggestion.textContent = this.messages.thinking;
  }

  showSuggestion(suggestion: Suggestion, hardMode: boolean): void {
    this.suggestButton.disabled = false;
    const word = document.createElement('strong');
    word.className = 'suggested-word';
    word.textContent = suggestion.word.toUpperCase();
    const note = hardMode ? ` ${this.messages.hardModeConsidered}` : '';
    this.suggestion.replaceChildren(`${this.messages.tryWord} `, word, `. ${explainSuggestion(this.messages, suggestion)}${note}`);
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
    this.labelWordsButton(visible);
    if (visible) this.renderWords();
  }

  private isShowingWords(): boolean {
    return this.wordsButton.getAttribute('aria-expanded') === 'true';
  }

  private labelWordsButton(visible: boolean): void {
    this.wordsButton.setAttribute('aria-expanded', String(visible));
    this.wordsButton.textContent = visible ? this.messages.hideWords : this.messages.showWords;
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
      more.textContent = `+${this.candidates.length - WORD_LIST_LIMIT}`;
      shown.push(more);
    }
    this.words.replaceChildren(...shown);
  }
}

function patternSlot(green: string, excluded: string[], messages: Messages): HTMLElement {
  const slot = document.createElement('div');
  slot.className = 'slot';
  const letter = document.createElement('span');
  letter.className = 'slot-letter';
  letter.textContent = green ? green.toUpperCase() : '_';
  const ruledOut = document.createElement('span');
  ruledOut.className = 'slot-excluded';
  ruledOut.textContent = green ? '' : excluded.map((x) => x.toUpperCase()).join(' ');
  slot.setAttribute('aria-label', describeSlot(green, excluded, messages));
  slot.append(letter, ruledOut);
  return slot;
}

function describeSlot(green: string, excluded: string[], messages: Messages): string {
  if (green) return messages.slotKnown(green.toUpperCase());
  return excluded.length ? messages.slotRuledOut(excluded.map((x) => x.toUpperCase()).join(', ')) : messages.slotUnknown;
}

function poolLetter(letter: string, knownPresent: boolean): HTMLElement {
  const span = document.createElement('span');
  span.textContent = letter.toUpperCase();
  if (knownPresent) span.className = 'known';
  return span;
}
