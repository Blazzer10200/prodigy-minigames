<script>
  import { games, groups, DIFFICULTIES } from './lib/games.js'
  import { bucket, rate, avg, reset } from './lib/stats.svelte.js'

  let activeId = $state(games[0].id)
  let difficulty = $state('normal')

  const active = $derived(games.find((g) => g.id === activeId))
  const Game = $derived(active.component)
  const b = $derived(bucket(activeId))
  const clear = $derived(avg(b))
</script>

<div class="app">
  <aside>
    <div class="brand">
      <h1>Prodigy <span>4.0</span></h1>
      <p>minigame practice</p>
    </div>

    {#each groups as grp (grp.name)}
      <div class="group">
        <h3 title={grp.hint}>{grp.name}</h3>
        <nav>
          {#each grp.games as g (g.id)}
            <button class="nav" class:on={g.id === activeId} onclick={() => (activeId = g.id)}>
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
          <button class:on={difficulty === d} onclick={() => (difficulty = d)}>{d}</button>
        {/each}
      </div>
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
        {#if active.config}<code class="cfg mono">{active.config}</code>{/if}
      </div>
      <p>{active.blurb}</p>
    </header>

    {#key activeId + difficulty}
      <Game {difficulty} />
    {/key}
  </main>
</div>
