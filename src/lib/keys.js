// Games listen on the window for Space / Enter / E, and the tuning panel has a
// text field on the same page. Without this guard, naming a preset "Easy" would
// restart the game and Enter would do it again on the way out.
export function typing(e) {
  const el = e.target
  return (
    el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el?.isContentEditable
  )
}
