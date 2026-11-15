/**
 * EVERY EMOJI, from `emojibase` — fetched when a picker first opens.
 *
 * ── WHY NOT A TABLE IN THIS REPOSITORY ───────────────────────────────
 *
 * There was one, generated from `unicodedata`: 1,743 characters in seven
 * groups. It was complete enough to look complete and wrong in three ways
 * nobody would report as a bug.
 *
 *   NO FLAGS. A flag is a PAIR of regional indicators rather than one
 *   character, so it is in no Unicode block and the generator never saw one.
 *   A picker that has every emoji except the flags is a picker somebody
 *   searches "israel" in twice and then stops trusting.
 *
 *   THE NAMES WERE UNICODE 6. `heavy black heart`, `smiling face with
 *   heart-shaped eyes`. Searching "red heart" — which is what that character
 *   is called today and what anybody would type — found nothing.
 *
 *   AND THE GROUPS WERE BLOCKS, not categories. "Nature & things" held
 *   weather, plants and staplers, because that is how Unicode filed them.
 *   Proper categories live in CLDR, which the generator did not ship.
 *
 * `emojibase` is all three: 1,923 emoji with flags, CLDR labels, CLDR groups
 * and a list of TAGS per emoji — so "happy" reaches 😀 and "love" reaches
 * ❤️, which a search over labels alone cannot do.
 *
 * ── AND WHY IT IS FETCHED RATHER THAN IMPORTED ────────────────────────
 *
 * It is about a megabyte of JSON. Every page of every app that imports a
 * ProductIcon would carry it, to draw a sixteen-pixel glyph that is usually
 * a lucide one. A dynamic import makes it a chunk that arrives when somebody
 * opens the picker and never again — cached at module scope below, so the
 * first open pays for it and every reopen is instant.
 */

let cached = null

/**
 * THE OLD CURATED LIST, KEPT, and it is not nostalgia.
 *
 * It was the whole picker once — eighty-eight objects, on the argument that
 * a business naming a product reaches for one. That was true of the FIRST
 * choice and false of every one after it, which is why the rest arrived. It
 * is still the right answer to the first choice, so it still goes first, and
 * it is what "Surprise me" draws from: pulled from all 1,923 that button
 * mostly returns a symbol nobody wants on a page.
 *
 * IN CODE RATHER THAN FETCHED, because both of those jobs have to work
 * before a megabyte of JSON has arrived.
 */
export const SUGGESTED = [
  '📦', '🎁', '🏷', '🛍', '🧾', '📁', '📂', '🗂',
  '📄', '📋', '📌', '🔖', '📎', '🗃', '🧰', '🧱',
  '⚙', '🔧', '🔩', '🪛', '🧲', '🔑', '🗝', '🔐',
  '🎬', '🎥', '📷', '📸', '📹', '🎞', '🖼', '🎨',
  '🖌', '🖍', '✏', '🎙', '🎧', '🎵', '🎶', '🎤',
  '🔊', '📺', '💻', '🖥', '⌨', '🖱', '💾', '💿',
  '💰', '💵', '💳', '🧮', '📈', '📉', '📊', '🏦',
  '💎', '🪙', '🤝', '⏳', '⏱', '📅', '🗓', '🎯',
  '🏆', '🥇', '⭐', '✨', '🔥', '⚡', '🚀', '👤',
  '👥', '💼', '🏢', '🏠', '🏪', '🚚', '✈', '🌍',
  '📍', '📞', '✉', '💬', '🔔', '❤', '☕', '🍰',
]

/**
 * `{ list, sections }` — every emoji flat for searching, and grouped for
 * scrolling.
 *
 * An entry is `{ char, label, group, search }`, where `search` is the label
 * and the tags folded into one lower-case string: matching against that is
 * one `includes` per emoji rather than a walk over two fields and an array.
 */
/**
 * THE TABLE, BUILT FROM THE TWO FILES — pure, and separate from fetching them.
 *
 * ── WHY THE SPLIT, WHICH IS NOT TIDINESS ──────────────────────────────
 *
 * A JSON module cannot be imported the same way in both places this code
 * has to run. Node demands an import ATTRIBUTE (`with { type: 'json' }`) and
 * refuses without one; Vite serves JSON as a JavaScript module, so WITH the
 * attribute the browser checks the MIME type, finds `text/javascript`, and
 * refuses instead — the picker sits on "Loading…" for ever. Both measured.
 *
 * There is no spelling that satisfies both, so the import is a one-line
 * detail of the browser build and everything with a RULE in it is here,
 * where a script can hand it two parsed objects and check what comes out.
 */
export function buildEmojis(data, messages) {
  const groupName = new Map(messages.groups.map((g) => [g.order, g.message]))

  /* COMPONENTS ARE NOT EMOJI. Group 2 is skin-tone modifiers and hair
     components — pieces another emoji is built FROM, which on their own draw
     as a bare brown rectangle. An entry with no group at all is a regional
     indicator, half of a flag, and the same thing one level down. */
  const list = data
    .filter((e) => e.group != null && e.group !== 2)
    .map((e) => ({
      char: e.unicode,
      label: e.label || '',
      group: e.group,
      search: `${e.label || ''} ${(e.tags || []).join(' ')}`.toLowerCase(),
    }))

  const order = [...new Set(list.map((e) => e.group))].sort((a, b) => a - b)
  const byChar = new Map(list.map((e) => [e.char, e]))
  const sections = [
    /* SUGGESTED FIRST, and it is a section like any other so the grid needs
       no special case for it. A character the table does not recognise still
       draws — the curated list outlives any one version of the data. */
    {
      key: 'suggested',
      title: 'Suggested',
      items: SUGGESTED.map(
        (char) => byChar.get(char) ?? { char, label: char, group: -1, search: char },
      ),
    },
    ...order.map((g) => ({
      key: String(g),
      title: groupName.get(g) || 'Other',
      items: list.filter((e) => e.group === g),
    })),
  ]

  return { list, sections }
}

/**
 * `{ list, sections }`, fetched once and kept.
 *
 * An entry is `{ char, label, group, search }`, where `search` is the label
 * and the tags folded into one lower-case string: matching against that is
 * one `includes` per emoji rather than a walk over two fields and an array.
 */
export async function loadEmojis() {
  if (cached) return cached
  const [data, messages] = await Promise.all([
    import('emojibase-data/en/compact.json'),
    import('emojibase-data/en/messages.json'),
  ])
  cached = buildEmojis(data.default, messages.default)
  return cached
}
/** What a typed phrase reaches. An empty query is every emoji. */
export function matchEmojis(data, query) {
  const q = String(query ?? '').trim().toLowerCase()
  if (!data) return []
  if (!q) return data.list
  return data.list.filter((e) => e.search.includes(q))
}
