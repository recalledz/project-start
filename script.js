// Core modules that power the card game
import generateDeck, {
  shuffleArray,
  Card,
  recalcCardHp,
  updateAllCardHp
} from "./card.js"; // card utilities
import addLog from "./log.js"; // helper for appending to the event log
import Enemy from "./enemy.js"; // base enemy class
import {
  Boss,
  BossTemplates
} from "./boss.js"; // boss definitions
import {
  AbilityRegistry
} from "./dealerabilities.js"; // boss ability registry
import {
  AllJokerTemplates
} from "./jokerTemplates.js"; // collectible jokers
import {
  initStarChart
} from "./starChart.js"; // optional star chart tab
import { initSpeech, tickSpeech, speechState, DAY_LENGTH_SECONDS } from "./speech.js";
import { Jobs, assignJob, getAvailableJobs, renderJobAssignments, renderJobCarousel } from "./jobs.js"; // job definitions
import RateTracker from "./utils/rateTracker.js";
import { formatNumber } from "./utils/numberFormat.js";
import { runAnimation } from "./utils/animation.js";
import { initCore, refreshCore } from './core.js';
import { attributes, strengthXpMultiplier } from './attributes.js';
import { createOverlay } from './ui/overlay.js';
import { showRestartScreen } from './ui/restartOverlay.js';
import { calculateKillXp, XP_EFFICIENCY } from './utils/xp.js';
import {
  rollNewCardUpgrades,
  applyCardUpgrade,
  renderCardUpgrades,
  unlockCardUpgrade,
  createUpgradeCard,
  getCardUpgradeCost,
  cardUpgradeDefinitions,
  upgrades,
  upgradeLevels as cardUpgradeLevels,
  removeActiveUpgrade,
  resetCardUpgrades
} from "./cardUpgrades.js";
import {
  // calculateEnemyHp,
  calculateEnemyBasicDamage,
  spawnDealer,
  spawnBoss,
  spawnEnemy
} from "./enemySpawning.js";
import {
  renderCard,
  renderDiscardCard,
  renderDealerLifeBar,
  renderEnemyAttackBar,
  renderPlayerAttackBar,
  renderDealerLifeBarFill,
  applyBloodSplat,
  removeBloodSplat,
  updateBloodSplat
} from "./rendering.js";
import { drawCard, redrawHand } from "./cardManagement.js";
import {
  deckMastery,
  deckConfigs,
  selectedDeck,
  addDeckMasteryProgress,
  getDeckMasteryInfo,
  renderDeckList,
  renderDeckCards,
  renderJokerView,
  renderJobsList,
  showJobs
} from "./deck.js";


// --- Game State ---
// `drawnCards` holds the cards currently in the player's hand
let drawnCards = [];
// cards discarded from play land in `discardPile`
let discardPile = [];
// mapping of card back styles
const cardBackImages = {
  "basic-red": "img/basic deck.png"
};
// theme state
let isDarkenshift = false;
// resources and progress trackers
let cash = 0;
let chips = 0;
let cardPoints = 0;
// Track how many card points have already been converted to cash
let lastCashOutPoints = 0;
let currentEnemy = null;

function spendCash(amount) {
  const amt = Math.min(amount, cash);
  cash -= amt;
  if (cashDisplay) cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  recordCashRates(cash);
  updateUpgradeButtons();
  return amt;
}

function updateChipsDisplay() {
  if (chipsDisplay) chipsDisplay.textContent = `Chips: ${formatNumber(chips)}`;
}

function computeChipReward() {
  return Math.floor((1 + Math.pow(stageData.stage, 0.5)) * stats.cashMulti);
}

// track how many upgrade power points have been bought total
let upgradePowerPurchased = 0;

function upgradePowerCost() {
  return Math.floor(50 * Math.pow(1.5, upgradePowerPurchased));
}

// Base player stats used for resets
const BASE_STATS = {
  points: 0,
  upgradePower: 0,
  pDamage: 0,
  pRegen: 0,
  cashMulti: 1,
  damageMultiplier: 1,
  upgradeDamageMultiplier: 1,
  cardSlots: 3,
  //at start max
  attackSpeed: 10000,
  //ms between automatic attacks
  hpPerKill: 1,
  baseCardHpBoost: 0,
  maxMana: 0,
  mana: 0,
  manaRegen: 0,
  //maxSanity: 100,
  //sanity: 100,
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
  damageBuffExpiration: 0,
  cashOutWithoutRedraw: false
};

// Persistent player stats affecting combat and rewards
const stats = { ...BASE_STATS };
stats.cardSlots = BASE_STATS.cardSlots + attributes.Strength.inventorySlots;

const systems = {
  manaUnlocked: false,
  buildingUnlocked: false,
  researchUnlocked: false,
  chantingHallUnlocked: false
};

export const sectState = {
  fruits: 0,
  pineLogs: 0,
  discipleTasks: {}, // map disciple id -> current task
  taskTimers: { gatherFruits: 0 },
  discipleProgress: {}, // map disciple id -> progress seconds in current cycle
  discipleSkills: {}, // map disciple id -> skill levels per task
  buildings: { pineShack: 0, researchTable: 0, chantingHall: 0 },
  researchPoints: 0,
  researchProgress: 0,
  currentBuild: null,
  buildProgress: 0
};

// Each disciple can gather fruit three times per day.
// Seconds per cycle is 200, so disciples repeat the cycle every ~3.3 minutes.
const FRUIT_CYCLE_SECONDS = 200;
const FRUIT_CYCLE_AMOUNT = 10;
const PINE_LOG_CYCLE_SECONDS = 215;
const PINE_LOG_CYCLE_AMOUNT = 10;

// XP progression for disciple tasks
function taskXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

