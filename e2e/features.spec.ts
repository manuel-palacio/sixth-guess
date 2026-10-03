import { expect, test, type APIRequestContext } from '@playwright/test';
import { guess, startPracticeWith } from './helpers.ts';

/** Creates a challenge through the real API, as the settings form does. */
async function challengeLink(request: APIRequestContext, language: string, word: string, clue: string): Promise<string> {
  const response = await request.post('/api/challenges', { data: { language, word, clue } });
  expect(response.status()).toBe(201);
  return `/?c=${(await response.json()).code}`;
}

test.describe('strategy score', () => {
  test('rates the finished game and keeps a running average in stats', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'speed');
    await guess(page, 'abide');
    await expect(page.locator('#strategy-score')).toHaveText(/^Strategy score: \d{1,3}%$/);
    await page.keyboard.press('Escape');
    await page.click('#open-stats');
    await expect(page.locator('.stats-section').nth(1).locator('.stats-figures')).toContainText(/\d{1,3}%Strategy/);
    await expect(page.locator('.stats-section').first().locator('.stats-figures')).toContainText('–Strategy');
  });

  test('records the score only once across reloads', async ({ page }) => {
    await startPracticeWith(page, 'abide');
    await guess(page, 'abide');
    await expect(page.locator('#strategy-score')).not.toBeEmpty();
    await page.reload();
    await expect(page.locator('#strategy-score')).not.toBeEmpty();
    const games = await page.evaluate(() => JSON.parse(localStorage.getItem('sixth-guess:stats:en:practice')!).strategyGames);
    expect(games).toBe(1);
  });
});

test.describe('challenge links', () => {
  test('a friend can create a link for any five letters, with a clue and a name', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/');
    await page.click('#open-challenge');
    await page.fill('#challenge-word', 'Zorbo');
    await page.fill('#challenge-clue-input', 'our old dog');
    await page.fill('#challenge-from', 'Ana');
    await page.click('#challenge-form button[type="submit"]');
    await expect(page.locator('#challenge-status')).toHaveText('Challenge link copied');
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/\?c=[A-Za-z0-9_-]+$/);
    expect(link.toLowerCase()).not.toContain('zorbo');
    await expect(page.locator('#challenge-link')).toHaveValue(link);
  });

  test('rejects a challenge word that is not five letters', async ({ page }) => {
    await page.goto('/');
    await page.click('#open-challenge');
    await page.fill('#challenge-word', 'dog');
    await page.click('#challenge-form button[type="submit"]');
    await expect(page.locator('#challenge-status')).toHaveText('The word must be exactly five letters');
  });

  test('the link opens the challenge with its clue, and accepts any five letters for an off-dictionary word', async ({ page, request }) => {
    await page.goto(await challengeLink(request, 'en', 'zorbo', 'our old dog'));
    await page.click('#welcome-start');
    await expect(page.locator('#game-caption')).toHaveText('Challenge');
    await expect(page.locator('#challenge-clue')).toHaveText('Clue: our old dog');
    await expect(page.locator('[data-mode="daily"]')).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#off-dictionary')).toBeVisible();
    await expect(page.locator('#pad-summary')).toHaveText('Custom word');
    await guess(page, 'qxzvb');
    await guess(page, 'zorbo');
    await expect(page.locator('#result-title')).toHaveText('Solved in 2');
    await expect(page.locator('.review-table tbody tr')).toHaveCount(2);
  });

  test('a dictionary word keeps the normal word-list check and does not touch stats', async ({ page, request }) => {
    await page.goto(await challengeLink(request, 'en', 'crane', ''));
    await page.click('#welcome-start');
    await expect(page.locator('#challenge-clue')).toBeHidden();
    await page.keyboard.type('qxzvb');
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toHaveText('Not in word list');
    await page.keyboard.press('Backspace');
    for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace');
    await guess(page, 'crane');
    await expect(page.locator('#result-dialog')).toBeVisible();
    const stats = await page.evaluate(() => [localStorage.getItem('sixth-guess:stats:en:daily'), localStorage.getItem('sixth-guess:stats:en:practice')]);
    expect(stats).toEqual([null, null]);
  });

  test('an uncommon but valid word counts against the full guess list', async ({ page, request }) => {
    await page.goto(await challengeLink(request, 'es', 'tapas', ''));
    await page.click('#welcome-start');
    await expect(page.locator('#off-dictionary')).toBeHidden();
    await guess(page, 'perro');
    await expect(page.locator('#pad-summary')).not.toHaveText(/^Encajan 0 /);
    await page.click('#toggle-words');
    await expect(page.locator('#fit-words')).toContainText('TAPAS');
  });

  test('a challenge in progress survives a reload, and leaving it returns to daily play', async ({ page, request }) => {
    await page.goto(await challengeLink(request, 'es', 'señor', 'el profe'));
    await page.click('#welcome-start');
    await expect(page.locator('#game-caption')).toHaveText('Reto');
    await guess(page, 'perro');
    await page.reload();
    await expect(page.locator('.board-row').first()).toContainText('perro', { ignoreCase: true });
    await page.click('[data-mode="daily"]');
    await expect(page.locator('#game-caption')).toHaveText(/^Diario n\.º \d+$/);
    expect(new URL(page.url()).search).toBe('');
  });

  test('the result dialog offers a challenge link for the word just played', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await startPracticeWith(page, 'abide');
    await guess(page, 'abide');
    await page.click('#challenge-this-word');
    await expect(page.locator('#result-status')).toHaveText('Challenge link copied');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('?c=');
  });

  test('the friend never receives the word before the game ends', async ({ page, request }) => {
    const bodies: string[] = [];
    page.on('response', async (response) => {
      if (response.url().includes('/api/')) bodies.push(await response.text());
    });
    await page.goto(await challengeLink(request, 'en', 'zorbo', 'our old dog'));
    await page.click('#welcome-start');
    await guess(page, 'crane');
    expect(page.url().toLowerCase()).not.toContain('zorbo');
    expect(bodies.join('')).not.toContain('zorbo');
    expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('zorbo');
    await guess(page, 'zorbo');
    await expect(page.locator('#result-answer')).toHaveText('ZORBO');
  });

  test('explains the challenge the first time the link is opened', async ({ page, request }) => {
    const response = await request.post('/api/challenges', { data: { language: 'en', word: 'zorbo', clue: 'our old dog', from: 'Ana' } });
    await page.goto(`/?c=${(await response.json()).code}`);
    const welcome = page.locator('#welcome-dialog');
    await expect(welcome).toBeVisible();
    await expect(welcome.locator('h2')).toHaveText('Ana has challenged you');
    await expect(welcome).toContainText('Find it in six guesses');
    await expect(welcome.locator('#welcome-clue')).toHaveText('Clue: our old dog');
    await expect(welcome.locator('#welcome-any-letters')).toBeVisible();
    await expect(welcome.locator('#welcome-start')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(welcome).toBeHidden();
    await guess(page, 'crane');
    await page.reload();
    await expect(page.locator('.board-row').first()).toContainText('crane', { ignoreCase: true });
    await expect(welcome).toBeHidden();
  });

  test('the welcome speaks the challenge language and works without a name', async ({ page, request }) => {
    await page.goto(await challengeLink(request, 'fr', 'livre', ''));
    await expect(page.locator('#welcome-dialog h2')).toHaveText('On vous lance un défi');
    await expect(page.locator('#welcome-clue')).toBeHidden();
    await expect(page.locator('#welcome-any-letters')).toBeHidden();
  });

  test('a broken link falls back to normal play with a message', async ({ page }) => {
    await page.goto('/?c=garbage');
    await expect(page.locator('#toast')).toHaveText('This challenge link is broken');
    await expect(page.locator('#game-caption')).toHaveText(/^Daily #\d+$/);
  });
});

