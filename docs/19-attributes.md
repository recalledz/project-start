# 19 – Attributes

Character basic attributes which are difficult to change. They determine many in-game mechanics.

## Dexterity 👁️
- Determines yield for Gathering and Hunting
- Determines chance to discover locations while traveling
- GatherYield = BaseYield × (1 + DEX × 0.05 + GatheringSkill × 0.02) × WorkDuration
- HuntYield ≈ BaseRate × (1 + DEX × 0.20 + STR × 0.30) × ActivityTime
## Endurance 💪
- Determines speed (and yield when applicable) for Building and Farming (to be implemented)
- BuildTime = WorkUnits ÷ (1 + Endurance × 0.05 + BuildingSkill × 0.02)
- WorkUnits: Derived from building material costs and complexity.

## Strength ⚔️
- Determines yield for Woodcutting, Hunting and Mining
- WoodYield = BaseYield × (1 + STR × 0.05 + WoodcuttingSkill × 0.02) × WorkDuration
- HuntYield ≈ BaseRate × (1 + DEX × 0.20 + STR × 0.30) × ActivityTime
- 
## Intelligence 🧙
- Affects Water Sense
- Determines initial learning speed
- Affects Chanting and Researching
- Only Intelligence modifies skill XP gain. Other attributes no longer increase proficiency XP rates.
-chanting Efficacy% = (ChantingSkill + Intelligence) × 12.5%

(e.g., Skill 1 + INT 1 = 2 × 12.5% = 25% efficacy)
## Charisma 🗣️
- Improves disciple recruitment chances and influences their potential
- Affects diplomacy

## Potential
- Calculated from other attributes and the recruiter's social skill
- `Potential = S / 20 + (Strength + Dexterity + Endurance + Intelligence + Charisma) / 10`
  - `S` is the recruiter's social skill from 1–100
- Determines maximum size of the Inner Cauldron
  - `Maximum size = Potential × 500`
  - Range: 0.714–9.286 (Inner Cauldron size 357–5143 Max Water)

> The Inner Cauldron is a cultivation feature that increases a disciple's maximum Water.
