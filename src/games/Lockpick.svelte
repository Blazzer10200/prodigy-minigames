<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // Traced from a screen recording of the live game: one circular dial, several
  // numbered pins alive at once with overlapping approach rings, clicked in
  // order, then a spin phase. `normal` is the 6 pins that run showed, pitched to
  // its pace; `hard` uses the 10 the prp-minigames docs list for rythmClick and
  // mixes in the arc drags. Numbers live in lib/tuning.js.
  let { cfg } = $props()

  // The dial is drawn in a 400x400 viewBox and scaled to fit by the svg itself.
  const C = 200
  const R = 178
  const TR = 25
  const CORE = 36
  const RING = 2 // approach ring starts this many times the pin radius
  const TAU = Math.PI * 2

  // Harder cars mix in a second kind of target: a rainbow-shaped track with a
  // handle at the left end that has to be dragged round to the right. Tracing
  // the curve is the whole skill — the handle only advances while the pointer
  // is near the arc, so a straight swipe through the middle does nothing.
  // Undocumented; built from a description of the live game. See docs/MINIGAMES.
  const ARC_W = 46
  const ARC_IN = 17 // the numbered circle sits in the mouth of the arch
  const ARC_D = `M ${-ARC_W} 0 A ${ARC_W} ${ARC_W} 0 0 1 ${ARC_W} 0`
  const ARC_LEN = Math.PI * ARC_W
  // most of the arc one pointer event may cover, so a jump from the left end
  // straight to the right one cannot skip the travel
  const STEP = 0.12
  // the far end only measures as exactly 1 with the pointer dead on the
  // baseline, and a hair below that reads as off the track — so the last sliver
  // of travel counts as home rather than being unreachable
  const DONE = 0.94
  const hx = (t) => ARC_W * Math.cos(Math.PI - t * Math.PI)
  const hy = (t) => -ARC_W * Math.sin(Math.PI - t * Math.PI)

  let phase = $state('idle')
  let live = $state([])
  let pops = $state([])
  let index = $state(1)
  let placed = $state(0)
  let now = $state(0)
  let grade = $state(null)
  let offset = $state(0)
  let spun = $state(0)
  let spinLeft = $state(0)
  let reason = $state(null)
  let at = $state(0)
  let dragLeft = $state(0)
  let holdFrom = $state(0)

  let svg = $state(null)
  let raf = 0
  let popId = 0
  let popTimers = []
  let lastPlaced = 0
  let nextRing = 0
  let runStart = 0
  let spinStart = 0
  let lastAngle = null
  let dragEnds = 0
  let dragSlots = new Set()
  let grab = false

  // a run has to open on an ordinary pin, and the first is never a drag, so
  // that is the most slots the arcs can take
  const drags = $derived(Math.max(0, Math.min(cfg.drags, cfg.pins - 1)))
  const spinFrac = $derived(Math.min(1, spun / (cfg.turns * TAU)))

  // Every pin on the dial closes its own ring, and they overlap: pin N's starts
  // `stagger` of a close time after pin N-1's did, so the next one is already
  // part way in when you click the current one. Appearing and starting to close
  // are separate — a pin sits there numbered for a moment first.
  const prog = (p) => Math.max(0, (now - p.ringAt) / cfg.approach)
  // the ring closes from RING x the pin radius down onto the pin itself
  const ringR = (p) => TR * (1 + (RING - 1) * Math.max(0, 1 - prog(p)))
  const ticks = Array.from({ length: 8 }, (_, i) => (i * 45 - 90) * (Math.PI / 180))

  // dotted route between the pins still on the dial, in click order
  const trail = $derived.by(() => {
    const seq = [...live].sort((a, b) => a.n - b.n)
    return seq.slice(0, -1).map((p, i) => ({ a: p, b: seq[i + 1] }))
  })

  // how much room a target needs around its centre. For a pin that is measured
  // off the approach ring, not the pin — at full size the ring is RING x wider,
  // and letting that reach the hub is what crowded the middle
  const reach = (kind) => (kind === 'drag' ? ARC_W + 6 : TR * RING)

  function spot(kind) {
    const rr = reach(kind)
    const near = CORE + rr + 6
    const far = R - rr - 5

    for (let i = 0; i < 80; i++) {
      const a = Math.random() * TAU
      const d = near + Math.random() * (far - near)
      const p = { x: C + d * Math.cos(a), y: C + d * Math.sin(a) }
      if (live.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= rr + reach(q.kind) + 10)) return p
    }
    return null
  }

  /** Which slots in the run are arc drags. Never the first — you get oriented. */
  function pickDrags() {
    const pool = []
    for (let n = 2; n <= cfg.pins; n++) pool.push(n)

    const out = new Set()
    for (let i = 0; i < Math.min(drags, pool.length); i++) {
      out.add(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    return out
  }

  function addPin(t) {
    const kind = dragSlots.has(placed + 1) ? 'drag' : 'click'
    const p = spot(kind)
    if (!p) return
    placed++
    // never hand a target a ring that is already part closed — if the dial was
    // full the schedule can fall behind the spawn, and it catches up from here
    const ringAt = placed === 1 ? t : Math.max(t, nextRing)
    nextRing = ringAt + cfg.approach * cfg.stagger
    live = [...live, { n: placed, kind, x: p.x, y: p.y, ringAt }]
    lastPlaced = t
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
    at = 0
    grab = false
    holdFrom = 0
    dragLeft = 0
    dragSlots = pickDrags()
    phase = 'playing'

    const t = performance.now()
    now = t
    runStart = t
    nextRing = t
    lastPlaced = t - cfg.gap
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    const cur = live.find((p) => p.n === index)
    const arc = cur?.kind === 'drag' && (holdFrom || t >= cur.ringAt)

    if (arc && !holdFrom) {
      holdFrom = t
      dragEnds = t + cfg.dragTime
      at = 0 // a run can hold more than one, so each starts its own travel
    }

    // With the hold on, `now` stops where it is, so every other ring keeps its
    // place and the schedule is pushed forward once the handle lands. With it
    // off the dial carries on regardless and the pattern has to be kept going
    // around the drag, which is what the live game looks like.
    const held = arc && cfg.dragHold >= 1
    if (!held) {
      now = t
      if (live.length < cfg.alive && placed < cfg.pins && t - lastPlaced >= cfg.gap) addPin(t)
    }

    if (arc) {
      dragLeft = dragEnds - t
      if (dragLeft <= 0) {
        dragLeft = 0
        grade = 'TOO SLOW'
        reason = 'drag'
        return finish(false)
      }
    } else if (cur && t - cur.ringAt > cfg.approach + cfg.good) {
      // rings land in the order they started, so the pin you owe is always the
      // one about to close — no need to watch the others
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

    // how far the ring was from landing on the pin, in milliseconds — read off
    // the clock rather than the last frame, so a click is not rounded to 16ms
    const err = performance.now() - pin.ringAt - cfg.approach
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

    if (index > cfg.pins) toSpin()
  }

  function grabHandle(e, pin) {
    e.stopPropagation()
    if (phase !== 'playing') return

    if (pin.n !== index) {
      grade = 'WRONG PIN'
      reason = 'order'
      return finish(false)
    }
    grab = true
  }

  // letting go leaves the handle where it got to — the clock is the pressure,
  // not the grip
  const release = () => (grab = false)

  function dragMove(e, pin) {
    const ctm = svg?.getScreenCTM()
    if (!ctm) return

    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse())
    const lx = p.x - pin.x
    const ly = p.y - pin.y

    // only tracks while the pointer is on the curve, so a straight swipe across
    // the middle of the rainbow moves nothing
    if (Math.abs(Math.hypot(lx, ly) - ARC_W) > cfg.dragTol) return

    // measured round the arc rather than across it, so the near-vertical ends
    // read as cleanly as the top does. Below the baseline is off the track.
    const raw = (Math.PI - Math.atan2(-ly, lx)) / Math.PI
    if (raw < 0 || raw > 1) return

    if (raw > at) at = Math.min(raw, at + STEP)
    if (at >= DONE) {
      at = 1
      landDrag(pin)
    }
  }

  function landDrag(pin) {
    // only a held dial owes catching up — if it kept running, the pins carried
    // on while you dragged and that is the whole point
    const elapsed = cfg.dragHold >= 1 ? performance.now() - holdFrom : 0
    grab = false
    holdFrom = 0
    grade = 'PULLED'

    const id = ++popId
    pops = [...pops, { id, x: pin.x, y: pin.y }]
    popTimers.push(setTimeout(() => (pops = pops.filter((p) => p.id !== id)), 420))

    live = live
      .filter((p) => p.n !== pin.n)
      .map((p) => (elapsed ? { ...p, ringAt: p.ringAt + elapsed } : p))
    nextRing += elapsed
    lastPlaced += elapsed
    now = performance.now()
    index++

    if (index > cfg.pins) toSpin()
  }

  function move(e) {
    if (phase === 'spin') return stir(e)
    if (phase !== 'playing' || !grab) return

    const cur = live.find((p) => p.n === index)
    if (cur?.kind === 'drag') dragMove(e, cur)
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

<svelte:window onkeydown={key} onpointerup={release} />

<div class="stage lockpick" onpointermove={move} role="presentation">
  <div class="hud">
    <span>
      {#if phase === 'spin'}Spin clockwise{:else if holdFrom}Drag it right{:else}Pin
        <b class="mono">{Math.min(index, cfg.pins)}</b> / {cfg.pins}{/if}
    </span>
    {#if phase === 'spin'}
      <span><b class="mono">{(spinLeft / 1000).toFixed(1)}s</b></span>
    {:else if holdFrom}
      <span><b class="mono">{(dragLeft / 1000).toFixed(1)}s</b></span>
    {:else if grade}
      <span class="grade" class:ok={grade === 'PERFECT' || grade === 'GOOD' || grade === 'PULLED'}>
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
          {#if p.kind === 'drag'}
            <g transform="translate({p.x} {p.y})">
              <g class="arc" class:live={p.n === index}>
                <path d={ARC_D} class="arctrack" />
                <path
                  d={ARC_D}
                  class="arcfill"
                  stroke-dasharray={ARC_LEN}
                  stroke-dashoffset={ARC_LEN * (1 - (p.n === index ? at : 0))}
                />
                <circle cx="0" cy={-ARC_IN} r="14" class="core" />
                <text x="0" y={-ARC_IN} class="num">{p.n}</text>
                <circle
                  cx={hx(p.n === index ? at : 0)}
                  cy={hy(p.n === index ? at : 0)}
                  r="12"
                  class="handle"
                  onpointerdown={(e) => grabHandle(e, p)}
                  role="button"
                  tabindex="-1"
                  aria-label="Drag target {p.n}"
                />
              </g>
            </g>
          {:else}
            <g
              class="pin"
              class:live={p.n === index}
              onpointerdown={(e) => tap(e, p)}
              role="button"
              tabindex="-1"
              aria-label="Pin {p.n}"
            >
              <circle cx={p.x} cy={p.y} r={TR} class="core" />
              {#if now >= p.ringAt}
                <circle cx={p.x} cy={p.y} r={ringR(p)} class="approach" />
              {/if}
              <text x={p.x} y={p.y} class="num">{p.n}</text>
            </g>
          {/if}
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
          Pins appear on the dial, up to {cfg.alive} at a time. Each one gets an outer circle that closes
          in on it — click the moment that circle lands. They overlap, so the next pin is already closing
          while you deal with this one. Take them in numbered order.
          {#if drags > 0}
            {drags === 1 ? 'One of them is' : `${drags} of them are`} a rainbow track instead: grab the
            handle and pull it round the curve to the right end before the clock runs out. Cut across
            the middle and it will not budge. The rest of the dial waits while you do it.
          {/if}
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
              : reason === 'drag'
                ? 'The handle never made it round. Follow the curve — it only moves while you are on it.'
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

  /* the outer circle closes inward and you click as it lands on the pin. Every
     live pin has one; the pin you owe next is the bright one */
  .approach {
    fill: none;
    stroke: #d8ffa859;
    stroke-width: 1.8;
    pointer-events: none;
  }

  .pin.live .approach {
    stroke: #d8ffa8;
    stroke-width: 2.2;
  }

  /* the rainbow track. Animating it needs its own group — the translate that
     places it lives on the parent, and a css transform would wipe that out */
  .arc {
    transform-box: fill-box;
    transform-origin: center;
    animation: pin-in 0.22s cubic-bezier(0.2, 1.1, 0.4, 1) both;
  }

  .arctrack {
    fill: none;
    stroke: #8ee03a2e;
    stroke-width: 9;
    stroke-linecap: round;
  }

  .arcfill {
    fill: none;
    stroke: #8ee03a5c;
    stroke-width: 9;
    stroke-linecap: round;
  }

  .arc.live .arctrack {
    stroke: #8ee03a47;
  }

  .arc.live .arcfill {
    stroke: #b6f562;
  }

  .arc.live .core {
    fill: #8ee03a3d;
    stroke: #b6f562;
    stroke-width: 2.6;
  }

  .arc.live .num {
    fill: #ecffd6;
  }

  .handle {
    fill: #0c1207;
    stroke: #8ee03a80;
    stroke-width: 2.4;
    cursor: grab;
  }

  .arc.live .handle {
    fill: #1b2a10;
    stroke: #d8ffa8;
  }

  .arc.live .handle:active {
    cursor: grabbing;
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
