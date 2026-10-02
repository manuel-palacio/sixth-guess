import { expect, test } from '@playwright/test';
import { guess, startPracticeWith, tileStates } from './helpers.ts';

test.describe('core rules', () => {
  test('scores SPEED against ABIDE with one yellow E and one grey E', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    expect(await tileStates(page, 0)).toEqual(['absent', 'absent', 'present', 'absent', 'present']);
  });

  test('colours the on-screen keyboard by the best known state', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await expect(page.locator('[data-key="e"]')).toHaveAttribute('data-state', 'present');
    await expect(page.locator('[data-key="s"]')).toHaveAttribute('data-state', 'absent');
    await guess(page, 'abide');
    await expect(page.locator('[data-key="e"]')).toHaveAttribute('data-state', 'correct');
  });

  test('accepts on-screen key presses and Backspace', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    for (const key of ['c', 'r', 'a', 'n', 'x', 'Backspace', 'e', 'Enter']) await page.click(`[data-key="${key}"]`);
    await expect(page.locator('.board-row').first()).toHaveAttribute('aria-label', 'Guess 1: C not in word, R not in word, A wrong place, N not in word, E correct');
  });

  test('rejects a word outside the list with a shake and a message', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.keyboard.type('zzzzz');
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toHaveText('Not in word list');
    await expect(page.locator('.board-row').first()).toHaveClass(/shake/);
    expect(await tileStates(page, 0)).toEqual(['filled', 'filled', 'filled', 'filled', 'filled']);
  });

  test('announces each guess result through an aria-live region', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await expect(page.locator('#announcer')).toHaveAttribute('aria-live', 'polite');
    await expect(page.locator('#announcer')).toContainText('Guess 1 of 6: S not in word, P not in word, E wrong place, E not in word, D wrong place');
  });

  test('keeps a game in progress across a reload', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await page.keyboard.type('cra');
    await page.reload();
    expect(await tileStates(page, 0)).toEqual(['absent', 'absent', 'present', 'absent', 'present']);
    await expect(page.locator('.board-row').first()).toContainText('speed', { ignoreCase: true });
  });

  test('works when localStorage is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get: () => { throw new Error('blocked'); } });
    });
    await page.goto('/');
    await expect(page.locator('.key').first()).toBeVisible();
    await page.keyboard.type('crane');
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-row').first().locator('.tile').last()).toHaveAttribute('data-state', /correct|present|absent/);
  });
});

test.describe('hard mode', () => {
  test('rejects a guess that ignores a hint and says why', async ({ page }) => {
    await startPracticeWith(page, 'light', { hardMode: true });
    await guess(page, 'fight');
    await page.keyboard.type('crane');
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toHaveText('2nd letter must be I');
    await expect(page.locator('#game-caption')).toHaveText('Practice, hard mode');
  });
});
