<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  // Phase 1 mirrors the documented rythmClick config: { targetCount = 10, interval = 300 }.
  // approach / window / turns / spinTime are not published — inferred, tune these first.
  const CFG = {
    easy: { targetCount: 6, interval: 400, approach: 1100, window: 190, turns: 2, spinTime: 9000 },
    normal: {
      targetCount: 10,
      interval: 300,
      approach: 900,
      window: 150,
      turns: 2.5,
      spinTime: 8000
    },
    hard: { targetCount: 14, interval: 240, approach: 750, window: 110, turns: 3, spinTime: 6500 }
  }

  const TAU = Math.PI * 2
  const HOLES = 5

  // playfield box + minimum centre-to-centre gap, both as % of the square panel
  const BOX = { lo: 19, hi: 81 }
  const MIN_GAP = 29

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let targets = $state([])
  let index = $state(0)
  let now = $state(0)
  let spun = $state(0)
  let note = $state(null)
  let offset = $state(0)

  let dial = $state(null)
  let raf = 0
  let runStart = 0
  let spinStart = 0
  let lastAngle = null

  const hitAt = (i) => i * cfg.interval + cfg.approach

  // how many circles share the screen at any moment
  const onScreen = $derived(Math.ceil(cfg.approach / cfg.interval) + 1)

  const visible = $derived(
    targets
      .map((t, i) => ({ ...t, i, progress: (now - i * cfg.interval) / cfg.approach }))
      .filter((t) => t.i >= index && t.progress >= 0 && t.progress <= 1 + cfg.window / cfg.approach)
  )

  const spinPct = $derived(Math.min(100, (spun / (cfg.turns * TAU)) * 100))
  const spinLeft = $derived(Math.max(0, cfg.spinTime - (now - spinStart)))

  // Spacing has to hold across every circle still on screen, not just the previous one —
  // checking only out.at(-1) let non-adjacent circles stack on top of each other.
  // Best-candidate sampling: keep the roomy picks and choose among them, so the spread is
  // guaranteed without the layout always snapping to the far corner.
  function build() {
    const out = []

    for (let i = 0; i < cfg.targetCount; i++) {
      const live = out.slice(-onScreen)
      const roomy = []
      let best = null
      let bestGap = -1

      for (let c = 0; c < 30; c++) {
        const p = {
          x: BOX.lo + Math.random() * (BOX.hi - BOX.lo),
          y: BOX.lo + Math.random() * (BOX.hi - BOX.lo)
        }

        let gap = Infinity
        for (const q of live) gap = Math.min(gap, Math.hypot(p.x - q.x, p.y - q.y))

        if (gap >= MIN_GAP) roomy.push(p)
        if (gap > bestGap) {
          bestGap = gap
          best = p
        }
      }

      out.push(roomy.length ? roomy[Math.floor(Math.random() * roomy.length)] : best)
    }

    return out
  }

  function start() {
    cancelAnimationFrame(raf)
    targets = build()
    index = 0
    now = 0
    spun = 0
    note = null
    offset = 0
    lastAngle = null
    phase = 'click'
    runStart = performance.now()
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    now = t - runStart

    if (phase === 'click') {
      if (now > hitAt(index) + cfg.window) {
        note = 'skipped'
        return finish(false)
      }
    } else if (phase === 'spin') {
      if (now - spinStart > cfg.spinTime) {
        note = 'spin-timeout'
        return finish(false)
      }
    } else {
      return
    }

    raf = requestAnimationFrame(frame)
  }

  function hit(e, i) {
    e.stopPropagation()
    if (phase !== 'click') return

    if (i !== index) {
      note = 'out-of-order'
      return finish(false)
    }

    const err = now - hitAt(index)
    offset = Math.round(err)

    if (Math.abs(err) > cfg.window) {
      note = err < 0 ? 'early' : 'late'
      return finish(false)
    }

    index++
    if (index >= targets.length) {
      phase = 'spin'
      spinStart = now
      lastAngle = null
    }
  }

  function spin(e) {
    if (phase !== 'spin' || !dial) return

    const r = dial.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)

    if (Math.hypot(dx, dy) < 26) {
      lastAngle = null
      return
    }

    const a = Math.atan2(dy, dx)

    if (lastAngle !== null) {
      let d = a - lastAngle
      while (d > Math.PI) d -= TAU
      while (d < -Math.PI) d += TAU

      // screen-space y grows downward, so counter-clockwise means atan2 decreasing
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

  function key(e) {
    if (e.code !== 'Space' && e.code !== 'Enter') return
    e.preventDefault()
    if (phase === 'idle' || phase === 'won' || phase === 'lost') start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick">
  <div class="hud">
    <span>
      {#if phase === 'spin'}Spin counter-clockwise{:else}Target
        <b class="mono">{Math.min(index + 1, cfg.targetCount)}</b> / {cfg.targetCount}{/if}
    </span>
    <span>
      {#if phase === 'spin'}<b class="mono">{(spinLeft / 1000).toFixed(1)}s</b>{/if}
    </span>
  </div>

  <div class="wrap">
    <h4>Unlock Lock</h4>

    <div class="panel" onpointermove={spin} role="presentation">
      {#if phase === 'click'}
        <svg class="links" viewBox="0 0 100 100">
          {#each visible.slice(0, -1) as t, k (t.i)}
            <line x1={t.x} y1={t.y} x2={visible[k + 1].x} y2={visible[k + 1].y} />
          {/each}
        </svg>

        {#each visible as t (t.i)}
          <button
            class="target"
            class:due={t.i === index}
            style="left: {t.x}%; top: {t.y}%; opacity: {Math.min(1, t.progress * 6)}"
            onpointerdown={(e) => hit(e, t.i)}
            aria-label="Target {t.i + 1}"
          >
            <span class="ring" style="transform: scale({Math.max(1, 1 + 1.7 * (1 - t.progress))})"
            ></span>
            <span class="core"></span>
            <span class="num mono">{t.i + 1}</span>
          </button>
        {/each}
      {:else if phase === 'spin'}
        <div class="spin" bind:this={dial}>
          <div class="ringtrack" style="transform: rotate({-spun}rad)">
            {#each { length: HOLES } as _, i (i)}
              <span class="hole" style="--a: {(i / HOLES) * 360}deg"></span>
            {/each}
          </div>
          <div class="pct mono">{Math.round(spinPct)}%</div>
          <div class="spinhint">move the mouse in circles &nbsp;↺</div>
        </div>
      {/if}
    </div>
  </div>

  {#if phase === 'idle' || phase === 'won' || phase === 'lost'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          Click the numbered circles in order as each approach ring lands — {cfg.targetCount}
          of them, one every {cfg.interval}ms. Clear them all and the lock drops into a spin phase:
          swirl the mouse counter-clockwise to pop it.
        </p>
      {:else if phase === 'won'}
        <h3>Unlocked</h3>
        <p>Clean run — all {cfg.targetCount} targets, then the spin. Go again.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {note === 'early'
            ? `Too early by ${Math.abs(offset)}ms — let the ring reach the circle.`
            : note === 'late'
              ? `Too late by ${offset}ms — commit as the ring lands, not after.`
              : note === 'out-of-order'
                ? 'Wrong circle. They have to go in numbered order.'
                : note === 'spin-timeout'
                  ? 'Ran out of time on the spin. Wider, faster circles cover more angle.'
                  : 'A target slipped past untouched. Keep your eye on the lowest number.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to pick</span>
    </div>
  {/if}
</div>

<style>
  .lockpick {
    display: grid;
    place-items: stretch;
    aspect-ratio: 4 / 3;
    padding: 52px 24px 26px;
    background: linear-gradient(180deg, #1b1d19 0%, #131511 100%);
  }

  /* the panel row must be a definite size — its children are all absolutely positioned,
     so an auto row collapses and `height: 100%` on the panel resolves to nothing */
  .wrap {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    justify-items: center;
    gap: 14px;
    min-height: 0;
    z-index: 2;
  }

  h4 {
    margin: 0;
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f2f7ee;
    text-shadow: 0 0 14px #8ede4a4d;
  }

  .panel {
    position: relative;
    overflow: hidden;
    height: 100%;
    max-width: 100%;
    aspect-ratio: 1;
    border-radius: 16px;
    background: #171a15;
    box-shadow: inset 0 0 40px #0000004d;
  }

  .links {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .links line {
    stroke: #8ede4a4d;
    stroke-width: 0.35;
  }

  .target {
    position: absolute;
    z-index: 2;
    width: 14%;
    aspect-ratio: 1;
    padding: 0;
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .core,
  .ring,
  .num {
    position: absolute;
    inset: 0;
    border-radius: 50%;
  }

  .core {
    border: 3px solid #8ede4a;
    background: radial-gradient(circle, #1f2a17 40%, #141810 100%);
    box-shadow:
      0 0 22px -4px #8ede4aaa,
      inset 0 0 14px -4px #8ede4a66;
  }

  .ring {
    border: 2px solid #a8e86bcc;
    will-change: transform;
  }

  .target.due .core {
    border-color: #b6f562;
    box-shadow:
      0 0 30px -2px #b6f562,
      inset 0 0 16px -4px #b6f56288;
  }

  .num {
    display: grid;
    place-items: center;
    font-size: clamp(13px, 1.4vw, 22px);
    font-weight: 600;
    color: #eef6e4;
    pointer-events: none;
  }

  /* ---- spin phase ---- */

  .spin {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 10px;
  }

  .ringtrack {
    position: relative;
    width: 210px;
    height: 210px;
    border: 22px solid #ffffff12;
    border-radius: 50%;
    will-change: transform;
  }

  .hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 34px;
    height: 34px;
    margin: -17px 0 0 -17px;
    border-radius: 50%;
    background: #10140d;
    box-shadow: inset 0 1px 4px #000a;
    transform: rotate(var(--a)) translateY(-105px);
  }

  .pct {
    position: absolute;
    font-size: 34px;
    font-weight: 700;
    color: #b6f562;
    text-shadow: 0 0 18px #8ede4a66;
  }

  .spinhint {
    position: absolute;
    bottom: -14px;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #6f7d63;
    white-space: nowrap;
  }
</style>
