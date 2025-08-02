# Module Structure

The project organizes game logic under the `game/` directory.

- **game/state.js** – central store for global state like `stats`, `systems`, `sectState`, and the current enemy. Also exposes time scaling helpers.
- **game/disciple.js** – defines the `Disciple` class representing a single frog disciple.
- **game/disciples.js** – manages which disciples are active in combat.
- **game/ui.js** – renders combat UI elements such as bars and disciple cards.
- **game/rendering.js** – raid rendering helpers such as `showRaidDamageFloat`.
- **game/combat.js** – provides generic damage helpers used by raid modules.
- **game/raids.js** and **game/horizontalRaid.js** – implement raid encounters and the
  defensive combat loop.
- **game/canBus.js** – lightweight event bus used for in-game modules to
  communicate without direct imports.
- **game/debug.js** – wiring for optional debug controls.
- **debugTools.js** – development helpers lazily loaded when a debug
  button is clicked.
- **game/zones.js** – toggles visibility of sect map zone elements.
- **game/constants.js** – collection of shared gameplay constants used across systems.
- **game/tooltip.js** – simple helpers for showing and hiding the UI tooltip.
- **game/sect.js** – implements the sect management system including constructs and colony helpers.
- **game/buildings.js** – handles sect building logic and construction timers.
- **game/metamorphosis.js** – manages disciple metamorphosis progression and its UI. Exposes `destroyMetamorphosis()` to clean up event listeners when the interface is rebuilt.
- **game/enemy.js** – defines the base `Enemy` class with stats and ability hooks.
- **game/enemySpawning.js** – contains helpers for spawning enemies and bosses with stage scaling.
- **game/boss.js** – extends `Enemy` for boss encounters and provides templates.
- **game/dealerabilities.js** – registry of boss ability factories grouped by type.
- **game/log.js** – utility for appending colored messages to the combat log.
- **game/starChart.js** – renders the optional star chart exploration view with PIXI.

The top-level `script.js` continues to orchestrate initialization and now imports these modules from `game/`.
