import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import type { Connect, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';
import { createChallengeApi } from './server/challengeApi.ts';
import { ChallengeService } from './server/challengeService.ts';
import { localChallengeKey } from './server/key.ts';
import { MemoryStore } from './server/memoryStore.ts';
import { loadWordBanks } from './server/wordSets.ts';

/**
 * Which commit is being built. The container build on Cloud Run has no git history, so the
 * deploy workflow writes the commit to .build-commit first.
 */
function buildCommit(): string {
  if (existsSync('.build-commit')) return readFileSync('.build-commit', 'utf8').trim();
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'dev';
  }
}

/** Mounts the challenge API on the dev and preview servers, so local play and e2e tests hit real endpoints. */
function challengeApiPlugin(): Plugin {
  const middleware = (): Connect.NextHandleFunction => {
    const api = createChallengeApi(new ChallengeService(new MemoryStore(), loadWordBanks(), localChallengeKey()));
    return (request, response, next) => {
      api(request, response).then((handled) => handled || next(), next);
    };
  };
  return {
    name: 'sixth-guess-challenge-api',
    configureServer: (server) => void server.middlewares.use(middleware()),
    configurePreviewServer: (server) => void server.middlewares.use(middleware()),
  };
}

export default defineConfig({
  base: './',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_COMMIT__: JSON.stringify(buildCommit()),
  },
  worker: { format: 'es' },
  plugins: [
    challengeApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Palabrita',
        short_name: 'Palabrita',
        description: 'Guess the five-letter word in six tries, with a scratchpad that does the pen-and-paper work.',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#eef2f6',
        theme_color: '#1c2754',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Only the Latin subsets are needed for English, Spanish and French.
        globIgnores: ['**/*cyrillic*', '**/*greek*', '**/*vietnamese*'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
});
