import { WORD_LENGTH, type TileState } from '../game/feedback.ts';
import { MAX_GUESSES, type GameState } from '../game/game.ts';
import { prefersReducedMotion } from './motion.ts';

const FLIP_MS = 320;
const FLIP_STAGGER_MS = 260;

export class Board {
  private readonly rows: HTMLElement[];

  constructor(root: HTMLElement) {
    this.rows = Array.from({ length: MAX_GUESSES }, (_, index) => createRow(index));
    root.replaceChildren(...this.rows);
  }

  render(game: GameState, input: string): void {
    this.rows.forEach((row, index) => {
      const guess = game.guesses[index];
      if (guess) fillRow(row, guess.word, guess.states);
      else fillRow(row, index === game.guesses.length ? input : '', []);
    });
  }

  async reveal(index: number, word: string, states: TileState[]): Promise<void> {
    const tiles = tilesOf(this.rows[index]);
    if (prefersReducedMotion()) {
      fillRow(this.rows[index], word, states);
      return;
    }
    await Promise.all(tiles.map((tile, position) => flipTile(tile, states[position], position * FLIP_STAGGER_MS)));
    fillRow(this.rows[index], word, states);
  }

  shake(index: number): void {
    if (prefersReducedMotion()) return;
    replayAnimation(this.rows[index], 'shake');
  }

  celebrate(index: number): void {
    if (prefersReducedMotion()) return;
    replayAnimation(this.rows[index], 'bounce');
  }
}

function createRow(index: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'board-row';
  row.setAttribute('role', 'group');
  row.setAttribute('aria-label', `Guess ${index + 1}`);
  for (let i = 0; i < WORD_LENGTH; i++) {
    const tile = document.createElement('div');
    tile.className = 'tile';
    row.append(tile);
  }
  return row;
}

function fillRow(row: HTMLElement, word: string, states: TileState[]): void {
  const letters = [...word];
  tilesOf(row).forEach((tile, position) => {
    const letter = letters[position] ?? '';
    tile.textContent = letter;
    tile.dataset.state = states[position] ?? (letter ? 'filled' : 'empty');
  });
  row.setAttribute('aria-label', describeRow(row, word, states));
}

function describeRow(row: HTMLElement, word: string, states: TileState[]): string {
  const index = row.parentElement ? [...row.parentElement.children].indexOf(row) + 1 : 0;
  if (states.length === 0) return word ? `Guess ${index}, typing: ${word.toUpperCase()}` : `Guess ${index}, empty`;
  return `Guess ${index}: ${describeTiles(word, states)}`;
}

export function describeTiles(word: string, states: TileState[]): string {
  const label: Record<TileState, string> = { correct: 'correct', present: 'wrong place', absent: 'not in word' };
  return [...word].map((letter, position) => `${letter.toUpperCase()} ${label[states[position]]}`).join(', ');
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
