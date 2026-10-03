import { loadJson, saveJson } from './storage.ts';

const PLAYER_ID_KEY = 'sixth-guess:player-id';
const PLAYER_NAME_KEY = 'sixth-guess:player-name';

/** A random id that lets the server keep one result per player per challenge; never tied to an account. */
export function playerId(): string {
  const saved = loadJson<string | null>(PLAYER_ID_KEY, null);
  if (saved) return saved;
  const created = crypto.randomUUID();
  saveJson(PLAYER_ID_KEY, created);
  return created;
}

export function playerName(): string {
  return loadJson<string>(PLAYER_NAME_KEY, '');
}

export function rememberPlayerName(name: string): void {
  saveJson(PLAYER_NAME_KEY, name.trim());
}
