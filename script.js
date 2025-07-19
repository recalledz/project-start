/* eslint-disable no-unused-vars, no-undef */
// Core modules that power combat systems
import { shuffleArray } from "./utils/random.js"; // generic utilities
import Disciple from "./disciple.js";
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
  initStarChart
} from "./starChart.js"; // optional star chart tab
import {
  initSect,
  tickSectSystem,
  sectSystem,
  DAY_LENGTH_SECONDS,
  castConstruct,
  createConstructCard,
  createConstructInfo,
  recipes,
  openWaterRegenPopup,
  unlockConstruct,
  renderConstructCards,
  renderHotbar
} from "./sect.js";
import { SECT_SCHEDULE, getCurrentSchedule } from "./sect.js";
import RateTracker from "./utils/rateTracker.js";
import { formatNumber } from "./utils/numberFormat.js";
import { runAnimation } from "./utils/animation.js";
import { initCore, refreshCore } from './core.js';
import {
  attributes,
  intelligenceXpMultiplier
} from './attributes.js';
import { createOverlay } from './ui/overlay.js';
import { showRestartScreen } from './ui/restartOverlay.js';
import { showLoadErrorOverlay } from './ui/loadErrorOverlay.js';
import { openExplorationOverlay, closeExplorationOverlay, openWorkOverlay, openScheduleOverlay, openPlaceholderOverlay, openResourceOverlay, openBuildOverlay, locationListContainer, explorationListContainer } from "./ui/colonyOverlays.js";
import { calculateKillXp, XP_EFFICIENCY } from './utils/xp.js';
import {
  calculateMaxStamina,
  calculateStaminaRegen
} from './utils/stamina.js';
import {
  calculateMaxWater,
  calculateWaterRegen
} from './utils/water.js';
import { initializeDisciple } from './utils/discipleInit.js';
import { initializeSect } from './utils/sectInit.js';
import {
  // calculateEnemyHp,
  calculateEnemyBasicDamage,
  spawnDealer,
  spawnBoss,
  spawnEnemy
} from "./enemySpawning.js";
import {
  renderCard,
  renderDiscipleCard,
  renderEnemyAttackBar,
  renderPlayerAttackBar,
  renderDealerLifeBarFill,
  applyBloodSplat,
  removeBloodSplat,
  updateBloodSplat
} from "./rendering.js";

// combat mechanics and timers
import {
  init as initCombat,
  discipleAttackTimers,
  enemyAttackProgress,
  setEnemyAttackProgress,
  attack
} from "./game/combat.js";
// in-combat UI helpers
import {
  init as initUi,
  handContainer,
  dealerLifeDisplay,
  showPlayerAttackBar,
  hidePlayerAttackBar,
  updateDealerLifeBar,
  removeDealerLifeBar,
  updateDealerLifeDisplay,
  renderCombatDisciples,
  updateDiscipleStatsDisplay
} from "./game/ui.js";
// disciple selection for combat
import {
  init as initDisciples,
  activeDisciples,
  selectDisciple,
  deselectDisciple,
  clearActiveDisciples
} from "./game/disciples.js";
// developer debug tools
import { init as initDebug } from "./game/debug.js";
// Shared game state and configuration
import {
  currentEnemy,
  setCurrentEnemy,
  stats,
  systems,
  sectState,
  stageData,
  FAST_MODE_SCALE,
  timeScale,
  setTimeScale,
  FRUIT_MAX_CAP,
  FRUIT_GROWTH_RATES
} from "./game/state.js";
import {
  BASE_STATS,
  HUNT_CYCLE_SECONDS,
  HUNT_XP_PER_SUCCESS,
  ANIMALS,
  SOFTWOOD_CYCLE_SECONDS,
  SOFTWOOD_CYCLE_AMOUNT,
  DAILY_FRUIT_CONSUMPTION,
  FRUIT_XP_PER_CYCLE,
  LOG_XP_PER_CYCLE,
  BUILD_XP_RATE,
  RESEARCH_XP_PER_CYCLE,
  CHANT_XP_PER_CYCLE,
  EXPLORATION_CYCLE_SECONDS,
  STAMINA_DRAIN_PER_EXPLORATION,
  DISCIPLE_MAX_HEALTH,
  REST_TIME_SECONDS,
  GATHER_WORK_SECONDS,
  MIN_TRAVEL_SECONDS,
  TRAVEL_SECONDS_PER_UNIT,
  GATHER_SPOTS,
  TASK_ICONS,
  TASK_GROUPS,
  ATTRIBUTE_FOR_GROUP,
  LOCATION_DEFS
} from "./game/constants.js";



