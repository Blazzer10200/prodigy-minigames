<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // normal mirrors the documented config: { x = 9, y = 9, mineCount = 10 }.
  // Numbers live in lib/tuning.js.
  let { cfg } = $props()

  let phase = $state('idle')
  let cells = $state([])
  let elapsed = $state(0)

  let seeded = false
  let raf = 0
  let runStart = 0

  const total = $derived(cfg.x * cfg.y)
  // the first click and its eight neighbours are always safe, so that pocket
  // caps how many mines a tuned board can actually hold
  const mines = $derived(Math.max(1, Math.min(cfg.mines, total - 9)))
  const flagged = $derived(cells.filter((c) => c.flag).length)
  const cleared = $derived(cells.filter((c) => c.open).length)

  function neighbours(i) {
    const cx = i % cfg.x
    const cy = Math.floor(i / cfg.x)
    const out = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const nx = cx + dx
        const ny = cy + dy
        if (nx >= 0 && nx < cfg.x && ny >= 0 && ny < cfg.y) out.push(ny * cfg.x + nx)
      }
    }
    return out
  }

  function start() {
    cancelAnimationFrame(raf)
    cells = Array.from({ length: cfg.x * cfg.y }, () => ({
      mine: false,
      near: 0,
      open: false,
      flag: false,
      blown: false
    }))
    seeded = false
    elapsed = 0
    phase = 'playing'
    runStart = performance.now()
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return
    elapsed = t - runStart
    raf = requestAnimationFrame(frame)
  }

  // mines are placed after the first click so the opener is never an instant loss
  function seed(first) {
    const safe = new Set([first, ...neighbours(first)])
    const pool = cells.map((_, i) => i).filter((i) => !safe.has(i))

    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }

    for (const i of pool.slice(0, Math.min(mines, pool.length))) cells[i].mine = true
    for (let i = 0; i < cells.length; i++) {
      cells[i].near = neighbours(i).filter((n) => cells[n].mine).length
    }
    seeded = true
  }

  function open(i) {
    if (phase !== 'playing' || cells[i].open || cells[i].flag) return
    if (!seeded) seed(i)

    if (cells[i].mine) {
      cells[i].blown = true
      for (const c of cells) if (c.mine) c.open = true
      return finish(false)
    }

    // iterative flood fill — recursion would blow the stack on a big empty region
    const stack = [i]
    while (stack.length) {
      const j = stack.pop()
      if (cells[j].open || cells[j].flag) continue
      cells[j].open = true
      if (cells[j].near === 0) {
        for (const n of neighbours(j)) if (!cells[n].open && !cells[n].mine) stack.push(n)
      }
    }

    if (cells.filter((c) => c.open).length === total - mines) finish(true)
  }

  function flag(e, i) {
    e.preventDefault()
    if (phase !== 'playing' || cells[i].open) return
    cells[i].flag = !cells[i].flag
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('minesweeper', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (typing(e)) return
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase !== 'playing') start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage sweeper">
  <div class="hud">
    <span>Mines <b class="mono">{Math.max(0, mines - flagged)}</b></span>
    <span>
      <b class="mono">{cleared}</b> / {total - mines} cleared
      {#if phase === 'playing'}&nbsp;·&nbsp;<b class="mono">{(elapsed / 1000).toFixed(1)}s</b>{/if}
    </span>
  </div>

  <div class="field">
    <div class="grid square" style="--n: {cfg.x}">
      {#each cells as c, i (i)}
        <button
          class="cell"
          class:open={c.open}
          class:mine={c.open && c.mine}
          class:blown={c.blown}
          class:flag={c.flag}
          data-n={c.open && !c.mine && c.near ? c.near : ''}
          disabled={phase !== 'playing'}
          onclick={() => open(i)}
          oncontextmenu={(e) => flag(e, i)}
          aria-label="Cell {i + 1}"
        >
          {#if c.open && c.mine}✳{:else if c.flag}⚑{:else if c.open && c.near}{c.near}{/if}
        </button>
      {/each}
    </div>
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Minesweeper</h3>
        <p>
          Standard rules on a {cfg.x}×{cfg.y} board with {mines} mines. Left click clears, right click
          flags. Your first click is always safe.
        </p>
      {:else if phase === 'won'}
        <h3>Board Clear</h3>
        <p>Every safe tile opened in {(elapsed / 1000).toFixed(1)}s.</p>
      {:else}
        <h3>Detonated</h3>
        <p>
          Hit a mine. Work the numbers off a known-safe edge instead of guessing into open space.
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint">left click clears &nbsp;·&nbsp; right click flags</span>
    </div>
  {/if}
</div>

<style>
  .sweeper {
    --ar: 1.6;
    aspect-ratio: 16 / 10;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    gap: 3px;
  }

  .cell {
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid #26313f;
    border-radius: 4px;
    background: #172130;
    font-size: min(3.4cqmin, 18px);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    transition:
      background 0.12s ease,
      border-color 0.12s ease,
      transform 0.12s ease;
  }

  .cell:not(:disabled):active {
    transform: scale(0.92);
  }

  .cell:not(:disabled):hover {
    border-color: #35e0ff55;
    background: #1d2b3c;
  }

  .cell.open {
    border-color: #1a2430;
    background: #0e141c;
  }

  .cell.flag {
    color: var(--warn);
  }

  .cell.mine {
    color: var(--bad);
  }

  .cell.blown {
    border-color: var(--bad);
    background: #ff4d5e33;
  }

  .cell[data-n='1'] {
    color: #6ea8ff;
  }
  .cell[data-n='2'] {
    color: #38e08b;
  }
  .cell[data-n='3'] {
    color: #ff7a85;
  }
  .cell[data-n='4'] {
    color: #b892ff;
  }
  .cell[data-n='5'] {
    color: #ffb545;
  }
  .cell[data-n='6'] {
    color: #35e0ff;
  }
  .cell[data-n='7'] {
    color: #e6edf6;
  }
  .cell[data-n='8'] {
    color: #7d8ea6;
  }
</style>
