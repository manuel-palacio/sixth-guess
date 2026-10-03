import { expect, test } from '@playwright/test';
import { guess, startPracticeWith } from './helpers.ts';

test.describe('after the game', () => {
  test('reveals the answer on a loss', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    for (const word of ['crane', 'slate', 'fight', 'blimp', 'mount', 'rocky']) await guess(page, word);
    await expect(page.locator('#result-title')).toHaveText('Out of guesses');
    await expect(page.locator('#result-answer')).toHaveText('The word was ABIDE');
  });

  test('reviews each guess with candidates before and after and the best guess', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await guess(page, 'abide');
    const rows = page.locator('.review-table tbody tr');
    await expect(rows).toHaveCount(2);
    await expect(rows.first().locator('.review-counts')).toHaveText(/^\d+ → \d+$/);
    await expect(rows.first().locator('.review-best')).toContainText(/[A-Z]{5}|as good as any/);
  });

  test('copies a spoiler-free emoji grid with name, mode and score', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await guess(page, 'abide');
    await page.click('#share');
    await expect(page.locator('#result-status')).toHaveText('Result copied');
    await expect(page.locator('#result-status')).toBeInViewport();
    const status = (await page.locator('#result-status').boundingBox())!;
    const topmost = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x: status.x + 5, y: status.y + status.height / 2 });
    expect(topmost).toBe('result-status');
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toBe('Sixth Guess · Practice · EN · 2/6\n\n⬜⬜🟪⬜🟪\n🟩🟩🟩🟩🟩');
  });

  test('records stats per mode', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'abide');
    await page.reload();
    await expect(page.locator('#result-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('#open-stats');
    const practice = page.locator('.stats-section').nth(1);
    await expect(practice.locator('.stats-figures')).toContainText('1Played');
    await expect(practice.locator('.stats-figures')).toContainText('100%Win rate');
    await expect(practice.locator('.stats-figures')).toContainText('1Streak');
    await expect(practice.locator('.distribution li').first()).toHaveAttribute('aria-label', '1 guess: 1');
    await expect(page.locator('.stats-section').first().locator('.stats-figures')).toContainText('0Played');
  });
});
