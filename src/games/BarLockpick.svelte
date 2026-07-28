<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // The entry the docs label `lockpick` — a straight bar of holes, not the
  // vehicle one. normal is the documented config: { holeCount = 8, speed = 10 }.
  //
  // The docs give no unit for `speed`. It is read here as 1/25th of a bar width
  // per second, so the documented 10 is a 2.5s sweep. That is not a guess at the
  // real unit — it is picked so the hit window lands at ~80ms, the same as
  // shopLockpick's documented speed and our window give it. Any faster reading
  // makes a documented game harsher than the one game we can calibrate against.
  // Numbers live in lib/tuning.js.
  let { cfg } = $props()

  const W = 400
  const H = 150
  const X0 = 30
  const X1 = 370
  const SPAN = X1 - X0
  const Y = 84
  const HR = 15

  let phase = $state('idle')
  let pos = $state(0)
  let dir = $state(1)
  let index = $state(0)
  let reason = $state(null)
  let remain = $state(0)

  let raf = 0
  let prev = 0
  let runStart = 0

  const bar = $derived(Math.max(0, Math.min(1, remain / cfg.limit)))
  // each hole sits in the middle of its own slot, so the run reads evenly
  const holes = $derived(Array.from({ length: cfg.holes }, (_, i) => (i + 0.5) / cfg.holes))

  const px = (f) => X0 + f * SPAN

  function start() {
    cancelAnimationFrame(raf)
    pos = 0
    dir = 1
    index = 0
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

    pos += dir * (cfg.speed / 25) * dt
    // the pick runs the bar and turns at each end rather than wrapping
    if (pos >= 1) {
      pos = 1
      dir = -1
    } else if (pos <= 0) {
      pos = 0
      dir = 1
    }

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

    const d = pos - holes[index]
    if (Math.abs(d) > cfg.window) {
      reason = 'miss'
      return finish(false)
    }

    index++
    if (index >= cfg.holes) finish(true)
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('barlockpick', won, won ? Math.round(performance.now() - runStart) : null)
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

<div class="stage barlock" onpointerdown={press} role="presentation">
  <div class="timer"><i style="transform: scaleX({bar})"></i></div>

  <div class="hud">
    <span>Hole <b class="mono">{Math.min(index + 1, cfg.holes)}</b> / {cfg.holes}</span>
    <span><b class="mono">{(remain / 1000).toFixed(1)}s</b></span>
  </div>

  <div class="field">
    <svg class="fitsvg" viewBox="0 0 {W} {H}" aria-label="Lockpick bar">
      <rect x={X0 - 12} y={Y - 30} width={SPAN + 24} height="60" rx="10" class="barrel" />
      <line x1={X0} y1={Y} x2={X1} y2={Y} class="rail" />

      {#each holes as f, i (i)}
        <circle
          cx={px(f)}
          cy={Y}
          r={HR}
          class="hole"
          class:done={i < index}
          class:next={i === index}
        />
        {#if i === index && phase === 'playing'}
          <!-- the test is on horizontal distance only, so the tolerance is drawn
               as a band rather than a ring, which would over-promise it -->
          <rect
            x={px(f) - cfg.window * SPAN}
            y={Y - 30}
            width={cfg.window * SPAN * 2}
            height="60"
            class="window"
          />
        {/if}
        <text x={px(f)} y={Y + 42} class="num">{i + 1}</text>
      {/each}

      {#if phase === 'playing'}
        <g style="transform: translateX({px(pos) - W / 2}px)">
          <line x1={W / 2} y1={Y - 34} x2={W / 2} y2={Y + 34} class="pick" />
          <circle cx={W / 2} cy={Y - 38} r="5" class="pickhead" />
        </g>
      {/if}
    </svg>
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Bar Lockpick</h3>
        <p>
          A pick runs the bar and turns at each end. Tap <kbd>E</kbd> as it crosses each hole, left
          to right in order. All {cfg.holes} before the timer runs out.
        </p>
      {:else if phase === 'won'}
        <h3>Open</h3>
        <p>All {cfg.holes} holes. Go again and keep the streak.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {reason === 'time'
            ? 'Out of time. Commit as the pick reaches the hole, not after it passes.'
            : 'Missed the hole. The pick has to be inside the band when you press.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>E</kbd> to pick &nbsp;·&nbsp; <kbd>Space</kbd> to start</span>
    </div>
  {/if}
</div>

<style>
  .barlock {
    aspect-ratio: 16 / 9;
    background: radial-gradient(circle at 50% 46%, #101a14 0%, #080c0a 70%);
  }

  .barrel {
    fill: #0d141c;
    stroke: var(--line);
    stroke-width: 1.5;
  }

  .rail {
    stroke: #223040;
    stroke-width: 2;
  }

  .hole {
    fill: #070b10;
    stroke: #2b3a4d;
    stroke-width: 2;
  }

  .hole.done {
    fill: #38e08b26;
    stroke: var(--good);
  }

  .hole.next {
    stroke: var(--accent);
  }

  .window {
    fill: #35e0ff14;
    stroke: #35e0ff3d;
    stroke-width: 1;
  }

  .pick {
    stroke: var(--warn);
    stroke-width: 2.5;
    stroke-linecap: round;
  }

  .pickhead {
    fill: var(--warn);
  }

  .num {
    fill: var(--muted);
    font-size: 12px;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }
</style>
