/**
 * A harness, so the two components can be LOOKED AT.
 *
 * Everything else here is checkable by a script. What a picker looks like is
 * not, and both of these spend their lives inside an app, behind a sign-in,
 * several clicks deep — which is most of why the bugs in them went unnoticed.
 *
 * It is also the smallest possible consumer, and reads as one on purpose:
 * fifteen custom properties in `tokens.css`, a palette passed in, a stacking
 * number passed in, a storage key passed in. If this file needs something the
 * README does not mention, the README is wrong.
 */
import { createRoot } from 'react-dom/client'
import { useState } from 'react'
import './tokens.css'
import { ColorWell, HUES, IconPicker, ProductIcon } from '../src/index.js'

/* AN APP'S OWN PALETTE, as one would pass it. These are the library's own
   nine, restated here as `var()` to prove the thing the README claims: what
   is stored is a NAME, and the host decides what the name looks like. */
const APP_PALETTE = [
  { id: 'default', hue: 'var(--secondary-foreground)' },
  ...Object.entries(HUES).map(([id, hue]) => ({ id, hue })),
]

function Panel({ title, children }) {
  return (
    <section style={{ display: 'grid', gap: 10, minWidth: 360 }}>
      <h2 style={{ font: '600 12px/1 system-ui', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Harness() {
  const [icon, setIcon] = useState({ kind: 'lucide', value: 'Package', color: 'green' })
  const [openIcon, setOpenIcon] = useState(true)
  const [colour, setColour] = useState('#7c6cf0')
  const [theme, setTheme] = useState('dark')

  return (
    <div
      data-theme={theme}
      style={{ minHeight: '100vh', padding: 28, display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}
    >
      <Panel title="Icon picker">
        <div style={{ position: 'relative', width: 360 }}>
          <button
            type="button"
            data-open-icon
            onClick={() => setOpenIcon((v) => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-base)', color: 'var(--foreground)', cursor: 'pointer',
            }}
          >
            <ProductIcon icon={icon} size={18} palette={APP_PALETTE} />
            <span style={{ fontSize: 13 }}>{icon ? `${icon.kind}: ${icon.value}` : 'No icon'}</span>
          </button>
          {openIcon && (
            <IconPicker
              value={icon}
              palette={APP_PALETTE}
              zIndex={400}
              storageKey="harness_recent_emoji"
              onPick={(next) => {
                setIcon(next)
                setOpenIcon(false)
              }}
              onClose={() => setOpenIcon(false)}
            />
          )}
        </div>
        <pre data-icon-state style={{ font: '12px/1.5 ui-monospace, monospace', color: 'var(--muted-foreground)', margin: 0 }}>
          {JSON.stringify(icon)}
        </pre>
      </Panel>

      <Panel title="Colour picker">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ColorWell
            value={colour}
            fallback="var(--muted-foreground)"
            label="Any colour"
            clears
            size={22}
            zIndex={400}
            storageKey="harness_recent_colors"
            onPick={setColour}
          />
          <span style={{ font: '12px/1 ui-monospace, monospace' }}>{colour ?? 'none'}</span>
        </div>
        {/*
          `ColorPicker` IS OPENED FROM SOMETHING, never rendered in place: it
          reads `at.x` and `at.y` unconditionally and is `position: fixed`,
          because it is a window that appears next to the swatch you pressed.
          The first version of this harness rendered one with `at={null}` and
          got a TypeError on the first paint — which is the harness being a
          consumer, and finding out what the contract is by being wrong about
          it. The well above is the whole of how one is meant to be used.
        */}
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', maxWidth: 320, lineHeight: 1.5 }}>
          Press the circle. The window opens beside it, keeps a trail of what
          you used, and writes when the pointer is lifted rather than on every
          pixel of a drag &mdash; a drag across the square is a hundred colours,
          and a hundred undo entries is not an undo stack.
        </p>
      </Panel>

      <Panel title="Host">
        <button
          type="button"
          data-theme-toggle
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          style={{
            padding: '6px 10px', background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-base)', color: 'var(--foreground)', cursor: 'pointer', fontSize: 13,
          }}
        >
          Theme: {theme}
        </button>
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)', maxWidth: 320, lineHeight: 1.5 }}>
          Both pickers read the host&rsquo;s fifteen custom properties and ship no
          colours of their own. Switching the theme here changes nothing inside
          the library &mdash; which is the whole claim.
        </p>
      </Panel>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<Harness />)
