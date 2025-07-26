# Project Start
This repository contains the initial project files.

## 🐸 Leaping Lotus Sect: A Coquí Cultivation Game

Welcome to **Leaping Lotus Sect**, a Wuxia-inspired idle/simulation game with a Puerto Rican twist. You play as a colony of **coquís**—the iconic frogs of Puerto Rico—who aren’t just hopping around: they’re **cultivating spiritual energy**, mastering ancient **Paths**, and striving to ascend into **immortality**.

## 🌿 Core Concept

Set in a misty, enchanted pond where **Taino myth** meets **cultivation fantasy**, each coquí balances mundane sect life (like **woodcutting**, **fly gathering**, or **research**) with deep metaphysical progress through **stages of metamorphosis** and **elemental enlightenment**.

Instead of "Qi," your sect harnesses **Water**, and instead of martial monks, you raise **frogs who croak spells** and meditate on lily pads.

## 🌀 Gameplay Overview

- **Disciples** (coquís) are assigned tasks in various zones:
  - 🌾 **Cultivation Zone**: Progress through life stages: Egg → Tadpole → Metamorph
  - 🪵 **Industrial Zone**: Gather wood, craft, and refine materials
  - 🧪 **Research Zone**: Unlock spells and passive upgrades
  - 📦 **Storage Zone**: Manage resources like fruit, softwood, and elemental essences

- **Paths** are elemental archetypes (inspired by Wuxia "laws"):
  - 🔥 **Blazing Croak** *(Fire — Combat Mage)*
  - 🌿 **Lifestrider** *(Wood — Agile Ranger)*
  - 💧 **Mistcaller** *(Water — Support/Healer)*
  - 🛡️ **Shellwarden** *(Earth/Fire — Tank/Defender)*

- **Water Fonts** boost cultivation rates
- **halls of areito** replaces chanting; some croaks affect weather or cause elemental effects
- **Fly Storage** replaces granaries

## 📜 Lore Meets Mechanics

This is not a standard Wuxia knockoff — **Taino and Caribbean mysticism** blend into the cultivation system:
- Sacred frogs of the rainforest seek rebirth in celestial forms
- Elements like *Humo*, *Mangle*, *Tormenta*, and *Sombra* represent Caribbean nature and spirit forces
- Exploration mechanics invoke ancestral memory and island traversal

## 🛠 Dev Info

- HTML/JS-based project, optimized for web and mobile
- Built for Node.js v18 environment
- Disciples battle system with a dynamic simulation loop
- Branches organized per feature (e.g. `sect-ui`, `resource-loop`, `card-art`)
- See `docs/module-structure.md` for an overview of the game modules.
- The `Disciple` class lives in `game/disciple.js` while `game/disciples.js` tracks
  which disciples are currently participating in combat.

## Dev Tools

The game includes a built-in debug panel with helpers like spawning
bosses, toggling fast mode, and skipping directly to the next night.
The panel loads its logic the first time you click any debug button, so
no special query parameter is required. A button also lets you toggle
sect map zone overlays for layout testing, and you can grant yourself
extra fruit by entering an amount and clicking **Give**.

### Building

Run `npm run build` to generate the `dist/` folder. The build script uses
`--public-url ./` so the game assets load correctly even when you open
`dist/index.html` directly without a web server.

