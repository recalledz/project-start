# 🃏 Card Game – Incremental RPG Combat System

## 🔍 Overview
A dynamic card-based combat game where cards represent characters. The player fights against enemy cards (Dealers and Bosses), each with abilities, cooldowns, and visual effects. Inspired by blackjack and idle mechanics.

## 🧩 Key Features
- Card-based stat and level system
- classic cards: clubs, hearts, diamonds and spades
- job system for cards when reaching certain level thresholds
- jobs are available depending on suit
- Dealer and Boss types with unique abilities
- Real-time cooldown logic and ability overlays
- Realtime combat tick system
- Cards recover 1 HP after each enemy kill
- Reincarnation, experience, traits (planned)

## 🧠 Tech Stack
- HTML, CSS, Vanilla JavaScript
- Lucide Icons
- Replit + GitHub integration
- Codex-enabled development

## 🗂️ Project Structure
/index.html
/style.css
/enemy.js ← Base enemy logic
/dealerabilities.js ← Ability registry & factory
/card.js ← Card class & deck generation
/script.js ← Game logic
/.codex/tasks.md ← Codex task manager


## 🔧 Codex Integration
This repo uses Codex for smart task automation. Tasks are listed in `.codex/tasks.md`.

To get started:
1. Connect Codex to your GitHub repo
2. Open this repo in ChatGPT Codex tab
3. Pick or assign a task from `.codex/tasks.md`

## 🚧 Upcoming Goals
- Finalize card visual polish
- Implement player stats on board
- Complete main layout polish and them casino/ changing per world
- Introduce joker system
- Introduce upgrade system
- Introduce mana system
- Introduce jobs, traits, and reincarnation logic

## 👾 Author
Built in collaboration with ChatGPT & Codex.

## 🧪 Node-based Testing
When running automated tests in Node, there is no browser `document` object.
`script.js` now detects this case and creates a minimal DOM using
[JSDOM](https://github.com/jsdom/jsdom). Install the dependency and import the
script in your tests:

```bash
npm install --save-dev jsdom
```

```javascript
import "./script.js";
```

This will bootstrap `window`, `document` and `performance` globals so modules
depending on them can run under Node.

