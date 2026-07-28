import { TUNING } from './tuning.js'

const KEY = 'minigame-sandbox-tuning'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

const saved = load()

// `edits` are overrides keyed by "game:difficulty". `presets` are named
// snapshots the player saved and can drop onto any difficulty later.
export const tuning = $state({
  edits: saved.edits && typeof saved.edits === 'object' ? saved.edits : {},
  presets: Array.isArray(saved.presets) ? saved.presets : []
})

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(tuning))
  } catch {
    /* private mode / quota — tuning still works, it just won't persist */
  }
}

const slot = (game, difficulty) => `${game}:${difficulty}`

export function fields(game) {
  return TUNING[game]?.fields ?? []
}

function clamp(field, v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return field.min
  // snap to the step so a hand-edited localStorage value still lands on a notch
  const snapped = Math.round((n - field.min) / field.step) * field.step + field.min
  return Math.min(field.max, Math.max(field.min, Math.round(snapped * 1e6) / 1e6))
}

/** The values a game should actually run with: its difficulty, plus any edits. */
export function settings(game, difficulty) {
  const spec = TUNING[game]
  if (!spec) return {}

  const base = spec.base[difficulty] ?? spec.base.normal
  const over = tuning.edits[slot(game, difficulty)] ?? {}
  const out = { ...base }

  for (const f of spec.fields) {
    if (f.key in over) out[f.key] = clamp(f, over[f.key])
  }
  return out
}

export function edited(game, difficulty) {
  return Object.keys(tuning.edits[slot(game, difficulty)] ?? {}).length > 0
}

export function setValue(game, difficulty, key, value) {
  const field = fields(game).find((f) => f.key === key)
  if (!field) return

  const k = slot(game, difficulty)
  if (!tuning.edits[k]) tuning.edits[k] = {}
  tuning.edits[k][key] = clamp(field, value)
  save()
}

/** Drop every override for one game and difficulty, back to the built-in. */
export function revert(game, difficulty) {
  delete tuning.edits[slot(game, difficulty)]
  save()
}

export function presetsFor(game) {
  return tuning.presets.filter((p) => p.game === game)
}

export function savePreset(game, difficulty, name) {
  const clean = name.trim().slice(0, 28)
  if (!clean) return

  const values = settings(game, difficulty)
  const existing = tuning.presets.find((p) => p.game === game && p.name === clean)

  if (existing) existing.values = values
  else tuning.presets.push({ id: `p${Date.now().toString(36)}`, game, name: clean, values })

  save()
}

/** Copy a preset's numbers onto the difficulty currently selected. */
export function applyPreset(id, difficulty) {
  const preset = tuning.presets.find((p) => p.id === id)
  if (!preset) return

  const over = {}
  for (const f of fields(preset.game)) {
    if (f.key in preset.values) over[f.key] = clamp(f, preset.values[f.key])
  }
  tuning.edits[slot(preset.game, difficulty)] = over
  save()
}

export function deletePreset(id) {
  const i = tuning.presets.findIndex((p) => p.id === id)
  if (i >= 0) tuning.presets.splice(i, 1)
  save()
}
