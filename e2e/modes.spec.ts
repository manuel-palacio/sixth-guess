import { expect, test } from '@playwright/test';
import { dailyAnswer, dayNumber } from '../src/game/daily.ts';
import en from '../src/data/en.json' with { type: 'json' };
import { guess, startPracticeWith } from './helpers.ts';

const today = () => dailyAnswer(en.answers, dayNumber(new Date()));

test.describe('daily mode', () => {
  test('serves the date-derived word and is playable once per day', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#game-caption')).toHaveText(`Daily #${dayNumber(new Date())}`);
    await guess(page, today());
    await expect(page.locator('#result-dialog')).toBeVisible();
    await expect(page.locator('#next-daily')).toContainText('Next daily word in');
    await page.reload();
    await expect(page.locator('#result-dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.type('crane');
    await page.keyboard.press('Enter');
    await expect(page.locator('.board-row').nth(1).locator('.tile').first()).toHaveAttribute('data-state', 'empty');
  });
});

test.describe('practice mode', () => {
  test('starts a different word after each game', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'abide');
    await page.click('#next-game');
    await expect(page.locator('.board-row').first().locator('.tile').first()).toHaveAttribute('data-state', 'empty');
    const answer = await page.evaluate(() => JSON.parse(localStorage.getItem('sixth-guess:game:en:practice')!).answer);
    expect(answer).not.toBe('abide');
  });

  test('switches between daily and practice from the header', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-mode="practice"]');
    await expect(page.locator('#game-caption')).toHaveText('Practice');
    await expect(page.locator('[data-mode="practice"]')).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('languages', () => {
  test('Spanish uses a keyboard with Ñ and French an AZERTY layout', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('#language', 'es');
    await expect(page.locator('[data-key="ñ"]')).toBeVisible();
    await page.selectOption('#language', 'fr');
    await expect(page.locator('.keyboard-row').first()).toHaveText(/^azertyuiop$/i);
  });
});
