<script>
  import { untrack } from 'svelte'
  import Tuning from './Tuning.svelte'
  import { games, groups, DIFFICULTIES } from './lib/games.js'
  import { bucket, rate, avg, reset } from './lib/stats.svelte.js'
  import { settings } from './lib/tuning.svelte.js'

  let activeId = $state(games[0].id)
  let difficulty = $state('normal')
  let applied = $state(0)

  const active = $derived(games.find((g) => g.id === activeId))
  const Game = $derived(active.component)
  const b = $derived(bucket(activeId))
  const clear = $derived(avg(b))

  // Reading the store is deliberately untracked: dragging a slider updates it
  // continuously, and a live board should not be rebuilt halfway through a
  // drag. `rev` is what makes this recompute, and it only bumps on release.
  const cfg = $derived(pick(activeId, difficulty, applied))

  function pick(id, d, rev) {
    return untrack(() => settings(id, d))
  }
</script>

<div class="app">
  <aside>
    <div class="brand">
      <h1>Minigame <span>Sandbox</span></h1>
      <p>practice, offline</p>
    </div>

    {#each groups as grp (grp.name)}
      <div class="group">
        <h3>{grp.name}</h3>
        <p class="groupHint">{grp.hint}</p>
        <nav>
          {#each grp.games as g (g.id)}
            <button
              class="nav"
              class:on={g.id === activeId}
              aria-pressed={g.id === activeId}
              onclick={() => (activeId = g.id)}
            >
              <strong>{g.name}</strong>
              <em>{g.tag}</em>
            </button>
          {/each}
        </nav>
      </div>
    {/each}

    <div class="group">
      <label for="diff">Difficulty</label>
      <div class="seg" id="diff">
        {#each DIFFICULTIES as d (d)}
          <button
            class:on={difficulty === d}
            aria-pressed={difficulty === d}
            onclick={() => (difficulty = d)}>{d}</button
          >
        {/each}
      </div>
      {#if active.config}
        <p class="segNote">Normal is the one built to match the documented config.</p>
      {/if}
    </div>

    <div class="group">
      <label for="stats">Your record</label>
      <div class="stats" id="stats">
        <div class="stat"><span>Attempts</span><b class="mono">{b.attempts}</b></div>
        <div class="stat"><span>Success</span><b class="mono">{rate(b)}%</b></div>
        <div class="stat"><span>Streak</span><b class="mono">{b.streak}</b></div>
        <div class="stat"><span>Best streak</span><b class="mono">{b.best}</b></div>
        <div class="stat">
          <span>Avg clear</span>
          <b class="mono">{clear ? (clear / 1000).toFixed(2) + 's' : '—'}</b>
        </div>
      </div>
    </div>

    <button class="reset" onclick={() => reset(activeId)}>Reset {active.name} stats</button>
  </aside>

  <main>
    <header>
      <div class="title">
        <h2>{active.name}</h2>
        <span class="tagline">{active.tag}</span>
        {#if active.config}<code class="cfg mono">{active.config}</code>{/if}
      </div>
    </header>

    <!-- the full description lives in the game's own start overlay, where it can
         quote the numbers you are actually about to play; repeating it here too
         was the same paragraph twice on screen -->
    {#key activeId + difficulty + applied}
      <div class="play"><Game {cfg} /></div>
    {/key}

    <Tuning game={activeId} {difficulty} onapply={() => applied++} />
  </main>
</div>
