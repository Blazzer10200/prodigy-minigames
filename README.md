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
| `Lockpick` | Vehicle entry | Marker sweeps a bar of holes — tap `E` as it crosses each one |
| `Thermite` | Robberies / vaults | Grid flashes a pattern, reproduce it before the timer expires |
| `Repair Kit` | Gear + vehicle repair | Sweeping marker, commit inside the narrowing sweet-spot zone |

Each has easy / normal / hard presets in the `CFG` object at the top of its component.

## Accuracy

Source of truth is Prodigy Studios' own documentation —
[`docs.prodigyrp.net/crime/prp-minigames/minigames`](https://docs.prodigyrp.net/crime/prp-minigames/minigames.html)
— which publishes a config block *and* an example screenshot for all 20 minigames in the
`prp-minigames` NUI library.

**Lockpick — matches the real game's shape and its documented config.** The server default is:

```lua
-- gameName: lockpick
{ holeCount = 8, speed = 10 }
```

which is what the `normal` preset uses. From the official screenshot, the real minigame is a
horizontal bar of dark holes with a green marker sweeping across it, labelled
`CLICK E TO OPEN LOCK` — reproduced here. Still inferred, because the docs don't publish them:

- **Hole hit width** — eyeballed from the screenshot. This is the single biggest lever on how hard
  the game feels; tune `holeWidth` in `Lockpick.svelte` first.
- **What `speed = 10` means in real units.** Implemented as percent-of-track per second, so a full
  sweep is 10s. If the real one is faster or slower, change `speed`, not the mechanic.
- **Whether the marker bounces or does a single pass.** Implemented as a single left-to-right pass.
  The sibling `shopLockpick` config has an explicit `bounce = false`, which implies some variant
  does bounce.
- **What the red hole means** — rendered here as the active target. Could equally be the failed
  hole in what may be a game-over screenshot.

**Thermite and Repair Kit are still approximations.** They're the right shape for the
NoPixel-family games Prodigy's criminal loop uses, but they were built before the docs turned up
and don't yet map onto a documented `prp-minigames` entry.

## The other 17 documented minigames

Not built yet, but the docs give exact configs for all of them:

`aimLab` · `arrowClicker` · `cableConnect` · `cableJigsaw` · `codeFind` · `colorCount` ·
`flappyBird` · `holeMatch` · `jigsawPuzzle` · `knobTurning` · `lettersFall` · `mineSweeper` ·
`pairMatch` · `pipeDodge` · `rythmArrows` · `rythmClick` · `shopLockpick` · `signMemory` ·
`simonSays` / `simonSaysOrig` · `traceShape`

Two worth calling out:

- **`shopLockpick`** — `{ holeCount = 12, speed = "Math.PI/1.5", bounce = false }`. The screenshot
  shows a *circular* dashed ring with green marks around it. This is the rotating lock some
  guides confuse with the vehicle one; they're separate games.
- **`mineSweeper`** — `{ x = 9, y = 9, mineCount = 10 }`, i.e. literally standard Minesweeper.
