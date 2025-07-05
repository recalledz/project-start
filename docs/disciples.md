# Disciples

Disciples are followers recruited through **The Calling** construct. They live at your Sect settlement and can be assigned to various tasks.

## Attributes

Each disciple starts with a set of personal attributes used by the colony interface:

- **Health**, **Stamina** and **Hunger** – short term needs capped at 10/10/20.
- **Power** – base potency when invoking constructs on their own.
- **Strength**, **Dexterity**, **Endurance** and **Intelligence** – broad talents that may influence future systems.
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

## Task Proficiency

Disciples gain skill experience (XP) for the task they are performing. XP follows an exponential curve where the XP required for each level is `50 × 1.2^level`:

```javascript
function taskXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}
```

When a disciple completes a work cycle – such as gathering fruit or logging pine – XP is awarded to that task. The game multiplies this XP by functions that depend on the player's own attributes:

```javascript
const mult = strengthXpMultiplier(task) * enduranceXpMultiplier(task);
sectState.discipleSkills[d.id][task] += cycles * mult;
```

These multipliers are defined in `attributes.js`:

```javascript
export function strengthXpMultiplier(task) {
  const affected = ['Woodcutting', 'Log Pine', 'Mining', 'Smithing'];
  return affected.includes(task) ? 1 + attributes.Strength.points * 0.1 : 1;
}

export function enduranceXpMultiplier(task) {
  const affected = ['Building', 'Defending', 'Combat'];
  return affected.includes(task) ? 1 + attributes.Endurance.points * 0.1 : 1;
}
```

Increasing your **Strength** attribute speeds up XP gain for woodcutting-related jobs such as **Log Pine**, while **Endurance** helps disciples learn faster when **Building** or defending. Other player attributes currently have no effect on disciple XP, but may do so in the future.
