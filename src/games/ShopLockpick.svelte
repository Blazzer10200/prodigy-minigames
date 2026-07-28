<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  // normal mirrors the documented config: { holeCount = 12, speed = "Math.PI/1.5", bounce = false }
  const CFG = {
    easy: { holes: 8, speed: Math.PI / 2.4, window: 0.24, limit: 40000 },
    normal: { holes: 12, speed: Math.PI / 1.5, window: 0.17, limit: 35000 },
    hard: { holes: 14, speed: Math.PI / 1.05, window: 0.12, limit: 30000 }
  }

  const TAU = Math.PI * 2
  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let angle = $state(0)
  let index = $state(0)
  let done = $state([])
  let note = $state(null)
  let remain = $state(0)

  let raf = 0
  let prev = 0
  let runStart = 0

  const slot = $derived(TAU / cfg.holes)
  const bar = $derived(Math.max(0, Math.min(1, remain / cfg.limit)))

  // signed distance from the marker to the hole we currently want, wrapped to [-PI, PI]
  function delta() {
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
    note = null
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
      note = 'timeout'
      return finish(false)
    }

    raf = requestAnimationFrame(frame)
  }

  function press() {
    if (phase !== 'playing') return

    const d = delta()
    if (Math.abs(d) > cfg.window) {
      note = d < 0 ? 'early' : 'late'
      return finish(false)
    }

    done = [...done, index]
    index++
    if (index >= cfg.holes) return finish(true)
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('shoplockpick', won, won ? Math.round(performance.now() - runStart) : null)
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

<div class="stage shoplock" onpointerdown={press} role="presentation">
  <div class="hud">
    <span>Hole <b class="mono">{Math.min(index + 1, cfg.holes)}</b> / {cfg.holes}</span>
    <span>
      {#if phase === 'playing'}<b class="mono">{(remain / 1000).toFixed(1)}s</b>{/if}
    </span>
  </div>

  {#if phase === 'playing'}
    <div class="timer"><i style="transform: scaleX({bar})"></i></div>
  {/if}

  <div class="label">Click E to open lock</div>

  <div class="ring">
    {#each { length: cfg.holes } as _, i (i)}
      <span
        class="hole"
        class:done={done.includes(i)}
        class:next={i === index && phase === 'playing'}
        style="--a: {i * slot}rad"
      ></span>
    {/each}
    <div class="marker" style="transform: rotate({angle}rad)"><i></i></div>
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Shop Lockpick</h3>
        <p>
          The pick sweeps the barrel. Tap <kbd>E</kbd> as it passes each of the {cfg.holes} holes, in
          order. It never changes pace, so this is one steady rhythm all the way round.
        </p>
      {:else if phase === 'won'}
        <h3>Barrel Open</h3>
        <p>All {cfg.holes} holes set. Go again.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {note === 'early'
            ? 'Too early — the pick had not reached the hole yet.'
            : note === 'late'
              ? 'Too late — the pick was already past it.'
              : 'Ran out of time. Keep the rhythm going instead of waiting for a clean look.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>E</kbd> to set &nbsp;·&nbsp; <kbd>Space</kbd> to restart</span>
    </div>
  {/if}
</div>

<style>
  .shoplock {
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 26px;
    aspect-ratio: 16 / 10;
    padding: 56px 24px 28px;
    background: linear-gradient(180deg, #35383c 0%, #292c30 100%);
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
    background: linear-gradient(90deg, #8ede4a, #ffb545);
  }

  .label {
    z-index: 2;
    padding: 7px 16px;
    border-radius: 6px;
    background: #1b1e21e6;
    box-shadow: 0 2px 10px #0008;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: #dfe7f0;
  }

  .ring {
    position: relative;
    z-index: 2;
    width: 270px;
    height: 270px;
    border: 30px solid #ffffff14;
    border-radius: 50%;
  }

  .hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 40px;
    height: 40px;
    margin: -20px 0 0 -20px;
    border-radius: 50%;
    background: #191c1a;
    box-shadow: inset 0 1px 4px #000a;
    transform: rotate(var(--a)) translateY(-135px);
    transition: background 0.1s linear;
  }

  .hole.next {
    background: #2c3326;
    box-shadow:
      inset 0 1px 4px #000a,
      0 0 0 2px #8ede4a55;
  }

  .hole.done {
    background: #8ede4a;
    box-shadow: 0 0 16px -3px #8ede4a;
  }

  .marker {
    position: absolute;
    inset: -30px;
    will-change: transform;
  }

  .marker i {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border-radius: 50%;
    background: #b6f562;
    box-shadow: 0 0 16px 2px #b6f562cc;
    transform: translateY(-135px);
  }

  .overlay kbd,
  .keyhint kbd {
    padding: 2px 7px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: #0e141d;
    font-family: inherit;
    font-size: 0.9em;
    color: var(--text);
  }
</style>
