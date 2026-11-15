/**
 * WHAT THIS PERSON REACHED FOR LAST, on this machine.
 *
 * Both pickers in this library are complete libraries — seventeen hundred
 * emoji, every colour there is — and a complete library is a hopeless browse.
 * The thing somebody wants is almost always the thing they used ten minutes
 * ago, so a short trail is the whole difference between "all of them" and
 * "usable".
 *
 * ── WHY THE BROWSER AND NOT THE SERVER ──────────────────────────────────────
 *
 * It is not a fact about the document, the workspace or the business —
 * nothing here is drawn on anything. It is a record of what one person did
 * with a tool a few minutes ago, and two colleagues editing the same page are
 * each entitled to their own. Losing it costs a search; sending it somewhere
 * shared would put one person's last sixteen picks in somebody else's menu.
 *
 * ── THE KEY IS THE CALLER'S ─────────────────────────────────────────────────
 *
 * A library that writes `wui_recent_emoji` into an app's localStorage has
 * named something in a namespace it does not own, and an app that already has
 * a trail under its own key would silently start again from empty. So the key
 * is passed in, and the defaults below are only what a new project gets.
 *
 * ── EVERY ACCESS IS WRAPPED ─────────────────────────────────────────────────
 *
 * A Storage accessor can THROW rather than return empty — a private window,
 * blocked site data, a thumbnail capture — and a picker that fails to OPEN
 * because it could not read a list of sixteen values is worse than one with
 * no list at all. Reading answers empty; writing gives back the list as it
 * would now read, so the caller draws the pick it just made even where
 * nothing could be saved.
 */

/** Two rows of eight. Enough to recognise, few enough to take in at a glance. */
export const RECENT_MAX = 16

const store = () => {
  /* `globalThis`, not `window`: this module is imported by scripts that run in
     node, where reading a bare `window` is a ReferenceError rather than
     `undefined`. */
  const w = globalThis.window
  if (!w?.localStorage) throw new Error('no storage')
  return w.localStorage
}

/**
 * The trail under `key`, most recent first.
 *
 * `keep` decides what counts as a value worth reading back. Anything it
 * refuses is DROPPED rather than drawn: a shape written by an older build
 * renders in a grid as literal text, which looks like a corrupt picker rather
 * than like a stale list.
 */
export function readRecent(key, keep, max = RECENT_MAX) {
  try {
    const raw = JSON.parse(store().getItem(key) ?? '[]')
    if (!Array.isArray(raw)) return []
    const out = []
    for (const value of raw) {
      const kept = keep(value)
      if (kept === null || kept === undefined) continue
      if (!out.includes(kept)) out.push(kept)
      if (out.length >= max) break
    }
    return out
  } catch {
    return []
  }
}

/** Put one at the front, and return the list as it now reads. */
export function writeRecent(key, keep, value, max = RECENT_MAX) {
  const kept = keep(value)
  if (kept === null || kept === undefined) return readRecent(key, keep, max)
  const next = [kept, ...readRecent(key, keep, max).filter((v) => v !== kept)].slice(0, max)
  try {
    store().setItem(key, JSON.stringify(next))
  } catch {
    /* Remembering is the convenience, not the feature. */
  }
  return next
}

/**
 * AN EMOJI IS A CHARACTER, which is what makes it safe to keep.
 *
 * It means today what it meant when it was stored. An icon is a NAME plus a
 * palette key, and both can move under it — a remembered icon could come back
 * in a colour the palette no longer has, so none is ever written.
 */
export const keepEmoji = (value) =>
  typeof value === 'string' && value && value.length <= 8 ? value : null
