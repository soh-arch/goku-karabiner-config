# goku-karabiner-config

Goku (Karabiner-Elements) keymap configurations. This repository doubles as a
backup of the configuration in active use and an archive of past drafts.

## Files

| File | Status | Notes |
| --- | --- | --- |
| [`AbcAct.edn`](./AbcAct.edn) | **Active** | Currently rsynced to `~/.config/karabiner.edn` and in daily use. Asterisk / Bra / Cket layer system with an Act-key axis. |
| [`HySCOT.edn`](./HySCOT.edn) | Archived draft | SCOT Matrix layout (Shift/Cmd/Opt/Ctrl priority rows on the right hand). |
| [`HyMeCO.edn`](./HyMeCO.edn) | Archived draft | Hyper/Meh two-tier layer system with semicolon/quote/slash sub-layers. |

## Usage

1. Install [Karabiner-Elements](https://karabiner-elements.pqrs.org/) and [Goku](https://github.com/yqrashawn/GokuRakuJoudo).
2. Copy the active file (`AbcAct.edn`) to `~/.config/karabiner.edn`.
3. Run `goku` to compile it into a Karabiner-Elements complex modification.

```bash
goku
```

## Roadmap

- Write a proper reference manual per layout (key charts, layer diagrams).
- Separate concerns between the active configuration and the archive once the
  active layout stabilizes.
