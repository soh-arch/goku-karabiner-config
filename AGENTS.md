# AGENTS.md

## Working in this repository

### README screenshots

If `docs/index.html` changed in a way that shows in the README screenshots,
re-run `scripts/shoot-readme-images.py` and commit the regenerated
`assets/*.png` alongside it.

### Commits and pull requests

Write commit messages in English, following Conventional Commits. Write
pull requests — title and description — in English only.

Open one pull request per cohesive unit of functionality. Before adding
new content to an existing pull request, confirm it is not already closed.

Work on a branch and open a pull request instead of committing to `main`.

Before starting complex work, briefly state the plan and align on the
approach first.

### Naming

Use simple, concise English names for files and folders — clear to an
outside reader and unremarkable next to files from other projects. A
project-specific term is the exception, as in `AbcAct.edn`, `HyMeCO.edn`
and `HySCOT.edn`.

### Artifacts

Before producing an artifact — a page, a diagram, slides, a chart, any
one-off thing made to be looked at — read
`.claude/skills/visual-design-direction/SKILL.md` and follow it. A built-in
design skill does not replace it.

**This governs artifacts and nothing else.** Do not restyle
`docs/index.html` to match this direction; touch it only when the change
asked for is a change to the manual.

## `AbcAct.edn`

### Comment policy

Keep structural comments — section-title banners, block dividers, the
file-header legend. Drop trailing inline annotations on individual
manipulators; they're not needed except in the two cases below.

Rationale, tradeoffs, and "why this and not that" belong in `NOTES.md`,
not next to the code. Keep them out of the `.edn` file entirely. **Design
intent is never an inline comment**, however interesting it is.

An inline annotation earns its place in exactly two cases:

1. The line would otherwise look broken.
2. The line's meaning can't be read off the file (e.g. `f13`, `f16`).

### Layer and condition guards

Every rule scoped to a layer must spell out its full `:layer-*`/`:act-*`
guard stack, even when a shorter, "usually correct" version would work.

The one exception is narrow. A rule may omit `:act-*` flags only when both
hold:

1. The action it carries covers *every* combination of the omitted flags —
   a complete sub-cube of tiers, not most of it.
2. No other rule for the same `from` key claims any tier inside that
   sub-cube.

Use it only when the omission carries information. For example, Select All
on the auxiliary keys is guarded on `act-d`/`act-f` alone.

When using it, both of these are required:

- State which tiers the block covers, in a comment.
- If any tier inside it later needs its own action, split the whole block
  into full stacks — do not grow a narrower rule alongside the wide one.

### Right block: disciplined and free sides

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

### Classifying an action by its object

An action's tier can also be judged by its *object* — the thing it opens,
moves, closes or focuses — rather than by its keystroke or that
keystroke's family.

For example, `⌃F3` sits among focus shortcuts but points at the Dock, so
it can also be read as an app list rather than as focus movement.

When a placement looks arbitrary, check whether the action was classified
by its object or by the row its keystroke lives in.

## `NOTES.md`

Read `NOTES.md` only when a task actively calls for that record — a past
gotcha or attempt it needs. Do not read it by default.

`NOTES.md` holds no rules. When one turns up there, delete it rather than
rewriting it into a correct rule: some principles in this config are
deliberately unwritten, and for those the correct state is that nothing is
written. A rule left in a record gets quoted as settled.

**Never write the same thing twice in `NOTES.md`. Reference it instead.**
The file already does this well in places, and that is the shape to copy:

- "see '`to` arrays don't hold modifiers' above"
- "See 'Japanese input: `select_input_source` was tried and abandoned'
  above for the full story"

## Editing this file

Write each entry in `AGENTS.md` as a brief instruction saying what is
actually wanted. A short example is welcome as a model to follow, but this
is not a file for explaining facts.

When editing this file:

- Not everything needs a rule or a recommendation. Leaving a topic
  unmentioned is sometimes the right choice.
- Write from what the owner actually raised, not from what an agent would
  like to add.
- Keep the owner's nuance. Do not strengthen or shift it by guesswork; when
  that risk comes up, ask the owner.
