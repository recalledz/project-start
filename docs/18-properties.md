21 – Properties & Formulas

This section defines core property formulas used across game systems.


---

21.1 Learning Speed

Affects all skill XP gains.

Range: 0.5× at INT 0 → 2.0× at INT 10

Formula:

LearningSpeed = 0.5 + 0.15 × Intelligence

(e.g. INT 5 ⇒ 0.5 + 0.75 = 1.25×)



---

21.2 Water Regeneration (Water/s)

Determines how much Water the sect orb or a cultivator gains per second.

WaterRegen = ([areaWater] × (4 + ElementStrength) × (0.5 + 0.05 × WaterSense) / 320)
        + (0.0002 × MaxWater)
        + globalWater

ElementStrength: +2 or –2 modifier based on elemental fengshui within the cultivation room.

areaWater: Total ambient Water from buildings, orb, relics, and dungeon factors.

WaterSense: Cultivator’s Water Sense skill level.

globalWater: Flat Water generation from sect-wide buffs (e.g. Water Fonts levels).



---

21.3 Maximum Water (MaxWater)

Formula:

MaxWater = min(3 × WaterSense + 10 × CeremoniousMonasteryLevel, 95)

CeremoniousMonasteryLevel: Each level adds +10 to the soft cap up to 95.



---

21.4 Travel Speed

Determines travel speed on the world map.

Formula:

TravelSpeed = 1 + 0.1 × ArtifactSkill × (1 + SpeedBonus)

ArtifactSkill: Disciple’s artifact proficiency level.

SpeedBonus: Sum of all additional speed modifiers (starts at 1.0).



---

21.5 Casting Potency

Dictates the strength multiplier for spell effects.

Base Potency: 1.0

Modifiers: Increases from spell-specific multipliers and relics.

(Exact formula to be defined alongside Combat & Spell systems.)



---

All formulas subject to further tuning and balancing.
