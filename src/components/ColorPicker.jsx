import { useEffect, useRef, useState } from 'react'
import { cssHex, hexToHsv, hsvToHex, normalizeHex } from '../lib/color.js'
import { nextPopoverSeq } from '../lib/popoverOrder.js'
import { readRecent, writeRecent } from '../lib/recent.js'

/* WHAT COUNTS AS A COLOUR WORTH REMEMBERING is the same question as "is
   this a colour at all", so the trail is kept by the same function that
   reads one. Anything else stored under the key is dropped. */
const keepHex = (value) => normalizeHex(value)

/**
 * ANY COLOUR, FROM ONE CIRCLE.
 *
 * ── WHAT THIS REPLACED, AND WHY ─────────────────────────────────────────────
 *
 * Twenty swatches: ten for the text, ten for the background, both rows drawn
 * in every block's menu whether or not anybody wanted a colour. Ten is not
 * "any colour" — it is somebody else's ten — and twenty squares is most of
 * the height of a menu whose other rows are what the menu is for.
 *
 * So the menu carries one circle, showing what the block is wearing, and this
 * opens from it.
 *
 * ── A SQUARE, A SLIDER, AND WHAT YOU USED LAST ──────────────────────────────
 *
 * The square is saturation across and value down, at the hue the slider is
 * set to — the arrangement every image editor has, so there is nothing to
 * learn. The arithmetic is in `lib/color.js`, where it can be checked.
 *
 * Under it is the short trail of colours this person has used, because a
 * picker with nothing under it means mixing the same grey again by eye every
 * time a second paragraph wants it. The FIRST of them is pinned and is not a
 * colour at all: it is the default — the app's own background for a fill, its
 * own text colour for words — and picking it takes the colour off rather than
 * painting one on. A way back is the one thing a free picker must not leave
 * somebody to guess at.
 *
 * ── IT WRITES WHEN THE POINTER IS LIFTED, not while it moves ────────────────
 *
 * A drag across the square is a hundred colours. Each one written to the
 * block is a hundred entries on the undo stack, and Ctrl+Z after a drag would
 * walk back through every shade. The swatch beside the box shows the colour
 * under the pointer; the block gets it when the drag ends.
 */
/**
 * ── WHAT A CONSUMING APP DECIDES ───────────────────────────────────────────
 *
 * `zIndex` — a stacking order is a claim about surfaces this library has
 *   never heard of, so a number hardcoded here sits under one app’s dialog
 *   and over another’s toast with nothing in either file looking wrong.
 *
 * `storageKey` — the trail of colours this person has used. A library that
 *   writes its own name into an app’s localStorage has claimed a namespace
 *   it does not own, and an app with an existing trail would start empty.
 */
