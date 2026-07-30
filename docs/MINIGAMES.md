# Documented minigame reference

Every minigame in the `prp-minigames` NUI library, with the config Prodigy
Studios publishes for it. Source:
[docs.prodigyrp.net/crime/prp-minigames/minigames](https://docs.prodigyrp.net/crime/prp-minigames/minigames.html)

The page is server rendered but defeats some extraction tools. Plain `curl`
returns the whole thing, config blocks and example screenshots included.

Use this as the shopping list when adding a game. Copy the config into the
game's `normal` entry in `src/lib/tuning.js`, then build easy and hard around
it. Every value there becomes a slider in the app's tuning panel.

## Built

| Game           | Config                                                      | Notes                                                                                                                                                                                                                      |
| -------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rythmClick`   | `{ targetCount = 10, interval = 300 }`                      | Vehicle lockpick. `interval` is the spawn gap, not the ring speed. Live footage showed 6 pins, which is what `normal` uses; `hard` uses the documented 10. Rings overlap — see below.                                      |
| `lockpick`     | `{ holeCount = 8, speed = 10 }`                             | Straight bar of holes, `E` in order. Not the vehicle one. `speed` has no documented unit — read as a 2.5s sweep at the documented 10, chosen so the hit window matches `shopLockpick`'s ~80ms rather than guessing a unit. |
| `shopLockpick` | `{ holeCount = 12, speed = "Math.PI/1.5", bounce = false }` | Circular barrel, `E` on each hole in order.                                                                                                                                                                                |
| `mineSweeper`  | `{ x = 9, y = 9, mineCount = 10 }`                          | Ordinary minesweeper.                                                                                                                                                                                                      |

## Not built yet

| Game                          | Config                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `aimLab`                      | `{ text, x = 5, y = 5, time = 5000, maxActive = 4, generationSpeed = 300 }`                         |
| `arrowClicker`                | `{ gameCount = 1, arrowCount = 5, time = 4000, text }`                                              |
| `cableConnect`                | `{ time = 15000, text }`                                                                            |
| `cableJigsaw`                 | `{ time = 5000, x = 4, y = 3, inventorySize = 6 }`                                                  |
| `codeFind`                    | `{ time = 25000, changeInterval = 5000, signSet = 0, amount = 1, x = 8, y = 8 }`                    |
| `colorCount`                  | `{ time = 5000, answerTime = 5000, amount = 5, maxCount = 6, x = 10, y = 10 }`                      |
| `flappyBird`                  | `{ time = 7500, text = "Feed IV", speed = 0.2, acceleration = 1e-05 }`                              |
| `holeMatch`                   | `{ time = 45000, radialSpeed = math.pi/1800, objCount = 5, maxErrors = 2 }`                         |
| `jigsawPuzzle`                | `{ time = 10000, text, presetName = "hand" \| "leg", pieceCount = 5 }`                              |
| `knobTurning`                 | `{ time = 15000, text = "Anesthetic Adjustment" }`                                                  |
| `lettersFall`                 | `{ time = 30000, text, speed = 0.1, difficulty = 5 }`                                               |
| `pairMatch`                   | `{ displayTime = 5000, time = 120000, text, x = 6, y = 6, pairCount = 8, allowedErrors = -1 }`      |
| `pipeDodge`                   | `{ time = 30000 }`                                                                                  |
| `rythmArrows`                 | `{ speed = 120, arrowCount = 4, time = 4000, threshold = 7.0 }`                                     |
| `signMemory`                  | `{ time = 10000, questionTime = 5000, questionCount = 3, hardMode = false, imageSet = "standard" }` |
| `simonSays` / `simonSaysOrig` | `{ sequenceLen = 4, flashTime = 500, flashInterval = 200 }`                                         |
| `traceShape`                  | `{ time = 25000, text, background = "img/traceBackgrounds/bg1.png", difficulty = 0.5 }`             |

## The three lock games

These are easy to mix up, because the caption is passed in per call. All three
can show a "open the lock" style label.

| Entry          | What it actually is                                      |
| -------------- | -------------------------------------------------------- |
| `lockpick`     | Horizontal bar of holes, `E` press. Not the vehicle one. |
| `shopLockpick` | Circular dashed barrel, 12 holes, `E` on each.           |
| `holeMatch`    | Rotating ring of 5 holes, `E` press, tolerates 2 errors. |

Vehicle entry is none of them. It is `rythmClick`.

## What the sources are worth

Re-checked 2026-07-28. Where accuracy can and cannot come from:

- **The docs page is the only first-party source, and it only gives defaults.**
  Re-fetched in full; every config block matches what is recorded above, so
  there is nothing new to mine there. It publishes no mechanics, no timing
  curves, and no hit windows.
- **`prp-minigames` is a paid, closed-source Prodigy Studios resource** (Cfx
  Marketplace, ~750 servers). There is no source to read, and leaked copies are
  not a source this project will use. That puts a hard ceiling on accuracy:
  **documented defaults plus your own footage, nothing else.**
- **Prodigy RP 4.0 is current.** The 4.0 rebuild launched around May 2026 and
  no 5.0 exists, so "4.0 or higher" is just "now". The docs are not versioned.

### Third-party reimplementations

- [`NickRobin23/Robins-Lockpick`](https://github.com/NickRobin23/Robins-Lockpick)
  — open source, self-described "Prodigy RP styled". Independently arrived at
  the same approach-ring model: numbered targets, clicked in order, one miss
  ends the run. Its numbers are worth knowing but are **its author's guesses,
  not Prodigy's**, so none of them were copied in. For the record: ring starts
  at 2.4x the target, next target spawns at 45% of the shrink time, a 500ms
  grace after the ring closes still counts, and difficulty 1-10 maps to
  `shrink = 2400 - (d-1)*220`, `window = 220 - (d-1)*21`.
  Its every-target-gets-a-ring model turned out to be right — see the overlap
  note below. Where it still differs: it scatters targets across the screen,
  while the footage shows a single dial. Ours follows the footage.
- **`nphacks.net` is not a source.** It claims Prodigy's lockpick is NoPixel's
  rotating-ring colour-match lock. That contradicts both the docs and the
  footage, and the site cross-claims the same game for every server it lists.
  Ignore it.

### What would actually move accuracy

Only new footage. Ranked by how much is currently guessed:

1. `rythmClick`'s drag targets — everything about them. Whether they take a
   slot in the sequence or sit alongside the pins, whether the rest of the dial
   really keeps running while you pull one, what the time limit is, and what
   letting go halfway does. All of it is a guess. See below.
2. Hit windows on every game. No documented value exists for any of them.
3. Time limits. Same — `shopLockpick` and `lockpick` have none documented.
4. `thermite` and `repair` — still no documented entry that matches either.
5. `rythmClick` — the exact overlap share. Half is what it looks like and what
   the one third-party reimplementation landed on, but nobody has counted the
   frames.

**Settled, no longer guessed:** every live pin on the `rythmClick` dial closes
its own ring, and the rings **overlap**. A pin appears numbered, sits there a
moment, then starts closing roughly halfway through the pin before it — so the
clicks come out as a rolling rhythm instead of one pin at a time. Appearing and
starting to close are two separate moments, which is why the app has `gap` and
`stagger` as separate sliders. `Robins-Lockpick` independently uses 45% for the
same overlap; ours ships 0.5 on normal.

**Observed but not documented:** harder vehicles mix a second kind of target
into the same dial — a **rainbow-shaped arc** with a handle at the left end that
has to be dragged round to the right. Nothing in the published config hints at
it. `rythmClick` exposes only `targetCount` and `interval`, and none of the
seventeen unbuilt games is an arc drag either, so this rests entirely on a
description of the live game. What the app assumes, all of it guessed:

- the arc **takes a numbered slot** in the same sequence — pin 4 is a drag
  rather than a click — instead of appearing alongside the pins, and it carries
  its number in a circle nested in the mouth of the arch
- the rest of the dial **keeps running** while you pull one, so the pattern has
  to be kept going around the drag. The `dragHold` slider flips this to a
  freeze-and-resume if that turns out to be wrong
- it is **timed** (`dragTime`), and the timer is the only way to fail it
- **letting go leaves the handle where it got to** rather than snapping the
  pick or sliding back
- the handle only advances while the pointer is **near the curve**
  (`dragTol`), which is what makes the shape matter rather than being decoration

Live on `hard` only, two per run.

## Getting the screenshots

The docs publish an example image per game:

```bash
curl -s https://docs.prodigyrp.net/crime/prp-minigames/minigames.html \
  | grep -o 'assets/[a-zA-Z]*Example\.[a-z0-9]*\.png'
```

Prefix a hit with `https://docs.prodigyrp.net/` to download it.

Worth remembering: a screenshot is one frame of an animation. A shrinking
approach ring caught near the end of its travel looks like a static double
ring. If a mechanic matters, get a screen recording instead.
