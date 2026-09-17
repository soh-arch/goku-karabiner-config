# CLAUDE.md

## Comment policy for `AbcAct.edn`

Keep structural comments — section-title banners, block dividers, the
file-header legend. Drop trailing inline annotations on individual
manipulators; they're not needed except in the few cases below.

Rationale, tradeoffs, and "why this and not that" belong in `NOTES.md`,
not next to the code. Keep them out of the `.edn` file entirely. **Design
intent is never an inline comment**, however interesting it is.

An inline annotation earns its place in exactly two cases:

1. **The line would otherwise look broken.** A reader who can't tell a
   deliberate binding from a mistake will go looking for a bug that isn't
   there, or "fix" one that works.
2. **The line's meaning can't be read off the file.** `f13` and `f16` say
   nothing on their own — they work only because Amical and Maccy are
   configured, in those apps' own settings, to listen for those exact key
   codes.

Both are about the code being unreadable or suspicious on its face.
Neither is about why the design is the way it is.

## `h`/`j`/`k`/`l` is the disciplined side; `u`/`i`/`o`/`p` is the free side

The right hand's eight keys are not peers. **`h`/`j`/`k`/`l` is the
disciplined side and `u`/`i`/`o`/`p` is the free side** — an asymmetry that
runs through all 16 tiers. When deciding where a new action goes, settle
which side it belongs to first.

Put **only actions that come as a set of four** on `h`/`j`/`k`/`l`. Never
park a single self-contained action on one of them. This holds without
exception across all 16 tiers: even the tiers carrying no directional
meaning (`aSDf`'s four IME conversions, `ASDf`'s outdent / undo / redo /
indent) still put four members of one family there. **If you want to place
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

## Classify an action by what it acts on, never by its shortcut

Which tier an action belongs to is decided by its *object* — the thing it
opens, moves, closes or focuses. The keystroke that happens to reach it,
and the family that keystroke belongs to, say nothing about that.

The same trap as above, running the other way: there, an implementation
detail was read as an answer about placement; here, it is read as an answer
about kind.

`⌃F3` is the worked example. It sits in the `⌃F` row with "move focus to
the menu bar", "…to the window toolbar", "…to the status menus", so it is
natural to file it as a focus-movement action and then find it has no
opposite anywhere near it. But `⌃F3` points at the Dock, and the Dock is
where apps are — Apple describes it as "a convenient place to access apps
and features that you're likely to use every day," used to open apps and
"switch between apps." Filed by its object it is an app-list surface, a
permanently visible Launchpad, and it pairs cleanly against closing an app.
Nothing changed except which question was asked first.

When a placement looks arbitrary, check whether the action was classified
by its object or by the row its keystroke lives in.

## Layer/condition guards

Every rule scoped to a layer must spell out its full `:layer-*`/`:act-*`
guard stack, even when a shorter, "usually correct" version would work.
Karabiner fires only the first manipulator whose `from` and `conditions`
match, so an incomplete guard doesn't fail loudly — it silently lets the
wrong rule win under some input ordering.

**One exception, and it is narrow.** A rule may omit `:act-*` flags when
the action it carries covers *every* combination of the omitted ones — a
complete sub-cube of tiers, not most of it — and no other rule for the same
`from` key claims any tier inside that sub-cube. Then the short guard is
not an approximation of the long one; it is the same set, written once.

Use it only when the omission carries information. Select All on the
auxiliary keys is guarded on `act-d`/`act-f` alone because all four
`act-a`/`act-s` tiers really do agree, and writing that once says so.
Spelling it out four times would say the same thing while losing the claim
that the four agree.

Two conditions, both required. The block must state which tiers it covers,
in a comment, so a reader can check the sub-cube without deriving it. And
if any tier inside it later needs its own action, the whole block splits
into full stacks — it does not grow a narrower rule alongside the wide one,
because that is exactly the shape where the wrong rule wins silently.

## Before editing or committing

Check `NOTES.md` first when touching held modifiers, multi-action `to`
chains, or global app hotkeys — known gotchas are recorded there so the
same debugging loop doesn't happen twice. Add new gotchas there too.

Before every commit, run `python3 scripts/check.py`. It reads the files
and needs nothing installed. It checks bracket balance in every `.edn`,
tag balance in `docs/index.html`, that no rule is unreachable — an earlier
rule on the same key matching every state it does, which is the failure
the guard rule above exists to prevent and the one that never announces
itself — and that code outside comments and strings stays ASCII.

It cannot check a Raycast slug, a key code, or whether a binding is in the
right tier. A wrong slug is a well-formed string that matches no command
and fails silently; `goku` catches unknown key names; the rest is the
machine's to answer, or yours.

If `docs/index.html` changed in a way that shows in the README screenshots,
re-run `scripts/shoot-readme-images.py` and commit the regenerated
`assets/*.png` alongside it — otherwise the README shows a stale manual.

## Commits and pull requests

Write commit messages in English, following Conventional Commits. Write
pull requests — title and description — in English only.

Open one pull request per cohesive unit of functionality. Before adding
new content to an existing pull request, confirm it is not already closed.

Never push directly to a protected branch. Nothing here is protected in
GitHub's settings, so this holds as discipline rather than as an enforced
rule: work on a branch and open a pull request instead of committing to
`main`.

Before starting complex work, briefly state the plan and align on the
approach first.

## Naming

Use simple, concise English names for files and folders — clear to an
outside reader and unremarkable next to files from other projects. A
project-specific term is the exception, and `AbcAct.edn`, `HyMeCO.edn` and
`HySCOT.edn` are it: each names the keymap it holds, which is the point of
them.

## Images

Before committing an image that will be published — the README, `docs/`,
`assets/` — confirm its EXIF carries no location data. **Any GPS tag count
above zero means the file carries coordinates**: strip them or choose
another image, and do not commit it.

```bash
python3 -c "import sys
from PIL import Image
for p in sys.argv[1:]:
    print(p, len(Image.open(p).getexif().get_ifd(0x8825)), 'GPS tags')" assets/*.png
```

If the check cannot run — the format will not open, Pillow is missing —
treat the image as carrying location data and stop. Say so rather than
committing on the assumption that it is clean.

The screenshots `scripts/shoot-readme-images.py` regenerates carry none,
because they are rendered from a local page. A photograph added by hand is
the case this guards against.

## Artifacts

Before producing an artifact — a page, a diagram, slides, a chart, any
one-off thing made to be looked at — read
`.claude/skills/visual-design-direction/SKILL.md` and follow it. A built-in
design skill does not replace it.

**This governs artifacts and nothing else.** `docs/index.html` is the
published manual, not an artifact: it carries its own design, and it is
not to be restyled to match this direction. Touch it only when the change
asked for is a change to the manual.
