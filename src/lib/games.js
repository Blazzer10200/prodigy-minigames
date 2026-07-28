import Lockpick from '../games/Lockpick.svelte'
import Thermite from '../games/Thermite.svelte'
import Repair from '../games/Repair.svelte'

export const games = [
  {
    id: 'lockpick',
    name: 'Lockpick',
    tag: 'Vehicle entry',
    component: Lockpick,
    blurb:
      'A marker sweeps the bar once, left to right. Tap E as it crosses each hole — early, late, or a skipped hole all snap the pick. Built to the documented server config: 8 holes at speed 10. The sweep never changes pace, so read the gap to the next hole rather than watching the marker.'
  },
  {
    id: 'thermite',
    name: 'Thermite',
    tag: 'Heist grid hack',
    component: Thermite,
    blurb:
      'A pattern of tiles lights up for a moment, then the grid goes dark and you reproduce it before the timer runs out. One wrong tile blows the attempt. Chunk the pattern into rows instead of memorising loose dots.'
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
