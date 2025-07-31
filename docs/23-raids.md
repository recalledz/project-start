# 23 – Raids

Night raids play out as a horizontal autobattler. Raiders march in waves from the right edge of the screen toward the Water Orb on the left. Disciples line up to meet them at the fight line in the center.

Raid behaviour is entirely data‑driven. A raid is started by calling `startRaid(config)` where `config` provides:

- `orb` – object with `current` and `max` water values
- `disciples` – array of defender objects
- `waves` – list describing each wave `{ count, rate, stats }`
- Optional callbacks `onWaveStart`, `onWaveEnd`, `onSuccess`, and `onFailure`

The module handles spawning raiders, advancing them toward the fight line and resolving combat. Raiders that reach the orb once will damage it and then vanish. If the orb's water reaches zero the raid fails immediately.

When a raider crosses the fight line it pairs with the first available disciple. Neither combatant moves while engaged. They attack based on their `attackSpeed` until one is defeated. Victorious disciples may re‑enter the line while surviving raiders continue toward the orb.

The raid ends when all waves are cleared or the orb is destroyed. Callbacks are fired at the start and end of each wave along with a final success or failure signal. Disciples temporarily switch to the "Idle" task during a raid so their badges remain visible in the interface.
