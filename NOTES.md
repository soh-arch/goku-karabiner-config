# Notes

Implementation details and Karabiner/Goku gotchas that don't belong in the
README but are worth keeping around so the same debugging loop doesn't
happen twice.

## `to` arrays don't hold modifiers

A `to` list with more than one entry is executed as a one-shot macro: every
entry is pressed and released in sequence, fully, before the next one
starts. This is true even for adjacent entries — `[:left_command
:grave_accent_and_tilde]` does **not** produce Command+grave; it sends a
released `left_command` followed by a bare, unmodified `` ` ``.

The "held for as long as the physical key is down" behavior (e.g.
`[:##spacebar :left_shift nil {:alone :spacebar}]`, which really does keep
Shift held for the duration of the Spacebar press) only happens for a
manipulator whose `to` is a **single** plain key_code — not part of a larger
array, and not combined with a shell command or a `set_variable` action in
the same list.

If you need Command+key as one atomic combo, use a proper chord entry
(Goku's `:!C` prefix, e.g. `:!Cgrave_accent_and_tilde`) rather than trying
to assemble it out of separate array items. It behaves like a genuine,
well-formed keypress and is what third-party apps' global hotkey listeners
expect.

## Only the first matching manipulator fires

Karabiner does not fire every manipulator whose `from` and `conditions`
match an incoming key event — only the first one in file order. Two rules
bound to the same key with identical conditions will only ever run the
first; the second is silently ignored. This is why nearly every rule in
`AbcAct.edn` carries a full stack of `:!act-a :!act-s :!act-d :!act-f`-style
guards: it's not defensive style, it's required so that exactly one rule
matches any given key + state combination.

Practical implication: you cannot split "hold a modifier for the physical
duration of a key" and "fire a one-shot side effect on the same keypress"
into two separate manipulators on the same key. They have to be reconciled
into one manipulator (or the side effect has to ride on a chord instead of
a held modifier).

## `open -a` steals focus

Launching an app via `open -a '<App>'` activates it and focuses its window.
For a menu-bar/popover app like Maccy, this means its own window absorbs
subsequent keystrokes as literal text input (into its filter field) instead
of them being interpreted as the app's own global hotkeys. If an app has a
configured global hotkey for the action you want, send that hotkey via a
Karabiner chord instead of shelling out to `open -a`.

## Japanese input: `select_input_source` was tried and abandoned

Current state: `right_command`'s alone-action is the plain, original
`:japanese_kana` key code toggle — nothing more. This section exists so
the `select_input_source` route isn't tried again from scratch.

**The problem `select_input_source` was meant to fix.** `:japanese_kana`
(the same key code as the physical かな key) toggles Kotoeri's かな/英数
submode. Used alone, it doesn't select which input source is active —
so if English or Greek was active, tapping `right_command` could leave
the wrong source selected while also occasionally misfiring a text
reconversion when it landed on an active selection (whatever the prior
input source happened to be doing with that key code at the time).

**What was tried instead.** Switch to macOS's `select_input_source`
action targeting Kotoeri's Japanese-Romaji source directly, since that's
a real source switch rather than a bare mode-toggle key code. This
requires spelling out the raw `{:select_input_source {:input_source_id
"com.apple.inputmethod.Kotoeri.RomajiTyping.Japanese"}}` map rather than
using the `:input-sources` shorthand keyword inside a multi-step array —
the shorthand only expands correctly as a manipulator's sole `to` value,
and Goku rejects the file with "invalid to definition" if it's nested
inside an array. (The raw-map-in-array shape itself is fine and already
used elsewhere in this file, e.g. `[{:pkey :button1} {:mkey {:x
-1600}}]` in the Drag & Drop tiers.)

**Why it didn't work.** `select_input_source` chooses which input source
macOS treats as active, but doesn't touch Kotoeri's internal かな/英数
submode — that's orthogonal to source selection. So switching sources
while Kotoeri's submode was already stuck on 英数 (from however it was
last left) reproduced the same broken symptom from the other direction:
menu bar and Karabiner-Elements EventViewer both showed Japanese
selected, but typing still produced literal, unconverted roman
characters. Chaining `:japanese_kana` right after the source switch (to
force the submode) reintroduced garbage/invalid characters instead,
consistent with `select_input_source` being asynchronous and the
following key code landing before the switch had actually settled.
Inserting a `sleep` between the two steps didn't resolve it either. At
that point the fix required either confirming and tuning an inter-step
delay against real hardware, or finding some other synchronization
primitive Karabiner doesn't obviously expose for this — more machinery
than the payoff justified.

**Where it landed.** Back to the original `:japanese_kana` toggle,
accepting the reconversion-misfire risk as the practical tradeoff. The
`:input-sources` map's `:japanese` entry was removed since nothing
references it any more (`:english` and `:greek` still do, for
`left_command` and `left_option`).

## Maccy paste-by-index layer (`AbcAct.edn`)

The "hold L-Command + Caps Lock, then tap a digit/letter to paste that
clipboard slot" layer went through several broken designs before landing on
the current one. (The trigger key was Tab throughout the debugging below;
it moved to Caps Lock later — see the note at the end of this section.)
In order:

1. `open -a 'Maccy'` to open + `:!C1`-style chords per key to paste.
   Broken: `open -a` focus-steals (see above), so the chords landed as text
   in Maccy's filter field.
2. Delayed the `open -a` with a `sleep` to dodge a suspected focus race.
   Didn't address the actual cause — no change.
3. Packed `:left_command` into the same `to` array as the `open -a` call
   and a `set_variable`, then had digits pass through unmodified assuming
   Command was still held. Broken per "`to` arrays don't hold modifiers"
   above — Command was released before the next physical keystroke.
4. Split into two manipulators on `:##tab`: one a plain `:left_command`
   hold, one firing grave + the layer variable. Broken per "only the first
   matching manipulator fires" — the second rule never ran.
5. Merged back into one manipulator with `[:left_command
   :grave_accent_and_tilde ...]`, hoping adjacent array entries would
   combine. Broken per "`to` arrays don't hold modifiers" — grave arrived
   as a bare, unmodified character.
6. **Working**: `:!Cgrave_accent_and_tilde` as one atomic chord to open
   Maccy (its actual configured global hotkey), and `:!C1`/`:!Ca`-style
   chords for every digit/letter under a `layer-maccy` variable — i.e. the
   original chord approach from step 1, with the focus-stealing `open -a`
   replaced by the real hotkey. This combination (proper chord to open +
   proper chord to select) had never actually been tested in isolation
   before; steps 2-5 kept changing both the open mechanism and the select
   mechanism at once, so the true cause of step 1's failure (focus
   stealing, not the chords themselves) took a while to isolate.

