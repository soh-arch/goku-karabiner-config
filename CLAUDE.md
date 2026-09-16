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

## `h`/`j`/`k`/`l` is the disciplined side; `u`/`i`/`o`/`p` is the free side

The right hand's eight keys are not peers. **`h`/`j`/`k`/`l` is the
disciplined side and `u`/`i`/`o`/`p` is the free side** — an asymmetry that
runs through all 16 tiers. When deciding where a new action goes, settle
which side it belongs to first.

Put **only actions that come as a set of four** on `h`/`j`/`k`/`l`. Never
park a single self-contained action on one of them. This holds without
exception across all 16 tiers: even the tiers carrying no directional
meaning (`aSDf`'s four IME conversions, `ASDf`'s undo / redo / back /
forward) still put four members of one family there. **If you want to place
a standalone action, use `u`/`i`/`o`/`p`.**

Where a tier divides by granularity at all, **`u`/`i`/`o`/`p` takes the
coarser unit**: `h`/`j`/`k`/`l` moves one character or one line while
`u`/`i`/`o`/`p` jumps to a boundary — the line's, the page's, or the
document's; `h`/`j`/`k`/`l` nudges a window a short distance while
`u`/`i`/`o`/`p` resizes it against the whole screen.

Some tiers don't divide by granularity at all. There `u`/`i`/`o`/`p` may be
used freely: a four-way direction set (scroll), or two pairs from different
families (copy/paste with cut/paste-plain; fullscreen with hide). That is
what the free side means — and keeping that freedom *out* of `h`/`j`/`k`/`l`
is what the disciplined side is for.

## Two questions, in this order

Before placing an action, answer both. They are independent, and
collapsing them into one is the easy mistake.

**1. Does it need a key here at all?** Actions that appear inside a *run*
of operations belong on the keymap; actions invoked once, from outside any
run, do not. This is not exclusive — the same action can live on the
keymap and in Raycast, used in different situations. See "Why the right
block is positional, not mnemonic" in `NOTES.md`.

**2. If it needs a key, how is it implemented?** Raycast when the action
presents UI; a plain script (`osascript`/shell) when it doesn't; then
non-`fn` modifiers; `fn` last.

**The trap:** "Raycast already has this command" answers question 2. It
never answers question 1. An action that still appears in a run keeps its
key even when a Raycast equivalent exists.

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

If `docs/index.html` changed in a way that shows in the README screenshots,
re-run `scripts/shoot-readme-images.py` and commit the regenerated
`assets/*.png` alongside it — otherwise the README shows a stale manual.
