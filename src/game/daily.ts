const EPOCH_UTC = Date.UTC(2026, 0, 1);
const MS_PER_DAY = 86_400_000;
const SHUFFLE_SEED = 0x5157;

/** Days since 2026-01-01 in the player's local calendar, so the word changes at local midnight. */
export function dayNumber(date: Date): number {
  return Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH_UTC) / MS_PER_DAY);
}

/** Same word for everyone on a given day: a fixed shuffle of the answer list walked one step per day. */
export function dailyAnswer(answers: readonly string[], day: number): string {
  const order = seededShuffle(answers.length, SHUFFLE_SEED);
  return answers[order[((day % answers.length) + answers.length) % answers.length]];
}

export function msUntilNextDay(now: Date): number {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return midnight.getTime() - now.getTime();
}

function seededShuffle(length: number, seed: number): number[] {
  const random = mulberry32(seed);
  const order = Array.from({ length }, (_, index) => index);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
