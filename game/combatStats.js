import { sectState } from './state.js';
import { showCombatLevelUp } from './rendering.js';

export const COMBAT_STAT_DEFS = {
  meleeDamage: { base: 1, unit: '', label: 'Melee Damage' },
  spellDamage: { base: 0, unit: '%', label: 'Spell Damage' },
  defense: { base: 2, unit: '', label: 'Defense' },
  magicDefense: { base: 2, unit: '', label: 'Magic Defense' }
};

export function combatStatXpRequired(level) {
  return Math.ceil(30 * Math.pow(level, 1.5));
}

function getProgressFromXp(xp) {
  let lvl = 0;
  let next = combatStatXpRequired(lvl + 1);
  let remaining = xp;
  while (remaining >= next) {
    remaining -= next;
    lvl += 1;
    next = combatStatXpRequired(lvl + 1);
  }
  const progress = next > 0 ? remaining / next : 0;
  return { level: lvl, progress, next };
}

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
  const prevLevel = getProgressFromXp(prev).level;
  const newXp = prev + amount;
  sectState.discipleCombatStats[d.id][stat] = newXp;
  const { level } = getProgressFromXp(newXp);
  if (level > prevLevel) {
    showCombatLevelUp(d, COMBAT_STAT_DEFS[stat].label);
  }
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
      d.defense = COMBAT_STAT_DEFS.defense.base + level * 0.5;
      break;
    }
    case 'magicDefense': {
      d.magicDefense = COMBAT_STAT_DEFS.magicDefense.base + level * 0.5;
      break;
    }
    default:
      break;
  }
}

export function getCombatStatProgress(d, stat) {
  ensureCombatStats(d.id);
  const xp = sectState.discipleCombatStats[d.id][stat] || 0;
  return getProgressFromXp(xp);
}
