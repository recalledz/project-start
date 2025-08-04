import { sectState } from './state.js';

function masteryXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

export function getMasteryProgress(xp) {
  let total = 0;
  let level = 0;
  let next = masteryXpRequired(level);
  while (xp >= total + next) {
    total += next;
    level += 1;
    next = masteryXpRequired(level);
  }
  const progress = (xp - total) / next;
  return { level, progress, next };
}

export function ensureMeta(id) {
  if (!sectState.discipleMetamorphosis[id]) {
    sectState.discipleMetamorphosis[id] = {
      xp: 0,
      stage: 0,
      masteryXp: 0,
      masteryLevel: 0,
      masteryPending: false,
      upgrades: []
    };
  } else {
    const meta = sectState.discipleMetamorphosis[id];
    if (meta.masteryXp === undefined) meta.masteryXp = 0;
    if (meta.masteryLevel === undefined)
      meta.masteryLevel = getMasteryProgress(meta.masteryXp).level;
    if (meta.masteryPending === undefined) meta.masteryPending = false;
    if (!Array.isArray(meta.upgrades)) meta.upgrades = [];
  }
}

export function addMasteryXp(id, amount) {
  if (amount <= 0) return;
  ensureMeta(id);
  const meta = sectState.discipleMetamorphosis[id];
  const oldLevel = getMasteryProgress(meta.masteryXp).level;
  meta.masteryXp += amount;
  const newLevel = getMasteryProgress(meta.masteryXp).level;
  if (newLevel > oldLevel) {
    meta.masteryLevel = newLevel;
    meta.masteryPending = true;
  }
}
