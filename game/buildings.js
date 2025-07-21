// Building-related logic extracted from script.js
import { sectState, systems } from './state.js';
import { sectSystem } from './sect.js';
import { addSkillXp, ensureDiscipleSkills, getTaskSkillProgress } from '../utils/skills.js';
import { intelligenceXpMultiplier } from '../attributes.js';
import { BUILD_XP_RATE } from './constants.js';

export const BUILDINGS = {
  bohio: {
    name: 'Bohio',
    time: 600,
    max: 80,
    costFunc: lvl => 20 * Math.pow(2, lvl)
  },
  researchDesk: { name: 'Research Desk', cost: 15, time: 300, max: 1, requires: 'bohio' },
  chantingHall: { name: 'Chanting Hall', cost: 50, time: 600, max: 1, requires: 'researchDesk' }
};

export function getHousingName(level) {
  if (level <= 10) return 'Bohio';
  if (level <= 20) return 'Outer Quarters';
  if (level <= 30) return 'Meditation Hall';
  if (level <= 40) return 'Inner Hall';
  if (level <= 50) return 'Immortal Sanctum';
  if (level <= 60) return 'Meditation Hall';
  if (level <= 70) return 'Sky Pavilion';
  return 'Immortal Sanctum';
}

export function ensureDiscipleConstructXp(id) {
  if (!sectState.discipleConstructXp[id]) {
    sectState.discipleConstructXp[id] = {};
  }
}

export function checkBuildingUnlock() {
  if (!systems.buildingUnlocked && sectState.softwood >= 20) {
    systems.buildingUnlocked = true;
  }
}

export function startBuilding(key) {
  const b = BUILDINGS[key];
  if (!b) return;
  const built = sectState.buildings[key] || 0;
  const cost = b.costFunc ? b.costFunc(built + 1) : b.cost;
  if (sectState.softwood < cost) return;
  if (built >= b.max) return;
  if (sectState.currentBuild) return;
  if (b.requires && sectState.buildings[b.requires] < b.max) return;
  if (key === 'chantingHall' && !systems.chantingHallUnlocked) return;
  sectState.softwood -= cost;
  sectState.currentBuild = key;
  sectState.buildProgress = 0;
  if (typeof globalThis.updateBuildOverlay === 'function') {
    globalThis.updateBuildOverlay();
  }
}

export function tickBuilding(dt) {
  if (!sectState.currentBuild) return;
  let speed = 0;
  sectSystem.disciples.forEach(d => {
    const t = sectState.discipleTasks[d.id];
    if (!t || t === 'Idle' || t === 'Building') {
      ensureDiscipleSkills(d.id);
      ensureDiscipleConstructXp(d.id);
      const xp = sectState.discipleSkills[d.id]['Building'];
      const lvl = getTaskSkillProgress(xp).level;
      speed += 1 + 0.05 * d.endurance + 0.02 * lvl;
      addSkillXp(d, 'Building', BUILD_XP_RATE * dt * intelligenceXpMultiplier());
    }
  });
  if (speed === 0) return;
  const b = BUILDINGS[sectState.currentBuild];
  sectState.buildProgress += (dt * speed) / b.time;
  if (sectState.buildProgress >= 1) {
    const builtKey = sectState.currentBuild;
    sectState.buildings[builtKey]++;
    sectState.currentBuild = null;
    sectState.buildProgress = 0;
    if (builtKey === 'bohio') {
      sectState.maxDisciples = 3 + sectState.buildings.bohio;
      sectState.housingBonus = 0.05 * Math.floor(sectState.buildings.bohio / 10);
    }
    if (sectState.buildings.bohio >= 1) {
      const basket = document.getElementById('sectBasket');
      const shack = document.getElementById('sectBohio');
      if (basket) basket.style.display = 'none';
      if (shack) shack.style.display = 'block';
    }
    if (builtKey === 'researchDesk' && !systems.researchUnlocked) {
      systems.researchUnlocked = true;
    }
    if (typeof globalThis.updateBuildOverlay === 'function') {
      globalThis.updateBuildOverlay();
    }
  } else {
    if (typeof globalThis.updateBuildOverlay === 'function') {
      globalThis.updateBuildOverlay();
    }
  }
}
