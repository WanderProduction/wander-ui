import * as Icons from 'lucide-react'

/**
 * WHAT THE ICON PICKER OFFERS, as values rather than as JSX.
 *
 * Three of the things the picker gets right are arithmetic rather than
 * appearance: which icons exist, which of them a typed phrase reaches, and
 * what a stored colour name resolves to. A rule inside a render function is a
 * rule nobody can run, so these live here and `verify-icon-picker` drives
 * them.
 */

/**
 * EVERY CANONICAL LUCIDE ICON — read from `Icons.icons`, not from the module's
 * own export list.
 *
 * `Object.keys(Icons)` is **4,042** names for 1,767 icons: the package exports
 * every historical alias beside its current name, so `CheckCircle`,
 * `CircleCheck` and `CheckCircle2` are three entries drawing one glyph. A grid
 * built from that list is a grid where a third of the squares are duplicates
 * of their neighbours, which reads as a bug in the picker rather than as a
 * library that renamed things.
 *
 * `Icons.icons` is the deduplicated map lucide indexes itself by, and every
 * name in it is ALSO a top-level export — which is what makes it safe for the
 * grid to list one and `ProductIcon` to render the other.
 */
export const GLYPHS = Object.keys(Icons.icons ?? {}).sort()

/**
 * SEARCHED WITHOUT ITS CAPITALS, so a space works like one.
 *
 * The stored value is the Pascal name (`ArrowDownToLine`) and what somebody
 * types is "arrow down". Lowercasing both and dropping the spaces from the
 * query makes the one find the other, without a second transliteration of
 * 1,767 names to get subtly wrong.
 *
 * Pre-lowercased once at module load: doing it to 1,767 names on every
 * keystroke is the one part of this a person can feel.
 */
const SEARCHABLE = GLYPHS.map((name) => name.toLowerCase())

/** The icons a typed phrase reaches. An empty query is the whole library. */
export function matchGlyphs(query) {
  const q = String(query ?? '').trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return GLYPHS
  return GLYPHS.filter((_, i) => SEARCHABLE[i].includes(q))
}

/**
 * NINE HUES, AND THEY ARE NOT SEMANTIC NAMES.
 *
 * The obvious palette for an icon is `primary / success / warning / danger`:
 * names that mean something about a STATE. An icon on a page is not in a
 * state — nobody picks a parcel glyph because the parcel is a warning — so
 * those answer a question nobody asks, while the one question people do ask
 * ("can I have it green?") has no entry at all.
 *
 * These are the nine a Notion-style chip palette has, tuned to sit on both a
 * light and a dark surface. An app that already has its own nine passes them
 * in; this is what a new project gets for free.
 */
export const HUES = {
  gray: '#8b8b8b',
  brown: '#a1755b',
  orange: '#e08b3e',
  yellow: '#dcae3d',
  green: '#37a06f',
  blue: '#3d8ee0',
  purple: '#9b6ddb',
  pink: '#dd5fa4',
  red: '#e5564f',
}

/**
 * THE DEFAULT PALETTE: no colour, then the nine.
 *
 * `default` is first and is not a colour — it is "inherit what is around
 * you", which is the answer most icons want and the one a picker has to offer
 * a way back to.
 */
export const PALETTE = [
  { id: 'default', hue: 'var(--secondary-foreground)' },
  ...Object.entries(HUES).map(([id, hue]) => ({ id, hue })),
]

/**
 * A stored colour name, as something CSS can paint.
 *
 * ── WHY IT TAKES THE PALETTE ────────────────────────────────────────────────
 *
 * An app that already has a colour vocabulary — a select chip's nine, say —
 * should paint its icons in the same words, or the icon beside a row and the
 * chip inside it become two palettes on one screen. So the palette is an
 * argument, and the default above is only what a project gets before it has
 * an opinion.
 *
 * ── AND WHY A NAME RATHER THAN A HEX ────────────────────────────────────────
 *
 * A name is restated by a theme; `#37a06f` freezes one theme's contrast into
 * the data, so an icon chosen in dark mode comes out illegible in light. The
 * picker never stores a hex.
 *
 * ── AN UNKNOWN NAME READS AS THE DEFAULT ────────────────────────────────────
 *
 * A palette shrinks: an app retires a colour, and every icon somebody painted
 * with it still has to draw. Answering nothing would not throw — it would
 * paint `undefined`, which is an invisible icon, on every page, silently. The
 * caller passes retired names in `legacy` for as long as it wants them
 * honoured; after that they fall through to the default.
 */
export const colorToken = (id, palette = PALETTE, legacy = {}) =>
  palette.find((c) => c.id === id)?.hue ?? legacy[id] ?? palette[0].hue
