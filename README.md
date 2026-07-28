# Minigame Sandbox

An offline practice app for the skill-check minigames common to FiveM roleplay
servers — lockpicks, grids, timing bars. Runs in the browser so you can drill
the timing and patterns without burning attempts in game.

Nothing here talks to any server, and no game code is copied. Every game is a
clean-room mock built from publicly published config documentation and from
screen recordings of real attempts.

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

## Tuning and presets

Every number a game runs on is a slider, in the **Tuning** panel under the
stage. Ring speed, hit window, board size, time limits — all of it.

- Drag a slider and the game restarts with the new value when you let go. It
  waits for the release on purpose, so a half-dragged board size never reaches
  a game that is already running.
- **Save preset** stores the current numbers under a name. Saving again with
  the same name overwrites it.
- Clicking a preset drops its numbers onto whichever difficulty is selected.
  Presets hold values, not a difficulty, so one can be loaded onto any of them.
- **Back to easy / normal / hard** throws your edits away and returns to the
  built-in numbers. Those are read only and can always be recovered this way.

Edits and presets live in `localStorage` under `minigame-sandbox-tuning`.
Values are clamped and snapped to their slider step on load, so a hand-edited
entry cannot put a game into a state it cannot run.

See [docs/MINIGAMES.md](docs/MINIGAMES.md) for every documented minigame and
its config, including the fourteen not built yet.

## Project layout

```
src/
  App.svelte           shell — sidebar, difficulty, stats, game switching
  Tuning.svelte        the slider panel and preset list
  app.css              design tokens, stage system, shell styling, motion
  main.js              mount point
  games/               one component per minigame, self-contained
    Lockpick.svelte
    ShopLockpick.svelte
    MineSweeper.svelte
    Thermite.svelte
    Repair.svelte
  lib/
    games.js           the registry — grouping, copy, difficulty list
    tuning.js          every game's numbers, and how to render each slider
    tuning.svelte.js   saved edits and presets, backed by localStorage
    stats.svelte.js    localStorage-backed per-game stats
docs/
  MINIGAMES.md         documented config reference
```

No game component holds its own numbers. They all take a single `cfg` prop and
the shell decides what is in it, which is what makes one tuning panel work for
every game.

## Adding a minigame

1. Create `src/games/YourGame.svelte`. Take one prop — `let { cfg } = $props()`
   — and read every number off it. Never hardcode a value you might want to
   tune later.
2. Add an entry to `src/lib/tuning.js` keyed by the game id, with a `fields`
   list (one slider each: `key`, `label`, `min`, `max`, `step`, optional
   `unit`) and a `base` object holding easy, normal and hard.
3. Add an entry to the right group in `src/lib/games.js` with an `id`, `name`,
   `tag`, `component` and an optional `config` string. The `id` has to match the
   key used in step 2. Descriptions belong in the game's own start overlay, not
   here — the registry carried one too and it put the same text on screen twice.

That is the whole wiring. The shell picks it up automatically, sliders and
presets included.

If a tuned value can ask for more than the game can give — more mines than the
board has room for, more tiles than the grid holds — clamp it in the component
with a `$derived` and use that everywhere instead of the raw `cfg` value.
`MineSweeper.svelte` and `Thermite.svelte` both do this.

## Sizing rules for game components

Sizing content against the browser window instead of against its own frame is
what caused repeated "it renders outside the box" bugs. The stage system in
`app.css` exists to make that impossible, so use it:

- Put the aspect ratio on the game's root class, as **both** `aspect-ratio` and
  a matching `--ar` decimal (`aspect-ratio: 16 / 10; --ar: 1.6;`). The shell
  sizes the stage with `min(100%, 100cqw / var(--ar))` so it fills the viewport
  without stretching, and it cannot read the ratio back out of `aspect-ratio`.
  Miss `--ar` and the game falls back to 16/9 and will be the wrong shape.
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

Motion is centralised the same way — `fade` and `rise` keyframes, plus a
`prefers-reduced-motion` block that neutralises all of it. A game that needs a
one-off animation defines it locally rather than adding to the shared set.

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
