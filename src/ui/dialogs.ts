import { MAX_GUESSES } from '../game/game.ts';
import type { ReviewEntry } from '../game/review.ts';
import { averageStrategy, visibleStreak, winRate, type Stats } from '../game/stats.ts';
import { element } from './dom.ts';
import { explainSuggestion, type Messages } from './i18n.ts';

export interface StatsSection {
  title: string;
  stats: Stats;
  today?: number;
  highlightGuessCount?: number;
}

export function renderStats(container: HTMLElement, sections: StatsSection[], messages: Messages): void {
  container.replaceChildren(...sections.map((section) => statsSection(section, messages)));
}

export function renderReview(container: HTMLElement, entries: ReviewEntry[], messages: Messages): void {
  const table = element('table', 'review-table');
  const headings = element('tr');
  for (const text of [messages.reviewGuess, messages.reviewWordsLeft, messages.reviewBest]) {
    const heading = element('th', '', text);
    heading.scope = 'col';
    headings.append(heading);
  }
  const head = element('thead');
  head.append(headings);
  const body = element('tbody');
  for (const entry of entries) body.append(reviewRow(entry, messages));
  table.append(head, body);
  container.replaceChildren(table);
}

function reviewRow(entry: ReviewEntry, messages: Messages): HTMLTableRowElement {
  const guess = element('th', 'review-guess', entry.guess.toUpperCase());
  guess.scope = 'row';
  const row = element('tr');
  row.append(guess, element('td', 'review-counts', `${entry.candidatesBefore} → ${entry.candidatesAfter}`), bestCell(entry, messages));
  return row;
}

function bestCell(entry: ReviewEntry, messages: Messages): HTMLTableCellElement {
  const cell = element('td', 'review-best');
  if (entry.matchedBest) {
    cell.append(element('span', 'review-match', messages.reviewMatched));
    return cell;
  }
  cell.append(element('strong', '', entry.best.word.toUpperCase()), element('small', '', explainSuggestion(messages, entry.best)));
  return cell;
}

function statsSection({ title, stats, today, highlightGuessCount }: StatsSection, messages: Messages): HTMLElement {
  const section = element('section', 'stats-section');
  section.append(element('h3', '', title), statsFigures(stats, messages, today), distribution(stats, messages, highlightGuessCount));
  return section;
}

function statsFigures(stats: Stats, messages: Messages, today?: number): HTMLElement {
  const figures = element('dl', 'stats-figures');
  const strategy = averageStrategy(stats);
  const values: [string, number | string][] = [
    [messages.played, stats.played],
    [messages.winRate, `${winRate(stats)}%`],
    [messages.streak, visibleStreak(stats, today)],
    [messages.bestStreak, stats.bestStreak],
    [messages.strategy, strategy === undefined ? '–' : `${strategy}%`],
  ];
  for (const [label, value] of values) {
    const item = element('div');
    item.append(element('dd', '', String(value)), element('dt', '', label));
    figures.append(item);
  }
  figures.lastElementChild!.setAttribute('title', messages.strategyHelp);
  return figures;
}

function distribution(stats: Stats, messages: Messages, highlightGuessCount?: number): HTMLElement {
  const chart = element('ol', 'distribution');
  chart.setAttribute('aria-label', messages.winsByGuesses);
  const most = Math.max(1, ...stats.distribution);
  for (let index = 0; index < MAX_GUESSES; index++) {
    const count = stats.distribution[index] ?? 0;
    const bar = element('li', highlightGuessCount === index + 1 ? 'current' : '');
    bar.style.setProperty('--share', String(count / most));
    bar.setAttribute('aria-label', messages.guessCount(index + 1, count));
    bar.append(element('span', 'distribution-label', String(index + 1)), element('span', 'distribution-bar', String(count)));
    chart.append(bar);
  }
  return chart;
}
