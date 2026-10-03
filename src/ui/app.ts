import { filterCandidates } from '../game/candidates.ts';
import { ChallengeError, createChallenge, type ChallengeDraft } from '../game/challenge.ts';
import { deriveClues, letterPool } from '../game/clues.ts';
import { dayNumber, msUntilNextDay } from '../game/daily.ts';
import { WORD_LENGTH } from '../game/feedback.ts';
import { checkGuess, GuessRejectedError, MAX_GUESSES, recordGuess, submitGuess } from '../game/game.ts';
import { LANGUAGE_CODES, LANGUAGES, normalizeWord, type LanguageCode } from '../game/language.ts';
import { legalGuessPool, strategyScore } from '../game/review.ts';
import { buildShareText } from '../game/share.ts';
import { Board } from './board.ts';
import {
  challengeCodeFromUrl,
  ChallengeUnavailableError,
  challengeUrl,
  clearChallengeFromUrl,
  createChallengeCode,
  fetchChallenge,
  judgeRemotely,
  type RemoteChallenge,
} from './challengeClient.ts';
import { renderReview, renderStats, type StatsSection } from './dialogs.ts';
import { byId } from './dom.ts';
import { applyStaticText, describeRejection, describeTiles, messagesFor, type Messages } from './i18n.ts';
import { BACKSPACE, ENTER, Keyboard } from './keyboard.ts';
import { Scratchpad } from './scratchpad.ts';
import {
  loadStats,
  openChallengeGame,
  openGame,
  recordFinishedGame,
  recordGameStrategy,
  saveGame,
  startPracticeGame,
  type SavedGame,
} from './session.ts';
import { loadSettings, saveSettings, type Mode, type Palette, type PlayMode, type Settings } from './settings.ts';
import { Solver } from './solver.ts';
import { loadWordBank, type WordBank } from './wordBank.ts';

const GAME_NAME = 'Sixth Guess';
const TOAST_MS = 2200;
const RESULT_DELAY_MS = 1400;
const DESKTOP_QUERY = '(min-width: 900px)';
const NARROW_QUERY = '(max-width: 479px)';

