import { expect, type Page } from '@playwright/test';

export const GAME_KEY = 'sixth-guess:game:en:practice';

/** Starts a practice game with a known answer, so assertions can be exact. */
export async function startPracticeWith(page: Page, answer: string, settings: Record<string, unknown> = {}): Promise<void> {
  await page.goto('/');
  await page.evaluate(
    ({ key, answer, settings }) => {
      localStorage.clear();
      localStorage.setItem('sixth-guess:settings', JSON.stringify({ mode: 'practice', ...settings }));
      localStorage.setItem(key, JSON.stringify({ answer, guesses: [], status: 'playing', hardMode: Boolean(settings.hardMode), statsRecorded: false }));
    },
    { key: GAME_KEY, answer, settings },
  );
  await page.reload();
  await expect(page.locator('.key').first()).toBeVisible();
}

/** Types and submits a word, then waits until the reveal has finished and input is accepted again. */
export async function guess(page: Page, word: string): Promise<void> {
  const index = await revealedRows(page);
  await page.keyboard.type(word);
  await page.keyboard.press('Enter');
  await expect(page.locator('.board-row').nth(index)).toHaveAttribute('aria-label', new RegExp(`^Guess ${index + 1}: `));
}

export function tileStates(page: Page, row: number) {
  return page.locator('.board-row').nth(row).locator('.tile').evaluateAll((tiles) => tiles.map((tile) => (tile as HTMLElement).dataset.state));
}

function revealedRows(page: Page): Promise<number> {
  return page.locator('.board-row[aria-label*=":"]').count();
}
