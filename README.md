# Prodigy 4.0 — Minigame Practice

Offline browser mock of the Prodigy RP (FiveM) minigames, so you can drill the timing and
patterns without burning attempts in-server.

```bash
npm install
npm run dev      # http://localhost:5180
```

Stats (attempts, success rate, streak, best streak, average clear time) are tracked per game in
`localStorage`.

## What's in here

| Game | Used for | Mechanic |
| --- | --- | --- |
| `Lockpick` | Vehicle entry | Numbered circles on a beat, then a counter-clockwise mouse spin |
| `Thermite` | Robberies / vaults | Grid flashes a pattern, reproduce it before the timer expires |
| `Repair Kit` | Gear + vehicle repair | Sweeping marker, commit inside the narrowing sweet-spot zone |

Each has easy / normal / hard presets in the `CFG` object at the top of its component.

## Accuracy

Source of truth is Prodigy Studios' own documentation —
[`docs.prodigyrp.net/crime/prp-minigames/minigames`](https://docs.prodigyrp.net/crime/prp-minigames/minigames.html)
— which publishes a config block *and* an example screenshot for all 20 minigames in the
`prp-minigames` NUI library. Note the page is server-rendered but defeats some extraction tools;
plain `curl` gets the content.

### Lockpick

Vehicle entry is **not** the library's `lockpick` entry (that one is a horizontal bar of holes with
an `E` press — a different, unused-here game). It's `rythmClick`, whose example screenshot is
titled **"UNLOCK LOCK"**: numbered circles with shrinking approach rings and osu-style follow
lines. Documented config, used as the `normal` preset:

```lua
-- gameName: rythmClick
{ targetCount = 10, interval = 300 }
```

After the circles comes a rotational phase where you swirl the mouse counter-clockwise until the
lock pops. The closest documented entry is `holeMatch`
(`{ time = 45000, radialSpeed = math.pi/1800, objCount = 5, maxErrors = 2 }`), whose screenshot is
a ring of 5 holes labelled `CLICK E TO OPEN LOCK` — that ring is what the spin dial here is drawn
from.

Still inferred, because the docs don't publish them:

- **Approach-ring duration and the hit window.** `interval` sets how often targets *spawn*, not how
  long the ring takes to close. `approach: 950` / `window: 150` are guesses — these two are the
  biggest levers on difficulty, tune them first.
- **The spin phase's real input model.** Implemented as accumulated counter-clockwise mouse
  rotation over `turns` full circles. `holeMatch`'s published config implies an `E`-timing game on
  a rotating ring instead, so either the server chains a different resource here or the input
  differs from the library default.
- **Whether a miss is instantly fatal.** Implemented as fatal. `holeMatch` has `maxErrors = 2`, so
  some tolerance may exist.

### Thermite and Repair Kit

Still approximations. They're the right shape for the NoPixel-family games Prodigy's criminal loop
uses, but they were built before the docs turned up and don't yet map onto a documented
`prp-minigames` entry. `mineSweeper` (`{ x = 9, y = 9, mineCount = 10 }`) is the real vault-side
grid game and is not what `Thermite` currently implements.

## The other documented minigames

Not built yet, but the docs give exact configs for all of them:

`aimLab` · `arrowClicker` · `cableConnect` · `cableJigsaw` · `codeFind` · `colorCount` ·
`flappyBird` · `holeMatch` · `jigsawPuzzle` · `knobTurning` · `lettersFall` · `lockpick` ·
`mineSweeper` · `pairMatch` · `pipeDodge` · `rythmArrows` · `shopLockpick` · `signMemory` ·
`simonSays` / `simonSaysOrig` · `traceShape`

Careful with the lock-flavoured ones — three of them share lock-opening labels because the `text`
field is set per call:

- **`lockpick`** — horizontal bar of holes, `E` press. `{ holeCount = 8, speed = 10 }`
- **`shopLockpick`** — circular dashed ring. `{ holeCount = 12, speed = "Math.PI/1.5", bounce = false }`
- **`holeMatch`** — rotating ring of 5 holes, `E` press.
