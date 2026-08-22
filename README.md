# goku-karabiner-config

A highly optimized, multi-layered Karabiner-Elements configuration built using Goku, featuring the **SCOT Matrix Layout** for seamless spatial navigation and workflow automation.

## 🛠 Features

- **SCOT Matrix Layout**: Spatial hyper-key layer mapping for ultimate hands-on-home-row efficiency.
- **App Launchers**: Instant access to your favorite apps (Arc, Cursor, Slack, Obsidian, Claude, etc.) using clean sub-modifiers.
- **Vim-Style Navigation & Mouse Controls**: Full cursor, page, and mouse pointer manipulation without moving away from the home row.
- **Raycast Window Management**: Quick window resizing and placement built right into the keyboard layout.
- **Virtual Numpad & Clip Layers**: A dedicated numpad layer mapped to your right hand, plus an advanced clipboard history rotation tool.

---

## 🗺 SCOT Matrix Layout Overview

```text
Hyper + | None         | S (Shift)    | C (Command)  | O (Option)   | T (Control)
--------+--------------+--------------+--------------+--------------+--------------
  None  | Nav & Delete | Shift Numpad | Select & Del | Mouse Normal | Mouse Fast
   +S   | --           | --           | Clip Numpad  | Wheel Scroll | Fn1~12 keys
   +C   | --           | --           | --           | Smart Select | Win Resize
   +O   | --           | --           | --           | --           | Win Move

⌨️ Key Mappings & Layers
1. Base Modifiers & Core Actions
Caps Lock: Acts as Hyper Layer Activation when held, and Escape when tapped alone.

Spacebar: Acts as Left Shift when held, and Space when tapped alone.

Left/Right Command: Standard modifier when held, triggers Eisuu (English input) / Kana (Japanese input) when tapped alone.

2. Quick Application Launchers (Hyper + Key)
E → Arc | Cmd + E → Chrome | Opt + E → Safari | Shift + E → Cursor

R → Finder | Shift + R → iTerm

T → Slack | Cmd + T → Discord

D → Obsidian | Shift + D → Notion

F → Raycast | Cmd + F → Karabiner-Elements

G → Claude | Cmd + G → ChatGPT | Opt + G → Gemini

3. Vim-Style Navigation (Hyper + Right Hand)
H / J / K / L → Left / Down / Up / Right arrows

U / I / O / P → PageUp / Home / End / PageDown

🚀 Requirements & Installation
Install Karabiner-Elements

Install Goku (gokuwafu)

Clone this repository or copy main.edn to your Goku configuration directory (usually ~/.config/karabiner.edn).

Run goku in your terminal to apply the settings.

```bash
# To compile the configuration
goku
```