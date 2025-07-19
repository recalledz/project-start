import RateTracker from '../utils/rateTracker.js';
import { BossTemplates } from '../boss.js';

export let isDarkenshift = false;
export function setIsDarkenshift(val) {
  isDarkenshift = val;
}

export const lifeCore = { real: false };

export const WORLD_PROGRESS_TARGET = 1820;
export const worldProgress = {};
Object.keys(BossTemplates).forEach(id => {
  worldProgress[id] = {
    unlocked: parseInt(id) === 1,
    bossDefeated: false,
    rewardClaimed: false,
    level: 1,
    progress: 0,
    progressTarget: WORLD_PROGRESS_TARGET
  };
});

export const playerStats = {
  timesPrestiged: 0,
  totalBossKills: 0,
  stageKills: {},
  speakerEncounters: 0,
  hasDied: false
};

export let gamePaused = false;
export function setGamePaused(val) {
  gamePaused = val;
}

export let campOverlayOpen = false;
export function setCampOverlayOpen(val) {
  campOverlayOpen = val;
}

export let campOverlay = null;
export function setCampOverlay(val) {
  campOverlay = val;
}

export let inCombat = false;
export function setInCombat(val) {
  inCombat = val;
}

export let speakerOverlay = null;
export function setSpeakerOverlay(val) {
  speakerOverlay = val;
}

export let worldProgressTimer = 0;
export function setWorldProgressTimer(val) {
  worldProgressTimer = val;
}

export const worldProgressRateTracker = new RateTracker(30000);

export let currentEnemy = null;
export function setCurrentEnemy(val) {
  currentEnemy = val;
}

export const stats = {
  combatSlots: 3,
  avgCombatLevel: 0,
  avgProficiencyLevel: 0

};

export const systems = {
  buildingUnlocked: false,
  researchUnlocked: false,
  chantingHallUnlocked: false,
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
  discipleMetamorphosis: {},
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
