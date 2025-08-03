# 23 – Raids

Night raids play out as a horizontal autobattler. Raiders spawn just right of the fight line and strike from afar. Disciples line up on the left to defend the Water Orb.

Raid behaviour is entirely data‑driven. A raid is started by calling `startRaid(config)` where `config` provides:

- `orb` – object with `current` and `max` water values
- `disciples` – array of defender objects
- `waves` – list describing each wave `{ count, rate, stats }`
- Optional callbacks `onWaveStart`, `onWaveEnd`, `onSuccess`, and `onFailure`

A typical raid now consists of **five** waves. Each wave spawns a single raider and the next wave begins immediately once the previous is cleared.

The module handles spawning raiders and resolving combat. If the orb's water reaches zero the raid fails immediately.

Raiders randomly target living disciples from their positions. Disciples remain in place and always attack the first raider in line. Several disciples may assault the same target at once, each dealing damage whenever their personal attack timer completes. Each defender strikes once every 5 seconds for 1 damage before any combat or metamorphosis bonuses are applied. Attacking disciples grow slightly larger and a dark overlay shrinks to indicate progress toward their next strike. Whenever a disciple or raider lands an attack, their sprite briefly flashes white twice.

The raid ends when all waves are cleared or the orb is destroyed. Callbacks are fired at the start and end of each wave along with a final success or failure signal. When night falls the game automatically opens a dedicated raid overlay and begins a raid. Disciples temporarily switch to the "Idle" task so their badges remain visible in the interface.

The overlay fills the entire screen. Disciple badges line the top while their sprites stand near the Water Orb at the bottom left. Damage numbers briefly float above disciples, raiders and the orb whenever they are hit.
Damage floats use red text when disciples take damage and white when raiders are struck. Raiders are drawn with a thin black border so each unit is clearly visible.


A bar just below the disciple badges shows the remaining life of the current wave in red. The label displays the exact HP left along with the current wave number so players can track their progress.

During raids you can click a disciple's badge to open their detailed overlay.
Any disciple reduced to **0 HP** or incapacitated by destroyed body parts is
immediately removed from the lineup and no longer fights in that raid.

### Rewards

Successfully clearing all waves awards the sect **1 Undead Nectar** and each
participating disciple gains **30 Combat XP**.

