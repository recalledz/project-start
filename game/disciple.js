// Core class representing an individual disciple. Instances of this
// class are created by systems across the game and store combat and
// attribute information for a single coquí.
import { generateDiscipleAttributes } from './discipleAttributes.js';
import { xpRequirement } from '../utils/xp.js';
import { runAnimation } from '../utils/animation.js';
import { sectState } from './state.js';
import { STAGE_BONUS } from './metamorphosisBonuses.js';

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
    // base resilience percentage per second for healing injuries and HP
    this.baseResilience = 1;
    this.resilience = this.baseResilience;
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
    // Combat stats no longer scale with attributes.
    // Damage and defense grow purely with combat level and metamorphosis bonuses.
    const stage = sectState.discipleMetamorphosis[this.id]?.stage || 0;
    const stageBonus = stage * STAGE_BONUS.attack;
    this.damage = this.combatLevel * 3 + stageBonus;
    this.attackSpeed = 10000;
    this.defense = this.combatLevel;
  }

  takeDamage(amount) {
    this.currentHp = Math.round(Math.max(0, this.currentHp - amount));
    if (Object.hasOwn(this, 'health')) {
      this.health = this.currentHp;
    }
  }

  isDefeated() {
    return this.currentHp <= 0;
  }
}
