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
`[:##spacebar :left_command nil {:alone :spacebar}]`, which really does keep
Command held for the duration of the Spacebar press) only happens for a
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

## ASDF's j/k (previous-desktop/next-desktop) removed

`ASDF` (Amplified Window Management) originally bound `j`/`k` to Raycast's
`previous-desktop`/`next-desktop` window-management commands, alongside
`h`/`l` for `previous-display`/`next-display`. Removed because virtual
desktops (Spaces) aren't part of the actual workflow — the owner doesn't
use them — so the binding had no real use. `h`/`l` (display switching) are
kept. `j`/`k` are undefined in this tier for now.

## Design rationale for specific keymaps

Why individual bindings ended up where they did, beyond what's obvious from
reading `AbcAct.edn` or `MANUAL.md`. Collected from design discussions so
the reasoning doesn't have to be re-derived (or re-explained) later.

**`d` swaps to Raycast/Maccy, `r` takes Claude/Chatgpt (Asterisk Left).**
`d` doubles as the `act-d` layer activator (held down, it changes what
other keys do), so holding it even briefly to reach another key risks
accidentally launching whatever app was on `d`. AI chat apps (Claude/
ChatGPT) were on `d` originally and kept firing by accident; moved to `r`
(a plain launcher key, no activator role) and swapped with what `r` used
to hold.

**Input sources: `:input-sources` for English/Greek, a plain toggle for
Japanese.** `left_command`/`left_option` alone-taps switch to English/
Greek via `:input-sources` directly. `right_command`'s alone-action is
`:japanese_kana`, a plain IME mode-toggle key code rather than a real
source switch — a `select_input_source`-based replacement was tried and
abandoned after it turned out to be unreliable in practice. See "Japanese
input: `select_input_source` was tried and abandoned" above for the full
story. `left_control` no longer has an alone-action (Greek moved to
`left_option` instead) and is a plain modifier.

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
rather than inventing new ones.** `j`/`k` select a paragraph
(`Shift+Option+Up/Down`, matching Navigation `ASdf`'s j/k) then delete;
`u`/`i`/`o`/`p` select to a Cmd-boundary (matching Navigation `ASdf`'s u/i/
o/p) then delete. `h`/`l` (`Cmd+Delete` / `Cmd+Forward-Delete`, word-level)
were already consistent and untouched.

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
necessity. Reassigned to close tab (`Cmd+W`) / reopen closed tab
(`Shift+Cmd+T`), which used to live on `i`/`o`. `i`/`o` now pin
(`Shift+Opt+P`) / duplicate (`Shift+Opt+D`) the current tab — used often
enough to earn dedicated keys rather than being folded into the tab-cycle
duplication.

**`aSDF`/`ASDF` (Window Management) split by operation scale, not by
"which tier already had it."** `aSDF` (not amplified) does small nudge
moves (Raycast `move-left/down/up/right`); `ASDF` (amplified) does the
bigger half-placement toggle (`left/bottom/top/right-half`, which cycles
1/2 → 2/3 → 1/3 on repeated presses via Raycast's own toggle behavior) —
moving a window a short distance is the smaller operation, cycling through
size fractions is the bigger one, so amplified gets the bigger operation.
This is also why `aSDF`'s `p` (`almost-maximize`, actually ~70% per the
Raycast config) is described as pairing with `u` (`maximize`) — same
u/p-as-a-pair pattern shows up in `ASDF`, where `u` (`toggle-fullscreen`)
pairs with `p` (`Cmd+H`, hide): not stopping the app, but shrinking the
window's presence to the opposite extreme of fullscreen. `ASDF`'s `i`/`o`
(previous/next-display) replaced `make-smaller`/`make-larger`, which was
redundant with `aSDF`'s own `i`/`o` already covering that.

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

**`Bra: Depiction` requires Bra+Spacebar together, not Bra alone.** Bra
alone would collide with the Virtual Numpad (`z`/`x`/`c`/`v`/etc already
mean digits there). Holding Spacebar too forwards a real, continuously-held
Command modifier without touching `layer-ast`, which is what lets these
Cmd+<key> chords fire while `:!layer-ast` holds as a condition. The actual
key choices mirror the shortcuts in Concepts, an iPad drawing app.
