// Core class representing an individual disciple. Instances of this
// class are created by systems across the game and store combat and
// attribute information for a single coquí.
import { generateDiscipleAttributes } from './discipleAttributes.js';
import { sectState } from './state.js';
import { STAGE_BONUS } from './metamorphosisBonuses.js';

export default class Disciple {
  constructor({ id = 0, name = `Disciple ${id}`, maxHp = 10, attributes = generateDiscipleAttributes() } = {}) {
    this.id = id;
    this.name = name;
    this.maxHp = maxHp;
    this.currentHp = maxHp;
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
    // mood system
    this.mood = 100;
    this.healedInjuryTimers = {};
    this.incapTimer = 0;
    this.updateCombatStats();
  }

  updateCombatStats() {
    // Combat stats no longer scale with attributes or combat levels.
    // Damage and defense grow purely with metamorphosis bonuses.
    const stage = sectState.discipleMetamorphosis[this.id]?.stage || 0;
    const stageBonus = stage * STAGE_BONUS.attack;
    const base = 1 + stageBonus;
    this.damage = base;
    this.minDamage = Math.max(1, Math.floor(this.damage * 0.5));
    this.maxDamage = Math.ceil(this.damage * 1.5);
    this.attackSpeed = 5000;
    this.defense = base;
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
