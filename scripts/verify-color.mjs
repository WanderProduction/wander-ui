#!/usr/bin/env node
/**
 * VERIFY: the arithmetic behind the colour picker.
 *
 * ── WHY THE NUMBERS AND NOT THE PIXELS ──────────────────────────────────────
 *
 * A square of saturation and value with a hue slider beside it is a shape
 * everybody recognises and nobody can check by looking: the whole of it is
 * arithmetic between a position in a box and six hexadecimal digits, and an
 * off-by-one there is a colour that is ALMOST right. Nobody files that. They
 * mix it again by eye and move on, and the picker goes on being slightly
 * wrong for everybody.
 *
 * So the arithmetic is out of the component and driven here.
 */
import {
  cssHex,
  hexToHsv,
  hsvToHex,
  normalizeHex,
} from '../src/lib/color.js'
import { RECENT_MAX, readRecent, writeRecent } from '../src/lib/recent.js'
import { nextPopoverSeq, ownsBranch } from '../src/lib/popoverOrder.js'

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

console.log('\n  COLOUR\n')

/* ── Reading one ──────────────────────────────────────────────────────────── */

check('a six-digit hex reads as itself, lower case and with the hash', normalizeHex('#AABBCC') === '#aabbcc')
check('and without the hash', normalizeHex('aabbcc') === '#aabbcc')
check('a three-digit hex is doubled out, which is what the shorthand MEANS', normalizeHex('#abc') === '#aabbcc')
check(
  'AN EIGHT-DIGIT ONE LOSES ITS ALPHA RATHER THAN BEING REFUSED. Every background preset this replaced carried a two-digit alpha, and the colour part of one is still a colour',
  normalizeHex('#aabbcc80') === '#aabbcc',
)
check('surrounding space is trimmed', normalizeHex('  #abc  ') === '#aabbcc')
check(
  'and anything that is not a colour is null, never a guess — a picker that opened on a colour the thing is not reads as having changed it',
  normalizeHex('red') === null &&
    normalizeHex('#ab') === null &&
    normalizeHex('#abcde') === null &&
    normalizeHex('') === null &&
    normalizeHex(null) === null &&
    normalizeHex(42) === null,
)

/* ── Round trip ───────────────────────────────────────────────────────────── */

/*
  ── THE ROUND TRIP THAT MATTERS IS THE ONE IN HEX ────────────────────────

  What somebody does is pick a colour and come back to it: the window opens
  on a stored `#aabbcc`, reads it into the square, and must give `#aabbcc`
  back if nothing was touched. A drift there is a picker that changes a
  colour by being opened, which is the one thing it must never do.

  EVERY SIXTEENTH VALUE OF EACH CHANNEL rather than a spot check: the
  conversion has six branches, one per 60° of the wheel, and a spot check
  lands in one of them.
*/
const drifted = []
for (let r = 0; r < 256; r += 17) {
  for (let g = 0; g < 256; g += 17) {
    for (let b = 0; b < 256; b += 17) {
      const hex = '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')
      const back = hsvToHex(hexToHsv(hex))
      if (back !== hex) drifted.push(`${hex} -> ${back}`)
    }
  }
}
check(
  'A COLOUR COMES BACK AS ITSELF — hex to the square and back again, for 4,096 colours. A picker that changes a colour by being OPENED is the one thing it must never do',
  drifted.length === 0,
  drifted.slice(0, 4).join(', '),
)

/*
  AND THE OTHER DIRECTION IS NOT EXACT, which is worth a line rather than a
  tolerance nobody can read. Eight bits per channel is all a hex holds, so a
  nearly-grey colour carries almost no hue: at s = 0.01 the whole channel
  span is two values out of 255, and the hue that comes back can be twenty
  degrees off. That is the format, not the arithmetic — and it is invisible,
  because twenty degrees of hue at one percent saturation is the same grey.

  So this measures the COLOUR, not the coordinates: convert both ways and
  compare the channels, where "almost right" is a number anybody can judge.
*/
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
let worst = 0
let worstAt = null
for (let h = 0; h < 360; h += 1) {
  for (const [s, v] of [[1, 1], [0.5, 0.5], [1, 0.5], [0.5, 1], [0.01, 0.99]]) {
    const hex = hsvToHex({ h, s, v })
    const again = hsvToHex(hexToHsv(hex))
    const off = Math.max(...channels(hex).map((c, i) => Math.abs(c - channels(again)[i])))
    if (off > worst) {
      worst = off
      worstAt = { h, s, v, hex, again }
    }
  }
}
check(
  '…and a point in the square survives it too, to within a single step of one channel — which is quantisation and not arithmetic',
  worst <= 1,
  `${worst}/255 at ${JSON.stringify(worstAt)}`,
)
check('black and white are exact, which the ends of the square have to be', hsvToHex({ h: 0, s: 0, v: 0 }) === '#000000' && hsvToHex({ h: 0, s: 0, v: 1 }) === '#ffffff')
check(
  'GREY HAS NO HUE and the formula would divide by zero asking for one. Zero is as good an answer as any — the slider has to point somewhere, and a grey is grey at every hue',
  hexToHsv('#808080')?.h === 0 && hexToHsv('#808080')?.s === 0,
)
check('a pure red is hue zero, full saturation, full value', JSON.stringify(hexToHsv('#ff0000')) === JSON.stringify({ h: 0, s: 1, v: 1 }))
check('green is 120° and blue is 240°, so the wheel runs the way every other picker’s does', hexToHsv('#00ff00')?.h === 120 && hexToHsv('#0000ff')?.h === 240)
check('and a value that is not a colour has no hsv rather than a default one', hexToHsv('nonsense') === null)

