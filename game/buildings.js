// Building-related logic extracted from script.js
import { sectState, systems, updateResourceCaps } from './state.js';
import { sectSystem } from './sect.js';

export const BUILDINGS = {
  bohio: {
    name: 'Bohio',
    max: 80,
    costFunc: lvl => 20 * Math.pow(2, lvl)
  },
  researchDesk: { name: 'Research Desk', cost: 15, max: 1, requires: 'bohio' },
  chantingHall: { name: 'Chanting Hall', cost: 50, max: 1, requires: 'researchDesk' },
  orbSpellStrength: {
    name: 'Orb Spell Strength',
    costFunc: lvl => Math.round(100 * Math.pow(1.3, lvl)),
    max: 10,
    requires: 'researchDesk'
  },
  areitoCircle: {
    name: 'Circle of Areito',
    costFunc: lvl => Math.round(150 * Math.pow(1.5, lvl - 1)),
    costWaterFunc: lvl => Math.round(10 * Math.pow(1.5, lvl - 1)),
    max: 10
  },
  metamorphRoom: {
    name: 'Metamorph Room',
    costFunc: lvl => (lvl === 1 ? 100 : Math.round(300 * Math.pow(1.7, lvl - 1))),
    costNectarFunc: lvl => (lvl === 1 ? 1 : Math.round(5 * Math.pow(1.5, lvl - 1))),
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

export function checkBuildingUnlock() {
  if (!systems.buildingUnlocked && sectState.softwood >= 20) {
    systems.buildingUnlocked = true;
  }
  if (!systems.areitoBuildingAvailable && sectState.softwood >= 100) {
    systems.areitoBuildingAvailable = true;
  }
  if (!systems.metamorphBuildingAvailable && sectState.undeadNectar > 0) {
    systems.metamorphBuildingAvailable = true;
  }
}

export function startBuilding(key) {
  const b = BUILDINGS[key];
  if (!b) return;
  const built = sectState.buildings[key] || 0;
  const cost = b.costFunc ? b.costFunc(built + 1) : b.cost;
  const waterCost = b.costWaterFunc ? b.costWaterFunc(built + 1) : 0;
  const nectarCost = b.costNectarFunc ? b.costNectarFunc(built + 1) : 0;
  if (sectState.softwood < cost) return;
  if (sectSystem.orbs.water.current < waterCost) return;
  if (sectState.undeadNectar < nectarCost) return;
  if (built >= b.max) return;
  if (b.requires && sectState.buildings[b.requires] < b.max) return;
  if (key === 'chantingHall' && !systems.chantingHallUnlocked) return;
  if (key === 'orbSpellStrength' && !systems.spellStrengthUnlocked) return;
  if (key === 'metamorphRoom' && !systems.metamorphBuildingAvailable) return;
  sectState.softwood -= cost;
  if (nectarCost) sectState.undeadNectar -= nectarCost;
  if (waterCost) sectSystem.orbs.water.current -= waterCost;
  sectState.buildings[key] = built + 1;
  if (key === 'bohio') {
    sectState.maxDisciples = 3 + sectState.buildings.bohio;
    sectState.housingBonus = 0.05 * Math.floor(sectState.buildings.bohio / 10);
    updateResourceCaps();
    if (sectState.buildings.bohio >= 1) {
      const shack = document.getElementById('sectBohio');
      if (shack) shack.style.display = 'block';
    }
  }
  if (key === 'researchDesk' && !systems.researchUnlocked) {
    systems.researchUnlocked = true;
  }
  if (key === 'areitoCircle' && !systems.transmutationUnlocked) {
    systems.transmutationUnlocked = true;
  }
  if (key === 'metamorphRoom') {
    sectState.metamorphRooms = sectState.buildings.metamorphRoom;
  }
  if (typeof globalThis.updateBuildOverlay === 'function') {
    globalThis.updateBuildOverlay();
  }
}
