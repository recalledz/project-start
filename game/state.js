import { attributes } from '../attributes.js';

export let currentEnemy = null;
export function setCurrentEnemy(val) {
  currentEnemy = val;
}

export const stats = {
  upgradePower: 0,
  pDamage: 0,
  pRegen: 0,
  damageMultiplier: 1,
  upgradeDamageMultiplier: 1,
  cardSlots: 3,
  attackSpeed: 10000,
  hpPerKill: 1,
  avgCombatLevel: 0,
  avgProficiencyLevel: 0,
  baseCardHpBoost: 0,
  maxMana: 0,
  mana: 0,
  manaRegen: 0,
  healOnRedraw: 0,
  abilityPower: 1,
  spadeDamageMultiplier: 1,
  playerShield: 0,
  abilityCooldownReduction: 0,
  jokerCooldownReduction: 0,
  redrawCooldownReduction: 0,
  hpMultiplier: 1,
  extraDamageMultiplier: 1,
  damageBuffMultiplier: 1,
  damageBuffExpiration: 0
};
stats.cardSlots = stats.cardSlots + attributes.Strength.inventorySlots;

export const systems = {
  manaUnlocked: false,
  buildingUnlocked: false,
  researchUnlocked: false,
  chantingHallUnlocked: false,
  voiceOfThePeople: false,
  explorationUnlocked: false
};

export const sectState = {
  fruits: 0,
  softwood: 0,
  availableFruits: 120,
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
  cardXp: 1,
  playerXp: 1,
  attackspeed: 10000
};

export const FAST_MODE_SCALE = 10;
export let timeScale = 1;
export function setTimeScale(value) {
  timeScale = value;
}
