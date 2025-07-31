# 24 – Injury System and Health Tab

This module introduces a granular injury system for disciples. Each body part contributes a portion of the disciple's maximum health. Injuries progress from **Bruise** → **Wound** → **Destroyed** and reduce available HP.

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

## Body Part Contributions

| Body Part     | HP % | Vital |
|---------------|------|-------|
| Head          | 20%  | ✅ |
| Eye (×2)      | 5% (2.5% each) |  |
| Vocal Sac     | 5%   | |
| Hands (×2)    | 10% (5% each) | |
| Legs (×2)     | 10% (5% each) | |
| Belly         | 10%  | |
| Inner Meridians | 10% | |

The sum of healthy parts determines current maximum HP.

## Injury Progression

| Tier      | Effect                          | Progress Speed |
|-----------|---------------------------------|----------------|
| Bruise    | Minor penalty                   | 0.25–0.5%/s |
| Wound     | HP drain and severe penalty     | 0.5–1%/s |
| Destroyed | Part nonfunctional              | — |

Resting halves the injury rate. Each disciple has a **Resilience** stat (starting at 1%/s) that reduces progress and also restores lost HP at the same rate. Destroyed parts cannot be healed.

## Stacking and Death

Only one injury per body part is tracked. Incoming injuries upgrade severity. Destroying any vital part immediately incapacitates the disciple.

When all non-vital parts are destroyed the disciple is effectively crippled with only 1 HP remaining.

## Health Tab

The disciple overlay now contains a **Health** tab. Each body part displays an injury bar indicating current severity. Bruises fill the bar with a brown tint, wounds with red and destroyed parts appear dark.
