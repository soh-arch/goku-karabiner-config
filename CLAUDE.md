# CLAUDE.md

## Comment policy for `AbcAct.edn`

Keep structural comments — section-title banners, block dividers, the
file-header legend. Drop trailing inline annotations on individual
manipulators; they're not needed except in the few cases below.

Rationale, tradeoffs, and "why this and not that" belong in `NOTES.md`,
not next to the code. Keep them out of the `.edn` file entirely.

The only inline annotations worth keeping are the ones that record a
dependency the reader can't discover from the file alone — e.g. `f13`
and `f16` are meaningless without knowing Amical and Maccy are
configured (in those apps' own settings, not here) to listen for those
exact key codes as their trigger hotkeys.

## Layer/condition guards

Every rule scoped to a layer must spell out its full `:layer-*`/`:act-*`
guard stack, even when a shorter, "usually correct" version would work.
Karabiner fires only the first manipulator whose `from` and `conditions`
match, so an incomplete guard doesn't fail loudly — it silently lets the
wrong rule win under some input ordering.

## Before editing or committing

Check `NOTES.md` first when touching held modifiers, multi-action `to`
chains, or global app hotkeys — known gotchas are recorded there so the
same debugging loop doesn't happen twice. Add new gotchas there too.

Before every commit, run the EDN bracket-balance check on `AbcAct.edn`
and, if `docs/index.html` changed, the HTML tag-balance check.
