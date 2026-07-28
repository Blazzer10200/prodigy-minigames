# Documented minigame reference

Every minigame in the `prp-minigames` NUI library, with the config Prodigy
Studios publishes for it. Source:
[docs.prodigyrp.net/crime/prp-minigames/minigames](https://docs.prodigyrp.net/crime/prp-minigames/minigames.html)

The page is server rendered but defeats some extraction tools. Plain `curl`
returns the whole thing, config blocks and example screenshots included.

Use this as the shopping list when adding a game. Copy the config into the
component's `normal` preset, then build easy and hard around it.

## Built

| Game           | Config                                                      | Notes                                                                                                                                                      |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rythmClick`   | `{ targetCount = 10, interval = 300 }`                      | Vehicle lockpick. `interval` is the spawn gap, not the ring speed. Live footage showed 6 pins, which is what `normal` uses; `hard` uses the documented 10. |
| `shopLockpick` | `{ holeCount = 12, speed = "Math.PI/1.5", bounce = false }` | Circular barrel, `E` on each hole in order.                                                                                                                |
| `mineSweeper`  | `{ x = 9, y = 9, mineCount = 10 }`                          | Ordinary minesweeper.                                                                                                                                      |

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
| `lockpick`                    | `{ holeCount = 8, speed = 10 }`                                                                     |
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
