/**
 * WHICH POPOVER OPENED WHICH, and therefore what counts as "outside".
 *
 * ── THE RULE THIS FILE EXISTS TO HOLD ───────────────────────────────────────
 *
 * Every popover closes when something outside it is clicked, and every popover
 * marks itself `data-popover-branch` so the one UNDERNEATH it does not treat
 * a click in it as outside. That worked while one menu at a time was the only
 * reachable state.
 *
 * It is not any more: a clock cell's panel opens a calendar, a ruler and a
 * colour window, each a popover. With every branch exempt from every
 * popover's click-away, a CHILD could never be closed by clicking back in its
 * parent — the calendar stayed open over the panel that opened it, and the
 * only way out was to dismiss both. Reported as "I cannot close it".
 *
 * So popovers are numbered in the order they open, and a popover ignores
 * clicks in branches opened AFTER it.
 *
 * ── WHY IT IS IN A FILE OF ITS OWN ──────────────────────────────────────────
 *
 * Because getting it wrong is invisible and it was got wrong immediately. A
 * branch marked by hand carries no number — and what it carries instead is
 * `"true"`, which is how React renders a bare attribute, NOT the empty
 * string. The first version compared `Number("true")`, which is NaN, and
 * every comparison with NaN is false: the column menu began closing on its
 * own submenu's rows, which is the exact bug the branch rule was written to
 * stop.
 *
 * Nothing about that looked wrong in the diff. A pure function can be asked.
 */

/**
 * THE NEXT NUMBER IN THE ORDER — every floating surface takes one as it opens.
 *
 * NOT ONLY THE ONES `Popover` DRAWS. Half the floating surfaces in this app
 * are portals a component renders itself and marks by hand, and an unnumbered
 * branch has to be assumed a child of whoever is asking — which is right
 * until that branch opens a popover of its own. Then the child is older than
 * its parent, the parent cannot be closed by clicking it, and the window
 * somebody opened from a hover submenu sits there until the whole menu goes.
 *
 * So the counter is exported and every branch takes one. The fallback below
 * stays for anything that has not, and is a fallback rather than the rule.
 */
let opened = 0
export const nextPopoverSeq = () => ++opened

/**
 * Is `marker` — the value of a `data-popover-branch` attribute — a branch that
 * the popover numbered `seq` should treat as its own?
 *
 * ANYTHING THAT IS NOT A NUMBER IS ASSUMED A CHILD, which is the safe way
 * round for a branch nobody has numbered: it keeps a hover submenu or a
 * picker from closing the menu it hangs off. It is a fallback and not the
 * rule — a branch that can open a popover of its own has to take a number, or
 * its child ends up older than it is.
 */
export function ownsBranch(marker, seq) {
  if (marker === null || marker === undefined) return false
  /* AN EMPTY MARKER IS HAND-MARKED TOO, and it has to be caught before the
     number: `Number('')` is 0, which is perfectly finite and loses to every
     sequence — so a branch written `data-popover-branch=""` would have been
     read as the oldest popover on screen rather than as a child. React
     renders a bare attribute as `"true"`, so this is the shape that arrives
     from anything built by hand or by a test. */
  if (String(marker).trim() === '') return true
  const its = Number(marker)
  return !Number.isFinite(its) || its > seq
}
