/**
 * @wander/ui — the pieces more than one of our apps needs, and nothing else.
 *
 * ── WHAT BELONGS HERE ───────────────────────────────────────────────────────
 *
 * A component earns a place when a SECOND app wants it and the two would
 * otherwise keep copies. Not before: a library with one consumer is a folder
 * with extra steps, and every piece moved here is a piece that can no longer
 * be changed by looking at the screen it is on.
 *
 * ── AND WHAT DOES NOT ───────────────────────────────────────────────────────
 *
 * Anything that knows what the app is FOR. These two pickers know what an
 * icon is and what a colour is, and nothing about pages, rows, drives or
 * workspaces. The moment one of them takes a `workspaceId` it has stopped
 * being shareable and should go back.
 *
 * ── THE CONTRACT WITH THE PAGE AROUND IT ────────────────────────────────────
 *
 * Fifteen CSS custom properties, listed in the README and held by
 * `scripts/verify-tokens.mjs`. Nothing here ships colours of its own — it
 * reads the host's — which is what lets one picker look native in two apps
 * with different themes, and what makes a sixteenth token a decision rather
 * than an accident.
 */

export { IconPicker, ProductIcon } from './components/IconPicker.jsx'
export { GLYPHS, HUES, PALETTE, colorToken, matchGlyphs } from './components/iconPalette.js'
export { EMOJI_GROUPS } from './components/emoji.js'

export { ColorPicker, ColorWell } from './components/ColorPicker.jsx'
export { cssHex, hexToHsv, hsvToHex, normalizeHex, rgbToHex } from './lib/color.js'

export { nextPopoverSeq, ownsBranch } from './lib/popoverOrder.js'
export { RECENT_MAX, keepEmoji, readRecent, writeRecent } from './lib/recent.js'