export function ColorPicker({
  at,
  targets,
  onPick,
  onClose,
  zIndex = 320,
  storageKey = 'wui_recent_colors',
}) {
  const first = targets[0]
  /* ITS PLACE IN THE ORDER OF OPEN SURFACES — see `lib/popoverOrder`.
     Without a number this window is a click OUTSIDE the menu it was opened
     from: a block's menu survived because it listens for a mousedown this
     window stops, but a hover submenu and a `Popover` ask the DOM instead,
     and both closed themselves — taking the picker with them — the instant
     the square was touched. A branch marked by hand must take a number or
     its own children end up older than it is. */
  const [branchSeq] = useState(nextPopoverSeq)
  const [active, setActive] = useState(first.id)
  const target = targets.find((t) => t.id === active) ?? first
  const [hsv, setHsv] = useState(() => hexToHsv(first.value) ?? { h: 210, s: 0.6, v: 0.8 })
  const [typed, setTyped] = useState(null)
  const [recent, setRecent] = useState(() => readRecent(storageKey, keepHex))
  const ref = useRef(null)

  useEffect(() => {
    const away = (e) => !ref.current?.contains(e.target) && onClose()
    const esc = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [onClose])

  const hex = hsvToHex(hsv)
  /* WHAT THE SQUARE IS SHOWING RIGHT NOW, readable from inside a drag. The
     handlers that track a drag are attached to the window when the pointer
     goes down, so everything they close over is as it was then — a ref is
     the one thing that still answers for the end of the drag. */
  const live = useRef(hsv)
  live.current = hsv

  /** Chosen: remembered, and written to whichever colour is being painted. */
  const choose = (value) => {
    if (value) setRecent(writeRecent(storageKey, keepHex, value))
    onPick(target.id, value)
  }
  const commit = () => choose(hsvToHex(live.current))

  /* SWITCHING WHAT YOU ARE PAINTING MOVES THE PICKER TO IT, so the square
     opens where that colour already is rather than where the other one was. */
  const switchTo = (t) => {
    setActive(t.id)
    setTyped(null)
    const its = hexToHsv(t.value)
    if (its) setHsv(its)
  }

  const panel = {
    position: 'fixed',
    insetBlockStart: Math.max(8, Math.min(at.y, window.innerHeight - 316)),
    insetInlineStart: Math.max(8, Math.min(at.x, window.innerWidth - 248)),
    zIndex,
    inlineSize: 232,
    padding: 8,
    background: 'var(--card)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-base)',
    boxShadow: 'var(--shadow-popover)',
  }

  return (
    <div
      ref={ref}
      style={panel}
      data-color-picker
      data-popover-branch={branchSeq}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* WHICH OF THE TWO — and each chip wears the colour it stands for, so
          the window says what the block currently looks like before anything
          is changed. */}
      {targets.length > 1 ? (
        <div className="flex items-center" style={{ gap: 4, marginBlockEnd: 7 }}>
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTo(t)}
              className="flex items-center gap-1.5 rounded cursor-pointer text-[11px]"
              style={{
                flex: 1,
                padding: '3px 6px',
                color: t.id === active ? 'var(--foreground)' : 'var(--muted-foreground)',
                background: t.id === active ? 'var(--input)' : 'transparent',
                border: `1px solid ${t.id === active ? 'var(--border-strong)' : 'transparent'}`,
              }}
            >
              <span
                style={{
                  inlineSize: 10,
                  blockSize: 10,
                  borderRadius: 3,
                  flexShrink: 0,
                  background: t.value ?? t.fallback,
                  border: '1px solid var(--border)',
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      <Area hsv={hsv} onChange={setHsv} onEnd={commit} />
      <Hue h={hsv.h} onChange={(h) => setHsv((s) => ({ ...s, h }))} onEnd={commit} />

      <div className="flex items-center" style={{ gap: 6, marginBlockStart: 7 }}>
        <span
          title="What is under the pointer"
          style={{
            inlineSize: 22,
            blockSize: 22,
            borderRadius: 5,
            flexShrink: 0,
            background: hex,
            border: '1px solid var(--border)',
          }}
        />
        <input
          value={typed ?? hex}
          spellCheck={false}
          onChange={(e) => {
            setTyped(e.target.value)
            const clean = normalizeHex(e.target.value)
            if (clean) setHsv(hexToHsv(clean))
          }}
          onBlur={() => {
            const clean = normalizeHex(typed ?? '')
            setTyped(null)
            if (clean) choose(clean)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTyped(null)
              e.currentTarget.blur()
            }
          }}
          className="text-xs rounded"
          style={{
            flex: 1,
            minInlineSize: 0,
            padding: '3px 6px',
            background: 'var(--input)',
            border: '1px solid var(--border)',
            color: 'var(--foreground)',
            outline: 'none',
            fontFamily: 'var(--font-mono, monospace)',
          }}
        />
      </div>

      <p
        className="text-[10px] uppercase tracking-wide"
        style={{ padding: '7px 0 4px', color: 'var(--muted-foreground)' }}
      >
        Recent
      </p>
      <div className="flex items-center" style={{ gap: 4, flexWrap: 'wrap' }}>
        {/* PINNED, AND NOT A COLOUR: the way back to no colour at all. A fill
            returns to the page's own background and words to the colour they
            are written in — which is what "default" means on each of them. */}
        <button
          type="button"
          title={`Default — ${target.clears ?? 'no colour of its own'}`}
          onClick={() => choose(null)}
          className="rounded cursor-pointer"
          style={{
            inlineSize: 20,
            blockSize: 20,
            flexShrink: 0,
            background: target.fallback,
            border: `1px solid ${target.value ? 'var(--border)' : 'var(--primary)'}`,
            boxShadow: 'inset 0 0 0 1px var(--card)',
          }}
        />
        {recent.map((value) => (
          <button
            key={value}
            type="button"
            title={value}
            onClick={() => choose(value)}
            className="rounded cursor-pointer"
            style={{
              inlineSize: 20,
              blockSize: 20,
              flexShrink: 0,
              background: value,
              border: `1px solid ${target.value === value ? 'var(--primary)' : 'var(--border)'}`,
            }}
          />
        ))}
        {recent.length === 0 ? (
          <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            Nothing yet — the colours you use appear here.
          </span>
        ) : null}
      </div>
    </div>
  )
}

/**
 * ONE COLOUR, ONE CIRCLE — the front door to the window above.
 *
 * A BLOCK HAS TWO COLOURS and opens the picker with both; an option, a band
 * and a round have one each, and all three had their own row of nine swatches
 * plus — on a band — a native colour well beside it, because nine is not any
 * colour. Three copies of the same control, differing in which colours they
 * offered and whether picking one closed the row.
 *
 * So: a circle wearing the colour, and the same window under it. It holds the
 * window OPEN after a pick, which the round's swatch row did not: the thing
 * somebody does after choosing a colour is look at it and choose a slightly
 * different one, and a control that shuts on first contact makes that four
 * clicks instead of one.
 */
export function ColorWell({
  value,
  fallback,
  label,
  clears,
  title,
  handle,
  size = 15,
  zIndex = 320,
  storageKey = 'wui_recent_colors',
  onPick,
}) {
  const [at, setAt] = useState(null)

  return (
    <>
      <button
        type="button"
        /* ALWAYS SET, so `[data-color-well]` finds every one of them, and
           carrying the caller's handle when a panel has several. */
        data-color-well={handle ?? ''}
        title={title ?? 'Pick a colour'}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          /* BESIDE IT, NOT OVER IT. The window is 232 wide and the panel it
             opens from is often narrower than that, so anchoring it on the
             circle's own left edge would put it over the control that opened
             it — and over the preview that is the reason to be looking.

             WHERE THE SQUARE OPENS is worked out HERE rather than in the
             render, because `cssHex` asks the browser by putting a node in
             the document and reading it back: once, when the window opens,
             and not on every pass of every chip on the page. A colour stored
             as `var(--success)` — which the stock clock ladder is, and every
             column nobody has edited still holds — is a real colour the hex
             arithmetic cannot read, so without this the picker fell back to
             its own blue on a band that is green, and a window that opens
             showing a colour the thing is not reads as having changed it. */
          setAt({ x: r.right + 6, y: r.top - 6, seat: cssHex(value) })
        }}
        className="rounded-full cursor-pointer shrink-0"
        style={{
          inlineSize: size,
          blockSize: size,
          padding: 0,
          background: value ?? fallback,
          border: `1px solid ${value ? 'var(--border-strong)' : 'var(--border)'}`,
          boxShadow: 'inset 0 0 0 1px var(--card)',
        }}
      />
      {at ? (
        <ColorPicker
          at={at}
          zIndex={zIndex}
          storageKey={storageKey}
          targets={[{ id: 'color', label: label ?? 'Colour', value: at.seat ?? null, fallback, clears }]}
          onPick={(_, picked) => onPick(picked)}
          onClose={() => setAt(null)}
        />
      ) : null}
    </>
  )
}

