const KEY = 'minigame-sandbox-stats'
const EMPTY = { attempts: 0, wins: 0, streak: 0, best: 0, recent: [] }

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

export const stats = $state(load())

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats))
  } catch {
    /* private mode / quota — practice still works, it just won't persist */
  }
}

export function bucket(id) {
  return stats[id] ?? EMPTY
}

export function record(id, won, ms) {
  // must not be `stats[id] ??= ...` — that evaluates to the raw object rather than the
  // state proxy, so the first attempt on each game would mutate untracked
  if (!stats[id]) stats[id] = { ...EMPTY, recent: [] }
  const b = stats[id]
  b.attempts++
  if (won) {
    b.wins++
    b.streak++
    if (b.streak > b.best) b.best = b.streak
  } else {
    b.streak = 0
  }
  if (won && ms != null) {
    b.recent.push(ms)
    if (b.recent.length > 20) b.recent.shift()
  }
  save()
}

export function reset(id) {
  delete stats[id]
  save()
}

export function rate(b) {
  return b.attempts ? Math.round((b.wins / b.attempts) * 100) : 0
}

export function avg(b) {
  if (!b.recent.length) return null
  return Math.round(b.recent.reduce((a, n) => a + n, 0) / b.recent.length)
}
