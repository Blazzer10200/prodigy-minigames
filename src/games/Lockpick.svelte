<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  const CFG = {
    easy: { pins: 4, approach: 1100, perfect: 90, good: 190 },
    normal: { pins: 5, approach: 850, perfect: 65, good: 140 },
    hard: { pins: 7, approach: 620, perfect: 45, good: 100 }
  }
  const RING = 3.2

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let pins = $state([])
  let index = $state(0)
  let progress = $state(0)
  let grade = $state(null)
  let offset = $state(0)

  let raf = 0
  let pinStart = 0
  let runStart = 0

  const ringScale = $derived(Math.max(0.72, 1 + (RING - 1) * (1 - progress)))
  const current = $derived(pins[index])

  function build() {
    const out = []
    let prev = null
    for (let i = 0; i < cfg.pins; i++) {
      let p
      // keep consecutive pins apart so it stays a flick, not a double-tap
      do {
        p = { x: 12 + Math.random() * 76, y: 16 + Math.random() * 68 }
      } while (prev && Math.hypot(p.x - prev.x, p.y - prev.y) < 26)
      out.push(p)
      prev = p
    }
    return out
  }

  function start() {
    cancelAnimationFrame(raf)
    pins = build()
    index = 0
    grade = null
    offset = 0
    phase = 'playing'
    runStart = performance.now()
    nextPin()
  }

  function nextPin() {
    if (index >= pins.length) return finish(true)
    progress = 0
    pinStart = performance.now()
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return
    progress = (t - pinStart) / cfg.approach
    if (progress > 1 + cfg.good / cfg.approach) {
      offset = Math.round(cfg.good)
      grade = 'TOO LATE'
      return finish(false)
    }
    raf = requestAnimationFrame(frame)
  }

  function hit(e) {
    e.stopPropagation()
    if (phase !== 'playing') return

    const err = (progress - 1) * cfg.approach
    offset = Math.round(err)

    if (Math.abs(err) > cfg.good) {
      grade = err < 0 ? 'TOO EARLY' : 'TOO LATE'
      return finish(false)
    }

    grade = Math.abs(err) <= cfg.perfect ? 'PERFECT' : 'GOOD'
    cancelAnimationFrame(raf)
    index++
    nextPin()
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('lockpick', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase !== 'playing') start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick">
  <div class="hud">
    <span>Pin <b class="mono">{Math.min(index + 1, cfg.pins)}</b> / {cfg.pins}</span>
    {#if grade}
      <span class="grade" class:ok={grade === 'PERFECT' || grade === 'GOOD'}>
        {grade}
        {#if grade !== 'PERFECT'}<b class="mono">{offset > 0 ? '+' : ''}{offset}ms</b>{/if}
      </span>
    {/if}
  </div>

  {#if phase === 'playing' && current}
    <button
      class="pin"
      style="left:{current.x}%; top:{current.y}%"
      onpointerdown={hit}
      aria-label="Hit pin {index + 1}"
    >
      <span class="ring" style="transform: translate(-50%, -50%) scale({ringScale})"></span>
      <span class="core"></span>
      <span class="num mono">{index + 1}</span>
    </button>
  {/if}

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          Click each circle exactly as the outer ring closes onto it. {cfg.pins} pins, no second
          chances — one bad click and the pick snaps.
        </p>
      {:else if phase === 'won'}
        <h3>Unlocked</h3>
        <p>All {cfg.pins} pins cleared. Run it again and try to keep the streak alive.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {grade === 'TOO EARLY'
            ? 'You committed before the ring landed. Let it come all the way in.'
            : 'You waited too long. Press as the ring reaches the circle, not after.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to hit</span>
    </div>
  {/if}
</div>

<style>
  .lockpick {
    aspect-ratio: 16 / 9;
  }

  .grade {
    display: inline-flex;
    gap: 8px;
    color: var(--bad);
  }

  .grade.ok {
    color: var(--good);
  }

  .pin {
    position: absolute;
    z-index: 2;
    width: 86px;
    height: 86px;
    margin: -43px 0 0 -43px;
    padding: 0;
    border-radius: 50%;
  }

  .core,
  .ring,
  .num {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .core {
    width: 86px;
    height: 86px;
    border: 3px solid var(--accent);
    border-radius: 50%;
    background: radial-gradient(circle, #35e0ff33 0%, #35e0ff0d 70%);
    box-shadow: 0 0 24px -4px #35e0ff80;
  }

  .ring {
    width: 86px;
    height: 86px;
    border: 2px solid #ffffffb0;
    border-radius: 50%;
    will-change: transform;
  }

  .num {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    pointer-events: none;
  }
</style>
