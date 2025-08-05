// Core class representing an individual disciple. Instances of this
// class are created by systems across the game and store combat and
// attribute information for a single coquí.
import { generateDiscipleAttributes } from './discipleAttributes.js';
import { sectState } from './state.js';
import { STAGE_BONUS } from './metamorphosisBonuses.js';
import { COMBAT_STAT_DEFS, ensureCombatStats, getCombatStatProgress } from './combatStats.js';

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
    this.defense = COMBAT_STAT_DEFS.defense.base;
    this.magicDefense = COMBAT_STAT_DEFS.magicDefense.base;
    this.lastTab = 'general';
    // mood system
    this.mood = 100;
    this.healedInjuryTimers = {};
    this.incapTimer = 0;
    this.updateCombatStats();
  }

  updateCombatStats() {
    ensureCombatStats(this.id);
    // Combat stats no longer scale with attributes or combat levels.
    // Damage and defense grow with metamorphosis bonuses and stat XP.
    const stage = sectState.discipleMetamorphosis[this.id]?.stage || 0;
    const stageBonus = stage * STAGE_BONUS.attack;

    const meleeLevel = getCombatStatProgress(this, 'meleeDamage').level;
    this.meleeDamage = COMBAT_STAT_DEFS.meleeDamage.base + meleeLevel + stageBonus;
    this.damage = this.meleeDamage;
    this.minDamage = Math.max(1, Math.floor(this.meleeDamage * 0.5));
    this.maxDamage = Math.ceil(this.meleeDamage * 1.5);
    this.attackSpeed = 5000;

    const defLevel = getCombatStatProgress(this, 'defense').level;
    this.defense =
      COMBAT_STAT_DEFS.defense.base + defLevel * 0.5 + stageBonus;

    const mdefLevel = getCombatStatProgress(this, 'magicDefense').level;
    this.magicDefense =
      COMBAT_STAT_DEFS.magicDefense.base + mdefLevel * 0.5 + stageBonus;

    const spellLevel = getCombatStatProgress(this, 'spellDamage').level;
    this.spellDamage = COMBAT_STAT_DEFS.spellDamage.base + spellLevel;
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