**Later: trigger moved to Caps Lock, opened with `f16`.** The layer now
fires on `:##caps_lock` rather than `:##tab`, freeing Tab for a window/GUI
navigation set. The open step is a bare `:f16` instead of the
`Cmd+`` ` ``` chord: `f16` is a key macOS has no default binding for, so it
can be given to Maccy as a dedicated global hotkey without colliding with
anything. The hotkey is registered by opening Maccy's settings and pressing
L-Command + Caps Lock there — with this config live, that keystroke emits
`f16`, so Maccy records exactly what AbcAct will send.

Because Karabiner fires only the first matching manipulator, the old
`Core: Capslock Actions` rule that mapped bare `Cmd + Caps` to
`delete_or_backspace` had to be deleted, not just superseded — it sat
earlier in the file with the identical condition set and would otherwise
have swallowed the event before the Maccy trigger was reached.

## `asDf`/`AsDf` delete on hold: forward keys degraded to backward

Reported symptom: holding `j` or `l` in `asDf` (Delete) — and, by the same
mechanism, `AsDf` (Amplified Delete) — deleted the character(s) *before*
the cursor instead of *after* it, once OS key-repeat kicked in. `h`/`k`
(the backward-direction keys) were never affected.

The trailing entry of a multi-entry `to` array is what actually stays
"live" across OS auto-repeat once the physical key is held — this is the
same mechanism documented in "`to` arrays don't hold modifiers" above,
just showing up on the *last* array entry instead of the first. `j`'s old
array was `[:!Sdown_arrow :delete_or_backspace]`: the initial press
correctly selected downward and deleted the selection, but every repeat
after that only re-sent the trailing `delete_or_backspace` — a key whose
own native direction is backward — so a key meant to delete forward
degraded into plain repeated Backspace. `k`'s array
(`[:!Sup_arrow :delete_or_backspace]`) never showed the bug because its
trailing key's native direction (backward) already matches `k`'s intended
direction (up/backward), so the degraded case is directionally correct by
coincidence.

`l`'s old binding was a single native `:delete_forward` key_code with no
array at all — held for the physical duration of the keypress and left to
the OS's own auto-repeat. `delete_forward`'s repeat is the less-traveled
path on macOS (Backspace is used far more often) and isn't reliable held
this way, unlike `delete_or_backspace`, which repeats cleanly.

**Fix**: for every forward-direction delete binding (`j`, `l` in both
`asDf` and `AsDf`), make `delete_forward` the trailing/held key instead of
`delete_or_backspace`, and route `l` through the same "select then delete"
array shape `j`/`k` already use rather than relying on a lone
`delete_forward` key_code's native repeat. `h`/`k` are untouched — their
trailing key's native direction already matches their intent, so they
were never affected.

**`AsDf`'s `l` changed again later, back to a lone key entry.** The
Cmd-to-Option fix (see "Amplified Delete's `h`/`l` fixed from Cmd to
Option" further below) replaced `l`'s select-then-delete array with a
single `!Odelete_forward` chord, the same shape category (`to` is one
entry, not an array) as the original `:delete_forward`-alone binding
that triggered this whole auto-repeat investigation. Whether
`Option+Forward-Delete`'s OS auto-repeat is as unreliable as bare
`Forward-Delete` was hasn't been retested — worth confirming if `l`
held down for repeated word-deletes ever misbehaves the same way.

## `asDf`'s u/i/o/p were a line-kill that collapsed into one action

`asDf` (Delete) used to bind `u`/`i`/`o`/`p` to hand-rolled sequences that
jumped to one line boundary, shift-selected across to the other, and
deleted: `[:end :!Shome :delete_or_backspace]` for `i`,
`[:home :!Send :delete_or_backspace]` for `o`, and the same with the
shift-select doubled for `u`/`p`. `MANUAL.md` described them as "delete
the current line, backwards / forwards" and "delete the current line
together with the one above / below."

Three things were wrong with that. `i` and `o` both leave the same final
state — an emptied line with the cursor at its start — so they were one
action on two keys. The doubled `Shift+Home`/`Shift+End` in `u`/`p` is a
no-op in any app where Home/End already sit on the line boundary (at best
it picks up leading indentation in VS Code-style smart-home apps), so it
never reached the neighbouring line the docs promised, leaving all four
keys on effectively one action. And the leading `end`/`home` throws away
the caret's column before the delete, which is why nothing about these
bindings composed with the rest of the tier.

That last point is the real break. Everywhere else in this family a
delete tier is its select tier plus a delete: `asDf`'s `h`/`j`/`k`/`l`
are `aSdf`'s motions plus a delete, and `AsDf`'s whole row is `ASdf`'s
motions plus a delete. `asDf`'s `u`/`i`/`o`/`p` were the only cells that
opted out, which also contradicted `MANUAL.md`'s own claim that the
delete tiers delete *using the boundary* the cursor tiers move to.

**Fix**: compose them from `aSdf` like every other cell —
`[:!Spage_up :delete_or_backspace]`, `[:!Shome :delete_or_backspace]`,
`[:!Send :delete_forward]`, `[:!Spage_down :delete_forward]`. The
geometry (u = up, i = left, o = right, p = down) now survives into the
delete tier, and act-a genuinely amplifies: `asDf` deletes to the
Home/End/Page boundary, `AsDf` to the Cmd boundary (line start/end,
document start/end).

Deleting a whole line outright is not lost — Bra Numpad's `q` still does
it, and it keeps the `[:end :!Shome :delete_or_backspace]` implementation
this change removed from `asDf`. Note that neither form removes the
newline; both empty the line and leave it in place. If a true
`Cmd+Shift+K`-style line delete is ever wanted on the Asterisk side, it
belongs in a free slot rather than back in `u`/`i`/`o`/`p`, whose four
cells carry the boundary geometry.

**The same fix applied to `o`/`p` in both delete tiers.** The
forward-direction rule established above — a forward delete must end its
`to` array with `delete_forward`, or a held key repeats only the trailing
`delete_or_backspace` and starts eating backwards — had been applied to
`j` and `l` but never to `u`/`i`/`o`/`p`. `asDf`'s new `o`/`p` and
`AsDf`'s `o`/`p` (`[:!SCright_arrow …]`, `[:!SCdown_arrow …]`) now end
with `delete_forward`; `u`/`i` are backward-directed and correctly keep
`delete_or_backspace`.

## The Drag tiers' u/i/o/p are unfinished, not a design

`aSdF` and `ASdF` give `u`/`i`/`o`/`p` the same four directions as
`h`/`j`/`k`/`l` at exactly half the travel — ±800 against ±1600, and ±1600
against ±3200. `MANUAL.md` used to describe them as "微調整用", a fine
adjustment.

**Do not read that as a convention.** It was placeholder work: the tier was
implemented to get the feature in, with `u`/`i`/`o`/`p` left to be revisited
later, and the revisit never happened. Everywhere else in the config the
outer four take the *coarser* unit, never the finer one (see the
h/j/k/l-vs-u/i/o/p section in `CLAUDE.md`). These two tiers are the sole
deviation, and they are a deviation, not a second rule.

Recorded because the shape is easy to mistake for intent when reading the
file cold — it looks deliberate and symmetric. It is neither.

## ASDF's j/k (previous-desktop/next-desktop) removed

`ASDF` (Amplified Window Management) originally bound `j`/`k` to Raycast's
`previous-desktop`/`next-desktop` window-management commands, alongside
`h`/`l` for `previous-display`/`next-display`. Removed because virtual
desktops (Spaces) aren't part of the actual workflow — the owner doesn't
use them — so the binding had no real use. Display switching was kept, but
has since moved to `i`/`o`, and `h`/`j`/`k`/`l` now all carry half-placement
toggles (`left`/`bottom`/`top`/`right-half`) — see the Window Management
entry under "Design rationale for specific keymaps" below.

## Why the right block is positional, not mnemonic

**The whole `h`/`j`/`k`/`l` + `u`/`i`/`o`/`p` design rests on one
preference: meaning is carried by position and direction, not by the
initial letter of the action's name.** It is the same reason to prefer
vim's motions over Emacs' named commands. Mnemonic bindings are cheap to
learn and expensive to run — every press is a lookup from intention
through a word to a letter. Positional bindings are the reverse: more to
learn once, then no lookup at all.

The difference only shows at length. One `⌘T` costs nothing. A
tab-management run — close this, next, close, back, new, next, often past
ten presses — is where recalling `t` / `w` / `⇧⌘T` at every step becomes
the dominant cost, and where reaching for a direction instead is markedly
lighter.

That is what decides whether an action needs a key here at all. Actions
that appear inside a run belong on the keymap. Actions invoked once, from
outside any run, do not need a slot — a plain app shortcut or Raycast is
the lighter path. The two are not exclusive: the same action can live in
both and be used in different situations. "New tab" is one — mid-run it is
`asDF`'s `k`; when opening a browser from some other app it is the Raycast
Comet command. Neither displaces the other.

Several rules elsewhere follow from this premise rather than standing on
their own:

- `h`/`j`/`k`/`l` carries only sets of four (`CLAUDE.md`). A direction
  means nothing except against its three siblings.
- Pairs are pairs of opposites, on both axes. Of the 64 pairs in the right
  block (16 tiers × `h`/`l`, `j`/`k`, `i`/`o`, `u`/`p`), 61 are opposed.
  The three that are not: `aSDf`'s `h`/`l` and `j`/`k` (the Japanese-input
  tier, where macOS fixes which letter does what), and `asDF`'s `i`/`o`
  (pin tab / reopen closed tab, which are unrelated). No pair anywhere
  shares a direction and differs only in degree — such a pair would carry
  no positional information, which is the only thing the layout is for.
- An action with no direction of its own goes on `u`/`i`/`o`/`p`, the free
  side (`CLAUDE.md`).

## What `act-a` amplifies is set by the tier, not fixed

`act-a` has no single meaning. It is an operator that steps up whatever
axis of "bigger" the tier's family already has — and which axis that is
differs from family to family. Reading it as one fixed action ("act-a
doubles things", "act-a widens the scope") gives the wrong expectation in
most of the file.

The eight `act-a` pairs in Asterisk Right, with the axis each one steps:

| pair | family | axis `act-a` steps |
|---|---|---|
| `asdf` / `Asdf` | Text Cursor | **unit** — arrow → `⌥`arrow, one character to one word |
| `aSdf` / `ASdf` | Select | **unit** — the same motions with Shift held |
| `asDf` / `AsDf` | Delete | **unit** — `delete` → `⌥delete` |
| `aSDf` / `ASDf` | Reconversion & Copy/Paste → Undo/Redo & Duplicate/Move Line | **none** |
| `asdF` / `AsdF` | Mouse Cursor | **amount** — pointer `±1600` → `±3200`, scroll `±32` → `±64` |
| `aSdF` / `ASdF` | Drag & Drop | **amount** — `±1600` → `±3200`, `±800` → `±1600` |
| `asDF` / `AsDF` | Tab → App | **scope** — tab to app on `h`/`j`/`k`/`l`, window to Space on `u`/`p` |
| `aSDF` / `ASDF` | Window geometry | **range** — placements that keep the window a desktop window → placements that leave that range |

Three things follow.

**An amplified tier does not need a family of its own.** Seven of the
eight pairs carry one family twice, so the question when placing something
new is usually not "what goes in `ASdF`" but "what is `aSdF`'s family, and
what does one step up look like for it".

**Whether two tiers share a binding is derivable, not arbitrary.** The two
mouse tiers both put left/right click on the aux keys. That looks like an
inconsistency until you notice `act-a` steps an *amount* there and a click
has no amount — nothing for the operator to act on, so the binding is
invariant under `act-a` and correctly appears in both. The same test
applies anywhere the question comes up.

**`aSDf` / `ASDf` is the one pair where `act-a` amplifies nothing**: the
two tiers hold unrelated families. It is also the tier whose `h`/`l` and
`j`/`k` are two of the three non-opposed pairs in the right block (see the
section above). The two facts have separate causes, but they land on the
same tier — the one place where `h`/`j`/`k`/`l` is the Japanese IME's own
fixed set and the layout's rules have nothing to impose on.

## Design rationale for specific keymaps

Why individual bindings ended up where they did, beyond what's obvious from
reading `AbcAct.edn` or `MANUAL.md`. Collected from design discussions so
the reasoning doesn't have to be re-derived (or re-explained) later.

**Amplified Delete's `h`/`l` fixed from Cmd to Option — the "one act,
one modifier flavor" rule caught a real inconsistency.** Across the
`h`/`j`/`k`/`l` navigation family, act-a alone always means "Option
flavor" (Amplified Cursor: `⌥←`/`⌥→` word jump, `⌥↓`/`⌥↑` paragraph
jump) and act-s alone always means "Shift flavor" (Select). Amplified
Delete (`a`+`d`, act-a only) should follow the same flavor, but `h`/`l`
were wired to `!Cdelete_or_backspace`/`[:!SCright_arrow
:delete_forward]` — Cmd, not Option — while its own doc label already
claimed "単語削除" (word delete). Fixed to `!Odelete_or_backspace`/
`!Odelete_forward`, which is also how macOS natively spells "delete
word backward/forward" as a single keystroke — no select-then-delete
needed, unlike `j`/`k`/`u`/`i`/`o`/`p`.

`j`/`k` (paragraph delete) and `u`/`i`/`o`/`p` (line/doc-boundary
delete) keep their `Shift+Option`/`Shift+Cmd` chords unchanged. That
Shift isn't "borrowed from act-s" — deleting a *span* (a paragraph, or
everything up to a boundary) has no single-keystroke native action the
way word-delete does, so it's implemented as select-then-delete, and
building a selection at all requires Shift regardless of which act key
triggered it. The user-facing flavor still matches its Cursor
counterpart (paragraph delete pairs with paragraph jump, boundary
delete pairs with boundary jump) — the rule is about the flavor being
consistent from the user's perspective, not about which physical
modifier keys happen to be involved in the underlying implementation.

**`d` swaps to Raycast/Maccy, `r` takes Claude/Chatgpt (Asterisk Left).**
`d` doubles as the `act-d` layer activator (held down, it changes what
other keys do), so holding it even briefly to reach another key risks
accidentally launching whatever app was on `d`. AI chat apps (Claude/
ChatGPT) were on `d` originally and kept firing by accident; moved to `r`
(a plain launcher key, no activator role) and swapped with what `r` used
to hold.

**`a`'s alone-tap is Raycast, and `d` shifted down to MdoroMac/Calendar.**
`a`'s alone-tap used to be Launchpad, which Raycast had effectively
replaced in practice — Launchpad was almost never reached for, while
Raycast (previously on `d`'s alone-tap) is the single most-used
destination in the whole launcher. Since `a` is the easiest key in the
suite to hit (left pinky, home position, and already the act-a
activator everyone's finger rests on), Raycast moved there and
Launchpad was dropped rather than relocated.

That left `d` free, so MdoroMac moved down from `Asdf` into `asdf`,
and `d`'s act-a slot needed a new occupant. The `s`/`f` pairs both
follow "same domain, primary/alternate" (Comet↔Chrome are browsers,
Finder↔iTerm are file/shell), but a second *timer* app to pair with
MdoroMac doesn't exist — nobody runs two Pomodoro apps. Calendar keeps
the convention by widening the domain instead of duplicating the app
category: MdoroMac is time management at the scale of minutes,
Calendar at the scale of days. Alternatives considered and rejected:
relocating Launchpad here (preserves a function nobody uses), System
Settings (useful, but breaks the domain-pairing convention), and
deliberately leaving the slot empty (defensible — there's precedent in
Numpad-a's skipped comma — but Calendar was a genuinely wanted
destination, so the slot didn't need to stay open).

**Input sources: `:input-sources` for English/Greek, a plain toggle for
Japanese.** `left_command`/`left_option` alone-taps switch to English/
Greek via `:input-sources` directly. `right_command`'s alone-action is
`:japanese_kana`, a plain IME mode-toggle key code rather than a real
source switch — a `select_input_source`-based replacement was tried and
abandoned after it turned out to be unreliable in practice. See "Japanese
input: `select_input_source` was tried and abandoned" above for the full
story. `left_control` no longer has an alone-action (Greek moved to
`left_option` instead) and is a plain modifier.

**`fn` sends Left Control.** Plain remap, no alone-action — `fn` isn't
used for anything else in this config, and physical Left Control was
already a free, unmapped modifier (see above), so there's no conflict
between the two keys now both producing the same output.

The opposite arrangement was tried once — `fn` and Left Control sending
Left Command, with Caps Lock's hold becoming Left Control — and was
rolled back. Command is wanted under the pinky, not under `fn`. Don't
re-do the swap without asking first.

**Maccy paste-by-index layer exists to keep thumb+pinky on Cmd+Tab.** The
goal was pasting a specific clipboard history slot without ever letting go
of L-Command or Tab — see the dedicated section above for why it took six
attempts to get the Command-holding mechanics right.

**Navigation h/j/k/l is strictly Option=amplify / Shift=select /
Shift+Option=both, applied identically to h/j/k/l in every tier that has a
"select" or "amplified" flavor.** `j`/`k` originally amplified by
triple-repeating the plain arrow (`[:down_arrow :down_arrow :down_arrow]`)
instead of using Option — pointless as a *held* key, since holding down a
key repeats it at the OS's own repeat rate regardless of how many `to`
entries fire per press; three presses vs. one made no difference in
practice. Unified to the same Option/Shift composition `h`/`l` already
used.

**Navigation u/i/o/p is the "amplified boundary" family: Cmd+arrow.**
`u`/`i`/`o`/`p` are the boundary-motion keys (Page Up/Home/End/Page Down at
baseline). Their amplified form uses Cmd+arrow (jump to document start/
line start/line end/document end) rather than Option, because Option+Page
Up/Home/End isn't a real macOS/editor convention the way Option+arrow
(word) and Option+Up/Down (paragraph) are — Cmd+arrow for document/line
boundaries is the actual standard.

**`ASDf` (Copy Paste)'s u/i/o/p do line duplicate/move, not
select-all-then-clipboard-op.** They used to be `Cmd+A` prefixed variants
of the same h/j/k/l clipboard actions (select-all-then-paste/copy/cut) —
redundant with h/j/k/l and conceptually more "alter the buffer" than
"select." Replaced with line duplicate/move (`Option(+Shift)+Up/Down`),
which is what `u`/`i`/`o`/`p` held in the *Select* tiers (`Asdf`/`ASdf`)
before those were reassigned to the Cmd+arrow family above — freeing that
slot is what let `Cmd+A` move to the auxiliary-key group instead (see
below). Select-all's own `Cmd+A` prefix isn't rebound anywhere else yet.

**`AsDf` (Amplified Delete) reuses the same building blocks as Navigation
rather than inventing new ones — except `h`/`l`, which are a genuine
single-keystroke native action instead.** `j`/`k` select a paragraph
(`Shift+Option+Up/Down`, matching Navigation `ASdf`'s j/k) then delete;
`u`/`i`/`o`/`p` select to a Cmd-boundary (matching Navigation `ASdf`'s u/i/
o/p) then delete. `h`/`l` briefly deleted to the *line* boundary instead
of by word (`h` was `Cmd+Delete`, `l` selected to line end with
`Shift+Cmd+Right` before deleting) — a real inconsistency caught later:
every other row in this family maps act-a alone to "Option flavor," and
Cmd-boundary-delete didn't match that, despite already being documented
elsewhere as "word delete." Fixed to `!Odelete_or_backspace`/
`!Odelete_forward` — macOS's own native single-keystroke word-delete,
which needs no select-then-delete step at all (see "Amplified Delete's
`h`/`l` fixed from Cmd to Option" above for the full reasoning, including
why `j`/`k`/`u`/`i`/`o`/`p`'s Shift-based select-then-delete wasn't
changed alongside it).

**`open_bracket`/`close_bracket`/`semicolon`/`quote` are a deliberately
sparse auxiliary group, not a 16-tier system like h/j/k/l.** These four
keys support the main navigation/edit system rather than carrying
independent per-tier meaning, so they're keyed only on `act-d`/`act-f`
(4 states) instead of all four act flags (16 states) — `act-a`/`act-s`
never change them. Assignments:
- `act-d` off, `act-f` off (asdf/Asdf/aSdf/ASdf): Return. Replaces an
  earlier Spacebar mapping on `open_bracket`/`close_bracket`, which became
  redundant once Spacebar's own alone-action (plain Spacebar tap) covered
  that role in daily use. `backslash` used to share this Spacebar mapping
  but isn't considered part of this four-key group and was left
  unassigned (native passthrough) when the group's definition narrowed to
  just these four keys.
- `act-d` on, `act-f` off (asDf/AsDf/aSDf/ASDf): Select All (`Cmd+A`).
  `semicolon` specifically is one of the most reachable keys on the board
  (resting right under the home-row pinky), which is part of why Select
  All landed here rather than needing its own dedicated key elsewhere.
- `act-d` off, `act-f` on (asdF/AsdF/aSdF/ASdF): left/right click
  (`open_bracket`/`semicolon` = left, `close_bracket`/`quote` = right).
- `act-d` on, `act-f` on (asDF/AsDF/aSDF/ASDF): window sixth placement
  (unchanged from the original design).

**`asDF` (Tab Management) j/k/i/o: distinct actions over shared muscle
memory.** `j`/`k` used to duplicate `h`/`l`'s tab-cycling (`Ctrl+Tab`/
`Shift+Ctrl+Tab`) — a "vertical tab switcher" feel that's intuitive in
apps like Cursor, but ultimately judged to be a habit rather than a
necessity. Reassigned to close tab (`Cmd+W`) / new tab (`Cmd+T`). `i`/`o`
now pin (`Shift+Opt+P`) / reopen the last closed tab (`Shift+Cmd+T`) —
used often enough to earn dedicated keys rather than being folded into
the tab-cycle duplication.

**`aSDF`/`ASDF` (Window Management) split by operation scale, not by
"which tier already had it."** `aSDF` (not amplified) does small nudge
moves (Raycast `move-left/down/up/right`); `ASDF` (amplified) does the
bigger half-placement toggle (`left/bottom/top/right-half`, which cycles
1/2 → 2/3 → 1/3 on repeated presses via Raycast's own toggle behavior) —
moving a window a short distance is the smaller operation, cycling through
size fractions is the bigger one, so amplified gets the bigger operation.
`ASDF`'s `i`/`o` (previous/next-display) replaced
`make-smaller`/`make-larger`, which was redundant with `aSDF`'s own `i`/`o`
already covering that.

**`aSDF`'s `u`/`p` (`maximize` / `almost-maximize`) are opposites, not a
difference of degree.** The Raycast command name is misleading:
`almost-maximize` is ~70% per the Raycast config, noticeably smaller than
its name suggests, and it is used here as the smallest size at which a
window is still a window you work in — a window is not better for being
smaller, and that floor is real. `maximize` is the other end of the same
range. Both leave the window on the desktop, sharing it with everything
else.

`ASDF`'s `u`/`p` amplify that to the ends outside the range, which is what
act-a means in this pair: `toggle-fullscreen` moves the window off the
desktop into a Space of its own, and `Cmd+H` takes it out of view
entirely — not stopping the app, but shrinking its presence to the
opposite extreme of fullscreen. Adding `a` drops the condition "still a
window on the desktop". Read `aSDF` and `ASDF` as range / beyond-range,
not as large / larger.

Note what this leaves: `Cmd+H` is bound in two tiers — `ASDF`'s `p`
(above) and `AsDF`'s `i` (Hide app, in App Management). The `ASDF` one
has the rationale just given, so the duplication is deliberate rather
than a leftover, but `ASDF`'s `p` is also the only cell in either Window
Management row that isn't a `:wm` call. Recorded, not resolved — whether
that slot should keep `Cmd+H` is a design question, not a bug.

(Repeated outputs are not in themselves a smell here: the terminal
override block deliberately re-sends `Ctrl+U`/`Ctrl+K` across several
tiers, and the Maccy layer shadows a whole family of `Cmd`-chords. What
makes this one worth writing down is that both bindings mean the same
thing to the user, not just to the OS.)

**`aSDf`/`ASDf` h/j/k/l regrouped by family, not by directional shape.**
The original assignment put commands with no left/down/up/right meaning
(Undo/Redo, copy/paste, reconversion shortcuts) onto arrow-shaped keys
with no rationale for *which* command went on *which* direction. Regrouped
by family instead: `aSDf` h/j/k/l are the reconversion-family shortcuts
(`Ctrl+Shift+R`/`Ctrl+J`/`Ctrl+K`/`Ctrl+;`) — kept on h/j/k/l specifically
because the same physical keys already carry equivalent standard
operations elsewhere in the layout, which was the justification for not
moving them off h/j/k/l entirely. `aSDf` u/i/o/p became the copy/paste
family. `ASDf` h/j/k/l became Undo/Redo plus back/forward (`Cmd+Z`/
`Shift+Cmd+Z`/`Cmd+[`/`Cmd+]`); `ASDf` u/i/o/p (line duplicate/move) was
already coherent and untouched.

**`aSDf` u/i/o/p ordered Cut / Copy / Paste / Paste&Match, mirroring x c
v.** The clipboard family was first laid out paste-first (Paste&Match /
Paste / Copy / Cut), which grouped the two paste variants on the left and
copy/cut on the right. Reordered so `u` `i` `o` read as Cut, Copy, Paste —
the same order as the physical `x` `c` `v` keys everyone already knows.

This also makes the pair read as in/out from the clipboard's point of
view: `i` puts something **in** (copy), `o` takes it back **out** (paste).
Note the earlier version of this file had the in/out reading backwards,
describing paste as "in" from the document's point of view; the
clipboard-centric reading is the one the layout now follows, because it is
the one that has to be recalled at typing speed. The outer keys stay the
amplified form of the inner key next to them: `u` is Cut (copy that also
removes the source), `p` is Paste & Match Style (paste that also conforms
formatting).

That outer-equals-amplified relation is a property of *this* tier, not of
the u/i/o/p axis in general — an earlier version of this paragraph claimed
the latter, and it doesn't survive a look at the other tiers. It holds
wherever the four keys form a graded family — this tier, and the
cursor/select/delete tiers where `u`/`p` reach the wider boundary (the page,
or the document once act-a is held) and `i`/`o` the line boundary beside it.
It simply does not apply where the four hold unrelated actions: `asdF` pairs
horizontal scroll against vertical, `asDF` puts same-app window cycling on
`u`/`p` and pin/reopen on `i`/`o`, `AsDF` pairs Spaces against hide/expose.
Don't reach for it as a rule when filling a new slot.

The in/out reading is deliberately **not** applied everywhere — it is a
fallback mnemonic for tiers where the usual "outer = bigger boundary"
axis has nothing to grip. It fits `aSDf` (clipboard), `aSDF` (shrink /
grow) and `AsDF` (hide / expose). It does not fit `asDF`'s pin /
reopen-closed-tab or `ASDF`'s previous/next display, and those are left
alone rather than forced.

**`Bra: Depiction` was removed; Bra is a single-purpose numpad layer.**
Depiction reproduced Concepts' (an iPad drawing app) own internal
shortcuts inside this config — `Cmd+3` sent `l`, and so on. That is the
wrong layer to define them at: Goku's job is to send a keystroke, and the
target app's own hotkey settings should decide what that keystroke means.
Concepts does allow rebinding across a wide range of its functions, so
nothing is lost by deleting the suite and binding the keys in Concepts
directly. It also saw only occasional use.

It had needed Bra **plus Spacebar** held together, because Bra alone
collides with the numpad (`z`/`x`/`c`/`v` already mean digits there);
Spacebar forwards a real, continuously-held Command without touching
`layer-ast`, which is what let its `Cmd+<key>` chords fire while
`:!layer-ast` held.

Note that removing Depiction did **not** free the Spacebar. At the time,
Spacebar's hold action was the everyday Command key — every ordinary Cmd
shortcut went through it — and those outputs never appear in this config,
so counting `:!C` from-keys here says nothing about how much Spacebar is
used. Depiction was one consumer, not the reason Spacebar existed.
(Spacebar has since become Shift; see "Spacebar carries Shift, Caps Lock
carries Command" below.)

Bra keeping only the numpad is a narrowing, not a loss: the layer had
been two unrelated suites sharing one trigger, and is now one coherent
one. The "a whole modifier spent on a numpad" objection also doesn't
hold up — every layer trigger in AbcAct does double duty through its tap
action, and L-Shift's tap is `` ` ``, which is used constantly. Numpad
was left in Bra rather than moved elsewhere because there was no
candidate suite worth putting in Bra instead; inventing one to justify
keeping the layer would repeat exactly the mistake Depiction was.

