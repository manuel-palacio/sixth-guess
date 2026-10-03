import { expect, test, type Browser, type Page } from '@playwright/test';
import { guess } from './helpers.ts';

/** A player with their own browser storage, so their own player id and name. */
async function player(browser: Browser, name: string): Promise<Page> {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const page = await context.newPage();
  await page.goto('/');
  await page.evaluate((playerName) => localStorage.setItem('sixth-guess:player-name', JSON.stringify(playerName)), name);
  await page.reload();
  await expect(page.locator('.key').first()).toBeVisible();
  return page;
}

async function sendChallenge(page: Page, word: string, details: { story?: string; language?: string } = {}): Promise<string> {
  await page.click('#open-challenge');
  if (details.language) await page.selectOption('#challenge-language', details.language);
  await page.fill('#challenge-word', word);
  if (details.story) await page.fill('#challenge-story', details.story);
  await page.click('#challenge-form button[type="submit"]');
  await expect(page.locator('#challenge-status')).toHaveText('Challenge link copied');
  const link = await page.locator('#challenge-link').inputValue();
  await page.keyboard.press('Escape');
  return link;
}

async function openAndStart(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await page.click('#welcome-start');
}

test.describe('friends playing each other', () => {
  test('links are short, and the story is revealed only at the end', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide', { story: 'Our first flat, Calle Abide 3' });
    expect(new URL(link).searchParams.get('c')).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    await guess(manu, 'speed');
    await expect(manu.locator('body')).not.toContainText('Calle Abide');
    await guess(manu, 'abide');
    await expect(manu.locator('#result-story')).toBeVisible();
    await expect(manu.locator('#result-story-text')).toHaveText('Our first flat, Calle Abide 3');
  });

  test('without a story, nothing extra is shown', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'crane');
    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    await guess(manu, 'crane');
    await expect(manu.locator('#result-dialog')).toBeVisible();
    await expect(manu.locator('#result-story')).toBeHidden();
  });

  test('everyone who plays the same link appears on its scoreboard', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide');
    const luis = await player(browser, 'Luis');
    await openAndStart(luis, link);
    for (const word of ['crane', 'slate', 'fight', 'blimp', 'mount', 'rocky']) await guess(luis, word);

    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    await guess(manu, 'speed');
    await guess(manu, 'abide');
    const rows = manu.locator('#scoreboard-list .scoreboard-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toContainText('You');
    await expect(rows.nth(0)).toContainText('2/6');
    await expect(rows.nth(0)).toHaveClass(/is-you/);
    await expect(rows.nth(1)).toContainText('Luis');
    await expect(rows.nth(1)).toContainText('X/6');
  });

  test('the sender sees results arrive, with a badge on the toolbar', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide');
    await ana.click('#open-challenge');
    await expect(ana.locator('#sent-list')).toContainText('ABIDE');
    await expect(ana.locator('#sent-list')).toContainText('No one has played yet');
    await ana.keyboard.press('Escape');

    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    await guess(manu, 'abide');

    await ana.reload();
    await expect(ana.locator('#challenge-badge')).toHaveText('1');
    await ana.click('#open-challenge');
    await expect(ana.locator('#sent-list .sent-row').first()).toContainText('Manu 1/6');
    await expect(ana.locator('#sent-list .sent-new')).toHaveText('1 new');
    await expect(ana.locator('#challenge-badge')).toBeHidden();
    await ana.keyboard.press('Escape');
    await ana.reload();
    await expect(ana.locator('#challenge-badge')).toBeHidden();
  });

  test('challenge back starts a series that keeps score round after round', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const first = await sendChallenge(ana, 'abide');

    const manu = await player(browser, 'Manu');
    await openAndStart(manu, first);
    await expect(manu.locator('#welcome-name')).toHaveValue('Manu');
    await guess(manu, 'speed');
    await guess(manu, 'aided');
    await guess(manu, 'abide');
    await expect(manu.locator('#challenge-back')).toHaveText('Challenge Ana back');
    await manu.click('#challenge-back');
    await expect(manu.locator('#challenge-title')).toHaveText('Challenge Ana back');
    await expect(manu.locator('#challenge-from')).toHaveValue('Manu');
    await manu.fill('#challenge-word', 'crane');
    await manu.click('#challenge-form button[type="submit"]');
    await expect(manu.locator('#challenge-status')).toHaveText('Challenge link copied');
    const message = await manu.evaluate(() => navigator.clipboard.readText());
    expect(message).toMatch(/^Palabrita · Challenge · EN · 3\/6\n\n/);
    expect(message).toContain('Your turn: http');
    const second = await manu.locator('#challenge-link').inputValue();

    await ana.goto(second);
    await expect(ana.locator('#welcome-series')).toHaveText('Round 2 · You 0 pts – Manu 4 pts');
    await ana.click('#welcome-start');
    await guess(ana, 'slate');
    await guess(ana, 'crane');
    await expect(ana.locator('#result-series')).toHaveText('Round 2 · You 5 pts – Manu 4 pts');
  });

  test('a challenge back keeps the language of the challenge it answers', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const first = await sendChallenge(ana, 'perro', { language: 'es' });
    const manu = await player(browser, 'Manu');
    await openAndStart(manu, first);
    await guess(manu, 'perro');
    await manu.click('#challenge-back');
    await expect(manu.locator('#challenge-language')).toHaveValue('es');
  });
});

test.describe('guesses are tracked by the server', () => {
  test('clearing the saved game does not reset the board', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide');
    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    await guess(manu, 'speed');
    await guess(manu, 'crane');
    await manu.evaluate(() => localStorage.removeItem('sixth-guess:game:en:challenge'));
    await manu.reload();
    await expect(manu.locator('.board-row').nth(0)).toContainText('speed', { ignoreCase: true });
    await expect(manu.locator('.board-row').nth(1)).toContainText('crane', { ignoreCase: true });
    await expect(manu.locator('#welcome-dialog')).toBeHidden();
  });

  test('a board that moved on in another tab is restored instead of overwritten', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide');
    const manu = await player(browser, 'Manu');
    await openAndStart(manu, link);
    const otherTab = await manu.context().newPage();
    await openAndStart(otherTab, link);
    await guess(otherTab, 'speed');
    await guess(manu, 'crane');
    await expect(manu.locator('#toast')).toHaveText('Your board was updated with the guesses saved for you');
    await expect(manu.locator('.board-row').nth(0)).toContainText('speed', { ignoreCase: true });
    await expect(manu.locator('.board-row').nth(1).locator('.tile').first()).toHaveAttribute('data-state', 'empty');
  });

  test('starting over and over from one connection is refused', async ({ browser }) => {
    const ana = await player(browser, 'Ana');
    const link = await sendChallenge(ana, 'abide');
    for (let n = 0; n < 4; n++) {
      const fresh = await player(browser, `P${n}`);
      await openAndStart(fresh, link);
      await guess(fresh, 'speed');
      await fresh.context().close();
    }
    const fifth = await player(browser, 'P5');
    await openAndStart(fifth, link);
    await fifth.keyboard.type('speed');
    await fifth.keyboard.press('Enter');
    await expect(fifth.locator('#toast')).toHaveText('This challenge has already been started too many times from this connection.');
  });
});
