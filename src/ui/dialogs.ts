import { MAX_GUESSES } from '../game/game.ts';
import type { ReviewEntry } from '../game/review.ts';
import { visibleStreak, winRate, type Stats } from '../game/stats.ts';
import { element } from './dom.ts';

export interface StatsSection {
  title: string;
  stats: Stats;
  today?: number;
  highlightGuessCount?: number;
}

export function renderStats(container: HTMLElement, sections: StatsSection[]): void {
  container.replaceChildren(...sections.map(statsSection));
}

export function renderReview(container: HTMLElement, entries: ReviewEntry[]): void {
  const table = element('table', 'review-table');
  const head = element('thead');
  head.innerHTML = '<tr><th scope="col">Guess</th><th scope="col">Words left</th><th scope="col">Best available</th></tr>';
  const body = element('tbody');
  for (const entry of entries) body.append(reviewRow(entry));
  table.append(head, body);
  container.replaceChildren(table);
}

function reviewRow(entry: ReviewEntry): HTMLTableRowElement {
  const row = element('tr');
  row.append(
    element('th', 'review-guess', entry.guess.toUpperCase()),
    element('td', 'review-counts', `${entry.candidatesBefore} → ${entry.candidatesAfter}`),
    bestCell(entry),
  );
  row.firstElementChild!.setAttribute('scope', 'row');
  return row;
}

function bestCell(entry: ReviewEntry): HTMLTableCellElement {
  const cell = element('td', 'review-best');
  if (entry.matchedBest) {
    cell.append(element('span', 'review-match', 'Yours was as good as any'));
    return cell;
  }
  cell.append(element('strong', '', entry.best.word.toUpperCase()), element('small', '', entry.best.reason));
  return cell;
}

function statsSection({ title, stats, today, highlightGuessCount }: StatsSection): HTMLElement {
  const section = element('section', 'stats-section');
  section.append(element('h3', '', title), statsFigures(stats, today), distribution(stats, highlightGuessCount));
  return section;
}

function statsFigures(stats: Stats, today?: number): HTMLElement {
  const figures = element('dl', 'stats-figures');
  const values: [string, number | string][] = [
    ['Played', stats.played],
    ['Win rate', `${winRate(stats)}%`],
    ['Streak', visibleStreak(stats, today)],
    ['Best streak', stats.bestStreak],
  ];
  for (const [label, value] of values) {
    const item = element('div');
    item.append(element('dd', '', String(value)), element('dt', '', label));
    figures.append(item);
  }
  return figures;
}

function distribution(stats: Stats, highlightGuessCount?: number): HTMLElement {
  const chart = element('ol', 'distribution');
  chart.setAttribute('aria-label', 'Wins by number of guesses');
  const most = Math.max(1, ...stats.distribution);
  for (let index = 0; index < MAX_GUESSES; index++) {
    const count = stats.distribution[index] ?? 0;
    const bar = element('li', highlightGuessCount === index + 1 ? 'current' : '');
    bar.style.setProperty('--share', String(count / most));
    bar.setAttribute('aria-label', `${index + 1} ${index === 0 ? 'guess' : 'guesses'}: ${count}`);
    bar.append(element('span', 'distribution-label', String(index + 1)), element('span', 'distribution-bar', String(count)));
    chart.append(bar);
  }
  return chart;
}