If Bra is ever rebuilt, the shape worth reaching for is a **left-pinky
trigger with right-hand content**. Bra and Cket are both same-hand
(trigger and keys under one hand, which is cramped); Asterisk is the only
cross-hand layer, and it is the comfortable one.

**Spacebar carries Shift; the layer triggers give up their own roles.**
Both physical Shift keys are layer triggers (L-Shift → Bra, R-Shift →
Cket) and L-Command triggers Asterisk, so neither role can sit on its own
key. Spacebar is the only modifier position either thumb can reach, which
makes it the right home for Shift — a modifier that constantly needs to
be pressed by the hand *not* typing the letter. Command is less
hand-sensitive, so at the time it went to Caps Lock and R-Command. It has
since moved again — Command now lives on `fn`, physical L-Control and
R-Command, and Caps Lock holds Ctrl instead; see "Command duty moved off
Caps Lock onto `fn`/Left Control" below.

R-Option used to be a second Shift, and was returned to a plain Option in
the same pass. With Spacebar reachable by either thumb, a second Shift
one key over from it added nothing, while Option was left with only one
plain-pressable key — L-Option carries the Greek input switch on its
alone-tap. Restoring R-Option makes Option symmetric again and lets
Option+click and Option+arrow be done entirely with the right hand.

The Cket media-transport combos (`[`/`]`/`\` → fast forward/rewind/
play-pause) were meant to use this restored R-Option, but were left
written with the `!R` (R-Shift) prefix from before the restoration —
Goku's abbreviated notation is `!R` = right_shift, `!E` = right_option
(mnemonic: left hand is `C T O S`, right hand mirrors it `Q W E R`).
Because `!R`'s `from` still has `optional: [any]`, and the plain
volume/mute rules were listed first, the modified combos never fired —
Karabiner matched the plain rule before ever reaching the R-Shift one.
Fixed by switching to `!E` and moving the modifier-qualified rules
ahead of the plain ones in the rule list.

The one exception is inside Asterisk, where Caps Lock is the Maccy
trigger — `:!layer-ast` guards Caps Lock's own modifier rule (Ctrl now,
Command when this was written). That guard is enough because Karabiner
does not re-feed a manipulator's `to` output through its own
manipulators — the same reason the older `caps_lock → right_shift`
mapping never activated Cket. The live case for that today is `fn` and
physical L-Control: both emit `left_command`, and neither re-enters the
L-Command/Asterisk trigger rule.

**Escape carries destructive system actions; Caps Lock keeps the routine ones.**
Both live inside Asterisk. Caps Lock's Act-gated family (voice input,
screenshot variants, AirDrop) are things worth reaching for often, so
they stayed on the key the left pinky already rests on — Caps Lock, which
outside Asterisk is the everyday Ctrl. Sleep, restart, and log out are
rare and irreversible, so they moved to a key
that had zero prior identity (physical Escape is otherwise unused —
Caps Lock's own alone-tap already produces `:escape`, but that's a
different manipulator on a different `from` key). Shut down was dropped
entirely: a month of daily use never once reached for it.

Lock screen sits on plain Escape (no Act) rather than another combo,
since it's the one action in this family worth reaching for on reflex —
walking away from the desk shouldn't need a chord.

**`:clip-airdrop` went through three failed approaches before landing on
Shortcuts.** The original `key code 36` (Return) after opening the
share popover was a blind key press with no target: clicking the
share toolbar button via System Events opens the popover but gives no
item keyboard focus, so Return had nothing to select and the popover
was just left sitting open. It only looked like it worked when a mouse
happened to be hovering AirDrop (visual highlight, not keyboard
focus).

The next attempt clicked the "AirDrop" element directly (`entire
contents of window 1`, filtered by role/name) instead of relying on
Return. This found the element in manual testing but was unreliable
end to end: the share popover's accessibility tree is timing-dependent
and undocumented by Apple — `entire contents of window 1` sometimes
returned 148 elements with none matching "AirDrop" even after a 1s
delay, other times it worked. Apple does not publish or stabilize this
UI's accessibility layout as a public contract, which is presumably
why it never converged on reliable.

Third attempt: called Apple's own `NSSharingService` /
`sendViaAirDrop` API directly via JXA (`osascript -l JavaScript`),
bypassing UI scripting entirely — the officially-modeled way to invoke
AirDrop as a specific destination rather than showing the generic
picker. This resolved the service fine (via the global constant
`$.NSSharingServiceNameSendViaAirDrop` — the raw string
`"com.apple.share.System.AirDrop"` came back nil, oddly) but
`canPerformWithItems` always returned `false`, even with Wi-Fi,
Bluetooth, and AirDrop visibility all confirmed working (a manual
AirDrop send from Finder succeeded in the same session). Root cause:
`osascript` is a bare CLI process with no app bundle identity
(`Info.plist`/`CFBundleIdentifier`), and `NSSharingService` appears to
refuse to operate for a caller that isn't a proper signed app — this
was flagged as an open question during research and confirmed by this
failure.

**Fix: moved the AirDrop step into a Shortcuts.app shortcut
("AirDrop Clip"), invoked via `shortcuts run "AirDrop Clip" -i
<file>`.** Shortcuts.app runs as a real signed app, which sidesteps
both the undocumented-UI fragility of the second attempt and the
bundle-identity rejection of the third. The shortcut takes a file via
Shortcut Input, feeds it straight into a built-in "AirDrop" action
(no share-sheet detour, no picker), and ends with "Stop and output"
set to "Do Nothing" if there's nowhere to output — matters because the
CLI invocation passes no `-o`, so the shortcut must not block or error
on having nowhere to send output. `AbcAct.edn`'s `:clip-airdrop` now
only does the clipboard-to-file save and then calls `shortcuts run`;
it no longer touches Finder or System Events at all.

The clipboard-to-file save itself needed a fourth fix. It originally
kept the classic AppleScript coercion `the clipboard as «class
PNGf»`, which threw "No image available" even for a genuine
screenshot (`Cmd+Ctrl+Shift+4`) sitting on the clipboard as PNG data —
a known unreliability of that coercion, independent of the AirDrop
delivery mechanism. Switched to JXA (`osascript -l JavaScript`)
reading the pasteboard directly — `NSPasteboard.generalPasteboard
.dataForType("public.png")` — which is the exact call already proven
to work during the NSSharingService investigation above, and
`writeToFileAtomically` to save it. `TMP` is exported so the JXA
subprocess can read it back via
`NSProcessInfo.processInfo.environment`, since JXA has no direct
equivalent of AppleScript's `path to temporary items` shorthand here.

**Tab's focus-jump family never uses act-a.** Both Tab and the Act keys
live on the left hand, and Tab sits directly above `a` — same finger
(left pinky) reaches both. Holding Tab down already occupies that
pinky, so act-a is physically unreachable without letting go of Tab.
act-d and act-f (left middle/index fingers) have no such conflict and
stay on home position throughout, which matters here specifically
because these actions are meant to be fired and immediately followed
by more typing — landing back on home row is the whole point.

**Ctrl+F2/F3/F5/F6/F8 ("move focus to menu bar/Dock/toolbar/floating
window/status menu") were originally dropped from consideration
entirely — none of F2/F5/F6/F8 did anything, confirmed with the
physical keyboard directly, bypassing Karabiner, so it wasn't a
Goku/Karabiner output problem. Only Ctrl+F4 (move focus to
active/next window, `asdf`) worked reliably at the time.** F2 and F8
started working at some later point (macOS itself is known to be
flaky here across versions — nothing in this repo changed to cause
it), so `asDf` → Ctrl+F2 and `asdF` → Ctrl+F8 were added. `asdF`
previously sent app-defined pane focus (`Ctrl+\``) instead, but that
binding saw little use once `Cmd+J` covered the same need, so it was
replaced rather than kept alongside Ctrl+F8. Treat this whole family as
flaky: a working state and a non-working state are each liable to be
temporary, so a stale "it does nothing" note here is worth re-checking
against the machine before acting on it.