function getTaskSkillProgress(xp) {
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


const BUILDINGS = {
  pineShack: { name: 'Pine Shack', cost: 30, time: 600, max: 1 },
  researchTable: { name: 'Research Table', cost: 15, time: 300, max: 1, requires: 'pineShack' },
  chantingHall: { name: 'Chanting Hall', cost: 50, time: 600, max: 1, requires: 'researchTable' }
};

const lifeCore = { real: false };

const barUpgrades = {
  damage: { level: 0, progress: 0, points: 0, multiplier: 1 },
  maxHp: { level: 0, progress: 0, points: 0, multiplier: 1 }
};

// Card HP adjustments moved to card.js utilities

function computeBarMultiplier(level) {
  return 1 + (level / (level + 20)) * 9;
}

// progress gained per second for each point invested in a bar
const BAR_PROGRESS_RATE = 0.1;

// Data for the current stage and world progression
let stageData = {
  world: 1,
  stage: 1,
  dealerLifeMax: 10,
  dealerLifeCurrent: 10,
  stageDamageMultiplier: 1.05,
  kills: 0,
  cardXp: 1,
  playerXp: 1,
  attackspeed: 10000 //10 sec at start
};

const STAGE_KILL_REQUIREMENT = 10;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 22;

const xpEfficiency = XP_EFFICIENCY;

let speakerEncounterPending = false;

// Weight a kill's contribution toward world completion based on the stage
// Lower stages contribute less while stages beyond 10 scale slowly upward
function stageWeight(stage) {
  return stage <= 10 ? stage : 10 + Math.sqrt(stage - 10);
}

// Total weighted kills needed for a world to be considered "complete"
const WORLD_PROGRESS_TARGET = 1820; // base requirement for level 1

const worldProgress = {};
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

function checkSpeakerEncounter() {
  if (playerStats.speakerEncounters === 0 && stageData.stage >= 5 && !playerStats.hasDied) {
    speakerEncounterPending = true;
  } else if (playerStats.speakerEncounters === 1 && worldProgress[stageData.world].bossDefeated) {
    speakerEncounterPending = true;
  } else if (playerStats.speakerEncounters === 2 && playerStats.hasDied) {
    speakerEncounterPending = true;
  }
}


const playerStats = {
  timesPrestiged: 0,
  decksUnlocked: 1,
  totalBossKills: 0,
  stageKills: {},
  speakerEncounters: 0,
  hasDied: false
};

// Debug time scaling
const FAST_MODE_SCALE = 10;
let timeScale = 1;

// Definitions for purchasable upgrades and their effects are
// centralized in cardUpgrades.js

// Utility to colorize the enemy icon based on stage level
function getDealerIconStyle(stage) {
  const capped = Math.max(1, Math.min(10, stage));
  const t = (capped - 1) / 9; // 0 → 1
  const saturation = 30 + t * 70; // 30% → 100%
  const lightness = 55 - t * 35; // 55% → 20%
  const color = `hsl(0, ${saturation}%, ${lightness}%)`;
  const blur = 1 + t * 4; // 1px → 5px
  return {
    color,
    blur
  };
}

let pDeck = generateDeck();
let deck = [...pDeck];
deckConfigs.basic.cards = pDeck;

// Helper bound functions for card utilities
const recalcAllCardHp = () => updateAllCardHp(pDeck, stats, barUpgrades);

function getCardState() {
  return {
    deck,
    drawnCards,
    discardPile,
    discardContainer,
    cardBackImages,
    handContainer,
    renderCard: card => renderCard(card, handContainer),
    updateDeckDisplay,
    renderDiscardCard,
    renderDeckTop,
    updatePileCounts,
    stats,
    showUpgradePopup,
    applyCardUpgrade,
    renderCardUpgrades,
    purchaseCardUpgrade,
    cash,
    renderPurchasedUpgrades,
    updateActiveEffects,
    updateAllCardHp: recalcAllCardHp,
    updateHandDisplay,
    pDeck,
    shuffleArray,
    updateDrawButton,
    updatePlayerStats,
    drawCard, // will be replaced after definition
  };
}

const nextStageArea = document.getElementById("nextStageArea");
const nextStageProgress = document.getElementById("nextStageProgress");
//const moveForwardBtn = document.getElementById("moveForwardBtn");
const fightBossBtn = document.getElementById("fightBossBtn");
const bossProgress = document.getElementById("bossProgress");
const campBtn = document.getElementById("campBtn");
const pointsDisplay = document.getElementById("pointsDisplay");
const cashDisplay = document.getElementById("cashDisplay");
const chipsDisplay = document.getElementById("chipsDisplay");
const cardPointsDisplay = document.getElementById("cardPointsDisplay");
const handContainer = document.getElementsByClassName("handContainer")[0];
const discardContainer = document.getElementsByClassName("discardContainer")[0];
const deckContainer = document.getElementsByClassName("deckContainer")[0];
const deckCountDisplay = document.getElementById("deckCount");
const discardCountDisplay = document.getElementById("discardCount");
const dealerLifeDisplay =
document.getElementsByClassName("dealerLifeDisplay")[0];
const killsDisplay = document.getElementById("kills");
const worldProgressPerSecDisplay = document.getElementById("worldProgressPerSecDisplay");
const deckListContainer = document.querySelector('.deckListContainer');
const deckTabContainer = document.querySelector('.deckTabContainer');
const jokerViewContainer = document.querySelector('.jokerViewContainer');
const deckJobsContainer = document.querySelector('.deckJobsContainer');
const jobCarouselContainer = document.querySelector('.jobCarouselContainer');
const dCardContainer = document.getElementsByClassName("dCardContainer")[0];
const dealerContainer = document.querySelector('.dealerContainer');
const jokerContainers = document.querySelectorAll(".jokerContainer");
const manaBar = document.getElementById("manaBar");
const manaFill = document.getElementById("manaFill");
const manaText = document.getElementById("manaText");
//const stageProgressFill = document.getElementById("stageProgressFill");
//const stageProgressBar = document.getElementById("stageProgressBar");
//const insanityMessages = [
//  "You feel watched.",
//  "The walls bend inward.",
//  "Thoughts scatter like crows..."
//];
//let insanityMsgIndex = 0;
//let lastInsanityMsg = 0;
//let lowSanityOverlayShown = false;
const manaRegenDisplay = document.getElementById("manaRegenDisplay");
const dpsDisplay = document.getElementById("dpsDisplay");

function showPlayerAttackBar() {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'block';
}

function hidePlayerAttackBar() {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'none';
  if (playerAttackFill) playerAttackFill.style.width = '0%';
  playerAttackTimer = 0;
}

//function hideStageProgressBar() {
//  if (stageProgressBar) stageProgressBar.style.display = "none";
//}

//function showStageProgressBar() {
//  if (stageProgressBar) stageProgressBar.style.display = "block";
//}

const unlockedJokers = [];

// attack progress bars
let playerAttackFill = null;
let enemyAttackFill = null;
let playerAttackTimer = 0;
let enemyAttackProgress = 0; // carryover ratio of enemy attack timer
let cashTimer = 0;
let worldProgressTimer = 0;
//let sanityTimer = 0;
const cashRateTracker = new RateTracker(10000);
const cashRateTracker1h = new RateTracker(3600000);
const cashRateTracker24h = new RateTracker(86400000);
const worldProgressRateTracker = new RateTracker(30000);

function recordCashRates(value) {
  cashRateTracker.record(value);
  cashRateTracker1h.record(value);
  cashRateTracker24h.record(value);
}

function resetCashRates(value = 0) {
  cashRateTracker.reset(value);
  cashRateTracker1h.reset(value);
  cashRateTracker24h.reset(value);
}
// Chance to trigger a random event each step of movement
// Reduced from 30% to 10% so encounters feel more like rare discoveries
const EVENT_CHANCE = 0.1;

// Load saved state when DOM is ready
window.addEventListener("beforeunload", saveGame);
const saveInterval = setInterval(saveGame, 30000);


//=========tabs==========

let mainTabButton;
let deckTabButton;
let starChartTabButton;
let playerStatsTabButton;
let worldSubTabButton;
let cardSubTabButton;
let playerTabButton;
let locationTabButton;
let mainTab;
let cardSubTab;
let deckTab;
let starChartTab;
let playerStatsTab;
let worldsTab;
let playerTab;
let locationTab;
let locationListContainer;
let purchasedUpgradeList;
let activeEffectsContainer;
let tooltip;
let deckViewBtn;
let jokerViewBtn;
let deckUpgradesViewBtn;
let deckUpgradesContainer;
let playerCoreSubTabButton;
let playerCorePanel;
let playerSpeechSubTabButton;
let playerSpeechPanel;
let playerLexiconSubTabButton;
let playerLexiconPanel;
let playerSectPanel;
let sectDisciplesDisplay;
let sectResourcesDisplay;
let sectUpkeepDisplay;
let colonyTasksPanel;
let colonyInfoPanel;
let colonyResourcesPanel;
let colonyBuildPanel;
let colonyResearchPanel;
let colonyTasksTabButton;
let colonyInfoTabButton;
let colonyResourcesTabButton;
let colonyBuildTabButton;
let colonyResearchTabButton;
let sectDisciplesContainer;
let selectedDiscipleId = null;
const sectDiscipleEls = {};
const discipleGatherPhase = {};
let discipleMoveInterval;
let sectTabUnlocked = false;
let statsOverviewSubTabButton;
let statsEconomySubTabButton;
let statsOverviewContainer;
let statsEconomyContainer;
let jobsViewBtn;
let jobsCarouselBtn;
const discoveredLocations = [];

function setActiveTabButton(btn) {
  document.querySelectorAll('.tabsContainer button').forEach(b => {
    b.classList.toggle('active', b === btn);
  });
}

function addDiscoveredLocation(name) {
  if (discoveredLocations.includes(name)) return;
  discoveredLocations.push(name);
  if (locationListContainer) {
    const row = document.createElement('div');
    row.textContent = name;
    locationListContainer.appendChild(row);
  }
  if (locationTabButton && locationTabButton.style.display === 'none') {
    locationTabButton.style.display = '';
  }
}

function setupTabHandlers() {
  const tabHandlers = [
    {
      buttonSelector: '.mainTabButton',
      onClick: () => {
        showTab(mainTab);
        setActiveTabButton(mainTabButton);
      }
    },
    {
      buttonSelector: '.deckTabButton',
      onClick: () => {
        showTab(deckTab);
        setActiveTabButton(deckTabButton);
        showDeckListView();
      }
    },
    {
      buttonSelector: '.starChartTabButton',
      onClick: () => {
        initStarChart();
        showTab(starChartTab);
        setActiveTabButton(starChartTabButton);
      }
    },
    {
      buttonSelector: '.playerStatsTabButton',
      onClick: () => {
        renderGlobalStats();
        showTab(playerStatsTab);
        setActiveTabButton(playerStatsTabButton);
      }
    },
    {
      buttonSelector: '.playerTabButton',
      onClick: () => {
        refreshCore();
        showTab(playerTab);
        setActiveTabButton(playerTabButton);
        if (playerSpeechSubTabButton) playerSpeechSubTabButton.click();
      }
    },
    {
      buttonSelector: '.locationTabButton',
      onClick: () => {
        showTab(locationTab);
        setActiveTabButton(locationTabButton);
      }
    }
  ];

  tabHandlers.forEach(({ buttonSelector, onClick }) => {
    const btn = document.querySelector(buttonSelector);
    if (btn) btn.addEventListener('click', onClick);
  });
}

function applyWorldTheme() {
  if (mainTab) {
    mainTab.classList.toggle("world-2-theme", stageData.world === 2);
  }
}

function selectWorld(id) {
  const w = parseInt(id);
  if (!isNaN(w)) {
    stageData.world = w;
    stageData.stage = 1;
    applyWorldTheme();
    renderStageInfo();
    respawnDealerStage();
    showTab(mainTab);
  }
}

function hideTab() {
  if (mainTab) mainTab.style.display = "none";
  if (deckTab) deckTab.style.display = "none";
  if (starChartTab) starChartTab.style.display = "none";
  if (playerStatsTab) playerStatsTab.style.display = "none";
  if (worldsTab) worldsTab.style.display = "none";
  if (playerTab) playerTab.style.display = "none";
  if (locationTab) locationTab.style.display = "none";
}

function showTab(tab) {
  hideTab();
  // Reset display so CSS controls layout
  if (tab) tab.style.display = "";
}

function showColonyTab(name) {
  if (!colonyTasksPanel || !colonyInfoPanel || !colonyResourcesPanel || !colonyBuildPanel) return;
  if (name === 'tasks') {
    colonyTasksPanel.style.display = 'flex';
    colonyInfoPanel.style.display = 'flex';
    colonyResourcesPanel.style.display = 'none';
    colonyBuildPanel.style.display = 'none';
    if (colonyResearchPanel) colonyResearchPanel.style.display = 'none';
    if (colonyTasksTabButton) colonyTasksTabButton.classList.add('active');
    if (colonyInfoTabButton) colonyInfoTabButton.classList.remove('active');
    if (colonyResourcesTabButton) colonyResourcesTabButton.classList.remove('active');
    if (colonyBuildTabButton) colonyBuildTabButton.classList.remove('active');
    if (colonyResearchTabButton) colonyResearchTabButton.classList.remove('active');
  } else if (name === 'info') {
    colonyTasksPanel.style.display = 'none';
    colonyInfoPanel.style.display = 'flex';
    colonyResourcesPanel.style.display = 'flex';
    colonyBuildPanel.style.display = 'none';
    if (colonyResearchPanel) colonyResearchPanel.style.display = 'none';
    renderDiscipleList();
    renderDiscipleDetails();
    if (colonyTasksTabButton) colonyTasksTabButton.classList.remove('active');
    if (colonyInfoTabButton) colonyInfoTabButton.classList.add('active');
    if (colonyResourcesTabButton) colonyResourcesTabButton.classList.remove('active');
    if (colonyBuildTabButton) colonyBuildTabButton.classList.remove('active');
    if (colonyResearchTabButton) colonyResearchTabButton.classList.remove('active');
  } else if (name === 'resources') {
    colonyTasksPanel.style.display = 'none';
    colonyInfoPanel.style.display = 'none';
    colonyResourcesPanel.style.display = 'flex';
    colonyBuildPanel.style.display = 'none';
    if (colonyResearchPanel) colonyResearchPanel.style.display = 'none';
    renderColonyResources();
    if (colonyTasksTabButton) colonyTasksTabButton.classList.remove('active');
    if (colonyInfoTabButton) colonyInfoTabButton.classList.remove('active');
    if (colonyResourcesTabButton) colonyResourcesTabButton.classList.add('active');
    if (colonyBuildTabButton) colonyBuildTabButton.classList.remove('active');
    if (colonyResearchTabButton) colonyResearchTabButton.classList.remove('active');
  } else if (name === 'build') {
    colonyTasksPanel.style.display = 'none';
    colonyInfoPanel.style.display = 'none';
    colonyResourcesPanel.style.display = 'none';
    colonyBuildPanel.style.display = 'flex';
    renderColonyBuildPanel();
    if (colonyTasksTabButton) colonyTasksTabButton.classList.remove('active');
    if (colonyInfoTabButton) colonyInfoTabButton.classList.remove('active');
    if (colonyResourcesTabButton) colonyResourcesTabButton.classList.remove('active');
    if (colonyBuildTabButton) colonyBuildTabButton.classList.add('active');
    if (colonyResearchTabButton) colonyResearchTabButton.classList.remove('active');
  } else if (name === 'research') {
    colonyTasksPanel.style.display = 'none';
    colonyInfoPanel.style.display = 'none';
    colonyResourcesPanel.style.display = 'none';
    colonyBuildPanel.style.display = 'none';
    if (colonyResearchPanel) {
      colonyResearchPanel.style.display = 'flex';
      renderColonyResearchPanel();
    }
    if (colonyTasksTabButton) colonyTasksTabButton.classList.remove('active');
    if (colonyInfoTabButton) colonyInfoTabButton.classList.remove('active');
    if (colonyResourcesTabButton) colonyResourcesTabButton.classList.remove('active');
    if (colonyBuildTabButton) colonyBuildTabButton.classList.remove('active');
    if (colonyResearchTabButton) colonyResearchTabButton.classList.add('active');
  }
}


function initTabs() {
  if (typeof document === 'undefined') return;

  mainTabButton = document.querySelector('.mainTabButton');
  deckTabButton = document.querySelector('.deckTabButton');
  starChartTabButton = document.querySelector('.starChartTabButton');
  playerStatsTabButton = document.querySelector('.playerStatsTabButton');
  cardSubTabButton = document.querySelector('.cardSubTabButton');
  worldSubTabButton = document.querySelector('.worldSubTabButton');
  playerTabButton = document.querySelector('.playerTabButton');
  locationTabButton = document.querySelector('.locationTabButton');
  mainTab = document.querySelector('.mainTab');
  cardSubTab = document.querySelector('.cardSubTab');
  deckTab = document.querySelector('.deckTab');
  starChartTab = document.querySelector('.starChartTab');
  playerStatsTab = document.querySelector('.playerStatsTab');
  worldsTab = document.querySelector('.worldsTab');
  playerTab = document.querySelector('.playerTab');
  locationTab = document.querySelector('.locationTab');
  locationListContainer = document.querySelector('.location-list');
  purchasedUpgradeList = document.querySelector('.purchased-upgrade-list');
  activeEffectsContainer = document.querySelector('.active-effects');
  tooltip = document.getElementById('tooltip');
  deckViewBtn = document.querySelector('.deckViewBtn');
  jokerViewBtn = document.querySelector('.jokerViewBtn');
  deckUpgradesViewBtn = document.querySelector('.deckUpgradesViewBtn');
  deckUpgradesContainer = document.querySelector('.deckUpgradesContainer');
  jobsViewBtn = document.querySelector('.jobsViewBtn');
  jobsCarouselBtn = document.querySelector('.jobsCarouselBtn');
  playerCoreSubTabButton = document.querySelector(".playerCoreSubTabButton");
  playerCorePanel = document.querySelector(".player-core-panel");
  playerSpeechSubTabButton = document.querySelector('.playerSpeechSubTabButton');
  playerSpeechPanel = document.querySelector('.player-speech-panel');
  playerLexiconSubTabButton = document.querySelector('.playerLexiconSubTabButton');
  playerLexiconPanel = document.querySelector('.player-lexicon-panel');
  playerSectPanel = document.querySelector('.player-sect-panel');
  sectDisciplesDisplay = document.getElementById('sectDisciples');
  sectResourcesDisplay = document.getElementById('sectResources');
  sectUpkeepDisplay = document.getElementById('sectUpkeep');
  sectDisciplesContainer = document.getElementById('sectDisciplesContainer');
  colonyTasksPanel = document.getElementById('colonyTasksPanel');
  colonyInfoPanel = document.getElementById('colonyInfoPanel');
  colonyResourcesPanel = document.getElementById('colonyResourcesPanel');
  colonyBuildPanel = document.getElementById('colonyBuildPanel');
  colonyResearchPanel = document.getElementById('colonyResearchPanel');
  colonyTasksTabButton = document.getElementById('colonyTasksTabBtn');
  colonyInfoTabButton = document.getElementById('colonyInfoTabBtn');
  colonyResourcesTabButton = document.getElementById('colonyResourcesTabBtn');
  colonyBuildTabButton = document.getElementById('colonyBuildTabBtn');
  colonyResearchTabButton = document.getElementById('colonyResearchTabBtn');
  statsOverviewSubTabButton = document.querySelector('.statsOverviewSubTabButton');
  statsEconomySubTabButton = document.querySelector('.statsEconomySubTabButton');
  statsOverviewContainer = document.getElementById('statsOverviewContainer');
  statsEconomyContainer = document.getElementById('statsEconomyContainer');
  if (colonyBuildTabButton) colonyBuildTabButton.style.display = systems.buildingUnlocked ? '' : 'none';
  if (colonyResearchTabButton) colonyResearchTabButton.style.display = systems.researchUnlocked ? '' : 'none';
  setupTabHandlers();

  if (colonyTasksTabButton) colonyTasksTabButton.addEventListener('click', () => showColonyTab('tasks'));
  if (colonyInfoTabButton) colonyInfoTabButton.addEventListener('click', () => showColonyTab('info'));
  if (colonyResourcesTabButton) colonyResourcesTabButton.addEventListener('click', () => showColonyTab('resources'));
  if (colonyBuildTabButton) colonyBuildTabButton.addEventListener('click', () => showColonyTab('build'));
  if (colonyResearchTabButton) colonyResearchTabButton.addEventListener('click', () => showColonyTab('research'));


  if (worldSubTabButton) {
    worldSubTabButton.addEventListener("click", () => {
      renderWorldsMenu();
      if (cardSubTab) cardSubTab.style.display = "none";
      if (worldsTab) worldsTab.style.display = "";
      worldSubTabButton.classList.add("active");
      if (cardSubTabButton) cardSubTabButton.classList.remove("active");
    });
  }
  if (cardSubTabButton) {
    cardSubTabButton.addEventListener("click", () => {
      if (worldsTab) worldsTab.style.display = "none";
      if (cardSubTab) cardSubTab.style.display = "";
      cardSubTabButton.classList.add("active");
      if (worldSubTabButton) worldSubTabButton.classList.remove("active");
    });
  }


  if (deckViewBtn) deckViewBtn.addEventListener('click', showDeckListView);
  if (jokerViewBtn) jokerViewBtn.addEventListener('click', showJokerView);
  if (jobsViewBtn) jobsViewBtn.addEventListener('click', () => {
    showJobsView();
    renderJobAssignments(deckJobsContainer, pDeck);
  });
  if (jobsCarouselBtn) jobsCarouselBtn.addEventListener('click', () => {
    showJobCarouselView();
    renderJobCarousel(jobCarouselContainer);
  });
  if (deckListContainer)
    deckListContainer.addEventListener('deck-selected', e => {
      showDeckCardsView(e.detail.id);
    });

  if (deckUpgradesViewBtn)
    deckUpgradesViewBtn.addEventListener('click', () => {
      hideDeckViews();
      if (deckUpgradesContainer) {
        renderPurchasedUpgrades();
        deckUpgradesContainer.style.display = 'flex';
      }
    });
  if (playerCoreSubTabButton)
    playerCoreSubTabButton.addEventListener("click", () => {
      if (playerCorePanel) playerCorePanel.style.display = "flex";
      if (playerSpeechPanel) playerSpeechPanel.style.display = "none";
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
      if (playerSectPanel) playerSectPanel.style.display = 'none';
      playerCoreSubTabButton.classList.add("active");
      if (playerSpeechSubTabButton) playerSpeechSubTabButton.classList.remove("active");
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.classList.remove('active');
    });
  if (playerSpeechSubTabButton)
    playerSpeechSubTabButton.addEventListener('click', () => {
      if (playerCorePanel) playerCorePanel.style.display = 'none';
      if (playerSpeechPanel) playerSpeechPanel.style.display = 'flex';
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
      if (playerSectPanel) playerSectPanel.style.display = 'none';
      playerSpeechSubTabButton.classList.add('active');
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove('active');
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.classList.remove('active');
    });
  if (playerLexiconSubTabButton)
    playerLexiconSubTabButton.addEventListener('click', () => {
      if (playerCorePanel) playerCorePanel.style.display = 'none';
      if (playerSpeechPanel) playerSpeechPanel.style.display = 'none';
      if (sectTabUnlocked) {
        if (playerSectPanel) playerSectPanel.style.display = 'flex';
        if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
        startDiscipleMovement();
      } else {
        if (playerLexiconPanel) playerLexiconPanel.style.display = 'flex';
        if (playerSectPanel) playerSectPanel.style.display = 'none';
      }
      playerLexiconSubTabButton.classList.add('active');
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove('active');
      if (playerSpeechSubTabButton) playerSpeechSubTabButton.classList.remove('active');
    });
  if (statsOverviewSubTabButton)
    statsOverviewSubTabButton.addEventListener('click', () => {
      if (statsOverviewContainer) statsOverviewContainer.style.display = '';
      if (statsEconomyContainer) statsEconomyContainer.style.display = 'none';
      statsOverviewSubTabButton.classList.add('active');
      if (statsEconomySubTabButton) statsEconomySubTabButton.classList.remove('active');
    });
  if (statsEconomySubTabButton)
    statsEconomySubTabButton.addEventListener('click', () => {
      if (statsOverviewContainer) statsOverviewContainer.style.display = 'none';
      if (statsEconomyContainer) statsEconomyContainer.style.display = '';
      statsEconomySubTabButton.classList.add('active');
      if (statsOverviewSubTabButton) statsOverviewSubTabButton.classList.remove('active');
      renderEconomyStats();
    });

  showTab(mainTab); // Start with main tab visible
  setActiveTabButton(mainTabButton);
}

// Allow collapsing/expanding vignette UI panels
function initVignetteToggles() {
  document.querySelectorAll(".vignette-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      const v = btn.parentElement;
      v.classList.toggle("open");
    });
  });
}

