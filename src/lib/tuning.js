// Every number a game plays by lives here rather than inside the component, so
// the shell can show it as a slider and the player can save their own presets.
//
// `base` holds the three built-in difficulties. Those are read only — editing a
// value stores an override on top, and resetting throws the override away.
// `fields` describes how to render each knob.

export const TUNING = {
  lockpick: {
    fields: [
      { key: 'pins', label: 'Pins', min: 3, max: 20, step: 1 },
      { key: 'alive', label: 'On the dial at once', min: 1, max: 6, step: 1 },
      { key: 'approach', label: 'Ring close time', min: 400, max: 2500, step: 10, unit: 'ms' },
      { key: 'perfect', label: 'Perfect window', min: 20, max: 300, step: 5, unit: 'ms' },
      { key: 'good', label: 'Hit window', min: 40, max: 500, step: 5, unit: 'ms' },
      { key: 'gap', label: 'Gap between spawns', min: 100, max: 900, step: 10, unit: 'ms' },
      { key: 'turns', label: 'Spin turns', min: 0.5, max: 5, step: 0.25 },
      { key: 'spinTime', label: 'Spin time limit', min: 3000, max: 20000, step: 500, unit: 'ms' }
    ],
    base: {
      easy: {
        pins: 5,
        alive: 3,
        approach: 1400,
        perfect: 110,
        good: 230,
        gap: 420,
        turns: 1.5,
        spinTime: 10000
      },
      normal: {
        pins: 6,
        alive: 3,
        approach: 1050,
        perfect: 80,
        good: 170,
        gap: 340,
        turns: 2,
        spinTime: 9000
      },
      hard: {
        pins: 10,
        alive: 4,
        approach: 760,
        perfect: 55,
        good: 120,
        gap: 240,
        turns: 2.5,
        spinTime: 7500
      }
    }
  },

  shoplockpick: {
    fields: [
      { key: 'holes', label: 'Holes', min: 4, max: 20, step: 1 },
      { key: 'speed', label: 'Pick speed', min: 0.5, max: 5, step: 0.05, unit: 'rad/s' },
      { key: 'window', label: 'Hit window', min: 0.04, max: 0.5, step: 0.01, unit: 'rad' },
      { key: 'limit', label: 'Time limit', min: 10000, max: 90000, step: 1000, unit: 'ms' }
    ],
    base: {
      easy: { holes: 8, speed: Math.PI / 2.4, window: 0.24, limit: 40000 },
      normal: { holes: 12, speed: Math.PI / 1.5, window: 0.17, limit: 35000 },
      hard: { holes: 14, speed: Math.PI / 1.05, window: 0.12, limit: 30000 }
    }
  },

  barlockpick: {
    fields: [
      { key: 'holes', label: 'Holes', min: 4, max: 16, step: 1 },
      { key: 'speed', label: 'Pick speed', min: 2, max: 30, step: 0.5 },
      { key: 'window', label: 'Hit window', min: 0.008, max: 0.09, step: 0.002, unit: 'bar' },
      { key: 'limit', label: 'Time limit', min: 10000, max: 90000, step: 1000, unit: 'ms' }
    ],
    base: {
      easy: { holes: 6, speed: 7, window: 0.05, limit: 45000 },
      normal: { holes: 8, speed: 10, window: 0.032, limit: 35000 },
      hard: { holes: 10, speed: 14, window: 0.022, limit: 30000 }
    }
  },

  minesweeper: {
    fields: [
      { key: 'x', label: 'Columns', min: 5, max: 16, step: 1 },
      { key: 'y', label: 'Rows', min: 5, max: 16, step: 1 },
      { key: 'mines', label: 'Mines', min: 3, max: 60, step: 1 }
    ],
    base: {
      easy: { x: 9, y: 9, mines: 8 },
      normal: { x: 9, y: 9, mines: 10 },
      hard: { x: 12, y: 12, mines: 24 }
    }
  },

  thermite: {
    fields: [
      { key: 'size', label: 'Grid size', min: 3, max: 8, step: 1 },
      { key: 'lit', label: 'Tiles to remember', min: 2, max: 24, step: 1 },
      { key: 'memorise', label: 'Look time', min: 500, max: 6000, step: 100, unit: 'ms' },
      { key: 'solve', label: 'Answer time', min: 3000, max: 30000, step: 500, unit: 'ms' }
    ],
    base: {
      easy: { size: 5, lit: 5, memorise: 3000, solve: 12000 },
      normal: { size: 5, lit: 7, memorise: 2200, solve: 9000 },
      hard: { size: 6, lit: 10, memorise: 1800, solve: 8000 }
    }
  },

  repair: {
    fields: [
      { key: 'rounds', label: 'Stages', min: 1, max: 8, step: 1 },
      { key: 'width', label: 'Zone width', min: 3, max: 40, step: 1, unit: '%' },
      { key: 'speed', label: 'Sweep speed', min: 30, max: 300, step: 5, unit: '%/s' },
      { key: 'limit', label: 'Time per stage', min: 2000, max: 15000, step: 250, unit: 'ms' }
    ],
    base: {
      easy: { rounds: 3, width: 20, speed: 60, limit: 6000 },
      normal: { rounds: 3, width: 13, speed: 95, limit: 5000 },
      hard: { rounds: 4, width: 8, speed: 135, limit: 4000 }
    }
  }
}
