import { useEffect, useMemo, useRef, useState } from 'react'
import * as Icons from 'lucide-react'
import { Shuffle } from 'lucide-react'
import { EMOJI_GROUPS } from './emoji.js'
import { keepEmoji, readRecent, writeRecent } from '../lib/recent.js'
/* THE RULES, OUT OF THE RENDER. Which icons exist, which a typed phrase
   reaches, and what a stored colour name resolves to are three answers that
   can be wrong without anything throwing — so they live in a module a script
   can run. See `iconPalette.js` and `verify-icon-picker`. */
import { GLYPHS, PALETTE, colorToken, matchGlyphs } from './iconPalette.js'

/**
 * The icon picker — a lucide glyph or an emoji, with a colour.
 *
 * ONE PICKER, THIRTY-SIX CALLERS. A page's icon, a block's callout, a column,
 * a view tab, an element, a share card: all of them open this. So every
 * sentence below is about the only icon picker in the product, and a change
 * here is a change everywhere — which is the point of there being one.
 *
 * TWO KINDS, AND COLOUR ONLY APPLIES TO ONE. An emoji carries its own colour;
 * offering a swatch that does nothing to it would be a control that lies. So
 * the palette appears on the Icons tab and not on the Emoji tab.
 *
 * ── THE WHOLE LIBRARY, NOT A WINDOW ONTO IT ─────────────────────────────────
 *
 * The icon grid used to render `matches.slice(0, 120)`, with a line underneath
 * reading "N icons — type to narrow". That is not a long list, it is a SEARCH
 * BOX with a sample attached: browsing was impossible, and the only way to
 * reach an icon was to already know a word in its name. Somebody looking for
 * "the one that looks like a parcel" had no route to it at all.
 *
 * All of them are rendered now, and what makes that affordable is
 * `content-visibility: auto` with an intrinsic size (`CELL`): the browser
 * skips layout and paint for every cell outside the scroll port and reserves
 * exactly 28px for it, so the scrollbar is honest and only the rows in view
 * cost anything to draw.
 */

/**
 * Render whatever is stored. Null renders nothing, so a caller can decide what
 * the empty state looks like rather than being handed a placeholder.
 */
export function ProductIcon({ icon, size = 16, palette = PALETTE, legacy = {} }) {
  if (!icon) return null
  if (icon.kind === 'emoji') {
    return <span style={{ fontSize: size, lineHeight: 1 }}>{icon.value}</span>
  }
  const C = Icons[icon.value] ?? Icons.Package
  return <C size={size} strokeWidth={1.8} style={{ color: colorToken(icon.color, palette, legacy) }} />
}

/**
 * ONE CELL'S WORTH OF WORK, SKIPPED UNTIL IT IS ON SCREEN.
 *
 * `content-visibility: auto` is what makes 1,767 buttons affordable, and
 * `contain-intrinsic-size` is what makes it correct: without a declared size a
 * skipped cell measures zero, the grid collapses to nothing, and the scrollbar
 * jumps about as rows come into view.
 */
const CELL = { contentVisibility: 'auto', containIntrinsicSize: '28px 28px' }

/** Nine columns of 28px, which is what the panel's width is derived from. */
const GRID = { gridTemplateColumns: 'repeat(9, 28px)' }

/** A heading over a section of the grid. Sticky, so a long scroll stays placed. */
function Heading({ children }) {
  return (
    <div
      className="text-[10px] font-semibold uppercase tracking-wide sticky top-0"
      style={{
        color: 'var(--muted-foreground)',
        /* OPAQUE, because it is sticky over a scrolling grid — a transparent
           heading has emoji sliding visibly underneath its letters. */
        background: 'var(--card)',
        padding: '3px 2px',
        marginBlockEnd: 2,
      }}
    >
      {children}
    </div>
  )
}

function Cell({ title, selected, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        ...CELL,
        inlineSize: 28,
        blockSize: 28,
        borderRadius: 'var(--radius-base)',
        background: selected ? 'var(--accent-subtle)' : 'transparent',
      }}
      className="flex items-center justify-center cursor-pointer"
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--hover)'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent'
      }}
      {...rest}
    >
      {children}
    </button>
  )
}

