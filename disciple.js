import { generateDiscipleAttributes } from './discipleAttributes.js';
import { xpRequirement } from './utils/xp.js';
import { runAnimation } from './utils/animation.js';

export default class Disciple {
  constructor({ id = 0, name = `Disciple ${id}`, maxHp = 10, combatLevel = 1, attributes = generateDiscipleAttributes() } = {}) {
    this.id = id;
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
    this.combatLevel = combatLevel;
    this.combatXp = 0;
    this.globalLevel = 0;
    this.strength = attributes.strength || 0;
    this.dexterity = attributes.dexterity || 0;
    this.endurance = attributes.endurance || 0;
    this.intelligence = attributes.intelligence || 0;
    this.charisma = attributes.charisma || 0;
    this.potential = attributes.potential || 0;
    this.defense = 1;
    this.lastTab = 'general';
    this.updateCombatStats();
  }

  xpForNextLevel() {
    return xpRequirement(5, this.combatLevel);
  }

  gainCombatXp(amount) {
    const before = this.combatLevel;
    this.combatXp += amount;
    while (this.combatXp >= this.xpForNextLevel()) {
      this.combatXp -= this.xpForNextLevel();
      this.combatLevel += 1;
      this.updateCombatStats();
    }
    if (this.combatLevel > before && this.cardElement) {
      runAnimation(this.cardElement, 'levelup-animate');
    }
  }

  updateCombatStats() {
    this.damage = this.combatLevel * 3 * (1 + 0.05 * this.strength);
    this.attackSpeed = 10000 / (1 + 0.05 * this.dexterity);
    this.defense = (1 + 0.05 * this.endurance) * this.combatLevel;
  }

  takeDamage(amount) {
    this.currentHp = Math.round(Math.max(0, this.currentHp - amount));
  }

  isDefeated() {
    return this.currentHp <= 0;
  }
}
