# Prodigy 4.0 — Minigame Practice

Offline browser mock of the Prodigy RP (FiveM) minigames, so you can drill the timing and
patterns without burning attempts in-server.

```bash
npm install
npm run dev      # http://localhost:5180
```

Stats (attempts, success rate, streak, best streak, average clear time) are tracked per game
per difficulty in `localStorage`.

## What's in here

| Game | Used for | Mechanic |
| --- | --- | --- |
| `Lockpick` | Vehicle entry | OSU-style — click each circle as its shrinking approach ring lands |
| `Thermite` | Robberies / vaults | Grid flashes a pattern, reproduce it before the timer expires |
| `Repair Kit` | Gear + vehicle repair | Sweeping marker, commit inside the narrowing sweet-spot zone |

Each has easy / normal / hard presets in `CFG` at the top of its component — tune `approach`,
`perfect`, `good`, `memorise`, `solve`, `width`, `speed` to match what the server actually feels
like once you've compared side by side.

## Accuracy — read this

This is built from **public description, not from the server's source**. Nobody outside Prodigy
Studios has the real tolerances, so treat the numbers as a starting point:

- **Lockpick** — confident on the shape. Two independent "Prodigy RP styled" community recreations
  ([BigPapaBear2217](https://github.com/BigPapaBear2217/Lockpick-Minigame),
  [NickRobin23](https://github.com/NickRobin23/Robins-Lockpick)) both describe circles with a
  shrinking approach ring, which is what's implemented here. One SEO-driven trainer site instead
  describes a *rotating* lock with a sweeping indicator — if the in-game version turns out to be
  that, the input skill is the same but the visual needs swapping.
- **Thermite / Repair** — shape is right for the NoPixel-family minigames Prodigy's criminal loop
  is built on, but the grid size, tile count and timers are guesses.
- **Timings across the board are unverified.** They're tuned to feel fair, not to match frame for
  frame.

The official docs (`docs.prodigyrp.net/crime/prp-minigames`) confirm a 20+ game NUI library and
name a few others — Simon Says memory locks, a Flappy Bird style feed, Minesweeper — but the page
listing every type renders client-side and didn't yield its content.

**To make this actually accurate:** screenshots or a clip of the real minigames closes the gap
faster than any amount of searching.
