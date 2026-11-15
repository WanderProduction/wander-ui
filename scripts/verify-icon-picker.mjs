#!/usr/bin/env node
/**
 * VERIFY: the one icon picker in the product.
 *
 * ── WHY IT EARNS A SUITE ────────────────────────────────────────────────────
 *
 * Thirty-six screens open this popover — a page's icon, a callout block, a
 * column, a view tab, an element, a share card — so there is no such thing as
 * a local change to it. And three of the things it decides are arithmetic
 * rather than appearance, which means each one can be wrong while everything
 * still renders:
 *
 *   · WHICH ICONS EXIST. `lucide-react` exports 4,042 names for 1,767 icons,
 *     because every rename keeps its old name as an alias. A grid built from
 *     the export list draws `CheckCircle`, `CircleCheck` and `CheckCircle2`
 *     side by side, identical, and reads as a broken picker.
 *   · WHAT A STORED COLOUR MEANS. The palette changed; the names people
 *     already picked did not. A dropped name does not throw — it repaints
 *     every icon holding it, on every page, silently.
 *   · WHAT A TYPED PHRASE REACHES. The stored value is `ArrowDownToLine` and
 *     what somebody types is "arrow down". If the space is not handled the
 *     search answers nothing, which is indistinguishable from a library that
 *     does not have the icon.
 *
 * The LOOK is checked by looking — `apps/web/harness/icon.html` mounts it
 * outside the app for exactly that. What is here is what a person cannot see
 * being wrong.
 */
import { readFileSync } from 'node:fs'
import * as Icons from 'lucide-react'

import { GLYPHS, HUES, PALETTE, colorToken, matchGlyphs } from '../src/components/iconPalette.js'
import { EMOJI_GROUPS } from '../src/components/emoji.js'

/* A RETIRED PALETTE, as a consuming app would pass one. The library has no
   legacy of its own — it has never shipped a colour anybody could have
   picked — so the behaviour is driven with the shape Orbit hands in. */
const LEGACY = { money: 'var(--tone-money)', party: 'var(--tone-party)' }

