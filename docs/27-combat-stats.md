# Combat Stats

Disciples track four combat statistics that improve through battle:

| Stat | Base Value | XP from Combat |
| --- | --- | --- |
| **Melee Damage** | 1 flat damage | \(\frac{\text{Damage Dealt}}{\text{Target Max HP}}\) × 10 |
| **Spell Damage** | 0% additive | \(\frac{\text{Damage Dealt}}{\text{Target Max HP}}\) × 10 |
| **Defense** | 2 flat damage reduced | \(\frac{\text{Damage Received}}{\text{Max Water}}\) × 10 |
| **Magic Defense** | 2 flat damage reduced | \(\frac{\text{Damage Received}}{\text{Max Water}}\) × 10 |

Each stat has an experience bar shown in the disciple combat view. When the
bar fills, the stat level increases, raising the displayed value. A '+1 Stat'
floating text and golden glow highlight the disciple for five seconds when a
level is gained. Even blocked or absorbed hits contribute Defense XP based on
the incoming damage.

## XP Requirement per Level

XP required to advance a level is calculated as:

`XPRequired(level) = ceil(30 × (level ^ 1.5))`

## Gains per Level

| Stat | Gain per Level |
| --- | --- |
| Melee Damage | +1 base melee attack power |
| Spell Damage | +1 base spell attack power |
| Defense | +0.5 flat physical damage reduction |
| Magic Defense | +0.5 flat magic damage reduction |
