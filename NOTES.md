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

## Maccy paste-by-index layer (`AbcAct.edn`)

The "hold L-Command + Tab, then tap a digit/letter to paste that clipboard
slot" layer went through several broken designs before landing on the
current one. In order:

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