/**
 * ── WHAT A CONSUMING APP DECIDES, AND WHY EACH ONE IS A PROP ───────────────
 *
 * `palette` / `legacy` — an app with its own colour vocabulary paints its
 *   icons in the same words as its chips, or one screen carries two
 *   palettes. `legacy` is the names it has RETIRED and still has to draw.
 *
 * `zIndex` — a stacking order is a claim about surfaces this library has
 *   never heard of. A number hardcoded here sits under somebody’s dialog
 *   in one app and over their toast in another, and nothing about either
 *   looks wrong in the file you are reading.
 *
 * `storageKey` — the recent trail. A library that writes its own name into
 *   an app’s localStorage has claimed a namespace it does not own, and an
 *   app that already has a trail would silently start again from empty.
 */
export function IconPicker({
  value,
  onPick,
  onClose,
  at,
  palette = PALETTE,
  legacy = {},
  zIndex = 320,
  storageKey = 'wui_recent_emoji',
}) {
  const [tab, setTab] = useState(value?.kind === 'emoji' ? 'emoji' : 'lucide')
  const [query, setQuery] = useState('')
  const [color, setColor] = useState(value?.color ?? 'default')
  const ref = useRef(null)
  /*
    READ ONCE, ON MOUNT, rather than on every render: the Recent row must not
    reorder itself under the cursor as somebody picks from it. A list that
    re-sorts between the look and the click is one that makes people hit the
    wrong thing.
  */
  const [recent] = useState(() => readRecent(storageKey, keepEmoji))

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

  /** Picking an emoji remembers it; picking a glyph or clearing does not. */
  const pick = (next) => {
    if (next?.kind === 'emoji' && next.value) writeRecent(storageKey, keepEmoji, next.value)
    onPick(next)
  }

  const glyphs = useMemo(() => matchGlyphs(query), [query])

  const emoji = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return EMOJI_GROUPS
    /*
      BY NAME, which is the whole reason the generated table carries them.

      With ninety-six emoji a search could only filter the four group names and
      the picker said so. With seventeen hundred, scrolling is not a way to
      find anything and the name is the only handle there is — "cat" has to
      reach the cat.

      Groups that match nothing are dropped rather than drawn empty: a column
      of headings over no results is a list that looks broken.
    */
    return EMOJI_GROUPS.map((g) => ({
      name: g.name,
      items: g.items.filter(([, name]) => name.includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [query])

  const nothing = tab === 'lucide' ? glyphs.length === 0 : emoji.length === 0

  const panel = {
    position: at ? 'fixed' : 'absolute',
    insetBlockStart: at ? Math.min(at.y, window.innerHeight - 400) : '100%',
    insetInlineStart: at ? Math.min(at.x, window.innerWidth - 332) : 0,
    zIndex,
    /* NINE COLUMNS OF 28 PLUS ITS GUTTERS AND PADDING. The width is derived
       from the grid rather than chosen: at 288 the ninth column did not fit
       and the row silently became eight, which is a different picker on a
       different screen. */
    inlineSize: 320,
    marginBlockStart: at ? 0 : 6,
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-base)',
    boxShadow: '0 14px 34px rgba(0,0,0,.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxBlockSize: 380,
  }

  return (
    <div ref={ref} style={panel} onClick={(e) => e.stopPropagation()}>
      {/* The two tabs, then the two things that are not tabs: a random pick and a clear. */}
      <div className="flex items-center gap-1 shrink-0" style={{ padding: '2px 4px 0' }}>
        {[
          ['lucide', 'Icons'],
          ['emoji', 'Emoji'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTab(id)
              setQuery('')
            }}
            className="text-xs cursor-pointer"
            style={{
              /* AN UNDERLINE, NOT A PILL. Two filled pills side by side read as
                 two buttons to press; an underlined word reads as the one you
                 are looking at, which is what a tab is. */
              blockSize: 28,
              paddingInline: 8,
              fontWeight: 500,
              color: tab === id ? 'var(--foreground)' : 'var(--muted-foreground)',
              borderBlockEnd: `2px solid ${tab === id ? 'var(--primary)' : 'transparent'}`,
              borderRadius: 0,
              background: 'transparent',
            }}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          title="Surprise me"
          onClick={() =>
            pick(
              tab === 'emoji'
                ? {
                    kind: 'emoji',
                    /* OUT OF SUGGESTED, not out of all seventeen hundred.
                       "Surprise me" is meant to hand somebody something they
                       might keep; drawn from everything it mostly returns a
                       symbol nobody wants on a page. */
                    value:
                      EMOJI_GROUPS[0].items[
                        Math.floor(Math.random() * EMOJI_GROUPS[0].items.length)
                      ][0],
                  }
                : {
                    kind: 'lucide',
                    value: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
                    color,
                  },
            )
          }
          className="rounded cursor-pointer flex items-center"
          style={{ blockSize: 24, paddingInline: 6, color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Shuffle size={12} strokeWidth={1.9} />
        </button>
        <button
          type="button"
          /* IN WORDS, not an ✕. The ✕ sat beside the shuffle glyph in the same
             grey at the same size, and "clear the icon" is not a thing to
             discover by hovering two unlabelled squares. */
          onClick={() => onPick(null)}
          className="text-xs rounded cursor-pointer"
          style={{ blockSize: 24, paddingInline: 8, color: 'var(--muted-foreground)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Remove
        </button>
      </div>

      <div className="shrink-0" style={{ padding: '6px 6px 4px' }}>
        <input
          autoFocus
          value={query}
          placeholder={tab === 'lucide' ? 'Search icons…' : 'Search emoji…'}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-sm"
          style={{
            blockSize: 28,
            paddingInline: 8,
            background: 'var(--input)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-base)',
            color: 'var(--foreground)',
            outline: 'none',
            minInlineSize: 0,
          }}
        />
      </div>

      {/* Colour applies to a GLYPH only — an emoji brings its own. */}
      {tab === 'lucide' && (
        <div className="flex items-center gap-1 flex-wrap shrink-0" style={{ padding: '0 6px 6px' }}>
          {palette.map((c) => (
            <button
              key={c.id}
              type="button"
              title={c.id}
              onClick={() => setColor(c.id)}
              className="rounded-full cursor-pointer shrink-0"
              style={{
                inlineSize: 16,
                blockSize: 16,
                background: c.hue,
                /* AN OUTLINE, NOT A BORDER. A border is inside the box, so
                   thickening it on the chosen swatch shrinks the colour by 2px
                   and the circles visibly change size as you click along the
                   row. An outline is drawn outside and moves nothing. */
                outline: color === c.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                outlineOffset: 1,
              }}
            />
          ))}
        </div>
      )}

      <div style={{ flex: 1, minBlockSize: 180, overflowY: 'auto', padding: '0 6px 6px' }}>
        {tab === 'lucide' ? (
          <div className="grid gap-0.5" style={GRID}>
            {glyphs.map((name) => {
              const C = Icons.icons[name]
              return (
                <Cell
                  key={name}
                  title={name}
                  selected={value?.kind === 'lucide' && value.value === name}
                  onClick={() => pick({ kind: 'lucide', value: name, color })}
                >
                  <C size={18} strokeWidth={1.9} style={{ color: colorToken(color, palette, legacy) }} />
                </Cell>
              )
            })}
          </div>
        ) : (
          <>
            {/*
              RECENT, AND ONLY WHEN NOTHING IS TYPED. A search is a request for
              a specific thing, and putting six emoji somebody used earlier
              above the one they just asked for is the list answering a
              question it was not asked.
            */}
            {!query && recent.length > 0 && (
              <div style={{ marginBlockEnd: 6 }}>
                <Heading>Recent</Heading>
                <div className="grid gap-0.5" style={GRID}>
                  {recent.map((e) => (
                    <Cell
                      key={`r-${e}`}
                      title={e}
                      data-emoji={e}
                      selected={value?.kind === 'emoji' && value.value === e}
                      onClick={() => pick({ kind: 'emoji', value: e })}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{e}</span>
                    </Cell>
                  ))}
                </div>
              </div>
            )}
            {emoji.map((group) => (
              <div key={group.name} style={{ marginBlockEnd: 6 }}>
                <Heading>{group.name}</Heading>
                <div className="grid gap-0.5" style={GRID}>
                  {group.items.map(([e, name]) => (
                    <Cell
                      key={e}
                      title={name}
                      data-emoji={e}
                      selected={value?.kind === 'emoji' && value.value === e}
                      onClick={() => pick({ kind: 'emoji', value: e })}
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>{e}</span>
                    </Cell>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
        {nothing && (
          <p
            className="text-xs flex items-center justify-center"
            style={{ color: 'var(--muted-foreground)', paddingBlock: 24 }}
          >
            No results
          </p>
        )}
      </div>
    </div>
  )
}
