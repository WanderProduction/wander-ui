# @wander/ui

Two pickers, shared between the Wander apps: an **icon picker** (the whole
Lucide library plus every emoji) and a **colour picker** (a square, a hue
slider, and a trail of what you used).

```bash
npm i github:WanderProduction/wander-ui#v0.1.0
```

```jsx
import { IconPicker, ProductIcon, ColorWell } from '@wander/ui'
```

---

## What belongs here

A component earns a place when a **second** app wants it and the two would
otherwise keep copies. Not before: a library with one consumer is a folder
with extra steps, and every piece moved here is a piece that can no longer be
changed by looking at the screen it is on.

And nothing here may know what an app is **for**. These two know what an icon
is and what a colour is, and nothing about pages, rows, drives or workspaces.
The moment one of them takes a `workspaceId` it has stopped being shareable
and should go back. `verify-icon-picker` checks every import for exactly that,
because the day it stops being true is the day the second app installs it.

---

## The contract with the page around it

**Nothing here ships a colour.** Every surface, border and shadow is a CSS
custom property the host defines, which is what lets one picker look native in
two apps with different themes.

That makes the set of properties a real interface, and the failure is silent in
the worst way: a component that reads `var(--panel-bg)` in an app that has
never heard of it does not throw and does not warn. The declaration is dropped,
the popover renders transparent over whatever is behind it, it is reported as
"the menu is see-through", and neither repository mentions `--panel-bg` at all.

So the set is **closed** — `scripts/verify-tokens.mjs` fails the build on a
sixteenth — and `harness/tokens.css` is a working definition of all of them.

| token | what it is |
|---|---|
| `--foreground` | ordinary text |
| `--muted-foreground` | labels, headings, placeholder text |
| `--secondary-foreground` | an icon with no colour of its own |
| `--card` | the surface a popover is drawn on |
| `--input` | a text field |
| `--border` | an ordinary edge |
| `--border-strong` | an edge that has to be seen against a colour |
| `--hover` | what a cell does under the pointer |
| `--accent-subtle` | the cell that is already chosen |
| `--primary` | the accent: a selected tab, a selected swatch |
| `--radius-base` | the corner radius of a control |
| `--shadow-popover` | the shadow under a floating surface |
| `--success` · `--warning` · `--danger` | colours the host calls good, careful and wrong |

`--font-mono` is **optional** — every use of it carries a fallback, which is
the difference between a token this library requires and one it would merely
enjoy.

### And two things that are not tokens

**React 19 and lucide-react are peers.** Two copies of React in one page is
the "invalid hook call" everybody has met, and two copies of lucide is 1,767
icons shipped twice.

**Tailwind v4 is assumed**, and this is the known limitation of v0.1. The
components are written with about twenty utility classes which the CONSUMER
compiles, so a project without Tailwind gets the browser's default button
chrome — a visible grey border around all 1,767 icon cells, which is exactly
what the first run of the harness showed. Both current consumers have it. The
next step for this library, if a project without Tailwind ever wants these, is
to inline those twenty classes.

---

## What a host decides

Every one has a default, so a new project passes nothing.

| prop | why it is not ours to answer |
|---|---|
| `palette` | an app that already paints chips in nine words should paint its icons in the same nine, or one screen carries two palettes |
| `legacy` | the colour names that app has **retired** and still has to draw |
| `zIndex` | a stacking order is a claim about surfaces this library has never heard of; a number hardcoded here sits under one app's dialog and over another's toast, and nothing in either file looks wrong |
| `storageKey` | the recent trail. A library that writes its own name into an app's `localStorage` has claimed a namespace it does not own, and an app with an existing trail would silently start again from empty |

```jsx
<IconPicker
  value={icon}                     // { kind: 'lucide' | 'emoji', value, color }
  palette={APP_PALETTE}            // [{ id, hue }], default first
  legacy={{ money: 'var(--tone-money)' }}
  zIndex={LAYER.popover}
  storageKey="orbit_recent_emoji"
  at={{ x, y }}                    // fixed-position, or omit for absolute
  onPick={setIcon}                 // null when Remove is pressed
  onClose={close}
/>
```

`ColorPicker` is **opened from something** rather than rendered in place: it
reads `at.x` / `at.y` unconditionally and is `position: fixed`, because it is a
window that appears next to the swatch you pressed. `ColorWell` is the swatch,
and is how one is normally used.

### A stored value is a name, never a hex

`colorToken(id, palette, legacy)` resolves it. A name is restated by a theme;
`#37a06f` freezes one theme's contrast into the data, so an icon chosen in dark
mode comes out illegible in light. An unknown name reads as the default rather
than as nothing — answering nothing would paint `undefined`, which is an
invisible icon, on every page, silently.

---

## Three things that look like details and are not

**The icon grid lists the canonical names.** `Object.keys(Icons)` is **4,042**
names for 1,767 icons, because lucide keeps every rename as an alias beside the
new one — so a grid built from the export list draws `CheckCircle`,
`CircleCheck` and `CheckCircle2` side by side, identical, which reads as a
broken picker. `Icons.icons` is the map lucide indexes itself by, and every
name in it is also a top-level export, which is what makes it safe for the grid
to list one and `ProductIcon` to render the other.

**The whole library is rendered, not a window onto it.** 1,767 buttons are
affordable because of `content-visibility: auto` with `contain-intrinsic-size`:
the browser skips layout and paint for every cell off screen and still reserves
28px for it, so the scrollbar is honest. Measured at 146 ms in a dev build for
the whole grid against 5 ms for ninety-two; the production figure is not
measured.

**A search drops the spaces.** The stored value is `ArrowDownToLine` and what
somebody types is "arrow down".

---

## Running it

```bash
npm install
npm run dev      # the harness — the smallest possible consumer, at /harness/
npm run verify   # 55 + 29 + 8 checks
npm run check    # build, verify, lint
```

`npm run dev` is how the look is checked, and there is no substitute: both
pickers spend their lives inside an app, behind a sign-in, several clicks deep,
which is most of why the bugs in them went unnoticed. The harness is also the
example — if it needs something this README does not mention, this README is
wrong.

`dist/` is **not committed**. `prepare` builds on install, which is what makes
`npm i github:…#v0.1.0` work: npm clones the tag and runs it. Committing the
build would put an artefact in every diff and let the source and the build
disagree inside a tagged release.
