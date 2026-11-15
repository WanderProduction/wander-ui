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
import { SUGGESTED, buildEmojis, matchEmojis } from '../src/components/emoji.js'

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

/*
  ── THE EMOJI, AND THE THREE WAYS THE OLD TABLE WAS WRONG ────────────────

  It was generated from `unicodedata`: 1,743 characters, complete enough to
  LOOK complete. Each of these is a thing somebody would try once, fail at,
  and never report as a bug.
*/
/* READ WITH `fs`, NOT IMPORTED. A JSON module needs an import attribute in
   node and must not have one in a browser — see `emoji.js` for the two
   measurements. That is why `buildEmojis` takes the parsed objects: the half
   with the rules in it can then be driven from either side. */
const read = (f) =>
  JSON.parse(readFileSync(new URL(`../node_modules/emojibase-data/en/${f}.json`, import.meta.url), 'utf8'))
const data = buildEmojis(read('compact'), read('messages'))

check(
  'the whole set arrives, FLAGS INCLUDED — a flag is a PAIR of regional indicators rather than one character, so it is in no Unicode block and the old generator never saw one',
  data.list.length > 1800 && matchEmojis(data, 'israel').length === 1,
  `${data.list.length} emoji`,
)
check(
  'THE LABELS ARE THE ONES PEOPLE TYPE. The old table carried Unicode 6 names — "heavy black heart" — so searching "red heart", which is what that character is called today, found nothing',
  matchEmojis(data, 'red heart').length > 0,
)
check(
  'AND THE SEARCH READS THE TAGS, not only the label: "happy" is in no label of \u{1F600} and "love" is in no label of \u2764\uFE0F, and both are what somebody types',
  matchEmojis(data, 'happy').length > 3 && matchEmojis(data, 'love').length > 3,
  `happy ${matchEmojis(data, 'happy').length}, love ${matchEmojis(data, 'love').length}`,
)
check(
  'THE GROUPS ARE CATEGORIES, not Unicode blocks. "Nature & things" used to hold weather, plants and staplers, because that is how Unicode filed them',
  data.sections.some((s) => s.title === 'food & drink') &&
    data.sections.some((s) => s.title === 'flags') &&
    !data.sections.some((s) => s.title === 'Nature & things'),
  data.sections.map((s) => s.title).join(' | '),
)
check(
  'COMPONENTS ARE NOT EMOJI — a skin-tone modifier on its own draws as a bare brown rectangle, and half a flag draws as a letter in a box',
  data.list.every((e) => e.group !== 2) &&
    matchEmojis(data, 'regional indicator').length === 0,
)
check(
  'SUGGESTED IS STILL FIRST and is still the curated list — it is the right answer to the FIRST choice, and it is what "Surprise me" draws from: pulled from all 1,900 that button mostly returns a symbol nobody wants on a page',
  data.sections[0].title === 'Suggested' &&
    data.sections[0].items.length === SUGGESTED.length &&
    SUGGESTED.length > 20,
  `${data.sections[0].items.length} of ${SUGGESTED.length}`,
)
check(
  '…and it is in CODE rather than fetched, because "Surprise me" and the first section both have to work before a megabyte of JSON has arrived',
  /export const SUGGESTED = \[/.test(readFileSync(new URL('../src/components/emoji.js', import.meta.url), 'utf8')),
)
check(
  'every emoji carries a label, which is the only handle a search has once scrolling stops being a way to find anything',
  data.list.every((e) => typeof e.char === 'string' && e.char && typeof e.label === 'string' && e.label),
)
check(
  'an empty query is every emoji, never none of them',
  matchEmojis(data, '').length === data.list.length && matchEmojis(data, '   ').length === data.list.length,
)
check(
  'and the table is fetched ONCE — a megabyte re-parsed on every open is a picker that gets slower the more it is used',
  /if \(cached\) return cached/.test(readFileSync(new URL('../src/components/emoji.js', import.meta.url), 'utf8')),
)
check(
  '…and the import carries NO attribute, which is the spelling the browser needs: node demands one and Vite serves JSON as a JavaScript module, so with it the picker sits on "Loading…" for ever. Both measured',
  !/compact\.json', \{ with/.test(readFileSync(new URL('../src/components/emoji.js', import.meta.url), 'utf8')),
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

/*
  ── ONE MEASUREMENT, AND EVERYTHING ELSE DERIVED FROM IT ─────────────────

  A cell was 28px, which is the size of a toolbar button and the wrong size
  for a thing you choose by LOOKING at it: the difference between 😬 and
  😑 is in the mouth, and at 28 there is no mouth.

  THE INTERESTING PART IS NOT THE NUMBER, it is that four things have to
  agree with it — the cell, the column track, the intrinsic size the browser
  reserves for a cell it has not drawn, and the width of the panel around
  them. Chosen independently they drift: the last column does not fit and
  the row silently becomes seven, which is a different picker on a different
  screen, and the scrollbar lies about how much is below.

  So the checks are about the DERIVATION, not about any of the numbers.
*/
const sizeOf = (name) => Number((code.match(new RegExp(`const ${name} = (\\d+)`)) ?? [])[1])
const SIZE = sizeOf('SIZE')
const COLUMNS = sizeOf('COLUMNS')
const GAP = sizeOf('GAP')
const PAD = sizeOf('PAD')

check(
  'the picker is built from one cell size, big enough to tell two faces apart',
  SIZE >= 36 && COLUMNS >= 8,
  `${COLUMNS} columns of ${SIZE}`,
)
check(
  'THE INTRINSIC SIZE IS THAT SIZE. `content-visibility: auto` is what makes 1,767 buttons affordable, and `contain-intrinsic-size` is what makes it correct — a cell that reserves the wrong amount is a scrollbar that jumps as rows come into view',
  new RegExp(`containIntrinsicSize: \\\`\\$\\{SIZE\\}px \\$\\{SIZE\\}px\\\``).test(code) &&
    /inlineSize: SIZE,/.test(code) &&
    /blockSize: SIZE,/.test(code),
)
check(
  '…and so is the column track, so a cell and the space it sits in cannot disagree',
  /repeat\(\$\{COLUMNS\}, \$\{SIZE\}px\)/.test(code),
)
check(
  'THE PANEL IS AS WIDE AS ITS GRID, never a number somebody liked: the columns, the gaps and the padding either side',
  /const WIDTH = COLUMNS \* SIZE \+ \(COLUMNS - 1\) \* GAP \+ PAD \* 2/.test(code) &&
    /inlineSize: WIDTH,/.test(code),
)
check(
  '…and the arithmetic comes out where the panel is actually drawn',
  COLUMNS * SIZE + (COLUMNS - 1) * GAP + PAD * 2 + 2 >= 350,
  String(COLUMNS * SIZE + (COLUMNS - 1) * GAP + PAD * 2 + 2),
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
