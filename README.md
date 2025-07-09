


---

🃏 Card Game – Incremental RPG Combat System

🔍 Overview

A dynamic card-based combat game where cards represent characters. Players battle against enemy cards (Dealers and Bosses), each possessing unique abilities, cooldowns, and visual effects. Inspired by blackjack and idle mechanics, the game emphasizes strategic deck building, progression, and resource management.

🧩 Key Features

Disciple Stat and Level System: Recruit followers who track levels and attributes with no inherent suit bonuses.

Job System: Unlock specialized roles for disciples upon reaching level thresholds.

Dealer and Boss Encounters: Face off against enemies with distinct abilities and escalating challenges.

Real-Time Combat Mechanics: Engage in battles with cooldown logic, ability overlays, and a combat tick system.

Healing Mechanics: Disciples recover 1 HP after each enemy defeat.

Game Over Screen: A restart overlay appears when every disciple is defeated.
Click the Restart button or wait five seconds to respawn automatically.
Stats Screen: View lifetime progress and start a new run from the stats tab.

Progression Systems:

Stages and Worlds: Advance through stages, encountering bosses at milestones (e.g., stage 10) and progressing to new worlds with increased difficulty.

Auto-Attack: Activate automated attacks with adjustable speeds, influenced by disciple stats.

Prestige System: Reset progress for long-term benefits, including disciple recall, HP refill, and stage resets.

Core Meditation: Mind, Body and Soul orbs fill from Life tab activities. They no longer gain XP from mana, healing or defeats during combat.
Constructs System: Combine resources to craft constructs (see docs/phrase-system.md).


Resource Management:

Cash: Earned based on active disciple power and current stage/world.

Disciple HP per Kill: Each enemy defeated heals your disciples.


Attributes and Stats:

Strength: Increases power and HP; reduces attack speed and ability accuracy.

Dexterity: Enhances ability accuracy, attack speed, and critical hits; decreases ability power.

Mind: Boosts ability power; reduces HP and strength.

Chaos: Amplifies critical damage and ability power.

Holy: Reduces cooldowns.


Jokers: Active abilities with cooldowns and limited slots.

Traits: Late-game mechanics where enemies possess special traits (e.g., double damage, shields) that can be inherited by your disciples.

Interactive Star Chart: Drag star nodes to rearrange upgrade paths for your disciples in real time.


🧠 Tech Stack

Frontend: HTML, CSS, Vanilla JavaScript

Icons: Lucide Icons

Development Tools: Replit, GitHub integration, Codex-enabled development

Debug Panel: Toggleable tools for spawning enemies, adjusting stats, and now a fast mode to speed up time ticks during testing

Node Simulation: Run `node simulate.js [strategy]` to test upgrade progressions without a browser


🗂️ Project Structure

/index.html
/style.css
/enemy.js           ← Base enemy logic
/dealerabilities.js ← Ability registry & factory
/card.js            ← Card class & deck generation
/script.js          ← Game logic
/.codex/tasks.md    ← Codex task manager
/simulate.js        ← CLI to run the Node-based simulator
/simulation.js      ← Simulator library used for tests
/simulator.cjs      ← Minimal CommonJS version for CI tests

🌠 Star Chart Setup

Include `pixi.min.js` and `pixi-filters.min.js` in your page. The chart initializes via `initStarChart()` when the Star Chart tab is opened to map disciple upgrades.

🔧 Codex Integration

This repository utilizes Codex for smart task automation. The active task list lives in `.codex/tasks.md` along with completed items.

Getting Started:

1. Connect Codex to your GitHub repository.


2. Open this repository in the ChatGPT Codex tab.


3. Select or assign tasks from .codex/tasks.md.



📊 Balancing Framework

A structured approach to manage and balance game elements.

🏹 Player & Global Upgrades

Upgrade Name	Base Value	Max Value	Cost Formula	Notes