// --- Game State ---
// Available disciples under the player's control
// Initialized with three disciples ("frogs") per the documentation
let { disciples } = initializeSect();
// mapping of card back styles
const cardBackImages = {
  "basic-red": "img/basic deck.png"
};
// theme state
let isDarkenshift = false;
// resources and progress trackers
let cardPoints = 0;
function awardAttributePoints(d, group) {
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

function addSkillXp(d, group, amount) {
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

function computeGlobalSkillLevel(id) {
  ensureDiscipleSkills(id);
  const skills = sectState.discipleSkills[id];
  let max = 0;
  for (const xp of Object.values(skills)) {
    const lvl = getTaskSkillProgress(xp).level;
    if (lvl > max) max = lvl;
  }
  return max;
}

function makeBar(value, max, color) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.background = color;
  fill.style.width = `${Math.min(100, (value / max) * 100)}%`;
  bar.appendChild(fill);
  return bar;
}

function formatTime(seconds) {
  if (!isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function createLabeledBar(icon, value, max, color) {
  const row = document.createElement('div');
  row.className = 'disciple-card-row';
  const ic = document.createElement('span');
  ic.className = 'disciple-bar-icon';
  ic.textContent = icon;
  const text = document.createElement('span');
  text.className = 'disciple-bar-text';
  text.textContent = `${Math.round(value)}/${Math.round(max)}`;
  const bar = makeBar(value, max, color);
  bar.classList.add('disciple-card-bar');
  row.appendChild(ic);
  row.appendChild(text);
  row.appendChild(bar);
  return row;
}

function getTaskEta(d) {
  const task = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  if (task === 'Gather Fruit' || task === 'Gather Softwood') {
    const progress = sectState.discipleProgress[d.id] || 0;
    const spot = GATHER_SPOTS[task];
    const travel = Math.max(MIN_TRAVEL_SECONDS, spot.travel * TRAVEL_SECONDS_PER_UNIT);
    const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
    return cycleSeconds - progress;
  } else if (task === 'Research') {
    const researcherCount = sectSystem.disciples.filter(x => sectState.discipleTasks[x.id] === 'Research').length;
    const researchRate = researcherCount * 4;
    const researchProg = sectState.researchProgress % 500;
    return researchRate > 0 ? (500 - researchProg) / researchRate : Infinity;
  } else if (task === 'Building') {
    const buildKey = sectState.currentBuild;
    const buildData = buildKey ? BUILDINGS[buildKey] : null;
    const builderCount = sectSystem.disciples.filter(x => sectState.discipleTasks[x.id] === 'Building').length;
    return buildData && builderCount > 0 ? ((1 - sectState.buildProgress) * buildData.time) / builderCount : Infinity;
  } else if (task === 'Exploration') {
    const progress = sectState.discipleProgress[d.id] || 0;
    return EXPLORATION_CYCLE_SECONDS - progress;
  }
  return 0;
}

function createDiscipleCard(d) {
  const card = document.createElement('div');
  card.className = 'disciple-card';
  const head = document.createElement('div');
  head.className = 'disciple-card-head';
  const icon = document.createElement('div');
  icon.className = 'disciple-card-icon';
  icon.textContent = (d.name || `Disciple ${d.id}`).charAt(0);
  const name = document.createElement('span');
  name.textContent = d.name || `Disciple ${d.id}`;
  const level = document.createElement('span');
  level.className = 'disciple-card-level';
  level.textContent = `Lv${d.combatLevel || 1}`;
  const gLevel = document.createElement('span');
  gLevel.className = 'disciple-card-glevel';
  gLevel.textContent = `Skill ${d.globalLevel || 0}`;
  head.append(icon, name, level, gLevel);
  card.appendChild(head);

  card.appendChild(createLabeledBar('❤️', d.health, DISCIPLE_MAX_HEALTH, '#a33'));
  card.appendChild(
    createLabeledBar('⚡', d.stamina, calculateMaxStamina(d.endurance), '#cc3')
  );
  card.appendChild(createLabeledBar('🍖', d.hunger, 20, '#996633'));

  const task = document.createElement('div');
  task.className = 'disciple-card-task';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  task.textContent = `Task: ${curTask}`;
  const eta = document.createElement('div');
  eta.className = 'disciple-card-eta';
  eta.textContent = `ETA: ${formatTime(getTaskEta(d))}`;
  card.append(task, eta);

  const actions = document.createElement('div');
  actions.className = 'disciple-card-actions';
  const assign = document.createElement('button');
  assign.textContent = 'Assign';
  assign.addEventListener('click', e => {
    e.stopPropagation();
    openDiscipleOverlay(d);
  });
  const statsBtn = document.createElement('button');
  statsBtn.textContent = 'Stats';
  statsBtn.addEventListener('click', e => {
    e.stopPropagation();
    openDiscipleOverlay(d);
  });
  const feedBtn = document.createElement('button');
  feedBtn.textContent = 'Feed';
  feedBtn.addEventListener('click', e => {
    e.stopPropagation();
    if (sectState.fruits > 0 && d.hunger < 20) {
      sectState.fruits -= 1;
      d.hunger = 20;
      updateSectDisplay();
    }
  });
  actions.append(assign, statsBtn, feedBtn);
  card.appendChild(actions);
  d.gLevelLabel = gLevel;
  d.etaLabel = eta;
  d.cardElement = card;
  return card;
}

// Simplified card used in the sect overview list
 export function createSectDiscipleCard(d) {
  const card = document.createElement('div');
  card.className = 'sect-disciple-card';

  const nameLabel = document.createElement('div');
  nameLabel.className = 'bar-label disciple-name';
  nameLabel.textContent = d.name || `Disciple ${d.id}`;
  card.appendChild(nameLabel);

  const lifeBar = makeBar(d.health, DISCIPLE_MAX_HEALTH, '#a33');
  lifeBar.classList.add('life-bar');
  card.appendChild(lifeBar);

  const wrapper = document.createElement('div');
  wrapper.id = `disciple-task-${d.id}`;
  wrapper.className = 'disciple-progress';
  const fill = document.createElement('div');
  fill.className = 'disciple-progress-fill';
  wrapper.appendChild(fill);
  const label = document.createElement('div');
  label.className = 'disciple-progress-label';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  label.textContent = curTask;
  wrapper.appendChild(label);
  card.appendChild(wrapper);

  return card;
}

function ensureDiscipleSkills(id) {
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

function ensureDiscipleConstructXp(id) {
  if (!sectState.discipleConstructXp[id]) {
    sectState.discipleConstructXp[id] = {};
  }
}

function calculateDailyFruitGain() {
  let total = 0;
  sectSystem.disciples.forEach(d => {
    if (sectState.discipleTasks[d.id] === 'Gather Fruit') {
      ensureDiscipleSkills(d.id);
      ensureDiscipleConstructXp(d.id);
      const xp = sectState.discipleSkills[d.id]['Gathering'];
      const lvl = getTaskSkillProgress(xp).level;
      const yieldMult = 1 + 0.05 * d.dexterity + 0.02 * lvl;
      const gatherAmt = Math.min(
        GATHER_SPOTS['Gather Fruit'].baseYield * yieldMult * GATHER_WORK_SECONDS,
        d.inventorySlots
      );
      const travel = Math.max(
        MIN_TRAVEL_SECONDS,
        GATHER_SPOTS['Gather Fruit'].travel * TRAVEL_SECONDS_PER_UNIT
      );
      const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
      const perSecond = gatherAmt / cycleSeconds;
      total += perSecond * DAY_LENGTH_SECONDS;
    }
  });
  return total;
}




const BUILDINGS = {
  bohio: {
    name: 'Bohio',
    time: 600,
    max: 80,
    costFunc: lvl => 20 * Math.pow(2, lvl)
  },
  researchDesk: { name: 'Research Desk', cost: 15, time: 300, max: 1, requires: 'bohio' },
  chantingHall: { name: 'Chanting Hall', cost: 50, time: 600, max: 1, requires: 'researchDesk' }
};

function getHousingName(level) {
  if (level <= 10) return 'Bohio';
  if (level <= 20) return 'Outer Quarters';
  if (level <= 30) return 'Meditation Hall';
  if (level <= 40) return 'Inner Hall';
  if (level <= 50) return 'Immortal Sanctum';
  if (level <= 60) return 'Meditation Hall';
  if (level <= 70) return 'Sky Pavilion';
  return 'Immortal Sanctum';
}

const lifeCore = { real: false };

// Card HP adjustments moved to card.js utilities

// Data for the current stage and world progression

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
  totalBossKills: 0,
  stageKills: {},
  speakerEncounters: 0,
  hasDied: false
};

// Debug time scaling


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



const dom = {
  nextStageArea: document.getElementById("nextStageArea"),
  nextStageProgress: document.getElementById("nextStageProgress"),
  //moveForwardBtn: document.getElementById("moveForwardBtn"),
  fightBossBtn: document.getElementById("fightBossBtn"),
  bossProgress: document.getElementById("bossProgress"),
  campBtn: document.getElementById("campBtn"),
  killsDisplay: document.getElementById("kills"),
  worldProgressPerSecDisplay: document.getElementById("worldProgressPerSecDisplay"),
  dCardContainer: document.getElementsByClassName("dCardContainer")[0],
  dealerContainer: document.querySelector('.dealerContainer'),
  jokerContainers: document.querySelectorAll(".jokerContainer"),
  combatHotbar: document.getElementById('combatHotbar'),
  combatResources: document.getElementById('combatResources'),
  manaBar: document.getElementById("manaBar"),
  manaFill: document.getElementById("manaFill"),
  manaText: document.getElementById("manaText"),
  manaRegenDisplay: document.getElementById("manaRegenDisplay"),
  dpsDisplay: document.getElementById("dpsDisplay")
};
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

//function hideStageProgressBar() {
//  if (stageProgressBar) stageProgressBar.style.display = "none";
//}

//function showStageProgressBar() {
//  if (stageProgressBar) stageProgressBar.style.display = "block";
//}


// attack progress bars
let playerAttackFill = null;
let enemyAttackFill = null;
let worldProgressTimer = 0;
let discipleEtaTimer = 0;
//let sanityTimer = 0;
const worldProgressRateTracker = new RateTracker(30000);
// Chance to trigger a random event each step of movement
// Reduced from 30% to 10% so encounters feel more like rare discoveries
const EVENT_CHANCE = 0.1;

// Load saved state when DOM is ready
window.addEventListener("beforeunload", saveGame);
const saveInterval = setInterval(saveGame, 30000);


//=========tabs==========

let playerStatsTabButton;
let worldSubTabButton;
let cardSubTabButton;
let playerTabButton;
let explorationTabButton;
let locationTabButton;
let logTabButton;
let mainTab;
let cardSubTab;
let starChartTab;
let playerStatsTab;
let worldsTab;
let playerTab;
let explorationTab;
let locationTab;
let logTab;
let activeEffectsContainer;
let tooltip;

let playerCoreSubTabButton;
let playerCorePanel;
let playerConstructSubTabButton;
let playerConstructPanel;
let playerLexiconSubTabButton;
let playerLexiconPanel;
let playerSectSubTabButton;
let playerSectPanel;
let constructLexiconContainer;
let sectSummaryDisplay;
let resourceDisplay;
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
let locationsPanelBtn;
let gateBtn;
let sectDisciplesContainer;
let sectDiscipleListContainer;
let selectedDiscipleId = null;
let discipleInfoView = 'status';
const sectDiscipleEls = {};
export const discipleGatherPhase = {};
let discipleMoveInterval;
let sectTabUnlocked = true;
let statsOverviewSubTabButton;
let statsEconomySubTabButton;
let statsOverviewContainer;
let statsEconomyContainer;
let sectNavWorkBtn;
let sectNavResourceBtn;
let sectNavBuildBtn;
let sectNavChantBtn;
let sectNavMapBtn;
let sectNavInfluenceBtn;
let sectNavResearchBtn;
let sectNavCultivationBtn;
let sectNavScheduleBtn;

const discoveredLocations = [];
const explorationParty = new Set();
let currentExplorationParty = [];

function setActiveTabButton(btn) {
  document.querySelectorAll('.tabsContainer button').forEach(b => {
    b.classList.toggle('active', b === btn);
  });
}

export function addDiscoveredLocation(name) {
  if (discoveredLocations.includes(name)) return;
  discoveredLocations.push(name);
  if (locationListContainer) {
    const row = document.createElement('div');
    row.textContent = name;
    locationListContainer.appendChild(row);
  }
  const map = document.getElementById('colonyMap');
  const def = LOCATION_DEFS.find(l => l.name === name);
  if (map && def) {
    const icon = document.createElement('div');
    icon.className = 'location-icon';
    icon.style.left = def.x;
    icon.style.top = def.y;
    map.appendChild(icon);
  }
  if (locationTabButton && locationTabButton.style.display === 'none') {
    locationTabButton.style.display = '';
  }
  if (
    explorationTabButton &&
    name === 'Esoteric Dungeon' &&
    explorationTabButton.style.display === 'none'
  ) {
    explorationTabButton.style.display = '';
  }
}

function setupTabHandlers() {
  const tabHandlers = [
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
        if (playerConstructSubTabButton) playerConstructSubTabButton.click();
      }
    },
    {
      buttonSelector: '.logTabButton',
      onClick: () => {
        showTab(logTab);
        setActiveTabButton(logTabButton);
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
  if (starChartTab) starChartTab.style.display = "none";
  if (playerStatsTab) playerStatsTab.style.display = "none";
  if (worldsTab) worldsTab.style.display = "none";
  if (playerTab) playerTab.style.display = "none";
  if (explorationTab) explorationTab.style.display = "none";
  if (locationTab) locationTab.style.display = "none";
  if (logTab) logTab.style.display = "none";
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

  playerStatsTabButton = document.querySelector('.playerStatsTabButton');
  cardSubTabButton = document.querySelector('.cardSubTabButton');
  worldSubTabButton = document.querySelector('.worldSubTabButton');
  playerTabButton = document.querySelector('.playerTabButton');
  explorationTabButton = document.querySelector('.explorationTabButton');
  locationTabButton = document.querySelector('.locationTabButton');
  logTabButton = document.querySelector('.logTabButton');
  mainTab = document.querySelector('.mainTab');
  cardSubTab = document.querySelector('.cardSubTab');
  starChartTab = document.querySelector('.starChartTab');
  playerStatsTab = document.querySelector('.playerStatsTab');
  worldsTab = document.querySelector('.worldsTab');
  playerTab = document.querySelector('.playerTab');
  explorationTab = document.querySelector('.explorationTab');
  locationTab = document.querySelector('.locationTab');
  logTab = document.querySelector('.logTab');

  activeEffectsContainer = document.querySelector('.active-effects');
  tooltip = document.getElementById('tooltip');
  playerCoreSubTabButton = document.querySelector(".playerCoreSubTabButton");
  playerCorePanel = document.querySelector(".player-core-panel");
  playerConstructSubTabButton = document.querySelector('.playerConstructSubTabButton');
  playerConstructPanel = document.querySelector('.player-construct-panel');
  playerLexiconSubTabButton = document.querySelector('.playerLexiconSubTabButton');
  playerLexiconPanel = document.querySelector('.player-lexicon-panel');
  playerSectSubTabButton = document.querySelector('.playerSectSubTabButton');
  playerSectPanel = document.querySelector('.player-sect-panel');
  constructLexiconContainer = document.getElementById('constructLexicon');
  sectSummaryDisplay = document.getElementById('sectSummary');
  resourceDisplay = document.getElementById('resourceDisplay');
  sectDisciplesContainer = document.getElementById('sectDisciplesContainer');
  sectDiscipleListContainer = document.getElementById('sectDiscipleList');
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
  locationsPanelBtn = document.getElementById('locationsPanelBtn');
  gateBtn = document.getElementById('gateBtn');
  sectNavWorkBtn = document.getElementById("sectNavWorkBtn");
  sectNavResourceBtn = document.getElementById("sectNavResourceBtn");
  sectNavBuildBtn = document.getElementById("sectNavBuildBtn");
  sectNavChantBtn = document.getElementById("sectNavChantBtn");
  sectNavMapBtn = document.getElementById("sectNavMapBtn");
  sectNavInfluenceBtn = document.getElementById("sectNavInfluenceBtn");
  sectNavResearchBtn = document.getElementById("sectNavResearchBtn");
  sectNavCultivationBtn = document.getElementById("sectNavCultivationBtn");
  sectNavScheduleBtn = document.getElementById("sectNavScheduleBtn");
  statsOverviewSubTabButton = document.querySelector('.statsOverviewSubTabButton');
  statsEconomySubTabButton = document.querySelector('.statsEconomySubTabButton');
  statsOverviewContainer = document.getElementById('statsOverviewContainer');
  statsEconomyContainer = document.getElementById('statsEconomyContainer');
  if (colonyBuildTabButton) colonyBuildTabButton.style.display = systems.buildingUnlocked ? '' : 'none';
  if (colonyResearchTabButton) colonyResearchTabButton.style.display = systems.researchUnlocked ? '' : 'none';
  if (playerSectSubTabButton) playerSectSubTabButton.style.display = sectTabUnlocked ? '' : 'none';
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


  if (locationsPanelBtn)
    locationsPanelBtn.addEventListener('click', openExplorationOverlay);
  if (gateBtn)
    gateBtn.addEventListener('click', () => {
      if (discoveredLocations.length === 0) {
        LOCATION_DEFS.forEach(loc => addDiscoveredLocation(loc.name));
      }
      openExplorationOverlay();
    });
  const navButtons = [sectNavWorkBtn, sectNavResourceBtn, sectNavBuildBtn, sectNavScheduleBtn, sectNavChantBtn, sectNavMapBtn, sectNavInfluenceBtn, sectNavResearchBtn, sectNavCultivationBtn];
  function setActiveNavBtn(btn) {
    navButtons.forEach(b => b && b.classList.remove("active"));
    if (btn) btn.classList.add("active");
  }
  if (sectNavWorkBtn) sectNavWorkBtn.addEventListener("click", () => { setActiveNavBtn(sectNavWorkBtn); openWorkOverlay(); });
  if (sectNavResourceBtn) sectNavResourceBtn.addEventListener("click", () => { setActiveNavBtn(sectNavResourceBtn); openResourceOverlay(); });
  if (sectNavBuildBtn)
    sectNavBuildBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavBuildBtn);
      if (systems.buildingUnlocked) openBuildOverlay();
      else openPlaceholderOverlay("Building");
    });
  if (sectNavScheduleBtn)
    sectNavScheduleBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavScheduleBtn);
      openScheduleOverlay();
    });
  if (sectNavChantBtn) sectNavChantBtn.addEventListener("click", () => { setActiveNavBtn(sectNavChantBtn); openPlaceholderOverlay("Chanting"); });
  if (sectNavMapBtn) sectNavMapBtn.addEventListener("click", () => { setActiveNavBtn(sectNavMapBtn); openExplorationOverlay(); });
  if (sectNavInfluenceBtn) sectNavInfluenceBtn.addEventListener("click", () => { setActiveNavBtn(sectNavInfluenceBtn); openPlaceholderOverlay("Influence"); });
  if (sectNavResearchBtn) sectNavResearchBtn.addEventListener("click", () => { setActiveNavBtn(sectNavResearchBtn); openPlaceholderOverlay("Research"); });
  if (sectNavCultivationBtn) sectNavCultivationBtn.addEventListener("click", () => { setActiveNavBtn(sectNavCultivationBtn); openPlaceholderOverlay("Cultivation"); });  if (playerCoreSubTabButton)
    playerCoreSubTabButton.addEventListener("click", () => {
      if (playerCorePanel) playerCorePanel.style.display = "flex";
      if (playerConstructPanel) playerConstructPanel.style.display = "none";
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
      if (playerSectPanel) playerSectPanel.style.display = 'none';
      playerCoreSubTabButton.classList.add("active");
      if (playerConstructSubTabButton) playerConstructSubTabButton.classList.remove("active");
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.classList.remove('active');
    });
  if (playerConstructSubTabButton)
    playerConstructSubTabButton.addEventListener('click', () => {
      if (playerCorePanel) playerCorePanel.style.display = 'none';
      if (playerConstructPanel) playerConstructPanel.style.display = 'flex';
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
      if (playerSectPanel) playerSectPanel.style.display = 'none';
      playerConstructSubTabButton.classList.add('active');
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove('active');
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.classList.remove('active');
    });
  if (playerLexiconSubTabButton)
    playerLexiconSubTabButton.addEventListener('click', () => {
      if (playerCorePanel) playerCorePanel.style.display = 'none';
      if (playerConstructPanel) playerConstructPanel.style.display = 'none';
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'flex';
      if (playerSectPanel) playerSectPanel.style.display = 'none';
      playerLexiconSubTabButton.classList.add('active');
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove('active');
      if (playerConstructSubTabButton) playerConstructSubTabButton.classList.remove('active');
      if (playerSectSubTabButton) playerSectSubTabButton.classList.remove('active');
    });
  if (playerSectSubTabButton)
    playerSectSubTabButton.addEventListener('click', () => {
      if (playerCorePanel) playerCorePanel.style.display = 'none';
      if (playerConstructPanel) playerConstructPanel.style.display = 'none';
      if (playerLexiconPanel) playerLexiconPanel.style.display = 'none';
      if (playerSectPanel) playerSectPanel.style.display = 'flex';
      startDiscipleMovement();
      playerSectSubTabButton.classList.add('active');
      playerSectSubTabButton.classList.remove('glow-notify');
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove('active');
      if (playerConstructSubTabButton) playerConstructSubTabButton.classList.remove('active');
      if (playerLexiconSubTabButton) playerLexiconSubTabButton.classList.remove('active');
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
      // economy stats removed
    });

  showTab(playerTab); // Start with construct panel visible
  setActiveTabButton(playerTabButton);
  if (playerConstructSubTabButton) playerConstructSubTabButton.click();
}

