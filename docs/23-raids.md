# 23 – Raids

Night raids play out as a horizontal autobattler. Raiders march in waves from the right edge of the screen toward the Water Orb on the left. Disciples line up to meet them at the fight line in the center.

Raid behaviour is entirely data‑driven. A raid is started by calling `startRaid(config)` where `config` provides:

- `orb` – object with `current` and `max` water values
- `disciples` – array of defender objects
- `waves` – list describing each wave `{ count, rate, stats }`
- Optional callbacks `onWaveStart`, `onWaveEnd`, `onSuccess`, and `onFailure`

A typical raid now consists of **five** waves. Each wave spawns a single raider
and there is a five‑second pause before the next wave begins.

The module handles spawning raiders, advancing them toward the fight line and resolving combat. Raiders that reach the orb once will damage it and then vanish. If the orb's water reaches zero the raid fails immediately.

When a raider reaches the fight line it stops and targets the rightmost living disciple. Disciples remain in place and always attack the leftmost raider. Several disciples may assault the same target at once, each dealing damage whenever their personal attack timer completes. Attacking disciples grow slightly larger and a dark overlay shrinks to indicate progress toward their next strike. Whenever a disciple or raider lands an attack, their sprite briefly flashes white twice.

The raid ends when all waves are cleared or the orb is destroyed. Callbacks are fired at the start and end of each wave along with a final success or failure signal. When night falls the game automatically opens a dedicated raid overlay and begins a raid. Disciples temporarily switch to the "Idle" task so their badges remain visible in the interface.

The overlay fills the entire screen. Disciple badges line the top while their sprites stand near the Water Orb at the bottom left. Raiders advance from the right toward a fight line in the center where battles take place. Damage numbers briefly float above disciples, raiders and the orb whenever they are hit.
 Damage floats use red text when disciples take damage and white when raiders are struck. Raiders are drawn with a thin black border so each unit is clearly visible.

During raids you can click a disciple's badge to open their detailed overlay.
