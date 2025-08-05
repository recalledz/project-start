// Generic damage helper used by raid modules.
import { randomBodyPart, applyInjury } from './injury.js';
import { addCombatStatXp } from './combatStats.js';
import { getMaxWater } from './metamorphosisBonuses.js';
import { sectState } from './state.js';

export function applyDamage(target, amount, type = 'physical') {
  let remaining = Math.round(amount);
  const reduction =
    type === 'physical'
      ? target.defense || 0
      : type === 'spell'
      ? target.magicDefense || 0
      : 0;
  remaining = Math.max(0, remaining - reduction);

  if (target.water > 0) {
    const absorbed = Math.min(target.water, remaining);
    target.water -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0 && target.water <= 0 && Object.hasOwn(target, 'injuries')) {
    const part = randomBodyPart();
    if (part !== 'general') {
      const tier = Math.random() < 0.5 ? 'bruise' : 'wound';
      applyInjury(target, part, tier);
    }
  }
  const damageToHp = remaining;
  target.currentHp = Math.max(0, target.currentHp - damageToHp);
  if (Object.hasOwn(target, 'health')) {
    target.health = target.currentHp;
  }
  if (target && Object.hasOwn(target, 'id')) {
    const waterSense = sectState.discipleSkills[target.id]?.WaterSense || 0;
    const maxWater = getMaxWater(target, waterSense) || 1;
    const xp = (damageToHp / maxWater) * 10;
    if (xp > 0) {
      if (type === 'physical') addCombatStatXp(target, 'defense', xp);
      if (type === 'spell') addCombatStatXp(target, 'magicDefense', xp);
    }
  }
  return damageToHp;
}

export function init() {}

export const discipleAttackTimers = {};
export let enemyAttackProgress = 0;
export function setEnemyAttackProgress(val) {
  enemyAttackProgress = val;
}

export function attack() {}
export function cDealerDamage() {}
export function setPartyDefeatHandler() {}
