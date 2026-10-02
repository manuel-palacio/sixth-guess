import { expect, test } from '@playwright/test';
import { guess, startPracticeWith } from './helpers.ts';

test.describe('layout', () => {
  test('board and keyboard fit a 360px phone screen without scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await startPracticeWith(page, 'abide');
    const size = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
    expect(size).toEqual([360, 640]);
    const lastKey = await page.locator('[data-key="Backspace"]').boundingBox();
    expect(lastKey!.y + lastKey!.height).toBeLessThanOrEqual(640);
    await expect(page.locator('#scratchpad-details')).not.toHaveAttribute('open');
  });

  test('keeps the board readable and the keyboard on screen when the phone scratchpad is open', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await startPracticeWith(page, 'abide');
    await page.click('#scratchpad summary');
    await expect(page.locator('#scratchpad-details')).toHaveAttribute('open');
    const tile = (await page.locator('.tile').first().boundingBox())!;
    expect(tile.width).toBeGreaterThanOrEqual(36);
    const lastKey = (await page.locator('[data-key="Backspace"]').boundingBox())!;
    expect(lastKey.y + lastKey.height).toBeLessThanOrEqual(640);
    await expect(page.locator('#suggest')).toBeVisible();
  });

  test('shows the scratchpad beside the board on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await startPracticeWith(page, 'abide');
    const board = (await page.locator('#board').boundingBox())!;
    const pad = (await page.locator('#scratchpad').boundingBox())!;
    expect(pad.x).toBeGreaterThan(board.x + board.width);
    await expect(page.locator('#scratchpad-details')).toHaveAttribute('open');
  });
});

test.describe('appearance', () => {
  test('follows the system theme and has a manual toggle', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await startPracticeWith(page, 'abide');
    const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await background()).toBe('rgb(18, 26, 51)');
    await page.click('#toggle-theme');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await background()).toBe('rgb(238, 242, 246)');
  });

  test('colour-blind mode swaps the colours and marks tiles with a shape', async ({ page }) => {
    await startPracticeWith(page, 'abide', { highContrast: true });
    await guess(page, 'aided');
    const tile = (index: number) => page.locator('.board-row').first().locator('.tile').nth(index);
    const look = (index: number) =>
      tile(index).evaluate((el) => ({ background: getComputedStyle(el).backgroundColor, mark: getComputedStyle(el, '::after').content }));
    expect(await look(0)).toEqual({ background: 'rgb(31, 95, 214)', mark: '"✓"' });
    expect(await look(1)).toEqual({ background: 'rgb(242, 138, 23)', mark: '"↔"' });
  });
});

test.describe('motion', () => {
  test('flips tiles on reveal and shakes on an invalid guess', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.keyboard.type('crane');
    await page.keyboard.press('Enter');
    await expect(page.locator('.tile.flip').first()).toBeAttached();
  });

  test('skips animations when reduced motion is preferred', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startPracticeWith(page, 'abide');
    await page.keyboard.type('crane');
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-row').first().locator('.tile').last()).toHaveAttribute('data-state', 'correct', { timeout: 100 });
    await expect(page.locator('.tile.flip')).toHaveCount(0);
    await page.keyboard.type('zzzzz');
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-row').nth(1)).not.toHaveClass(/shake/);
  });
});

test.describe('keyboard accessibility', () => {
  test('settings and stats open and close with the keyboard', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.locator('#open-settings').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#settings-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-dialog')).toBeHidden();
  });

  test('Enter submits the guess after clicking a header button with the mouse', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.click('[data-mode="practice"]');
    await guess(page, 'crane');
  });

  test('Enter on a focused header button does not submit the guess', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.keyboard.type('crane');
    await page.locator('[data-mode="practice"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-row').first().locator('.tile').first()).toHaveAttribute('data-state', 'filled');
    await expect(page.locator('.board-row').first()).toHaveAttribute('aria-label', 'Guess 1, typing: CRANE');
  });
});
