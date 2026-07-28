<script>
  import { record } from '../lib/stats.svelte.js'

  let { difficulty = 'normal' } = $props()

  // targetCount on normal is the documented rythmClick value; the approach/hit windows are
  // tuned by feel, and one circle is live at a time rather than spawning on a fixed beat.
  const CFG = {
    easy: { targets: 6, approach: 1100, perfect: 90, good: 190, turns: 2, spinTime: 9000 },
    normal: { targets: 10, approach: 850, perfect: 65, good: 140, turns: 2.5, spinTime: 8000 },
    hard: { targets: 14, approach: 620, perfect: 45, good: 100, turns: 3, spinTime: 6500 }
  }

  const RING = 3.2
  const TAU = Math.PI * 2
  const HOLES = 5

  const cfg = $derived(CFG[difficulty])

  let phase = $state('idle')
  let pins = $state([])
  let index = $state(0)
  let progress = $state(0)
  let grade = $state(null)
  let offset = $state(0)
  let spun = $state(0)
  let spinLeft = $state(0)

  let dial = $state(null)
  let raf = 0
  let pinStart = 0
  let runStart = 0
  let spinStart = 0
  let lastAngle = null

  const ringScale = $derived(Math.max(0.72, 1 + (RING - 1) * (1 - progress)))
  const current = $derived(pins[index])
  const spinPct = $derived(Math.min(100, (spun / (cfg.turns * TAU)) * 100))

  function build() {
    const out = []
    let prev = null
    for (let i = 0; i < cfg.targets; i++) {
      let p
      // keep consecutive pins apart so it stays a flick, not a double-tap
      do {
        p = { x: 12 + Math.random() * 76, y: 18 + Math.random() * 64 }
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
    spun = 0
    lastAngle = null
    phase = 'playing'
    runStart = performance.now()
    nextPin()
  }

  function nextPin() {
    if (index >= pins.length) return toSpin()
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

  function toSpin() {
    cancelAnimationFrame(raf)
    phase = 'spin'
    grade = null
    spinStart = performance.now()
    spinLeft = cfg.spinTime
    raf = requestAnimationFrame(spinFrame)
  }

  function spinFrame(t) {
    if (phase !== 'spin') return
    spinLeft = cfg.spinTime - (t - spinStart)
    if (spinLeft <= 0) {
      spinLeft = 0
      grade = 'OUT OF TIME'
      return finish(false)
    }
    raf = requestAnimationFrame(spinFrame)
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
    if (phase !== 'playing' && phase !== 'spin') start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage lockpick" onpointermove={spin} role="presentation">
  <div class="hud">
    <span>
      {#if phase === 'spin'}Spin counter-clockwise{:else}Target
        <b class="mono">{Math.min(index + 1, cfg.targets)}</b> / {cfg.targets}{/if}
    </span>
    {#if phase === 'spin'}
      <span><b class="mono">{(spinLeft / 1000).toFixed(1)}s</b></span>
    {:else if grade}
      <span class="grade" class:ok={grade === 'PERFECT' || grade === 'GOOD'}>
        {grade}
        {#if grade !== 'PERFECT'}<b class="mono">{offset > 0 ? '+' : ''}{offset}ms</b>{/if}
      </span>
    {/if}
  </div>

  {#if phase === 'playing' || phase === 'spin'}
    <h4>Unlock Lock</h4>
  {/if}

  {#if phase === 'playing' && current}
    <button
      class="target"
      style="left: {current.x}%; top: {current.y}%"
      onpointerdown={hit}
      aria-label="Target {index + 1}"
    >
      <span class="ring" style="transform: translate(-50%, -50%) scale({ringScale})"></span>
      <span class="core"></span>
      <span class="num mono">{index + 1}</span>
    </button>
  {/if}

  {#if phase === 'spin'}
    <div class="spinwrap">
      <div class="spin" bind:this={dial}>
        <div class="ringtrack" style="transform: rotate({-spun}rad)">
          {#each { length: HOLES } as _, i (i)}
            <span class="hole" style="--a: {(i / HOLES) * 360}deg"></span>
          {/each}
        </div>
        <div class="pct mono">{Math.round(spinPct)}%</div>
      </div>
      <p class="spinhint">move the mouse in circles &nbsp;↺</p>
    </div>
  {/if}

  {#if phase !== 'playing' && phase !== 'spin'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Lockpick</h3>
        <p>
          Click each circle exactly as the ring closes onto it — {cfg.targets} of them, one at a
          time. Clear them all and the lock drops into a spin: swirl the mouse counter-clockwise to
          pop it.
        </p>
      {:else if phase === 'won'}
        <h3>Unlocked</h3>
        <p>All {cfg.targets} targets, then the spin. Run it again and keep the streak.</p>
      {:else}
        <h3>Snapped</h3>
        <p>
          {grade === 'TOO EARLY'
            ? 'You committed before the ring landed. Let it come all the way in.'
            : grade === 'OUT OF TIME'
              ? 'Ran out of time on the spin. Wider, faster circles cover more angle.'
              : 'You waited too long. Click as the ring reaches the circle, not after.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> to start &nbsp;·&nbsp; mouse to pick</span>
    </div>
  {/if}
</div>

<style>
  /* the stage itself is the playfield — no inner panel, circles use the whole area */
  .lockpick {
    aspect-ratio: 16 / 9;
    background: linear-gradient(180deg, #1b1d19 0%, #131511 100%);
  }

  h4 {
    position: absolute;
    top: 40px;
    left: 50%;
    z-index: 2;
    margin: 0;
    transform: translateX(-50%);
    font-size: 19px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #f2f7ee;
    text-shadow: 0 0 14px #8ede4a4d;
    pointer-events: none;
  }

  .grade {
    display: inline-flex;
    gap: 8px;
    color: #ff6b6b;
  }

  .grade.ok {
    color: #a8e86b;
  }

  .target {
    position: absolute;
    z-index: 3;
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
    border: 3px solid #8ede4a;
    border-radius: 50%;
    background: radial-gradient(circle, #1f2a17 40%, #141810 100%);
    box-shadow:
      0 0 26px -4px #8ede4aaa,
      inset 0 0 16px -4px #8ede4a66;
  }

  .ring {
    width: 86px;
    height: 86px;
    border: 2px solid #a8e86bcc;
    border-radius: 50%;
    will-change: transform;
  }

  .num {
    font-size: 22px;
    font-weight: 600;
    color: #eef6e4;
    pointer-events: none;
  }

  /* ---- spin phase ---- */

  .spinwrap {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-content: center;
    justify-items: center;
    gap: 22px;
  }

  .spin {
    position: relative;
    display: grid;
    place-items: center;
  }

  .ringtrack {
    position: relative;
    width: 240px;
    height: 240px;
    border: 24px solid #ffffff12;
    border-radius: 50%;
    will-change: transform;
  }

  .hole {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 38px;
    height: 38px;
    margin: -19px 0 0 -19px;
    border-radius: 50%;
    background: #10140d;
    box-shadow: inset 0 1px 4px #000a;
    transform: rotate(var(--a)) translateY(-120px);
  }

  .pct {
    position: absolute;
    font-size: 38px;
    font-weight: 700;
    color: #b6f562;
    text-shadow: 0 0 18px #8ede4a66;
  }

  .spinhint {
    margin: 0;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #6f7d63;
  }
</style>