function initPollen() {
  if (!sectDisciplesContainer) return;
  const layer = document.createElement('div');
  layer.className = 'pollen-layer';
  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'pollen';
    p.style.left = Math.random() * 100 + '%';
    p.style.animationDelay = (Math.random() * 10) + 's';
    p.style.animationDuration = (30 + Math.random() * 20) + 's';
    layer.appendChild(p);
  }
  sectDisciplesContainer.appendChild(layer);
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

function tickSect(delta) {
  if (!sectTabUnlocked) return;
  const dt = delta / 1000;
  const scheduleAction = getCurrentSchedule().action;
  sectSystem.disciples.forEach(d => {
    ensureDiscipleSkills(d.id);
    ensureDiscipleConstructXp(d.id);
    const waterXp = sectState.discipleSkills[d.id].WaterSense || 0;
    const waterLvl = getTaskSkillProgress(waterXp).level;
    const maxWater = calculateMaxWater(waterLvl);
    const waterRegen = calculateWaterRegen(waterLvl);
    d.water = Math.min(maxWater, Math.max(0, d.water + waterRegen * dt));
    const maxStamina = calculateMaxStamina(d.endurance);
    const regenRate = calculateStaminaRegen(d.endurance);
    d.stamina = Math.min(maxStamina, Math.max(0, d.stamina));

    if (d.incapacitated) {
      sectState.discipleTasks[d.id] = 'Idle';
      if (d.health < DISCIPLE_MAX_HEALTH) {
        d.health = Math.min(
          DISCIPLE_MAX_HEALTH,
          d.health + (DISCIPLE_MAX_HEALTH / REST_TIME_SECONDS) * dt
        );
      } else {
        d.stamina = Math.min(maxStamina, d.stamina + regenRate * dt);
        if (d.stamina >= maxStamina) {
          d.incapacitated = false;
          sectState.discipleRest[d.id] = 0;
        }
      }
      return;
    }

    if (scheduleAction === 'Training') {
      d.foundationXp = (d.foundationXp || 0) + 0.4 * d.potential * d.potential * dt;
      return;
    }
    if (scheduleAction !== 'Work') {
      return;
    }

    const task = sectState.discipleTasks[d.id];
    if (task === 'Exploration') {
      // drain stamina once per completed cycle
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
    } else {
      d.stamina = Math.min(maxStamina, d.stamina + regenRate * dt);
    }
    if (task === 'Gather Fruit' || task === 'Gather Softwood') {
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
      sectState.discipleProgress[d.id] += dt;
      const prog = sectState.discipleProgress[d.id];
      const group = TASK_GROUPS[task];
      const skillXp = sectState.discipleSkills[d.id]?.[group] || 0;
      const lvl = getTaskSkillProgress(skillXp).level;
      const spot = GATHER_SPOTS[task];
      const attr = ATTRIBUTE_FOR_GROUP[group];
      const yieldMult = 1 + 0.05 * (d[attr] || 0) + 0.02 * lvl;
      const gatherAmt = Math.min(
        spot.baseYield * yieldMult * GATHER_WORK_SECONDS,
        d.inventorySlots
      );
      const travel = Math.max(MIN_TRAVEL_SECONDS, spot.travel * TRAVEL_SECONDS_PER_UNIT);
      const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
      const resKey = task === 'Gather Fruit' ? 'fruit' : 'softwood';
      if (prog < travel) {
        d.inventory = {};
      } else if (prog < travel + GATHER_WORK_SECONDS) {
        d.inventory = { [resKey]: gatherAmt };
      } else {
        d.inventory = {};
      }
      if (prog >= cycleSeconds) {
        const cycles = Math.floor(prog / cycleSeconds);
        sectState.discipleProgress[d.id] -= cycles * cycleSeconds;
        const deposit = gatherAmt * cycles;
        if (task === 'Gather Fruit') {
          const actual = Math.min(deposit, sectState.availableFruits);
          sectState.availableFruits -= actual;
          sectState.fruits += actual;
        } else {
          sectState.softwood += deposit;
        }
        checkBuildingUnlock();
        const mult = intelligenceXpMultiplier();
        const baseXp = task === 'Gather Fruit' ? FRUIT_XP_PER_CYCLE : LOG_XP_PER_CYCLE;
        const groupKey = TASK_GROUPS[task];
        addSkillXp(d, groupKey, cycles * baseXp * mult);
        d.inventory = {};
        updateSectDisplay();
      }
    } else if (task === 'Research') {
      const spend = Math.min(sectSystem.resources.water.current, 4 * dt);
      sectSystem.resources.water.current -= spend;
      sectState.researchProgress += spend;
      if (sectState.researchProgress >= 500) {
        const xp = sectState.discipleSkills[d.id]?.['Researching'] || 0;
        const lvl = getTaskSkillProgress(xp).level;
        const ptsBase = Math.floor(sectState.researchProgress / 500);
        sectState.researchProgress -= ptsBase * 500;
        const pts = Math.floor(ptsBase * (1 + 0.02 * lvl));
        sectState.researchPoints += pts;
        addSkillXp(
          d,
          'Researching',
          ptsBase * RESEARCH_XP_PER_CYCLE * intelligenceXpMultiplier()
        );
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
      if (sectState.discipleProgress[d.id] >= 5) {
        sectState.discipleProgress[d.id] -= 5;
        const target = sectState.chantAssignments[d.id];
        if (target) {
          const xp = sectState.discipleSkills[d.id]?.['Chanting'] || 0;
          const lvl = getTaskSkillProgress(xp).level;
          const pot = 0.3 * (1 + 0.02 * lvl) * attributes.Intelligence.constructPotencyMultiplier;
          castConstruct(target, null, pot, d.id);
            addSkillXp(d, 'Chanting', CHANT_XP_PER_CYCLE * intelligenceXpMultiplier());
        }
      }
      const spend = Math.min(sectSystem.resources.water.current, dt);
      sectSystem.resources.water.current -= spend;
    } else if (task === 'Hunt') {
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
      sectState.discipleProgress[d.id] += dt;
      if (sectState.discipleProgress[d.id] >= HUNT_CYCLE_SECONDS) {
        sectState.discipleProgress[d.id] -= HUNT_CYCLE_SECONDS;
        const available = Object.entries(sectState.animals).filter(([k, v]) => v > 0);
        if (available.length > 0) {
          const [name] = available[Math.floor(Math.random() * available.length)];
          const animal = ANIMALS.find(a => a.name === name);
          const skillXp = sectState.discipleSkills[d.id]?.['Hunting'] || 0;
          const lvl = getTaskSkillProgress(skillXp).level;
          let chance = d.combatLevel / (d.combatLevel + animal.level);
          if (Math.random() < chance) {
            const yieldAmt = Math.round(animal.yield * (1 + 0.1 * lvl));
            sectState.fruits += yieldAmt;
            sectState.animals[name] -= 1;
            addSkillXp(d, 'Hunting', HUNT_XP_PER_SUCCESS);
            d.gainCombatXp(calculateKillXp(animal.level, 1));
            addLog(`${d.name} hunted a ${name}!`, 'good');
          } else {
            d.health = Math.max(0, d.health - 1);
            addLog(`${d.name} failed to hunt a ${name}.`, 'bad');
          }
        } else {
          addLog('No animals to hunt.', 'info');
        }
      }
    } else if (task === 'Exploration') {
      if (!sectState.discipleProgress[d.id]) sectState.discipleProgress[d.id] = 0;
      sectState.discipleProgress[d.id] += dt;
      if (sectState.discipleProgress[d.id] >= EXPLORATION_CYCLE_SECONDS) {
        sectState.discipleProgress[d.id] -= EXPLORATION_CYCLE_SECONDS;
        const maxDistance = d.stamina * 10;
        const seasonBonus = sectSystem.seasonIndex === 0 ? 0.05 : sectSystem.seasonIndex === 4 ? -0.05 : 0;
        const eligible = LOCATION_DEFS.filter(l => !discoveredLocations.includes(l.name) && l.reqDistance <= maxDistance);
        shuffleArray(eligible);
        let found = null;
        eligible.forEach(loc => {
          if (found) return;
          let chance = loc.baseChance + (d.endurance - 1) * 0.01 + seasonBonus;
          if (Math.random() < chance) {
            addDiscoveredLocation(loc.name);
            found = loc.name;
          }
        });
        if (found) addLog(`Discovered ${found}!`, 'good');
        else addLog('No discovery this trip.', 'info');
        d.stamina = Math.max(0, d.stamina - STAMINA_DRAIN_PER_EXPLORATION);
      }
    } else {
      sectState.discipleProgress[d.id] = 0;
    }
  });
  updateTaskProgressDisplay();
  discipleEtaTimer += delta;
  if (discipleEtaTimer >= 1000) {
    updateSectCardInfo();
    discipleEtaTimer = 0;
  }
  tickBuilding(dt);
}

function updateTaskProgressDisplay() {
  if (!colonyTasksPanel) return;
  const researcherCount = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Research'
  ).length;
  const researchRate = researcherCount * 4;
  const researchProg = sectState.researchProgress % 500;
  const researchPct = (researchProg / 500) * 100;
  const researchTime = researchRate > 0 ? (500 - researchProg) / researchRate : 0;

  const buildKey = sectState.currentBuild;
  const buildData = buildKey ? BUILDINGS[buildKey] : null;
  const builderCount = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Building'
  ).length;
  const buildPct = buildData ? sectState.buildProgress * 100 : 0;
  const buildTime = buildData && builderCount > 0
    ? ((1 - sectState.buildProgress) * buildData.time) / builderCount
    : 0;
  sectSystem.disciples.forEach(d => {
    const wrapper = document.getElementById(`disciple-task-${d.id}`);
    if (!wrapper) return;
    const fill = wrapper.querySelector('.disciple-progress-fill');
    const label = wrapper.querySelector('.disciple-progress-label');
    const rateEl = wrapper.querySelector('.disciple-task-rate');
    const taskName = d.incapacitated
      ? 'Resting'
      : sectState.discipleTasks[d.id] || 'Idle';
    if (taskName === 'Gather Fruit' || taskName === 'Gather Softwood') {
      const progress = sectState.discipleProgress[d.id] || 0;
      const group = TASK_GROUPS[taskName];
      const skillXp = sectState.discipleSkills[d.id]?.[group] || 0;
      const lvl = getTaskSkillProgress(skillXp).level;
      const spot = GATHER_SPOTS[taskName];
      const attr = ATTRIBUTE_FOR_GROUP[group];
      const yieldMult = 1 + 0.05 * (d[attr] || 0) + 0.02 * lvl;
      const gatherAmt = Math.min(
        spot.baseYield * yieldMult * GATHER_WORK_SECONDS,
        d.inventorySlots
      );
      const travel = Math.max(MIN_TRAVEL_SECONDS, spot.travel * TRAVEL_SECONDS_PER_UNIT);
      const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
      let phase = 0;
      let phaseStart = 0;
      let phaseDur = travel;
      if (progress < travel) {
        phase = 0;
        phaseStart = 0;
        phaseDur = travel;
      } else if (progress < travel + GATHER_WORK_SECONDS) {
        phase = 1;
        phaseStart = travel;
        phaseDur = GATHER_WORK_SECONDS;
      } else {
        phase = 2;
        phaseStart = travel + GATHER_WORK_SECONDS;
        phaseDur = travel;
      }
      const pct = ((progress - phaseStart) / phaseDur) * 100;
      const phaseNames = ['Travelling', 'Gathering', 'Hauling'];
      if (fill) fill.style.width = `${pct}%`;
      if (label) label.textContent = phaseNames[phase];
      if (rateEl) {
        const rate = (gatherAmt / cycleSeconds) * 60;
        rateEl.textContent = `+${rate.toFixed(1)}/m`;
      }
    } else if (taskName === 'Research') {
      if (fill) fill.style.width = `${researchPct}%`;
      if (label)
        label.textContent = `Next RP: ${researchRate > 0 ? researchTime.toFixed(1) : '∞'}s`;
      if (rateEl) {
        const rate = 4 * 60;
        rateEl.textContent = `+${rate.toFixed(0)}/m`;
      }
    } else if (taskName === 'Building') {
      if (fill) fill.style.width = `${buildPct}%`;
      if (label && buildData)
        label.textContent = `${buildData.name} ${builderCount > 0 ? buildTime.toFixed(1) : '∞'}s`;
      else if (label) label.textContent = '';
      if (rateEl) rateEl.textContent = '';
    } else if (taskName === 'Hunt') {
      const progress = sectState.discipleProgress[d.id] || 0;
      const pct = (progress / HUNT_CYCLE_SECONDS) * 100;
      if (fill) fill.style.width = `${pct}%`;
      if (label) label.textContent = 'Hunting';
      if (rateEl) rateEl.textContent = '';
    } else if (taskName === 'Exploration') {
      const progress = sectState.discipleProgress[d.id] || 0;
      const pct = (progress / EXPLORATION_CYCLE_SECONDS) * 100;
      if (fill) fill.style.width = `${pct}%`;
      if (label) label.textContent = 'Exploring';
      if (rateEl) rateEl.textContent = '';
    } else if (taskName === 'Resting') {
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = 'Resting';
      if (rateEl) rateEl.textContent = '';
    } else {
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = '';
      if (rateEl) rateEl.textContent = '';
    }
  });
}

