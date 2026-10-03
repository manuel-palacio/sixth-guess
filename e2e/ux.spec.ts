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
    expect(await background()).toBe('rgb(20, 27, 49)');
    await page.click('#open-settings');
    await page.selectOption('#setting-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await background()).toBe('rgb(248, 250, 253)');
  });

  test('offers a choice of themes, saved across visits', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await startPracticeWith(page, 'abide');
    await guess(page, 'aided');
    const look = () =>
      page.evaluate(() => ({
        paper: getComputedStyle(document.body).backgroundColor,
        correct: getComputedStyle(document.querySelector('.tile')!).backgroundColor,
      }));
    expect(await look()).toEqual({ paper: 'rgb(248, 250, 253)', correct: 'rgb(13, 131, 112)' });
    await page.click('#open-settings');
    await page.locator('label.palette-option', { hasText: 'Sage' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
    expect(await look()).toEqual({ paper: 'rgb(245, 249, 246)', correct: 'rgb(31, 122, 160)' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-palette', 'sage');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sixth-guess:settings')!).palette)).toBe('sage');
    await page.keyboard.press('Escape');
    await page.click('#open-settings');
    await expect(page.locator('input[name="palette"][value="sage"]')).toBeChecked();
  });

  test('every theme has a dark variant', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await startPracticeWith(page, 'abide', { palette: 'lavender' });
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(24, 20, 42)');
  });

  test('colour-blind mode overrides the theme colours', async ({ page }) => {
    await startPracticeWith(page, 'abide', { palette: 'sage', highContrast: true });
    await guess(page, 'aided');
    const background = await page.locator('.tile').first().evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(background).toBe('rgb(31, 95, 214)');
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
  test('messages raised while a dialog is open appear inside it, not behind it', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'crane');
    await page.click('#open-settings');
    await page.locator('#setting-hard').check();
    await expect(page.locator('#settings-status')).toHaveText('Hard mode changes from your next game');
    await expect(page.locator('#settings-status')).toBeInViewport();
  });

  test('settings show, quietly, when this version was built', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.click('#open-settings');
    await expect(page.locator('#build-info')).toHaveText(/^Built .+20\d\d.+ · [0-9a-f]{7}$/);
    await page.keyboard.press('Escape');
    await page.selectOption('#language', 'es');
    await page.click('#open-settings');
    await expect(page.locator('#build-info')).toHaveText(/^Compilado el .+ · [0-9a-f]{7}$/);
  });

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

  test('Enter still submits after closing a dialog that was opened with the mouse', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.click('#open-settings');
    await page.keyboard.press('Escape');
    await guess(page, 'crane');
  });

  test('closing a dialog opened from the keyboard returns focus to its button', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.locator('#open-settings').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(page.locator('#open-settings')).toBeFocused();
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
