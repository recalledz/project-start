import { sectState } from './state.js';
import { getTaskSkillProgress } from '../utils/skills.js';

export const COMBAT_STAT_DEFS = {
  meleeDamage: { base: 1, unit: '', label: 'Melee Damage' },
  spellDamage: { base: 0, unit: '%', label: 'Spell Damage' },
  defense: { base: 2, unit: '', label: 'Defense' },
  magicDefense: { base: 2, unit: '', label: 'Magic Defense' }
};

export function ensureCombatStats(id) {
  if (!sectState.discipleCombatStats[id]) {
    sectState.discipleCombatStats[id] = {
      meleeDamage: 0,
      spellDamage: 0,
      defense: 0,
      magicDefense: 0
    };
  }
}

export function addCombatStatXp(d, stat, amount = 1) {
  ensureCombatStats(d.id);
  const prev = sectState.discipleCombatStats[d.id][stat] || 0;
  const newXp = prev + amount;
  sectState.discipleCombatStats[d.id][stat] = newXp;
  const { level } = getTaskSkillProgress(newXp);
  switch (stat) {
    case 'meleeDamage': {
      d.meleeDamage = COMBAT_STAT_DEFS.meleeDamage.base + level;
      d.damage = d.meleeDamage;
      d.minDamage = Math.max(1, Math.floor(d.meleeDamage * 0.5));
      d.maxDamage = Math.ceil(d.meleeDamage * 1.5);
      break;
    }
    case 'spellDamage': {
      d.spellDamage = COMBAT_STAT_DEFS.spellDamage.base + level;
      break;
    }
    case 'defense': {
      d.defense = COMBAT_STAT_DEFS.defense.base + level;
      break;
    }
    case 'magicDefense': {
      d.magicDefense = COMBAT_STAT_DEFS.magicDefense.base + level;
      break;
    }
    default:
      break;
  }
}

export function getCombatStatProgress(d, stat) {
  ensureCombatStats(d.id);
  const xp = sectState.discipleCombatStats[d.id][stat] || 0;
  return getTaskSkillProgress(xp);
}
