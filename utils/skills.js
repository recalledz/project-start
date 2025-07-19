import { ATTRIBUTE_FOR_GROUP } from '../game/constants.js';
import { sectState } from '../game/state.js';
import { runAnimation } from './animation.js';

export function ensureDiscipleSkills(id) {
  if (!sectState.discipleSkills[id]) {
    sectState.discipleSkills[id] = {
      Idle: 0,
      Gathering: 0,
      Logging: 0,
      Hunting: 0,
      Building: 0,
      Researching: 0,
      Chanting: 0,
      Exploration: 0,
      WaterSense: 0
    };
  }
}

export function awardAttributePoints(d, group) {
  const attr = ATTRIBUTE_FOR_GROUP[group];
  const points = 1 + (Math.random() < 0.1 ? 1 : 0);
  for (let i = 0; i < points; i++) {
    const targeted = Math.random() < 0.5 && attr;
    let target = attr;
    if (!targeted || !attr) {
      const others = ['strength', 'dexterity', 'endurance', 'intelligence'];
      if (attr) others.splice(others.indexOf(attr), 1);
      target = others[Math.floor(Math.random() * others.length)];
    }
    d[target] += 1;
  }
  if (typeof d.updateCombatStats === 'function') d.updateCombatStats();
  if (d.cardElement) runAnimation(d.cardElement, 'levelup-animate');
}

export function taskXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

export function getTaskSkillProgress(xp) {
  let total = 0;
  let level = 0;
  let next = taskXpRequired(level);
  while (xp >= total + next) {
    total += next;
    level += 1;
    next = taskXpRequired(level);
  }
  const progress = (xp - total) / next;
  return { level, progress, next };
}

export function addSkillXp(d, group, amount) {
  ensureDiscipleSkills(d.id);
  const prevXp = sectState.discipleSkills[d.id][group] || 0;
  const oldLevel = getTaskSkillProgress(prevXp).level;
  const newXp = prevXp + amount;
  sectState.discipleSkills[d.id][group] = newXp;
  const newLevel = getTaskSkillProgress(newXp).level;
  if (newLevel > oldLevel) {
    if (newLevel > d.globalLevel) {
      d.globalLevel = newLevel;
      awardAttributePoints(d, group);
    }
    if (d.cardElement) runAnimation(d.cardElement, 'levelup-animate');
  }
}

export function computeGlobalSkillLevel(id) {
  ensureDiscipleSkills(id);
  const skills = sectState.discipleSkills[id];
  let max = 0;
  for (const xp of Object.values(skills)) {
    const lvl = getTaskSkillProgress(xp).level;
    if (lvl > max) max = lvl;
  }
  return max;
}
