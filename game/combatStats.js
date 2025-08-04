import { xpRequirement } from '../utils/xp.js';

export class CombatStat {
  constructor({ base = 0, level = 1, perLevel = 1, isPercent = false } = {}) {
    this.base = base;
    this.level = level;
    this.perLevel = perLevel;
    this.isPercent = isPercent;
    this.xp = 0;
  }

  get value() {
    return this.base + (this.level - 1) * this.perLevel;
  }

  xpForNextLevel() {
    return xpRequirement(20, this.level);
  }

  gainXp(amount) {
    this.xp += amount;
    let leveled = false;
    while (this.xp >= this.xpForNextLevel()) {
      this.xp -= this.xpForNextLevel();
      this.level += 1;
      leveled = true;
    }
    return leveled;
  }
}

export const COMBAT_STAT_DEFS = [
  { key: 'meleeDamage', label: 'Melee Damage', base: 1, perLevel: 1, isPercent: false },
  { key: 'spellDamage', label: 'Spell Damage', base: 0, perLevel: 1, isPercent: true },
  { key: 'defense', label: 'Defense', base: 2, perLevel: 1, isPercent: false },
  { key: 'magicDefense', label: 'Magic Defense', base: 2, perLevel: 1, isPercent: false }
];

export function createDefaultCombatStats(combatLevel = 1) {
  return {
    meleeDamage: new CombatStat({ base: 1, level: combatLevel, perLevel: 1 }),
    spellDamage: new CombatStat({ base: 0, level: 1, perLevel: 1, isPercent: true }),
    defense: new CombatStat({ base: 2, level: combatLevel, perLevel: 1 }),
    magicDefense: new CombatStat({ base: 2, level: 1, perLevel: 1 })
  };
}
