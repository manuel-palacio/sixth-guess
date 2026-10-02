import { filterCandidates } from '../game/candidates.ts';
import { deriveClues, letterPool } from '../game/clues.ts';
import { dayNumber, msUntilNextDay } from '../game/daily.ts';
import { WORD_LENGTH } from '../game/feedback.ts';
import { GuessRejectedError, MAX_GUESSES, submitGuess } from '../game/game.ts';
import { LANGUAGE_CODES, LANGUAGES, normalizeWord, type LanguageCode } from '../game/language.ts';
import { legalGuessPool } from '../game/review.ts';
import { buildShareText } from '../game/share.ts';
import { Board, describeTiles } from './board.ts';
import { renderReview, renderStats } from './dialogs.ts';
import { byId } from './dom.ts';
import { BACKSPACE, ENTER, Keyboard } from './keyboard.ts';
import { Scratchpad } from './scratchpad.ts';
import { loadStats, openGame, recordFinishedGame, saveGame, startPracticeGame, type SavedGame } from './session.ts';
import { loadSettings, saveSettings, type Mode, type Settings } from './settings.ts';
import { Solver } from './solver.ts';
import { loadWordBank, type WordBank } from './wordBank.ts';

const GAME_NAME = 'Sixth Guess';
const TOAST_MS = 2200;
const RESULT_DELAY_MS = 1400;
const DESKTOP_QUERY = '(min-width: 900px)';
const NARROW_QUERY = '(max-width: 479px)';

export class App {
  private settings: Settings = loadSettings();
  private bank!: WordBank;
  private game!: SavedGame;
  private input = '';
  private revealing = false;
  private candidates: string[] = [];
  private toastTimer = 0;
  private readonly board = new Board(byId('board'));
  private readonly keyboard = new Keyboard(byId('keyboard'), (key) => this.handleKey(key));
  private readonly scratchpad = new Scratchpad(() => void this.suggest());
  private readonly solver = new Solver();

  async start(): Promise<void> {
    this.applyAppearance();
    this.bindHeader();
    this.bindSettings();
    this.bindResultDialog();
    this.bindScratchpadLayout();
    await this.loadGame();
    document.addEventListener('keydown', (event) => this.handlePhysicalKey(event));
    document.addEventListener('click', releasePointerFocus);
    document.addEventListener('visibilitychange', () => this.rollOverDailyIfStale());
  }

  private async loadGame(): Promise<void> {
    const { language, mode, hardMode } = this.settings;
    this.bank = await loadWordBank(language);
    this.game = openGame(language, mode, this.bank, hardMode, new Date());
    this.input = '';
    this.keyboard.setLayout(LANGUAGES[language]);
    this.renderAll();
    if (this.game.status !== 'playing') this.openResult();
  }

  // Input

