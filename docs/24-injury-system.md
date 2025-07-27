# 24 – Injury System and Health Tab

This module introduces a granular injury system for disciples. Each body part contributes a portion of the disciple's maximum health. Injuries progress from **Bruise** → **Wound** → **Destroyed** and reduce available HP.

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
| Bruise    | Minor penalty                   | 0.5%/s |
| Wound     | HP drain and severe penalty     | 1.0%/s |
| Destroyed | Part nonfunctional              | — |

Resting reduces progress speed by 2. Positive resilience heals injuries over time. Destroyed parts cannot be healed.

## Stacking and Death

Only one injury per body part is tracked. Incoming injuries upgrade severity. Destroying any vital part immediately incapacitates the disciple.

When all non-vital parts are destroyed the disciple is effectively crippled with only 1 HP remaining.

## Health Tab

The disciple overlay now contains a **Health** tab. Each body part displays an injury bar indicating current severity. Bruises fill the bar with a brown tint, wounds with red and destroyed parts appear dark.
