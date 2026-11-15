/**
 * COLOUR, AS NUMBERS — so the picker can be checked without clicking it.
 *
 * A square of saturation and value with a hue slider beside it is a shape
 * everybody recognises and nobody can verify by looking: the whole of it is
 * arithmetic between a position in a box and six hexadecimal digits, and an
 * off-by-one in that arithmetic is a colour that is almost right.
 *
 * So the arithmetic lives here, out of the component, where `verify-blocks`
 * runs it. The component is then the part a person can see being wrong.
 *
 * ── WHAT IS STORED ──────────────────────────────────────────────────────────
 *
 * `#rrggbb`, lower case, with the hash. The page body already holds colours in
 * that shape (the ten presets this replaced were written that way, and the
 * backgrounds carried a two-digit alpha suffix), so everything stored before
 * this reads back correctly — `hexToHsv` ignores an alpha it is given rather
 * than refusing the colour.
 */

/** `#abc`, `abc`, `#aabbcc`, `aabbccdd` → `#aabbcc`. Anything else → null. */
export function normalizeHex(input) {
  if (typeof input !== 'string') return null
  const raw = input.trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw
      .split('')
      .map((c) => c + c)
      .join('')}`.toLowerCase()
  }
  /* SIX OR EIGHT: the eight-digit form is a colour with an alpha, which is
     what every background preset was, and the colour part of it is still a
     colour. The alpha is dropped rather than carried, because this picker
     has no control for it and silently keeping 13% opacity would make a
     chosen colour come out wrong in a way nobody could see the cause of. */
  if (/^[0-9a-fA-F]{6}$/.test(raw) || /^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6)}`.toLowerCase()
  }
  return null
}

/** `#rrggbb` → `{ h: 0–360, s: 0–1, v: 0–1 }`, or null if it is not one. */
export function hexToHsv(hex) {
  const clean = normalizeHex(hex)
  if (!clean) return null
  const r = parseInt(clean.slice(1, 3), 16) / 255
  const g = parseInt(clean.slice(3, 5), 16) / 255
  const b = parseInt(clean.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const span = max - min
  /* GREY HAS NO HUE, and the formula below would divide by zero asking for
     one. Zero is as good an answer as any — the slider has to point
     somewhere, and a grey is grey at every hue. */
  let h = 0
  if (span !== 0) {
    if (max === r) h = ((g - b) / span) % 6
    else if (max === g) h = (b - r) / span + 2
    else h = (r - g) / span + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : span / max, v: max }
}

const byte = (n) =>
  Math.max(0, Math.min(255, Math.round(n * 255)))
    .toString(16)
    .padStart(2, '0')

/** `{ h, s, v }` → `#rrggbb`. Out-of-range values are brought back in. */
export function hsvToHex({ h, s, v }) {
  const hue = ((Number(h) || 0) % 360 + 360) % 360
  const sat = Math.max(0, Math.min(1, Number(s) || 0))
  const val = Math.max(0, Math.min(1, Number(v) || 0))
  const c = val * sat
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = val - c
  const [r, g, b] =
    hue < 60
      ? [c, x, 0]
      : hue < 120
        ? [x, c, 0]
        : hue < 180
          ? [0, c, x]
          : hue < 240
            ? [0, x, c]
            : hue < 300
              ? [x, 0, c]
              : [c, 0, x]
  return `#${byte(r + m)}${byte(g + m)}${byte(b + m)}`
}


/**
 * `rgb(22, 179, 100)` — what a browser says a colour IS — → `#16b364`.
 *
 * Pure, and separate from the DOM call below, because this is the half that
 * can be wrong: a channel read out of the wrong capture group is a colour
 * that is almost right, which is the thing this whole file exists to put
 * where it can be checked. `rgba()` is accepted and its alpha dropped, for
 * the reason `normalizeHex` drops an eight-digit one.
 */
export function rgbToHex(value) {
  if (typeof value !== 'string') return null
  const parts = value.trim().match(/^rgba?\(\s*([0-9.]+)[\s,]+([0-9.]+)[\s,]+([0-9.]+)/i)
  if (!parts) return null
  const [r, g, b] = parts.slice(1, 4).map(Number)
  if ([r, g, b].some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return null
  return `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`
}

/**
 * WHERE THE SQUARE OPENS, for a colour that is not written as a hex.
 *
 * The stock ladder on a clock column is `var(--success)`, `var(--warning)`
 * and `var(--danger)` — which is older than any colour picker and is what
 * every column nobody has edited still holds. Those are real colours and the
 * hex arithmetic cannot read one, so the picker had nowhere to put its
 * handle and opened on its fallback: a blue, on a band that is green. A
 * window that opens showing a colour the thing is not reads as the window
 * having already changed it.
 *
 * So ask the browser, which is the only thing that knows what `--success`
 * currently means — and it is also the only thing that knows it CHANGED,
 * when somebody switches theme. Nothing is stored; this is only where the
 * handle starts.
 */
export function cssHex(value) {
  const hex = normalizeHex(value)
  if (hex) return hex
  if (typeof value !== 'string' || !value || typeof document === 'undefined') return null
  const probe = document.createElement('span')
  /* IN THE DOCUMENT, or a custom property has no ancestor to resolve
     against and the computed colour comes back as the initial black. */
  probe.style.cssText = 'position:fixed;inset-block-start:-9999px;pointer-events:none'
  probe.style.color = value
  if (!probe.style.color) return null
  document.body.appendChild(probe)
  const seen = getComputedStyle(probe).color
  probe.remove()
  return rgbToHex(seen)
}
