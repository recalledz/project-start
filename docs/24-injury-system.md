# 24 – Injury System and Health Tab

This module introduces a granular injury system for disciples. Injuries progress from **Bruise** → **Wound** → **Destroyed**. Destroyed parts impose penalties but no longer reduce maximum health.

When a disciple's Water reaches 0 they start taking damage each second. Any damage suffered while Water is depleted also targets a random body part. Every hit randomly chooses among the following chances:

| Body Part | Chance |
|-----------|-------|
| Head | 5% |
| Left Eye | 2% |
| Right Eye | 2% |
| Vocal Sac | 10% |
| Belly | 15% |
| Left Hand | 5% |
| Right Hand | 5% |
| Left Leg | 10% |
| Right Leg | 10% |
| Inner Meridians | 10% |
| General | 26% |

## Injury Progression

| Tier      | Effect                          | Progress Speed |
|-----------|---------------------------------|----------------|
| Bruise    | Minor penalty                   | 0.25–0.5%/s |
| Wound     | HP drain and severe penalty     | 0.5–1%/s |
| Destroyed | Part nonfunctional              | — |

Resting halves the injury rate. Each disciple has a **Resilience** stat (starting at 1%/s) that reduces progress and also restores lost HP at the same rate. Destroyed parts cannot be healed.

## Stacking and Death

Only one injury per body part is tracked. Incoming injuries upgrade severity. Destroying any vital part immediately incapacitates the disciple.

Head (Vital)	Instant death. Disciple collapses and dies.
Left Eye	-50% hit accuracy, -25% workspeed.	Stacks with right eye loss.
Right Eye	-50% hit accuracy, -25% workspeed.	Losing both eyes = auto 0% hit accuracy; ranged attacks impossible.
Vocal Sac	Cannot chant or cast spells.	Path-specific heavy penalty for Speakers of the Mist.
Left Hand	-50% attack speed, -25% workspeed.	Losing both hands = cannot perform melee attacks or crafting.
Right Hand	Same as left. Stacks with left hand loss.	
Left Leg	-50% mobility, -50% workspeed.	Losing both legs = cannot move; must be carried or remain in place.
Right Leg	Same as left. Stacks with left leg loss.	
Belly	-25% workspeed. May reduce effectiveness of prolonged tasks (e.g., gathering, long chants).	Non-lethal but significantly slows economy-based actions.
Inner Meridians	Halves water regen and metamorphosis speed.	Very dangerous for water-based defense paths.
General Damage	Reduces current HP only. No specific function loss.	Represents minor or superficial injury.

## Health Tab

The disciple overlay now contains a **Health** tab. Each body part displays an injury bar indicating current severity and any active effects. Bruises fill the bar with a brown tint, wounds with red and destroyed parts appear dark.
