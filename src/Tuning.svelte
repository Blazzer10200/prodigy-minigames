<script>
  import {
    fields,
    settings,
    edited,
    setValue,
    revert,
    presetsFor,
    savePreset,
    applyPreset,
    deletePreset
  } from './lib/tuning.svelte.js'

  // Difficulty is the control almost everyone wants. The individual numbers are
  // kept behind a second click so the panel opens as a short explanation rather
  // than a wall of sliders.
  let { game, difficulty, onapply } = $props()

  let open = $state(false)
  let advanced = $state(false)
  let name = $state('')

  const knobs = $derived(fields(game))
  const values = $derived(settings(game, difficulty))
  const presets = $derived(presetsFor(game))
  const dirty = $derived(edited(game, difficulty))

  // sliders update the store as you drag, but the game only picks the new
  // numbers up on release — otherwise a half-dragged grid size reaches it
  function drag(key, e) {
    setValue(game, difficulty, key, e.currentTarget.value)
  }

  function apply() {
    onapply()
  }

  function show(f, v) {
    const dp = String(f.step).split('.')[1]?.length ?? 0
    return dp ? v.toFixed(dp) : String(v)
  }

  function store() {
    savePreset(game, difficulty, name)
    name = ''
  }
</script>

<section class="tuning" class:open>
  <button class="tuneHead" onclick={() => (open = !open)} aria-expanded={open}>
    <span class="tuneTitle">Customise</span>
    <span class="tuneWhat">{dirty ? 'your own numbers' : 'optional'}</span>
    <span class="chev" aria-hidden="true">▾</span>
  </button>

  {#if open}
    <div class="tuneBody">
      <p class="lede">
        You are playing <b>{difficulty}</b>. The three difficulty buttons are all most people need —
        everything below just lets you drill one specific thing, like a tighter hit window.
      </p>

      <div class="rowBar">
        <button class="chip" onclick={() => (advanced = !advanced)} aria-expanded={advanced}>
          {advanced ? 'Hide' : 'Show'} the {knobs.length} settings
        </button>
        {#if dirty}
          <button
            class="chip warn"
            onclick={() => {
              revert(game, difficulty)
              apply()
            }}
          >
            Reset to {difficulty}
          </button>
        {/if}
      </div>

      {#if advanced}
        <div class="knobs">
          {#each knobs as f (f.key)}
            <label class="knob">
              <span class="knobTop">
                {f.label}
                <b class="mono">{show(f, values[f.key])}{f.unit ? ' ' + f.unit : ''}</b>
              </span>
              <input
                type="range"
                min={f.min}
                max={f.max}
                step={f.step}
                value={values[f.key]}
                oninput={(e) => drag(f.key, e)}
                onchange={apply}
              />
              <span class="knobHelp">{f.help}</span>
            </label>
          {/each}
        </div>

        <div class="tuneBar">
          <input
            class="pname"
            type="text"
            placeholder="Name these numbers to save them"
            maxlength="28"
            bind:value={name}
            onkeydown={(e) => e.key === 'Enter' && store()}
          />
          <button class="chip go" disabled={!name.trim()} onclick={store}>Save</button>
        </div>

        {#if presets.length}
          <div class="presets">
            {#each presets as p (p.id)}
              <span class="preset">
                <button
                  class="use"
                  onclick={() => {
                    applyPreset(p.id, difficulty)
                    apply()
                  }}
                >
                  {p.name}
                </button>
                <button class="drop" title="Delete" onclick={() => deletePreset(p.id)}>×</button>
              </span>
            {/each}
          </div>
          <p class="tuneNote">
            A saved set holds numbers, not a difficulty. Clicking one drops it onto whichever of
            easy, normal or hard you have selected.
          </p>
        {/if}
      {/if}
    </div>
  {/if}
</section>

<style>
  .tuning {
    flex: none;
    margin-top: 14px;
    max-height: 42vh;
    overflow-y: auto;
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--panel-2);
  }

  .tuneHead {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 11px 15px;
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .tuneTitle {
    font-weight: 600;
    color: var(--text);
  }

  .tuneWhat {
    margin-right: auto;
    letter-spacing: 0.1em;
  }

  .open .tuneWhat {
    color: var(--accent);
  }

  .chev {
    font-size: 13px;
    transition: transform 0.18s ease;
  }

  .open .chev {
    transform: rotate(180deg);
  }

  .tuneBody {
    padding: 2px 15px 15px;
    animation: fade 0.18s ease both;
  }

  .lede {
    margin: 0 0 12px;
    max-width: 70ch;
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--muted);
  }

  .lede b {
    color: var(--text);
    font-weight: 600;
    text-transform: capitalize;
  }

  .rowBar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .knobs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: 14px 24px;
    margin-top: 16px;
    animation: fade 0.18s ease both;
  }

  .knob {
    display: grid;
    gap: 4px;
  }

  .knobTop {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    font-size: 12px;
    color: var(--text);
  }

  .knobTop b {
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
  }

  .knobHelp {
    font-size: 11px;
    line-height: 1.5;
    color: #55657c;
  }

  input[type='range'] {
    width: 100%;
    height: 4px;
    margin: 3px 0;
    border-radius: 3px;
    background: #1c2836;
    appearance: none;
    cursor: pointer;
  }

  input[type='range']::-webkit-slider-thumb {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: var(--accent);
    appearance: none;
    transition: transform 0.12s ease;
  }

  input[type='range']:hover::-webkit-slider-thumb {
    transform: scale(1.18);
  }

  input[type='range']::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border: 0;
    border-radius: 50%;
    background: var(--accent);
  }

  .tuneBar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid var(--line);
  }

  .pname {
    flex: 1 1 160px;
    min-width: 0;
    padding: 7px 11px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #0a0f16;
    font: inherit;
    font-size: 12.5px;
    color: var(--text);
  }

  .pname:focus {
    outline: none;
    border-color: #35e0ff55;
  }

  .chip {
    padding: 7px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--muted);
    transition:
      color 0.16s ease,
      border-color 0.16s ease,
      background 0.16s ease;
  }

  .chip:hover:not(:disabled) {
    color: var(--text);
    border-color: #35e0ff44;
    background: #35e0ff10;
  }

  .chip:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .chip.go:not(:disabled) {
    color: var(--accent);
    border-color: #35e0ff44;
  }

  .chip.warn:hover {
    color: var(--warn);
    border-color: #ffb54544;
    background: #ffb54510;
  }

  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 12px;
  }

  .preset {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--panel);
    animation: rise 0.2s ease both;
  }

  .use {
    padding: 6px 8px 6px 14px;
    font-size: 12px;
    color: var(--text);
  }

  .use:hover {
    color: var(--accent);
  }

  .drop {
    padding: 6px 12px 6px 6px;
    font-size: 14px;
    line-height: 1;
    color: #55657c;
  }

  .drop:hover {
    color: var(--bad);
  }

  .tuneNote {
    margin: 10px 0 0;
    max-width: 68ch;
    font-size: 11.5px;
    line-height: 1.6;
    color: #55657c;
  }
</style>
