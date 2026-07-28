import Lockpick from '../games/Lockpick.svelte'
import ShopLockpick from '../games/ShopLockpick.svelte'
import MineSweeper from '../games/MineSweeper.svelte'
import Thermite from '../games/Thermite.svelte'
import Repair from '../games/Repair.svelte'

// Grouped by how much the mock can actually be trusted, because that is the
// thing worth knowing before you practise on it.
export const groups = [
  {
    name: 'Traced from footage',
    hint: 'Layout and pacing matched against a recording of the live server.',
    games: [
      {
        id: 'lockpick',
        name: 'Lockpick',
        tag: 'Vehicle entry',
        component: Lockpick,
        config: 'rythmClick { targetCount, interval = 300 }',
        blurb:
          'Numbered pins appear around a circular dial, up to three at a time, joined by a dotted route. Click them in order — the live pin carries a countdown ring, and clicking out of order snaps the pick. Clear the set and the barrel starts turning: swirl the mouse counter-clockwise until the arc closes and it reads OPEN.'
      }
    ]
  },
  {
    name: 'From the documented config',
    hint: 'Mechanics and numbers lifted from the prp-minigames docs, not yet seen live.',
    games: [
      {
        id: 'shoplockpick',
        name: 'Shop Lockpick',
        tag: 'Door entry',
        component: ShopLockpick,
        config: 'shopLockpick { holeCount = 12, speed = Math.PI/1.5, bounce = false }',
        blurb:
          'A pick sweeps a barrel of twelve holes at a fixed rate. Tap E as it crosses each one, in order. Nothing about the pace ever changes, so this is a single rhythm held all the way round — the mistake is hesitating for a clean look instead of staying on the beat.'
      },
      {
        id: 'minesweeper',
        name: 'Minesweeper',
        tag: 'Vault grid',
        component: MineSweeper,
        config: 'mineSweeper { x = 9, y = 9, mineCount = 10 }',
        blurb:
          'Standard minesweeper on a 9×9 board with ten mines. Left click clears, right click flags, and your first click is always safe. Work outward from numbers you can already resolve rather than guessing into open space.'
      }
    ]
  },
  {
    name: 'Approximations',
    hint: 'Built before the research — no documented entry matches these yet.',
    games: [
      {
        id: 'thermite',
        name: 'Thermite',
        tag: 'Grid memory',
        component: Thermite,
        blurb:
          'A pattern of tiles lights up for a moment, then the grid goes dark and you reproduce it. One wrong tile blows the attempt. Chunk the pattern into rows instead of memorising loose dots. Note: the real vault-side grid game is minesweeper — this one is a stand-in.'
      },
      {
        id: 'repair',
        name: 'Repair Kit',
        tag: 'Precision timing',
        component: Repair,
        blurb:
          'A marker sweeps the bar and you commit inside the green zone. Each round the zone narrows and the sweep speeds up. Press as the marker enters the zone, not once it sits on it — that gap covers your input delay.'
      }
    ]
  }
]

export const games = groups.flatMap((g) => g.games)
