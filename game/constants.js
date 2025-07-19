// Centralized configuration values used across the game

export const BASE_STATS = {
  combatSlots: 3,
  maxMana: 0,
  mana: 0,
  manaRegen: 0,
  avgCombatLevel: 0,
  avgProficiencyLevel: 0
};

export const HUNT_CYCLE_SECONDS = 200;
export const HUNT_XP_PER_SUCCESS = 30;
export const ANIMALS = [
  { name: 'Chicken', level: 1, yield: 3, spawnRate: 0.8, max: 5 },
  { name: 'Boar', level: 3, yield: 7, spawnRate: 0.4, max: 3 },
  { name: 'Deer', level: 5, yield: 10, spawnRate: 0.2, max: 2 }
];
export const SOFTWOOD_CYCLE_SECONDS = 215;
export const SOFTWOOD_CYCLE_AMOUNT = 10;
export const DAILY_FRUIT_CONSUMPTION = 20; // fruits eaten by each disciple per day

export const FRUIT_XP_PER_CYCLE = 1; // 0.005 XP/s × 200s
export const LOG_XP_PER_CYCLE = 1; // 0.0047 XP/s × 215s ≈ 1
export const BUILD_XP_RATE = 1; // per second
export const RESEARCH_XP_PER_CYCLE = 1; // 0.008 XP/s × ~125s ≈ 1
export const CHANT_XP_PER_CYCLE = 1.665; // 0.333 XP/s × 5s
export const EXPLORATION_CYCLE_SECONDS = 150;
export const STAMINA_DRAIN_PER_EXPLORATION = 1;
export const DISCIPLE_MAX_HEALTH = 10;
export const REST_TIME_SECONDS = 300; // health fully restored over 5 minutes

export const GATHER_WORK_SECONDS = 120; // WorkDuration per slot
export const MIN_TRAVEL_SECONDS = 1; // minimum travel/haul time
export const TRAVEL_SECONDS_PER_UNIT = 5; // seconds per travel distance unit

export const GATHER_SPOTS = {
  'Gather Fruit': { baseYield: 0.1038, travel: 0 }, // Berry Bush
  'Gather Softwood': { baseYield: 0.09, travel: 0.5 } // Scrubland Trees
};

export const TASK_ICONS = {
  'Gather Fruit': '🍎',
  'Gather Softwood': '🪵',
  Hunt: '🏹',
  Building: '⚒️',
  Research: '🔬',
  Chant: '🎶',
  Exploration: '🧭',
  Idle: '💤',
  Resting: '🛌'
};

export const TASK_GROUPS = {
  'Gather Fruit': 'Gathering',
  'Gather Softwood': 'Logging',
  Hunt: 'Hunting',
  'Building': 'Building',
  'Research': 'Researching',
  'Chant': 'Chanting',
  'Exploration': 'Exploration',
  Idle: 'Idle',
  Resting: 'Idle'
};

export const ATTRIBUTE_FOR_GROUP = {
  Gathering: 'dexterity',
  Logging: 'strength',
  Hunting: 'dexterity',
  Building: 'endurance',
  Researching: 'intelligence',
  Chanting: 'intelligence',
  Exploration: 'dexterity',
  Idle: null
};

export const LOCATION_DEFS = [
  { name: 'Firewood Grove', reqDistance: 100, baseChance: 0.2, x: '30%', y: '70%' },
  { name: 'Crystal Cavern', reqDistance: 300, baseChance: 0.15, x: '70%', y: '40%' },
  { name: 'Esoteric Dungeon', reqDistance: 100, baseChance: 1.0, x: '50%', y: '20%' },
  { name: 'Ancient Ruins', reqDistance: 800, baseChance: 0.05, x: '80%', y: '10%' }
];
