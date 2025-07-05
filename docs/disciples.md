# Disciples

Disciples are followers recruited through **The Calling** construct. They live at your Sect settlement and can be assigned to various tasks.

## Attributes

Each disciple starts with a set of personal attributes used by the colony interface:

- **Health**, **Stamina** and **Hunger** – short term needs capped at 10/10/20.
- **Power** – base potency when invoking constructs on their own.
- **Strength**, **Dexterity**, **Endurance** and **Intelligence** – broad talents that modify XP gains and construct potency.
- **Incapacitated** – indicates if a disciple can no longer work.

These stats are initialised when disciples are loaded or created in the game code:

```javascript
if (Array.isArray(speechState.disciples)) {
  speechState.disciples.forEach(d => {
    if (d.health === undefined) d.health = 10;
    if (d.stamina === undefined) d.stamina = 10;
    if (d.hunger === undefined) d.hunger = 20;
    if (d.power === undefined) d.power = 1;
    if (d.strength === undefined) d.strength = 1;
    if (d.dexterity === undefined) d.dexterity = 1;
    if (d.endurance === undefined) d.endurance = 1;
    if (d.intelligence === undefined) d.intelligence = 1;
    if (d.incapacitated === undefined) d.incapacitated = false;
    if (!d.name) d.name = `Disciple ${d.id}`;
  });
}
```

Newly recruited disciples receive **3–5 additional attribute points**. These
extra points are distributed across Strength, Dexterity, Endurance and
Intelligence with diminishing chances to stack points on the same attribute.
Gaining three points in a single stat is therefore possible but uncommon.

## Task Proficiency

Disciples gain skill experience (XP) for the task they are performing. XP follows an exponential curve where the XP required for each level is `50 × 1.2^level`:

```javascript
function taskXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}
```

When a disciple completes a work cycle – such as gathering fruit or logging pine – XP is awarded to that task. The game multiplies this XP by functions that depend on the player's own attributes:

```javascript
const mult =
  strengthXpMultiplier(task) *
  enduranceXpMultiplier(task) *
  dexterityXpMultiplier(task) *
  intelligenceXpMultiplier(task);
sectState.discipleSkills[d.id][task] += cycles * mult;
```

These multipliers are defined in `attributes.js`:

```javascript
export function strengthXpMultiplier(task) {
  const affected = ['Log Pine', 'Mining', 'Smithing'];
  return affected.includes(task) ? 1 + attributes.Strength.points * 0.1 : 1;
}

export function enduranceXpMultiplier(task) {
  const affected = ['Building', 'Defending', 'Combat'];
  return affected.includes(task) ? 1 + attributes.Endurance.points * 0.1 : 1;
}

export function dexterityXpMultiplier(task) {
  const affected = ['Woodcutting', 'Gather Fruit'];
  return affected.includes(task) ? 1 + attributes.Dexterity.points * 0.1 : 1;
}

export function intelligenceXpMultiplier(task) {
  const affected = ['Chant', 'Research'];
  return affected.includes(task) ? 1 + attributes.Intelligence.points * 0.1 : 1;
}
```

Increasing **Strength** speeds up XP gain for mining, smithing, and logging jobs. **Dexterity** now boosts XP for woodcutting and gathering, while **Intelligence** grants extra XP when chanting or researching. **Endurance** continues to help disciples learn faster when building or defending.

## XP Gain Rates

Each task provides a small amount of skill XP whenever a work cycle is completed. The base cycle lengths are derived from constants in `script.js`:

- **Gather Fruit** – `FRUIT_CYCLE_SECONDS = 200`
- **Log Pine** – `PINE_LOG_CYCLE_SECONDS = 215`
- **Research** – progresses at 4 insight per second and requires `500` progress for 1 XP (125&nbsp;seconds)
- **Chant** – awards 1 XP every 3 seconds
- **Building** – grants XP each second while construction is underway

With these values, the default XP gain rates and example time to reach higher proficiency levels are approximately:

| Task | Base XP Rate | Lv. 1 (50 XP) | Lv. 5 (372 XP) |
| --- | --- | --- | --- |
| Gather Fruit | `0.005` XP/s | ~2h 46m | ~20h 40m |
| Log Pine | `0.0047` XP/s | ~2h 59m | ~22h 13m |
| Research | `0.008` XP/s | ~1h 44m | ~12h 55m |
| Chant | `0.333` XP/s | ~2m 30s | ~18m 36s |
| Building | `1` XP/s | ~50s | ~6m 12s |

These estimates assume no attribute bonuses and continuous work on the same task. Attribute points or upgrades will shorten the timelines further.