// Refresh button states (enabled/disabled) based on available cash
function updateUpgradeButtons() {
  document.querySelectorAll(".upgrade-item").forEach(row => {
    const key = row.dataset.key;
    const btn = row.querySelector("button");
    if (!key || !btn) return;
    const up = upgrades[key];
    if (!up || typeof up.costFormula !== 'function') return;
    const cost = up.costFormula(up.level + 1);
    const affordable = cash >= cost;
    btn.disabled = !affordable;
    btn.textContent = `Buy $${cost}`;
    row.classList.toggle("affordable", affordable);
    row.classList.toggle("unaffordable", !affordable);
  });
  updateCardUpgradeButtons();
}

function updateCardUpgradeButtons() {
  document.querySelectorAll('.card-upgrade-list .card-wrapper').forEach(wrap => {
    const btn = wrap.querySelector('button');
    const id = wrap.dataset.id;
    if (!btn || !id) return;
    const cost = getCardUpgradeCost(id, stats);
    btn.disabled = cash < cost;
    btn.textContent = `Buy $${cost}`;
  });
}

// Deduct cash and apply the effects of the chosen upgrade

function checkUpgradeUnlocks() {
  let changed = false;
  Object.entries(upgrades).forEach(([key, up]) => {
    if (!up.unlocked && typeof up.unlockCondition === "function" && up.unlockCondition({ stageData, systems })) {
      up.unlocked = true;
      changed = true;
      addLog(`${up.name} unlocked!`, "info");
    }
  });
  if (changed) {
    updateUpgradeButtons();
  }
}


function purchaseCardUpgrade(id, cost) {
  if (cash < cost) return;
  cash -= cost;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  recordCashRates(cash);
  applyCardUpgrade(id, { stats, pDeck, updateAllCardHp: recalcAllCardHp });
  removeActiveUpgrade(id);
  renderCardUpgrades(document.querySelector('.card-upgrade-list'), {
    stats,
    stageData,
    cash,
    onPurchase: purchaseCardUpgrade
  });
  renderPurchasedUpgrades();
  updateUpgradeButtons();
  updatePlayerStats(stats);
}

function renderPurchasedUpgrades() {
  if (!purchasedUpgradeList) return;
  purchasedUpgradeList.innerHTML = '';
  Object.entries(cardUpgradeLevels).forEach(([id, lvl]) => {
    if (lvl <= 0) return;
    const def = cardUpgradeDefinitions[id];
    const wrap = document.createElement('div');
    wrap.classList.add('card-wrapper');
    const cardEl = document.createElement('div');
    cardEl.classList.add('card', 'upgrade-card', `rarity-${rarityClass(def.rarity)}`);
    const icon = def.icon || 'sword';
    cardEl.innerHTML = `<div class="card-suit"><i data-lucide="${icon}"></i></div><div class="card-desc">${def.name} (Lv. ${lvl})</div>`;
    wrap.appendChild(cardEl);
    purchasedUpgradeList.appendChild(wrap);
  });
  lucide.createIcons({ icons: lucide.icons });
}

function updateActiveEffects() {
  if (!activeEffectsContainer) return;
  activeEffectsContainer.innerHTML = '';
  Object.entries(cardUpgradeLevels).forEach(([id, lvl]) => {
    if (lvl > 0) {
      const def = cardUpgradeDefinitions[id];
      const div = document.createElement('div');
      div.textContent = `${def.name} (Lv. ${lvl})`;
      activeEffectsContainer.appendChild(div);
    }
  });
  if (stats.damageBuffMultiplier > 1 && stats.damageBuffExpiration) {
    const remain = Math.max(0, Math.ceil((stats.damageBuffExpiration - Date.now()) / 1000));
    const div = document.createElement('div');
    div.textContent = `Damage Buff x${stats.damageBuffMultiplier.toFixed(1)} (${remain}s)`;
    activeEffectsContainer.appendChild(div);
  }
}

function updateUpgradePowerCost() {
  const btn = document.getElementById('buyUpgradePowerBtn');
  if (btn) btn.textContent = `Buy Upgrade Point ($${formatNumber(upgradePowerCost())})`;
}

function updateBarUI(key) {
  const bar = barUpgrades[key];
  const wrapper = document.querySelector(`.bar-upgrade[data-key="${key}"]`);
  if (!wrapper) return;
  const fill = wrapper.querySelector('.bar-fill');
  const info = wrapper.querySelector('.bar-info');
  const pointsEl = wrapper.querySelector('.bar-points');
  const req = 10 + bar.level * 5;
  if (fill) fill.style.width = `${(bar.progress / req) * 100}%`;
  if (info) info.textContent = `Lv. ${bar.level} ×${bar.multiplier.toFixed(2)}`;
  if (pointsEl) pointsEl.textContent = bar.points;
}


function tickBarProgress(delta) {
  Object.entries(barUpgrades).forEach(([key, bar]) => {
    if (bar.points <= 0) return;
    bar.progress += (bar.points * BAR_PROGRESS_RATE * delta) / 1000;
    const req = 10 + bar.level * 5;
    if (bar.progress >= req) {
      bar.progress -= req;
      bar.level += 1;
      bar.multiplier = computeBarMultiplier(bar.level);
      if (key === 'maxHp') {
        recalcAllCardHp();
      }
      updatePlayerStats();
    }
    updateBarUI(key);
  });
}

function tickSect(delta) {
  if (!sectTabUnlocked) return;
  const dt = delta / 1000;
  speechState.disciples.forEach(d => {
    const task = sectState.discipleTasks[d.id];
    if (task === 'Gather Fruit' || task === 'Log Pine') {
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
      sectState.discipleProgress[d.id] += dt;
      const cycleSeconds = task === 'Gather Fruit' ? FRUIT_CYCLE_SECONDS : PINE_LOG_CYCLE_SECONDS;
      const cycleAmount = task === 'Gather Fruit' ? FRUIT_CYCLE_AMOUNT : PINE_LOG_CYCLE_AMOUNT;
      if (sectState.discipleProgress[d.id] >= cycleSeconds) {
        const cycles = Math.floor(sectState.discipleProgress[d.id] / cycleSeconds);
        sectState.discipleProgress[d.id] -= cycles * cycleSeconds;
        if (task === 'Gather Fruit') sectState.fruits += cycles * cycleAmount;
        else sectState.pineLogs += cycles * cycleAmount;
        checkBuildingUnlock();
        if (!sectState.discipleSkills[d.id]) {
          sectState.discipleSkills[d.id] = {
            'Idle': 0,
            'Gather Fruit': 0,
            'Log Pine': 0,
            'Building': 0,
            'Research': 0,
            'Chant': 0
          };
        }
        const mult = strengthXpMultiplier(task);
        sectState.discipleSkills[d.id][task] += cycles * mult;
        updateSectDisplay();
      }
    } else if (task === 'Research') {
      const spend = Math.min(speechState.resources.insight.current, 4 * dt);
      speechState.resources.insight.current -= spend;
      sectState.researchProgress += spend;
      if (sectState.researchProgress >= 500) {
        const pts = Math.floor(sectState.researchProgress / 500);
        sectState.researchProgress -= pts * 500;
        sectState.researchPoints += pts;
        if (!systems.researchUnlocked) {
          systems.researchUnlocked = true;
          if (colonyResearchTabButton) colonyResearchTabButton.style.display = '';
        }
        if (colonyResearchPanel && colonyResearchPanel.style.display !== 'none') {
          renderColonyResearchPanel();
        }
      }
    } else if (task === 'Chant') {
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
      sectState.discipleProgress[d.id] += dt;
      if (sectState.discipleProgress[d.id] >= 3) {
        sectState.discipleProgress[d.id] -= 3;
        const constructs = speechState.activeConstructs;
        if (constructs.length > 0) {
          const idx = Math.floor(Math.random() * constructs.length);
          castConstruct(constructs[idx], null, 0.5);
        }
      }
      const spend = Math.min(speechState.resources.insight.current, dt);
      speechState.resources.insight.current -= spend;
    } else {
      sectState.discipleProgress[d.id] = 0;
    }
  });
  updateTaskProgressDisplay();
  tickBuilding(dt);
}

function updateTaskProgressDisplay() {
  if (!colonyTasksPanel) return;
  speechState.disciples.forEach(d => {
    const wrapper = document.getElementById(`disciple-task-${d.id}`);
    if (!wrapper) return;
    const fill = wrapper.querySelector('.disciple-progress-fill');
    const label = wrapper.querySelector('.disciple-progress-label');
    const taskName = sectState.discipleTasks[d.id] || 'Idle';
    if (taskName !== 'Gather Fruit' && taskName !== 'Log Pine') {
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = '';
      return;
    }
    const progress = sectState.discipleProgress[d.id] || 0;
    const cycleSeconds = taskName === 'Gather Fruit' ? FRUIT_CYCLE_SECONDS : PINE_LOG_CYCLE_SECONDS;
    const phaseLength = cycleSeconds / 4;
    const phase = Math.floor(progress / phaseLength) % 4;
    const pct = ((progress % phaseLength) / phaseLength) * 100;
    const phaseNames = ['Travelling', 'Gathering', 'Hauling', 'Storing'];
    if (fill) fill.style.width = `${pct}%`;
    if (label) label.textContent = phaseNames[phase];
  });
}

function updateSectDisplay() {
  if (!sectTabUnlocked || !playerSectPanel) return;
  const total = speechState.disciples.length;
  const assigned = Object.values(sectState.discipleTasks).filter(t => t && t !== 'Idle').length;
  if (sectDisciplesDisplay)
    sectDisciplesDisplay.textContent = `Disciples: ${total - assigned} / ${total}`;
  if (sectResourcesDisplay)
    sectResourcesDisplay.textContent = `Fruits: ${sectState.fruits} | Pine Logs: ${sectState.pineLogs}`;
  if (sectUpkeepDisplay) {
    const remaining = Math.max(0, DAY_LENGTH_SECONDS - speechState.seasonTimer);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
    sectUpkeepDisplay.textContent = `Upkeep: 1 fruit/disciple per day (next in ${mm}:${ss})`;
  }

  const orbs = document.getElementById('sectOrbs');
  if (orbs) {
    orbs.innerHTML = '';
    const mobile = window.innerWidth <= 600;
    const positions = mobile
      ? [
          { cls: 'insight', left: '50%', top: '10%' },
          { cls: 'body', left: '20%', top: '70%' },
          { cls: 'will', left: '80%', top: '70%' }
        ]
      : [
          { cls: 'insight', left: '50%', top: '5%' },
          { cls: 'body', left: '15%', top: '70%' },
          { cls: 'will', left: '85%', top: '70%' }
        ];
    positions.forEach(p => {
      const orb = document.createElement('div');
      orb.className = `sect-orb ${p.cls}`;
      orb.style.left = p.left;
      orb.style.top = p.top;
      orbs.appendChild(orb);
    });
  }

  if (sectDisciplesContainer) {
    speechState.disciples.forEach(d => {
      if (!sectDiscipleEls[d.id]) {
        const el = document.createElement('div');
        el.className = 'sect-disciple';
        el.textContent = d.id;
        sectDiscipleEls[d.id] = el;
        sectDisciplesContainer.appendChild(el);
        moveDisciple(el);
      }
    });
    Object.keys(sectDiscipleEls).forEach(id => {
      if (!speechState.disciples.find(d => d.id == id)) {
        sectDiscipleEls[id].remove();
        delete sectDiscipleEls[id];
      }
    });
    startDiscipleMovement();
  }

  if (colonyTasksPanel) renderColonyTasks();
  if (colonyInfoPanel) renderColonyInfo();
  if (colonyResourcesPanel) renderColonyResources();
}

function moveDisciple(el) {
  const cont = el.parentElement;
  if (!cont) return;
  const maxX = Math.max(cont.clientWidth - 20, 0);
  const maxY = Math.max(cont.clientHeight - 20, 0);
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  el.style.transform = `translate(${x}px, ${y}px)`;
}

function updateDiscipleGather(id, el) {
  const cont = el.parentElement;
  if (!cont) return;
  const basket = document.getElementById('sectBasket');
  if (!basket) return;

  const progress = sectState.discipleProgress[id] || 0;
  const phaseLength = FRUIT_CYCLE_SECONDS / 4;
  const phase = Math.floor(progress / phaseLength) % 4;

  if (discipleGatherPhase[id] === phase) return;
  discipleGatherPhase[id] = phase;

  const bx = basket.offsetLeft + basket.offsetWidth / 2 - 8;
  const by = basket.offsetTop + basket.offsetHeight / 2 - 8;
  const outsideX = -40;
  const outsideY = cont.clientHeight * 0.5;

  switch (phase) {
    case 0: // travelling out
      el.style.opacity = '1';
      el.style.transform = `translate(${outsideX}px, ${outsideY}px)`;
      break;
    case 1: // gathering (stay outside, hidden)
      el.style.opacity = '0';
      el.style.transform = `translate(${outsideX}px, ${outsideY}px)`;
      break;
    case 2: // hauling back
      el.style.opacity = '1';
      el.style.transform = `translate(${bx}px, ${by}px)`;
      break;
    case 3: // storing at basket
      el.style.opacity = '1';
      el.style.transform = `translate(${bx}px, ${by}px)`;
      break;
  }
}

function startDiscipleMovement() {
  if (discipleMoveInterval) return;
  discipleMoveInterval = setInterval(() => {
    speechState.disciples.forEach(d => {
      const el = sectDiscipleEls[d.id];
      if (!el) return;
      const task = sectState.discipleTasks[d.id];
      if (task === 'Gather Fruit' || task === 'Log Pine') updateDiscipleGather(d.id, el);
      else moveDisciple(el);
    });
  }, 3000);
}

function renderColonyTasks() {
  colonyTasksPanel.innerHTML = '';
  speechState.disciples.forEach(d => {
    const row = document.createElement('div');
    row.className = 'task-entry';
    if (d.id === selectedDiscipleId) row.classList.add('selected');
    row.addEventListener('click', () => {
      selectedDiscipleId = d.id;
      renderColonyTasks();
      renderColonyInfo();
    });
    const label = document.createElement('div');
    label.textContent = `Disciple #${d.id}`;
    const taskName = document.createElement('div');
    taskName.className = 'disciple-task-name';
    taskName.textContent = sectState.discipleTasks[d.id] || 'Idle';

    const taskInfo = document.createElement('div');
    taskInfo.className = 'disciple-task-info';
    taskInfo.id = `disciple-task-${d.id}`;

    const bar = document.createElement('div');
    bar.className = 'disciple-progress';
    const fill = document.createElement('div');
    fill.className = 'disciple-progress-fill';
    const text = document.createElement('div');
    text.className = 'disciple-progress-label';
    bar.appendChild(fill);
    bar.appendChild(text);
    taskInfo.appendChild(bar);

    row.appendChild(label);
    row.appendChild(taskName);
    row.appendChild(taskInfo);
    colonyTasksPanel.appendChild(row);
  });
  updateTaskProgressDisplay();
}

