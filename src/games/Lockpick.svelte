<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  // `normal` mirrors the documented prp-minigames default: { holeCount = 8, speed = 10 }.
  // holeWidth is not in the public config — it's inferred from the example screenshot.
  const CFG = {
    easy: { holeCount: 6, speed: 8, holeWidth: 4.5 },
    normal: { holeCount: 8, speed: 10, holeWidth: 3.5 },
    hard: { holeCount: 10, speed: 14, holeWidth: 2.8 }
  }

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let holes = $state([])
  let index = $state(0)
  let cursor = $state(0)
  let note = $state(null)

  let raf = 0
  let prev = 0
  let runStart = 0

  function build() {
    const first = 10
    const last = 94
    const slot = (last - first) / cfg.holeCount
    const pad = cfg.holeWidth / 2 + 0.6

    return Array.from({ length: cfg.holeCount }, (_, i) => {
      const lo = first + i * slot + pad
      const hi = first + (i + 1) * slot - pad
      return { pos: lo + Math.random() * Math.max(0, hi - lo), state: 'pending' }
    })
  }

  function start() {
    cancelAnimationFrame(raf)
    holes = build()
    index = 0
    cursor = 0
    note = null
    phase = 'playing'
    prev = performance.now()
    runStart = prev
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    const dt = Math.min(0.05, (t - prev) / 1000)
    prev = t
    cursor += cfg.speed * dt

    const h = holes[index]
    if (h && cursor > h.pos + cfg.holeWidth / 2) {
      h.state = 'miss'
      note = 'skipped a hole'
      return finish(false)
    }

    if (cursor >= 100) {
      cursor = 100
      return finish(holes.every((x) => x.state === 'done'))
    }

    raf = requestAnimationFrame(frame)
  }

  function press() {
    if (phase !== 'playing') return

    const h = holes[index]
    const off = cursor - h.pos

    if (Math.abs(off) > cfg.holeWidth / 2) {
      h.state = 'miss'
      note = off < 0 ? 'jumped the gun' : 'pushed past it'
      return finish(false)
    }

    h.state = 'done'
    index++

    if (index >= holes.length) return finish(true)
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('lockpick', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (e.code !== 'KeyE' && e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (e.repeat) return
    if (phase === 'playing') press()
    else start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick">
  <div class="hud">
    <span>Hole <b class="mono">{Math.min(index + 1, cfg.holeCount)}</b> / {cfg.holeCount}</span>
    <span>Speed <b class="mono">{cfg.speed}</b></span>
  </div>

  <div class="lock" onpointerdown={press} role="presentation">
    <div class="label">Click E to open lock</div>

    <div class="track">
      <div class="trail" style="width: {cursor}%"></div>

      {#each holes as h, i (i)}
        <div
          class="hole {h.state}"
          class:active={i === index && phase === 'playing'}
          style="left: {h.pos}%; width: {cfg.holeWidth}%"
        ></div>
      {/each}

      {#if phase === 'playing'}
        <div class="cursor" style="left: {cursor}%"></div>
      {/if}
    </div>
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          The marker sweeps the bar once. Tap <kbd>E</kbd> as it crosses each of the {cfg.holeCount}
          holes — press early, press late, or let one slide past and the pick snaps.
        </p>
      {:else if phase === 'won'}
        <h3>Lock Open</h3>
        <p>All {cfg.holeCount} holes caught in one pass. Go again and keep the streak.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {note === 'jumped the gun'
            ? 'Too early — you hit E before the marker was inside the hole.'
            : note === 'pushed past it'
              ? 'Too late — the marker had already cleared the hole.'
              : 'A hole went by untouched. Stay ahead of the marker and read the next gap early.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>E</kbd> to pick &nbsp;·&nbsp; <kbd>Space</kbd> to restart</span>
    </div>
  {/if}
</div>

<style>
  .lockpick {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 6;
    padding: 54px 40px 34px;
  }

  .lock {
    z-index: 2;
    display: grid;
    justify-items: center;
    gap: 22px;
    width: 100%;
    cursor: pointer;
  }

  .label {
    padding: 7px 16px;
    border-radius: 6px;
    background: #10161ee6;
    box-shadow: 0 2px 10px #0008;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #dfe7f0;
  }

  .track {
    position: relative;
    width: 100%;
    height: 46px;
    border-radius: 5px;
    background: #3f4750;
    box-shadow: inset 0 2px 6px #0006;
  }

  .trail {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    border-radius: 5px 0 0 5px;
    background: linear-gradient(180deg, #7cc63c, #5ea62b);
  }

  .hole {
    position: absolute;
    top: 50%;
    height: 30px;
    transform: translate(-50%, -50%);
    border-radius: 4px;
    background: #14181d;
    box-shadow: inset 0 1px 3px #000a;
    transition: background 0.09s linear;
  }

  .hole.active {
    background: #c81f28;
    box-shadow: 0 0 12px -2px #ff4d5e99;
  }

  .hole.done {
    background: #8ede4a;
  }

  .hole.miss {
    background: #ff4d5e;
    box-shadow: 0 0 16px -2px #ff4d5e;
  }

  .cursor {
    position: absolute;
    top: -6px;
    bottom: -6px;
    width: 10px;
    margin-left: -5px;
    border-radius: 3px;
    background: #a6ef4f;
    box-shadow: 0 0 14px 1px #a6ef4fcc;
    will-change: left;
  }

  .overlay kbd {
    padding: 2px 7px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: #0e141d;
    font-family: inherit;
    font-size: 0.9em;
    color: var(--text);
  }
</style>
