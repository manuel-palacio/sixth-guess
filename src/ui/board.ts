import { WORD_LENGTH, type TileState } from '../game/feedback.ts';
import { MAX_GUESSES, type GameState } from '../game/game.ts';
import { describeTiles, messagesFor, type Messages } from './i18n.ts';
import { prefersReducedMotion } from './motion.ts';

const FLIP_MS = 320;
const FLIP_STAGGER_MS = 260;

export class Board {
  private readonly rows: HTMLElement[];
  private messages: Messages = messagesFor('en');

  constructor(root: HTMLElement) {
    this.rows = Array.from({ length: MAX_GUESSES }, () => createRow());
    root.replaceChildren(...this.rows);
  }

  setMessages(messages: Messages): void {
    this.messages = messages;
  }

  render(game: GameState, input: string): void {
    this.rows.forEach((row, index) => {
      const guess = game.guesses[index];
      if (guess) this.fillRow(row, guess.word, guess.states);
      else this.fillRow(row, index === game.guesses.length ? input : '', []);
    });
  }

  async reveal(index: number, word: string, states: TileState[]): Promise<void> {
    const tiles = tilesOf(this.rows[index]);
    if (prefersReducedMotion()) {
      this.fillRow(this.rows[index], word, states);
      return;
    }
    await Promise.all(tiles.map((tile, position) => flipTile(tile, states[position], position * FLIP_STAGGER_MS)));
    this.fillRow(this.rows[index], word, states);
  }

  shake(index: number): void {
    if (prefersReducedMotion()) return;
    replayAnimation(this.rows[index], 'shake');
  }

  celebrate(index: number): void {
    if (prefersReducedMotion()) return;
    replayAnimation(this.rows[index], 'bounce');
  }

  private fillRow(row: HTMLElement, word: string, states: TileState[]): void {
    const letters = [...word];
    tilesOf(row).forEach((tile, position) => {
      const letter = letters[position] ?? '';
      tile.textContent = letter;
      tile.dataset.state = states[position] ?? (letter ? 'filled' : 'empty');
    });
    row.setAttribute('aria-label', this.describeRow(this.rows.indexOf(row) + 1, word, states));
  }

  private describeRow(rowNumber: number, word: string, states: TileState[]): string {
    if (states.length > 0) return this.messages.rowResult(rowNumber, describeTiles(this.messages, word, states));
    return word ? this.messages.rowTyping(rowNumber, word.toUpperCase()) : this.messages.rowEmpty(rowNumber);
  }
}

function createRow(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'board-row';
  row.setAttribute('role', 'group');
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    row.append(tile);
  }
  return row;
}

function tilesOf(row: HTMLElement): HTMLElement[] {
  return [...row.children] as HTMLElement[];
}

function flipTile(tile: HTMLElement, state: TileState, delay: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => (tile.dataset.state = state), FLIP_MS / 2);
      setTimeout(() => {
        tile.classList.remove('flip');
        resolve();
      }, FLIP_MS);
    }, delay);
  });
}

function replayAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  void element.offsetWidth; // restart the CSS animation
  element.classList.add(className);
  element.addEventListener('animationend', () => element.classList.remove(className), { once: true });
}
