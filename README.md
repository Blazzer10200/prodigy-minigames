# Prodigy 4.0 Minigames

An offline practice app for the minigames on the Prodigy RP FiveM server. Runs
in the browser so you can drill the timing and patterns without burning
attempts in game.

Nothing here talks to the server. It is a mock built from public documentation
and from screen recordings of real attempts.

## Running it

```bash
npm install
npm run dev      # http://localhost:5180
npm run build    # production bundle into dist/
npm run preview  # serve the built bundle
```

Requires Node 20 or newer. No other setup.

## What is in it

| Game          | Based on       | How close it is                             |
| ------------- | -------------- | ------------------------------------------- |
| Lockpick      | `rythmClick`   | Traced from footage of a real vehicle entry |
| Shop Lockpick | `shopLockpick` | Built from the documented config            |
| Minesweeper   | `mineSweeper`  | Built from the documented config            |
| Thermite      | —              | Approximation, no documented match          |
| Repair Kit    | —              | Approximation, no documented match          |

The sidebar groups games the same way, so you always know how much to trust
what you are practising on. Every game has easy / normal / hard, and normal is
the setting that matches the real config wherever one is known.

Attempts, win rate, streak and average clear time are stored per game in
`localStorage`.

See [docs/MINIGAMES.md](docs/MINIGAMES.md) for every documented minigame and
its config, including the fourteen not built yet.

## Project layout

```
src/
  App.svelte          shell — sidebar, difficulty, stats, game switching
  app.css             design tokens, stage system, shell styling, motion
  main.js             mount point
  games/              one component per minigame, self-contained
    Lockpick.svelte
    ShopLockpick.svelte
    MineSweeper.svelte
    Thermite.svelte
    Repair.svelte
  lib/
    games.js          the registry — grouping, copy, difficulty list
    stats.svelte.js   localStorage-backed per-game stats
docs/
  MINIGAMES.md        documented config reference
```

## Adding a minigame

1. Create `src/games/YourGame.svelte`.
2. Add an entry to the right group in `src/lib/games.js` with an `id`, `name`,
   `tag`, `component`, optional `config` string, and a short `blurb`.

That is the whole wiring. The shell picks it up automatically.

## Sizing rules for game components

Sizing content against the browser window instead of against its own frame is
what caused repeated "it renders outside the box" bugs. The stage system in
`app.css` exists to make that impossible, so use it:

- Put the aspect ratio on the game's root class. Nothing else goes there.
- Wrap the playable area in `<div class="field">`. It is absolutely positioned
  and already leaves room for the HUD strip.
- Anything that must stay square gets `class="square"`. It fits its box at any
  size.
- For a dial or anything circular, draw an
  `<svg class="fitsvg" viewBox="0 0 400 400">`. An svg with a viewBox scales
  itself down to fit and cannot overflow.
- Scale text inside a game with `cqmin`. `.field` is a query container, so
  `cqmin` means "relative to this frame".

Never use `vh`, `vw`, or fixed pixel sizes for playfield geometry.

## Shared classes

Defined once in `app.css` and used by every game:

`.stage` `.field` `.square` `.fitsvg` `.hud` `.timer` `.overlay` `.btn`
`.keyhint` `kbd`

Motion is centralised the same way — `fade`, `rise` and `pop` keyframes, plus a
`prefers-reduced-motion` block that neutralises all of it.

## Accuracy notes

Things worth not relearning the hard way:

- Vehicle entry is `rythmClick`, **not** the entry the docs label `lockpick`.
  Three different games show lock-opening captions because the caption is
  passed in per call.
- The pins are clicked in numbered order, several are on the dial at once, and
  the timing cue is an outer circle closing inward onto the pin.
- The finishing spin is **clockwise**.
- A screen recording beats a documentation screenshot every time. A screenshot
  is one frame of an animation — a shrinking ring caught near the end of its
  travel reads as a static double ring, which is exactly how this got built
  wrong once.
- The docs site is server rendered but defeats some extraction tools. Plain
  `curl` returns the full page including every config block.
