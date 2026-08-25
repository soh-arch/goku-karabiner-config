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