let checks = 0
let failures = 0
function check(label, ok, detail = '') {
  checks++
  if (ok) {
    console.log(`  ✓ ${label}`)
    return
  }
  failures++
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`)
}

console.log('\n  ICON PICKER\n')

/* ── The library ──────────────────────────────────────────────────────────── */

check(
  'THE GRID LISTS THE CANONICAL ICONS, not the export list — which is 4,042 names for 1,767 icons, because lucide keeps every rename as an alias beside the new name',
  GLYPHS.length === Object.keys(Icons.icons).length &&
    GLYPHS.length < Object.keys(Icons).filter((k) => /^[A-Z]/.test(k)).length / 2,
  `${GLYPHS.length} canonical, ${Object.keys(Icons).filter((k) => /^[A-Z]/.test(k)).length} exported`,
)
check(
  '…and the aliases really are the thing being avoided, so the line above is not counting something else',
  !GLYPHS.includes('CheckCircle') && GLYPHS.includes('CircleCheck') && 'CheckCircle' in Icons,
)
check(
  'EVERY NAME THE GRID CAN PRODUCE IS ONE `ProductIcon` CAN RENDER. The grid indexes `Icons.icons` and the cell indexes `Icons` — two maps, and a name in one and not the other draws as the fallback parcel everywhere it was picked',
  GLYPHS.every((name) => typeof Icons[name] === 'object' || typeof Icons[name] === 'function'),
  GLYPHS.filter((name) => !Icons[name]).slice(0, 5).join(','),
)
check(
  '…and the list is sorted, so the grid is in a stable order',
  GLYPHS.join(',') === [...GLYPHS].sort().join(','),
)
/* DROPPING THE `.sort()` FAILS NOTHING, and that is worth saying rather than
   leaving for somebody to discover: lucide already hands its keys over in
   order. The sort is insurance against a version that does not, and this
   line is what would notice. */
check(
  'IT IS NOT CAPPED. The grid used to render `matches.slice(0, 120)` with "type to narrow" underneath, which is a search box with a sample attached rather than a library',
  GLYPHS.length > 1000 && matchGlyphs('').length === GLYPHS.length,
  String(matchGlyphs('').length),
)

/* ── Search ───────────────────────────────────────────────────────────────── */

check('a word finds the icons holding it', matchGlyphs('parcel').length === 0 && matchGlyphs('package').length > 0)
check(
  'A SPACE WORKS LIKE A CAPITAL. The value is `ArrowDownToLine` and what people type is "arrow down"',
  matchGlyphs('arrow down').includes('ArrowDown') && matchGlyphs('arrow down').length > 10,
  String(matchGlyphs('arrow down').length),
)
check(
  '…and it is the same answer as the run-together form, which is what makes the space a convenience rather than a second search',
  matchGlyphs('arrow down').join(',') === matchGlyphs('arrowdown').join(','),
)
check('case is not a question', matchGlyphs('ARROW DOWN').join(',') === matchGlyphs('arrow down').join(','))
check('surrounding space is trimmed rather than searched for', matchGlyphs('  package  ').length === matchGlyphs('package').length)
check('an empty query is the whole library, never none of it', matchGlyphs('').length === GLYPHS.length && matchGlyphs('   ').length === GLYPHS.length)
check('and nothing at all is an empty query, not a crash', matchGlyphs(undefined).length === GLYPHS.length && matchGlyphs(null).length === GLYPHS.length)
check('a phrase nothing holds finds nothing — the picker says "No results" rather than drawing an empty grid', matchGlyphs('zzqqxx').length === 0)

/* ── Colour ───────────────────────────────────────────────────────────────── */

check(
  'THE DEFAULT PALETTE IS NINE HUES AND A WAY BACK. `default` is first and is not a colour at all — it is "inherit what is around you", which is the answer most icons want and the one a picker has to offer a way back to',
  PALETTE.length === Object.keys(HUES).length + 1 &&
    PALETTE[0].id === 'default' &&
    Object.keys(HUES).every((name) => PALETTE.some((c) => c.id === name)),
  PALETTE.map((c) => c.id).join(','),
)
check(
  '…and every swatch resolves to the hue the palette gives, rather than to a hex written out again here',
  Object.entries(HUES).every(([name, hue]) => colorToken(name) === hue),
)
/* AND AN APP’S OWN PALETTE WINS, which is the whole reason it is an
   argument: an app that already paints chips in nine words should paint its
   icons in the same nine, or one screen carries two palettes. */
const THEIRS = [
  { id: 'default', hue: 'var(--their-default)' },
  { id: 'green', hue: 'var(--their-green)' },
]
check(
  'a palette passed in replaces the default rather than being merged with it',
  colorToken('green', THEIRS) === 'var(--their-green)' &&
    colorToken('purple', THEIRS) === 'var(--their-default)',
  colorToken('purple', THEIRS),
)
check(
  'A STORED COLOUR IS A NAME, NEVER A HEX. A name is restated by the theme; `#37a06f` would freeze one theme’s contrast into the data',
  PALETTE.every((c) => !/^#/.test(c.id)),
)
check(
  'THE COLOURS AN APP HAS RETIRED STILL DRAW. An icon somebody coloured last month holds one of them, and dropping it does not throw — it repaints that icon on every page, silently',
  ['money', 'party'].every(
    (old) => colorToken(old, PALETTE, LEGACY) === LEGACY[old] &&
      colorToken(old, PALETTE, LEGACY) !== colorToken('default'),
  ),
)
check(
  '…and without being told about them they fall to the default rather than to nothing — a cell painted `undefined` is an invisible icon',
  colorToken('money') === PALETTE[0].hue,
)
check(
  '…and none of them is offered to anybody new, which is the half that makes them legacy rather than hidden',
  Object.keys(LEGACY).every((old) => !PALETTE.some((c) => c.id === old)),
)
check(
  'an unknown colour reads as the default rather than as nothing — a cell painted `undefined` is an invisible icon',
  colorToken('mauve') === PALETTE[0].hue && colorToken(undefined) === PALETTE[0].hue && colorToken(null) === PALETTE[0].hue,
)

/* ── Recently used ────────────────────────────────────────────────────────── */

/* A FAKE Storage, not a real one. `Object.keys` on a real Storage returns its
   KEYS and on a plain object returns its method names, so a plain stand-in
   makes a wipe look like it worked while touching nothing — the trap
   `verify-account-scope` records in Space Atlas. Here only get/set are used,
   and the throwing case is the one that matters. */
function fakeStorage({ throws = false } = {}) {
  const bag = new Map()
  return {
    getItem: (k) => {
      if (throws) throw new Error('blocked')
      return bag.has(k) ? bag.get(k) : null
    },
    setItem: (k, v) => {
      if (throws) throw new Error('blocked')
      bag.set(k, String(v))
    },
    _bag: bag,
  }
}

/* THE GLOBAL THE MODULE READS. `recentEmoji` goes through `window.localStorage`
   because that is what it has in a browser; this is the stand-in, and it is
   kept in a local so the script never reads a global eslint has no reason to
   believe in. */
let store = fakeStorage()
globalThis.window = { localStorage: store }
const { readRecent, writeRecent, keepEmoji, RECENT_MAX } = await import('../src/lib/recent.js')

/* THE KEY IS THE CALLER'S, which is the half of this that is about being a
   LIBRARY: a trail written under our own name claims a namespace in an app
   we do not own, and an app that already has one would start again from
   empty. Bound here so every line below reads as the picker would call it. */
const KEY = 'app_recent_emoji'
const recentEmoji = () => readRecent(KEY, keepEmoji)
const rememberEmoji = (value) => writeRecent(KEY, keepEmoji, value)

check('nothing remembered yet is an empty list, so the Recent row is simply absent', recentEmoji().length === 0)
rememberEmoji('\u{1F381}')
check('one picked emoji comes back', recentEmoji().join('') === '\u{1F381}')
rememberEmoji('\u{1F431}')
check('MOST RECENT FIRST — the list is a trail, and a trail in the order things were first used is a list nobody recognises', recentEmoji().join(',') === '\u{1F431},\u{1F381}')
rememberEmoji('\u{1F381}')
check(
  '…and picking one again moves it to the front rather than adding a second copy',
  recentEmoji().join(',') === '\u{1F381},\u{1F431}',
  recentEmoji().join(','),
)
for (let i = 0; i < 40; i += 1) rememberEmoji(String.fromCodePoint(0x1f600 + i))
check(
  `the list is capped at ${RECENT_MAX}, which is two rows`,
  recentEmoji().length === RECENT_MAX,
  String(recentEmoji().length),
)
check('…and it is the most recent that survive, not the first', recentEmoji()[0] === String.fromCodePoint(0x1f600 + 39))
/* CUT ON THE WAY OUT, not only on the way in. Both halves trim, so a
   mutation of the WRITER alone moves nothing — what a reader of a list
   left by an older build sees is decided here, and this is the half that
   has to hold. */
store._bag.set(
  KEY,
  JSON.stringify(Array.from({ length: 50 }, (_, i) => String.fromCodePoint(0x1f300 + i))),
)
check(
  '…and a longer list, written by something that did not trim, is still cut to it on the way out',
  recentEmoji().length === RECENT_MAX,
  String(recentEmoji().length),
)

store._bag.set(KEY, JSON.stringify(['\u{1F381}', { kind: 'lucide' }, 'lucide:Heart-with-a-long-name', 42, null, '\u{1F431}']))
check(
  'ANYTHING STORED THAT IS NOT A CHARACTER IS DROPPED. An older build could have written an icon here, and either shape draws in the grid as literal text — which looks like a corrupt picker rather than a stale list',
  recentEmoji().join(',') === '\u{1F381},\u{1F431}',
  recentEmoji().join(','),
)
store._bag.set(KEY, '{not json at all')
check('…and so is a value that is not JSON at all', recentEmoji().length === 0)
store._bag.set(KEY, JSON.stringify({ not: 'an array' }))
check('…and an object where a list was expected', recentEmoji().length === 0)
/* THE `Array.isArray` GUARD CAN BE DELETED AND THIS STILL PASSES: iterating
   a plain object throws, and the catch answers empty by another road. It is
   belt and braces, and saying so here is better than a future mutation run
   reporting it as a hole. */

/* TWO KEYS ARE TWO TRAILS, which is what the key being an argument BUYS.
   Two apps on one machine share an origin only in a desktop shell, but two
   PICKERS in one app — an icon trail and a colour trail — always do, and a
   library that named the key itself would have them overwrite each other. */
writeRecent('other_trail', keepEmoji, '\u{1F680}')
check(
  'a second key is a second trail, not the same one under another name',
  readRecent('other_trail', keepEmoji).join('') === '\u{1F680}' && recentEmoji().length === 0,
  readRecent('other_trail', keepEmoji).join(',') + ' | ' + recentEmoji().join(','),
)
/* THE `Array.isArray` GUARD CAN BE DELETED AND THIS STILL PASSES: iterating
   a plain object throws, and the catch answers empty by another road. It is
   belt and braces, and saying so here is better than a future mutation run
   reporting it as a hole. */

store = fakeStorage({ throws: true })
globalThis.window = { localStorage: store }
check(
  'A STORAGE THAT THROWS IS NOT THE REASON THE PICKER DOES NOT OPEN. A private window, blocked site data or somebody’s cleaner makes the accessor throw rather than answer empty',
  recentEmoji().length === 0 &&
    (() => {
      try {
        /* IT STILL ANSWERS, and with the pick at the front: the return is "the
           list as it now reads", which is what the caller would draw. What it
           cannot do is PERSIST it, and that is the half that must not throw. */
        return rememberEmoji('\u{1F381}').join('') === '\u{1F381}'
      } catch {
        return false
      }
    })(),
)
check(
  '\u2026and nothing was written, which is the only part of it that could have been',
  recentEmoji().length === 0,
)

/* ── The emoji half ───────────────────────────────────────────────────────── */

const emojiCount = EMOJI_GROUPS.reduce((n, g) => n + g.items.length, 0)
check('the emoji table is the whole set rather than a hand-picked ninety-six', emojiCount > 1500, String(emojiCount))
check(
  'SUGGESTED IS FIRST, which is what "Surprise me" draws from — pulled from all seventeen hundred it mostly returns a symbol nobody wants on a page',
  EMOJI_GROUPS[0].name === 'Suggested' && EMOJI_GROUPS[0].items.length > 20,
)
check(
  'every emoji carries a name, which is the only handle a search has once scrolling stops being a way to find anything',
  EMOJI_GROUPS.every((g) => g.items.every(([char, name]) => typeof char === 'string' && char && typeof name === 'string' && name)),
)

/* ── What only the source can say ─────────────────────────────────────────── */

const src = readFileSync(new URL('../src/components/IconPicker.jsx', import.meta.url), 'utf8')
/* THE CODE, WITHOUT ITS COMMENTS. The docblock explaining why the grid is no
   longer capped QUOTES the old `matches.slice(0, 120)`, so a search over the
   whole file finds the cap in the sentence announcing its removal, and the
   check meant to catch a reinstated cap fails on the explanation instead.
   This file's own first run did exactly that. */
const codeOnly = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const code = codeOnly(src)

check(
  'THE CELLS DECLARE AN INTRINSIC SIZE. `content-visibility: auto` is what makes 1,767 buttons affordable; without `contain-intrinsic-size` a skipped cell measures zero, the grid collapses and the scrollbar jumps as rows come into view',
  /contentVisibility: 'auto'/.test(code) &&
    /containIntrinsicSize: '28px 28px'/.test(code) &&
    /\.\.\.CELL,/.test(code),
)
/* AND THAT A CELL ACTUALLY SPREADS IT. The first version of this check read
   the `CELL` constant alone, so deleting the one line that applies it left
   every assertion green while 1,767 cells went back to being laid out and
   painted whether or not anybody could see them. A constant nothing reads
   is not a setting — found by mutation, which is what mutations are for. */
check(
  'the grid is nine columns of 28, and the panel’s width is derived from that rather than chosen — at 288 the ninth column did not fit and the row silently became eight',
  /repeat\(9, 28px\)/.test(src) && /inlineSize: 320/.test(src),
)
check(
  'THE COLOUR ROW IS ON THE ICONS TAB ONLY. An emoji carries its own colour, and a swatch that does nothing to it is a control that lies',
  /\{tab === 'lucide' && \(/.test(src),
)
check(
  'the swatch marks itself with an OUTLINE, not a thicker border — a border is inside the box, so the chosen circle would shrink by 2px and the row would visibly change size as you click along it',
  /outline: color === c\.id \? '2px solid var\(--primary\)' : '1px solid var\(--border\)'/.test(src),
)
check(
  'a group heading is sticky and OPAQUE — a transparent one has emoji sliding visibly under its letters',
  /sticky top-0/.test(src) && /background: 'var\(--card\)'/.test(src),
)
check(
  'RECENT IS HIDDEN WHILE SOMETHING IS TYPED. A search is a request for a specific thing, and six emoji used earlier above the one just asked for is the list answering a question nobody asked',
  /\{!query && recent\.length > 0 && \(/.test(src),
)
check(
  '…and it is read ONCE, on mount: a list that re-sorts between the look and the click is one that makes people hit the wrong thing',
  /useState\(\(\) => readRecent\(storageKey, keepEmoji\)\)/.test(src),
)
check(
  'only an emoji is remembered — a glyph is a name plus a palette key, and a stale one would come back in a colour the palette no longer has',
  /if \(next\?\.kind === 'emoji' && next\.value\) writeRecent\(storageKey, keepEmoji, next\.value\)/.test(src),
)
check(
  'clearing the icon does NOT go through the remembering path, or "Remove" would file `null` as something recently picked',
  /onClick=\{\(\) => onPick\(null\)\}/.test(src),
)
check(
  'the grid is rendered from the shared list, so the suite above is about the icons the picker actually draws',
  /matchGlyphs\(query\)/.test(code) && /glyphs\.map\(/.test(code) && !/\.slice\(/.test(code),
)
/* A POSITIVE CONTROL for the line above: a negative grep passes just as
   happily against a file it failed to read. */
check(
  '\u2026and the stripped source is still the picker, not an empty string',
  code.includes('export function IconPicker') && code.length > 2000,
  String(code.length),
)

/*
  ── WHAT A HOST DECIDES, AND THAT IT CAN ────────────────────────────────

  Three of this component’s props exist because the answer is not ours to
  give: a stacking order is a claim about surfaces we have never heard of, a
  palette belongs to the app that already paints chips with one, and a
  storage key names something in a namespace we do not own. Each has a
  default so a new project needs none of them — and each has to be REACHABLE,
  or the default is not a default, it is a hardcoded value with a comment.
*/
const picker = src.slice(src.indexOf('export function IconPicker'))
for (const [prop, why] of [
  ['zIndex', 'a number hardcoded here sits under one app\u2019s dialog and over another\u2019s toast'],
  ['palette', 'an app with its own nine colours would otherwise carry two palettes on one screen'],
  ['storageKey', 'a trail written under our own name claims a namespace in somebody else\u2019s app'],
  ['legacy', 'the colours a host has retired and still has to draw'],
]) {
  check(
    `\`${prop}\` is the host’s to set — ${why}`,
    new RegExp(`\\n  ${prop}\\s*[,=]`).test(picker),
  )
}
check(
  '…and every one of them has a default, so a project that has no opinion passes nothing',
  /zIndex = 320/.test(picker) && /palette = PALETTE/.test(picker) && /storageKey = 'wui_recent_emoji'/.test(picker) && /legacy = \{\}/.test(picker),
)
/* AND NOTHING HERE REACHES INTO AN APP. One import of something app-shaped
   is the whole library quietly stopping being shareable, and it would not
   fail until the SECOND app installed it. Import lines only: the paragraph
   in `index.js` that explains this rule contains the word "workspaces", and
   the first version of this check duly failed on it. */
const importsOf = (file) =>
  (readFileSync(new URL(file, import.meta.url), 'utf8').match(/^import .*$/gm) ?? [])
const everyImport = [
  ...importsOf('../src/index.js'),
  ...importsOf('../src/components/IconPicker.jsx'),
  ...importsOf('../src/components/ColorPicker.jsx'),
  ...importsOf('../src/components/iconPalette.js'),
  ...importsOf('../src/lib/recent.js'),
]
check(
  'the scan found imports to check, so the next line is asking something',
  everyImport.length >= 8,
  String(everyImport.length),
)
check(
  'EVERY IMPORT IS THIS LIBRARY OR A PEER. Nothing climbs out of `src/`, and nothing names a database, a workspace or an auth client — the first of those to arrive is the day this stops being shareable, and it would not fail until a second app installed it',
  everyImport.every((line) => /from '(\.\/|\.\.\/(lib|components)\/|react|react-dom|lucide-react)/.test(line)) &&
    !everyImport.some((line) => /database|workspace|supabase|auth/i.test(line)),
  everyImport.filter((line) => !/from '(\.\/|\.\.\/(lib|components)\/|react|react-dom|lucide-react)/.test(line)).join(' | '),
)

console.log(`\n  ${checks - failures}/${checks} checks passed\n`)
process.exit(failures === 0 ? 0 : 1)
