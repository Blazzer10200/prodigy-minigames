<script>
  import { record } from '../lib/stats.svelte.js'
  import { typing } from '../lib/keys.js'

  // Numbers live in lib/tuning.js.
  let { cfg } = $props()

  let phase = $state('idle')
  let round = $state(1)
  let pos = $state(0)
  let zone = $state({ start: 40, width: 15 })
  let last = $state(null)
  let remain = $state(0)

  let dir = 1
  let speed = 0
  let raf = 0
  let prev = 0
  let roundStart = 0
  let runStart = 0

  const bar = $derived(Math.max(0, Math.min(1, remain / cfg.limit)))

  function start() {
    cancelAnimationFrame(raf)
    round = 1
    last = null
    phase = 'playing'
    runStart = performance.now()
    startRound()
  }

  function startRound() {
    const width = Math.max(5, cfg.width - (round - 1) * 2)
    speed = cfg.speed * (1 + 0.18 * (round - 1))
    zone = { start: 8 + Math.random() * (84 - width), width }

    dir = Math.random() < 0.5 ? 1 : -1
    pos = dir === 1 ? 0 : 100
    remain = cfg.limit
    prev = performance.now()
    roundStart = prev
    raf = requestAnimationFrame(frame)
  }

  function frame(t) {
    if (phase !== 'playing') return

    const dt = Math.min(0.05, (t - prev) / 1000)
    prev = t
    pos += dir * speed * dt

    if (pos <= 0) {
      pos = 0
      dir = 1
    } else if (pos >= 100) {
      pos = 100
      dir = -1
    }

    remain = cfg.limit - (t - roundStart)
    if (remain <= 0) {
      remain = 0
      last = { ok: false, off: null }
      return finish(false)
    }

    raf = requestAnimationFrame(frame)
  }

  function commit() {
    if (phase !== 'playing') return
    cancelAnimationFrame(raf)

    const centre = zone.start + zone.width / 2
    const off = pos - centre
    const ok = Math.abs(off) <= zone.width / 2
    last = { ok, off: Math.round(off * 10) / 10 }

    if (!ok) return finish(false)
    if (round >= cfg.rounds) return finish(true)

    round++
    startRound()
  }

  function finish(won) {
    cancelAnimationFrame(raf)
    phase = won ? 'won' : 'lost'
    record('repair', won, won ? Math.round(performance.now() - runStart) : null)
  }

  function key(e) {
    if (typing(e)) return
    if (e.code !== 'Space' && e.code !== 'Enter' && e.code !== 'KeyE') return
    e.preventDefault()
    if (phase === 'playing') commit()
    else start()
  }

  $effect(() => () => cancelAnimationFrame(raf))
</script>

<svelte:window onkeydown={key} />

<div class="stage repair">
  <div class="hud">
    <span>Stage <b class="mono">{round}</b> / {cfg.rounds}</span>
    <span>
      {#if phase === 'playing'}<b class="mono">{(remain / 1000).toFixed(1)}s</b>{/if}
    </span>
  </div>

  {#if phase === 'playing'}
    <div class="timer"><i style="transform: scaleX({bar})"></i></div>
  {/if}

  <div class="field">
    <div class="track" onpointerdown={commit} role="presentation">
      <div class="zone" style="left: {zone.start}%; width: {zone.width}%"></div>
      <div class="marker" style="left: {pos}%"></div>
      <div class="ticks">
        {#each { length: 21 } as _, i (i)}
          <i class:major={i % 5 === 0}></i>
        {/each}
      </div>
    </div>

    {#if last}
      <p class="readout" class:ok={last.ok}>
        {#if last.off === null}
          no input
        {:else if last.ok}
          hit &nbsp;<span class="mono">{last.off > 0 ? '+' : ''}{last.off}</span> from centre
        {:else}
          missed by <span class="mono"
            >{Math.abs(Math.round((Math.abs(last.off) - zone.width / 2) * 10) / 10)}</span
          >
          {last.off > 0 ? 'right' : 'left'}
        {/if}
      </p>
    {/if}
  </div>

  {#if phase !== 'playing'}
    <div class="overlay" class:win={phase === 'won'} class:lose={phase === 'lost'}>
      {#if phase === 'idle'}
        <h3>Repair Kit</h3>
        <p>
          Stop the marker inside the green zone. {cfg.rounds} stages — the zone narrows and the sweep
          speeds up each time.
        </p>
      {:else if phase === 'won'}
        <h3>Repaired</h3>
        <p>All {cfg.rounds} stages clean. Bump the difficulty when this stops feeling tight.</p>
      {:else}
        <h3>Botched</h3>
        <p>
          {last?.off === null
            ? 'You never committed. A late guess still beats no input at all.'
            : 'Outside the zone. Fire as the marker enters the green, not once it covers the centre.'}
        </p>
      {/if}
      <button class="btn" onclick={start}>{phase === 'idle' ? 'Start' : 'Retry'}</button>
      <span class="keyhint"><kbd>Space</kbd> / <kbd>E</kbd> to commit</span>
    </div>
  {/if}
</div>

<style>
  .repair {
    aspect-ratio: 16 / 7;
  }

  .repair .field {
    align-content: center;
    justify-items: stretch;
    gap: 20px;
    padding-inline: 22px;
  }

  .track {
    position: relative;
    width: 100%;
    height: min(22cqh, 74px);
    border: 1px solid var(--line);
    border-radius: 10px;
    background: #0c121b;
    cursor: pointer;
  }

  .zone {
    position: absolute;
    top: 0;
    bottom: 0;
    border-left: 1px solid #38e08b66;
    border-right: 1px solid #38e08b66;
    background: linear-gradient(180deg, #38e08b3d, #38e08b14);
  }

  .marker {
    position: absolute;
    top: -7px;
    bottom: -7px;
    width: 3px;
    margin-left: -1.5px;
    border-radius: 2px;
    background: var(--accent);
    box-shadow: 0 0 16px 1px #35e0ffcc;
    will-change: left;
  }

  .ticks {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    justify-content: space-between;
  }

  .ticks i {
    width: 1px;
    height: 7px;
    background: #ffffff1a;
  }

  .ticks i.major {
    height: 13px;
    background: #ffffff2e;
  }

  .readout {
    margin: 0;
    justify-self: center;
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--bad);
  }

  .readout.ok {
    color: var(--good);
  }
</style>
