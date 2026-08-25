# goku-karabiner-config

Goku (Karabiner-Elements) keymap configurations. This repository doubles as a
backup of the configuration in active use and an archive of past drafts.

## Files

| File | Status | Notes |
| --- | --- | --- |
| [`AbcAct.edn`](./AbcAct.edn) | **Active** | Currently symlinked to `~/.config/karabiner.edn` and in daily use. Asterisk / Bra / Cket layer system with an Act-key axis. See [`docs/index.html`](./docs/index.html) for the illustrated reference manual, or [`MANUAL.md`](./MANUAL.md) for the same content in plain Markdown. |
| [`HySCOT.edn`](./HySCOT.edn) | Archived draft | SCOT Matrix layout (Shift/Cmd/Opt/Ctrl priority rows on the right hand). |
| [`HyMeCO.edn`](./HyMeCO.edn) | Archived draft | Hyper/Meh two-tier layer system with semicolon/quote/slash sub-layers. |

## Usage

1. Install [Karabiner-Elements](https://karabiner-elements.pqrs.org/) and [Goku](https://github.com/yqrashawn/GokuRakuJoudo).
2. Symlink the active file (`AbcAct.edn`) to `~/.config/karabiner.edn`.
3. Run `goku` to compile it into a Karabiner-Elements complex modification.

```bash
ln -s /path/to/AbcAct.edn ~/.config/karabiner.edn
goku
```

## Manual

[`docs/index.html`](./docs/index.html) is a self-contained, single-file reference
manual for `AbcAct.edn` — open it in a browser, or serve `docs/` via GitHub Pages.
It covers every layer and all 16 Act tiers, with an interactive tier explorer,
searchable tables, and light/dark themes. [`MANUAL.md`](./MANUAL.md) carries the
same reference in Markdown (Japanese).

## Notes

Implementation gotchas and past debugging history live in
[`NOTES.md`](./NOTES.md) — worth a look before reworking anything involving
held modifiers, multi-action `to` chains, or global app hotkeys.

For layer/condition guards specifically (the `:layer-ast`, `:layer-bra`,
`:layer-cket`, `:act-*` stacks), consistency is prioritized over avoiding
repetition: every rule scoped to a layer spells out the full guard it needs,
even when a shorter, "usually correct" version would work in practice. This
is deliberate — Karabiner only fires the first manipulator whose `from` and
`conditions` match, so an incomplete guard doesn't fail loudly, it silently
lets the wrong rule win under some input ordering. Uniform, explicit guards
keep that class of bug out.

## Contributing

Forking and referencing this configuration is welcome. That said, this is a
personal, individually-tuned setup rather than a general-purpose project, so
Issues and Pull Requests may not receive a response.

## Roadmap

- Separate concerns between the active configuration and the archive once the
  active layout stabilizes.
