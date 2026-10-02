import type { TileState } from '../game/feedback.ts';
import type { Language } from '../game/language.ts';

export const ENTER = 'Enter';
export const BACKSPACE = 'Backspace';

const STATE_LABEL: Record<TileState, string> = { correct: 'correct', present: 'in word', absent: 'not in word' };

export class Keyboard {
  private keys = new Map<string, HTMLButtonElement>();
  private readonly root: HTMLElement;
  private readonly onKey: (key: string) => void;

  constructor(root: HTMLElement, onKey: (key: string) => void) {
    this.root = root;
    this.onKey = onKey;
    // Keep focus where it was, so a physical Enter after a tap submits instead of re-pressing the key.
    root.addEventListener('mousedown', (event) => event.preventDefault());
    root.addEventListener('click', (event) => {
      const key = (event.target as HTMLElement).closest<HTMLButtonElement>('button')?.dataset.key;
      if (key) this.onKey(key);
    });
  }

  setLayout(language: Language): void {
    this.keys.clear();
    const rows = language.keyboardRows.map((letters, index) => {
      const row = document.createElement('div');
      row.className = 'keyboard-row';
      const isLast = index === language.keyboardRows.length - 1;
      if (isLast) row.append(this.createKey(ENTER, 'Enter', 'Enter', 'wide'));
      for (const letter of letters) row.append(this.createKey(letter, letter, letter.toUpperCase()));
      if (isLast) row.append(this.createKey(BACKSPACE, '⌫', 'Delete letter', 'wide'));
      return row;
    });
    this.root.replaceChildren(...rows);
  }

  colour(keyStates: Map<string, TileState>): void {
    for (const [letter, button] of this.keys) {
      if (letter === ENTER || letter === BACKSPACE) continue;
      const state = keyStates.get(letter);
      button.dataset.state = state ?? 'unused';
      button.setAttribute('aria-label', state ? `${letter.toUpperCase()}, ${STATE_LABEL[state]}` : letter.toUpperCase());
    }
  }

  private createKey(key: string, text: string, label: string, size = ''): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `key ${size}`.trim();
    button.dataset.key = key;
    button.textContent = text;
    button.setAttribute('aria-label', label);
    this.keys.set(key, button);
    return button;
  }
}