function updateSectDisplay() {
  if (!sectTabUnlocked || !playerSectPanel) return;
  const total = sectSystem.disciples.length;
  const assigned = Object.values(sectState.discipleTasks).filter(t => t && t !== 'Idle').length;
  if (sectSummaryDisplay) {
    const remaining = Math.max(0, DAY_LENGTH_SECONDS - sectSystem.seasonTimer);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
    const upkeep = DAILY_FRUIT_CONSUMPTION * sectSystem.disciples.length;
    sectSummaryDisplay.innerHTML = `
      <span>👥 ${total - assigned}/${total} / ${sectState.maxDisciples}</span>
      <span>${sectState.fruits}</span>
      <span>🪵 ${sectState.softwood}</span>`;
    const timer = document.getElementById('resourceTimer');
    if (timer) {
      timer.textContent = `${mm}:${ss}`;
      timer.title = `-${upkeep}/day`;
    }
  }

  const patch = document.getElementById('fruitPatch');
  if (patch) {
    let bar = document.getElementById('fruitBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fruitBar';
      bar.className = 'fruit-bar resource-bar';
      const fill = document.createElement('div');
      fill.className = 'resource-fill fruit';
      bar.appendChild(fill);
      patch.appendChild(bar);
    }
    const fill = bar.querySelector('.resource-fill');
    fill.style.width = `${(sectState.availableFruits / FRUIT_MAX_CAP) * 100}%`;
  }

  const orbs = document.getElementById('sectOrbs');
  if (orbs) {
    orbs.innerHTML = '';
    const mobile = window.innerWidth <= 600;
    const positions = mobile
      ? [{ cls: 'water', left: '50%', top: '10%' }]
      : [{ cls: 'water', left: '50%', top: '5%' }];
    positions.forEach(p => {
      const orb = document.createElement('div');
      orb.className = `sect-orb ${p.cls}`;
      const fill = document.createElement('div');
      fill.className = 'orb-fill';
      orb.appendChild(fill);
      orb.style.left = p.left;
      orb.style.top = p.top;
      if (p.cls === 'water') {
        orb.addEventListener('click', openWaterRegenPopup);
      }
      orbs.appendChild(orb);
      if (p.cls === 'water') {
        const rateEl = document.getElementById('waterRate');
        if (rateEl) {
          const orbSize = mobile ? 30 : 50;
          rateEl.style.top = `calc(${p.top} + ${orbSize}px)`;
          rateEl.textContent = `${sectSystem.gains.water.toFixed(2)}/s`;
        }
      }
    });
  }

  if (sectDisciplesContainer) {
    sectSystem.disciples.forEach(d => {
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
      if (!sectSystem.disciples.find(d => d.id == id)) {
        sectDiscipleEls[id].remove();
        delete sectDiscipleEls[id];
      }
    });
    startDiscipleMovement();
  }

  // Refresh the simplified disciple list
  renderSectDiscipleList();

  if (colonyTasksPanel) renderColonyTasks();
  if (colonyInfoPanel) renderColonyInfo();
  if (colonyResourcesPanel) renderColonyResources();
}

function updateMapBrightness(phase) {
  const map = document.getElementById('colonyMap');
  if (!map) return;
  const values = {
    Morning: 1,
    Midday: 1.2,
    Afternoon: 1,
    Evening: 0.6,
    Night: 0.3
  };
  map.style.filter = `brightness(${values[phase] || 1})`;
}

