import Lockpick from '../games/Lockpick.svelte'
import ShopLockpick from '../games/ShopLockpick.svelte'
import BarLockpick from '../games/BarLockpick.svelte'
import MineSweeper from '../games/MineSweeper.svelte'
import Thermite from '../games/Thermite.svelte'
import Repair from '../games/Repair.svelte'

export const DIFFICULTIES = ['easy', 'normal', 'hard']

// Grouped by how closely each mock matches the real thing, because that is
// what you want to know before you practise on it. See docs/MINIGAMES.md.
//
// No `blurb` here on purpose: each game explains itself in its own start
// overlay, where it can quote the numbers you are about to play. Carrying a
// second description in the registry put the same paragraph on screen twice.
export const groups = [
  {
    name: 'Traced from footage',
    hint: 'Matched against a screen recording of the live game.',
    games: [
      {
        id: 'lockpick',
        name: 'Lockpick',
        tag: 'Vehicle entry',
        component: Lockpick,
        config: 'rythmClick { targetCount, interval = 300 }'
      }
    ]
  },
  {
    name: 'From the documented config',
    hint: 'Built from the published script docs. Not yet checked against live footage.',
    games: [
      {
        id: 'shoplockpick',
        name: 'Shop Lockpick',
        tag: 'Door entry',
        component: ShopLockpick,
        config: 'shopLockpick { holeCount = 12, speed = Math.PI/1.5, bounce = false }'
      },
      {
        id: 'barlockpick',
        name: 'Bar Lockpick',
        tag: 'Doors and props',
        component: BarLockpick,
        config: 'lockpick { holeCount = 8, speed = 10 }'
      },
      {
        id: 'minesweeper',
        name: 'Minesweeper',
        tag: 'Vault grid',
        component: MineSweeper,
        config: 'mineSweeper { x = 9, y = 9, mineCount = 10 }'
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
        component: Thermite
      },
      {
        id: 'repair',
        name: 'Repair Kit',
        tag: 'Precision timing',
        component: Repair
      }
    ]
  }
]

export const games = groups.flatMap((g) => g.games)
