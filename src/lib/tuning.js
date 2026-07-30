// Every number a game plays by lives here rather than inside the component, so
// the shell can show it as a slider and the player can save their own presets.
//
// `base` holds the three built-in difficulties. Those are read only — editing a
// value stores an override on top, and resetting throws the override away.
// `fields` describes how to render each knob. Every field carries a `help` line
// in plain words: the sliders are optional, so anyone who opens them should be
// able to tell what one does without knowing how the game is built.

export const TUNING = {
  lockpick: {
    fields: [
      {
        key: 'pins',
        label: 'Pins',
        min: 3,
        max: 20,
        step: 1,
        help: 'How many pins to clear before the barrel starts turning.'
      },
      {
        key: 'alive',
        label: 'Pins on the dial',
        min: 1,
        max: 6,
        step: 1,
        help: 'How many sit on the dial at once. More lets you see what is coming.'
      },
      {
        key: 'approach',
        label: 'Ring close time',
        min: 400,
        max: 2500,
        step: 10,
        unit: 'ms',
        help: 'How long the ring takes to close onto a pin. Lower is faster.'
      },
      {
        key: 'perfect',
        label: 'Perfect window',
        min: 20,
        max: 300,
        step: 5,
        unit: 'ms',
        help: 'How near exact a click has to be to read PERFECT instead of GOOD.'
      },
      {
        key: 'good',
        label: 'Hit window',
        min: 40,
        max: 500,
        step: 5,
        unit: 'ms',
        help: 'How far off you can be and still hit. Miss by more and the pick snaps.'
      },
      {
        key: 'gap',
        label: 'Gap between pins',
        min: 100,
        max: 900,
        step: 10,
        unit: 'ms',
        help: 'How long before the next pin appears. It sits there numbered until its ring starts.'
      },
      {
        key: 'stagger',
        label: 'Ring overlap',
        min: 0.3,
        max: 1,
        step: 0.05,
        help: 'When a pin starts closing, as a share of the pin before it. 0.5 starts it halfway through the one before; 1 waits for that one to land first.'
      },
      {
        key: 'drags',
        label: 'Drag targets',
        min: 0,
        max: 6,
        step: 1,
        help: 'How many of the pins are a rainbow track to drag instead of a pin to click. The first is never one.'
      },
      {
        key: 'dragTime',
        label: 'Drag time',
        min: 1000,
        max: 8000,
        step: 100,
        unit: 'ms',
        help: 'How long you get to pull the handle round to the right. The rest of the dial waits while you do.'
      },
      {
        key: 'dragTol',
        label: 'Drag tolerance',
        min: 6,
        max: 40,
        step: 1,
        help: 'How far off the curve the pointer can stray and still pull the handle. Lower means tracing it properly.'
      },
      {
        key: 'dragHold',
        label: 'Dial waits during a drag',
        min: 0,
        max: 1,
        step: 1,
        help: 'Off, the pins carry on closing while you drag and you have to keep the pattern going. On, the dial freezes until the handle lands.'
      },
      {
        key: 'turns',
        label: 'Spin turns',
        min: 0.5,
        max: 5,
        step: 0.25,
        help: 'How many full turns of the barrel it takes to open.'
      },
      {
        key: 'spinTime',
        label: 'Spin time limit',
        min: 3000,
        max: 20000,
        step: 500,
        unit: 'ms',
        help: 'How long you get to finish the spin once the pins are done.'
      }
    ],
    base: {
      easy: {
        pins: 5,
        alive: 3,
        approach: 1400,
        perfect: 110,
        good: 230,
        gap: 420,
        stagger: 0.75,
        drags: 0,
        dragTime: 5000,
        dragTol: 26,
        dragHold: 0,
        turns: 1.5,
        spinTime: 10000
      },
      normal: {
        pins: 6,
        alive: 3,
        approach: 880,
        perfect: 74,
        good: 155,
        gap: 310,
        stagger: 0.5,
        drags: 0,
        dragTime: 4200,
        dragTol: 20,
        dragHold: 0,
        turns: 2,
        spinTime: 9000
      },
      hard: {
        pins: 10,
        alive: 4,
        approach: 620,
        perfect: 50,
        good: 110,
        gap: 210,
        stagger: 0.45,
        drags: 2,
        dragTime: 3200,
        dragTol: 15,
        dragHold: 0,
        turns: 2.5,
        spinTime: 7500
      }
    }
  },

  barlockpick: {
    fields: [
      {
        key: 'holes',
        label: 'Holes',
        min: 4,
        max: 16,
        step: 1,
        help: 'How many holes you have to hit to open the lock.'
      },
      {
        key: 'speed',
        label: 'Pick speed',
        min: 2,
        max: 30,
        step: 0.5,
        help: 'How fast the pick runs along the bar.'
      },
      {
        key: 'window',
        label: 'Hit window',
        min: 0.008,
        max: 0.09,
        step: 0.002,
        unit: 'bar',
        help: 'How near the hole the pick has to be when you press.'
      },
      {
        key: 'limit',
        label: 'Time limit',
        min: 10000,
        max: 90000,
        step: 1000,
        unit: 'ms',
        help: 'How long you get for the whole lock.'
      }
    ],
    base: {
      easy: { holes: 6, speed: 7, window: 0.05, limit: 45000 },
      normal: { holes: 8, speed: 10, window: 0.032, limit: 35000 },
      hard: { holes: 10, speed: 14, window: 0.022, limit: 30000 }
    }
  },

  shoplockpick: {
    fields: [
      {
        key: 'holes',
        label: 'Holes',
        min: 4,
        max: 20,
        step: 1,
        help: 'How many holes go round the barrel.'
      },
      {
        key: 'speed',
        label: 'Pick speed',
        min: 0.5,
        max: 5,
        step: 0.05,
        unit: 'rad/s',
        help: 'How fast the pick sweeps round the barrel.'
      },
      {
        key: 'window',
        label: 'Hit window',
        min: 0.04,
        max: 0.5,
        step: 0.01,
        unit: 'rad',
        help: 'How near the hole the pick has to be when you press.'
      },
      {
        key: 'limit',
        label: 'Time limit',
        min: 10000,
        max: 90000,
        step: 1000,
        unit: 'ms',
        help: 'How long you get for the whole lock.'
      }
    ],
    base: {
      easy: { holes: 8, speed: Math.PI / 2.4, window: 0.24, limit: 40000 },
      normal: { holes: 12, speed: Math.PI / 1.5, window: 0.17, limit: 35000 },
      hard: { holes: 14, speed: Math.PI / 1.05, window: 0.12, limit: 30000 }
    }
  },

  minesweeper: {
    fields: [
      { key: 'x', label: 'Columns', min: 5, max: 16, step: 1, help: 'How wide the board is.' },
      { key: 'y', label: 'Rows', min: 5, max: 16, step: 1, help: 'How tall the board is.' },
      {
        key: 'mines',
        label: 'Mines',
        min: 3,
        max: 60,
        step: 1,
        help: 'How many mines are hidden in the board.'
      }
    ],
    base: {
      easy: { x: 9, y: 9, mines: 8 },
      normal: { x: 9, y: 9, mines: 10 },
      hard: { x: 12, y: 12, mines: 24 }
    }
  },

  thermite: {
    fields: [
      {
        key: 'size',
        label: 'Grid size',
        min: 3,
        max: 8,
        step: 1,
        help: 'How many tiles across the grid is.'
      },
      {
        key: 'lit',
        label: 'Tiles to remember',
        min: 2,
        max: 24,
        step: 1,
        help: 'How many tiles flash for you to memorise.'
      },
      {
        key: 'memorise',
        label: 'Look time',
        min: 500,
        max: 6000,
        step: 100,
        unit: 'ms',
        help: 'How long the tiles stay lit before the grid goes dark.'
      },
      {
        key: 'solve',
        label: 'Answer time',
        min: 3000,
        max: 30000,
        step: 500,
        unit: 'ms',
        help: 'How long you get to click them back.'
      }
    ],
    base: {
      easy: { size: 5, lit: 5, memorise: 3000, solve: 12000 },
      normal: { size: 5, lit: 7, memorise: 2200, solve: 9000 },
      hard: { size: 6, lit: 10, memorise: 1800, solve: 8000 }
    }
  },

  repair: {
    fields: [
      {
        key: 'rounds',
        label: 'Stages',
        min: 1,
        max: 8,
        step: 1,
        help: 'How many stages you have to clear in a row.'
      },
      {
        key: 'width',
        label: 'Zone width',
        min: 3,
        max: 40,
        step: 1,
        unit: '%',
        help: 'How wide the green zone is.'
      },
      {
        key: 'speed',
        label: 'Sweep speed',
        min: 30,
        max: 300,
        step: 5,
        unit: '%/s',
        help: 'How fast the marker sweeps across.'
      },
      {
        key: 'limit',
        label: 'Time per stage',
        min: 2000,
        max: 15000,
        step: 250,
        unit: 'ms',
        help: 'How long you get for each stage.'
      }
    ],
    base: {
      easy: { rounds: 3, width: 20, speed: 60, limit: 6000 },
      normal: { rounds: 3, width: 13, speed: 95, limit: 5000 },
      hard: { rounds: 4, width: 8, speed: 135, limit: 4000 }
    }
  }
}
