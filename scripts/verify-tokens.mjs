#!/usr/bin/env node
/**
 * VERIFY: the contract between this library and the page around it.
 *
 * ── WHY A LIBRARY THAT SHIPS NO COLOURS NEEDS A TEST ABOUT COLOURS ──────────
 *
 * Nothing here has a palette of its own. Every surface, border and shadow is
 * a CSS custom property the HOST defines, which is what lets one picker look
 * native in two apps with different themes — and what makes the set of
 * properties it reads a real interface, with the same obligations as a
 * function signature.
 *
 * The failure is silent in the worst possible way. A component that reads
 * `var(--panel-bg)` in an app that has never heard of it does not throw and
 * does not warn: the declaration is simply dropped, so the popover renders
 * with a transparent background over whatever is behind it. It looks like a
 * z-index bug, it is reported as "the menu is see-through", and nothing in
 * either repository mentions `--panel-bg` at all.
 *
 * So the set is CLOSED. Adding a token is a line in this file and a line in
 * the README, which is the point: every consuming app has to be given it.
 *
 * ── A FALLBACK IS WHAT MAKES ONE OPTIONAL ───────────────────────────────────
 *
 * `var(--font-mono, monospace)` asks for a token and says what to do without
 * it, so an app that has never defined it still renders correctly. That is
 * the difference between a token this library REQUIRES and one it would
 * merely enjoy, and it is visible in the source, so the rule reads it rather
 * than keeping a second list that can disagree.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src')

/**
 * Every custom property this library requires of its host, and what it is for.
 *
 * Checked against Orbit Office and Space Atlas on 2026-11-15: all fifteen are
 * already defined in both, which is the whole reason this library is worth
 * having rather than being a second design system.
 */
const REQUIRED = {
  '--foreground': 'ordinary text',
  '--muted-foreground': 'labels, headings, placeholder text',
  '--secondary-foreground': 'an icon with no colour of its own',
  '--card': 'the surface a popover is drawn on',
  '--input': 'a text field',
  '--border': 'an ordinary edge',
  '--border-strong': 'an edge that has to be seen against a colour',
  '--hover': 'what a cell does under the pointer',
  '--accent-subtle': 'the cell that is already chosen',
  '--primary': 'the accent: a selected tab, a selected swatch',
  '--radius-base': 'the corner radius of a control',
  '--shadow-popover': 'the shadow under a floating surface',
  '--success': 'a colour the host calls good',
  '--warning': 'a colour the host calls careful',
  '--danger': 'a colour the host calls wrong',
}

const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    else if (/\.(jsx?|css)$/.test(name)) files.push(full)
  }
}
walk(SRC)

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

console.log('\n  TOKEN CONTRACT\n')

/* REFUSE AN EMPTY SCAN. A glob that matches nothing passes every assertion
   below, which is the shape of a guard that quietly stopped guarding. */
check('the scan found the source to check', files.length >= 6, `${files.length} files`)

/** Every `var(--x)` in the source, with whether it carried a fallback. */
const used = new Map()
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*(,)?/g)) {
    const [, name, comma] = m
    const seen = used.get(name) ?? { files: new Set(), everBare: false }
    seen.files.add(relative(SRC, file))
    if (!comma) seen.everBare = true
    used.set(name, seen)
  }
}

check('and some tokens in it, so the rest of this is asking something', used.size > 5, `${used.size} tokens`)

const required = [...used].filter(([, v]) => v.everBare).map(([k]) => k).sort()
const optional = [...used].filter(([, v]) => !v.everBare).map(([k]) => k).sort()

const undeclared = required.filter((name) => !(name in REQUIRED))
check(
  'NOTHING IS READ THAT THE README DOES NOT ASK FOR. A token a host has never defined does not throw and does not warn — the declaration is dropped, the popover renders transparent, and neither repository mentions the name',
  undeclared.length === 0,
  undeclared.join(', '),
)

const unused = Object.keys(REQUIRED).filter((name) => !required.includes(name))
check(
  '…and nothing is ASKED FOR that is no longer read. A stale line here is a token every consuming app is told to define for nothing, and the list stops being worth reading',
  unused.length === 0,
  unused.join(', '),
)

check(
  `the contract is the ${Object.keys(REQUIRED).length} in this file, and they are all in use`,
  required.length === Object.keys(REQUIRED).length,
  `${required.length} read, ${Object.keys(REQUIRED).length} declared`,
)

for (const name of optional) {
  check(
    `\`${name}\` is optional, and it is optional because every use of it carries a fallback`,
    !used.get(name).everBare,
  )
}

/*
  NO COMPONENT PAINTS A COLOUR OF ITS OWN — the rule the list above makes
  checkable. A hex in a component cannot be themed, so it is right in one app
  and wrong in the other the first time somebody changes a palette.

  ── THE TWO EXEMPTIONS, EACH WITH ITS REASON ─────────────────────────────

  `iconPalette.js` is the DEFAULT palette: nine hues offered to a project
  that has not got one, which an app with its own replaces by passing it in.
  A palette is the one thing here that is allowed to be colours.

  AND A COLOUR PICKER DRAWS THE COLOUR SPACE, which is not a theme. A hue
  slider runs red through magenta back to red in every app there will ever
  be, and the square behind it fades to white across and black down because
  that is what saturation and value ARE. Theming those would not make the
  picker fit in, it would make it lie about which colour is under the
  pointer. The handle is white for the same reason: it sits ON the colour
  being chosen, so it cannot be a colour that might equal it.

  Listed value by value rather than by file, so a themeable colour cannot
  arrive in the same file under cover of the exemption.
*/
const COLOUR_SPACE = new Set([
  '#000',
  '#fff',
  '#f00',
  '#ff0',
  '#0f0',
  '#0ff',
  '#00f',
  '#f0f',
])
const painted = []
for (const file of files) {
  if (/iconPalette\.js$/.test(file)) continue
  const text = readFileSync(file, 'utf8')
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    /* A COMMENT IS NOT PAINT. Three of these files explain the arithmetic in
       terms of `#rrggbb`, and a guard that reads prose is a guard somebody
       disables. */
    const line = text.slice(text.lastIndexOf('\n', m.index) + 1, text.indexOf('\n', m.index))
    if (/^\s*(\*|\/\/|\/\*)/.test(line)) continue
    if (COLOUR_SPACE.has(m[0].toLowerCase())) continue
    painted.push(`${relative(SRC, file)}: ${m[0]}`)
  }
}
check(
  'NO COMPONENT PAINTS A COLOUR OF ITS OWN. A hex outside the palette and the colour space cannot be themed, so it is right in one app and wrong in the other the first time somebody changes a palette',
  painted.length === 0,
  painted.slice(0, 6).join(', '),
)
check(
  '…and the exemption is a list of eight values rather than a file, so a themeable colour cannot arrive beside them',
  COLOUR_SPACE.size === 8 && [...COLOUR_SPACE].every((hex) => /^#[0-9a-f]{3}$/.test(hex)),
)

console.log(`\n  ${checks - failures}/${checks} checks passed\n`)
process.exit(failures === 0 ? 0 : 1)
