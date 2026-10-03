import type { TileState } from '../game/feedback.ts';
import { MAX_GUESSES } from '../game/game.ts';
import type { PlayerResult, SeriesScore } from '../game/series.ts';
import { element } from './dom.ts';
import type { Messages } from './i18n.ts';
import type { SentChallenge } from './sentChallenges.ts';

export interface ViewContext {
  messages: Messages;
  /** This browser's player, shown as "You". */
  playerId: string;
}

/** Results for one sent challenge; undefined while unknown (offline or not loaded). */
export interface SentChallengeStatus {
  sent: SentChallenge;
  scoreboard?: PlayerResult[];
}

export function renderScoreboard(list: HTMLElement, scoreboard: PlayerResult[], context: ViewContext): void {
  list.replaceChildren(...scoreboard.map((result) => scoreboardRow(result, context)));
}

export function describeSeries(series: SeriesScore, { messages, playerId }: ViewContext): string {
  const scores = series.players.map((player) => `${displayName(player.playerId, player.name, messages, playerId)} ${messages.points(player.points)}`);
  return `${messages.seriesRound(series.round)} · ${scores.join(' – ')}`;
}

export function renderSentChallenges(list: HTMLElement, statuses: SentChallengeStatus[], context: ViewContext): void {
  if (statuses.length === 0) {
    list.replaceChildren(element('li', 'sent-empty', context.messages.sentEmpty));
    return;
  }
  list.replaceChildren(...statuses.map((status) => sentRow(status, context)));
}

function scoreboardRow(result: PlayerResult, context: ViewContext): HTMLLIElement {
  const row = element('li', result.playerId === context.playerId ? 'scoreboard-row is-you' : 'scoreboard-row');
  row.append(
    element('span', 'scoreboard-name', displayName(result.playerId, result.name, context.messages, context.playerId)),
    miniGrid(result.grid),
    element('span', 'scoreboard-score', formatScore(result)),
    element('span', 'scoreboard-strategy', `${result.strategy}%`),
  );
  row.lastElementChild!.setAttribute('title', context.messages.strategyHelp);
  return row;
}

function sentRow({ sent, scoreboard }: SentChallengeStatus, context: ViewContext): HTMLLIElement {
  const row = element('li', 'sent-row');
  const heading = element('div', 'sent-heading');
  heading.append(element('strong', 'sent-word', sent.word.toUpperCase()), element('span', 'sent-language', sent.language.toUpperCase()));
  const fresh = scoreboard ? scoreboard.length - sent.seen : 0;
  if (fresh > 0) heading.append(element('span', 'sent-new', context.messages.newResults(fresh)));
  row.append(heading, element('p', 'sent-results', describePlayers(scoreboard, context)));
  return row;
}

function describePlayers(scoreboard: PlayerResult[] | undefined, { messages, playerId }: ViewContext): string {
  if (!scoreboard) return '…';
  if (scoreboard.length === 0) return messages.nobodyYet;
  return scoreboard.map((result) => `${displayName(result.playerId, result.name, messages, playerId)} ${formatScore(result)}`).join(' · ');
}

function miniGrid(grid: TileState[][]): HTMLElement {
  const container = element('span', 'mini-grid');
  container.setAttribute('aria-hidden', 'true');
  for (const row of grid) {
    const line = element('span', 'mini-grid-row');
    for (const state of row) {
      const cell = element('i');
      cell.dataset.state = state;
      line.append(cell);
    }
    container.append(line);
  }
  return container;
}

function formatScore(result: PlayerResult): string {
  return `${result.won ? result.guessCount : 'X'}/${MAX_GUESSES}`;
}

function displayName(id: string, name: string, messages: Messages, playerId: string): string {
  if (id === playerId) return messages.you;
  return name || messages.someone;
}