Two of the family fail for a reason that is not flakiness, and the
distinction is worth keeping because both produce the same silence.
Ctrl+F5 moves focus to `NSWindow.toolbar` — an `NSToolbar` object. An app
that draws its own toolbar instead of using `NSToolbar` gives the shortcut
nothing to focus, so it does nothing there and always will: Electron
builds no `NSToolbar` (`native_window_mac.mm` names the class only in a
fullscreen comment) and Chromium-based browsers draw their toolbar
themselves. Ctrl+F6 targets the floating window — an `NSPanel`, which by
design is kept out of the Window menu's list and only becomes key when
needed, which is why a separate shortcut for it exists at all; in practice
only some of Apple's own apps use panels. Re-test a shortcut that went
quiet; don't re-test one that has no target.

**Numpad-a is built on Goku's `:simlayers`, not the hand-rolled
`["layer" 1]`/`:afterup` pattern used everywhere else.** Every other
layer trigger in this file (Asterisk, Bra, Cket) sets its layer variable
immediately on key-down via `to`, with `:alone` only providing the
fallback tap output — meaning the layer is "live" for the full duration
the key is physically held, even a few milliseconds. That's fine for
Bra/Cket/Asterisk because their trigger keys are dedicated modifiers
(Shift, Cmd) that never appear in normal prose. `a` is a vowel used in
every other word, so that same instant-arm behavior would turn ordinary
fast typing (e.g. rolling through "a" into the next letter while typing
romaji) into constant misfires.

