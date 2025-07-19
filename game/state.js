import { attributes } from '../attributes.js';

export let currentEnemy = null;
export function setCurrentEnemy(val) {
  currentEnemy = val;
}

export const stats = {
  combatSlots: 3,
  avgCombatLevel: 0,
  avgProficiencyLevel: 0

};
stats.combatSlots = stats.combatSlots + attributes.Strength.inventorySlots;

export const systems = {
  buildingUnlocked: false,
  researchUnlocked: false,
  chantingHallUnlocked: false,
  voiceOfThePeople: false,
  explorationUnlocked: false
};

// Fruit gathering and growth configuration
export const FRUIT_MAX_CAP = 120;
export const FRUIT_GROWTH_RATES = [60, 40, 30, 20, 0];

export const sectState = {
  fruits: 0,
  softwood: 0,
  availableFruits: FRUIT_MAX_CAP,
  animals: { Chicken: 3, Boar: 1, Deer: 0 },
  discipleTasks: {},
  taskTimers: { gatherFruits: 0 },
  discipleProgress: {},
  discipleSkills: {},
  discipleConstructXp: {},
  chantAssignments: {},
  discipleRest: {},
  maxDisciples: 3,
  housingBonus: 0,
  buildings: { bohio: 0, researchDesk: 0, chantingHall: 0 },
  researchPoints: 0,
  researchProgress: 0,
  currentBuild: null,
  buildProgress: 0
};

export let stageData = {
  world: 1,
  stage: 1,
  dealerLifeMax: 10,
  dealerLifeCurrent: 10,
  stageDamageMultiplier: 1.05,
  kills: 0,
  playerXp: 1,
  attackspeed: 10000
};

export const FAST_MODE_SCALE = 10;
export let timeScale = 1;
export function setTimeScale(value) {
  timeScale = value;
}