function renderColonyInfo() {
  colonyInfoPanel.innerHTML = '';
  const d = speechState.disciples.find(x => x.id === selectedDiscipleId);
  if (!d) {
    colonyInfoPanel.textContent = 'Select a disciple';
    return;
  }
  const taskList = document.createElement('div');
  taskList.className = 'disciple-skill-list';
  const tasks = ['Idle', 'Gather Fruit', 'Log Pine', 'Building'];
  if (sectState.buildings.researchTable > 0) tasks.push('Research');
  if (sectState.buildings.chantingHall > 0) tasks.push('Chant');
  tasks.forEach(t => {
    const option = document.createElement('div');
    option.className = 'disciple-skill-option';

    const skills =
      sectState.discipleSkills[d.id] || {
        Idle: 0,
        'Gather Fruit': 0,
        'Log Pine': 0,
        Building: 0,
        'Research': 0,
        'Chant': 0
      };
    const prog = getTaskSkillProgress(skills[t] || 0);

    const label = document.createElement('div');
    label.className = 'disciple-skill-label';
    label.textContent = `${t} (Lv ${prog.level})`;

    const bar = document.createElement('div');
    bar.className = 'disciple-skill-progress';
    const fill = document.createElement('div');
    fill.className = 'disciple-skill-progress-fill';
    fill.style.width = `${Math.floor(prog.progress * 100)}%`;
    bar.appendChild(fill);

    option.appendChild(label);
    option.appendChild(bar);

    option.addEventListener('click', () => {
      sectState.discipleTasks[d.id] = t;
      discipleGatherPhase[d.id] = -1;
      renderColonyTasks();
      renderColonyInfo();
      updateSectDisplay();
    });

    taskList.appendChild(option);
  });

  colonyInfoPanel.appendChild(taskList);
}

function renderColonyResources() {
  colonyResourcesPanel.innerHTML = '';
  if (sectDisciplesDisplay) colonyResourcesPanel.appendChild(sectDisciplesDisplay);
  if (sectResourcesDisplay) colonyResourcesPanel.appendChild(sectResourcesDisplay);
  if (sectUpkeepDisplay) colonyResourcesPanel.appendChild(sectUpkeepDisplay);
  const fruits = document.createElement('div');
  fruits.textContent = `Fruits: ${sectState.fruits}`;
  const logs = document.createElement('div');
  logs.textContent = `Pine Logs: ${sectState.pineLogs}`;
  const sound = document.createElement('div');
  sound.textContent = 'Sound: 0';
  const insight = document.createElement('div');
  insight.textContent = 'Insight: 0';
  const research = document.createElement('div');
  research.textContent = `Research Points: ${sectState.researchPoints}`;
  colonyResourcesPanel.appendChild(fruits);
  colonyResourcesPanel.appendChild(logs);
  colonyResourcesPanel.appendChild(sound);
  colonyResourcesPanel.appendChild(insight);
  colonyResourcesPanel.appendChild(research);
  checkBuildingUnlock();
}

function checkBuildingUnlock() {
  if (!systems.buildingUnlocked && sectState.pineLogs >= 10) {
    systems.buildingUnlocked = true;
    if (colonyBuildTabButton) colonyBuildTabButton.style.display = '';
  }
}

function startBuilding(key) {
  const b = BUILDINGS[key];
  if (!b) return;
  if (sectState.pineLogs < b.cost) return;
  if (sectState.buildings[key] >= b.max) return;
  if (sectState.currentBuild) return;
  if (b.requires && sectState.buildings[b.requires] < b.max) return;
  if (key === 'chantingHall' && !systems.chantingHallUnlocked) return;
  sectState.pineLogs -= b.cost;
  sectState.currentBuild = key;
  sectState.buildProgress = 0;
  renderColonyResources();
  renderColonyBuildPanel();
}

function tickBuilding(dt) {
  if (!sectState.currentBuild) return;
  const builders = speechState.disciples.filter(d => {
    const t = sectState.discipleTasks[d.id];
    return !t || t === 'Idle' || t === 'Building';
  }).length;
  if (builders === 0) return;
  const b = BUILDINGS[sectState.currentBuild];
  sectState.buildProgress += (dt * builders) / b.time;
  if (sectState.buildProgress >= 1) {
    sectState.buildings[sectState.currentBuild]++;
    sectState.currentBuild = null;
    sectState.buildProgress = 0;
    if (sectState.buildings.pineShack >= 1) {
      const basket = document.getElementById('sectBasket');
      const shack = document.getElementById('sectShack');
      if (basket) basket.style.display = 'none';
      if (shack) shack.style.display = 'block';
    }
    renderColonyBuildPanel();
  }
}

function renderColonyBuildPanel() {
  if (!colonyBuildPanel) return;
  colonyBuildPanel.innerHTML = '';
  Object.entries(BUILDINGS).forEach(([key, b]) => {
    if (b.requires && sectState.buildings[b.requires] < b.max) return;
    if (key === 'chantingHall' && !systems.chantingHallUnlocked) return;
    const row = document.createElement('div');
    const btn = document.createElement('button');
    const built = sectState.buildings[key] || 0;
    btn.textContent = `${b.name} (${built}/${b.max})`;
    btn.disabled = built >= b.max || sectState.currentBuild;
    btn.addEventListener('click', () => startBuilding(key));
    row.appendChild(btn);
    if (sectState.currentBuild === key) {
      const prog = document.createElement('div');
      prog.textContent = `Progress: ${(sectState.buildProgress * 100).toFixed(0)}%`;
      row.appendChild(prog);
    } else {
      const cost = document.createElement('div');
      cost.textContent = `Cost: ${b.cost} Pine Logs`;
      row.appendChild(cost);
    }
  colonyBuildPanel.appendChild(row);
  });
}

function renderColonyResearchPanel() {
  if (!colonyResearchPanel) return;
  colonyResearchPanel.innerHTML = '';
  const pts = document.createElement('div');
  pts.textContent = `Research Points: ${sectState.researchPoints}`;
  colonyResearchPanel.appendChild(pts);
  if (!systems.chantingHallUnlocked) {
    const btn = document.createElement('button');
    btn.textContent = 'Unlock Chanting Halls (3 RP)';
    btn.disabled = sectState.researchPoints < 3;
    btn.addEventListener('click', () => {
      if (sectState.researchPoints >= 3) {
        sectState.researchPoints -= 3;
        systems.chantingHallUnlocked = true;
        renderColonyResearchPanel();
        renderColonyBuildPanel();
      }
    });
    colonyResearchPanel.appendChild(btn);
  }
}

function renderDiscipleList() {
  if (!colonyInfoPanel) return;
  colonyInfoPanel.innerHTML = '';
  speechState.disciples.forEach(d => {
    const row = document.createElement('div');
    row.className = 'task-entry';
    if (d.id === selectedDiscipleId) row.classList.add('selected');
    row.textContent = d.name || `Disciple ${d.id}`;
    row.addEventListener('click', () => {
      selectedDiscipleId = d.id;
      renderDiscipleList();
      renderDiscipleDetails();
    });
    colonyInfoPanel.appendChild(row);
  });
}

function renderDiscipleDetails() {
  if (!colonyResourcesPanel) return;
  colonyResourcesPanel.innerHTML = '';
  const d = speechState.disciples.find(x => x.id === selectedDiscipleId);
  if (!d) {
    colonyResourcesPanel.textContent = 'Select a disciple';
    return;
  }

  const stats = [
    { label: 'Health', color: '#a33', value: d.health, max: 10 },
    { label: 'Stamina', color: '#cc3', value: d.stamina, max: 10 },
    { label: 'Hunger', color: '#cc3', value: d.hunger, max: 20 }
  ];

  stats.forEach(s => {
    const wrapper = document.createElement('div');
    wrapper.textContent = `${s.label} ${s.value}/${s.max}`;
    const bar = document.createElement('div');
    bar.className = 'disciple-progress';
    const fill = document.createElement('div');
    fill.className = 'disciple-progress-fill';
    fill.style.background = s.color;
    fill.style.width = `${(s.value / s.max) * 100}%`;
    bar.appendChild(fill);
    wrapper.appendChild(bar);
    colonyResourcesPanel.appendChild(wrapper);
  });

  const power = document.createElement('div');
  power.textContent = `Construct Power: ${d.power}`;
  colonyResourcesPanel.appendChild(power);

  const attrs = document.createElement('div');
  attrs.innerHTML = `Strength ${d.strength}<br>Dexterity ${d.dexterity}<br>Intelligence ${d.intelligence}<br>Endurance ${d.endurance}`;
  colonyResourcesPanel.appendChild(attrs);
}

function triggerOrbFlash() {
  const orbs = document.querySelectorAll('#sectOrbs .sect-orb');
  orbs.forEach(o => {
    o.classList.add('flash');
    setTimeout(() => o.classList.remove('flash'), 500);
  });
}

//=========card tab==========

function renderMiniCard(card) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('mini-card-wrapper');

  const cardPane = document.createElement('div');
  cardPane.classList.add('mini-card');
  cardPane.innerHTML = `
    <div class="card-value" style="color: ${card.color}">${card.value}</div>
    <div class="card-suit" style="color: ${card.color}">${card.symbol}</div>
    <div class="mini-card-level">Lv ${card.currentLevel}</div>
  `;

  card.deckLevelDisplay = cardPane.querySelector('.mini-card-level');
  wrapper.appendChild(cardPane);
  deckTabContainer.appendChild(wrapper);
}

// Synchronize XP bars and HP values for cards shown in the Deck tab
function updateDeckDisplay() {
  // Update ALL cards in the original deck, including those that have been drawn
  pDeck.forEach(card => {
    // Mini card level label
    if (card.deckLevelDisplay) {
      card.deckLevelDisplay.textContent = `Lv ${card.currentLevel}`;
    }

    // Full deck card elements
    if (card.deckXpBarFill && card.deckXpLabel) {
      const pct = (card.XpCurrent / card.XpReq) * 100;
      card.deckXpBarFill.style.width = `${Math.min(pct, 100)}%`;
      card.deckXpLabel.textContent =
        `LV: ${card.currentLevel} ` +
        `XP: ${formatNumber(card.XpCurrent)}/${formatNumber(Math.floor(card.XpReq))}`;
    }

    if (card.deckHpDisplay) {
      card.deckHpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
    }

    // 4) If this card is currently on the field, update its HP too
    if (card.hpDisplay) {
      card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
    }
  });
  renderJobAssignments(deckJobsContainer, pDeck);
  updateMasteryBars();
}

function renderDeckTop() {
  if (!deckContainer) return;
  deckContainer.innerHTML = '';
  if (deck.length > 0) {
    const top = deck[0];
    const img = document.createElement('img');
    img.alt = 'Deck';
    img.src = cardBackImages[top.backType] || cardBackImages['basic-red'];
    img.classList.add('card-back', top.backType);
    deckContainer.appendChild(img);
  }
}

function updatePileCounts() {
  if (deckCountDisplay) deckCountDisplay.textContent = `Deck: ${deck.length}`;
  if (discardCountDisplay) discardCountDisplay.textContent = `Discard: ${discardPile.length}`;
}

function updateMasteryBars() {
  if (!deckListContainer) return;
  deckListContainer.querySelectorAll('.deck-row').forEach(row => {
    const id = row.dataset.deckId;
    const { level, pct, req } = getDeckMasteryInfo(id);
    const fill = row.querySelector('.deckMasteryFill');
    const name = row.querySelector('.deck-level');
    const reqSpan = row.querySelector('.deck-req');
    if (fill) fill.style.width = `${Math.min(1, pct) * 100}%`;
    if (name) name.textContent = `${deckConfigs[id].name} Lv ${level}`;
    if (reqSpan) reqSpan.textContent = formatNumber(req);
  });
}

function hideDeckViews() {
  if (deckListContainer) deckListContainer.style.display = 'none';
  if (deckTabContainer) deckTabContainer.style.display = 'none';
  if (jokerViewContainer) jokerViewContainer.style.display = 'none';
  if (deckJobsContainer) deckJobsContainer.style.display = 'none';
  if (jobCarouselContainer) jobCarouselContainer.style.display = 'none';
  if (deckUpgradesContainer) deckUpgradesContainer.style.display = 'none';
}

function showDeckListView() {
  hideDeckViews();
  if (deckListContainer) {
    renderDeckList(deckListContainer);
    deckListContainer.style.display = 'flex';
  }
}

function showDeckCardsView(id) {
  hideDeckViews();
  if (!deckTabContainer) return;
  deckTabContainer.innerHTML = '';
  const cards = deckConfigs[id]?.cards || [];
  cards.forEach(c => renderMiniCard(c));
  deckTabContainer.style.display = 'flex';
}

function showJokerView() {
  hideDeckViews();
  if (jokerViewContainer) {
    renderJokerView(jokerViewContainer);
    jokerViewContainer.style.display = 'flex';
  }
}

function showJobsView() {
  hideDeckViews();
  if (deckJobsContainer) deckJobsContainer.style.display = 'flex';
}

function showJobCarouselView() {
  hideDeckViews();
  if (jobCarouselContainer) jobCarouselContainer.style.display = 'flex';
}


//========render functions==========
document.addEventListener("DOMContentLoaded", () => {
  // now the DOM is in, and lucide.js has run, so window.lucide is defined
  initTabs();
  window.addEventListener('location-discovered', e => addDiscoveredLocation(e.detail.name));
  loadGame();
  checkBuildingUnlock();
  if (systems.researchUnlocked && colonyResearchTabButton) {
    colonyResearchTabButton.style.display = '';
  }
  updateSectDisplay();
  initVignetteToggles();
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  initCore();
  initSpeech();
  document.addEventListener('day-passed', () => {
    speechState.disciples.forEach(d => {
      if (sectState.fruits > 0) {
        sectState.fruits--;
        d.hunger = 20;
      } else {
        d.hunger = Math.max(0, d.hunger - 1);
        if (d.hunger === 0) {
          d.health = Math.max(0, d.health - 5);
          if (d.health === 0) {
            sectState.discipleTasks[d.id] = 'Idle';
            d.incapacitated = true;
          }
        }
      }
    });
    updateSectDisplay();
    if (colonyResourcesPanel && colonyResourcesPanel.style.display !== 'none') {
      renderDiscipleDetails();
    }
  });
  document.addEventListener('disciple-gained', e => {
    if (!sectTabUnlocked && e.detail.count >= 1) {
      sectTabUnlocked = true;
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.textContent = 'Sect';
      addLog('A presence stirs. The first disciple has heard the Calling.', 'info');
    }
    updateSectDisplay();
    if (colonyInfoTabButton && colonyInfoTabButton.classList.contains('active')) {
      renderDiscipleList();
      renderDiscipleDetails();
    }
  });
  window.addEventListener('core-mind-upgrade', () => {
    stats.maxMana += 10;
    updateManaBar();
  });
  showDeckListView();
  showColonyTab('tasks');
  Object.values(upgrades).forEach(u => u.effect({ stats, pDeck, stageData, systems }));
  renderPurchasedUpgrades();
  // Start or resume the game after loading
  spawnPlayer();
  respawnDealerStage();
  renderDealerCard();
  resetStageCashStats();
  renderStageInfo();
  renderWorldsMenu();
  renderJobAssignments(deckJobsContainer, pDeck);
  rollNewCardUpgrades(2, deckConfigs[selectedDeck]?.upgrades || []);
  renderPurchasedUpgrades();
  shuffleArray(deck);
  checkUpgradeUnlocks();

  if (nextStageArea) {
    nextStageArea.addEventListener("click", () => {
      if (stageData.kills >= STAGE_KILL_REQUIREMENT) {
        openCamp(() => openCardUpgradeSelection(nextStage));
      }
    });
  }
  fightBossBtn.addEventListener("click", () => {
    fightBossBtn.style.display = "none";
    spawnBossEvent();
  });
  if (campBtn) {
    campBtn.addEventListener('click', () => {
      campBtn.style.display = 'none';
      openCamp(() => openCardUpgradeSelection(nextStage));
    });
  }
  renderJokers();
  const buttons = document.querySelector('.buttonsContainer');
  playerAttackFill = renderPlayerAttackBar(buttons);
  hidePlayerAttackBar();
  updateChipsDisplay();
  requestAnimationFrame(gameLoop);
});

