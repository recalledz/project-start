// Core class representing an individual disciple. Instances of this
// class are created by systems across the game and store combat and
// attribute information for a single coquí.
import { generateDiscipleAttributes } from './discipleAttributes.js';
import { xpRequirement } from '../utils/xp.js';
import { runAnimation } from '../utils/animation.js';
import { createDefaultCombatStats } from './combatStats.js';

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
    this.lastTab = 'general';
    // mood system
    this.mood = 100;
    this.healedInjuryTimers = {};
    this.incapTimer = 0;
    this.combatStats = createDefaultCombatStats(combatLevel);
    this.updateCombatStats();
  }

  xpForNextLevel() {
    return xpRequirement(50, this.combatLevel);
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
    if (typeof globalThis.updateDiscipleCombatStatsDisplay === 'function') {
      globalThis.updateDiscipleCombatStatsDisplay();
    }
  }

  updateCombatStats() {
    this.damage = this.combatStats.meleeDamage.value;
    this.minDamage = Math.max(1, Math.floor(this.damage * 0.5));
    this.maxDamage = Math.ceil(this.damage * 1.5);
    this.attackSpeed = 5000;
    this.defense = this.combatStats.defense.value;
    this.magicDefense = this.combatStats.magicDefense.value;
  }

  gainStatXp(key, amount) {
    const stat = this.combatStats[key];
    if (!stat) return;
    const leveled = stat.gainXp(amount);
    if (leveled) {
      this.updateCombatStats();
    }
    if (typeof globalThis.updateDiscipleCombatStatsDisplay === 'function') {
      globalThis.updateDiscipleCombatStatsDisplay();
    }
  }

  gainMeleeDamageXp(amount) {
    this.gainStatXp('meleeDamage', amount);
  }

  gainSpellDamageXp(amount) {
    this.gainStatXp('spellDamage', amount);
  }

  gainDefenseXp(amount) {
    this.gainStatXp('defense', amount);
  }

  gainMagicDefenseXp(amount) {
    this.gainStatXp('magicDefense', amount);
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
