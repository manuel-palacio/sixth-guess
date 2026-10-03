import { expect, test } from '@playwright/test';
import { guess, startPracticeWith, tileStates } from './helpers.ts';

const practiceAnswer = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sixth-guess:game:en:practice')!).answer as string);
const practiceStats = (page: import('@playwright/test').Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('sixth-guess:stats:en:practice') ?? 'null'));

test.describe('new word in practice', () => {
  test('skips straight to a new word before any guess, without touching stats', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await expect(page.locator('#new-word')).toHaveText('New word');
    await page.click('#new-word');
    expect(await practiceAnswer(page)).not.toBe('abide');
    expect(await practiceStats(page)).toBeNull();
  });

  test('asks to confirm once guesses are on the board, then reveals the word and counts a loss', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'crane');
    await page.click('#new-word');
    await expect(page.locator('#new-word')).toHaveText('Give up? Tap again');
    expect(await practiceAnswer(page)).toBe('abide');
    await page.click('#new-word');
    await expect(page.locator('#toast')).toHaveText('The word was ABIDE');
    expect(await practiceAnswer(page)).not.toBe('abide');
    expect(await tileStates(page, 0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    expect(await practiceStats(page)).toMatchObject({ played: 1, wins: 0, currentStreak: 0 });
    await expect(page.locator('#new-word')).toHaveText('New word');
  });

  test('the confirmation lapses after a few seconds', async ({ page }) => {
    await page.clock.install();
    await startPracticeWith(page, 'abide');
    await guess(page, 'crane');
    await page.click('#new-word');
    await expect(page.locator('#new-word')).toHaveText('Give up? Tap again');
    await page.clock.runFor(5000);
    await expect(page.locator('#new-word')).toHaveText('New word');
  });

  test('Enter after clicking it submits the next guess instead of pressing it again', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await page.click('#new-word');
    const answer = await practiceAnswer(page);
    await guess(page, answer === 'crane' ? 'slate' : 'crane');
    expect(await practiceAnswer(page)).toBe(answer);
  });

  test('after a win, closing the result still leaves a way to the next word', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    for (const word of ['crane', 'slate', 'speed']) await guess(page, word);
    await guess(page, 'abide');
    await expect(page.locator('#result-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#new-word')).toHaveText('Next word');
    await page.click('#new-word');
    expect(await practiceAnswer(page)).not.toBe('abide');
    expect(await tileStates(page, 0)).toEqual(['empty', 'empty', 'empty', 'empty', 'empty']);
    expect(await practiceStats(page)).toMatchObject({ played: 1, wins: 1 });
  });

  test('also moves on after a loss, and only appears in practice', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    for (const word of ['crane', 'slate', 'fight', 'blimp', 'mount', 'rocky']) await guess(page, word);
    await expect(page.locator('#result-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.click('#new-word');
    expect(await practiceAnswer(page)).not.toBe('abide');
    expect(await practiceStats(page)).toMatchObject({ played: 1, wins: 0 });
    await page.click('[data-mode="daily"]');
    await expect(page.locator('#new-word')).toBeHidden();
  });

  test('is translated', async ({ page }) => {
    await startPracticeWith(page, 'abide', { language: 'en' });
    await page.selectOption('#language', 'fr');
    await expect(page.locator('#new-word')).toHaveText('Nouveau mot');
  });
});