  private handlePhysicalKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (event.key === ENTER && target.closest('button, summary')) return;
    const key = event.key === ENTER || event.key === BACKSPACE ? event.key : normalizeWord(this.settings.language, event.key);
    if (key === ENTER || key === BACKSPACE || this.isLetter(key)) {
      event.preventDefault();
      this.handleKey(key);
    }
  }

  private handleKey(key: string): void {
    if (this.revealing || this.game.status !== 'playing') return;
    if (key === ENTER) {
      void this.submit();
      return;
    }
    if (key === BACKSPACE) this.input = [...this.input].slice(0, -1).join('');
    else if (this.isLetter(key) && [...this.input].length < WORD_LENGTH) this.input += key;
    this.board.render(this.game, this.input);
  }

  private isLetter(key: string): boolean {
    return [...key].length === 1 && LANGUAGES[this.settings.language].alphabet.includes(key);
  }

  private async submit(): Promise<void> {
    const row = this.game.guesses.length;
    let next: SavedGame;
    try {
      next = { ...this.game, ...submitGuess(this.game, this.input, this.bank.validGuesses) };
    } catch (error) {
      if (!(error instanceof GuessRejectedError)) throw error;
      this.showToast(error.message);
      this.board.shake(row);
      return;
    }
    await this.revealGuess(row, next);
  }

  private async revealGuess(row: number, next: SavedGame): Promise<void> {
    this.revealing = true;
    this.game = next;
    this.input = '';
    saveGame(this.settings.language, this.settings.mode, next);
    const { word, states } = next.guesses[row];
    await this.board.reveal(row, word, states);
    this.revealing = false;
    this.renderAll();
    this.announceGuess(row);
    if (next.status !== 'playing') this.finishGame(row);
  }

  private finishGame(row: number): void {
    this.game = recordFinishedGame(this.settings.language, this.settings.mode, this.game);
    if (this.game.status === 'won') this.board.celebrate(row);
    else this.showToast(`The word was ${this.game.answer.toUpperCase()}`, RESULT_DELAY_MS);
    setTimeout(() => this.openResult(), RESULT_DELAY_MS);
  }

  // Rendering

  private renderAll(): void {
    const clues = deriveClues(this.game.guesses);
    this.candidates = filterCandidates(this.bank.answers, this.game.guesses);
    this.board.render(this.game, this.input);
    this.keyboard.colour(clues.keyStates);
    this.scratchpad.update({ clues, pool: letterPool(LANGUAGES[this.settings.language].alphabet, clues), candidates: this.candidates });
    this.scratchpad.setSuggestEnabled(this.game.status === 'playing');
    byId('game-caption').textContent = this.caption();
    this.renderHeaderState();
  }

  private caption(): string {
    const mode = this.settings.mode === 'daily' ? `Daily #${this.game.day}` : 'Practice';
    return this.game.hardMode ? `${mode}, hard mode` : mode;
  }

  private announceGuess(row: number): void {
    const { word, states } = this.game.guesses[row];
    const fits = this.settings.showScratchpad && this.game.status === 'playing' ? ` ${byId('fit-count').textContent}.` : '';
    byId('announcer').textContent = `Guess ${row + 1} of ${MAX_GUESSES}: ${describeTiles(word, states)}.${fits}`;
  }

  private showToast(message: string, duration = TOAST_MS): void {
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), duration);
  }

  // Scratchpad

  private async suggest(): Promise<void> {
    const { guesses, hardMode } = this.game;
    const pool = guesses.length === 0 ? [this.bank.opener] : legalGuessPool(this.bank.guesses, guesses, hardMode);
    this.scratchpad.showThinking();
    try {
      const suggestion = await this.solver.suggest(this.candidates, pool, guesses);
      this.scratchpad.showSuggestion(suggestion, hardMode && guesses.length > 0);
    } catch {
      this.scratchpad.showUnavailable('No suggestion: no word in the list fits these clues.');
    }
  }

  private bindScratchpadLayout(): void {
    const details = byId<HTMLDetailsElement>('scratchpad-details');
    const desktop = window.matchMedia(DESKTOP_QUERY);
    details.open = desktop.matches;
    desktop.addEventListener('change', () => (details.open = desktop.matches));
  }

  // Header and settings

  private bindHeader(): void {
    const languageSelect = byId<HTMLSelectElement>('language');
    const narrow = window.matchMedia(NARROW_QUERY);
    const labelLanguages = () =>
      languageSelect.replaceChildren(...LANGUAGE_CODES.map((code) => new Option(narrow.matches ? code.toUpperCase() : LANGUAGES[code].name, code)));
    labelLanguages();
    narrow.addEventListener('change', () => {
      labelLanguages();
      languageSelect.value = this.settings.language;
    });
    languageSelect.addEventListener('change', () => void this.changeSettings({ language: languageSelect.value as LanguageCode }, true));
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      button.addEventListener('click', () => void this.changeSettings({ mode: button.dataset.mode as Mode }, true));
    }
    byId('open-stats').addEventListener('click', () => this.openStats());
    byId('open-settings').addEventListener('click', () => byId<HTMLDialogElement>('settings-dialog').showModal());
    byId('toggle-theme').addEventListener('click', () => void this.changeSettings({ theme: this.isDark() ? 'light' : 'dark' }));
  }

  private isDark(): boolean {
    if (this.settings.theme !== 'system') return this.settings.theme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  private renderHeaderState(): void {
    byId<HTMLSelectElement>('language').value = this.settings.language;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      button.setAttribute('aria-checked', String(button.dataset.mode === this.settings.mode));
    }
  }

  private bindSettings(): void {
    const hard = byId<HTMLInputElement>('setting-hard');
    const scratchpad = byId<HTMLInputElement>('setting-scratchpad');
    const contrast = byId<HTMLInputElement>('setting-contrast');
    const theme = byId<HTMLSelectElement>('setting-theme');
    hard.checked = this.settings.hardMode;
    scratchpad.checked = this.settings.showScratchpad;
    contrast.checked = this.settings.highContrast;
    theme.value = this.settings.theme;
    hard.addEventListener('change', () => this.changeHardMode(hard.checked));
    scratchpad.addEventListener('change', () => void this.changeSettings({ showScratchpad: scratchpad.checked }));
    contrast.addEventListener('change', () => void this.changeSettings({ highContrast: contrast.checked }));
    theme.addEventListener('change', () => void this.changeSettings({ theme: theme.value as Settings['theme'] }));
  }

  private async changeSettings(changes: Partial<Settings>, reloadGame = false): Promise<void> {
    const unchanged = Object.entries(changes).every(([key, value]) => this.settings[key as keyof Settings] === value);
    if (unchanged) return;
    this.settings = { ...this.settings, ...changes };
    saveSettings(this.settings);
    this.applyAppearance();
    if (reloadGame) await this.loadGame();
  }

  private changeHardMode(enabled: boolean): void {
    void this.changeSettings({ hardMode: enabled });
    if (this.game.status === 'playing' && this.game.guesses.length === 0) {
      this.game = { ...this.game, hardMode: enabled };
      saveGame(this.settings.language, this.settings.mode, this.game);
      this.renderAll();
    } else {
      this.showToast('Hard mode changes from your next game');
    }
  }

  private applyAppearance(): void {
    const root = document.documentElement;
    if (this.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = this.settings.theme;
    root.dataset.contrast = this.settings.highContrast ? 'high' : 'standard';
    root.lang = this.settings.language;
    byId('scratchpad').hidden = !this.settings.showScratchpad;
    byId('toggle-theme').setAttribute('aria-label', this.isDark() ? 'Switch to light theme' : 'Switch to dark theme');
    byId<HTMLSelectElement>('setting-theme').value = this.settings.theme;
  }

  private rollOverDailyIfStale(): void {
    const stale = this.settings.mode === 'daily' && this.game && this.game.day !== dayNumber(new Date());
    if (document.visibilityState === 'visible' && stale) void this.loadGame();
  }

  // Stats and result

  private openStats(): void {
    renderStats(byId('stats-body'), this.statsSections());
    byId<HTMLDialogElement>('stats-dialog').showModal();
  }

  private statsSections(highlightGuessCount?: number) {
    const { language } = this.settings;
    const name = LANGUAGES[language].name;
    return [
      { title: `Daily, ${name}`, stats: loadStats(language, 'daily'), today: dayNumber(new Date()), highlightGuessCount: this.settings.mode === 'daily' ? highlightGuessCount : undefined },
      { title: `Practice, ${name}`, stats: loadStats(language, 'practice'), highlightGuessCount: this.settings.mode === 'practice' ? highlightGuessCount : undefined },
    ];
  }

  private bindResultDialog(): void {
    byId('share').addEventListener('click', () => void this.share());
    byId('next-game').addEventListener('click', () => this.playAnother());
  }

  private openResult(): void {
    const won = this.game.status === 'won';
    const guessCount = this.game.guesses.length;
    byId('result-title').textContent = won ? (guessCount === 1 ? 'Solved in one' : `Solved in ${guessCount}`) : 'Out of guesses';
    byId('result-answer').textContent = won ? this.game.answer.toUpperCase() : `The word was ${this.game.answer.toUpperCase()}`;
    byId('next-game').textContent = this.settings.mode === 'practice' ? 'Play another' : 'Practice while you wait';
    byId('next-daily').textContent = this.settings.mode === 'daily' ? `Next daily word in ${formatCountdown(msUntilNextDay(new Date()))}` : '';
    renderStats(byId('result-stats'), this.statsSections(won ? guessCount : undefined).filter((section) => section.title.startsWith(this.settings.mode === 'daily' ? 'Daily' : 'Practice')));
    const dialog = byId<HTMLDialogElement>('result-dialog');
    if (!dialog.open) dialog.showModal();
    void this.renderGameReview();
  }

  private async renderGameReview(): Promise<void> {
    const container = byId('review');
    container.textContent = 'Reviewing your guesses…';
    const { guesses, hardMode } = this.game;
    const entries = await this.solver.review({ answers: this.bank.answers, guessPool: this.bank.guesses, history: guesses, hardMode, opener: this.bank.opener });
    renderReview(container, entries);
  }

  private async share(): Promise<void> {
    const text = buildShareText({
      gameName: GAME_NAME,
      modeLabel: this.settings.mode === 'daily' ? `Daily #${this.game.day}` : 'Practice',
      languageCode: this.settings.language,
      guesses: this.game.guesses,
      won: this.game.status === 'won',
      hardMode: this.game.hardMode,
      highContrast: this.settings.highContrast,
    });
    this.showToast((await copyText(text)) ? 'Result copied' : 'Copying is blocked in this browser');
  }

  private playAnother(): void {
    byId<HTMLDialogElement>('result-dialog').close();
    const { language, hardMode } = this.settings;
    const resumable = this.settings.mode === 'daily' ? openGame(language, 'practice', this.bank, hardMode, new Date()) : undefined;
    void this.changeSettings({ mode: 'practice' });
    this.game = resumable?.status === 'playing' ? resumable : startPracticeGame(language, this.bank, hardMode);
    this.input = '';
    this.renderAll();
  }
}

/** After a mouse or touch click, hand focus back so a physical Enter submits the guess instead of re-clicking. */
function releasePointerFocus(event: MouseEvent): void {
  const isPointerClick = event.detail > 0;
  const button = (event.target as HTMLElement).closest('header button');
  if (isPointerClick && button instanceof HTMLElement) button.blur();
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}
