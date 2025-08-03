export const SKILL_LIST = ['Idle','Gathering','Logging','Hunting','Researching','Chanting','Exploration','WaterSense'];

export function generateSkillAffinities() {
  const affinities = {};
  SKILL_LIST.forEach(s => {
    affinities[s] = null;
  });
  const likedCount = Math.floor(Math.random() * 4);
  const skills = [...SKILL_LIST];
  for (let i = 0; i < likedCount; i++) {
    if (!skills.length) break;
    const idx = Math.floor(Math.random() * skills.length);
    const skill = skills.splice(idx, 1)[0];
    affinities[skill] = 'liked';
  }
  const lovedCount = Math.floor(Math.random() * 4);
  const allSkills = [...SKILL_LIST];
  for (let i = 0; i < lovedCount; i++) {
    if (!allSkills.length) break;
    const idx = Math.floor(Math.random() * allSkills.length);
    const skill = allSkills.splice(idx, 1)[0];
    affinities[skill] = 'loved';
  }
  return affinities;
}

import { ensureDiscipleSkills } from '../utils/skills.js';
import { taskXpForLevel } from '../utils/skills.js';
import { sectState } from './state.js';

export function initializeStartingSkills(d) {
  ensureDiscipleSkills(d.id);
  const affinities = d.affinities || {};
  const learningSpeed = 0.5 + 0.15 * (d.intelligence || 0);
  let remaining = (Math.random() * (32 - 14.6) + 14.6) * 1.25 * learningSpeed;
  const levels = {};
  SKILL_LIST.forEach(skill => {
    let bonus = 0;
    if (affinities[skill] === 'loved') bonus = 3;
    else if (affinities[skill] === 'liked') bonus = 1.4;
    levels[skill] = bonus;
    remaining -= bonus;
  });
  let distributed = 0;
  while (remaining > 0 && distributed < 10) {
    const skill = SKILL_LIST[Math.floor(Math.random() * SKILL_LIST.length)];
    let gain = 1;
    if (affinities[skill] === 'loved') gain = 3;
    else if (affinities[skill] === 'liked') gain = 1.4;
    levels[skill] += gain;
    remaining -= gain;
    distributed += gain;
  }
  const skills = sectState.discipleSkills[d.id];
  for (const skill of SKILL_LIST) {
    skills[skill] = taskXpForLevel(levels[skill]);
  }
}

export function getAffinityMultiplier(d, group) {
  const aff = d.affinities?.[group];
  if (aff === 'loved') return 2;
  if (aff === 'liked') return 1.4;
  return 1;
}
