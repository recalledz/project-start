// Generic damage helper used by raid modules.
import { randomBodyPart, applyInjury } from './injury.js';
import { addCombatStatXp } from './combatStats.js';

export function applyDamage(target, amount, type = 'physical') {
  let remaining = Math.round(amount);
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
  target.currentHp = Math.max(0, target.currentHp - remaining);
  if (Object.hasOwn(target, 'health')) {
    target.health = target.currentHp;
  }
  if (target && Object.hasOwn(target, 'id')) {
    if (type === 'physical') addCombatStatXp(target, 'defense', 1);
    if (type === 'spell') addCombatStatXp(target, 'magicDefense', 1);
  }
  return remaining;
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