// life rendering moved to rendering.js

function updateManaBar() {
  if (!manaBar) return;
  if (!systems.manaUnlocked) {
    manaBar.style.display = "none";
    return;
  }
  manaBar.style.display = "flex";
  const ratio = stats.maxMana > 0 ? stats.mana / stats.maxMana: 0;
  if (manaFill) manaFill.style.width = `${Math.min(1, ratio) * 100}%`;
  if (manaText) manaText.textContent = `${Math.floor(stats.mana)}/${Math.floor(stats.maxMana)}`;
}

//function updateSanityBar() {}
//function updateInsanityOrb(ratio) {}

function unlockManaSystem() {
  // prevent duplicate initialization
  if (systems.manaUnlocked) {
    updateManaBar();
    return;
  }

  systems.manaUnlocked = true;
  // establish baseline mana so upgrades scale correctly
  const baseMana = 50;
  stats.maxMana = baseMana;
  stats.mana = stats.maxMana;
  stats.manaRegen = 0.01;
  // re-apply upgrade effects in case levels were purchased before unlock
  Object.values(upgrades).forEach(u => u.effect({ stats, pDeck, stageData, systems }));
  updateManaBar();
  checkUpgradeUnlocks();
}

//stage

function renderStageInfo() {
  const stageDisplay = document.getElementById("stage");
  stageData.kills = playerStats.stageKills[stageData.stage] || stageData.kills || 0;
  const lvl = worldProgress[stageData.world]?.level || 1;
  stageDisplay.textContent = `Stage ${stageData.stage} World ${stageData.world} (Lv ${lvl})`;
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageAvailability();
  updateBossProgress();
}

function renderPlayerStats(stats) {
  const damageDisplay = document.getElementById("damageDisplay");
  const cashMultiDisplay = document.getElementById("cashMultiDisplay");
  const hpPerKillDisplay = document.getElementById("hpPerKillDisplay");
  const attackSpeedDisplay = document.getElementById("attackSpeedDisplay");

  damageDisplay.textContent = `Damage: ${formatNumber(Math.floor(stats.pDamage))}`;
  cashMultiDisplay.textContent = `Cash Multi: ${formatNumber(Math.floor(stats.cashMulti))}`;
  pointsDisplay.textContent = `Points: ${formatNumber(stats.points)}`;
  cardPointsDisplay.textContent = `Card Points: ${formatNumber(cardPoints)}`;
  attackSpeedDisplay.textContent = `Attack Speed: ${Math.floor(stats.attackSpeed / 1000)}s`;
  if (manaRegenDisplay) {
    manaRegenDisplay.textContent = `Mana Regen: ${stats.manaRegen.toFixed(2)}/s`;
  }
  if (dpsDisplay) {
    const dps = stats.pDamage / (stats.attackSpeed / 1000);
    dpsDisplay.textContent = `DPS: ${dps.toFixed(2)}`;
  }

  // Update HP per kill display
  if (hpPerKillDisplay) {
    hpPerKillDisplay.textContent = `HP per Kill: ${formatNumber(stats.hpPerKill)}`;
  }
}

function renderGlobalStats() {
  const container = document.getElementById("statsOverviewContainer");
  if (!container) return;
  container.innerHTML = "";

  const basics = document.createElement("div");
  basics.innerHTML = `
  <div>Times Prestiged: ${playerStats.timesPrestiged}</div>
  <div>Decks Unlocked: ${playerStats.decksUnlocked}</div>
  <div>Total Boss Kills: ${formatNumber(playerStats.totalBossKills)}</div>
  `;
  container.appendChild(basics);

  const list = document.createElement("div");
  Object.entries(playerStats.stageKills)
  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
  .forEach(([stage, kills]) => {
    const row = document.createElement("div");
    row.textContent = `Stage ${stage} Kills: ${formatNumber(kills)}`;
    list.appendChild(row);
  });
  container.appendChild(list);

  // Add a restart button to allow starting a new run from the stats screen
  const restartBtn = document.createElement("button");
  restartBtn.textContent = "Start New Run";
  restartBtn.addEventListener("click", startNewGame);
  container.appendChild(restartBtn);
}

function renderEconomyStats() {
  if (!statsEconomyContainer) return;
  statsEconomyContainer.innerHTML = '';
  const hourRate = cashRateTracker1h.getRate();
  const dayRate = cashRateTracker24h.getRate();
  const hRow = document.createElement('div');
  hRow.textContent = `Avg Cash/sec (1h): ${hourRate.toFixed(2)}`;
  const dRow = document.createElement('div');
  dRow.textContent = `Avg Cash/sec (24h): ${dayRate.toFixed(2)}`;
  statsEconomyContainer.append(hRow, dRow);
}

function renderAbilityIcons(abilities, showCooldown = false) {
  let html = '<div class="dCard_abilities">';
  for (const ability of abilities) {
    const icon = ability.icon || 'sparkles';
    const label = ability.label || 'Ability';
    const typeClass = ability.colorClass || '';
    if (showCooldown) {
      const isOnCooldown = ability.timer < ability.cooldown;
      const cooldownRatio = ability.timer / ability.cooldown;
      const cooldownClass = ability.timer && ability.cooldown && ability.timer < ability.cooldown ? 'onCooldown' : '';
      html += `<div class="dCard_ability ${cooldownClass} ${typeClass}" title="${label}">` +
        `<i data-lucide="${icon}"></i>` +
        (isOnCooldown ? `<div class="cooldown-overlay" style="--cooldown:${cooldownRatio}"></div>` : '') +
        `</div>`;
    } else {
      html += `<div class="dCard_ability ${typeClass}" title="${label}">` +
        `<i data-lucide="${icon}"></i>` +
        `</div>`;
    }
  }
  html += '</div>';
  return html;
}

function renderBossCard(enemy) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('dCardWrapper');
  const pane = document.createElement('div');
  pane.classList.add('dCardPane', 'boss', `rarity-${enemy.rarity || 'basic'}`);
  const abilityPane = document.createElement('div');
  abilityPane.classList.add('dCardAbilityPane');
  const iconColor = enemy.iconColor || '#a04444';
  const { minDamage, maxDamage } = calculateEnemyBasicDamage(enemy.stage, enemy.world);
  pane.innerHTML = `\n    <i data-lucide="${enemy.icon}" class="dCard__icon" style="color:${iconColor}"></i>\n    <span class="dCard__text">\n    ${enemy.name}<br>\n    Damage: ${formatNumber(minDamage)} - ${formatNumber(maxDamage)}\n    </span>\n    `;
  abilityPane.innerHTML = renderAbilityIcons(enemy.abilities, true);
  wrapper.append(pane, abilityPane);
  return wrapper;
}

function renderDealerCardBase(enemy) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('dCardWrapper');
  const pane = document.createElement('div');
  pane.classList.add('dCardPane', 'dealer', `rarity-${enemy.rarity || 'basic'}`);
  const abilityPane = document.createElement('div');
  abilityPane.classList.add('dCardAbilityPane');
  const { color, blur } = getDealerIconStyle(stageData.stage);
  const iconHtml = enemy.isSpeaker
    ? `<canvas class="dCard__icon speaker-icon" width="48" height="48"></canvas>`
    : `<i data-lucide="skull" class="dCard__icon" style="stroke:${color}; filter: drop-shadow(0 0 ${blur}px ${color});"></i>`;
  const { minDamage, maxDamage } = calculateEnemyBasicDamage(enemy.stage, enemy.world);
  pane.innerHTML = `\n    ${iconHtml}\n    <span class="dCard__text">\n    ${enemy.name}<br>\n    Damage: ${formatNumber(Math.floor(minDamage))} - ${formatNumber(Math.floor(maxDamage))}\n    </span>\n    `;
  abilityPane.innerHTML = renderAbilityIcons(enemy.abilities, false);
  wrapper.append(pane, abilityPane);
  if (enemy.isSpeaker) {
    const canvas = pane.querySelector('canvas.speaker-icon');
    if (canvas) drawSpeakerIcon(canvas);
  }
  return wrapper;
}

function renderDealerCard() {
  if (!currentEnemy) return;
  const card = currentEnemy instanceof Boss
    ? renderBossCard(currentEnemy)
    : renderDealerCardBase(currentEnemy);
  dCardContainer.innerHTML = '';
  dCardContainer.appendChild(card);
  lucide.createIcons({ icons: lucide.icons });
}

function animateCardHit(card) {
  const w = card.wrapperElement;
  if (!w) return;

  const target = card.cardElement || w;
  runAnimation(target, "hit-animate");
}

// Floating text that shows damage taken by a card
function showDamageFloat(card, amount) {
  const hp = card.hpDisplay;
  if (!hp) return;
  const dmg = document.createElement("div");
  dmg.classList.add("damage-float");
  dmg.textContent = `-${amount}`;
  hp.appendChild(dmg);
  // ensure the element is removed even if the animationend event doesn't fire
  dmg.addEventListener("animationend", () => dmg.remove(), {
    once: true
  });
  setTimeout(() => dmg.remove(), 3000);
}

//=========stage functions===========

function recordWorldKill(world, stage) {
  const data = worldProgress[world];
  if (!data) return;
  if (data.progress >= data.progressTarget && !data.bossDefeated) return;
  data.progress += stageWeight(stage);
  updateWorldProgressUI(world);
  if (world === stageData.world) updateBossProgress();
  if (world === stageData.world) {
    worldProgressRateTracker.record(computeWorldProgress(world) * 100);
  }
}

function computeWorldWeight(id) {
  const data = worldProgress[id];
  return data ? data.progress : 0;
}

function computeWorldProgress(id) {
  const data = worldProgress[id];
  if (!data) return 0;
  return Math.min(data.progress / data.progressTarget, 1);
}

function updateWorldProgressUI(id) {
  const pct = computeWorldProgress(id) * 100;
  const weight = computeWorldWeight(id);
  const fill = document.querySelector(
    `.world-progress[data-world="${id}"] .world-progress-fill`
  );
  if (fill) fill.style.width = `${pct}%`;
  if (id == stageData.world) updateBossProgress();
  const textEl = document.querySelector(
    `.world-progress-text[data-world="${id}"]`
  );
  if (textEl) {
    const level = worldProgress[id].level;
    const target = worldProgress[id].progressTarget;
    textEl.textContent = `Lv ${level}: ${weight}/${target} (${pct.toFixed(1)}%)`;
  }
  if (
    worldProgress[id] &&
    !worldProgress[id].bossDefeated &&
    pct >= 100 &&
    id == stageData.world
  ) {
    fightBossBtn.style.display = "inline-block";
  } else if (id == stageData.world) {
    fightBossBtn.style.display = "none";
  }
}

function renderWorldsMenu() {
  const container = document.querySelector(".worldsContainer");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(worldProgress).forEach(([id, data]) => {
    if (!data.unlocked) return;
    const entry = document.createElement("div");
    entry.classList.add("world-entry");
    entry.innerHTML = `<div>World ${id} (Lv ${data.level})</div>`;
    entry.addEventListener("click", e => {
      if (e.target.tagName !== "BUTTON") {
        selectWorld(id);
      }
    });
    const progressText = document.createElement("span");
    progressText.classList.add("world-progress-text");
    progressText.dataset.world = id;
    entry.appendChild(progressText);
    const bar = document.createElement("div");
    bar.classList.add("world-progress");
    bar.dataset.world = id;
    const fill = document.createElement("div");
    fill.classList.add("world-progress-fill");
    bar.appendChild(fill);
    entry.appendChild(bar);
    const claimBtn = document.createElement("button");
    if (data.bossDefeated && !data.rewardClaimed) {
      claimBtn.textContent = "Claim Reward";
      claimBtn.addEventListener("click", () => {
        awardJokerCardByWorld(parseInt(id));
        data.rewardClaimed = true;
        renderWorldsMenu();
        updateWorldTabNotification();
      });
    } else {
      claimBtn.textContent = data.rewardClaimed ? "Reward Claimed" : "";
      claimBtn.disabled = true;
    }
    entry.appendChild(claimBtn);

    const visitBtn = document.createElement("button");
    if (parseInt(id) === stageData.world) {
      visitBtn.textContent = "Current";
      visitBtn.disabled = true;
    } else {
      visitBtn.textContent = `Go To World ${id}`;
      visitBtn.addEventListener("click", () => {
        goToWorld(parseInt(id));
      });
    }
    entry.appendChild(visitBtn);
    container.appendChild(entry);
    updateWorldProgressUI(id);
  });
  updateWorldTabNotification();
}

// Highlight the Worlds tab when rewards can be claimed or a new world is unlocked
function updateWorldTabNotification() {
  if (!worldSubTabButton) return;
  let highestUnlocked = 0;
  let rewardAvailable = false;
  Object.entries(worldProgress).forEach(([id, data]) => {
    const num = parseInt(id);
    if (data.unlocked && num > highestUnlocked) highestUnlocked = num;
    if (data.bossDefeated && !data.rewardClaimed) rewardAvailable = true;
  });
  const newWorldAvailable = highestUnlocked > stageData.world;
  const shouldGlow = rewardAvailable || newWorldAvailable;
  worldSubTabButton.classList.toggle("glow-notify", shouldGlow);
}

// Show cards eligible for job assignment in the Deck tab

// ===== Stage and world management =====
// Advance to the next stage after defeating enough enemies
function nextStage() {
  playerStats.stageKills[stageData.stage] = stageData.kills;
  stageData.stage += 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  const isBossStage = stageData.stage % 10 === 0;
  resetStageCashStats();
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateNextStageAvailability();
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  checkSpeakerEncounter();
  // start the next stage without double-counting points
  lastCashOutPoints = stats.points;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  if (nextStageArea) nextStageArea.classList.remove('glow-notify');
  if (isBossStage) {
    respawnDealerStage();
  } else {
    respawnDealerStage();
  }
}

