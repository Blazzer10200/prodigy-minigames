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
      'Circles appear one at a time with a shrinking approach ring — click the moment the ring meets the circle. Too early or too late snaps the pick. Clear all 10 and the lock drops into a spin: swirl the mouse counter-clockwise to pop it. The ring speed never changes, so once you find the beat on the first target the same timing clears the rest.'
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
