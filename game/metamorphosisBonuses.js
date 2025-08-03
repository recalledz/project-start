import { sectState } from './state.js';
import { calculateMaxWater, calculateWaterRegen } from '../utils/water.js';

export const STAGE_BONUS = {
  maxWater: 100,
  waterRegen: 2,
  resilience: 0.002,
  potency: 0.2,
  attack: 3
};

export function getStage(d) {
  return sectState.discipleMetamorphosis[d.id]?.stage || 0;
}

export function applyStageBonuses(d) {
  const stage = getStage(d);
  d.maxWaterBonus = stage * STAGE_BONUS.maxWater;
  d.waterRegenBonus = stage * STAGE_BONUS.waterRegen;
  const base = d.baseResilience ?? 1;
  d.resilience = base + stage * STAGE_BONUS.resilience;
  d.spellPotency = 1 + stage * STAGE_BONUS.potency;
  d.damageBonus = stage * STAGE_BONUS.attack;
}

export function getMaxWater(d, waterSenseLevel = 0) {
  return calculateMaxWater(waterSenseLevel) + (d.maxWaterBonus || 0);
}

export function getWaterRegen(d, waterSenseLevel = 0) {
  return calculateWaterRegen(waterSenseLevel) + (d.waterRegenBonus || 0);
}
