22– Skills

Each skill has its own progression, yield formula, and spot data. Skills gain XP to level up, unlocking improved rates and new tasks.


---

09.1 Water Sense

Base Water: 10, 1 Water/s regen

Max Water Bonus: +2.4% of base Max Water per level

Water Absorption: +5% of Regen rate

Cultivation Speed: +4% of base speed per level

Skill XP gained by cultivating



---

09.2 Building

Determines time to construct buildings.

Formula:

BuildTime = WorkUnits ÷ (1 + Endurance × 0.05 + BuildingSkill × 0.02)

WorkUnits: Derived from building material costs and complexity.

Affected by: Disciple Endurance and Building skill level.



---

09.3 Chanting

Unlocked after building Chanting Halls.

Efficacy: Percentage of spell potency per cast.

Efficacy% = (ChantingSkill + Intelligence) × 12.5%

(e.g., Skill 1 + INT 1 = 2 × 12.5% = 25% efficacy)

Cooldown:

Cooldown = 30 s × (1 - 0.04 × ChantingHallsLevel)

Generation Value: Builds additional Water/sec based on building level.



---

09.4 Gathering

Disciples collect food or herbs at gathering spots.

Spot	BaseYield	Req.Level	Base XP/s	Notes	Travel	Danger

Berry Bush	0.1038	1	0.75	Basic fruit	0	0
Grove	0.07	5	1.5	Low yield, high XP	1	0
Solemn Fields	0.12	10	1.0	Vegetables, injury risk	2	1
Sacred Orchard	0.05	20	1.5	Spirit fruits, low yield	3	1
Misty Quarry	0.08	25	1.7	Special reagents	4	2


Yield Formula:

GatherYield/sec = BaseYield × (1 + DEX × 0.05 + GatheringSkill × 0.02)



---

09.5 Woodcutting

Chop timber at various spots.

Spot	BaseYield/s	XP/s	Req.Level	Travel	Danger	Wood Type	Special Loot

Scrubland Trees	0.09	1.0	1	0.5	0	Softwood	Basic bark
Broadleaf Thicket	0.08	1.3	5	2	1	Hardwood	Sap, strong planks
Ironbark Forest	0.07	1.5	10	3	2	Ironwood	Iron-infused bark
Ghostgrove	0.06	1.8	20	4	3	Spiritwood	Mystic sap
Petrified Hollow	0.05	2.0	25	5	4	Stonebark	Ancient core bark


Yield Formula:

WoodYield/sec = BaseYield × (1 + STR × 0.05 + WoodcuttingSkill × 0.02)


---

09.6 Mining

Excavate ores from veins and outcrops.

Spot	BaseYield	Req.Level	XP/s	Travel	Danger	Ore Type

Rocky Outcrop	0.1038	1	0.75	1	0	Stone
Shale Tunnel	0.09	5	1.00	2	0	Claystone
Iron Vein	0.07	10	1.20	3	1	Iron Ore
Crimson Cavern	0.05	20	1.50	4	1	Fire Ore
Obsidian Rift	0.04	25	1.70	5	2	Obsidian



---

09.7 Hunting

Track and hunt wildlife; yields variable food and materials.

Relevant Attributes:

Dexterity contributes 20% to success rate.

Strength contributes 30% to yield.


Daily Respawn: Animal spawns reset daily; higher-tier areas spawn better game.


Yield Estimate:

HuntYield ≈ BaseRate × (1 + DEX × 0.20 + STR × 0.30) × ActivityTime

All formulas subject to balancing.


---

09.8 Casting

spell power and cost reduction.

Each level increases spell power by 7.5% and decreases water cost by -7.5%. Stacks multiplicatively.
