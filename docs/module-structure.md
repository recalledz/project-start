# Module Structure

The project organizes game logic under the `game/` directory.

- **game/state.js** – central store for global state like `stats`, `systems`, `sectState`, and the current enemy. Also exposes time scaling helpers.
- **game/disciples.js** – manages which disciples are active in combat.
- **game/ui.js** – renders combat UI elements such as bars and disciple cards.
- **game/combat.js** – handles combat timers and damage resolution.
- **game/debug.js** – wiring for optional debug controls.

The top-level `script.js` only imports these modules and orchestrates initialization.