`:simlayers` compiles to a Karabiner `simultaneous` manipulator instead:
it only fires if a *second* key is pressed while `a` is down, in strict
order (`a` first, second key after) and released in strict reverse order
(second key released before `a`). Ordinary typing — press `a`, release
`a`, press the next letter — never satisfies that shape, so it doesn't
need a hold-time threshold to stay out of the way of prose; it's the
combination of press/release order, not timing, doing the protection.
The default threshold (`simlayer-threshold`, 250ms) is left unset in the
config, so this only overrides `a`'s own fallback behavior — normal taps
of `a` are simply never matched by this manipulator and fall through to
ordinary typing.

The simlayer definition carries `:condi [:!layer-ast :!layer-bra
:!layer-cket :!layer-maccy]` so it can never compete with the existing
Asterisk `a` → act-a rule; the two are mutually exclusive by
construction, not by manipulator ordering.

Digit layout originally mirrored Bra's numpad (`z x c v` = 0-3, `s d
f` = 4-6, `w e r` = 7-9) so the two numpads would share muscle memory.
`a` itself can't double as backspace here the way it does in Bra (it's
the trigger).

**`0` briefly moved from `z` to Spacebar, then had to move again —
Spacebar turned out to be structurally unsafe for this.** The initial
reasoning was sound on its own (`z` is an awkward pinky stretch, and
the thumb sits idle during Numpad-a since `a` is held by a different
finger), but Spacebar already carries an unconditioned, load-bearing
rule elsewhere in this file: SandS (`[:##spacebar :left_shift nil
{:alone :spacebar}]`, held = Left Shift, tap-alone = Spacebar), with no
`:layer-*`/`:act-*` guard at all. Karabiner matches manipulators in
list order, and SandS sits far earlier in the file than Numpad-a, so
it kept winning the race for the physical Spacebar keydown — in
practice this meant `0` only worked intermittently, with a bare space
getting typed most of the time. Same underlying shape of bug as the
Cket `[`/`]`/`\` incident (an earlier, unguarded, more general
manipulator shadowing a later, more specific one) — except this time
the earlier rule can't just be reordered or reguarded, because SandS
needs to work unconditionally in every layer.

**Redesigned around the actual complaint: it was never really about
`0`, it was that the trigger finger (pinky, on `a`) also owns `z` in
touch typing.** `x c v` (ring/middle/index) were never the problem.
The fix pushes `1-9` up onto `s d f` / `w e r` / `2 3 4` — home row,
top letter row, and the physical number row, none of which conflict
with the pinky's `a`-holding duty — and reassigns the vacated bottom
row (`z x c v`) plus `b g t` to backspace/delete/operators:

- `0` → `c`
- `1-9` → `s d f`, `w e r`, `2 3 4`
- `=` `+` `-` `*` → `v b g t` (a straight positional run, not a
  calculator-layout convention)
- `/` `^` → `5 6` (physical number row, `keypad_slash` and a plain
  `Shift+6` chord — no keypad equivalent for `^`)
- one-character delete → `x` (`delete_or_backspace`)
- one-line delete → `z`, reusing Bra Numpad's own `q` implementation
  verbatim (`[:end :!Shome :delete_or_backspace]`: jump to end of
  line, shift-select to line start, delete the selection) rather than
  inventing a second implementation of the same idea

`=`/`+`/`-`/`*`/`/` use Karabiner's dedicated `keypad_*` key codes
(`keypad_equal_sign`, `keypad_plus`, `keypad_hyphen`, `keypad_asterisk`,
`keypad_slash`) so they emit the real character without needing Shift.
This drops the previous decimal-point mapping (`period` on `b`) — `b`
is now `+` — and no longer mirrors Bra's numpad layout at all; the two
numpads are now deliberately different, tuned for their own trigger
key's finger-occupancy constraints instead of sharing one layout.

This is explicitly a trial, not a settled design: intended to run for a
period of real use to see whether the Simultaneous-order protection
actually holds up against real typing (particularly fast Japanese
romaji input, the original worry that ruled out the Spacebar-hold
Numpad approach), before deciding whether it replaces, supplements, or
gets abandoned relative to Bra's existing Numpad.

## Terminal overrides: why they live in Karabiner, not in iTerm2

`AbcAct.edn` carries a `Terminal: Asterisk Right Overrides` block that
re-sends the text-editing tiers as shell control sequences whenever
iTerm2 is frontmost (`:applications {:terminal [...]}`, compiled to a
`frontmost_application_if` condition). The block sits *before*
`Asterisk Right: Navigation Suite` because Karabiner fires only the
first matching manipulator — the terminal-conditioned copies have to
be reached first or the general ones win.

**Why not translate on the iTerm2 side.** iTerm2 can remap keys per
profile, so ⌘← could be turned into `^A` there instead. Three reasons
it belongs here. It would be a two-stage conversion (Karabiner
synthesises ⌘←, iTerm2 turns it back into `^A`) where one stage does.
It would consume ⌘Z, killing iTerm2's own "Undo Close Session". And
the tiers built out of multi-event `to` chains (the old line-deletes)
arrive at iTerm2 already decomposed into separate events, so there is
nothing left for a 1:1 key remap to match on.

**Tiers with no shell equivalent send `vk_none` rather than nothing at
all.** Omitting a rule does not mean "no output" — it means the
general rule underneath still fires and sends a macOS editing key that
the shell either ignores or, worse, mangles. `asDf`'s `u`/`i`/`o`/`p`
end in a real `delete_or_backspace`, so leaving them unguarded would
eat a character per press. Every cell the design deliberately gives up
on — multi-line deletes, duplicate/move line, and the reconversion row
below — is therefore spelled out with an explicit `:vk_none`.

**`aSDf`'s `h`/`j`/`k`/`l` were the dangerous ones.** That tier is the
Japanese IME's reconversion row, but what it actually sends is raw
Control characters: `⌃J`, `⌃K`, `⌃⇧R`, `⌃;`. In a terminal those never
reach an IME — they hit ZLE directly, and `⌃J` is `accept-line`, i.e.
a half-typed `rm -rf …` runs with no confirmation. Suppressing these
four is the reason the block exists at all; everything else is
comfort.

**Both Select tiers are suppressed, and `ASdf` had to be.** Selection
has no counterpart on a shell line, so `aSdf` and `ASdf` were
originally left alone on the assumption that Shift-arrows and
⇧⌘-arrows would fall through to a terminal that ignores them. Half of
that assumption was wrong: enumerating iTerm2's menu bar shows **⇧⌘↑**
and **⇧⌘↓** bound to Edit → Previous/Next Mark, so `ASdf`'s `j`/`k`
(and `u`/`p`, which send the same two chords) scrolled the viewport
off the prompt instead of doing nothing. Nothing is destroyed, but a
key pressed to select text silently jumping the screen is its own kind
of wrong. All sixteen cells of the two tiers are now explicit
`:vk_none`, which also means a future iTerm2 release binding ⇧⌘← or
⇧⌘→ cannot reintroduce the same surprise.

The same enumeration cleared every other chord the Asterisk tiers send
into iTerm2. The remaining menu hits are all deliberate: ⌘X/⌘C/⌘V
(`aSDf`'s clipboard row), ⌘A (the auxiliary keys' Select All), and
⌘W/⌘T/⇧⌘T/⌘Q/⌘H (the `f` tiers' tab and app management). The control
characters and Option chords this block introduces hit nothing.

**Word-wise motions use ⌥-chords, not `ESC`-prefixed pairs.** The
obvious encoding for `backward-word` is the two events `ESC` then `b`,
which Karabiner can send as `[:escape :b]`. It is wrong here: per
"`asDf`/`AsDf` delete on hold" above, only the *trailing* entry of a
multi-entry `to` array survives OS auto-repeat, so holding the key
types `bbbbb…` into the command line. Word motion and word delete are
exactly the operations one holds down, so `Asdf`'s `h`/`l` and
`AsDf`'s `l` send single `⌥b`/`⌥f`/`⌥d` chords instead, which repeat
cleanly — at the cost of requiring iTerm2's **Left Option Key = Esc+**
(Settings → Profiles → Keys). That setting is the one piece of this
feature that does not live in this repo. `AsDf`'s `h` needs no such
help: `backward-kill-word` is plain `^W`.

**Undo, redo and history search reuse tiers the GUI already spends on
the same ideas.** `ASDf`'s `j`/`k` are undo/redo everywhere else, and
in a terminal they send `^_` and `⌥r`. `^_` — not the more commonly
cited `^X u` — because both are bound to `undo` in zsh's emacs keymap
and `^X u` would need a two-entry `to` array, which loses auto-repeat
to the trailing-entry rule above; undo is very much a key one holds.
Whether iTerm2 actually encodes `⌃⇧-` as 0x1f is the one thing here
that can only be settled by typing it into `cat -v`; if it ever comes
back empty, `⌃/` is the usual alternative encoding of the same byte.
`⌥r` reaches zsh as `^[r`, which is already bound to `redo` — contrary
to what one would guess from zsh's reputation of leaving redo
unbound — so no `.zshrc` entry is needed.

`Asdf`'s `j`/`k`, which have no paragraph to move by in a shell, take
`⌥n`/`⌥p` (`history-search-forward`/`backward`): type `git c`, hold
`Cmd+A` and press `k` to walk back through commands starting with
those letters. This does not compete with fzf, which is already
installed and owns `^R` (`fzf-history-widget`) — `^[p` is prefix
matching from what is already on the line, `^R` is a fuzzy picker over
everything. `Asdf`'s `u`/`p` complete the geometry with `⌥<`/`⌥>`
(`beginning-of-buffer-or-history` / `end-of-buffer-or-history`), the
same up/down sense they carry as PageUp/PageDown in the GUI tiers.

**`^U` is left at zsh's default.** zsh binds `^U` to
`kill-whole-line`, not bash's `backward-kill-line`, so `asDf`'s `i`
deletes the whole line rather than back to its start as `MANUAL.md`
describes. This is a deliberate choice, not an oversight — the whole
line is what one actually wants when abandoning a command. A
`bindkey '^U' backward-kill-line` in `.zshrc` would restore the
MANUAL's semantics if that ever stops feeling right.

**`.zshrc` dependency.** `asDf`'s `l` keeps its native
`delete_forward`, which reaches zsh as `^[[3~` — a sequence zsh binds
to nothing at all (bash's readline does bind it, which is the source
of "it works in bash but not zsh" reports). It needs
`bindkey '^[[3~' delete-char`. Do not lower `KEYTIMEOUT` and do not
enable `set -o vi`; the emacs keymap is what every binding above
assumes.

## External dependencies (this repo is public — beyond plain `open -a` app launches)

This repo alone does not fully reproduce a working setup. Besides the
`:app` template (`open -a '<name>'`), which only requires the named
app to be installed, several rules depend on state that lives outside
this repo entirely — either another app's own hotkey configuration, or
a specific third-party extension/shortcut that isn't version
controlled here at all. Listed so a fresh clone doesn't leave someone
wondering why a key silently does nothing.

**Raycast + specific extensions (`:ray`/`:wm` templates, `open -g
'raycast://...'`).** Raycast itself must be installed, and beyond that
several rules call specific *extensions* that must be separately
installed from the Raycast Store:

- `raycast/window-management` — all the `h/j/k/l/u/i/o/p` window
  moves/resizes, and the `[`/`]`/`;`/`'` sixth-of-screen placements
- `raycast/raycast-notes` — `q` in the Asterisk suite
- `raycast/emoji-symbols` — left_shift in Asterisk's alternate symbol
  row (`Asdf`, i.e. act-a held)
- `mooxl/deepcast` — `t` (Japanese/English translation). This one is a
  third-party extension by an individual developer (not a
  Raycast-maintained core extension), so it carries more risk of
  disappearing or changing behavior out from under this config than
  the others.

**Amical (`f13`, passive hotkey listener).** AbcAct just sends the
`f13` key code on Caps Lock + act-a; Amical (a voice-input app) is
configured, in its own settings, to treat `f13` as its trigger hotkey.
Same relationship as Maccy below — this repo has no way to enforce or
even detect that Amical is installed and configured to match.

**Maccy (`f16`, passive hotkey listener).** Same shape as Amical:
Caps Lock while inside the Maccy paste layer sends `f16`, which only
does anything because Maccy's own settings are configured to use
`f16` as its popup hotkey.

**Shortkeys Chrome extension (`i` inside Tab Management, ⇧⌥P → pin
tab).** Chrome has no built-in keyboard shortcut for pinning a tab
(unlike ⇧⌘T for reopening a closed tab, which is native and needs no
extension). ⇧⌥P is a custom shortcut the user defined *inside* the
"Shortkeys (Custom Keyboard Shortcuts)" extension's own settings,
bound to its "Pin/unpin tab" action — same passive-listener
relationship as Amical/Maccy above, except the listener here is a
browser extension rather than a standalone app, and the shortcut
itself (not just the app) is a user choice with no fixed default to
document.

**Shortcuts.app — the "AirDrop Clip" shortcut (`:clip-airdrop`,
active call via `shortcuts run`).** Unlike Amical/Maccy above (which
passively listen for a key code AbcAct sends), this one is AbcAct
actively invoking a named shortcut that must already exist in
Shortcuts.app: Receive Files (Shortcut Input) → AirDrop action → Stop
and output (Do Nothing if nowhere to output). Nothing about this
shortcut's construction lives in this repo — see the `:clip-airdrop`
history earlier in this file for why UI-scripting and direct
`NSSharingService` calls were tried and abandoned before landing on
this.

**iTerm2's own profile settings and `.zshrc` (the terminal override
block).** Two settings outside this repo have to be in place before
the `Terminal: Asterisk Right Overrides` rules behave as designed:
iTerm2's **Left Option Key = Esc+** (Settings → Profiles → Keys →
General), without which `Asdf`'s `h`/`l` and `AsDf`'s `l` type `∫`,
`ƒ`, `∂` instead of moving and deleting by word; and
`bindkey '^[[3~' delete-char` in `.zshrc`, without which `asDf`'s `l`
(forward delete) does nothing. See "Terminal overrides" above.

**A macOS shortcut that has to stay enabled (⌥⌃F1 / ⇧⌥⌃F1, `asDF`'s
`u`/`p`).** These are macOS's own "Move focus to next window" action and
its Shift-reversed form. The row lives in System Settings → Keyboard →
Keyboard Shortcuts → Keyboard; AbcAct only sends the key codes, so the
dependency is that row. Clear its checkbox and both keys silently do
nothing — which has happened, and took a while to place because nothing
in this repo had changed. Same passive-listener shape as Amical/Maccy,
except the listener is macOS itself.

Two things recorded here previously were wrong, and the correction
matters more than the original claim. The action was *not* reassigned to
⌥⌃F1 to work around ⌘\` failing on a US-layout keyboard: ⌘\` was tested
directly on this machine and does cycle an app's windows, so sending it
instead is a live option rather than a ruled-out one. And the row's value
cannot be called "reassigned" or "stock" either way — pressing "Restore
Defaults" on it repeatedly left it at ⌥⌃F1, then once set it to ⌘\`.
**Treat this row's value as unreliable** and read it off System Settings
before concluding the keymap is at fault.

**macOS keyboard-navigation focus shortcuts (⌃F2 / ⌃F4 / ⌃F8, the Tab
suite).** Focus-movement to the menu bar, the active/next window, and the
status menus are macOS keyboard-navigation shortcuts, so they depend on
that feature being enabled and on the F-row behaving as function keys.
See "Ctrl+F2/F3/F5/F6/F8 …" earlier in this file for the history: most of
that family did nothing at all for a long time, and F2/F8 started working
on a later macOS without anything in this repo changing. Treat any of
them going quiet again as an OS-side change, not a config regression.

**Mission Control family (⌃↑ / ⌃↓ / ⌃← / ⌃→, `AsDF`).** All four are
System Settings → Keyboard → Keyboard Shortcuts → Mission Control
entries. ⌃↓ (Application windows) in particular is not reliably enabled
by default. ⌃← / ⌃→ (move one space left/right) only do anything when
more than one desktop exists — with a single desktop they are silent
no-ops, which is easy to mistake for a broken binding.

**Japanese input method (⌃⇧R / ⌃J / ⌃K / ⌃;, `aSDf`'s h/j/k/l).** The
reconversion family is the Japanese IME's own set of Control shortcuts.
They do something only while the Japanese input source is active and its
Control-key shortcuts are enabled; under any other input source they fall
through to whatever the focused app makes of a bare Control chord.

**A Raycast *script command*, not an extension
(`raycast://script-commands/open-abcact-manual`, `q` + act-a).** Every
other Raycast call in this file targets a Store extension. This one
targets a script command — a script that must exist in a directory
Raycast is configured to scan. Nothing about it is version controlled
here. It is also the only shell string in `AbcAct.edn` that does not go
through `:templates`.

**Input sources (`:english`, `:greek`, `:japanese_kana`).** The
`:input-sources` map names US Extended and Greek by input-source ID, and
R-Cmd's alone-action sends `japanese_kana`. All three need the
corresponding source enabled in System Settings → Keyboard → Text Input →
Input Sources; a source that isn't installed makes its switch a no-op.
The design reasoning for these three is separate, earlier in this file —
this entry is only about the setup they assume.
