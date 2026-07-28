<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  const CFG = {
    easy: { size: 5, lit: 5, memorise: 3000, solve: 12000 },
    normal: { size: 5, lit: 7, memorise: 2200, solve: 9000 },
    hard: { size: 6, lit: 10, memorise: 1800, solve: 8000 }
  }

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let target = $state([])
  let picked = $state([])
  let wrong = $state(null)
  let remain = $state(0)

  let raf = 0
  let timer = 0
  let solveStart = 0
  let runStart = 0

  const cells = $derived(cfg.size * cfg.size)
  const left = $derived(Math.max(0, target.length - picked.length))
  const bar = $derived(Math.max(0, Math.min(1, remain / cfg.solve)))

  function start() {
    clearTimeout(timer)
    cancelAnimationFrame(raf)

    const idx = [...Array(cells).keys()]
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }

    target = idx.slice(0, cfg.lit)
    picked = []
    wrong = null
    remain = cfg.solve
    phase = 'memorise'
    runStart = performance.now()

    timer = setTimeout(() => {
      if (phase !== 'memorise') return
      phase = 'solve'
      solveStart = performance.now()
      raf = requestAnimationFrame(frame)
    }, cfg.memorise)
  }

  function frame(t) {
    if (phase !== 'solve') return
    remain = cfg.solve - (t - solveStart)
    if (remain <= 0) {
      remain = 0
      return finish(false)
    }
    raf = requestAnimationFrame(frame)
  }

  function pick(i) {
    if (phase !== 'solve' || picked.includes(i)) return

    if (!target.includes(i)) {
      wrong = i
      return finish(false)
    }

    picked = [...picked, i]
    if (picked.length === target.length) finish(true)
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
    phase = won ? 'won' : 'lost'
    record('thermite', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase === 'idle' || phase === 'won' || phase === 'lost') start()
  }

  $effect(() => () => {
    cancelAnimationFrame(raf)
    clearTimeout(timer)
  })
</script>

<svelte:window onkeydown={key} />

<div class="stage thermite">
  <div class="hud">
    <span>
      {#if phase === 'memorise'}Memorise{:else}Remaining <b class="mono">{left}</b>{/if}
    </span>
    <span>
      {#if phase === 'solve'}<b class="mono">{(remain / 1000).toFixed(1)}s</b>{/if}
    </span>
  </div>

  {#if phase === 'solve'}
    <div class="timer"><i style="transform: scaleX({bar})"></i></div>
  {/if}

  <div class="grid" style="--n: {cfg.size}">
    {#each { length: cells } as _, i (i)}
      <button
        class="tile"
        class:show={phase === 'memorise' && target.includes(i)}
        class:got={picked.includes(i)}
        class:bad={wrong === i}
        class:reveal={phase === 'lost' && target.includes(i) && !picked.includes(i)}
        disabled={phase !== 'solve'}
        onclick={() => pick(i)}
        aria-label="Tile {i + 1}"
      ></button>
    {/each}
  </div>

  {#if phase === 'idle' || phase === 'won' || phase === 'lost'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Thermite</h3>
        <p>
          {cfg.lit} tiles flash for {(cfg.memorise / 1000).toFixed(1)}s. Once the grid goes dark,
          click them all back within {cfg.solve / 1000}s. One wrong tile ends the run.
        </p>
      {:else if phase === 'won'}
        <h3>Burned Through</h3>
        <p>Pattern reproduced clean. Go again before the muscle memory fades.</p>
      {:else}
        <h3>Failed</h3>
        <p>
          {wrong !== null
            ? 'Wrong tile. The ones you missed are outlined behind this panel.'
            : 'Ran out of time. Commit to the pattern faster — hesitation costs more than a misclick.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to pick</span>
    </div>
  {/if}
</div>

<style>
  .thermite {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 10;
    padding: 58px 24px 24px;
  }

  .timer {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: #ffffff10;
    z-index: 3;
  }

  .timer i {
    display: block;
    height: 100%;
    transform-origin: left;
    background: linear-gradient(90deg, var(--accent), var(--warn));
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(var(--n), 1fr);
    gap: 8px;
    width: min(100%, 62vh);
    aspect-ratio: 1;
    z-index: 2;
  }

  .tile {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #0e151f;
    transition:
      background 0.11s ease,
      border-color 0.11s ease,
      box-shadow 0.11s ease;
  }

  .tile:not(:disabled):hover {
    border-color: #35e0ff55;
    background: #131f2c;
  }

  .tile.show {
    border-color: var(--accent);
    background: #35e0ff2e;
    box-shadow: 0 0 20px -6px var(--accent);
  }

  .tile.got {
    border-color: var(--good);
    background: #38e08b2e;
    box-shadow: 0 0 20px -6px var(--good);
  }

  .tile.bad {
    border-color: var(--bad);
    background: #ff4d5e33;
  }

  .tile.reveal {
    border-color: #ffb54577;
    background: #ffb5451a;
  }
</style>