test.describe('interface language', () => {
  test('switching to Spanish translates the interface and the explanations', async ({ page }) => {
    await startPracticeWith(page, 'luces', { hardMode: true });
    await page.selectOption('#language', 'es');
    await expect(page.locator('[data-mode="daily"]')).toHaveText('Diario');
    await expect(page.locator('#suggest')).toHaveText('Sugerir jugada');
    await expect(page.locator('[data-key="Enter"]')).toHaveText('Enviar');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('French hard-mode messages name the position', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('sixth-guess:settings', JSON.stringify({ mode: 'practice', language: 'fr', hardMode: true }));
      localStorage.setItem('sixth-guess:game:fr:practice', JSON.stringify({ answer: 'livre', guesses: [], status: 'playing', hardMode: true, statsRecorded: false }));
    });
    await page.reload();
    await expect(page.locator('#game-caption')).toHaveText('Entraînement, mode difficile');
    await guess(page, 'litre');
    await page.keyboard.type('sucre');
    await page.keyboard.press('Enter');
    await expect(page.locator('#toast')).toHaveText('La 1re lettre doit être L');
  });

  test('the settings dialog is translated', async ({ page }) => {
    await page.goto('/');
    await page.selectOption('#language', 'fr');
    await page.click('#open-settings');
    await expect(page.locator('#settings-title')).toHaveText('Réglages');
    await expect(page.locator('#settings-dialog')).not.toContainText('Défier un ami');
    await page.keyboard.press('Escape');
    await expect(page.locator('#open-challenge')).toHaveAttribute('aria-label', 'Défier un ami');
    await page.click('#open-challenge');
    await expect(page.locator('#challenge-title')).toHaveText('Défier un ami');
  });
});

test.describe('install and offline play', () => {
  test('ships a web app manifest with icons', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifest = await (await request.get(href!)).json();
    expect(manifest.name).toBe('Sixth Guess');
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons.map((icon: { sizes: string }) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
  });

  test('keeps working offline after the first visit, in every language', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect(page.locator('.key').first()).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('.key').first()).toBeVisible();
    await page.selectOption('#language', 'fr');
    await expect(page.locator('.keyboard-row').first()).toHaveText(/^azertyuiop$/i);
    await page.click('[data-mode="practice"]');
    await guess(page, 'livre');
  });
});
