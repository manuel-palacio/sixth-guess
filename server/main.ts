import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createChallengeApi } from './challengeApi.ts';
import { ChallengeService } from './challengeService.ts';
import { FirestoreStore } from './firestoreStore.ts';
import { challengeKeyFromEnvironment } from './key.ts';
import { MemoryStore } from './memoryStore.ts';
import type { ChallengeStore } from './store.ts';
import { loadWordBanks } from './wordSets.ts';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

// Firestore in production; STORE=memory runs the built server locally without Google credentials.
const store: ChallengeStore = process.env.STORE === 'memory' ? new MemoryStore() : new FirestoreStore();
const api = createChallengeApi(new ChallengeService(store, loadWordBanks(), challengeKeyFromEnvironment()));

createServer((request, response) => {
  handle(request, response).catch((error: unknown) => {
    console.error(error);
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
}).listen(PORT, () => console.log(`Palabrita listening on ${PORT}`));

async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (await api(request, response)) return;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }
  await serveStatic(new URL(request.url ?? '/', 'http://localhost').pathname, response);
}

/** Serves dist/, falling back to index.html for page routes; hashed assets are cached forever. */
async function serveStatic(pathname: string, response: ServerResponse): Promise<void> {
  const file = await existingFile(pathname);
  if (!file) {
    if (extname(pathname)) response.writeHead(404).end();
    else await sendFile(`${DIST}index.html`, response);
    return;
  }
  await sendFile(file, response);
}

async function existingFile(pathname: string): Promise<string | undefined> {
  const candidate = normalize(`${DIST}${decodeURIComponent(pathname)}`);
  if (!candidate.startsWith(DIST)) return undefined;
  const info = await stat(candidate).catch(() => undefined);
  if (info?.isFile()) return candidate;
  if (info?.isDirectory()) return existingFile(`${pathname.replace(/\/$/, '')}/index.html`);
  return undefined;
}

async function sendFile(file: string, response: ServerResponse): Promise<void> {
  const immutable = file.includes(`${sep}assets${sep}`);
  response.writeHead(200, {
    'Content-Type': CONTENT_TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  createReadStream(file).pipe(response);
}
