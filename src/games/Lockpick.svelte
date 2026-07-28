<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  // Geometry and behaviour are traced off a screen recording of the real thing:
  // one circular dial, up to three numbered targets alive at once, clicked in
  // ascending order, then a spin arc that fills from 12 o'clock.
  // The run in the recording was 6 targets in ~5s, which is `normal` here.
  // `hard` uses the documented rythmClick targetCount of 10.
  const CFG = {
    easy: { targets: 5, maxActive: 3, life: 4200, gap: 420, turns: 1.5, spinTime: 10000 },
    normal: { targets: 6, maxActive: 3, life: 3100, gap: 340, turns: 2, spinTime: 9000 },
    hard: { targets: 10, maxActive: 4, life: 2200, gap: 240, turns: 2.5, spinTime: 7500 }
  }

  // svg user units — the dial is drawn in a 400x400 box and scaled by CSS
  const C = 200
  const R = 190
  const TR = 29 // target radius
  const CORE = 44 // centre hub radius
  const TAU = Math.PI * 2

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let live = $state([])
  let index = $state(1)
  let spawned = $state(0)
  let activeLeft = $state(1)
  let spun = $state(0)
  let spinLeft = $state(0)
  let reason = $state(null)

  let svg = $state(null)
  let raf = 0
  let lastSpawn = 0
  let activeSince = 0
  let runStart = 0
  let spinStart = 0
  let lastAngle = null

  const spinFrac = $derived(Math.min(1, spun / (cfg.turns * TAU)))
  const ticks = $derived(Array.from({ length: 8 }, (_, i) => (i * 45 - 90) * (Math.PI / 180)))

  // the dotted route the pick takes, drawn between targets still on the dial
  const trail = $derived.by(() => {
    const seq = [...live].sort((a, b) => a.n - b.n)
    return seq.slice(0, -1).map((p, i) => ({ a: p, b: seq[i + 1] }))
  })

  function place() {
    // polar placement keeps every target inside the dial and clear of the hub
    const min = CORE + TR + 8
    const max = R - TR - 14

    for (let attempt = 0; attempt < 80; attempt++) {
      const a = Math.random() * TAU
      const d = min + Math.random() * (max - min)
      const p = { x: C + d * Math.cos(a), y: C + d * Math.sin(a) }
      if (live.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= TR * 2 + 12)) return p
    }
    return null
  }

  function spawn(now) {
    const p = place()
    if (!p) return
    spawned++
    live = [...live, { n: spawned, x: p.x, y: p.y, born: now }]
    lastSpawn = now
  }

  function start() {
    cancelAnimationFrame(raf)
    live = []
    index = 1
    spawned = 0
    spun = 0
    reason = null
    lastAngle = null
    activeLeft = 1
    phase = 'playing'

    const now = performance.now()
    runStart = now
    activeSince = now
    lastSpawn = now - cfg.gap
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    if (live.length < cfg.maxActive && spawned < cfg.targets && t - lastSpawn >= cfg.gap) spawn(t)

    activeLeft = 1 - (t - activeSince) / cfg.life
    if (activeLeft <= 0) {
      activeLeft = 0
      reason = 'slow'
      return finish(false)
    }

    raf = requestAnimationFrame(frame)
  }

  function tap(e, n) {
    e.stopPropagation()
    if (phase !== 'playing') return

    if (n !== index) {
      reason = 'order'
      return finish(false)
    }

    live = live.filter((p) => p.n !== n)
    index++
    activeSince = performance.now()
    activeLeft = 1

    if (index > cfg.targets) toSpin()
  }

  function toSpin() {
    cancelAnimationFrame(raf)
    phase = 'spin'
    spinStart = performance.now()
    spinLeft = cfg.spinTime
    raf = requestAnimationFrame(spinFrame)
  }

  function spinFrame(t) {
    if (phase !== 'spin') return
    spinLeft = cfg.spinTime - (t - spinStart)
    if (spinLeft <= 0) {
      spinLeft = 0
      reason = 'time'
      return finish(false)
    }
    raf = requestAnimationFrame(spinFrame)
  }

  function stir(e) {
    if (phase !== 'spin' || !svg) return

    const r = svg.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    if (Math.hypot(dx, dy) < r.width * 0.08) {
      lastAngle = null
      return
    }

    const a = Math.atan2(dy, dx)
    if (lastAngle !== null) {
      let d = a - lastAngle
      while (d > Math.PI) d -= TAU
      while (d < -Math.PI) d += TAU

      // screen y grows downward, so counter-clockwise means atan2 decreasing
      spun = Math.max(0, spun - d)
      if (spun >= cfg.turns * TAU) return finish(true)
    }
    lastAngle = a
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('lockpick', won, won ? Math.round(performance.now() - runStart) : null)
  }

  // clockwise from 12 o'clock, used for both the spin arc and the target timer ring
  function arc(frac, r, cx = C, cy = C) {
    const f = Math.min(0.9999, Math.max(0, frac))
    const a = f * TAU - Math.PI / 2
    return `M ${cx} ${cy - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  }

  function key(e) {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase !== 'playing' && phase !== 'spin') start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick" onpointermove={stir} role="presentation">
  <div class="hud">
    <span>
      {#if phase === 'spin'}Spin counter-clockwise{:else}Pin
        <b class="mono">{Math.min(index, cfg.targets)}</b> / {cfg.targets}{/if}
    </span>
    {#if phase === 'spin'}
      <span><b class="mono">{(spinLeft / 1000).toFixed(1)}s</b></span>
    {/if}
  </div>

  <div class="dialwrap">
    <svg viewBox="0 0 400 400" bind:this={svg} aria-label="Lockpick dial">
      <defs>
        <filter id="lp-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <!-- faint concentric texture inside the barrel -->
      {#each [62, 84, 106, 128, 150, 170] as r (r)}
        <circle cx={C} cy={C} {r} class="grain" />
      {/each}

      <circle cx={C} cy={C} r={R - 17} class="innerring" />

      {#each ticks as a (a)}
        <line
          x1={C + (R - 30) * Math.cos(a)}
          y1={C + (R - 30) * Math.sin(a)}
          x2={C + (R - 14) * Math.cos(a)}
          y2={C + (R - 14) * Math.sin(a)}
          class="tick"
        />
      {/each}

      <circle cx={C} cy={C} r={R} class="rim" filter="url(#lp-glow)" />

      {#if phase === 'spin'}
        <circle cx={C} cy={C} r={R * 0.58} class="dashed" />
        <path d={arc(spinFrac, R * 0.73)} class="spinarc" filter="url(#lp-glow)" />
        <text x={C} y={C + R * 0.52} class="verb">{spinFrac >= 1 ? 'OPEN' : 'SPIN'}</text>
      {/if}

      {#if phase === 'playing'}
        {#each trail as s (s.a.n)}
          <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} class="trail" />
        {/each}

        {#each live as p (p.n)}
          <g
            class="target"
            class:active={p.n === index}
            onpointerdown={(e) => tap(e, p.n)}
            role="button"
            tabindex="-1"
            aria-label="Pin {p.n}"
          >
            <circle cx={p.x} cy={p.y} r={TR} class="core" />
            {#if p.n === index}
              <path d={arc(activeLeft, TR + 7, p.x, p.y)} class="clock" />
            {/if}
            <text x={p.x} y={p.y} class="num">{p.n}</text>
          </g>
        {/each}
      {/if}

      <!-- hub + pick, rotates once the barrel is turning -->
      <g style="transform: rotate({-spun}rad); transform-origin: {C}px {C}px">
        <circle cx={C} cy={C} r={CORE} class="hub" />
        <path d="M197 166 L205 166 L205 218 L209 227 L191 230 L197 220 Z" class="pick" />
      </g>
    </svg>
  </div>

  {#if phase !== 'playing' && phase !== 'spin'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          Up to {cfg.maxActive} pins sit on the dial at once. Click them in numbered order — the live
          one carries a countdown ring. Clear all {cfg.targets} and the barrel starts turning: swirl
          the mouse counter-clockwise until it reads OPEN.
        </p>
      {:else if phase === 'won'}
        <h3>Open</h3>
        <p>All {cfg.targets} pins, then the turn. Run it again and hold the streak.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {reason === 'order'
            ? 'Wrong pin. They have to go in numbered order, lowest first.'
            : reason === 'time'
              ? 'The barrel stalled. Wider, faster circles cover more angle per second.'
              : 'You sat on a pin too long. Read the next number while you are still clicking the current one.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to pick</span>
    </div>
  {/if}
</div>

<style>
  .lockpick {
    aspect-ratio: 16 / 9;
    background: radial-gradient(circle at 50% 46%, #14180f 0%, #0a0c08 70%);
  }

  .dialwrap {
    position: absolute;
    inset: 18px;
    display: grid;
    place-items: center;
  }

  svg {
    height: 100%;
    max-width: 100%;
    overflow: visible;
  }

  .rim {
    fill: none;
    stroke: #8ee03a;
    stroke-width: 3.4;
  }

  .innerring {
    fill: none;
    stroke: #8ee03a4d;
    stroke-width: 1.2;
  }

  .grain {
    fill: none;
    stroke: #8ee03a0f;
    stroke-width: 1;
  }

  .tick {
    stroke: #a8f55c;
    stroke-width: 4.5;
    stroke-linecap: round;
  }

  .hub {
    fill: #070a05;
    stroke: #8ee03a99;
    stroke-width: 1.6;
  }

  .pick {
    fill: #070a05;
    stroke: #9de84a;
    stroke-width: 1.8;
    stroke-linejoin: round;
  }

  /* round caps on a zero-length dash render as dots, which is how the real
     route markers between pins look */
  .trail {
    stroke: #9de84a66;
    stroke-width: 3.6;
    stroke-linecap: round;
    stroke-dasharray: 0.01 17;
  }

  .target {
    cursor: pointer;
  }

  .core {
    fill: #8ee03a1f;
    stroke: #8ee03a70;
    stroke-width: 2;
    transition:
      fill 0.12s ease,
      stroke 0.12s ease;
  }

  .num {
    fill: #9fd96a;
    font-family: "Inter", system-ui, sans-serif;
    font-size: 27px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
    transition: fill 0.12s ease;
  }

  .target.active .core {
    fill: #8ee03a3d;
    stroke: #b6f562;
    stroke-width: 2.6;
  }

  .target.active .num {
    fill: #ecffd6;
  }

  .clock {
    fill: none;
    stroke: #b6f562;
    stroke-width: 2.4;
    stroke-linecap: round;
    pointer-events: none;
  }

  .dashed {
    fill: none;
    stroke: #8ee03a55;
    stroke-width: 2;
    stroke-dasharray: 13 11;
  }

  .spinarc {
    fill: none;
    stroke: #9de84a;
    stroke-width: 7;
    stroke-linecap: round;
  }

  .verb {
    fill: #b6f562;
    font-family: "Inter", system-ui, sans-serif;
    font-size: 25px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-anchor: middle;
    dominant-baseline: central;
  }
</style>
