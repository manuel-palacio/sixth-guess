import { expect, test } from '@playwright/test';
import { guess, startPracticeWith } from './helpers.ts';

test.describe('scratchpad', () => {
  test('fills the pattern, ruled-out yellows, letter pool and fit count', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'aided');
    const slots = page.locator('#pattern .slot');
    await expect(slots.first().locator('.slot-letter')).toHaveText('A');
    await expect(slots.nth(1).locator('.slot-excluded')).toHaveText('I');
    await expect(page.locator('#pool .known')).toHaveText(['A', 'D', 'E', 'I']);
    await expect(page.locator('#fit-count')).toHaveText(/\d+ words? still fits?/);
  });

  test('removes grey letters from the pool', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    const pool = await page.locator('#pool span').allTextContents();
    expect(pool).not.toContain('S');
    expect(pool).not.toContain('P');
    expect(pool).toContain('E');
  });

  test('shows the fitting words only on request', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await expect(page.locator('#fit-words')).toBeHidden();
    await page.click('#toggle-words');
    await expect(page.locator('#fit-words')).toBeVisible();
    await expect(page.locator('#fit-words')).toContainText('ABIDE');
  });

  test('suggests a non-candidate to escape the _IGHT trap and says why', async ({ page }) => {
    await startPracticeWith(page, 'night');
    await guess(page, 'bight');
    await page.click('#suggest');
    const suggestion = page.locator('#suggestion');
    await expect(suggestion).toContainText(/Try [A-Z]{5}\. Tests .* at once/);
    const word = (await suggestion.locator('.suggested-word').textContent())!;
    expect(word).not.toMatch(/IGHT$/);
  });

  test('restricts suggestions to legal guesses in hard mode', async ({ page }) => {
    await startPracticeWith(page, 'night', { hardMode: true });
    await guess(page, 'bight');
    await page.click('#suggest');
    await expect(page.locator('#suggestion')).toContainText('Only hard-mode legal guesses were considered');
    await expect(page.locator('.suggested-word')).toHaveText(/^.IGHT$/);
  });

  test('can be hidden in settings', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.click('#open-settings');
    await page.locator('#setting-scratchpad').uncheck();
    await page.keyboard.press('Escape');
    await expect(page.locator('#scratchpad')).toBeHidden();
    await page.reload();
    await expect(page.locator('#scratchpad')).toBeHidden();
  });
});
