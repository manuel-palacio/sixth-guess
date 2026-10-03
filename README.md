# Palabrita

A five-letter word-guessing game that teaches strategy instead of just testing vocabulary: unlimited
practice, a scratchpad that does the pen-and-paper work, a post-game review, and challenges you can send
to friends. Plays in English, Spanish and French.

Live: https://sixth-guess-775623848462.europe-north1.run.app

## Features

### The game

- Six guesses to find a five-letter word. Tiles show the right letter in the right place, the right
  letter in the wrong place, or a letter not in the word. Repeated letters are scored like the original:
  greens first, then yellows left to right, limited by how many copies the word has.
- Every guess is checked against the language's word list; a rejected word does not use up a try.
- On-screen keyboard coloured by what you know about each letter, plus physical keyboard input.
- **Hard mode**: every revealed hint must be used in later guesses, with a precise reason when a guess
  breaks a rule ("4th letter must be T", "Guess must contain 2 Es").

### Modes

- **Daily**: the same word for everyone, changing at local midnight, playable once a day, with a
  countdown to the next one.
- **Practice**: unlimited games that never repeat a word until the list runs out. "New word" skips a
  fresh board; once guesses are made, a second tap gives up, reveals the word and counts a loss.
  After a game, "Next word" is always on the page, even with the result closed.
- **Challenges**: puzzles friends send each other (below). They never affect your stats.

### Challenges between friends

- Pick **any five letters**: a word, a name, a place, an old joke. Choose the language your friend plays
  in, and optionally add a **clue**, a **story** revealed after the game, and your name.
- You get a **short link**. Opening it shows a welcome that explains what is going on, in the
  challenge's language. The friend's own language comes back when they leave the challenge.
- **The word never reaches the player's browser** before the game ends: the server scores every guess.
  For words outside the dictionary, any five letters are accepted, so rejections cannot leak the answer.
- **No starting over**: the server keeps each player's guesses, accepts one new guess at a time, stops
  at six and restores the board on every visit. One connection can start at most four players on the
  same challenge.
- **Scoreboard**: everyone who plays a link is ranked by solved, then fewer guesses, then strategy score,
  with a mini colour grid each.
- **Live results**: "Your challenges" lists what you sent with everyone's scores, and a badge on the
  toolbar counts results you have not seen yet.
- **Challenge back**: answering from the result screen starts a series with a running score
  (a solve in n guesses earns 7 − n points: 6 for one guess, down to 1 for six, 0 for a miss).
- Any finished word can be sent on with "Challenge a friend with this word".

### Learning tools

- **Scratchpad** (beside the board on desktop, collapsible on phones, can be turned off):
  - the known pattern, and the yellow letters ruled out under each position;
  - the letters still possible;
  - how many words still fit, and the list itself on request;
  - **Suggest a guess**: the guess that splits the remaining words into the most groups, explained in one
    line ("Tests F, L, N, T at once"). It suggests words that cannot be the answer when they split better,
    which is the way out of traps like _IGHT, and keeps to legal guesses in hard mode.
- **Post-game review**: for each guess, how many words remained before and after, and the best guess
  available at that point.
- **Strategy score**: how well your guesses narrowed things down compared with the best possible, shown
  after each game and averaged in your stats.

### After the game

- The answer is revealed on a loss.
- **Share**: copies an emoji grid with the game name, mode, language and score, with no letters.
- **Stats** per mode and language: games played, win rate, current and best streak, guess distribution
  and average strategy score.

### Languages

- English, Spanish and French word lists, and the whole interface in each.
- Spanish keyboard with Ñ, French AZERTY layout. Accents are folded (É is typed as E); Spanish keeps Ñ
  as its own letter.

### Look and accessibility

- Three themes (Notebook, Sage, Lavender), each with light and dark variants, following the system
  setting or chosen by hand.
- Colour-blind mode: a blue and orange pair, with ✓ and ↔ marks so colour is never the only signal.
- Fits a 360px phone screen without scrolling, and works on desktop.
- Tile flip and shake animations that respect reduced-motion settings.
- Keyboard accessible, with each guess result announced to screen readers.

### Reliability

- A game in progress survives a reload; the game still works if browser storage is unavailable.
- Installable as an app, and daily and practice play work offline.
- Settings show when the live version was built, and from which commit.

## Run

```sh
npm install
npm run dev          # http://localhost:5173, challenge API included (throwaway key)
```

Production runs `server/main.ts` (Node 24): it serves `dist/` and the challenge API under
`/api/challenges`, storing challenges, results and series in Firestore (`challenges/{id}`,
`challenges/{id}/results/{playerId}`, `challenges/{id}/attempts/{playerId}`, `series/{id}`). Locally, and with `STORE=memory`, an in-memory
store is used instead. `CHALLENGE_KEY` (a base64 32-byte key, `openssl rand -base64 32`) is still
required: it opens links created before challenges were stored.

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

Pushing to `main` deploys automatically: `.github/workflows/deploy.yml` type-checks, runs the unit and
Playwright tests, and only then deploys, routes all traffic to the new revision and smoke-tests the live
site. Pull requests run the tests only. GitHub signs in to Google Cloud through Workload Identity
Federation (no stored keys): the `github-deployer` service account in `sixth-guess-game` accepts tokens
from this repository's `main` branch only.

The `Dockerfile` builds the site and runs the Node server on port 8080. The key lives in Secret Manager
(`challenge-key` in `sixth-guess-game`); the Firestore database is the project's `(default)` database in
`europe-north1`, used through the service's own account (`roles/datastore.user`).

Deploying by hand still works:

```sh
gcloud run deploy sixth-guess --source . --project=sixth-guess-game --region=europe-north1 \
  --allow-unauthenticated --memory=512Mi --set-secrets=CHALLENGE_KEY=challenge-key:latest
```

## Layout

- `src/game/`: pure, DOM-free logic (scoring, clues, hard mode, candidate filtering, guess suggestion,
  review, daily/practice selection, stats, share text).
- `src/ui/`: DOM, storage, i18n and the solver Web Worker.
- `server/`: challenge service (series, results, scoreboards, guess tracking), storage (Firestore and
  in-memory), rules, HTTP API and the production static server.
- `e2e/`: Playwright specs.
