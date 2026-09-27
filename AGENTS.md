# AGENTS.md

## Writing this file

Write each entry in `AGENTS.md` as a brief instruction saying what is
actually wanted. A short example is welcome as a model to follow, but this
is not a file for explaining facts.

## Comment policy for `AbcAct.edn`

Keep structural comments — section-title banners, block dividers, the
file-header legend. Drop trailing inline annotations on individual
manipulators; they're not needed except in the few cases below.

Rationale, tradeoffs, and "why this and not that" belong in `NOTES.md`,
not next to the code. Keep them out of the `.edn` file entirely. **Design
intent is never an inline comment**, however interesting it is.

An inline annotation earns its place in exactly two cases:

1. **The line would otherwise look broken.**
2. **The line's meaning can't be read off the file.** `f13` and `f16` say
   nothing on their own.

## `NOTES.md` is a record, not a rulebook

Read `NOTES.md` only when a task actively calls for that record — a past
gotcha or attempt it needs. Do not read it by default.

`NOTES.md` holds no rules. When one turns up there, delete it rather than
rewriting it into a correct rule: some principles in this config are
deliberately unwritten, and for those the correct state is that nothing is
written. A rule left in a record gets quoted as settled.

**Never write the same thing twice in `NOTES.md`. Reference it instead.**
The file already does this well in places — "see '`to` arrays don't hold
modifiers' above", "See 'Japanese input: `select_input_source` was tried
and abandoned' above for the full story" — and that is the shape to copy.

## Right block: disciplined and free sides

The right block currently shows these tendencies. Use them as a reference
when adding an action.

- It splits into a disciplined side (`h`/`j`/`k`/`l`) and a free side
  (`u`/`i`/`o`/`p`).
- `h`/`j`/`k`/`l` holds actions that come as a set of four; standalone
  actions sit on `u`/`i`/`o`/`p`.
- Where a tier divides by granularity, `u`/`i`/`o`/`p` takes the coarser
  unit: `h`/`j`/`k`/`l` moves one character or line while `u`/`i`/`o`/`p`
  jumps to a boundary; `h`/`j`/`k`/`l` nudges a window while
  `u`/`i`/`o`/`p` resizes it against the whole screen.
- Where a tier doesn't divide by granularity, `u`/`i`/`o`/`p` is used
  freely: a four-way direction set (scroll), or two pairs from different
  families (copy/paste with cut/paste-plain; fullscreen with hide).

## Consider classifying an action by what it acts on

An action's tier can also be judged by its *object* — the thing it opens,
moves, closes or focuses — rather than by the keystroke that reaches it or
the family that keystroke belongs to.

For example, `⌃F3` sits among focus shortcuts but points at the Dock, so
it can also be read as an app list rather than as focus movement.

When a placement looks arbitrary, check whether the action was classified
by its object or by the row its keystroke lives in.

## Layer/condition guards

Every rule scoped to a layer must spell out its full `:layer-*`/`:act-*`
guard stack, even when a shorter, "usually correct" version would work.

**One exception, and it is narrow.** A rule may omit `:act-*` flags when
the action it carries covers *every* combination of the omitted ones — a
complete sub-cube of tiers, not most of it — and no other rule for the same
`from` key claims any tier inside that sub-cube.

Use it only when the omission carries information. For example, Select All
on the auxiliary keys is guarded on `act-d`/`act-f` alone.

Two conditions, both required. The block must state which tiers it covers,
in a comment. And if any tier inside it later needs its own action, the
whole block splits into full stacks — it does not grow a narrower rule
alongside the wide one.

## Before editing or committing

Check `NOTES.md` first when touching held modifiers, multi-action `to`
chains, or global app hotkeys. Add new gotchas there too.

Before committing a change to `AbcAct.edn`, run `python3 scripts/check.py`.
It needs nothing installed, and it checks one thing: that no rule is
unreachable — an earlier rule on the same key matching every state it
does, which is the failure the guard rule above exists to prevent and the
one that never announces itself.

It cannot check a Raycast slug, a key code, or whether a binding is in the
right tier. A wrong slug is a well-formed string that matches no command
and fails silently; `goku` catches unknown key names; the rest is the
machine's to answer, or yours.

Keep the script to checks like the one it has: a mistake an LLM keeps
making despite care, that nothing else reports, and that a script catches
cleanly. A check that duplicates a loud failure elsewhere, or guards a
mistake that rarely happens, does not belong in it.

If `docs/index.html` changed in a way that shows in the README screenshots,
re-run `scripts/shoot-readme-images.py` and commit the regenerated
`assets/*.png` alongside it.

## Commits and pull requests

Write commit messages in English, following Conventional Commits. Write
pull requests — title and description — in English only.

Open one pull request per cohesive unit of functionality. Before adding
new content to an existing pull request, confirm it is not already closed.

Work on a branch and open a pull request instead of committing to `main`.

Before starting complex work, briefly state the plan and align on the
approach first.

## Naming

Use simple, concise English names for files and folders — clear to an
outside reader and unremarkable next to files from other projects. A
project-specific term is the exception, as in `AbcAct.edn`, `HyMeCO.edn`
and `HySCOT.edn`.

## Artifacts

Before producing an artifact — a page, a diagram, slides, a chart, any
one-off thing made to be looked at — read
`.claude/skills/visual-design-direction/SKILL.md` and follow it. A built-in
design skill does not replace it.

**This governs artifacts and nothing else.** Do not restyle
`docs/index.html` to match this direction; touch it only when the change
asked for is a change to the manual.