// Called when a boss is defeated to move to the next world
function nextWorld() {
  playerStats.stageKills[stageData.stage] = stageData.kills;
  stageData.world += 1;
  stageData.stage = 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  redrawCost = 10;
  updateRedrawButton();
  applyWorldTheme();
  resetStageCashStats();
  worldProgressTimer = 0;
  worldProgressRateTracker.reset(computeWorldProgress(stageData.world) * 100);
  if (worldProgressPerSecDisplay) {
    worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";
  }
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateBossProgress();
  updateNextStageAvailability();
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  // entering a new world resets cash-out tracking
  lastCashOutPoints = stats.points;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  if (nextStageArea) nextStageArea.classList.remove('glow-notify');
  respawnDealerStage();
}

// Travel to a specific world when selected in the Worlds tab
function goToWorld(id) {
  if (!worldProgress[id] || !worldProgress[id].unlocked) return;
  playerStats.stageKills[stageData.stage] = stageData.kills;
  stageData.world = parseInt(id);
  stageData.stage = 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  redrawCost = 10;
  updateRedrawButton();
  resetStageCashStats();
  worldProgressTimer = 0;
  worldProgressRateTracker.reset(computeWorldProgress(stageData.world) * 100);
  if (worldProgressPerSecDisplay) {
    worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";
  }
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateBossProgress();
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  lastCashOutPoints = stats.points;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  if (nextStageArea) nextStageArea.classList.remove('glow-notify');
  renderWorldsMenu();
  updateWorldTabNotification();
  respawnDealerStage();
}

// Reset tracking for average cash when a new stage begins
function resetStageCashStats() {
  cashTimer = 0;
  resetCashRates(cash);
}

function updateNextStageAvailability() {
  if (!nextStageArea) return;
  if (stageData.kills >= STAGE_KILL_REQUIREMENT) {
    nextStageArea.classList.add('glow-notify');
    nextStageArea.classList.add('clickable');
  } else {
    nextStageArea.classList.remove('glow-notify');
    nextStageArea.classList.remove('clickable');
  }
  updateNextStageProgress();
}

function setProgress(circle, ratio) {
  if (!circle) return;
  const clamped = Math.max(0, Math.min(1, ratio));
  const offset = PROGRESS_CIRCUMFERENCE * (1 - clamped);
  circle.style.strokeDashoffset = offset;
}

function updateNextStageProgress() {
  setProgress(nextStageProgress, stageData.kills / STAGE_KILL_REQUIREMENT);
}

function updateBossProgress() {
  setProgress(bossProgress, computeWorldProgress(stageData.world));
}

// Enable the next stage button when kill requirements met
//function nextStageChecker() {}

//dealer

// Spawn logic moved to enemySpawning.js

// Adjust the width of the dealer's HP bar
function updateDealerLifeBar(enemy) {
  const barFill = document.getElementById("dealerBarFill");
  if (!barFill || !enemy) return;

  const hpRatio = enemy.currentHp / enemy.maxHp;
  barFill.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
} // for healing bosses

// Clean up HP/attack bars when an enemy dies
function removeDealerLifeBar() {
  const bar = document.querySelector(".dealerLifeContainer");
  if (bar) bar.remove();
  const atk = document.querySelector(".enemyAttackBar");
  if (atk) atk.remove();
  dealerLifeDisplay.textContent = "";
}

function spawnDealerEvent(powerMult = 1) {
  inCombat = true;
  removeDealerLifeBar();
  const temp = { ...stageData, stage: Math.round(stageData.stage * powerMult) };
  currentEnemy = spawnEnemy('dealer', temp, enemyAttackProgress, onDealerDefeat);
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}

function spawnBossEvent() {
  inCombat = true;
  removeDealerLifeBar();
  const data = worldProgress[stageData.world];
  const bossStage = 10 * (data?.level || 1);
  const temp = { ...stageData, stage: bossStage };
  currentEnemy = spawnEnemy('boss', temp, enemyAttackProgress, () => onBossDefeat(currentEnemy));
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}



//function updateStageProgressDisplay() {}
//function stopStageProgress() {}
//function stepStageProgress() {}
//function startStageProgress() {}
//function moveForward() {}

// After a kill, decide whether to spawn a dealer or a boss
function respawnDealerStage() {
  removeDealerLifeBar();
  if (speakerEncounterPending) {
    speakerEncounterPending = false;
    currentEnemy = spawnEnemy('speaker', stageData, enemyAttackProgress, onSpeakerDefeat);
  } else {
    currentEnemy = spawnEnemy('dealer', stageData, enemyAttackProgress, onDealerDefeat);
  }
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}

// What happens after defeating a regular dealer
function onDealerDefeat() {
  // capture remaining attack progress before resetting
  enemyAttackProgress = currentEnemy.attackTimer / currentEnemy.attackInterval;
  cardXp(calculateKillXp(stageData.stage, stageData.world));
  chips += computeChipReward();
  updateChipsDisplay();
  healCardsOnKill();
  stageData.kills += 1;
  playerStats.stageKills[stageData.stage] = stageData.kills;
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageAvailability();
  renderGlobalStats();
  recordWorldKill(stageData.world, stageData.stage);
  dealerDeathAnimation();
    dealerBarDeathAnimation(() => {
      inCombat = false;
      currentEnemy = null;
      updateDealerLifeDisplay();
      hidePlayerAttackBar();
      respawnDealerStage();
    });
}

function onSpeakerDefeat() {
  playerStats.speakerEncounters += 1;
  const idx = playerStats.speakerEncounters;
  if (idx === 1) {
    showSpeakerQuote("Sometimes it’s safer to hide in a nightmare... but are we ever truly free from the dream?");
  } else if (idx === 2) {
    showSpeakerQuote("Words don’t just describe. They make.");
  } else if (idx === 3) {
    showSpeakerQuote("The soul is the only prison you’ve never tried to break.");
    if (playerTabButton) playerTabButton.style.display = "inline-block";
    if (mainTabButton) mainTabButton.disabled = true;
    showTab(playerTab);
    setActiveTabButton(playerTabButton);
  }
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    currentEnemy = null;
    chips += computeChipReward();
    updateChipsDisplay();
    updateDealerLifeDisplay();
    hidePlayerAttackBar();
    respawnDealerStage();
  });
}

// Called when the player defeats a boss enemy
function onBossDefeat(boss) {
  // capture remaining attack progress before resetting
  enemyAttackProgress = boss.attackTimer / boss.attackInterval;
  cardXp(boss.xp);
  const data = worldProgress[stageData.world];
  data.bossDefeated = true;
  data.rewardClaimed = false;
  // Unlock the next world upon boss defeat if it exists
  if (worldProgress[stageData.world + 1]) {
    worldProgress[stageData.world + 1].unlocked = true;
  }
  data.level += 1;
  data.progress = 0;
  data.progressTarget *= 3;
  data.bossDefeated = false;
  updateWorldProgressUI(stageData.world);
  renderWorldsMenu();
  renderStageInfo();
  addLog(`${boss.name} was defeated!`);
  currentEnemy = null;

  playerStats.totalBossKills += 1;
  renderGlobalStats();

  healCardsOnKill();
  stats.upgradePower += 5;
  rollNewCardUpgrades(2, deckConfigs[selectedDeck]?.upgrades || []);
  renderPurchasedUpgrades();
  shuffleArray(deck);
  checkSpeakerEncounter();
  // Unlock and immediately travel to the next world
  updateWorldTabNotification();
  renderWorldsMenu();
  fightBossBtn.style.display = "none";
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    currentEnemy = null;
    chips += computeChipReward();
    updateChipsDisplay();
    hidePlayerAttackBar();
    nextWorld();
  });
}

// Spawn the boss that appears every 10 stages
// Spawn logic moved to enemySpawning.js

// Update text and bar UI for the current enemy's health
function updateDealerLifeDisplay() {
  if (!currentEnemy) {
    removeDealerLifeBar();
    return;
  }
  dealerLifeDisplay.textContent = `Life: ${formatNumber(currentEnemy.currentHp)}/${formatNumber(currentEnemy.maxHp)}`;
  renderDealerLifeBar(dealerLifeDisplay, currentEnemy);
  renderDealerLifeBarFill(currentEnemy);
}

// Determine how much health an enemy or boss should have
// enemy scaling moved to enemySpawning.js

// Apply damage from the enemy to the first card in the player's hand
function cDealerDamage(damageAmount = null, ability = null, source = "dealer") {
  // If no card is available to take the hit, trigger game over
  if (drawnCards.length === 0) {
    playerStats.hasDied = true;
    showRestartScreen(respawnPlayer);
    return;
  }

  const {
    minDamage,
    maxDamage
  } = calculateEnemyBasicDamage(
    stageData.stage,
    stageData.world
  );
  const dDamage =
  damageAmount ??
  Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

  let finalDamage = dDamage;
  if (stats.playerShield > 0) {
    const absorbed = Math.min(stats.playerShield, finalDamage);
    stats.playerShield -= absorbed;
    finalDamage -= absorbed;
  }

  // randomly target one of the drawn cards
  const idx = Math.floor(Math.random() * drawnCards.length);
  const card = drawnCards[idx];

  // subtract **one** hit’s worth
  card.currentHp = Math.round(Math.max(0, card.currentHp - finalDamage));
  addLog(
    `${source} hit ${card.value}${card.symbol} for ${finalDamage} damage!`,
    "damage"
  );

  // update its specific HP display
  card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
  updateDeckDisplay();
  if (card.wrapperElement) {
    animateCardHit(card);
    // Show actual damage dealt after shield reduction
    showDamageFloat(card, finalDamage);
  }
  updateBloodSplat(card);
  // if it’s dead, remove it
  if (card.currentHp === 0) {
    // immediately remove from data so new draws don't shift the wrong card
    drawnCards.splice(idx, 1);

    animateCardDeath(card, () => {
      // 1) from the DOM
      removeBloodSplat(card);
      card.wrapperElement?.remove();

      discardCard(card);
      updatePlayerStats(stats);
      updateDrawButton();
      updateDeckDisplay();
      if (drawnCards.length === 0) {
        playerStats.hasDied = true;
        showRestartScreen(respawnPlayer);
      }
    });
  }
  // Optional ability logic (e.g., healing, fireball
}

globalThis.cDealerDamage = cDealerDamage;

function dealerDeathAnimation() {
  const dCardWrapper = document.querySelector(".dCardWrapper:last-child");
  const dCardPane = document.querySelector(".dCardPane");
  if (!dCardWrapper) {
    dCardContainer.innerHTML = "";
    renderDealerCard();
    return;
  }
  runAnimation(dCardWrapper, "dealer-dead").then(() => {
    dCardContainer.innerHTML = "";
    renderDealerCard();
  });
  runAnimation(dCardPane, "dealer-dead");
}

function dealerBarDeathAnimation(callback) {
  const bar = document.querySelector(".dealerLifeContainer");
  if (!bar) {
    if (callback) callback();
    return;
  }
  runAnimation(bar, "bar-dead").then(() => {
    removeDealerLifeBar();
    if (callback) callback();
  });
}

//========deck functions===========

function cardXp(xpAmount) {
  pDeck.forEach(card => {
    if (!card) return;

    const amount = drawnCards.includes(card)
      ? xpAmount
      : xpAmount * xpEfficiency;
    const leveled = card.gainXp(amount, stats, barUpgrades);
    if (leveled) {
      cardPoints += 1;
      if (card.wrapperElement) animateCardLevelUp(card);
      addDeckMasteryProgress(selectedDeck, 1);
      addLog(
        `${card.value}${card.symbol} leveled up to level ${card.currentLevel}!`,
        "level"
      );
    }
  });
  // refresh both UIs
  updateHandDisplay(); // paints hand bars & HP
  updateDeckDisplay(); // paints deck tab bars
}

/**
* Draws the top card from `Deck` into `intoHand`.
* Renders it with `renderFn` and then calls `updateFn`.
* Returns the drawn card, or null if the deck was empty.
*/
// Draw the next card from the deck into the player's hand
// drawing logic moved to cardManagement.js

// Enable or disable the draw button depending on hand size
function updateDrawButton() {
  const drawBtn = document.getElementById('clickalipse');
  if (!drawBtn) return;
  if (stats.cardSlots === drawnCards.length) {
    drawBtn.disabled = true;
    drawBtn.style.background = "grey";
  } else {
    drawBtn.disabled = false;
    drawBtn.style.background = "green";
  }
}

function updateRedrawButton() {
  // removed redraw button UI
}

// Refresh the cards currently shown in the player's hand
function updateHandDisplay() {
  drawnCards.forEach(card => {
    if (!card || !card.hpDisplay) return; // Skip if card or elements are missing
    card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
    card.xpLabel.textContent = `LV: ${card.currentLevel}`;
    card.xpBarFill.style.width = `${(card.XpCurrent / card.XpReq) * 100}%`;
    updateBloodSplat(card);
  });
}

// Create DOM elements for a card in the player's hand
// card rendering moved to rendering.js

// Move a card to the discard pile and update the UI
function discardCard(card) {
  discardPile.push(card);
  renderDiscardCard(card, discardContainer, cardBackImages);
  updatePileCounts();
}


let gamePaused = false;
let campOverlayOpen = false;
let campOverlay = null; // overlay instance
let inCombat = false;
let redrawAllowed = false;
let upgradeSelectionOpen = false;
let upgradeOverlay = null; // overlay instance
let redrawCost = 10;
//let stageProgressing = false;
//let stageProgressInterval = null;
//let progressButtonActive = false;
//let stageEndEnemyActive = false;
//let stageComplete = false;

function rarityClass(rarity) {
  switch (rarity) {
    case 'common':
      return 'basic';
    case 'uncommon':
      return 'rare';
    case 'rare':
      return 'epic';
    case 'super-rare':
      return 'legendary';
    default:
      return 'basic';
  }
}

function handleRedraw() {
  if (!redrawAllowed) return;
  if (cash < redrawCost) return;
  spendCash(redrawCost);
  redrawCost = redrawCost * 2;
  redrawHand(getCardState());
  renderPlayerStats(stats);
}