Disciple Slots      3       ?       1000 * level^3	Increase the number of active disciples
Global Damage Multiplier	1.0	?	200 * level^2	Amplify all damage dealt
Auto-Attack Speed	10000 ms	2000 ms	300 * level^2.2	Reduce time between automated attacks
Base Disciple HP        +3 per level   ?       100 * level^2   Enhance base HP for all disciples
Disciple HP per Kill        1       ?       150 * level^2	HP recovered by disciples after each kill


🧑‍🎓 Disciple Progression

Stat	Scaling Formula	Notes

Damage	value * level	Base damage scales with disciple power and level
Max HP	value * level * baseHPMultiplier	HP influenced by disciple power, level, and attributes
Ability Power	Tied to attribute/stat	Determines potency of magical abilities
XP Requirement	XpReq = value * (level^2)	Higher power disciples require more XP to level up

XP per Kill     (7/18) * L^2 / (1 + 0.007*(L-1))  L = stage + 10*(world-1)

### XP Calculation

Disciples level up by defeating enemies. Two formulas keep the pace near
"one level per stage" for an average disciple:

1. **Requirement** for level `L`

   `XpReq = value * (L^2)`

   Low-power disciples reach higher levels quickly, while elite disciples require
   more grinding.

2. **XP award** when an enemy from stage `s` and world `w` is defeated

   ```
   L = s + 10 * (w - 1)
   XP = (7/18) * L^2 / (1 + 0.007 * (L - 1))
   ```

   `L` is the effective difficulty across worlds. Each new world adds 10
   levels to the scale. The small epsilon term increases kills needed by
   roughly one every few stages (e.g., stage 9 takes ~3m10s instead of 3m).

Disciples not currently deployed gain only half of this XP.


🧠 Attributes

Attribute	Effects

Strength	+Damage, +HP, -Attack Speed, -Ability Accuracy
Dexterity	+Ability Accuracy, +Attack Speed, +Critical Hit Chance, -Ability Power
Mind	+Ability Power, -HP, -Strength
Chaos	+Critical Damage, +Ability Power
Holy	-Cooldowns


Attributes influence resource gathering, passive skill trees, and job unlocks.

🧙‍♂️ Jobs

Unlocked when disciples reach level 10. Jobs are permanent and provide unique abilities.

Job Type	Based On	Effects

Warrior	Strength	High HP, taunt abilities
Rogue	Dexterity	Increased critical hits and speed
Mage	Mind	Powerful magical attacks
Trickster	Chaos	Unpredictable effects and burst damage
Priest	Holy	Healing and support abilities


🃏 Jokers

Active abilities that operate on cooldowns.

- **Healing Joker** – Rewarded after defeating the first boss. Restores health.
- **Shield Joker** – Rewarded after the second boss. Grants shield points; each point negates one damage from the next enemy attack.
- **Damage Joker** – Rewarded after the third boss. Deals direct damage.
- **Buff Joker** – Rewarded after the fourth boss. Temporarily increases damage output.


Feature	Base Value	Cost Formula	Notes

Max Slots	2	500 * level^2.5	Maximum number of jokers equipped
Mana Cost	Varies	Depends on effect	Mana required to activate
Cooldown	Varies	base - (Holy%)	Reduced by Holy attribute


🚧 Upcoming Goals

Finalize disciple visual designs

Implement player stats display on the board

Complete main layout polish with casino theme variations per world

Introduce joker system with active abilities

Develop comprehensive disciple progression systems

Implement jobs, traits, and reincarnation mechanics


👾 Author

Built in collaboration with ChatGPT & Codex.

📦 Installation

Install Node.js and fetch the project's dependencies. Puppeteer attempts to
download a bundled browser during installation, which may be blocked. Skip that
download by setting an environment variable when installing:

```bash
PUPPETEER_SKIP_DOWNLOAD=1 npm install
```

🧪 Testing

Automated tests run with **Mocha** and **Chai** directly in Node.js. A GitHub Actions workflow triggers `npm test` on each push. Ensure all dependencies are installed (see **Installation**) before running:

```bash
npm test
```

Tests are located in the `test/` directory.
---