export class App {
  private settings: Settings = loadSettings();
  private playMode: PlayMode = this.settings.mode;
  private challenge?: RemoteChallenge;
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
    const linkProblem = await this.adoptChallengeFromUrl();
    this.applyAppearance();
    this.bindHeader();
    this.bindSettings();
    this.bindChallengeForm();
    this.bindResultDialog();
    this.bindScratchpadLayout();
    await this.loadGame();
    if (linkProblem) this.showToast(linkProblem);
    document.addEventListener('keydown', (event) => this.handlePhysicalKey(event));
    document.addEventListener('click', releasePointerFocus);
    document.addEventListener('visibilitychange', () => this.rollOverDailyIfStale());
  }

  private get messages(): Messages {
    return messagesFor(this.settings.language);
  }

  /** Opens the challenge named in the URL; returns a message when it cannot be played. */
  private async adoptChallengeFromUrl(): Promise<string | undefined> {
    const code = challengeCodeFromUrl();
    if (!code) return undefined;
    try {
      this.challenge = await fetchChallenge(code);
    } catch (error) {
      if (error instanceof ChallengeError) clearChallengeFromUrl();
      return this.describeChallengeFailure(error);
    }
    this.playMode = 'challenge';
    this.settings = { ...this.settings, language: this.challenge.language };
    return undefined;
  }

  private describeChallengeFailure(error: unknown): string {
    if (error instanceof ChallengeError) return messagesFor(this.settings.language).challengeBroken;
    if (error instanceof ChallengeUnavailableError) return messagesFor(this.settings.language).serverUnavailable;
    throw error;
  }

  private async loadGame(): Promise<void> {
    const { language, hardMode } = this.settings;
    this.bank = await loadWordBank(language);
    this.game =
      this.playMode === 'challenge' && this.challenge
        ? openChallengeGame(this.challenge, hardMode)
        : openGame(language, this.playMode === 'daily' ? 'daily' : 'practice', this.bank, hardMode, new Date());
    this.input = '';
    this.applyLanguage();
    this.renderAll();
    if (this.game.status !== 'playing') this.openResult();
    else if (this.challenge && this.game.guesses.length === 0) this.openChallengeWelcome(this.challenge);
  }

  /** Someone opening a friend's link may never have played, so say plainly what is going on. */
  private openChallengeWelcome(challenge: RemoteChallenge): void {
    const messages = this.messages;
    byId('welcome-title').textContent = challenge.from ? messages.challengedBy(challenge.from) : messages.challengedByFriend;
    const clue = byId('welcome-clue');
    clue.hidden = !challenge.clue;
    clue.textContent = challenge.clue ? messages.clue(challenge.clue) : '';
    byId('welcome-any-letters').hidden = !challenge.anyLetters;
    byId<HTMLDialogElement>('welcome-dialog').showModal();
  }

  private applyLanguage(): void {
    applyStaticText(document, this.messages);
    this.board.setMessages(this.messages);
    this.scratchpad.setMessages(this.messages);
    this.keyboard.setLayout(LANGUAGES[this.settings.language], this.messages);
    this.applyAppearance();
  }

  // Input

  private handlePhysicalKey(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]')) return;
    const target = event.target as HTMLElement;
    if (target.closest('input, select, textarea')) return;
    if (event.key === ENTER && pressesVisibleControl(target)) return;
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
    this.revealing = true;
    let next: SavedGame;
    try {
      next = this.challenge ? await this.judgeChallengeGuess(this.challenge) : { ...this.game, ...submitGuess(this.game, this.input, this.isValidGuess) };
    } catch (error) {
      this.revealing = false;
      this.rejectGuess(error, row);
      return;
    }
    await this.revealGuess(row, next);
  }

  private isValidGuess = (word: string): boolean => this.bank.validGuesses.has(word);

  /** The friend's word lives only on the server, which scores the whole history and reveals the answer at the end. */
  private async judgeChallengeGuess(challenge: RemoteChallenge): Promise<SavedGame> {
    checkGuess(this.game, this.input, () => true);
    const verdict = await judgeRemotely(challenge.code, [...this.game.guesses.map(({ word }) => word), this.input]);
    const recorded = recordGuess(this.game, this.input, verdict.results[verdict.results.length - 1]);
    return { ...this.game, ...recorded, answer: verdict.answer ?? '' };
  }

  private rejectGuess(error: unknown, row: number): void {
    if (error instanceof GuessRejectedError) {
      this.showToast(describeRejection(this.messages, error.reason));
      this.board.shake(row);
    } else {
      this.showToast(this.describeChallengeFailure(error));
    }
  }

  private async revealGuess(row: number, next: SavedGame): Promise<void> {
    this.revealing = true;
    this.game = next;
    this.input = '';
    saveGame(this.settings.language, this.playMode, next);
    const { word, states } = next.guesses[row];
    await this.board.reveal(row, word, states);
    this.revealing = false;
    this.renderAll();
    this.announceGuess(row);
    if (next.status !== 'playing') this.finishGame(row);
  }

  private finishGame(row: number): void {
    this.game = recordFinishedGame(this.settings.language, this.playMode, this.game);
    if (this.game.status === 'won') this.board.celebrate(row);
    else this.showToast(this.messages.wordWas(this.game.answer.toUpperCase()), RESULT_DELAY_MS);
    setTimeout(() => this.openResult(), RESULT_DELAY_MS);
  }

  // Rendering

  private renderAll(): void {
    const clues = deriveClues(this.game.guesses);
    this.candidates = filterCandidates(this.candidateUniverse(), this.game.guesses);
    this.board.render(this.game, this.input);
    this.keyboard.colour(clues.keyStates);
    this.scratchpad.update({
      clues,
      pool: letterPool(LANGUAGES[this.settings.language].alphabet, clues),
      candidates: this.candidates,
      offDictionary: this.challenge?.anyLetters ?? false,
    });
    this.scratchpad.setSuggestEnabled(this.game.status === 'playing');
    byId('game-caption').textContent = this.messages.caption(this.playMode, this.game.day, this.game.hardMode);
    this.renderClue();
    this.renderHeaderState();
  }

  /** A friend may pick any valid word, not just an everyday answer, so challenges count against the full guess list. */
  private candidateUniverse(): readonly string[] {
    return this.playMode === 'challenge' ? this.bank.guesses : this.bank.answers;
  }

  private renderClue(): void {
    const clue = byId('challenge-clue');
    clue.hidden = !this.game.clue || this.playMode !== 'challenge';
    clue.textContent = this.game.clue ? this.messages.clue(this.game.clue) : '';
  }

  private announceGuess(row: number): void {
    const { word, states } = this.game.guesses[row];
    const fits = this.settings.showScratchpad && this.game.status === 'playing' ? ` ${byId('fit-count').textContent}.` : '';
    byId('announcer').textContent = this.messages.announce(row + 1, MAX_GUESSES, describeTiles(this.messages, word, states)) + fits;
  }

  /** A page toast would sit behind an open modal dialog, so messages go to the dialog's own status line instead. */
  private showToast(message: string, duration = TOAST_MS): void {
    const dialogStatus = document.querySelector('dialog[open] [data-dialog-status]');
    if (dialogStatus) {
      dialogStatus.textContent = message;
      return;
    }
    const toast = byId('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast.classList.remove('visible'), duration);
  }

  // Scratchpad

  private async suggest(): Promise<void> {
    const { guesses, hardMode } = this.game;
    if (this.candidates.length === 0) {
      this.scratchpad.showUnavailable(this.messages.noSuggestion);
      return;
    }
    const pool = guesses.length === 0 ? [this.bank.opener] : legalGuessPool(this.bank.guesses, guesses, hardMode);
    this.scratchpad.showThinking();
    try {
      const suggestion = await this.solver.suggest(this.candidates, pool, guesses);
      this.scratchpad.showSuggestion(suggestion, hardMode && guesses.length > 0);
    } catch {
      this.scratchpad.showUnavailable(this.messages.noSuggestion);
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
    languageSelect.addEventListener('change', () => void this.changeLanguage(languageSelect.value as LanguageCode));
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      button.addEventListener('click', () => void this.selectMode(button.dataset.mode as Mode));
    }
    byId('open-stats').addEventListener('click', () => this.openStats());
    byId('open-settings').addEventListener('click', () => byId<HTMLDialogElement>('settings-dialog').showModal());
    byId('open-challenge').addEventListener('click', () => this.openChallengeMaker());
  }

  private openChallengeMaker(): void {
    byId('challenge-status').textContent = '';
    byId<HTMLDialogElement>('challenge-dialog').showModal();
  }

  private async selectMode(mode: Mode): Promise<void> {
    if (mode === this.playMode) return;
    this.leaveChallenge(mode);
    await this.changeSettings({ mode });
    await this.loadGame();
  }

  private async changeLanguage(language: LanguageCode): Promise<void> {
    this.leaveChallenge(this.settings.mode);
    await this.changeSettings({ language });
    await this.loadGame();
  }

  private leaveChallenge(nextMode: Mode): void {
    if (this.playMode === 'challenge') clearChallengeFromUrl();
    this.challenge = undefined;
    this.playMode = nextMode;
  }


  private renderHeaderState(): void {
    byId<HTMLSelectElement>('language').value = this.settings.language;
    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
      button.setAttribute('aria-checked', String(button.dataset.mode === this.playMode));
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
    hard.addEventListener('change', () => this.changeHardMode(hard.checked));
    scratchpad.addEventListener('change', () => void this.changeSettings({ showScratchpad: scratchpad.checked }));
    contrast.addEventListener('change', () => void this.changeSettings({ highContrast: contrast.checked }));
    theme.addEventListener('change', () => void this.changeSettings({ theme: theme.value as Settings['theme'] }));
    byId('palette-picker').addEventListener('change', (event) => {
      void this.changeSettings({ palette: (event.target as HTMLInputElement).value as Palette });
    });
  }

  private async changeSettings(changes: Partial<Settings>): Promise<void> {
    this.settings = { ...this.settings, ...changes };
    saveSettings(this.settings);
    this.applyAppearance();
  }

  private changeHardMode(enabled: boolean): void {
    void this.changeSettings({ hardMode: enabled });
    if (this.game.status === 'playing' && this.game.guesses.length === 0) {
      this.game = { ...this.game, hardMode: enabled };
      saveGame(this.settings.language, this.playMode, this.game);
      this.renderAll();
    } else {
      this.showToast(this.messages.hardModeNextGame);
    }
  }

  private applyAppearance(): void {
    const root = document.documentElement;
    if (this.settings.theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = this.settings.theme;
    root.dataset.contrast = this.settings.highContrast ? 'high' : 'standard';
    root.dataset.palette = this.settings.palette;
    const paletteOption = document.querySelector<HTMLInputElement>(`input[name="palette"][value="${this.settings.palette}"]`);
    if (paletteOption) paletteOption.checked = true;
    root.lang = this.settings.language;
    byId('scratchpad').hidden = !this.settings.showScratchpad;
    byId<HTMLSelectElement>('setting-theme').value = this.settings.theme;
  }

  private rollOverDailyIfStale(): void {
    const stale = this.playMode === 'daily' && this.game && this.game.day !== dayNumber(new Date());
    if (document.visibilityState === 'visible' && stale) void this.loadGame();
  }

  // Challenges

  private bindChallengeForm(): void {
    const form = byId<HTMLFormElement>('challenge-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const draft = {
        word: byId<HTMLInputElement>('challenge-word').value,
        clue: byId<HTMLInputElement>('challenge-clue-input').value,
        from: byId<HTMLInputElement>('challenge-from').value,
      };
      void this.shareChallenge(draft, byId('challenge-status'), byId<HTMLInputElement>('challenge-link'));
    });
  }

  private async shareChallenge(draft: Omit<ChallengeDraft, 'language'>, status: HTMLElement, linkField?: HTMLInputElement): Promise<void> {
    let link: string;
    try {
      link = challengeUrl(await createChallengeCode(createChallenge({ ...draft, language: this.settings.language })));
    } catch (error) {
      status.textContent = error instanceof ChallengeError ? this.messages.challengeBadWord : this.describeChallengeFailure(error);
      return;
    }
    status.textContent = (await copyText(link)) ? this.messages.challengeCopied : this.messages.copyBlocked;
    if (linkField) {
      linkField.hidden = false;
      linkField.value = link;
    }
  }

  // Stats and result

  private openStats(): void {
    renderStats(byId('stats-body'), this.statsSections(), this.messages);
    byId<HTMLDialogElement>('stats-dialog').showModal();
  }

  private statsSections(highlightGuessCount?: number): StatsSection[] {
    const { language } = this.settings;
    const name = LANGUAGES[language].name;
    const section = (mode: Mode): StatsSection => ({
      title: this.messages.statsTitle(mode, name),
      stats: loadStats(language, mode),
      today: mode === 'daily' ? dayNumber(new Date()) : undefined,
      highlightGuessCount: this.playMode === mode ? highlightGuessCount : undefined,
    });
    return [section('daily'), section('practice')];
  }

  private bindResultDialog(): void {
    byId('share').addEventListener('click', () => void this.share());
    byId('next-game').addEventListener('click', () => this.playAnother());
    byId('challenge-this-word').addEventListener('click', () => void this.shareChallenge({ word: this.game.answer }, byId('result-status')));
  }

  private openResult(): void {
    const messages = this.messages;
    const won = this.game.status === 'won';
    const guessCount = this.game.guesses.length;
    const answer = this.game.answer.toUpperCase();
    byId('result-title').textContent = won ? (guessCount === 1 ? messages.solvedInOne : messages.solvedIn(guessCount)) : messages.outOfGuesses;
    byId('result-answer').textContent = won ? answer : messages.wordWas(answer);
    byId('next-game').textContent = this.playMode === 'daily' ? messages.practiceWhileWaiting : messages.playAnother;
    byId('next-daily').textContent = this.playMode === 'daily' ? messages.nextDaily(formatCountdown(msUntilNextDay(new Date()))) : '';
    byId('result-status').textContent = '';
    const sections = this.statsSections(won ? guessCount : undefined).filter((_, index) => (index === 0 ? this.playMode === 'daily' : this.playMode === 'practice'));
    renderStats(byId('result-stats'), sections, messages);
    const dialog = byId<HTMLDialogElement>('result-dialog');
    if (!dialog.open) dialog.showModal();
    void this.renderGameReview();
  }

  private async renderGameReview(): Promise<void> {
    const container = byId('review');
    const scoreLine = byId('strategy-score');
    container.textContent = this.messages.reviewing;
    scoreLine.textContent = '';
    const { guesses, hardMode, answer } = this.game;
    // After the game the answer is no secret, so an off-dictionary challenge word can join the review.
    const universe = this.candidateUniverse();
    const answers = universe.includes(answer) ? universe : [...universe, answer];
    const entries = await this.solver.review({ answers, guessPool: this.bank.guesses, history: guesses, hardMode, opener: this.bank.opener });
    const score = strategyScore(entries);
    this.game = recordGameStrategy(this.settings.language, this.playMode, this.game, score);
    renderReview(container, entries, this.messages);
    scoreLine.textContent = this.messages.strategyScore(score);
    scoreLine.title = this.messages.strategyHelp;
  }

  private async share(): Promise<void> {
    const text = buildShareText({
      gameName: GAME_NAME,
      modeLabel: this.messages.modeLabel(this.playMode, this.game.day),
      languageCode: this.settings.language,
      guesses: this.game.guesses,
      won: this.game.status === 'won',
      hardMode: this.game.hardMode,
      highContrast: this.settings.highContrast,
    });
    this.showToast((await copyText(text)) ? this.messages.copied : this.messages.copyBlocked);
  }

  private playAnother(): void {
    byId<HTMLDialogElement>('result-dialog').close();
    const { language, hardMode } = this.settings;
    const resumable = this.playMode !== 'practice' ? openGame(language, 'practice', this.bank, hardMode, new Date()) : undefined;
    this.leaveChallenge('practice');
    void this.changeSettings({ mode: 'practice' });
    this.game = resumable?.status === 'playing' ? resumable : startPracticeGame(language, this.bank, hardMode);
    this.input = '';
    this.renderAll();
  }
}

/**
 * Enter on a focused button or summary belongs to that control. A just-closed dialog can briefly keep
 * focus on its hidden button, though, and that Enter should still submit the guess.
 */
function pressesVisibleControl(target: HTMLElement): boolean {
  const control = target.closest<HTMLElement>('button, summary');
  return control !== null && control.checkVisibility();
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
