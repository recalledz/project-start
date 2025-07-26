# Module Structure

The project organizes game logic under the `game/` directory.

- **game/state.js** – central store for global state like `stats`, `systems`, `sectState`, and the current enemy. Also exposes time scaling helpers.
- **disciple.js** – defines the `Disciple` class representing a single frog disciple.
- **game/disciples.js** – manages which disciples are active in combat.
- **game/ui.js** – renders combat UI elements such as bars and disciple cards.
- **game/combat.js** – centralizes all combat logic including damage
  resolution and disciple hit animations.
- **game/debug.js** – wiring for optional debug controls.
- **debugTools.js** – development helpers lazily loaded when a debug
  button is clicked.
- **game/zones.js** – toggles visibility of sect map zone elements.
- **game/constants.js** – collection of shared gameplay constants used across systems.
- **game/tooltip.js** – simple helpers for showing and hiding the UI tooltip.
- **game/sect.js** – implements the sect management system including constructs and colony helpers.
- **game/buildings.js** – handles sect building logic and construction timers.

The top-level `script.js` now merely orchestrates initialization, delegating all logic to the modules above.
