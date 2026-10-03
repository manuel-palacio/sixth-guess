# Sixth Guess

A five-letter word-guessing game with unlimited practice, a scratchpad that does the pen-and-paper work,
and hints that teach strategy. Plays in English, Spanish and French. Static site, no backend.

Live: https://sixth-guess-775623848462.europe-north1.run.app

- **Daily, practice and challenges.** A challenge is a link to any five letters you pick (a name, a place,
  an old joke) with an optional clue and your name. The word is encrypted by the server and never sent
  to your friend's browser until the game ends; the server scores each guess. Words outside the
  dictionary accept any five-letter guess. Challenges never count towards stats.
- **Scratchpad.** Known pattern, ruled-out letters, the words that still fit, and a suggested guess that
  explains itself.
- **Strategy score.** After each game, every guess is compared with the best available one; the average
  is shown in the result and tracked per mode in stats.
- **English, Spanish and French**, interface included.
- **Three themes** (Notebook, Sage, Lavender), each with light and dark variants, plus a colour-blind mode.
- **Installable and offline**, via a service worker that precaches the whole game.

## Run

```sh
npm install
npm run dev          # http://localhost:5173, challenge API included (throwaway key)
```

Production runs `server/main.ts` (Node 24, no dependencies): it serves `dist/` and the challenge API
under `/api/challenges`. It needs `CHALLENGE_KEY`, a base64 32-byte key (`openssl rand -base64 32`);
changing the key breaks existing challenge links.

## Test

```sh
npm test             # Vitest: game logic in src/game/, server crypto, rules and API
npx playwright install chromium   # once
npm run test:e2e     # Playwright: builds, serves dist/ and drives the real page
```

## Build

```sh
npm run build        # type-checks, then writes the static site to dist/
```

Daily and practice play are fully static: `dist/` alone works on any host. Challenges need the server.

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

The `Dockerfile` builds the site and runs the Node server on port 8080. The key lives in Secret Manager
(`challenge-key` in `sixth-guess-game`).

```sh
gcloud run deploy sixth-guess --source . --project=sixth-guess-game --region=europe-north1 \
  --allow-unauthenticated --set-secrets=CHALLENGE_KEY=challenge-key:latest
```

## Layout

- `src/game/`: pure, DOM-free logic (scoring, clues, hard mode, candidate filtering, guess suggestion,
  review, daily/practice selection, stats, share text).
- `src/ui/`: DOM, storage, i18n and the solver Web Worker.
- `server/`: challenge encryption, rules and HTTP API, plus the production static server.
- `e2e/`: Playwright specs.