/**
 * The square: saturation across, value down, at one hue.
 *
 * DRAGGING IS TRACKED ON THE WINDOW, not on the square, so a pointer that
 * leaves it mid-drag keeps painting instead of stopping at the edge — which
 * is how every one of these behaves and how somebody reaches pure black.
 */
function Area({ hsv, onChange, onEnd }) {
  const box = useRef(null)
  const live = useRef(hsv)
  live.current = hsv

  const start = (e) => {
    e.preventDefault()
    const rect = box.current?.getBoundingClientRect()
    if (!rect) return
    const read = (ev) => {
      const s = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      const v = 1 - Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height))
      const next = { ...live.current, s, v }
      live.current = next
      onChange(next)
    }
    const up = () => {
      window.removeEventListener('mousemove', read)
      window.removeEventListener('mouseup', up)
      onEnd()
    }
    read(e)
    window.addEventListener('mousemove', read)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={box}
      onMouseDown={start}
      style={{
        position: 'relative',
        blockSize: 112,
        borderRadius: 6,
        cursor: 'crosshair',
        /* WHITE TO THE HUE ACROSS, TRANSPARENT TO BLACK DOWN — two gradients
           over each other is the whole of it, and it costs no canvas. */
        background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        border: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          insetInlineStart: `${hsv.s * 100}%`,
          insetBlockStart: `${(1 - hsv.v) * 100}%`,
          inlineSize: 10,
          blockSize: 10,
          marginInlineStart: -5,
          marginBlockStart: -5,
          borderRadius: '50%',
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,.45)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

/** The hue slider, dragged the same way for the same reason. */
function Hue({ h, onChange, onEnd }) {
  const bar = useRef(null)
  const live = useRef(h)
  live.current = h

  const start = (e) => {
    e.preventDefault()
    const rect = bar.current?.getBoundingClientRect()
    if (!rect) return
    const read = (ev) => {
      const next = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) * 360
      live.current = next
      onChange(next)
    }
    const up = () => {
      window.removeEventListener('mousemove', read)
      window.removeEventListener('mouseup', up)
      onEnd()
    }
    read(e)
    window.addEventListener('mousemove', read)
    window.addEventListener('mouseup', up)
  }

  return (
    <div
      ref={bar}
      onMouseDown={start}
      style={{
        position: 'relative',
        blockSize: 12,
        marginBlockStart: 7,
        borderRadius: 999,
        cursor: 'ew-resize',
        background:
          'linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)',
        border: '1px solid var(--border)',
      }}
    >
      <span
        style={{
          position: 'absolute',
          insetInlineStart: `${(h / 360) * 100}%`,
          insetBlockStart: '50%',
          inlineSize: 12,
          blockSize: 12,
          marginInlineStart: -6,
          marginBlockStart: -6,
          borderRadius: '50%',
          background: `hsl(${h} 100% 50%)`,
          border: '2px solid #fff',
          boxShadow: '0 0 0 1px rgba(0,0,0,.45)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
