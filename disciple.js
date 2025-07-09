import { generateDiscipleAttributes } from './discipleAttributes.js';
import { xpRequirement } from './utils/xp.js';

export default class Disciple {
  constructor({ id = 0, name = `Disciple ${id}`, maxHp = 10, combatLevel = 1, attributes = generateDiscipleAttributes() } = {}) {
    this.id = id;
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.combatLevel = combatLevel;
    this.combatXp = 0;
    this.strength = attributes.strength || 0;
    this.dexterity = attributes.dexterity || 0;
    this.endurance = attributes.endurance || 0;
    this.intelligence = attributes.intelligence || 0;
    this.updateCombatStats();
  }

  xpForNextLevel() {
    return xpRequirement(5, this.combatLevel);
  }

  gainCombatXp(amount) {
    this.combatXp += amount;
    while (this.combatXp >= this.xpForNextLevel()) {
      this.combatXp -= this.xpForNextLevel();
      this.combatLevel += 1;
      this.updateCombatStats();
    }
  }

  updateCombatStats() {
    this.damage = this.combatLevel * 3 * (1 + 0.05 * this.strength);
    this.attackSpeed = 10000 / (1 + 0.05 * this.dexterity);
  }
}