function openCardUpgradeSelection(onCloseCallback = null) {
  if (upgradeSelectionOpen) return;
  upgradeSelectionOpen = true;
  gamePaused = true;
  dCardContainer.innerHTML = '';
  upgradeOverlay = createOverlay({ className: 'upgrade-selection-overlay' });
  upgradeOverlay.onClose(() => {
    upgradeSelectionOpen = false;
    dCardContainer.innerHTML = '';
    renderDealerCard();
    gamePaused = false;
    onCloseCallback?.();
  });

  const box = upgradeOverlay.box;
  box.classList.add('upgrade-box');

  const headerWrap = document.createElement('div');
  headerWrap.classList.add('upgrade-header');
  headerWrap.innerHTML = `<h2><i data-lucide="sparkles"></i> Upgrade Selection</h2>`;
  box.appendChild(headerWrap);

  const info = document.createElement('p');
  info.classList.add('upgrade-text');
  info.textContent = 'Choose an upgrade';
  box.appendChild(info);

  const statsRow = document.createElement('div');
  statsRow.classList.add('overlay-stats');
  statsRow.innerHTML = `
    <div>Damage: ${formatNumber(Math.floor(stats.pDamage))}</div>
    <div>Attack: ${(stats.attackSpeed / 1000).toFixed(1)}s</div>
    <div>HP/kill: ${stats.hpPerKill}</div>
    <div>Cash: $${formatNumber(cash)}</div>`;
  box.appendChild(statsRow);


  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('upgrade-cards');
  box.appendChild(cardsContainer);

  const allowed = deckConfigs[selectedDeck]?.upgrades || [];
  const ids = rollNewCardUpgrades(3, allowed);
  const freeIndex = Math.floor(Math.random() * ids.length);
  ids.forEach((id, idx) => {
    const def = cardUpgradeDefinitions[id];
    const baseCost = getCardUpgradeCost(id, { points: stats.points }, stageData);
    const cost = idx === freeIndex ? 0 : baseCost;
    const wrap = document.createElement('div');
    wrap.classList.add('card-wrapper');
    const card = document.createElement('div');
    card.classList.add('card', 'upgrade-card', `rarity-${rarityClass(def.rarity)}`);
    const icon = def.icon || 'sword';
    card.innerHTML = `\n      <div class="card-suit"><i data-lucide="${icon}"></i></div>\n      <div class="card-desc">${def.name} - ${cost === 0 ? 'FREE' : '$' + cost}</div>\n      <div class="card-flavor">${def.flavor || ''}</div>\n    `;
    wrap.appendChild(card);
    if (cash >= cost) {
      wrap.addEventListener('click', () => {
        purchaseCardUpgrade(id, cost);
        closeCardUpgradeSelection();
      });
    } else {
      card.classList.add('unaffordable');
    }
    cardsContainer.appendChild(wrap);
  });
  upgradeOverlay.appendButton('Skip', () => closeCardUpgradeSelection());

  const handRow = document.createElement('div');
  handRow.classList.add('overlay-hand');
  drawnCards.forEach(c => {
    if (!c || !c.wrapperElement) return;
    handRow.appendChild(c.wrapperElement.cloneNode(true));
  });
  box.appendChild(handRow);

  lucide.createIcons({ icons: lucide.icons });
}

function closeCardUpgradeSelection() {
  if (!upgradeSelectionOpen || !upgradeOverlay) return;
  upgradeOverlay.close();
}

function openCamp(onCloseCallback = null) {
  if (campOverlayOpen) return;
  campOverlayOpen = true;
  redrawAllowed = true;
  gamePaused = true;
  hidePlayerAttackBar();
  campOverlay = createOverlay({ className: 'camp-overlay' });
  campOverlay.onClose(() => {
    campOverlayOpen = false;
    redrawAllowed = false;
    gamePaused = false;
    updateRedrawButton();
    onCloseCallback?.();
  });

  const box = campOverlay.box;
  box.classList.add('camp-box');

  const header = document.createElement('h2');
  header.textContent = 'Find the Light';
  box.appendChild(header);

  const sub = document.createElement('p');
  sub.classList.add('camp-subheading', 'speaker-quote');
  sub.textContent = '“Reach for the light. before it\'s too late”';
  box.appendChild(sub);

  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 60;
  canvas.classList.add('camp-fire');
  box.appendChild(canvas);
  drawCampFire(canvas);

  const statsRow = document.createElement('div');
  statsRow.classList.add('overlay-stats');
  statsRow.innerHTML = `
    <div>Damage: ${formatNumber(Math.floor(stats.pDamage))}</div>
    <div>Attack: ${(stats.attackSpeed / 1000).toFixed(1)}s</div>
    <div>HP/kill: ${stats.hpPerKill}</div>
    <div>Cash: $${formatNumber(cash)}</div>`;
  box.appendChild(statsRow);


  const btnRow = document.createElement('div');
  btnRow.classList.add('camp-buttons');
  box.appendChild(btnRow);

  function addBtn(label, handler, infoText) {
    const wrap = document.createElement('div');
    wrap.classList.add('camp-btn');
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.addEventListener('click', handler);
    wrap.appendChild(btn);
    if (infoText) {
      const info = document.createElement('div');
      info.classList.add('camp-btn-info');
      info.textContent = infoText;
      wrap.appendChild(info);
    }
    btnRow.appendChild(wrap);
    return btn;
  }

  addBtn('▶ Continue', () => closeCamp(), 'Resume journey');

  if (stats.cashOutWithoutRedraw) {
    addBtn('💰 Cash Out', () => {
      cashOut();
      closeCamp();
    }, 'Collect chips and quit');
  }

  addBtn('⟳ Redraw & Cash Out', () => {
    cashOut();
    handleRedraw();
    closeCamp();
  }, 'Cash out then draw again');

  addBtn('♥ Heal Party', () => {
    drawnCards.forEach(c => {
      if (!c) return;
      c.currentHp = Math.min(c.maxHp, c.currentHp + c.maxHp * 0.5);
    });
    updateHandDisplay();
    closeCamp();
  }, 'Restore half HP');
  updateRedrawButton();

  const handRow = document.createElement('div');
  handRow.classList.add('overlay-hand');
  drawnCards.forEach(c => {
    if (!c || !c.wrapperElement) return;
    handRow.appendChild(c.wrapperElement.cloneNode(true));
  });
  box.appendChild(handRow);
}

function closeCamp() {
  if (!campOverlayOpen || !campOverlay) return;
  campOverlay.close();
}

function drawCampFire(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw logs
  ctx.fillStyle = '#663300';
  ctx.fillRect(canvas.width / 2 - 20, canvas.height - 10, 40, 6);
  ctx.fillRect(canvas.width / 2 - 10, canvas.height - 16, 40, 6);

  // draw flame gradient
  const grd = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height - 20,
    2,
    canvas.width / 2,
    canvas.height - 30,
    20
  );
  grd.addColorStop(0, 'rgba(255,200,0,0.9)');
  grd.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height - 20, 20, 0, Math.PI * 2);
  ctx.fill();
}

function drawSpeakerIcon(canvas) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  // head
  const cx = width / 2;
  const headR = width * 0.15;
  ctx.beginPath();
  ctx.arc(cx, height * 0.25, headR, 0, Math.PI * 2);
  ctx.fill();
  // body (simple cloak shape)
  ctx.beginPath();
  ctx.moveTo(cx, height * 0.4);
  ctx.lineTo(width * 0.2, height * 0.9);
  ctx.lineTo(width * 0.8, height * 0.9);
  ctx.closePath();
  ctx.fill();
}




// Visual pulse when a card gains health
function animateCardHeal(card) {
  const w = card.wrapperElement;
  runAnimation(w, "heal-animate");
}

// Brief animation shown when a card levels up
function animateCardLevelUp(card) {
  const w = card.wrapperElement;
  runAnimation(w, "levelup-animate");
}

function showUpgradePopup(id) {
  const def = cardUpgradeDefinitions[id];
  if (!def) return;
  const wrapper = document.createElement('div');
  wrapper.classList.add('upgrade-popup');
  wrapper.innerHTML = `
    <div class="card-wrapper">
      <div class="card upgrade-card rarity-${rarityClass(def.rarity)}">
        <div class="card-suit"><i data-lucide="${def.icon || 'sword'}"></i></div>
        <div class="card-desc">${def.name}</div>
      </div>
    </div>`;
  document.body.appendChild(wrapper);
  lucide.createIcons({ icons: lucide.icons });
  setTimeout(() => wrapper.remove(), 3000);
}

// Fade out and remove the card when its HP reaches zero
function animateCardDeath(card, callback) {
  const w = card.wrapperElement;
  if (!w) {
    callback?.();
    return;
  }
  runAnimation(w, "card-death", 600).then(() => callback?.());
}

function healCardsOnKill() {
  drawnCards.forEach(card => {
    if (!card) return;
    card.healFromKill(stats.hpPerKill);
  });
  updateHandDisplay();
  updateDeckDisplay();
}

function renderJokers() {
  if (!jokerContainers.length) return;
  // Ensure mana system activates once the Healing Joker is obtained
  if (unlockedJokers.some(j => j.id === "joker_heal") && !systems.manaUnlocked) {
    unlockManaSystem();
  }

  // Ensure mana system visibility if the healing joker was just unlocked
  if (
    !systems.manaUnlocked &&
    unlockedJokers.find(j => j.id === "joker_heal")
  ) {
    unlockManaSystem();
  }

  jokerContainers.forEach(container => {
    container.innerHTML = "";
    unlockedJokers.forEach(joker => {
      const wrapper = document.createElement("div");
      wrapper.classList.add("card-wrapper", "joker-wrapper");

      const card = document.createElement("div");
      card.classList.add("card");

      const img = document.createElement("img");
      img.classList.add("joker-image");
      img.src = joker.image;
      img.alt = joker.name;

      card.appendChild(img);
      wrapper.appendChild(card);
      container.appendChild(wrapper);

      wrapper.addEventListener("click", e => {
        showJokerTooltip(joker, e.pageX + 10, e.pageY + 10);
        useJoker(joker);
      });
    });
  });
}


