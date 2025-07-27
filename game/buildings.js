// Building-related logic extracted from script.js
import { sectState, systems, updateResourceCaps } from './state.js';
import { sectSystem, ORB_REPAIR_SECONDS } from './sect.js';
import { addSkillXp, ensureDiscipleSkills, getTaskSkillProgress } from '../utils/skills.js';
import { intelligenceXpMultiplier } from './attributes.js';
import { BUILD_XP_RATE } from './constants.js';

export const BUILDINGS = {
  bohio: {
    name: 'Bohio',
    time: 600,
    max: 80,
    costFunc: lvl => 20 * Math.pow(2, lvl)
  },
  researchDesk: { name: 'Research Desk', cost: 15, time: 300, max: 1, requires: 'bohio' },
  chantingHall: { name: 'Chanting Hall', cost: 50, time: 600, max: 1, requires: 'researchDesk' },
  orbSpellStrength: {
    name: 'Orb Spell Strength',
    time: 300,
    costFunc: lvl => Math.round(100 * Math.pow(1.3, lvl)),
    max: 10,
    requires: 'researchDesk'
  },
  areitoCircle: {
    name: 'Circle of Areito',
    time: 600,
    costFunc: lvl => Math.round(150 * Math.pow(1.5, lvl - 1)),
    costWaterFunc: lvl => Math.round(10 * Math.pow(1.5, lvl - 1)),
    max: 10
  }
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
  if (!systems.areitoBuildingAvailable && sectState.softwood >= 100) {
    systems.areitoBuildingAvailable = true;
  }
}

export function startBuilding(key) {
  const b = BUILDINGS[key];
  if (!b) return;
  const built = sectState.buildings[key] || 0;
  const cost = b.costFunc ? b.costFunc(built + 1) : b.cost;
  const waterCost = b.costWaterFunc ? b.costWaterFunc(built + 1) : 0;
  if (sectState.softwood < cost) return;
  if (sectSystem.orbs.water.current < waterCost) return;
  if (built >= b.max) return;
  if (sectState.currentBuild) return;
  if (b.requires && sectState.buildings[b.requires] < b.max) return;
  if (key === 'chantingHall' && !systems.chantingHallUnlocked) return;
  if (key === 'orbSpellStrength' && !systems.spellStrengthUnlocked) return;
  sectState.softwood -= cost;
  if (waterCost) sectSystem.orbs.water.current -= waterCost;
  sectState.currentBuild = key;
  sectState.buildProgress = 0;
  if (typeof globalThis.updateBuildOverlay === 'function') {
    globalThis.updateBuildOverlay();
  }
}

export function tickBuilding(dt) {
  let speed = 0;
  sectSystem.disciples.forEach(d => {
    if (sectState.discipleTasks[d.id] === 'Building') {
      ensureDiscipleSkills(d.id);
      ensureDiscipleConstructXp(d.id);
      const xp = sectState.discipleSkills[d.id]['Building'];
      const lvl = getTaskSkillProgress(xp).level;
      speed += 1 + 0.05 * d.endurance + 0.02 * lvl;
      addSkillXp(d, 'Building', BUILD_XP_RATE * dt * intelligenceXpMultiplier());
    }
  });
  if (speed === 0) return;
  if (sectSystem.wordOfHasteTimer > 0) speed *= 1.5;

  const orb = sectSystem.orbs.water;
  if (orb.cracked) {
    sectState.orbRepairProgress += (dt * speed) / ORB_REPAIR_SECONDS;
    if (sectState.orbRepairProgress >= 1) {
      orb.cracked = false;
      orb.max *= 2;
      sectState.orbRepairProgress = 0;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('orbs-changed'));
      }
    }
    if (typeof globalThis.updateBuildOverlay === 'function') {
      globalThis.updateBuildOverlay();
    }
    return;
  }

  if (!sectState.currentBuild) return;
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
      updateResourceCaps();
    }
  if (sectState.buildings.bohio >= 1) {
      const shack = document.getElementById('sectBohio');
      if (shack) shack.style.display = 'block';
  }
    if (builtKey === 'researchDesk' && !systems.researchUnlocked) {
      systems.researchUnlocked = true;
    }
    if (builtKey === 'areitoCircle') {
      if (!systems.transmutationUnlocked) systems.transmutationUnlocked = true;
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