/* ── Reading a colour the arithmetic cannot ───────────────────────────────── */

check(
  'A STORED COLOUR MAY BE A `var()`, which is a real colour the hex arithmetic cannot read — without this the picker falls back to its own blue on a band that is green, and a window that opens showing a colour the thing is not reads as having changed it',
  typeof cssHex === 'function' && cssHex('#abc') === '#aabbcc',
)

/* ── The trail ────────────────────────────────────────────────────────────── */

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
let store = fakeStorage()
globalThis.window = { localStorage: store }

const KEY = 'app_recent_colors'
const recent = () => readRecent(KEY, normalizeHex)
const remember = (v) => writeRecent(KEY, normalizeHex, v)

check('nothing used yet is an empty trail', recent().length === 0)
check('a colour comes back normalised, not as it was typed', remember('#ABC').join('') === '#aabbcc')
check(
  'THE KEEPER IS THE READER. "Is this worth remembering" and "is this a colour at all" are the same question, so the trail cannot hold something the picker could not then draw',
  remember('not a colour').length === 1 && recent().join('') === '#aabbcc',
)
remember('#112233')
check('most recent first', recent().join(',') === '#112233,#aabbcc')
check('and the same colour again moves rather than repeats', remember('#aabbcc').join(',') === '#aabbcc,#112233')
for (let i = 0; i < 40; i += 1) remember(`#0000${String(i).padStart(2, '0')}`)
check(`capped at ${RECENT_MAX}`, recent().length === RECENT_MAX)

/*
  ── WHAT A TRAIL WRITTEN BY SOMETHING ELSE LOOKS LIKE ────────────────────

  Both halves trim: `writeRecent` dedupes and cuts before it stores, and
  `readRecent` does it again on the way out. So driving the reader through
  the writer exercises only the writer — a mutation of either reader guard
  passes, which is what a first mutation run of this file reported.

  The reader is the half that matters: an older build, a second tab, or a
  version of this library with a different cap all leave a list this one has
  to make sense of. So these write the bag DIRECTLY.
*/
store._bag.set(KEY, JSON.stringify(['#aabbcc', '#112233', '#aabbcc', '#AABBCC']))
check(
  'a repeated colour is read once, at the position it first appears — a trail with the same grey three times is three of its sixteen places spent saying one thing',
  recent().join(',') === '#aabbcc,#112233',
  recent().join(','),
)

store._bag.set(
  KEY,
  JSON.stringify(Array.from({ length: 50 }, (_, i) => `#0000${String(i).padStart(2, '0')}`)),
)
check(
  '…and a longer list, written by something that did not cut it, is still cut on the way out',
  recent().length === RECENT_MAX,
  String(recent().length),
)

store._bag.set(KEY, JSON.stringify(['#abc', 'red', null, 7, '#112233']))
check('a trail written by something else keeps only the colours in it', recent().join(',') === '#aabbcc,#112233')

store = fakeStorage({ throws: true })
globalThis.window = { localStorage: store }
check(
  'A STORAGE THAT THROWS IS NOT THE REASON THE PICKER DOES NOT OPEN — a private window makes the accessor throw rather than answer empty, and failing to open over a list of sixteen values is worse than having no list',
  recent().length === 0 && remember('#abc').join('') === '#aabbcc',
)

/* ── Which popover owns which click ───────────────────────────────────────── */

const a = nextPopoverSeq()
const b = nextPopoverSeq()
check('every surface takes the next number as it opens', b > a)
check(
  'A POPOVER IGNORES CLICKS IN BRANCHES OPENED AFTER IT, which is what lets a child be closed by clicking back in its parent',
  ownsBranch(String(b), a) === true && ownsBranch(String(a), b) === false,
)
check(
  'ANYTHING THAT IS NOT A NUMBER IS ASSUMED A CHILD — the safe way round for a branch nobody numbered: it keeps a hover submenu from closing the menu it hangs off',
  ownsBranch('true', a) === true && ownsBranch('anything', a) === true,
)
check(
  'AN EMPTY MARKER IS CAUGHT BEFORE THE NUMBER. React renders a bare attribute as "true", and `Number("")` is 0 — perfectly finite, and loses to every sequence, so a hand-written branch would have read as the oldest popover on screen',
  ownsBranch('', a) === true && ownsBranch('   ', a) === true,
)
check('and nothing at all is not a branch', ownsBranch(null, a) === false && ownsBranch(undefined, a) === false)

console.log(`\n  ${checks - failures}/${checks} checks passed\n`)
process.exit(failures === 0 ? 0 : 1)