function showTooltip(html, x, y) {
  if (!tooltip) return;
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

function hideTooltip() {
  if (tooltip) tooltip.style.display = "none";
}

window.showTooltip = showTooltip;
window.hideTooltip = hideTooltip;

function showJokerTooltip(joker, x, y) {
  showTooltip(
    `<strong>${joker.name}</strong><br>${joker.description}<br>Mana Cost: ${joker.manaCost}`,
    x,
    y
  );
}

document.addEventListener("click", e => {
  if (!e.target.closest(".joker-wrapper")) {
    hideTooltip();
  }
});

function useJoker(joker) {
  if (stats.mana < joker.manaCost) {
    addLog("Not enough mana!", "info");
    return;
  }
  stats.mana -= joker.manaCost;
  updateManaBar();

  switch (joker.abilityType) {
    case "heal": {
      const healAmt = joker.getScaledPower();
      drawnCards.forEach(card => {
        if (!card) return;
        card.currentHp = Math.round(Math.min(card.maxHp, card.currentHp + healAmt));
        card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
        animateCardHeal(card);
        updateBloodSplat(card);
      });
      addLog(`Healed ${healAmt} HP`,
        "heal");
      break;
    }
    case "damage": {
        if (currentEnemy) {
          const dmg = joker.getScaledPower();
          currentEnemy.takeDamage(dmg);
          updateDealerLifeBar(currentEnemy);
          if (currentEnemy.isDefeated()) {
            currentEnemy.onDefeat?.();
          }
          addLog(`Dealt ${dmg} damage`, "damage");
        }
        break;
      }
    case "shield": {
        const sAmt = joker.getScaledPower();
        stats.playerShield += sAmt;
        addLog(`Gained ${sAmt} shield`, "info");
        break;
      }
    case "buff": {
        const {
          finalMultiplier,
          finalDuration
        } = joker.getScaledPower();
        stats.damageMultiplier *= finalMultiplier;
        addLog(`Damage x${finalMultiplier} for ${finalDuration}s`, "info");
        setTimeout(() => {
          stats.damageMultiplier /= finalMultiplier;
        }, finalDuration * 1000);
        break;
      }
  }
  updateHandDisplay();
  updateDeckDisplay();
}

function awardJokerCardByWorld(w) {
  const index = parseInt(w, 10) - 1;
  const template = AllJokerTemplates[index];
  if (!template) {
    console.error("No joker template for world", w);
    return;
  }

  if (unlockedJokers.find(j => j.id === template.id)) {
    // ensure mana unlock persists even if the joker was already granted
    if (template.id === "joker_heal" && !systems.manaUnlocked) {
      unlockManaSystem();
    }
    return;
  }

  unlockedJokers.push(template);
  addLog(`${template.name} unlocked!`, "info");
  if (template.id === "joker_heal" && !systems.manaUnlocked) {
    unlockManaSystem();
  }
  renderJokers();
}

const awardJokerCard = () => awardJokerCardByWorld(stageData.world);

//=========player functions===========

function spawnPlayer() {
  while (drawnCards.length < stats.cardSlots && deck.length > 0) {
    drawCard(getCardState());
  }
  renderDeckTop();
  updatePileCounts();
}

function respawnPlayer() {
  enemyAttackProgress = 0;
  playerStats.hasDied = false;
  Object.assign(stats, BASE_STATS);
  stats.cardSlots = BASE_STATS.cardSlots + attributes.Strength.inventorySlots;
  cash = 0;
  chips = 0;
  resetCashRates(cash);

  resetCardUpgrades();
  pDeck = generateDeck();

  deck = [...pDeck];
  drawnCards = [];
  discardPile = [];
  redrawCost = 10;
  updateRedrawButton();

  rollNewCardUpgrades(2, deckConfigs[selectedDeck]?.upgrades || []);
  renderCardUpgrades(document.querySelector('.card-upgrade-list'), {
    stats,
    stageData,
    cash,
    onPurchase: purchaseCardUpgrade
  });
  shuffleArray(deck);

  handContainer.innerHTML = "";
  discardContainer.innerHTML = "";
  deckTabContainer.innerHTML = "";
  renderDeckTop();
  updatePileCounts();

  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  updateChipsDisplay();
  resetCashRates(cash);
  updateUpgradeButtons();
  stageData.world = 1;
  stageData.stage = 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  renderStageInfo();

  spawnPlayer();
  respawnDealerStage();
  updatePlayerStats(stats);
  // reset baseline so new kills don't award previous points again
  lastCashOutPoints = stats.points;
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  renderGlobalStats();
  renderWorldsMenu();
  checkSpeakerEncounter();
}


let speakerOverlay = null;
function showSpeakerQuote(text) {
  if (speakerOverlay) return;
  speakerOverlay = document.createElement("div");
  speakerOverlay.classList.add("speaker-overlay");
  const msg = document.createElement("div");
  msg.classList.add("speaker-quote");
  msg.textContent = text;
  speakerOverlay.appendChild(msg);
  document.body.appendChild(speakerOverlay);
  setTimeout(hideSpeakerQuote, 8000);
}

function hideSpeakerQuote() {
  if (speakerOverlay) {
    speakerOverlay.remove();
    speakerOverlay = null;
  }
}

// Fully wipe saved data and reload the page
function startNewGame() {
if (typeof localStorage !== "undefined") {
localStorage.removeItem("gameSave");
}
window.removeEventListener("beforeunload", saveGame);
clearInterval(saveInterval);
location.reload();
}

// Shuffle all current cards back into the deck and draw a new hand
// redraw logic moved to cardManagement.js

// Player auto-attack; deals combined damage to the current enemy
function attack() {
if (!currentEnemy) return;

currentEnemy.takeDamage(stats.pDamage);

stageData.dealerLifeCurrent = currentEnemy.currentHp;

if (currentEnemy.isDefeated()) {
currentEnemy.onDefeat?.();
} else {
  dealerLifeDisplay.textContent = `Life: ${formatNumber(Math.floor(
    currentEnemy.currentHp
  ))}/${formatNumber(currentEnemy.maxHp)}`;
  renderDealerLifeBarFill(currentEnemy);
  }
}

/*if (currentEnemy instanceof Boss) {
  // Handle boss damage
  currentEnemy.takeDamage(stats.pDamage);
  stageData.dealerLifeCurrent = currentEnemy.currentHp;
  if (currentEnemy.currentHp <= 0) {
    onBossDefeat(currentEnemy);
    respawnDealer();
    dealerLifeBar();
    cashOut();
    nextWorld();
    dealerDeathAnimation();
  } else {
    dealerLifeDisplay.textContent = `Life: ${formatNumber(Math.floor(currentEnemy.currentHp))}/${formatNumber(currentEnemy.maxHp)}`;
    dealerLifeBar();
  }
} else {
  // Handle regular enemy damage
  if (stageData.dealerLifeCurrent - stats.pDamage <= 0) {
    stageData.kills += 1;
    killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
    respawnDealer();
    dealerLifeBar();
    cardXp(stageData.stage ** 1.2);
    cashOut();
    dealerDeathAnimation();
  } else {
    stageData.dealerLifeCurrent = stageData.dealerLifeCurrent - stats.pDamage;
    dealerLifeDisplay.textContent = `Life: ${formatNumber(Math.floor(stageData.dealerLifeCurrent))}/${formatNumber(stageData.dealerLifeMax)}`;
    dealerLifeBar();
  }
}*/

// Convert points earned this stage into spendable cash
function cashOut() {
  if (chips <= 0) return cash;
  const reward = chips * stats.points;
  cash += reward;
  chips = 0;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  updateChipsDisplay();
  recordCashRates(cash);
  updateUpgradeButtons();
  return cash;
}

// Recalculate combat stats based on cards currently drawn
function updatePlayerStats() {
  // Reset base stats
  stats.pDamage = 0;
  stats.damageMultiplier =
    stats.upgradeDamageMultiplier * barUpgrades.damage.multiplier * stats.extraDamageMultiplier;
  stats.pRegen = 0;
  stats.cashMulti = 1;
  stats.points = 0;

  if (stats.damageBuffExpiration && Date.now() > stats.damageBuffExpiration) {
    stats.damageBuffMultiplier = 1;
  }

  for (const card of drawnCards) {
    if (!card) continue;
    recalcCardHp(card, stats, barUpgrades);

    const suitMult =
      card.suit === "Spades" ? stats.spadeDamageMultiplier || 1 : 1;
    card.damage = (card.baseDamage + 5 * (card.currentLevel - 1)) * suitMult;
    stats.pDamage += card.damage;
    stats.points += card.value;
  }

  stats.pDamage *=
    stats.damageMultiplier *
    stats.damageBuffMultiplier *
    attributes.Strength.meleeDamageMultiplier;

  stats.cardSlots = BASE_STATS.cardSlots + attributes.Strength.inventorySlots;
  renderPlayerStats(stats);
}

//=========save/load functions===========
// Serialize the current game state to localStorage
function saveGame() {
if (typeof localStorage === "undefined") return;

const deckData = pDeck.map(card => ({
suit: card.suit,
value: card.value,
backType: card.backType,
currentLevel: card.currentLevel,
XpCurrent: card.XpCurrent,
XpReq: card.XpReq,
baseDamage: card.baseDamage,
damage: card.damage,
maxHp: card.maxHp,
currentHp: card.currentHp,
baseHpBoost: card.baseHpBoost,
hpPerKill: card.hpPerKill,
job: card.job,
traits: card.traits
}));

const upgradeLevels = Object.fromEntries(
Object.entries(upgrades).map(([k, u]) => [k, u.level])
);
const upgradeUnlocked = Object.fromEntries(
Object.entries(upgrades).map(([k, u]) => [k, u.unlocked])
);

  const state = {
    stats,
    stageData,
    cash,
    chips,
    upgradePowerPurchased,
    lastCashOutPoints,
    cardPoints,
    redrawCost,
    deck: deckData,
    upgrades: upgradeLevels,
    unlockedJokers: unlockedJokers.map(j => j.id),
    playerStats,
    worldProgress,
    barUpgrades,
    lifeCore,
    speechState,
    sectState,
    sectTabUnlocked
  };

try {
localStorage.setItem("gameSave", JSON.stringify(state));
addLog("Game saved!", "info");
} catch (e) {
console.error("Save failed", e);
}
}

// Restore game state from localStorage if available
function loadGame() {
if (typeof localStorage === "undefined") return;
const json = localStorage.getItem("gameSave");
if (!json) return;

try {
const state = JSON.parse(json);
  cash = state.cash || 0;
  chips = state.chips || 0;
  cardPoints = state.cardPoints || 0;
  redrawCost = state.redrawCost || 10;
  upgradePowerPurchased = state.upgradePowerPurchased || 0;
  lastCashOutPoints = state.lastCashOutPoints || 0;
  Object.assign(stats, state.stats || {});
systems.manaUnlocked = (state.stats && state.stats.maxMana > 0);
Object.assign(stageData, state.stageData || {});
Object.assign(playerStats, state.playerStats || {});
  if (state.worldProgress) {
    Object.entries(state.worldProgress).forEach(([id, data]) => {
      if (!worldProgress[id]) worldProgress[id] = data;
      else Object.assign(worldProgress[id], data);
    });
  }

  if (state.lifeCore) {
    Object.assign(lifeCore, state.lifeCore);
  }

    if (state.speechState) {
      const { upgrades: savedUpgrades, ...restSpeech } = state.speechState;
      Object.assign(speechState, restSpeech);
      // ensure the insight orb and resource reference the same object
      if (speechState.orbs && speechState.orbs.insight) {
        speechState.resources.insight = speechState.orbs.insight;
      }
      if (speechState.weather && speechState.weather.days !== undefined) {
        speechState.weather.duration = speechState.weather.days;
        delete speechState.weather.days;
      }
    if (savedUpgrades) {
      Object.entries(savedUpgrades).forEach(([name, data]) => {
        if (speechState.upgrades[name]) {
          Object.assign(speechState.upgrades[name], data);
        } else {
          speechState.upgrades[name] = data;
        }
      });
    }

    // ensure disciples have required stats when loading older saves
    if (Array.isArray(speechState.disciples)) {
      speechState.disciples.forEach(d => {
        if (d.health === undefined) d.health = 10;
        if (d.stamina === undefined) d.stamina = 10;
        if (d.hunger === undefined) d.hunger = 20;
        if (d.power === undefined) d.power = 1;
        if (d.strength === undefined) d.strength = 1;
        if (d.dexterity === undefined) d.dexterity = 1;
        if (d.endurance === undefined) d.endurance = 1;
        if (d.intelligence === undefined) d.intelligence = 1;
        if (d.incapacitated === undefined) d.incapacitated = false;
        if (!d.name) d.name = `Disciple ${d.id}`;
      });
    }
  }

  if (state.sectState) {
    Object.assign(sectState, state.sectState);
  }

  if (state.sectTabUnlocked ||
      (speechState.disciples && speechState.disciples.length > 0)) {
    sectTabUnlocked = true;
    if (playerLexiconSubTabButton) playerLexiconSubTabButton.textContent = 'Sect';
  }

  if (state.barUpgrades) {
    Object.entries(state.barUpgrades).forEach(([k, v]) => {
      if (barUpgrades[k]) Object.assign(barUpgrades[k], v);
    });
  }

if (state.upgrades) {
Object.entries(state.upgrades).forEach(([k, lvl]) => {
if (upgrades[k]) upgrades[k].level = lvl;
});
}
if (state.upgradesUnlocked) {
Object.entries(state.upgradesUnlocked).forEach(([k, unlocked]) => {
if (upgrades[k]) upgrades[k].unlocked = unlocked;
});
}

if (Array.isArray(state.deck)) {
pDeck = state.deck.map(data => {
const c = new Card(data.suit, data.value, data.backType);
Object.assign(c, {
currentLevel: data.currentLevel,
XpCurrent: data.XpCurrent,
XpReq: data.XpReq,
baseDamage: data.baseDamage,
damage: data.damage,
maxHp: data.maxHp,
currentHp: data.currentHp,
baseHpBoost: data.baseHpBoost || 0,
hpPerKill: data.hpPerKill,
job: data.job,
traits: data.traits
});
return c;
});
deck = [...pDeck];
}

unlockedJokers.length = 0;
if (Array.isArray(state.unlockedJokers)) {
  state.unlockedJokers.forEach(id => {
    const j = AllJokerTemplates.find(t => t.id === id);
    if (j) unlockedJokers.push(j);
  });
}

// ensure mana system initializes if the healing joker was saved
if (
  !systems.manaUnlocked &&
  unlockedJokers.find(j => j.id === "joker_heal")
) {
  unlockManaSystem();
}

Object.values(upgrades).forEach(u => u.effect({ stats, pDeck, stageData, systems }));

cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
updateChipsDisplay();
cardPointsDisplay.textContent = `Card Points: ${formatNumber(cardPoints)}`;

  renderJokers();
updateUpgradeButtons();
  renderPlayerStats(stats);
  renderStageInfo();
  renderGlobalStats();
  renderWorldsMenu();
  resetCashRates(cash);
  worldProgressRateTracker.reset(
    computeWorldProgress(stageData.world) * 100
  );
  if (worldProgressPerSecDisplay)
    worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";

  updateManaBar();

  checkUpgradeUnlocks();
  updateUpgradePowerCost();
  renderPurchasedUpgrades();
  applyWorldTheme();
  updateRedrawButton();

  updateWorldTabNotification();
  updateSectDisplay();

addLog("Game loaded!",
"info");
} catch (e) {
console.error("Load failed",
e);
}
}


//=========game loop===========


let lastFrameTime = performance.now();

// Main animation loop; handles ticking the enemy and player actions
function gameLoop(currentTime) {
const rawDelta = currentTime - lastFrameTime;
lastFrameTime = currentTime;
const deltaTime = rawDelta * timeScale;

if (currentEnemy) {
    currentEnemy.tick(deltaTime);

    // Enemy may be cleared during tick (on defeat callbacks)
    if (currentEnemy) {
        updateDealerLifeBar(currentEnemy);

        if (enemyAttackFill) {
            const eratio = Math.min(
                1,
                currentEnemy.attackTimer / currentEnemy.attackInterval
            );
            enemyAttackFill.style.width = `${eratio * 100}%`;
        }

        // Update cooldown overlays
        const overlays = document.querySelectorAll(".cooldown-overlay");
        overlays.forEach((overlay, i) => {
            const ability = currentEnemy.abilities[i];

            // Defensive check: ensure ability has timer + maxTimer
            if (
                ability &&
                typeof ability.timer === "number" &&
                typeof ability.maxTimer === "number"
            ) {
                const ratio = Math.min(
                    1,
                    Math.max(0, ability.timer / ability.maxTimer)
                );
                overlay.style.setProperty("--cooldown", ratio);
            }
        });
    }
}


  updateDrawButton();
  updateRedrawButton();
  updatePlayerStats(stats);
  cashTimer += deltaTime;
  worldProgressTimer += deltaTime;
  if (cashTimer >= 1000) {
    recordCashRates(cash);
    if (statsEconomyContainer && statsEconomyContainer.style.display !== 'none') {
      renderEconomyStats();
    }
    cashTimer = 0;
  }
  if (worldProgressTimer >= 1000) {
    const currentPct = computeWorldProgress(stageData.world) * 100;
    worldProgressRateTracker.record(currentPct);
    if (worldProgressPerSecDisplay) {
      const rate = worldProgressRateTracker.getRate();
      worldProgressPerSecDisplay.textContent = `Avg World Progress/sec: ${rate.toFixed(2)}%`;
    }
    worldProgressTimer = 0;
  }
  if (currentEnemy) {
    playerAttackTimer += deltaTime;
    if (playerAttackFill) {
      const pratio = Math.min(1, playerAttackTimer / stats.attackSpeed);
      playerAttackFill.style.width = `${pratio * 100}%`;
    }
    if (playerAttackTimer >= stats.attackSpeed) {
      attack();
      playerAttackTimer = 0;
      if (playerAttackFill) playerAttackFill.style.width = "0%";
    }
  }

  if (systems.manaUnlocked) {
  stats.mana = Math.min(
  stats.maxMana,
  stats.mana + (stats.manaRegen * deltaTime) / 1000
);
 updateManaBar();
}

  // passive progress for bar upgrades
  tickBarProgress(deltaTime);
  tickSpeech(deltaTime);
  tickSect(deltaTime);
  requestAnimationFrame(gameLoop);
}

//devtools

function toggleDebug() {
const panel = document.getElementById("debugPanel");
panel.style.display = panel.style.display === "none" ? "block": "none";
}

function applyTheme() {
  document.body.classList.toggle('darkenshift-mode', isDarkenshift);
}

function toggleTheme() {
  isDarkenshift = !isDarkenshift;
  localStorage.setItem('isDarkenshift', isDarkenshift);
  applyTheme();
}

document.addEventListener("keydown", e => {
if (e.shiftKey && e.key === "D") {
toggleDebug();
}
});

document.addEventListener("DOMContentLoaded", () => {
const btn = document.getElementById("debugToggle");
if (btn) btn.addEventListener("click", toggleDebug);
});

document.addEventListener("DOMContentLoaded", () => {
  const tbtn = document.getElementById("themeToggle");
  if (tbtn) {
    isDarkenshift = localStorage.getItem('isDarkenshift') === 'true';
    applyTheme();
    tbtn.addEventListener("click", toggleTheme);
  }
});

// Developer helpers exposed on the console for testing
window.devTools = {
  spawnBoss: () => spawnBossEvent(),
  spawnDealer: () => spawnDealerEvent(),
cDealerDamage,
killEnemy: () => {
if (!currentEnemy) return;
currentEnemy.takeDamage(currentEnemy.maxHp);
if (currentEnemy instanceof Boss) {
currentEnemy.onDefeat?.();
}
},
killBoss: () => {
if (currentEnemy instanceof Boss) {
currentEnemy.takeDamage(currentEnemy.maxHp);
currentEnemy.onDefeat?.();
}
},
logEnemy: () => console.log(currentEnemy),
advanceStage: () => nextStage(),

giveCash: () => {
const amount =
parseInt(document.getElementById("debugCash").value) || 0;
cash += amount;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
recordCashRates(cash);
updateUpgradeButtons();
},

setStageWorld: () => {
const stage = parseInt(document.getElementById("debugStage").value);
const world = parseInt(document.getElementById("debugWorld").value);
if (!isNaN(stage)) stageData.stage = stage;
if (!isNaN(world)) stageData.world = world;
renderStage();
respawnDealerStage();
},

setDamageMult: () => {
const mult = parseFloat(
document.getElementById("debugDamageMult").value
);
if (!isNaN(mult)) {
stats.damageMultiplier = mult;
renderPlayerStats(stats);
}
},
addManaRegen: () => {
const amt = parseFloat(document.getElementById("debugManaRegen").value) || 0;
stats.manaRegen += amt;
renderPlayerStats(stats);
},
toggleFastMode: () => {
timeScale = timeScale === 1 ? FAST_MODE_SCALE: 1;
},
save: saveGame,
load: loadGame,
newGame: startNewGame
};