function feedDisciples() {
  sectSystem.disciples.forEach(d => {
    if (sectState.fruits >= DAILY_FRUIT_CONSUMPTION) {
      sectState.fruits -= DAILY_FRUIT_CONSUMPTION;
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
  const patch = document.getElementById('fruitPatch');
  if (!basket || !patch) return;

  const progress = sectState.discipleProgress[id] || 0;
  const task = sectState.discipleTasks[id];
  const d = sectSystem.disciples.find(x => x.id === id);
  const group = TASK_GROUPS[task];
  const lvl = getTaskSkillProgress(
    sectState.discipleSkills[id]?.[group] || 0
  ).level;
  const spot = GATHER_SPOTS[task];
  const attr = ATTRIBUTE_FOR_GROUP[group];
  const yieldMult = 1 + 0.05 * (d[attr] || 0) + 0.02 * lvl;
  const gatherAmt = Math.min(
    spot.baseYield * yieldMult * GATHER_WORK_SECONDS,
    d?.inventorySlots || 10
  );
  const travel = Math.max(MIN_TRAVEL_SECONDS, spot.travel * TRAVEL_SECONDS_PER_UNIT);
  const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
  let phase = 0;
  if (progress < travel) phase = 0;
  else if (progress < travel + GATHER_WORK_SECONDS) phase = 1;
  else phase = 2;

  if (discipleGatherPhase[id] === phase) return;
  discipleGatherPhase[id] = phase;

  const bx = basket.offsetLeft + basket.offsetWidth / 2 - 8;
  const by = basket.offsetTop + basket.offsetHeight / 2 - 8;
  const px = patch.offsetLeft + patch.offsetWidth / 2 - 8;
  const py = patch.offsetTop + patch.offsetHeight / 2 - 8;

  switch (phase) {
    case 0: // travelling out
      el.style.opacity = '1';
      el.style.transform = `translate(${px}px, ${py}px)`;
      break;
    case 1: // gathering (stay outside, hidden)
      el.style.opacity = '0';
      el.style.transform = `translate(${px}px, ${py}px)`;
      break;
    case 2: // hauling back
      el.style.opacity = '1';
      el.style.transform = `translate(${bx}px, ${by}px)`;
      break;
  }
}

function startDiscipleMovement() {
  if (discipleMoveInterval) return;
  discipleMoveInterval = setInterval(() => {
    sectSystem.disciples.forEach(d => {
      const el = sectDiscipleEls[d.id];
      if (!el) return;
      if (d.incapacitated) {
        const orb = document.querySelector('#sectOrbs .water');
        if (orb) {
          const bx = orb.offsetLeft + orb.offsetWidth / 2 - 2;
          const by = orb.offsetTop + orb.offsetHeight / 2 - 2;
          el.style.transform = `translate(${bx}px, ${by}px)`;
        }
        el.classList.add('incapacitated');
      } else {
        el.classList.remove('incapacitated');
        const phase = getCurrentSchedule().action;
        if (phase === 'Sleep' || phase === 'Training') {
          const orb = document.querySelector('#sectOrbs .water');
          if (orb) {
            const bx = orb.offsetLeft + orb.offsetWidth / 2 - 2;
            const by = orb.offsetTop + orb.offsetHeight / 2 - 2;
            el.style.transform = `translate(${bx}px, ${by}px)`;
          }
        } else {
          const task = sectState.discipleTasks[d.id];
          if (task === 'Gather Fruit' || task === 'Gather Softwood')
            updateDiscipleGather(d.id, el);
          else moveDisciple(el);
        }
      }
    });
  }, 3000);
}

 export function renderColonyTasks() {
  colonyTasksPanel.innerHTML = '';
  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  heading.textContent = 'Tasks';
  colonyTasksPanel.appendChild(heading);

  sectSystem.disciples.forEach(d => {
    const row = document.createElement('div');
    row.className = 'task-entry';
    if (d.id === selectedDiscipleId) row.classList.add('selected');
    const current = d.incapacitated
      ? 'Resting'
      : sectState.discipleTasks[d.id] || 'Idle';
    if (current === 'Idle') row.classList.add('idle');
    row.addEventListener('click', () => {
      selectedDiscipleId = d.id;
      renderColonyTasks();
      renderColonyInfo();
    });
    const icon = document.createElement('span');
    icon.textContent = TASK_ICONS[current] || '⚪️';
    const label = document.createElement('div');
    label.textContent = d.name || `Disciple ${d.id}`;
    label.addEventListener('dblclick', () => {
      const nn = prompt('Rename disciple', d.name || `Disciple ${d.id}`);
      if (nn) {
        d.name = nn;
        renderColonyTasks();
        renderColonyInfo();
      }
    });
    const taskName = document.createElement('div');
    taskName.className = 'disciple-task-name';
    taskName.textContent = current;

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
    const rate = document.createElement('div');
    rate.className = 'disciple-task-rate';
    rate.id = `disciple-rate-${d.id}`;
    taskInfo.appendChild(rate);

    row.appendChild(icon);
    row.appendChild(label);
    row.appendChild(taskName);
    row.appendChild(taskInfo);
    colonyTasksPanel.appendChild(row);
  });
  updateTaskProgressDisplay();
}

function renderColonyInfo() {
  colonyInfoPanel.innerHTML = '';
  const heading = document.createElement('div');
  heading.className = 'panel-heading';
  heading.textContent = 'Proficiencies';
  colonyInfoPanel.appendChild(heading);
  const d = sectSystem.disciples.find(x => x.id === selectedDiscipleId);
  if (!d) {
    const info = document.createElement('div');
    info.textContent = 'Select a disciple';
    colonyInfoPanel.appendChild(info);
    return;
  }
  const taskList = document.createElement('div');
  taskList.className = 'disciple-skill-list';
  const tasks = ['Idle', 'Gather Fruit', 'Gather Softwood', 'Hunt', 'Building'];
  if (sectState.buildings.researchDesk > 0) tasks.push('Research');
  if (sectState.buildings.chantingHall > 0) tasks.push('Chant');
  if (systems.explorationUnlocked) tasks.push('Exploration');
  tasks.forEach(t => {
    const option = document.createElement('div');
    option.className = 'disciple-skill-option';
    if (d.incapacitated) option.classList.add('disabled');

    const skills = sectState.discipleSkills[d.id] || {};
    const groupKey = TASK_GROUPS[t];
    const prog = getTaskSkillProgress(skills[groupKey] || 0);

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
      if (d.incapacitated) return;
      const prev = sectState.discipleTasks[d.id];
      sectState.discipleTasks[d.id] = t;
      discipleGatherPhase[d.id] = -1;
      if (prev === 'Chant' && t !== 'Chant') {
        delete sectState.chantAssignments[d.id];
        if (typeof renderConstructCards === 'function') {
          renderConstructCards();
        }
      }
      renderColonyTasks();
      renderColonyInfo();
      updateSectDisplay();
      // Ensure constructor panel reflects new chanter assignments
      if (typeof renderChantDisciples === 'function') {
        renderChantDisciples();
      }
    });

    taskList.appendChild(option);
  });

  colonyInfoPanel.appendChild(taskList);
}

function renderColonyResources() {
  colonyResourcesPanel.innerHTML = '';
  renderSectDiscipleList();
  if (sectSummaryDisplay && resourceDisplay) {
    const content = resourceDisplay.querySelector('.vignette-content');
    (content || resourceDisplay).appendChild(sectSummaryDisplay);
  }
  checkBuildingUnlock();
}

function checkBuildingUnlock() {
  if (!systems.buildingUnlocked && sectState.softwood >= 20) {
    systems.buildingUnlocked = true;
    if (colonyBuildTabButton) colonyBuildTabButton.style.display = '';
  }
}

function startBuilding(key) {
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
  renderColonyResources();
  renderColonyBuildPanel();
  if (updateBuildOverlay) updateBuildOverlay();
}

function tickBuilding(dt) {
  if (!sectState.currentBuild) return;
  let speed = 0;
  sectSystem.disciples.forEach(d => {
    const t = sectState.discipleTasks[d.id];
    if (!t || t === 'Idle' || t === 'Building') {
      ensureDiscipleSkills(d.id);
      ensureDiscipleConstructXp(d.id);
      const xp = sectState.discipleSkills[d.id]['Building'];
      const lvl = getTaskSkillProgress(xp).level;
      speed += 1 + 0.02 * lvl;
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
      if (colonyResearchTabButton) colonyResearchTabButton.style.display = '';
    }
    renderColonyBuildPanel();
    if (updateBuildOverlay) updateBuildOverlay();
  }
  else {
    if (updateBuildOverlay) updateBuildOverlay();
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
    const name = key === 'bohio' ? getHousingName(built + 1) : b.name;
    btn.textContent = `${name} (${built}/${b.max})`;
    btn.disabled = built >= b.max || sectState.currentBuild;
    btn.addEventListener('click', () => startBuilding(key));
    row.appendChild(btn);
    if (sectState.currentBuild === key) {
      const bar = document.createElement('div');
      bar.className = 'disciple-progress';
      const fill = document.createElement('div');
      fill.className = 'disciple-progress-fill';
      fill.style.width = `${(sectState.buildProgress * 100).toFixed(0)}%`;
      const text = document.createElement('div');
      text.className = 'disciple-progress-label';
      text.textContent = `${(sectState.buildProgress * 100).toFixed(0)}%`;
      bar.appendChild(fill);
      bar.appendChild(text);
      row.appendChild(bar);
    } else {
      const cost = document.createElement('div');
      const c = b.costFunc ? b.costFunc(built + 1) : b.cost;
      cost.textContent = `Cost: ${c} Softwood`;
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

  const bar = document.createElement('div');
  bar.className = 'research-progress';
  const fill = document.createElement('div');
  fill.className = 'research-progress-fill';
  const prog = sectState.researchProgress % 500;
  fill.style.width = `${(prog / 500) * 100}%`;
  bar.appendChild(fill);
  colonyResearchPanel.appendChild(bar);

  const researchers = sectSystem.disciples.filter(
    d => sectState.discipleTasks[d.id] === 'Research'
  ).length;
  const rate = researchers * 4;
  const time = rate > 0 ? ((500 - prog) / rate).toFixed(1) : '∞';
  const info = document.createElement('div');
  info.className = 'research-progress-info';
  info.textContent = `Water Rate: ${rate}/s | Next RP in ${time}s`;
  colonyResearchPanel.appendChild(info);
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
  if (!systems.voiceOfThePeople) {
    const btn = document.createElement('button');
    btn.textContent = 'Voice of the People (5 RP)';
    btn.disabled = sectState.researchPoints < 5;
    btn.addEventListener('click', () => {
      if (sectState.researchPoints >= 5) {
        sectState.researchPoints -= 5;
        systems.voiceOfThePeople = true;
        addLog('Research complete: Voice of the People', 'good');
        renderColonyResearchPanel();
      }
    });
    colonyResearchPanel.appendChild(btn);
  }
  if (!systems.explorationUnlocked) {
    const btn = document.createElement('button');
    btn.textContent = 'Foreseers Research (10 RP)';
    btn.disabled = sectState.researchPoints < 10;
    btn.addEventListener('click', () => {
      if (sectState.researchPoints >= 10) {
        sectState.researchPoints -= 10;
        systems.explorationUnlocked = true;
        addLog('Research complete: Foreseers', 'good');
        unlockConstruct('Sonic Boom');
        renderColonyResearchPanel();
        if (typeof renderColonyTasks === 'function') renderColonyTasks();
        if (typeof renderColonyInfo === 'function') renderColonyInfo();
      }
    });
    colonyResearchPanel.appendChild(btn);
  }
}

function renderDiscipleList() {
  if (!colonyInfoPanel) return;
  colonyInfoPanel.innerHTML = '';
  sectSystem.disciples.forEach(d => {
    const row = document.createElement('div');
    row.className = 'task-entry';
    if (d.id === selectedDiscipleId) row.classList.add('selected');
    row.textContent = d.name || `Disciple ${d.id}`;
    row.addEventListener('click', () => {
      selectedDiscipleId = d.id;
      discipleInfoView = 'status';
      renderDiscipleList();
      renderDiscipleDetails();
    });
    colonyInfoPanel.appendChild(row);
  });
}

function renderDiscipleDetails() {
  if (!colonyResourcesPanel) return;
  colonyResourcesPanel.innerHTML = '';
  const d = sectSystem.disciples.find(x => x.id === selectedDiscipleId);
  if (!d) {
    colonyResourcesPanel.textContent = 'Select a disciple';
    return;
  }

  const container = document.createElement('div');
  container.className = 'disciple-details';

  const header = document.createElement('div');
  header.className = 'disciple-details-header';
  const nameSpan = document.createElement('span');
  nameSpan.textContent = d.name || `Disciple ${d.id}`;
  header.appendChild(nameSpan);

  const views = [
    { key: 'status', label: 'Status' },
    { key: 'life', label: 'Life Stats' },
    { key: 'casting', label: 'Casting Stats' },
    { key: 'combat', label: 'Combat Stats' }
  ];
  views.forEach(v => {
    const btn = document.createElement('button');
    btn.textContent = v.label;
    if (discipleInfoView === v.key) btn.classList.add('active');
    btn.addEventListener('click', () => {
      discipleInfoView = v.key;
      renderDiscipleDetails();
    });
    header.appendChild(btn);
  });
  container.appendChild(header);

  let body;
  if (discipleInfoView === 'status') body = buildDiscipleStatusView(d);
  else if (discipleInfoView === 'life') body = buildDiscipleLifeStatsView(d);
  else if (discipleInfoView === 'casting') body = buildDiscipleCastingStatsView(d);
  else if (discipleInfoView === 'combat') body = buildDiscipleCombatStatsView(d);
  if (body) container.appendChild(body);

  colonyResourcesPanel.appendChild(container);
}

function buildDiscipleStatusView(d) {
  const body = document.createElement('div');
  const stats = [
    { label: 'Health', color: '#a33', value: d.health, max: 10 },
    {
      label: 'Stamina',
      color: '#cc3',
      value: d.stamina,
      max: calculateMaxStamina(d.endurance)
    },
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
    body.appendChild(wrapper);
  });
  const task = document.createElement('div');
  const curTask = d.incapacitated
    ? 'Resting'
    : sectState.discipleTasks[d.id] || 'Idle';
  task.textContent = `Current Task: ${curTask}`;
  body.appendChild(task);

  const invRow = document.createElement('div');
  const entries = Object.entries(d.inventory || {});
  const filled = entries.reduce((a, [_, v]) => a + v, 0);
  const desc = entries.map(([k, v]) => `${v} ${k}`).join(', ');
  invRow.textContent = `Inventory: ${filled}/${d.inventorySlots}` + (desc ? ` (${desc})` : '');
  body.appendChild(invRow);

  const attrInfo = [
    {
      label: 'Strength',
      value: d.strength,
      base: d.baseStrength ?? 1,
      effect:
        `Melee Damage ×${(1 + 0.05 * (d.strength - 1)).toFixed(2)}, ` +
        `+${Math.floor((d.strength - 1) / 2)} Inventory Slots`,
      skills: 'Gather Softwood, Mining & Smithing'
    },
    {
      label: 'Dexterity',
      value: d.dexterity,
      base: d.baseDexterity ?? 1,
      effect: `Attack Speed ×${(1 + 0.05 * (d.dexterity - 1)).toFixed(2)}`,
      skills: 'Gather Softwood & Gather Fruit'
    },
    {
      label: 'Intelligence',
      value: d.intelligence,
      base: d.baseIntelligence ?? 1,
      effect: `Construct Potency ×${(1 + 0.03 * (d.intelligence - 1)).toFixed(2)}`,
      skills: 'Chant & Research'
    },
    {
      label: 'Endurance',
      value: d.endurance,
      base: d.baseEndurance ?? 1,
      effect:
        `Stamina ×${(1 + 0.05 * (d.endurance - 1)).toFixed(2)}, ` +
        `Regen ×${(1 + 0.01 * (d.endurance - 1)).toFixed(2)}, ` +
        `+${10 * (d.endurance - 1)} HP`,
      skills: 'Building, Defending & Combat'
    },
    {
      label: 'Charisma',
      value: d.charisma,
      base: d.baseCharisma ?? 1,
      effect: `Recruit Chance ×${(1 + 0.05 * (d.charisma - 1)).toFixed(2)}`,
      skills: 'Recruiting & Diplomacy'
    },
    {
      label: 'Potential',
      value: d.potential,
      base: d.basePotential ?? d.potential,
      effect: `Inner Cauldron Size ${d.potential * 500}`,
      skills: 'Cultivation'
    }
  ];
  const attrContainer = document.createElement('div');
  attrInfo.forEach(a => {
    const row = document.createElement('div');
    const diff = a.value - a.base;
    const gainText = diff > 0 ? ` (+${diff})` : '';
    row.textContent = `${a.label} ${a.value}${gainText} (${a.effect} – boosts ${a.skills} XP)`;
    attrContainer.appendChild(row);
  });
  body.appendChild(attrContainer);
  return body;
}

function buildDiscipleLifeStatsView(d) {
  const body = document.createElement('div');
  const skillMap = sectState.discipleSkills[d.id] || {};
  const tasks = [
    { name: 'Gather Fruit', effect: 'yield' },
    { name: 'Gather Softwood', effect: 'yield' },
    { name: 'Building', effect: 'speed' },
    { name: 'Research', effect: 'research pts' },
    { name: 'Chant', effect: 'potency' }
  ];
  tasks.forEach(t => {
    const groupKey = TASK_GROUPS[t.name] || t.name;
    const xp = skillMap[groupKey] || 0;
    const prog = getTaskSkillProgress(xp);
    const row = document.createElement('div');
    const isGather = t.name === 'Gather Fruit' || t.name === 'Gather Softwood';
    const mult = 1 + (isGather ? 0.05 : 0.02) * prog.level;
    row.textContent = `${t.name} Lv ${prog.level} (×${mult.toFixed(2)} ${t.effect})`;
    body.appendChild(row);
  });
  return body;
}

function buildDiscipleCastingStatsView(d) {
  const body = document.createElement('div');
  Object.keys(sectSystem.constructPotency).forEach(name => {
    const mult = sectSystem.constructPotency[name] || 1;
    const row = document.createElement('div');
    row.className = 'disciple-skill-option';
    row.textContent = `${name} ×${mult.toFixed(2)}`;
    body.appendChild(row);
  });
  return body;
}

function buildDiscipleCombatStatsView(d) {
  const body = document.createElement('div');
  const atkPerSec = (1000 / d.attackSpeed).toFixed(2);
  const defense = Math.round(d.defense ?? 0);
  body.innerHTML =
    `Level ${d.combatLevel}<br>` +
    `Damage ${Math.round(d.damage)}<br>` +
    `Attack/s ${atkPerSec}<br>` +
    `Defense ${defense}`;
  return body;
}

function buildDiscipleGeneralView(d) {
  const body = document.createElement('div');
  body.className = 'disciple-general';
  const name = document.createElement('div');
  name.className = 'disciple-name';
  name.textContent = d.name || `Disciple ${d.id}`;
  const status = document.createElement('div');
  status.className = 'disciple-status';
  status.textContent = d.incapacitated ? 'Incapacitated' : 'Healthy';
  body.appendChild(name);
  body.appendChild(status);

  const vit = document.createElement('div');
  vit.className = 'vital-stats';
  vit.appendChild(
    makeStatRow(
      'Health',
      d.health,
      DISCIPLE_MAX_HEALTH,
      'linear-gradient(90deg,#b33,#e66)'
    )
  );
  const staminaRow = makeStatRow(
    'Stamina',
    d.stamina,
    calculateMaxStamina(d.endurance),
    'linear-gradient(90deg,#3b3,#7f7)'
  );
  const stamRate = document.createElement('span');
  stamRate.textContent = ` (+${calculateStaminaRegen(d.endurance).toFixed(2)}/s)`;
  staminaRow.appendChild(stamRate);
  vit.appendChild(staminaRow);
  const waterLvl = getTaskSkillProgress(
    sectState.discipleSkills[d.id]?.WaterSense || 0
  ).level;
  const waterRow = makeStatRow(
    'Water',
    d.water,
    calculateMaxWater(waterLvl),
    'linear-gradient(90deg,#39f,#6cf)'
  );
  const waterRate = document.createElement('span');
  waterRate.textContent = ` (+${calculateWaterRegen(waterLvl).toFixed(2)}/s)`;
  waterRow.appendChild(waterRate);
  vit.appendChild(waterRow);
  const hungerRow = makeStatRow(
    'Hunger',
    d.hunger,
    20,
    'linear-gradient(90deg,#bb7,#dd5)'
  );
  const hungerRate = document.createElement('span');
  hungerRate.textContent = ' (-1/day)';
  hungerRow.appendChild(hungerRate);
  vit.appendChild(hungerRow);
  body.appendChild(vit);

  const task = document.createElement('div');
  task.className = 'active-task';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  task.innerHTML = `<strong>Task:</strong> ${curTask} (ETA: ${formatTime(getTaskEta(d))})`;
  body.appendChild(task);

  const entries = Object.entries(d.inventory || {});
  const filled = entries.reduce((a, [_, v]) => a + v, 0);
  const desc = entries.map(([k, v]) => `${v} ${k}`).join(', ');
  const inv = document.createElement('div');
  inv.className = 'disciple-inventory-summary';
  inv.textContent = `Inventory: ${filled}/${d.inventorySlots}` +
    (desc ? ` (${desc})` : '');
  body.appendChild(inv);
  return body;
}

function makeStatRow(label, value, max, color) {
  const row = document.createElement('div');
  row.className = 'stat-row';
  const lbl = document.createElement('div');
  lbl.textContent = label;
  const bar = makeBar(value, max, color);
  bar.classList.add('vital-bar');
  const val = document.createElement('div');
  val.textContent = `${value}/${max}`;
  row.appendChild(lbl);
  row.appendChild(bar);
  row.appendChild(val);
  return row;
}

function buildDiscipleStatsView(d) {
  const container = document.createElement('div');
  container.className = 'disciple-stats-view';
  // Vital stats moved to general view

  const table = document.createElement('table');
  table.className = 'attribute-table';
  const rows = [
    {
      label: 'Strength',
      value: d.strength,
      base: d.baseStrength ?? 1,
      effect:
        `Melee ×${(1 + 0.05 * (d.strength - 1)).toFixed(2)}, +${Math.floor(
          (d.strength - 1) / 2
        )} inventory, +XP: Log, Mine, Smith`,
      cls: 'strength'
    },
    {
      label: 'Dexterity',
      value: d.dexterity,
      base: d.baseDexterity ?? 1,
      effect:
        `Speed ×${(1 + 0.05 * (d.dexterity - 1)).toFixed(2)}, +XP: Woodcut, Gather Fruit`,
      cls: 'dexterity'
    },
    {
      label: 'Intelligence',
      value: d.intelligence,
      base: d.baseIntelligence ?? 1,
      effect:
        `Potency ×${(1 + 0.03 * (d.intelligence - 1)).toFixed(2)}, +XP: Chant, Research`,
      cls: 'intelligence'
    },
    {
      label: 'Endurance',
      value: d.endurance,
      base: d.baseEndurance ?? 1,
      effect:
        `Stamina ×${(1 + 0.05 * (d.endurance - 1)).toFixed(2)}, Regen ×${(
          1 + 0.01 * (d.endurance - 1)
        ).toFixed(2)}, +${10 * (d.endurance - 1)} HP, +XP: Build, Defend, Combat`,
      cls: 'endurance'
    }
  ];
  rows.forEach(r => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const diff = r.value - r.base;
    const gainText = diff > 0 ? ` (+${diff})` : '';
    td1.textContent = `${r.label} ${r.value}${gainText}`;
    td1.className = `attr-${r.cls}`;
    const td2 = document.createElement('td');
    td2.textContent = r.effect;
    tr.appendChild(td1);
    tr.appendChild(td2);
    table.appendChild(tr);
  });
  container.appendChild(table);
  return container;
}

function buildDiscipleInventoryView(d) {
  const body = document.createElement('div');
  const entries = Object.entries(d.inventory || {});
  const filled = entries.reduce((a, [_, v]) => a + v, 0);
  const header = document.createElement('div');
  header.textContent = `Slots ${filled}/${d.inventorySlots}`;
  body.appendChild(header);
  const list = document.createElement('ul');
  entries.forEach(([k, v]) => {
    const li = document.createElement('li');
    li.textContent = `${v} ${k}`;
    list.appendChild(li);
  });
  body.appendChild(list);
  return body;
}

function buildDiscipleGearView() {
  const body = document.createElement('div');
  body.textContent = 'No gear equipped';
  return body;
}

function buildDiscipleProficiencyView(d) {
  const container = document.createElement('div');
  const groups = {
    Gathering: ['Gather Fruit'],
    Logging: ['Gather Softwood'],
    Building: ['Building'],
    Chanting: ['Chant'],
    Researching: ['Research'],
    WaterSense: []
  };
  const effects = {
    Gathering: 'yield',
    Logging: 'yield',
    Building: 'speed',
    Chanting: 'potency',
    Researching: 'research pts',
    WaterSense: 'water'
  };
  Object.entries(groups).forEach(([name, tasks]) => {
    const xp = sectState.discipleSkills[d.id]?.[name] || 0;
    const prog = getTaskSkillProgress(xp);
    const entry = document.createElement('div');
    entry.className = 'skill-group';
    const head = document.createElement('div');
    const isGather = name === 'Gathering' || name === 'Logging';
    const mult = 1 + (isGather ? 0.05 : 0.02) * prog.level;
    const effect = effects[name];
    head.textContent = `${name} Lv ${prog.level}` +
      (effect ? ` (×${mult.toFixed(2)} ${effect})` : '');
    const bar = document.createElement('div');
    bar.className = 'disciple-skill-progress';
    const fill = document.createElement('div');
    fill.className = 'disciple-skill-progress-fill';
    fill.style.width = `${Math.floor(prog.progress * 100)}%`;
    bar.appendChild(fill);
    head.appendChild(bar);
    entry.appendChild(head);
    container.appendChild(entry);
  });
  return container;
}

function buildDiscipleConstructsView() {
  const container = document.createElement('div');
  const list = document.createElement('div');
  list.className = 'saved-constructs';
  sectSystem.savedConstructs.forEach(name => {
    const wrap = document.createElement('div');
    wrap.className = 'construct-card-wrapper';
    const card = createConstructCard(name);
    wrap.appendChild(card);
    const info = createConstructInfo(name);
    if (info) wrap.appendChild(info);
    list.appendChild(wrap);
  });
  container.appendChild(list);
  return container;
}

function buildDiscipleMoodletsView() {
  const container = document.createElement('div');
  container.textContent = 'No active moodlets';
  return container;
}

function renderSectDiscipleList() {
  if (!sectDiscipleListContainer) return;
  sectDiscipleListContainer.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'sect-disciple-list';
  sectSystem.disciples.forEach(d => {
    const card = createSectDiscipleCard(d);
    card.addEventListener('click', () => openDiscipleOverlay(d));
    list.appendChild(card);
  });
  sectDiscipleListContainer.appendChild(list);
}

let discipleOverlay = null;
let discipleOverlayData = { disciple: null };
let discipleOverlayActiveTab = 'general';
function openDiscipleOverlay(d) {
  if (discipleOverlay) {
    discipleOverlay.close();
  } else {
    discipleOverlayActiveTab = d.lastTab || 'general';
    if (discipleOverlayActiveTab === 'skills') discipleOverlayActiveTab = 'proficiency';
    if (discipleOverlayActiveTab === 'inventory' || discipleOverlayActiveTab === 'gear') {
      discipleOverlayActiveTab = 'general';
    }
  }
  discipleOverlay = createOverlay({ className: 'disciple-overlay' });
  const { box } = discipleOverlay;

  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', discipleOverlay.close);
  box.appendChild(closeBtn);

  const tabs = document.createElement('div');
  tabs.className = 'disciple-tabs';
  box.appendChild(tabs);
  const content = document.createElement('div');
  box.appendChild(content);

  const defs = [
    { key: 'general', label: 'General' },
    { key: 'proficiency', label: 'Proficiency' },
    { key: 'constructs', label: 'Constructs' },
    { key: 'moodlets', label: 'Moodlets' },
    { key: 'stats', label: 'Stats' }
  ];
  let active = discipleOverlayActiveTab;
  function render() {
    content.innerHTML = '';
    if (active === 'general') {
      const view = buildDiscipleGeneralView(d);
      content.appendChild(view);
    } else if (active === 'proficiency') {
      content.appendChild(buildDiscipleProficiencyView(d));
    } else if (active === 'constructs') {
      content.appendChild(buildDiscipleConstructsView(d));
    } else if (active === 'moodlets') {
      content.appendChild(buildDiscipleMoodletsView(d));
    } else if (active === 'stats') {
      const c = document.createElement('div');
      const genSection = document.createElement('div');
      genSection.className = 'disciple-stats-general';
      const genTitle = document.createElement('h3');
      genTitle.textContent = 'General Stats';
      genSection.appendChild(genTitle);
      genSection.appendChild(buildDiscipleStatsView(d));
      const combatSection = document.createElement('div');
      combatSection.className = 'disciple-stats-combat';
      const comTitle = document.createElement('h3');
      comTitle.textContent = 'Combat Stats';
      combatSection.appendChild(comTitle);
      combatSection.appendChild(buildDiscipleCombatStatsView(d));
      c.appendChild(genSection);
      c.appendChild(combatSection);
      content.appendChild(c);
    }
    if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  }
  defs.forEach(def => {
    const btn = document.createElement('button');
    btn.textContent = def.label;
    if (def.key === active) btn.classList.add('active');
    btn.addEventListener('click', () => {
      active = def.key;
      discipleOverlayActiveTab = def.key;
      tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
      render();
    });
    tabs.appendChild(btn);
  });
  discipleOverlayData.disciple = d;
  render();
  discipleOverlay.onClose(() => {
    if (discipleOverlayData.disciple) {
      discipleOverlayData.disciple.lastTab = discipleOverlayActiveTab;
    }
    discipleOverlayData.disciple = null;
  });
}

function buildDiscipleSkillsList(d) {
  const container = document.createElement('div');
  const groups = {
    Gathering: ['Gather Fruit'],
    Logging: ['Gather Softwood'],
    Building: ['Building'],
    Chanting: ['Chant'],
    Researching: ['Research']
  };
  const effects = {
    Gathering: 'yield',
    Logging: 'yield',
    Building: 'speed',
    Chanting: 'potency',
    Researching: 'research pts'
  };
  Object.entries(groups).forEach(([name, tasks]) => {
    const xp = sectState.discipleSkills[d.id]?.[name] || 0;
    const prog = getTaskSkillProgress(xp);
    const entry = document.createElement('div');
    entry.className = 'skill-group';
    const head = document.createElement('div');
    const isGather = name === 'Gathering' || name === 'Logging';
    const mult = 1 + (isGather ? 0.05 : 0.02) * prog.level;
    const effect = effects[name];
    head.textContent = `${name} Lv ${prog.level}` +
      (effect ? ` (×${mult.toFixed(2)} ${effect})` : '');
    const bar = document.createElement('div');
    bar.className = 'disciple-skill-progress';
    const fill = document.createElement('div');
    fill.className = 'disciple-skill-progress-fill';
    fill.style.width = `${Math.floor(prog.progress * 100)}%`;
    bar.appendChild(fill);
    head.appendChild(bar);
    entry.appendChild(head);
    const list = document.createElement('div');
    list.style.display = 'none';
    tasks.forEach(t => {
      const opt = document.createElement('div');
      opt.className = 'skill-task-option';
      opt.textContent = t;
      opt.addEventListener('click', () => {
        if (!d.incapacitated) {
          sectState.discipleTasks[d.id] = t;
          discipleGatherPhase[d.id] = -1;
          discipleOverlay.close();
          updateSectDisplay();
        }
      });
      list.appendChild(opt);
    });
    head.addEventListener('click', () => {
      list.style.display = list.style.display === 'none' ? 'block' : 'none';
    });
    entry.appendChild(list);
    container.appendChild(entry);
  });
  return container;
}

 export function renderExplorationTab() {
  if (!explorationListContainer) return;
  explorationListContainer.innerHTML = '';
  sectSystem.disciples.forEach(d => {
    const row = document.createElement('label');
    row.className = 'exploration-entry';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = d.id;
    cb.checked = explorationParty.has(d.id);
    cb.addEventListener('change', () => {
      if (cb.checked) explorationParty.add(d.id);
      else explorationParty.delete(d.id);
    });
    row.appendChild(cb);
    row.appendChild(createDiscipleCard(d));
    explorationListContainer.appendChild(row);
  });
}

 export function startExploration() {
  if (!explorationListContainer) return;
  explorationParty.clear();
  explorationListContainer
    .querySelectorAll('input[type="checkbox"]:checked')
    .forEach(cb => explorationParty.add(parseInt(cb.value)));
  currentExplorationParty = Array.from(explorationParty);
  if (currentExplorationParty.length > 0) {
    clearActiveDisciples();
    currentExplorationParty.forEach(id => {
      const d = sectSystem.disciples.find(x => x.id === id);
      if (d) {
        selectDisciple(d);
      }
    });
    closeExplorationOverlay();
    showTab(mainTab);
    setActiveTabButton(playerTabButton);
    respawnDealerStage();
  }
}

 function triggerOrbFlash() {
  const orbs = document.querySelectorAll('#sectOrbs .sect-orb');
  orbs.forEach(o => {
    o.classList.add('flash');
    setTimeout(() => o.classList.remove('flash'), 500);
  });
}


//========render functions==========
function init() {
  // now the DOM is in, and lucide.js has run, so window.lucide is defined
  initSect();
  initTabs();
  initPollen();
  initCombat();
  initUi();
  initDisciples();
  initDebug();
  window.addEventListener('location-discovered', e => addDiscoveredLocation(e.detail.name));
  loadGame();
  if (sectSystem.disciples.length === 0) {
    sectSystem.disciples.push(...disciples);
    sectTabUnlocked = true;
    if (playerSectSubTabButton) playerSectSubTabButton.style.display = '';
    updateSectDisplay();
  }
  checkBuildingUnlock();
  if (systems.researchUnlocked && colonyResearchTabButton) {
    colonyResearchTabButton.style.display = '';
  }
  if (systems.buildingUnlocked && colonyBuildTabButton) {
    colonyBuildTabButton.style.display = '';
  }
  updateSectDisplay();
  initVignetteToggles();
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  initCore();
  renderConstructLexicon();
  document.addEventListener('day-passed', () => {
    sectSystem.disciples.forEach(d => {
      d.stamina = Math.min(
        calculateMaxStamina(d.endurance),
        d.stamina + calculateStaminaRegen(d.endurance)
      );
    });
    sectState.availableFruits = Math.min(
      FRUIT_MAX_CAP,
      sectState.availableFruits + FRUIT_GROWTH_RATES[sectSystem.seasonIndex]
    );
    ANIMALS.forEach(a => {
      const count = sectState.animals[a.name] || 0;
      if (count < a.max && Math.random() < a.spawnRate) {
        sectState.animals[a.name] = count + 1;
      }
    });
    updateSectDisplay();
    if (colonyResourcesPanel && colonyResourcesPanel.style.display !== 'none') {
      renderDiscipleDetails();
    }
  });
  document.addEventListener('schedule-phase', e => {
    updateMapBrightness(e.detail.phase);
    if (e.detail.phase === 'Evening') feedDisciples();
  });
  document.addEventListener('disciple-gained', e => {
    if (!sectTabUnlocked && e.detail.count >= 1) {
      sectTabUnlocked = true;
      if (playerSectSubTabButton) playerSectSubTabButton.style.display = '';
      addLog('A presence stirs. The first disciple has heard the Calling.', 'info');
    }
    if (playerSectSubTabButton && !playerSectSubTabButton.classList.contains('active')) {
      playerSectSubTabButton.classList.add('glow-notify');
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
  showColonyTab('resources');
  updatePlayerStats(stats);
  // Start or resume the game after loading
  spawnPlayer();
  respawnDealerStage();
  renderDealerCard();
  resetStageCashStats();
  renderStageInfo();
  renderWorldsMenu();

  if (dom.nextStageArea) {
    dom.nextStageArea.addEventListener("click", () => {
      if (stageData.kills >= STAGE_KILL_REQUIREMENT) {
        openCamp(() => nextStage());
      }
    });
  }
  dom.fightBossBtn.addEventListener("click", () => {
    dom.fightBossBtn.style.display = "none";
    spawnBossEvent();
  });
  if (dom.campBtn) {
    dom.campBtn.addEventListener('click', () => {
      dom.campBtn.style.display = 'none';
      openCamp(() => nextStage());
    });
  }
  const buttons = document.querySelector('.buttonsContainer');
  playerAttackFill = renderPlayerAttackBar(buttons);
  hidePlayerAttackBar(playerAttackFill);

  const btn = document.getElementById("debugToggle");
  if (btn) btn.addEventListener("click", toggleDebug);

  const tbtn = document.getElementById("themeToggle");
  if (tbtn) {
    isDarkenshift = localStorage.getItem('isDarkenshift') === 'true';
    applyTheme();
    tbtn.addEventListener("click", toggleTheme);
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener("DOMContentLoaded", init);

// life rendering moved to rendering.js

function updateManaBar() {
  if (!dom.manaBar) return;
  if (!systems.manaUnlocked) {
    dom.manaBar.style.display = "none";
    return;
  }
  dom.manaBar.style.display = "flex";
  const ratio = stats.maxMana > 0 ? stats.mana / stats.maxMana: 0;
  if (dom.manaFill) dom.manaFill.style.width = `${Math.min(1, ratio) * 100}%`;
  if (dom.manaText) dom.manaText.textContent = `${Math.floor(stats.mana)}/${Math.floor(stats.maxMana)}`;
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
  // establish baseline mana values
  const baseMana = 50;
  stats.maxMana = baseMana;
  stats.mana = stats.maxMana;
  stats.manaRegen = 0.01;
  updatePlayerStats(stats);
  updateManaBar();
}

//stage

export function renderStageInfo() {
  const stageDisplay = document.getElementById("stage");
  stageData.kills = playerStats.stageKills[stageData.stage] || stageData.kills || 0;
  const lvl = worldProgress[stageData.world]?.level || 1;
  stageDisplay.textContent = `Stage ${stageData.stage} World ${stageData.world} (Lv ${lvl})`;
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageAvailability();
  updateBossProgress();
}

export function renderPlayerStats(stats) {
  const damageDisplay = document.getElementById("damageDisplay");
  const hpPerKillDisplay = document.getElementById("hpPerKillDisplay");
  const attackSpeedDisplay = document.getElementById("attackSpeedDisplay");
  const combatLevelDisplay = document.getElementById("combatLevelDisplay");
  const avgProfDisplay = document.getElementById("avgProfDisplay");

  damageDisplay.textContent = `Damage: ${formatNumber(Math.floor(stats.pDamage))}`;
  combatLevelDisplay.textContent = `Combat Lv: ${stats.avgCombatLevel.toFixed(1)}`;
  if (avgProfDisplay) {
    avgProfDisplay.textContent = `Avg Skill Lv: ${stats.avgProficiencyLevel.toFixed(1)}`;
  }
  attackSpeedDisplay.textContent = `Attack Speed: ${(stats.attackSpeed / 1000).toFixed(1)}s`;
  if (dom.manaRegenDisplay) {
    dom.manaRegenDisplay.textContent = `Mana Regen: ${stats.manaRegen.toFixed(2)}/s`;
  }
  if (dom.dpsDisplay) {
    const dps = stats.pDamage / (stats.attackSpeed / 1000);
    dom.dpsDisplay.textContent = `DPS: ${dps.toFixed(2)}`;
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



function renderConstructLexicon() {
  if (!constructLexiconContainer) return;
  constructLexiconContainer.innerHTML = '';
  recipes.forEach(r => {
    const wrap = document.createElement('div');
    wrap.className = 'construct-card-wrapper';
    const card = createConstructCard(r.name);
    wrap.appendChild(card);
    const info = createConstructInfo(r.name);
    if (info) wrap.appendChild(info);
    constructLexiconContainer.appendChild(wrap);
  });
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
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
  dom.dCardContainer.innerHTML = '';
  dom.dCardContainer.appendChild(card);
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
    dom.fightBossBtn.style.display = "inline-block";
  } else if (id == stageData.world) {
    dom.fightBossBtn.style.display = "none";
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
export function nextStage() {
  playerStats.stageKills[stageData.stage] = stageData.kills;
  stageData.stage += 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  const isBossStage = stageData.stage % 10 === 0;
  resetStageCashStats();
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateNextStageAvailability();
  renderGlobalStats();
  renderStageInfo();
  checkSpeakerEncounter();
  inCombat = false;
  setCurrentEnemy(null);
  redrawAllowed = false;
  if (dom.nextStageArea) dom.nextStageArea.classList.remove('glow-notify');
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
  applyWorldTheme();
  resetStageCashStats();
  worldProgressTimer = 0;
  worldProgressRateTracker.reset(computeWorldProgress(stageData.world) * 100);
  if (dom.worldProgressPerSecDisplay) {
    dom.worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";
  }
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateBossProgress();
  updateNextStageAvailability();
  renderGlobalStats();
  renderStageInfo();
  inCombat = false;
  setCurrentEnemy(null);
  redrawAllowed = false;
  if (dom.nextStageArea) dom.nextStageArea.classList.remove('glow-notify');
  respawnDealerStage();
}

// Travel to a specific world when selected in the Worlds tab
function goToWorld(id) {
  if (!worldProgress[id] || !worldProgress[id].unlocked) return;
  playerStats.stageKills[stageData.stage] = stageData.kills;
  stageData.world = parseInt(id);
  stageData.stage = 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  resetStageCashStats();
  worldProgressTimer = 0;
  worldProgressRateTracker.reset(computeWorldProgress(stageData.world) * 100);
  if (dom.worldProgressPerSecDisplay) {
    dom.worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";
  }
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateBossProgress();
  renderGlobalStats();
  renderStageInfo();
  inCombat = false;
  setCurrentEnemy(null);
  redrawAllowed = false;
  if (dom.nextStageArea) dom.nextStageArea.classList.remove('glow-notify');
  renderWorldsMenu();
  updateWorldTabNotification();
  respawnDealerStage();
}

// Reset tracking for average cash when a new stage begins
function resetStageCashStats() {
  // no cash stats
}

function updateNextStageAvailability() {
  if (!dom.nextStageArea) return;
  if (stageData.kills >= STAGE_KILL_REQUIREMENT) {
    dom.nextStageArea.classList.add('glow-notify');
    dom.nextStageArea.classList.add('clickable');
  } else {
    dom.nextStageArea.classList.remove('glow-notify');
    dom.nextStageArea.classList.remove('clickable');
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
  setProgress(dom.nextStageProgress, stageData.kills / STAGE_KILL_REQUIREMENT);
}

function updateBossProgress() {
  setProgress(dom.bossProgress, computeWorldProgress(stageData.world));
}

// Enable the next stage button when kill requirements met
//function nextStageChecker() {}

//dealer

// Spawn logic moved to enemySpawning.js

// Adjust the width of the dealer's HP bar

export function spawnDealerEvent(powerMult = 1) {
  inCombat = true;
  removeDealerLifeBar();
  const temp = { ...stageData, stage: Math.round(stageData.stage * powerMult) };
  setCurrentEnemy(spawnEnemy('dealer', temp, enemyAttackProgress, onDealerDefeat));
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}

export function spawnBossEvent() {
  inCombat = true;
  removeDealerLifeBar();
  const data = worldProgress[stageData.world];
  const bossStage = 10 * (data?.level || 1);
  const temp = { ...stageData, stage: bossStage };
  setCurrentEnemy(spawnEnemy('boss', temp, enemyAttackProgress, () => onBossDefeat(currentEnemy)));
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
export function respawnDealerStage() {
  removeDealerLifeBar();
  if (speakerEncounterPending) {
    speakerEncounterPending = false;
    setCurrentEnemy(spawnEnemy('speaker', stageData, enemyAttackProgress, onSpeakerDefeat));
  } else {
    setCurrentEnemy(spawnEnemy('dealer', stageData, enemyAttackProgress, onDealerDefeat));
  }
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}

// What happens after defeating a regular dealer
function onDealerDefeat() {
  if (!currentEnemy) return;
  // capture remaining attack progress before resetting
  setEnemyAttackProgress(
    currentEnemy.attackTimer / currentEnemy.attackInterval
  );
  // clear enemy immediately to prevent repeated callbacks
  setCurrentEnemy(null);
  combatXp(calculateKillXp(stageData.stage, stageData.world));
  stageData.kills += 1;
  playerStats.stageKills[stageData.stage] = stageData.kills;
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageAvailability();
  renderGlobalStats();
  recordWorldKill(stageData.world, stageData.stage);
  dealerDeathAnimation();
    dealerBarDeathAnimation(() => {
      inCombat = false;
      updateDealerLifeDisplay();
      hidePlayerAttackBar(playerAttackFill);
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
    showTab(playerTab);
    setActiveTabButton(playerTabButton);
  }
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    setCurrentEnemy(null);
    combatXp(calculateKillXp(stageData.stage, stageData.world));
    updateDealerLifeDisplay();
    hidePlayerAttackBar(playerAttackFill);
    respawnDealerStage();
  });
}

// Called when the player defeats a boss enemy
function onBossDefeat(boss) {
  // capture remaining attack progress before resetting
  setEnemyAttackProgress(boss.attackTimer / boss.attackInterval);
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
  setCurrentEnemy(null);

  playerStats.totalBossKills += 1;
  renderGlobalStats();

  checkSpeakerEncounter();
  // Unlock and immediately travel to the next world
  updateWorldTabNotification();
  renderWorldsMenu();
  dom.fightBossBtn.style.display = "none";
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    setCurrentEnemy(null);
    combatXp(boss.xp);
    hidePlayerAttackBar(playerAttackFill);
    nextWorld();
  });
}

// Spawn the boss that appears every 10 stages
// Spawn logic moved to enemySpawning.js


// Determine how much health an enemy or boss should have
// enemy scaling moved to enemySpawning.js

// Apply damage from the enemy to the first card in the player's hand
export function cDealerDamage(damageAmount = null, ability = null, source = "dealer") {
  const targets = activeDisciples;
  if (targets.length === 0) {
    playerStats.hasDied = true;
    showRestartScreen(returnPartyToSect);
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

  // randomly target one of the available targets
  const idx = Math.floor(Math.random() * targets.length);
  const card = targets[idx];

  // subtract **one** hit’s worth
  card.currentHp = Math.round(Math.max(0, card.currentHp - finalDamage));
  const targetName = card.name ? card.name : `${card.value}${card.symbol}`;
  addLog(
    `${source} hit ${targetName} for ${finalDamage} damage!`,
    "damage"
  );

  // update its specific HP display
  if (card.hpDisplay) {
    card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
  }
  if (card.wrapperElement) {
    animateCardHit(card);
    // Show actual damage dealt after shield reduction
    showDamageFloat(card, finalDamage);
  }
  updateBloodSplat(card);
  // if it’s dead, remove it
  if (card.currentHp === 0) {
    {
      activeDisciples.splice(idx, 1);
      card.incapacitated = true;
      card.health = 0;
      card.stamina = 0;
      sectState.discipleTasks[card.id] = 'Idle';
      animateCardDeath(card, () => {
        removeBloodSplat(card);
        card.wrapperElement?.remove();
        if (activeDisciples.length === 0) {
          playerStats.hasDied = true;
          showRestartScreen(returnPartyToSect);
        }
      });
    }
  }
  // Optional ability logic (e.g., healing, fireball
}

globalThis.cDealerDamage = cDealerDamage;

function dealerDeathAnimation() {
  const dCardWrapper = document.querySelector(".dCardWrapper:last-child");
  const dCardPane = document.querySelector(".dCardPane");
  if (!dCardWrapper) {
    dom.dCardContainer.innerHTML = "";
    renderDealerCard();
    return;
  }
  runAnimation(dCardWrapper, "dealer-dead").then(() => {
    dom.dCardContainer.innerHTML = "";
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

function combatXp(xpAmount) {
  activeDisciples.forEach(d => {
    if (!d) return;
    d.gainCombatXp(xpAmount);
  });
  updatePlayerStats();
  updateHandDisplay();
}

// Update the draw button depending on party size
function updateDrawButton() {
  const drawBtn = document.getElementById('clickalipse');
  if (!drawBtn) return;
  drawBtn.disabled = false;
  drawBtn.style.background = 'green';
}



// Refresh the cards currently shown in the player's hand
function updateHandDisplay() {
  activeDisciples.forEach(d => {
    if (!d || !d.hpDisplay) return;
    d.hpDisplay.textContent = `HP: ${Math.round(d.currentHp)}/${Math.round(d.maxHp)}`;
    if (d.xpLabel) {
      d.xpLabel.textContent = `LV: ${d.combatLevel}`;
    }
    if (d.gLevelLabel) {
      d.gLevelLabel.textContent = `Skill ${d.globalLevel}`;
    }
    if (d.xpBarFill) {
      const pct = (d.combatXp / d.xpForNextLevel()) * 100;
      d.xpBarFill.style.width = `${Math.min(pct, 100)}%`;
    }
    updateDiscipleStatsDisplay(d);
    updateBloodSplat(d);
  });
}

function updateSectCardInfo() {
  sectSystem.disciples.forEach(d => {
    if (d.etaLabel) {
      d.etaLabel.textContent = `ETA: ${formatTime(getTaskEta(d))}`;
    }
    const lvl = computeGlobalSkillLevel(d.id);
    if (lvl > d.globalLevel) {
      d.globalLevel = lvl;
      if (d.gLevelLabel) d.gLevelLabel.textContent = `Skill ${d.globalLevel}`;
      if (d.cardElement) runAnimation(d.cardElement, 'levelup-animate');
    } else if (d.gLevelLabel) {
      d.gLevelLabel.textContent = `Skill ${d.globalLevel}`;
    }
  });
}


// Create DOM elements for a card in the player's hand
// card rendering moved to rendering.js

let gamePaused = false;
let campOverlayOpen = false;
let campOverlay = null; // overlay instance
let inCombat = false;
let redrawAllowed = false;
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



function openCamp(onCloseCallback = null) {
  if (campOverlayOpen) return;
  campOverlayOpen = true;
  redrawAllowed = true;
  gamePaused = true;
  hidePlayerAttackBar(playerAttackFill);
  campOverlay = createOverlay({ className: 'camp-overlay' });
  campOverlay.onClose(() => {
    campOverlayOpen = false;
    redrawAllowed = false;
    gamePaused = false;
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
    <div>HP/kill: ${stats.hpPerKill}</div>`;
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

  addBtn('♥ Heal Party', () => {
    activeDisciples.forEach(c => {
      if (!c) return;
      c.currentHp = Math.min(c.maxHp, c.currentHp + c.maxHp * 0.5);
    });
    updateHandDisplay();
    closeCamp();
  }, 'Restore half HP');
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

// Fade out and remove the card when its HP reaches zero
function animateCardDeath(card, callback) {
  const w = card.wrapperElement;
  if (!w) {
    callback?.();
    return;
  }
  runAnimation(w, "card-death", 600).then(() => callback?.());
}




//=========player functions===========

function spawnPlayer() {
  clearActiveDisciples();
  // Ensure disciples start combat at full health
  disciples.forEach(d => {
    d.currentHp = d.maxHp;
  });
  disciples.slice(0, stats.combatSlots).forEach(d => selectDisciple(d));
  renderCombatDisciples();
}

function respawnPlayer() {
  setEnemyAttackProgress(0);
  playerStats.hasDied = false;
  Object.assign(stats, BASE_STATS);
  stats.combatSlots = BASE_STATS.combatSlots + attributes.Strength.inventorySlots;
  // reset resources

  resetCardUpgrades();
  clearActiveDisciples();
  stageData.world = 1;
  stageData.stage = 1;
  stageData.kills = playerStats.stageKills[stageData.stage] || 0;
  renderStageInfo();

  spawnPlayer();
  respawnDealerStage();
  updatePlayerStats(stats);
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  renderGlobalStats();
  renderWorldsMenu();
  checkSpeakerEncounter();
}

function returnPartyToSect() {
  currentExplorationParty.forEach(id => {
    const d = sectSystem.disciples.find(x => x.id === id);
    if (d) {
      d.currentHp = 0;
      d.health = 0;
      d.stamina = 0;
      d.incapacitated = true;
      sectState.discipleTasks[d.id] = 'Idle';
    }
  });
  currentExplorationParty = [];
  clearActiveDisciples();
  inCombat = false;
  setCurrentEnemy(null);
  removeDealerLifeBar();
  hidePlayerAttackBar(playerAttackFill);
  playerStats.hasDied = false;
  showTab(playerTab);
  setActiveTabButton(playerTabButton);
  if (playerSectSubTabButton) playerSectSubTabButton.click();
  updateSectDisplay();
  renderDiscipleList();
  renderDiscipleDetails();
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
export function startNewGame() {
if (typeof localStorage !== "undefined") {
localStorage.removeItem("gameSave");
}
window.removeEventListener("beforeunload", saveGame);
clearInterval(saveInterval);
location.reload();
}

// Regroup disciples and refresh the combat party




// Recalculate combat stats based on cards currently drawn
function updatePlayerStats() {
  // Reset base stats
  stats.pDamage = 0;
  stats.damageMultiplier =
    stats.upgradeDamageMultiplier * stats.extraDamageMultiplier;
  stats.pRegen = 0;
  stats.avgCombatLevel = 0;
  stats.avgProficiencyLevel = 0;
  stats.attackSpeed = 0;

  if (stats.damageBuffExpiration && Date.now() > stats.damageBuffExpiration) {
    stats.damageBuffMultiplier = 1;
  }



  // Calculate average proficiency level of disciples
  if (sectSystem && Array.isArray(sectSystem.disciples)) {
    let total = 0;
    sectSystem.disciples.forEach(d => {
      total += d.globalLevel || 0;
    });
    if (sectSystem.disciples.length > 0) {
      stats.avgProficiencyLevel = total / sectSystem.disciples.length;
    }
  }

  stats.pDamage *=
    stats.damageMultiplier *
    stats.damageBuffMultiplier *
    attributes.Strength.meleeDamageMultiplier;

  stats.attackSpeed = BASE_STATS.attackSpeed;

  stats.combatSlots = BASE_STATS.combatSlots + attributes.Strength.inventorySlots;
  renderPlayerStats(stats);
}

//=========save/load functions===========
// Serialize the current game state to localStorage
export function saveGame() {
if (typeof localStorage === "undefined") return;

  const state = {
    stats,
    stageData,
    cardPoints,
    redrawCost,
    playerStats,
    worldProgress,
    lifeCore,
    sectSystem,
    sectState,
    sectTabUnlocked,
    systems: {
      manaUnlocked: systems.manaUnlocked,
      buildingUnlocked: systems.buildingUnlocked,
      researchUnlocked: systems.researchUnlocked,
      chantingHallUnlocked: systems.chantingHallUnlocked,
      voiceOfThePeople: systems.voiceOfThePeople,
      explorationUnlocked: systems.explorationUnlocked
    }
  };

try {
localStorage.setItem("gameSave", JSON.stringify(state));
addLog("Game saved!", "info");
} catch (e) {
console.error("Save failed", e);
}
}

// Restore game state from localStorage if available
export function loadGame() {
if (typeof localStorage === "undefined") return;
const json = localStorage.getItem("gameSave");
if (!json) return;

try {
const state = JSON.parse(json);
  // legacy cash/chip values are ignored
  cardPoints = state.cardPoints || 0;
  redrawCost = state.redrawCost || 10;
  Object.assign(stats, state.stats || {});
  if (state.systems) {
    Object.assign(systems, state.systems);
  } else {
    systems.manaUnlocked = (state.stats && state.stats.maxMana > 0);
  }
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

    if (state.sectSystem) {
      const { upgrades: savedUpgrades, ...restSect } = state.sectSystem;
      Object.assign(sectSystem, restSect);
      // ensure orbs exist for older saves
      if (!sectSystem.orbs || !sectSystem.orbs.water) {
        const water = sectSystem.resources?.water || {};
        sectSystem.orbs = {
          water: {
            current: water.current || 0,
            max: water.max || 2000,
            regen: water.regen || 6
          }
        };
      }
      // maintain reference between water resource and orb
      sectSystem.resources.water = sectSystem.orbs.water;
      if (sectSystem.weather && sectSystem.weather.days !== undefined) {
        sectSystem.weather.duration = sectSystem.weather.days;
        delete sectSystem.weather.days;
      }
    if (savedUpgrades) {
      Object.entries(savedUpgrades).forEach(([name, data]) => {
        if (sectSystem.upgrades[name]) {
          Object.assign(sectSystem.upgrades[name], data);
        } else {
          sectSystem.upgrades[name] = data;
        }
      });
    }

    if (!Array.isArray(sectSystem.savedConstructs)) {
      sectSystem.savedConstructs = ['Murmur'];
    } else if (!sectSystem.savedConstructs.includes('Murmur')) {
      sectSystem.savedConstructs.unshift('Murmur');
    }

    // ensure the default Murmur card is active if no constructs are active
    if (!Array.isArray(sectSystem.activeConstructs)) {
      sectSystem.activeConstructs = ['Murmur'];
    } else if (sectSystem.activeConstructs.length === 0) {
      sectSystem.activeConstructs.push('Murmur');
    }

    // ensure disciples have required stats when loading older saves
    if (Array.isArray(sectSystem.disciples)) {
      sectSystem.disciples.forEach(d => initializeDisciple(d));
    }
  }

  if (state.sectState) {
    Object.assign(sectState, state.sectState);
    sectState.researchProgress = 0; // progress is not persisted
  }

  // synchronize disciple global levels with saved skill data
  if (Array.isArray(sectSystem.disciples)) {
    sectSystem.disciples.forEach(d => {
      const lvl = computeGlobalSkillLevel(d.id);
      if (lvl > d.globalLevel) d.globalLevel = lvl;
    });
  }

  if (state.sectTabUnlocked ||
      (sectSystem.disciples && sectSystem.disciples.length > 0)) {
    sectTabUnlocked = true;
    if (playerSectSubTabButton) playerSectSubTabButton.style.display = '';
  }

updatePlayerStats(stats);
  renderPlayerStats(stats);
  renderStageInfo();
  renderGlobalStats();
  renderWorldsMenu();
  worldProgressRateTracker.reset(
    computeWorldProgress(stageData.world) * 100
  );
  if (dom.worldProgressPerSecDisplay)
    dom.worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";

  updateManaBar();
  applyWorldTheme();

  updateWorldTabNotification();
  updateSectDisplay();
  if (typeof renderConstructCards === 'function') {
    renderConstructCards();
    if (typeof renderHotbar === 'function') renderHotbar();
  }

addLog("Game loaded!",
"info");
} catch (e) {
  console.error("Load failed", e);
  if (typeof showLoadErrorOverlay === 'function') {
    showLoadErrorOverlay(e, startNewGame);
  } else {
    startNewGame();
  }
}
}


//=========game loop===========


let lastFrameTime = performance.now();

// Main animation loop; handles ticking the enemy and player actions
function gameLoop(currentTime) {
const rawDelta = currentTime - lastFrameTime;
lastFrameTime = currentTime;
const deltaTime = rawDelta * timeScale;
const startWater = sectSystem.resources.water.current;

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
  updatePlayerStats(stats);
  worldProgressTimer += deltaTime;
  if (worldProgressTimer >= 1000) {
    const currentPct = computeWorldProgress(stageData.world) * 100;
    worldProgressRateTracker.record(currentPct);
    if (dom.worldProgressPerSecDisplay) {
      const rate = worldProgressRateTracker.getRate();
      dom.worldProgressPerSecDisplay.textContent = `Avg World Progress/sec: ${rate.toFixed(2)}%`;
    }
    worldProgressTimer = 0;
  }
  if (currentEnemy) {
    attack(deltaTime);
  }

  if (systems.manaUnlocked) {
  stats.mana = Math.min(
  stats.maxMana,
  stats.mana + (stats.manaRegen * deltaTime) / 1000
);
 updateManaBar();
}

  tickSectSystem(deltaTime);
  tickSect(deltaTime);
  const dtSeconds = deltaTime / 1000;
  sectSystem.gains.water =
    dtSeconds > 0
      ? (sectSystem.resources.water.current - startWater) / dtSeconds
      : 0;
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



