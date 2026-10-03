import { ChallengeError, createChallenge, type ChallengeDraft } from '../game/challenge.ts';
import { LANGUAGE_CODES, LANGUAGES, type LanguageCode } from '../game/language.ts';
import { challengeUrl, createChallengeCode, fetchScoreboard } from './challengeClient.ts';
import { renderSentChallenges, type SentChallengeStatus } from './challengeViews.ts';
import { byId } from './dom.ts';
import type { Messages } from './i18n.ts';
import { playerId, playerName, rememberPlayerName } from './player.ts';
import { listSentChallenges, markResultsSeen, rememberSentChallenge } from './sentChallenges.ts';

/** Answering a friend's challenge: the new link continues the series and carries your result. */
export interface ReplyContext {
  replyTo: string;
  language: LanguageCode;
  opponentName: string;
  /** The emoji grid of the game just played, sent along with the new link. */
  resultText: string;
}

interface MakerDependencies {
  messages: () => Messages;
  describeFailure: (error: unknown) => string;
  copyText: (text: string) => Promise<boolean>;
}

/** The "Challenge a friend" dialog, the list of challenges this browser sent, and the toolbar badge for new results. */
export class ChallengeMaker {
  private readonly dependencies: MakerDependencies;
  private reply?: ReplyContext;

  constructor(dependencies: MakerDependencies) {
    this.dependencies = dependencies;
    const languageSelect = byId<HTMLSelectElement>('challenge-language');
    languageSelect.replaceChildren(...LANGUAGE_CODES.map((code) => new Option(LANGUAGES[code].name, code)));
    byId<HTMLFormElement>('challenge-form').addEventListener('submit', (event) => {
      event.preventDefault();
      void this.submitForm();
    });
  }

  open(language: LanguageCode, reply?: ReplyContext): void {
    const messages = this.dependencies.messages();
    this.reply = reply;
    byId('challenge-title').textContent = reply ? replyTitle(messages, reply) : messages.challengeTitle;
    byId('challenge-status').textContent = '';
    byId<HTMLInputElement>('challenge-link').hidden = true;
    byId<HTMLSelectElement>('challenge-language').value = reply?.language ?? language;
    byId<HTMLInputElement>('challenge-from').value = playerName();
    byId<HTMLDialogElement>('challenge-dialog').showModal();
    void this.showSentChallenges();
  }

  /** Creates a link for a word straight from the result dialog. */
  async shareWord(draft: ChallengeDraft, status: HTMLElement): Promise<void> {
    const link = await this.createLink(draft, '', status);
    if (link) status.textContent = (await this.dependencies.copyText(link)) ? this.dependencies.messages().challengeCopied : this.dependencies.messages().copyBlocked;
  }

  /** Shows on the toolbar how many results arrived since the sender last looked. */
  async refreshBadge(): Promise<void> {
    const statuses = await this.loadStatuses();
    const fresh = statuses.reduce((sum, { sent, scoreboard }) => sum + Math.max(0, (scoreboard?.length ?? 0) - sent.seen), 0);
    const badge = byId('challenge-badge');
    badge.hidden = fresh === 0;
    badge.textContent = String(fresh);
    const messages = this.dependencies.messages();
    byId('open-challenge').setAttribute('aria-label', fresh ? `${messages.challengeTitle} (${messages.newResults(fresh)})` : messages.challengeTitle);
  }

  private async submitForm(): Promise<void> {
    const name = byId<HTMLInputElement>('challenge-from').value;
    rememberPlayerName(name);
    const draft: ChallengeDraft = {
      language: byId<HTMLSelectElement>('challenge-language').value as LanguageCode,
      word: byId<HTMLInputElement>('challenge-word').value,
      clue: byId<HTMLInputElement>('challenge-clue-input').value,
      from: name,
    };
    const status = byId('challenge-status');
    const link = await this.createLink(draft, byId<HTMLTextAreaElement>('challenge-story').value, status);
    if (!link) return;
    const messages = this.dependencies.messages();
    const message = this.reply ? `${this.reply.resultText}\n\n${messages.yourTurn}: ${link}` : link;
    status.textContent = (await this.dependencies.copyText(message)) ? messages.challengeCopied : messages.copyBlocked;
    const linkField = byId<HTMLInputElement>('challenge-link');
    linkField.hidden = false;
    linkField.value = link;
    void this.showSentChallenges();
  }

  private async createLink(draft: ChallengeDraft, story: string, status: HTMLElement): Promise<string | undefined> {
    try {
      const challenge = createChallenge(draft);
      const id = await createChallengeCode({ challenge, story, playerId: playerId(), replyTo: this.reply?.replyTo });
      rememberSentChallenge({ id, word: challenge.word, language: challenge.language, createdAt: Date.now() });
      return challengeUrl(id);
    } catch (error) {
      status.textContent = error instanceof ChallengeError ? this.dependencies.messages().challengeBadWord : this.dependencies.describeFailure(error);
      return undefined;
    }
  }

  /** Lists sent challenges with everyone's results, then counts them as seen. */
  private async showSentChallenges(): Promise<void> {
    const list = byId('sent-list');
    const context = { messages: this.dependencies.messages(), playerId: playerId() };
    renderSentChallenges(list, listSentChallenges().map((sent) => ({ sent })), context);
    const statuses = await this.loadStatuses();
    renderSentChallenges(list, statuses, context);
    for (const { sent, scoreboard } of statuses) if (scoreboard) markResultsSeen(sent.id, scoreboard.length);
    byId('challenge-badge').hidden = true;
  }

  private loadStatuses(): Promise<SentChallengeStatus[]> {
    return Promise.all(
      listSentChallenges().map(async (sent) => ({ sent, scoreboard: await fetchScoreboard(sent.id).catch(() => undefined) })),
    );
  }
}

function replyTitle(messages: Messages, reply: ReplyContext): string {
  return reply.opponentName ? messages.challengeBack(reply.opponentName) : messages.challengeBackFriend;
}
