import Lockpick from '../games/Lockpick.svelte'
import ShopLockpick from '../games/ShopLockpick.svelte'
import BarLockpick from '../games/BarLockpick.svelte'
import MineSweeper from '../games/MineSweeper.svelte'
import Thermite from '../games/Thermite.svelte'
import Repair from '../games/Repair.svelte'

export const DIFFICULTIES = ['easy', 'normal', 'hard']

// Grouped by how closely each mock matches the real thing, because that is
// what you want to know before you practise on it. See docs/MINIGAMES.md.
export const groups = [
  {
    name: 'Traced from footage',
    hint: 'Matched against a screen recording of the live server.',
    games: [
      {
        id: 'lockpick',
        name: 'Lockpick',
        tag: 'Vehicle entry',
        component: Lockpick,
        config: 'rythmClick { targetCount, interval = 300 }',
        blurb:
          'Numbered pins appear around a dial, a few at a time. The next one has an outer circle closing in on it — click as that circle lands on the pin, and always in numbered order. Clear the set and the barrel turns: swirl the mouse clockwise until it reads OPEN.'
      }
    ]
  },
  {
    name: 'From the documented config',
    hint: 'Built from the prp-minigames docs. Not yet checked against live footage.',
    games: [
      {
        id: 'shoplockpick',
        name: 'Shop Lockpick',
        tag: 'Door entry',
        component: ShopLockpick,
        config: 'shopLockpick { holeCount = 12, speed = Math.PI/1.5, bounce = false }',
        blurb:
          'A pick sweeps around a barrel of twelve holes. Tap E as it crosses each one, in order. The speed never changes, so this is a single rhythm held the whole way round.'
      },
      {
        id: 'barlockpick',
        name: 'Bar Lockpick',
        tag: 'Doors and props',
        component: BarLockpick,
        config: 'lockpick { holeCount = 8, speed = 10 }',
        blurb:
          'The entry the docs actually call `lockpick` — a straight bar of eight holes, not the vehicle one. A pick runs the bar and turns at each end; tap E as it crosses each hole in order. The docs give no unit for speed, so 10 is read as a two and a half second sweep — the reading that puts its timing in line with Shop Lockpick.'
      },
      {
        id: 'minesweeper',
        name: 'Minesweeper',
        tag: 'Vault grid',
        component: MineSweeper,
        config: 'mineSweeper { x = 9, y = 9, mineCount = 10 }',
        blurb:
          'Ordinary minesweeper on a 9x9 board with ten mines. Left click clears, right click flags, and your first click is always safe.'
      }
    ]
  },
  {
    name: 'Approximations',
    hint: 'Built before the research. No documented entry matches these yet.',
    games: [
      {
        id: 'thermite',
        name: 'Thermite',
        tag: 'Grid memory',
        component: Thermite,
        blurb:
          'Tiles flash for a moment, then the grid goes dark and you click them back. One wrong tile ends the run. The real vault grid game is minesweeper, so treat this one as a stand-in.'
      },
      {
        id: 'repair',
        name: 'Repair Kit',
        tag: 'Precision timing',
        component: Repair,
        blurb:
          'Stop the marker inside the green zone. The zone narrows and the sweep speeds up each stage. Commit as the marker enters the green, not once it covers the middle.'
      }
    ]
  }
]

export const games = groups.flatMap((g) => g.games)
