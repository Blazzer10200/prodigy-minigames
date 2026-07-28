<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // Traced from a screen recording of the live game: one circular dial, up to
  // three numbered pins alive at once, clicked in order, then a spin phase.
  // That run was 6 pins in ~5s, which is `normal`. `hard` uses the 10 pins the
  // prp-minigames docs list for rythmClick. Numbers live in lib/tuning.js.
  let { cfg } = $props()

  // The dial is drawn in a 400x400 viewBox and scaled to fit by the svg itself.
  const C = 200
  const R = 178
  const TR = 25
  const CORE = 36
  const RING = 2 // approach ring starts this many times the pin radius
  const TAU = Math.PI * 2

  let phase = $state('idle')
  let live = $state([])
  let pops = $state([])
  let index = $state(1)
  let placed = $state(0)
  let progress = $state(0)
  let grade = $state(null)
  let offset = $state(0)
  let spun = $state(0)
  let spinLeft = $state(0)
  let reason = $state(null)

  let svg = $state(null)
  let raf = 0
  let popId = 0
  let popTimers = []
  let lastPlaced = 0
  let liveSince = 0
  let runStart = 0
  let spinStart = 0
  let lastAngle = null

  const spinFrac = $derived(Math.min(1, spun / (cfg.turns * TAU)))
  // the ring closes from RING x the pin radius down onto the pin itself
  const ringR = $derived(TR * Math.max(1, 1 + (RING - 1) * (1 - progress)))
  const ticks = Array.from({ length: 8 }, (_, i) => (i * 45 - 90) * (Math.PI / 180))

  // dotted route between the pins still on the dial, in click order
  const trail = $derived.by(() => {
    const seq = [...live].sort((a, b) => a.n - b.n)
    return seq.slice(0, -1).map((p, i) => ({ a: p, b: seq[i + 1] }))
  })

  function spot() {
    // measured off the approach ring, not the pin — at full size the ring is
    // RING x wider, and letting that reach the hub is what crowded the middle
    const near = CORE + TR * RING + 6
    const far = R - TR * RING - 5

    for (let i = 0; i < 80; i++) {
      const a = Math.random() * TAU
      const d = near + Math.random() * (far - near)
      const p = { x: C + d * Math.cos(a), y: C + d * Math.sin(a) }
      if (live.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= TR * 2 + 10)) return p
    }
    return null
  }

  function addPin(now) {
    const p = spot()
    if (!p) return
    placed++
    live = [...live, { n: placed, x: p.x, y: p.y }]
    lastPlaced = now
  }

  function start() {
    stop()
    live = []
    pops = []
    index = 1
    placed = 0
    spun = 0
    reason = null
    grade = null
    offset = 0
    lastAngle = null
    progress = 0
    phase = 'playing'

    const now = performance.now()
    runStart = now
    liveSince = now
    lastPlaced = now - cfg.gap
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    if (live.length < cfg.alive && placed < cfg.pins && t - lastPlaced >= cfg.gap) addPin(t)

    progress = (t - liveSince) / cfg.approach
    if (progress > 1 + cfg.good / cfg.approach) {
      offset = Math.round(cfg.good)
      grade = 'TOO LATE'
      reason = 'late'
      return finish(false)
    }

    raf = requestAnimationFrame(frame)
  }

  function tap(e, pin) {
    e.stopPropagation()
    if (phase !== 'playing') return

    if (pin.n !== index) {
      grade = 'WRONG PIN'
      reason = 'order'
      return finish(false)
    }

    // how far the ring was from landing on the pin, in milliseconds
    const err = (progress - 1) * cfg.approach
    offset = Math.round(err)

    if (Math.abs(err) > cfg.good) {
      grade = err < 0 ? 'TOO EARLY' : 'TOO LATE'
      reason = err < 0 ? 'early' : 'late'
      return finish(false)
    }

    grade = Math.abs(err) <= cfg.perfect ? 'PERFECT' : 'GOOD'

    // leave a ring behind that expands and fades, like the real one does
    const id = ++popId
    pops = [...pops, { id, x: pin.x, y: pin.y }]
    popTimers.push(setTimeout(() => (pops = pops.filter((p) => p.id !== id)), 420))

    live = live.filter((p) => p.n !== pin.n)
    index++
    liveSince = performance.now()
    progress = 0

    if (index > cfg.pins) toSpin()
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

      // screen y grows downward, so clockwise means atan2 increasing
      spun = Math.max(0, spun + d)
      if (spun >= cfg.turns * TAU) return finish(true)
    }
    lastAngle = a
  }

  function stop() {
    cancelAnimationFrame(raf)
    popTimers.forEach(clearTimeout)
    popTimers = []
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('lockpick', won, won ? Math.round(performance.now() - runStart) : null)
  }

  // clockwise from 12 o'clock — used by the spin arc and the pin countdown ring
  function arc(frac, r, cx = C, cy = C) {
    const f = Math.min(0.9999, Math.max(0, frac))
    const a = f * TAU - Math.PI / 2
    return `M ${cx} ${cy - r} A ${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`
  }

  function key(e) {
    if (typing(e)) return
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase !== 'playing' && phase !== 'spin') start()
  }

  $effect(() => stop)
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick" onpointermove={stir} role="presentation">
  <div class="hud">
    <span>
      {#if phase === 'spin'}Spin clockwise{:else}Pin
        <b class="mono">{Math.min(index, cfg.pins)}</b> / {cfg.pins}{/if}
    </span>
    {#if phase === 'spin'}
      <span><b class="mono">{(spinLeft / 1000).toFixed(1)}s</b></span>
    {:else if grade}
      <span class="grade" class:ok={grade === 'PERFECT' || grade === 'GOOD'}>
        {grade}
        {#if grade === 'GOOD' || grade === 'TOO EARLY' || grade === 'TOO LATE'}
          <b class="mono">{offset > 0 ? '+' : ''}{offset}ms</b>
        {/if}
      </span>
    {/if}
  </div>

  <div class="field">
    <svg class="fitsvg" viewBox="0 0 400 400" bind:this={svg} aria-label="Lockpick dial">
      <defs>
        <filter id="lp-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {#each [58, 78, 98, 118, 138, 158] as r (r)}
        <circle cx={C} cy={C} {r} class="grain" />
      {/each}

      <circle cx={C} cy={C} r={R - 16} class="innerring" />

      {#each ticks as a (a)}
        <line
          x1={C + (R - 28) * Math.cos(a)}
          y1={C + (R - 28) * Math.sin(a)}
          x2={C + (R - 13) * Math.cos(a)}
          y2={C + (R - 13) * Math.sin(a)}
          class="tick"
        />
      {/each}

      <circle cx={C} cy={C} r={R} class="rim" filter="url(#lp-glow)" />

      {#if phase === 'spin'}
        <circle cx={C} cy={C} r={R * 0.58} class="dashed" />
        <path d={arc(spinFrac, R * 0.74)} class="spinarc" filter="url(#lp-glow)" />
        <text x={C} y={C + R * 0.53} class="verb">{spinFrac >= 1 ? 'OPEN' : 'SPIN'}</text>
      {/if}

      {#if phase === 'playing'}
        {#each trail as s (s.a.n)}
          <line x1={s.a.x} y1={s.a.y} x2={s.b.x} y2={s.b.y} class="trail" />
        {/each}

        {#each pops as p (p.id)}
          <circle cx={p.x} cy={p.y} r={TR} class="pop" />
        {/each}

        {#each live as p (p.n)}
          <g
            class="pin"
            class:live={p.n === index}
            onpointerdown={(e) => tap(e, p)}
            role="button"
            tabindex="-1"
            aria-label="Pin {p.n}"
          >
            <circle cx={p.x} cy={p.y} r={TR} class="core" />
            {#if p.n === index}
              <circle cx={p.x} cy={p.y} r={ringR} class="approach" />
            {/if}
            <text x={p.x} y={p.y} class="num">{p.n}</text>
          </g>
        {/each}
      {/if}

      <g class="hubwrap" style="transform: rotate({spun}rad)">
        <circle cx={C} cy={C} r={CORE} class="hub" />
        <path d="M197 172 L204 172 L204 216 L208 224 L192 227 L197 218 Z" class="pick" />
      </g>
    </svg>
  </div>

  {#if phase !== 'playing' && phase !== 'spin'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          Pins appear on the dial, up to {cfg.alive} at a time. Each one you need next has an outer circle
          closing in on it — click the moment that circle lands on the pin. Take them in numbered order.
          Clear all {cfg.pins} and the barrel starts turning: swirl the mouse clockwise until it reads
          OPEN.
        </p>
      {:else if phase === 'won'}
        <h3>Open</h3>
        <p>All {cfg.pins} pins, then the turn. Go again and keep the streak.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {reason === 'order'
            ? 'Wrong pin. They have to go in order, lowest number first.'
            : reason === 'time'
              ? 'The barrel stalled. Bigger, faster circles turn it quicker.'
              : reason === 'early'
                ? 'Too early. Let the circle come all the way in before you click.'
                : 'Too late. Click as the circle lands, not after it has closed.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to pick</span>
    </div>
  {/if}
</div>

<style>
  .lockpick {
    --ar: 1.778;
    aspect-ratio: 16 / 9;
    background: radial-gradient(circle at 50% 48%, #14180f 0%, #0a0c08 70%);
  }

  .grade {
    display: inline-flex;
    gap: 8px;
    color: #ff6b6b;
  }

  .grade.ok {
    color: #a8e86b;
  }

  .rim {
    fill: none;
    stroke: #8ee03a;
    stroke-width: 3.2;
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
    stroke-width: 4.2;
    stroke-linecap: round;
  }

  .hubwrap {
    transform-origin: 200px 200px;
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

  /* round caps on a zero-length dash render as dots — the route markers
     between pins in the real game are dotted, not solid lines */
  .trail {
    stroke: #9de84a5c;
    stroke-width: 3.4;
    stroke-linecap: round;
    stroke-dasharray: 0.01 16;
  }

  .pin {
    cursor: pointer;
    transform-box: fill-box;
    transform-origin: center;
    animation: pin-in 0.22s cubic-bezier(0.2, 1.1, 0.4, 1) both;
  }

  .core {
    fill: #8ee03a1f;
    stroke: #8ee03a70;
    stroke-width: 2;
    transition:
      fill 0.14s ease,
      stroke 0.14s ease;
  }

  .num {
    fill: #9fd96a;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 23px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: central;
    pointer-events: none;
    transition: fill 0.14s ease;
  }

  .pin.live .core {
    fill: #8ee03a3d;
    stroke: #b6f562;
    stroke-width: 2.6;
  }

  .pin.live .num {
    fill: #ecffd6;
  }

  .pin:hover .core {
    fill: #8ee03a4d;
  }

  /* the outer circle closes inward and you click as it lands on the pin */
  .approach {
    fill: none;
    stroke: #d8ffa8;
    stroke-width: 2.2;
    pointer-events: none;
  }

  .pop {
    fill: none;
    stroke: #b6f562;
    stroke-width: 2.4;
    transform-box: fill-box;
    transform-origin: center;
    animation: pin-out 0.42s ease-out both;
    pointer-events: none;
  }

  .dashed {
    fill: none;
    stroke: #8ee03a55;
    stroke-width: 2;
    stroke-dasharray: 12 10;
    animation: fade 0.3s ease both;
  }

  .spinarc {
    fill: none;
    stroke: #9de84a;
    stroke-width: 6.5;
    stroke-linecap: round;
  }

  .verb {
    fill: #b6f562;
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 23px;
    font-weight: 800;
    letter-spacing: 0.16em;
    text-anchor: middle;
    dominant-baseline: central;
  }

  @keyframes pin-in {
    from {
      opacity: 0;
      transform: scale(0.4);
    }
  }

  @keyframes pin-out {
    to {
      opacity: 0;
      transform: scale(1.9);
    }
  }
</style>
