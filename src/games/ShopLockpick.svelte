<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // normal is the documented config: { holeCount = 12, speed = Math.PI/1.5,
  // bounce = false }. Numbers live in lib/tuning.js.
  let { cfg } = $props()

  const C = 200
  const R = 176
  const RING = 128
  const HR = 22
  const TAU = Math.PI * 2

  let phase = $state('idle')
  let angle = $state(0)
  let index = $state(0)
  let done = $state([])
  let reason = $state(null)
  let remain = $state(0)

  let raf = 0
  let prev = 0
  let runStart = 0

  const slot = $derived(TAU / cfg.holes)
  const bar = $derived(Math.max(0, Math.min(1, remain / cfg.limit)))

  // angles start at 12 o'clock so the first hole is straight up
  const at = (i) => i * slot - Math.PI / 2

  // signed gap from the marker to the hole we want, wrapped to [-PI, PI]
  function gap() {
    let d = angle - index * slot
    while (d > Math.PI) d -= TAU
    while (d < -Math.PI) d += TAU
    return d
  }

  function start() {
    cancelAnimationFrame(raf)
    angle = -slot * 0.75
    index = 0
    done = []
    reason = null
    remain = cfg.limit
    phase = 'playing'
    prev = performance.now()
    runStart = prev
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    const dt = Math.min(0.05, (t - prev) / 1000)
    prev = t
    angle += cfg.speed * dt
    if (angle > TAU) angle -= TAU

    remain = cfg.limit - (t - runStart)
    if (remain <= 0) {
      remain = 0
      reason = 'time'
      return finish(false)
    }

    raf = requestAnimationFrame(frame)
  }

  function press() {
    if (phase !== 'playing') return

    const d = gap()
    if (Math.abs(d) > cfg.window) {
      reason = d < 0 ? 'early' : 'late'
      return finish(false)
    }

    done = [...done, index]
    index++
    if (index >= cfg.holes) finish(true)
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('shoplockpick', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (typing(e)) return
    if (e.code !== 'KeyE' && e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (e.repeat) return
    if (phase === 'playing') press()
    else start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage shoplock" onpointerdown={press} role="presentation">
  <div class="hud">
    <span>Hole <b class="mono">{Math.min(index + 1, cfg.holes)}</b> / {cfg.holes}</span>
    {#if phase === 'playing'}
      <span><b class="mono">{(remain / 1000).toFixed(1)}s</b></span>
    {/if}
  </div>

  {#if phase === 'playing'}
    <div class="timer"><i style="transform: scaleX({bar})"></i></div>
  {/if}

  <div class="field">
    <svg class="fitsvg" viewBox="0 0 400 400" aria-label="Shop lockpick barrel">
      <defs>
        <filter id="sl-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx={C} cy={C} r={RING} class="track" />
      <circle cx={C} cy={C} r={R} class="rim" filter="url(#sl-glow)" />

      {#each { length: cfg.holes } as _, i (i)}
        <circle
          cx={C + RING * Math.cos(at(i))}
          cy={C + RING * Math.sin(at(i))}
          r={HR}
          class="hole"
          class:done={done.includes(i)}
          class:next={i === index && phase === 'playing'}
        />
      {/each}

      {#if phase === 'playing'}
        <circle
          cx={C + RING * Math.cos(angle - Math.PI / 2)}
          cy={C + RING * Math.sin(angle - Math.PI / 2)}
          r="9"
          class="marker"
          filter="url(#sl-glow)"
        />
      {/if}

      <circle cx={C} cy={C} r="58" class="hub" />
      <text x={C} y={C - 10} class="cue">PRESS</text>
      <text x={C} y={C + 22} class="cuekey">E</text>
    </svg>
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Shop Lockpick</h3>
        <p>
          The pick sweeps around the barrel. Tap <kbd>E</kbd> as it crosses each of the {cfg.holes} holes,
          in order. The speed never changes, so it is one steady rhythm the whole way round.
        </p>
      {:else if phase === 'won'}
        <h3>Open</h3>
        <p>All {cfg.holes} holes set. Go again.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {reason === 'early'
            ? 'Too early. The pick had not reached the hole yet.'
            : reason === 'late'
              ? 'Too late. The pick was already past it.'
              : 'Out of time. Stay on the beat instead of waiting for a clean look.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>E</kbd> to set &nbsp;·&nbsp; <kbd>Space</kbd> to restart</span>
    </div>
  {/if}
</div>

<style>
  .shoplock {
    --ar: 1.778;
    aspect-ratio: 16 / 9;
    background: radial-gradient(circle at 50% 48%, #1b1e21 0%, #101214 72%);
  }

  .rim {
    fill: none;
    stroke: #8ee03a;
    stroke-width: 3.2;
  }

  .track {
    fill: none;
    stroke: #ffffff12;
    stroke-width: 40;
  }

  .hole {
    fill: #12150f;
    stroke: #8ee03a3d;
    stroke-width: 1.6;
    transition:
      fill 0.14s ease,
      stroke 0.14s ease;
  }

  .hole.next {
    stroke: #8ee03a99;
    stroke-width: 2.4;
  }

  .hole.done {
    fill: #8ee03a;
    stroke: #d2ff92;
    stroke-width: 2;
    transform-box: fill-box;
    transform-origin: center;
    animation: set 0.26s cubic-bezier(0.2, 1.3, 0.4, 1) both;
  }

  .marker {
    fill: #b6f562;
  }

  .hub {
    fill: #0b0e08;
    stroke: #8ee03a4d;
    stroke-width: 1.4;
  }

  .cue {
    fill: #6f8a52;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-anchor: middle;
  }

  .cuekey {
    fill: #b6f562;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 34px;
    font-weight: 800;
    text-anchor: middle;
  }

  @keyframes set {
    from {
      transform: scale(0.5);
    }
  }
</style>
