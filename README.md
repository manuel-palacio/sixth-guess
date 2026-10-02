# Sixth Guess

A five-letter word-guessing game with unlimited practice, a scratchpad that does the pen-and-paper work,
and hints that teach strategy. Plays in English, Spanish and French. Static site, no backend.

Live: https://sixth-guess-775623848462.europe-north1.run.app

## Run

```sh
npm install
npm run dev          # http://localhost:5173
```

## Test

```sh
npm test             # Vitest: pure game logic in src/game/
npx playwright install chromium   # once
npm run test:e2e     # Playwright: builds, serves dist/ and drives the real page
```

## Build

```sh
npm run build        # type-checks, then writes the static site to dist/
```

`dist/` can be hosted anywhere (it uses relative asset paths).

## Regenerate the word lists

```sh
npm run words        # rewrites src/data/{en,es,fr}.json
```

`scripts/build-wordlists.ts` builds, per language, an answer list (~2,000 common words without plain plurals),
a valid-guess list, and the best opening guess (precomputed, because it is the most expensive search).
It needs network access for the Spanish and French frequency data. Commit the regenerated JSON.
Changing the answer lists changes which word each future daily puzzle uses.

Sources:

- English answers: SCOWL frequency tiers 10–35 via [`wordlist-english`](https://github.com/jacksonrayhamilton/wordlist-english) (SCOWL licence).
- English guesses: all SCOWL tiers plus the CC0 [Letterpress list](https://github.com/lorenbrichter/Words) via `an-array-of-english-words`.
- Spanish/French guesses: `an-array-of-spanish-words`, `an-array-of-french-words` (MIT).
- Spanish/French answer ranking: [hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (OpenSubtitles 2018, CC BY-SA 4.0).

## Deploy (Cloud Run)

The `Dockerfile` builds the site and serves `dist/` with nginx on port 8080.

```sh
gcloud run deploy sixth-guess --source . --project=sixth-guess-game --region=europe-north1 --allow-unauthenticated
```

## Layout

- `src/game/`: pure, DOM-free logic (scoring, clues, hard mode, candidate filtering, guess suggestion,
  review, daily/practice selection, stats, share text).
- `src/ui/`: DOM, storage and the solver Web Worker.
- `e2e/`: Playwright specs.
