/* eslint-disable no-unused-vars, no-undef */
// Core modules that power combat systems
import Disciple from "./game/disciple.js";
import bus from './game/canBus.js';
import addLog from "./game/log.js"; // helper for appending to the event log
import Enemy from "./game/enemy.js"; // base enemy class
import {
  Boss,
  BossTemplates
} from "./game/boss.js"; // boss definitions
import {
  AbilityRegistry
} from "./game/dealerabilities.js"; // boss ability registry
import {
  initStarChart
} from "./game/starChart.js"; // optional star chart tab
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
  renderHotbar,
  SECT_SCHEDULE,
  getCurrentSchedule,
  tickSect,
  renderColonyResources,
  addDiscoveredLocation,
  discoveredLocations,
  ORB_REPAIR_SECONDS
} from "./game/sect.js";
import {
  BUILDINGS,
  checkBuildingUnlock,
  tickBuilding
} from './game/buildings.js';
import { formatNumber } from "./utils/numberFormat.js";
import { runAnimation } from "./utils/animation.js";
import {
  initMetamorphosis,
  refreshMetamorphosis,
  destroyMetamorphosis
} from './game/metamorphosis.js';
import { intelligenceXpMultiplier } from './game/attributes.js';
import { createOverlay } from './ui/overlay.js';
import { showLoadErrorOverlay } from './ui/loadErrorOverlay.js';
import { openExplorationOverlay, closeExplorationOverlay, openWorkOverlay, openScheduleOverlay, openPlaceholderOverlay, openResourceOverlay, openBuildOverlay, openTransmuteOverlay, openResearchOverlay, openOrbOverlay, closeDungeonOverlay, locationListContainer, explorationListContainer } from "./ui/colonyOverlays.js";
import { createDiscipleBadge } from "./game/badges.js";
import { calculateKillXp } from './utils/xp.js';
import { initTooltip } from './game/tooltip.js';
import { initQiRibbons } from './game/qiRibbons.js';
import { initDiscipleVisual, updateDiscipleVisual } from './game/disciplesVisuals.js';
import {
  calculateMaxStamina,
  calculateStaminaRegen
} from './utils/stamina.js';
import { BODY_PARTS } from './game/injury.js';
import {
  calculateMaxWater,
  calculateWaterRegen
} from './utils/water.js';
import { getMaxWater, getWaterRegen } from './game/metamorphosisBonuses.js';
import { initializeDisciple } from './utils/discipleInit.js';
import { initializeSect } from './utils/sectInit.js';
import {
  // calculateEnemyHp,
  calculateEnemyBasicDamage,
  spawnDealer,
  spawnBoss,
  spawnEnemy
} from "./game/enemySpawning.js";
import {
  renderEnemyAttackBar,
  renderPlayerAttackBar,
  renderDealerLifeBarFill,
  applyBloodSplat,
  removeBloodSplat,
  updateBloodSplat
} from "./game/rendering.js";

// combat mechanics and timers
import {
  init as initCombat,
  discipleAttackTimers,
  enemyAttackProgress,
  setEnemyAttackProgress,
  attack,
  cDealerDamage,
  setPartyDefeatHandler
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
  updateDiscipleStatsDisplay,
  makeBar,
  formatTime,
  createLabeledBar,
  setActiveTabButton,
  showTab,

} from "./game/ui.js";
// disciple selection for combat
import {
  init as initDisciples,
  activeDisciples,
  selectDisciple,
  deselectDisciple,
  clearActiveDisciples
} from "./game/disciples.js";
import { raidState, tickRaid } from './game/raids.js';
// developer debug tools
import { init as initDebug } from "./game/debug.js";
import { attachOrbGlow, enableOrbGlow, disableOrbGlow, updateOrbGlow, flashOrbGlow } from './game/orbGlow.js';
import { BASE_MOVE_SPEED } from './game/constants.js';
import { initOrbMask, showOrbMask, hideOrbMask, updateOrbMaskPosition } from './game/orbMask.js';
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
  FRUIT_GROWTH_RATES,
  isDarkenshift,
  setIsDarkenshift,
  lifeCore,
  worldProgress,
  playerStats,
  gamePaused,
  setGamePaused,
  campOverlayOpen,
  setCampOverlayOpen,
  campOverlay,
  setCampOverlay,
  inCombat,
  setInCombat,
  speakerOverlay,
  setSpeakerOverlay,
  worldProgressTimer,
  setWorldProgressTimer,
  worldProgressRateTracker,
  setNightMode,
  updateResourceCaps
} from "./game/state.js";
import {
  BASE_STATS,
  HUNT_CYCLE_SECONDS,
  HUNT_XP_PER_SUCCESS,
  ANIMALS,
  SOFTWOOD_CYCLE_SECONDS,
  SOFTWOOD_CYCLE_AMOUNT,
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
  GATHER_SPOTS,
  FRUIT_CONSUMPTION_RATE,
  TASK_ICONS,
  TASK_GROUPS,
  ATTRIBUTE_FOR_GROUP,
  LOCATION_DEFS
} from "./game/constants.js";
import { moveElement } from './game/mapMovement.js';
import {
  addSkillXp,
  computeGlobalSkillLevel,
  ensureDiscipleSkills,
  getTaskSkillProgress
} from './utils/skills.js';




// --- Game State ---
// Available disciples under the player's control
// Initialized with three disciples ("frogs") per the documentation
let { disciples } = initializeSect();
// theme state

function getTaskEta(d) {
  const task = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  if (task === 'Gather Fruit' || task === 'Gather Softwood') {
    return Infinity;
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

// Simplified card used in the sect overview list
export function createSectDiscipleCard(d) {
  const card = createDiscipleBadge(d);
  card.classList.add('sect-disciple-card');
  return card;
}




// Card HP adjustments moved to card.js utilities

// Data for the current stage and world progression

const STAGE_KILL_REQUIREMENT = 10;
const PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 22;

let speakerEncounterPending = false;

// Weight a kill's contribution toward world completion based on the stage
// Lower stages contribute less while stages beyond 10 scale slowly upward
function stageWeight(stage) {
  return stage <= 10 ? stage : 10 + Math.sqrt(stage - 10);
}

function checkSpeakerEncounter() {
  if (playerStats.speakerEncounters === 0 && stageData.stage >= 5 && !playerStats.hasDied) {
    speakerEncounterPending = true;
  } else if (playerStats.speakerEncounters === 1 && worldProgress[stageData.world].bossDefeated) {
    speakerEncounterPending = true;
  } else if (playerStats.speakerEncounters === 2 && playerStats.hasDied) {
    speakerEncounterPending = true;
  }
}


// player statistics live in game/state.js

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
  raidCardContainer: document.querySelector('.raidCardContainer'),
  dealerContainer: document.querySelector('.dealerContainer'),
  combatResources: document.getElementById('combatResources'),
};
//const stageProgressFill = document.getElementById("stageProgressFill");
//const stageProgressBar = document.getElementById("stageProgressBar");
// attack progress bars
let playerAttackFill = null;
let enemyAttackFill = null;

// Load saved state when DOM is ready
window.addEventListener("beforeunload", saveGame);
const saveInterval = setInterval(saveGame, 30000);


//=========tabs==========

let playerStatsTabButton;
let worldSubTabButton;
export let explorationTabButton;
export let locationTabButton;
let logTabButton;
export let mainTab;
export let starChartTab;
export let playerStatsTab;
export let metamorphosisTab;
export let lexiconTab;
export let sectTab;
export let explorationTab;
export let locationTab;
export let logTab;
let activeEffectsContainer;
let playerMetamorphosisTabButton;
let playerLexiconTabButton;
let playerSectTabButton;

let playerMetamorphosisPanel;
let playerLexiconPanel;
let playerSectPanel;
let constructLexiconContainer;
let sectSummaryDisplay;
let resourceDisplay;
let colonyResourcesTabButton;
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
let sectNavTransmuteBtn;
let sectNavChantBtn;
let sectNavMapBtn;
let sectNavInfluenceBtn;
let sectNavResearchBtn;
let sectNavOrbBtn;
let sectNavCultivationBtn;
let sectNavScheduleBtn;

// Track current brightness applied to the sect map
let currentMapBrightness = 1;

const explorationParty = new Set();
let currentExplorationParty = [];

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




function initTabs() {
  if (typeof document === 'undefined') return;

  playerStatsTabButton = document.querySelector('.playerStatsTabButton');
  explorationTabButton = document.querySelector('.explorationTabButton');
  locationTabButton = document.querySelector('.locationTabButton');
  logTabButton = document.querySelector('.logTabButton');
  mainTab = document.querySelector('.mainTab');
  starChartTab = document.querySelector('.starChartTab');
  playerStatsTab = document.querySelector('.playerStatsTab');
  metamorphosisTab = document.querySelector('.metamorphosisTab');
  lexiconTab = document.querySelector('.lexiconTab');
  sectTab = document.querySelector('.sectTab');
  explorationTab = document.querySelector('.explorationTab');
  locationTab = document.querySelector('.locationTab');
  logTab = document.querySelector('.logTab');

  activeEffectsContainer = document.querySelector('.active-effects');
  initTooltip();
  playerMetamorphosisTabButton = document.querySelector('.playerMetamorphosisTabButton');
  playerLexiconTabButton = document.querySelector('.playerLexiconTabButton');
  playerSectTabButton = document.querySelector('.playerSectTabButton');
  playerMetamorphosisPanel = document.querySelector('.player-metamorphosis-panel');
  playerLexiconPanel = document.querySelector('.player-lexicon-panel');
  playerSectPanel = document.querySelector('.player-sect-panel');
  constructLexiconContainer = document.getElementById('constructLexicon');
  sectSummaryDisplay = document.getElementById('sectSummary');
  resourceDisplay = document.getElementById('resourceDisplay');
  sectDisciplesContainer = document.getElementById('sectDisciplesContainer');
  sectDiscipleListContainer = document.getElementById('sectDiscipleList');
  colonyResourcesTabButton = document.getElementById('colonyResourcesTabBtn');
  locationsPanelBtn = document.getElementById('locationsPanelBtn');
  gateBtn = document.getElementById('gateBtn');
  sectNavWorkBtn = document.getElementById("sectNavWorkBtn");
  sectNavResourceBtn = document.getElementById("sectNavResourceBtn");
  sectNavBuildBtn = document.getElementById("sectNavBuildBtn");
  sectNavTransmuteBtn = document.getElementById("sectNavTransmuteBtn");
  sectNavChantBtn = document.getElementById("sectNavChantBtn");
  sectNavMapBtn = document.getElementById("sectNavMapBtn");
  sectNavInfluenceBtn = document.getElementById("sectNavInfluenceBtn");
  sectNavResearchBtn = document.getElementById("sectNavResearchBtn");
  sectNavOrbBtn = document.getElementById("sectNavOrbBtn");
  sectNavCultivationBtn = document.getElementById("sectNavCultivationBtn");
  sectNavScheduleBtn = document.getElementById("sectNavScheduleBtn");
  statsOverviewSubTabButton = document.querySelector('.statsOverviewSubTabButton');
  statsEconomySubTabButton = document.querySelector('.statsEconomySubTabButton');
  statsOverviewContainer = document.getElementById('statsOverviewContainer');
  statsEconomyContainer = document.getElementById('statsEconomyContainer');
  if (playerSectTabButton) playerSectTabButton.style.display = sectTabUnlocked ? '' : 'none';
  setupTabHandlers();

  if (colonyResourcesTabButton)
    colonyResourcesTabButton.addEventListener('click', openResourceOverlay);





  if (locationsPanelBtn)
    locationsPanelBtn.addEventListener('click', openExplorationOverlay);
  if (gateBtn)
    gateBtn.addEventListener('click', () => {
      if (discoveredLocations.length === 0) {
        LOCATION_DEFS.forEach(loc => addDiscoveredLocation(loc.name, locationListContainer, LOCATION_DEFS));
      }
      openExplorationOverlay();
    });
  const navButtons = [sectNavWorkBtn, sectNavResourceBtn, sectNavBuildBtn, sectNavTransmuteBtn, sectNavScheduleBtn, sectNavChantBtn, sectNavMapBtn, sectNavInfluenceBtn, sectNavResearchBtn, sectNavOrbBtn, sectNavCultivationBtn];
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
  if (sectNavTransmuteBtn)
    sectNavTransmuteBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavTransmuteBtn);
      if (systems.transmutationUnlocked) openTransmuteOverlay();
      else openPlaceholderOverlay("Transmutation");
    });
  if (sectNavScheduleBtn)
    sectNavScheduleBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavScheduleBtn);
      openScheduleOverlay();
    });
  if (sectNavChantBtn) sectNavChantBtn.addEventListener("click", () => { setActiveNavBtn(sectNavChantBtn); openPlaceholderOverlay("Chanting"); });
  if (sectNavMapBtn) sectNavMapBtn.addEventListener("click", () => { setActiveNavBtn(sectNavMapBtn); openExplorationOverlay(); });
  if (sectNavInfluenceBtn) sectNavInfluenceBtn.addEventListener("click", () => { setActiveNavBtn(sectNavInfluenceBtn); openPlaceholderOverlay("Influence"); });
  if (sectNavResearchBtn)
    sectNavResearchBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavResearchBtn);
      if (systems.researchUnlocked) openResearchOverlay();
      else openPlaceholderOverlay("Research");
    });
  if (sectNavOrbBtn)
    sectNavOrbBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavOrbBtn);
      if (systems.orbManagementUnlocked) openOrbOverlay();
      else openPlaceholderOverlay("Orbs");
    });
  if (sectNavCultivationBtn)
    sectNavCultivationBtn.addEventListener("click", () => {
      setActiveNavBtn(sectNavCultivationBtn);
      openPlaceholderOverlay("Cultivation");
    });

  if (playerMetamorphosisTabButton)
    playerMetamorphosisTabButton.addEventListener('click', () => {
      refreshMetamorphosis();
      showTab(metamorphosisTab);
      setActiveTabButton(playerMetamorphosisTabButton);
    });
  if (playerLexiconTabButton)
    playerLexiconTabButton.addEventListener("click", () => {
      showTab(lexiconTab);
      setActiveTabButton(playerLexiconTabButton);
    });
  if (playerSectTabButton)
    playerSectTabButton.addEventListener("click", () => {
      showTab(sectTab);
      setActiveTabButton(playerSectTabButton);
      startDiscipleMovement();
      playerSectTabButton.classList.remove('glow-notify');
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

  showTab(sectTab); // Start with sect panel visible
  setActiveTabButton(playerSectTabButton);
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


function updateTaskProgressDisplay() {
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
    const wrappers = document.querySelectorAll(`[data-disciple-id="${d.id}"]`);
    wrappers.forEach(wrapper => {
      const fill = wrapper.querySelector('.disciple-progress-fill');
      const label = wrapper.querySelector('.disciple-progress-label');
      const rateEl = wrapper.querySelector('.disciple-task-rate');
    const phase = getCurrentSchedule().action;
    const taskName = d.incapacitated
      ? 'Resting'
      : phase !== 'Work'
        ? phase
        : sectState.discipleTasks[d.id] || 'Idle';
    if (phase !== 'Work' && taskName !== 'Resting') {
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = taskName;
      if (rateEl) rateEl.textContent = '';
      return;
    }
    if (taskName === 'Gather Fruit' || taskName === 'Gather Softwood') {
      const progress = sectState.discipleProgress[d.id] || 0;
      const group = TASK_GROUPS[taskName];
      const skillXp = sectState.discipleSkills[d.id]?.[group] || 0;
      const lvl = getTaskSkillProgress(skillXp).level;
      const spot = GATHER_SPOTS[taskName];
      const attr = ATTRIBUTE_FOR_GROUP[group];
      const yieldMult = 1 + 0.05 * (d[attr] || 0) + 0.02 * lvl;
      const gatherRate = spot.baseYield * yieldMult;
      if (fill) fill.style.width = '0%';
      if (label) label.textContent = 'Gathering';
      if (rateEl) {
        const rate = gatherRate * 60;
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
      if (sectSystem.orbs.water.cracked && !buildData) {
        const pct = sectState.orbRepairProgress * 100;
        if (fill) fill.style.width = `${pct}%`;
        const time =
          builderCount > 0
            ? ((1 - sectState.orbRepairProgress) * ORB_REPAIR_SECONDS) / builderCount
            : Infinity;
        if (label)
          label.textContent = `Repair Orb ${builderCount > 0 ? time.toFixed(1) : '∞'}s`;
      } else {
        if (fill) fill.style.width = `${buildPct}%`;
        if (label && buildData)
          label.textContent = `${buildData.name} ${builderCount > 0 ? buildTime.toFixed(1) : '∞'}s`;
        else if (label) label.textContent = '';
      }
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
  });
}

function updateDiscipleWaterDisplay() {
  sectSystem.disciples.forEach(d => {
    const waterLvl = getTaskSkillProgress(
      sectState.discipleSkills[d.id]?.WaterSense || 0
    ).level;
    const max = getMaxWater(d, waterLvl);
    document
      .querySelectorAll(`.disciple-badge[data-disciple-id="${d.id}"] .water-bar .bar-fill`)
      .forEach(fill => {
        fill.style.width = `${Math.min(100, (d.water / max) * 100)}%`;
      });
  });
  if (discipleOverlay && discipleOverlayActiveTab === 'general') {
    const d = discipleOverlayData.disciple;
    if (d) {
      const waterLvl = getTaskSkillProgress(
        sectState.discipleSkills[d.id]?.WaterSense || 0
      ).level;
      const max = getMaxWater(d, waterLvl);
      const row = discipleOverlay.box.querySelector(
        '.disciple-general .stat-row[data-stat="water"]'
      );
      if (row) {
        const fill = row.querySelector('.bar-fill');
        if (fill) fill.style.width = `${Math.min(100, (d.water / max) * 100)}%`;
        const val = row.querySelector('.stat-value');
        if (val) val.textContent = `${Math.round(d.water)}/${max}`;
      }
    }
  }
}

function updateDiscipleHealthDisplay() {
  sectSystem.disciples.forEach(d => {
    document
      .querySelectorAll(
        `.disciple-badge[data-disciple-id="${d.id}"] .life-bar .bar-fill`
      )
      .forEach(fill => {
        fill.style.width = `${Math.min(100, (d.health / DISCIPLE_MAX_HEALTH) * 100)}%`;
      });
  });
  if (discipleOverlay && discipleOverlayActiveTab === 'general') {
    const d = discipleOverlayData.disciple;
    if (d) {
      const row = discipleOverlay.box.querySelector(
        '.disciple-general .stat-row[data-stat="health"]'
      );
      if (row) {
        const fill = row.querySelector('.bar-fill');
        if (fill)
          fill.style.width = `${Math.min(
            100,
            (d.health / DISCIPLE_MAX_HEALTH) * 100
          )}%`;
        const val = row.querySelector('.stat-value');
        if (val) val.textContent = `${Math.round(d.health)}/${DISCIPLE_MAX_HEALTH}`;
      }
    }
  }
}

function updateSectDisplay() {
  checkBuildingUnlock();
  if (sectNavBuildBtn) {
    sectNavBuildBtn.style.display = systems.buildingUnlocked ? '' : 'none';
  }
  if (sectNavResearchBtn) {
    sectNavResearchBtn.style.display = systems.researchUnlocked ? '' : 'none';
  }
  if (sectNavOrbBtn) {
    sectNavOrbBtn.style.display = systems.orbManagementUnlocked ? '' : 'none';
  }
  if (sectNavTransmuteBtn) {
    sectNavTransmuteBtn.style.display = systems.transmutationUnlocked ? '' : 'none';
  }
  if (sectNavCultivationBtn) {
    sectNavCultivationBtn.style.display = systems.metamorphBuildingAvailable ? '' : 'none';
  }
  if (!sectTabUnlocked || !playerSectPanel) return;
  const total = sectSystem.disciples.length;
  const assigned = Object.values(sectState.discipleTasks).filter(t => t && t !== 'Idle').length;
  const idle = total - assigned;
  if (sectSummaryDisplay) {
    const remaining = Math.max(0, DAY_LENGTH_SECONDS - sectSystem.seasonTimer);
    const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
    const ss = String(Math.floor(remaining % 60)).padStart(2, '0');
    const upkeep = FRUIT_CONSUMPTION_RATE * sectSystem.disciples.length * DAY_LENGTH_SECONDS;
       const formatRate = v => {
         const num = typeof v === 'number' ? v : 0;
         return `${num >= 0 ? '+' : ''}${num.toFixed(2)}`;
       };
    const fruitRate = formatRate(sectSystem.gains?.fruits);
    const woodRate = formatRate(sectSystem.gains?.softwood);
    sectSummaryDisplay.innerHTML = `
      <span>👥 ${total}/${sectState.maxDisciples} (Idle: ${idle})</span>
      <span>${sectState.fruits.toFixed(2)}/${sectState.fruitCap} (${fruitRate}/s)</span>
      <span>🪵 ${sectState.softwood.toFixed(2)}/${sectState.softwoodCap} (${woodRate}/s)</span>`;
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
      ? [{ cls: 'water', left: '50%', top: '50%' }]
      : [{ cls: 'water', left: '50%', top: '50%' }];
    positions.forEach(p => {
      const orb = document.createElement('div');
      orb.className = `sect-orb ${p.cls}`;
      const fill = document.createElement('div');
      fill.className = 'orb-fill';
      fill.style.height = `${(sectSystem.orbs.water.current / sectSystem.orbs.water.max) * 100}%`;
      orb.appendChild(fill);
      const value = document.createElement('div');
      value.className = 'orb-value';
      value.textContent = `${Math.floor(sectSystem.orbs.water.current)}/${sectSystem.orbs.water.max}`;
      orb.appendChild(value);
      orb.style.left = p.left;
      orb.style.top = p.top;
      if (p.cls === 'water') {
        orb.addEventListener('click', openWaterRegenPopup);
        const rateEl = document.createElement('div');
        rateEl.className = 'orb-regen';
        rateEl.textContent = `${sectSystem.gains.water.toFixed(2)}/s`;
        orb.appendChild(rateEl);
        attachOrbGlow(orb);
      }
      orbs.appendChild(orb);
    });
    initQiRibbons();
    window.dispatchEvent(new CustomEvent('orbs-changed'));
  }

  if (sectDisciplesContainer) {
    sectSystem.disciples.forEach(d => {
      if (!sectDiscipleEls[d.id]) {
        const el = document.createElement('div');
        el.className = 'sect-disciple';
        el.dataset.discipleId = d.id;
        sectDiscipleEls[d.id] = el;
        sectDisciplesContainer.appendChild(el);
        moveDisciple(d, el);
        initDiscipleVisual(d, el);
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

  // Reapply brightness adjustments for night elements
  applyNightFilters(currentMapBrightness);
}

function applyNightFilters(brightness) {
  const inv = brightness < 1 ? 1 / brightness : 1;
  document.querySelectorAll('#sectOrbs .sect-orb.water').forEach(o => {
    if (!o.dataset.baseFilter) o.dataset.baseFilter = o.style.filter || '';
    if (brightness < 1) {
      o.style.filter = `${o.dataset.baseFilter} brightness(${inv * 2}) saturate(1.2)`;
    } else {
      o.style.filter = o.dataset.baseFilter;
    }
  });
  document.querySelectorAll('.raidCardContainer .dCardPane').forEach(c => {
    c.style.filter = brightness < 1 ? `brightness(${inv})` : '';
  });
  document.querySelectorAll('.raidCardContainer .dCard__icon').forEach(icon => {
    if (!icon.dataset.baseFilter) icon.dataset.baseFilter = icon.style.filter || '';
    if (!icon.dataset.baseStroke) icon.dataset.baseStroke = icon.style.stroke || '';
    if (brightness < 1) {
      icon.style.filter = `${icon.dataset.baseFilter} drop-shadow(0 0 6px red)`;
      icon.style.stroke = 'red';
    } else {
      icon.style.filter = icon.dataset.baseFilter;
      icon.style.stroke = icon.dataset.baseStroke;
    }
  });
  document.querySelectorAll('.disciple-badge, .disciple-orb').forEach(el => {
    if (!el.dataset.baseFilter) el.dataset.baseFilter = el.style.filter || '';
    // Keep badges and orbs unaffected by the night filter
    el.style.filter = el.dataset.baseFilter;
  });
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
  currentMapBrightness = values[phase] || 1;
  map.style.filter = `brightness(${currentMapBrightness})`;
  map.classList.toggle('night', phase === 'Night');
  applyNightFilters(currentMapBrightness);
}

function feedDisciples() {}

function moveDisciple(d, el) {
  const cont = el.parentElement;
  if (!cont) return;
  const maxX = Math.max(cont.clientWidth - 20, 0);
  const maxY = Math.max(cont.clientHeight - 20, 0);
  const x = Math.random() * maxX;
  const y = Math.random() * maxY;
  moveElement(el, x, y, d.moveSpeed);
}

function updateDiscipleGather(id, el) {
  const patch = document.getElementById('fruitPatch');
  if (!patch) return;
  const px = patch.offsetLeft + patch.offsetWidth / 2 - 8;
  const py = patch.offsetTop + patch.offsetHeight / 2 - 8;
  el.style.opacity = '1';
  const d = sectSystem.disciples.find(x => x.id === id);
  moveElement(el, px, py, d?.moveSpeed);
}

function startDiscipleMovement() {
  if (discipleMoveInterval) return;
  discipleMoveInterval = setInterval(() => {
    if (raidState.active) return;
    sectSystem.disciples.forEach(d => {
      const el = sectDiscipleEls[d.id];
      if (!el) return;
      let taskName = 'Idle';
      if (d.incapacitated) {
        const orb = document.querySelector('#sectOrbs .water');
        if (orb) {
          const contRect = el.parentElement.getBoundingClientRect();
          const orbRect = orb.getBoundingClientRect();
          const centerX = orbRect.left - contRect.left + orbRect.width / 2;
          const centerY = orbRect.top - contRect.top + orbRect.height / 2;
          const radius = orbRect.width / 2 + el.offsetWidth / 2;
          const ang = Math.random() * Math.PI * 2;
          const bx = centerX + Math.cos(ang) * radius - el.offsetWidth / 2;
          const by = centerY + Math.sin(ang) * radius - el.offsetHeight / 2;
          moveElement(el, bx, by, d.moveSpeed);
        }
        el.classList.add('incapacitated');
        taskName = 'Resting';
      } else {
        el.classList.remove('incapacitated');
        const phase = getCurrentSchedule().action;
        const task = sectState.discipleTasks[d.id];
        if (task === 'Training') {
          const orb = document.querySelector('#sectOrbs .water');
          if (orb) {
            const contRect = el.parentElement.getBoundingClientRect();
            const orbRect = orb.getBoundingClientRect();
            const centerX = orbRect.left - contRect.left + orbRect.width / 2;
            const centerY = orbRect.top - contRect.top + orbRect.height / 2;
            const radius = orbRect.width / 2 + el.offsetWidth / 2;
            const ang = Math.random() * Math.PI * 2;
            const bx = centerX + Math.cos(ang) * radius - el.offsetWidth / 2;
            const by = centerY + Math.sin(ang) * radius - el.offsetHeight / 2;
            moveElement(el, bx, by, d.moveSpeed);
          }
                    taskName = task;
        } else if (phase !== 'Work') {
          taskName = phase;
        } else {
          taskName = task || 'Idle';
          if (task === 'Gather Fruit' || task === 'Gather Softwood') {
            updateDiscipleGather(d.id, el);
          } else {
            moveDisciple(d, el);
          }
        }
      }
      updateDiscipleVisual(d, el, taskName);
    });
  }, 3000);
}





function buildDiscipleCombatStatsView(d) {
  const body = document.createElement('div');
  const atkPerSec = (1000 / d.attackSpeed).toFixed(2);
  const defense = Math.round(d.defense ?? 0);

  const levelRow = document.createElement('div');
  levelRow.textContent = `Level ${d.combatLevel}`;
  body.appendChild(levelRow);

  const bar = document.createElement('div');
  bar.className = 'disciple-progress';
  const fill = document.createElement('div');
  fill.className = 'disciple-progress-fill';
  const pct = Math.min(1, d.combatXp / d.xpForNextLevel());
  fill.style.width = `${Math.floor(pct * 100)}%`;
  const label = document.createElement('div');
  label.className = 'disciple-progress-label';
  label.textContent = `${Math.floor(d.combatXp)}/${d.xpForNextLevel()}`;
  bar.append(fill, label);
  body.appendChild(bar);

  const stats = document.createElement('div');
  stats.innerHTML =
    `Damage ${Math.round(d.damage)}<br>` +
    `Attack/s ${atkPerSec}<br>` +
    `Defense ${defense}`;
  body.appendChild(stats);

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
  const healthRow = makeStatRow(
    'Health',
    d.health,
    DISCIPLE_MAX_HEALTH,
    'linear-gradient(90deg,#b33,#e66)'
  );
  healthRow.querySelector('.stat-value').textContent = `${d.health.toFixed(2)}/${DISCIPLE_MAX_HEALTH.toFixed(2)}`;
  vit.appendChild(healthRow);
  const staminaRow = makeStatRow(
    'Stamina',
    d.stamina,
    calculateMaxStamina(),
    'linear-gradient(90deg,#3b3,#7f7)'
  );
  staminaRow.querySelector('.stat-value').textContent = `${d.stamina.toFixed(2)}/${calculateMaxStamina().toFixed(2)}`;
  const stamRate = document.createElement('span');
  stamRate.textContent = ` (+${calculateStaminaRegen().toFixed(2)}/s)`;
  staminaRow.appendChild(stamRate);
  vit.appendChild(staminaRow);
  const waterLvl = getTaskSkillProgress(
    sectState.discipleSkills[d.id]?.WaterSense || 0
  ).level;
  const waterRow = makeStatRow(
    'Water',
    d.water,
    getMaxWater(d, waterLvl),
    'linear-gradient(90deg,#39f,#6cf)'
  );
  const waterRate = document.createElement('span');
  waterRate.textContent = ` (+${getWaterRegen(d, waterLvl).toFixed(2)}/s)`;
  waterRow.appendChild(waterRate);
  vit.appendChild(waterRow);
  const resRow = makeStatRow(
    'Resilience',
    d.resilience.toFixed(2),
    5,
    'linear-gradient(90deg,#9bf,#bdf)'
  );
  resRow.querySelector('.stat-value').textContent = `${d.resilience.toFixed(2)}%/s`;
  vit.appendChild(resRow);
  body.appendChild(vit);

  const task = document.createElement('div');
  task.className = 'active-task';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  task.innerHTML = `<strong>Task:</strong> ${curTask} (ETA: ${formatTime(getTaskEta(d))})`;
  body.appendChild(task);

  const entries = Object.entries(d.inventory || {});
  const filled = entries.length;
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
  row.dataset.stat = label.toLowerCase();
  const lbl = document.createElement('div');
  lbl.textContent = label;
  const bar = makeBar(value, max, color);
  bar.classList.add('vital-bar');
  const val = document.createElement('div');
  val.className = 'stat-value';
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
  const learnMult = (0.5 + 0.15 * d.intelligence).toFixed(2);
  const rows = [
    {
      label: 'Strength',
      value: d.strength,
      base: d.baseStrength ?? 1,
      effect: `Yield ×${(1 + 0.05 * (d.strength - 1)).toFixed(2)}; woodcutting, hunting & mining`,
      cls: 'strength'
    },
    {
      label: 'Dexterity',
      value: d.dexterity,
      base: d.baseDexterity ?? 1,
      effect:
        `Yield ×${(1 + 0.05 * (d.dexterity - 1)).toFixed(2)}; gathering & hunting, discovery chance`,
      cls: 'dexterity'
    },
    {
      label: 'Intelligence',
      value: d.intelligence,
      base: d.baseIntelligence ?? 1,
      effect:
        `Potency ×${(1 + 0.03 * (d.intelligence - 1)).toFixed(2)}, Learning ×${learnMult}`,
      cls: 'intelligence'
    },
    {
      label: 'Endurance',
      value: d.endurance,
      base: d.baseEndurance ?? 1,
      effect: `Build Speed ×${(1 + 0.05 * (d.endurance - 1)).toFixed(2)}`,
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
    const label = document.createElement('span');
    label.textContent = `${name} Lv ${prog.level}` +
      (effect ? ` (×${mult.toFixed(2)} ${effect})` : '');
    const affinity = d.affinities?.[name];
    if (affinity === 'liked' || affinity === 'loved') {
      const icon = document.createElement('i');
      icon.dataset.lucide = affinity === 'loved' ? 'heart' : 'thumbs-up';
      icon.className = `affinity-icon ${affinity}`;
      head.appendChild(icon);
    }
    head.appendChild(label);
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

function buildDiscipleMoodletsView() {
  const container = document.createElement('div');
  container.textContent = 'No active moodlets';
  return container;
}

function buildDiscipleHealthView(d) {
  const container = document.createElement('div');
  container.className = 'disciple-health-view';
  BODY_PARTS.forEach(p => {
    const row = document.createElement('div');
    row.className = 'body-part-row';
    const label = document.createElement('span');
    label.className = 'body-part-label';
    label.textContent = p.label;
    const bar = document.createElement('div');
    bar.className = 'injury-bar';
    const fill = document.createElement('div');
    fill.className = 'injury-bar-fill';
    const state = d.injuries?.[p.key];
    if (state) {
      fill.style.width = `${Math.min(100, state.progress)}%`;
      if (state.tier) fill.classList.add(state.tier);
    }
    bar.appendChild(fill);
    row.append(label);
    row.appendChild(bar);
    container.appendChild(row);
  });
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
export function openDiscipleOverlay(d) {
  if (discipleOverlay) {
    discipleOverlay.close();
  } else {
    discipleOverlayActiveTab = d.lastTab || 'general';
    if (discipleOverlayActiveTab === 'skills') discipleOverlayActiveTab = 'proficiency';
    if (discipleOverlayActiveTab === 'inventory' || discipleOverlayActiveTab === 'gear' || discipleOverlayActiveTab === 'constructs') {
      discipleOverlayActiveTab = 'general';
    }
  }
  discipleOverlay = createOverlay({ className: 'disciple-overlay', boxClass: 'parchment-box' });
  discipleOverlay.box.classList.add('parchment-box');
  const { box } = discipleOverlay;


  const tabs = document.createElement('div');
  tabs.className = 'disciple-tabs';
  box.appendChild(tabs);
  const content = document.createElement('div');
  box.appendChild(content);

  const defs = [
    { key: 'general', label: 'General' },
    { key: 'health', label: 'Health' },
    { key: 'proficiency', label: 'Proficiency' },
    { key: 'moodlets', label: 'Moodlets' },
    { key: 'stats', label: 'Stats' }
  ];
  let active = discipleOverlayActiveTab;
  function render() {
    content.innerHTML = '';
    if (active === 'general') {
      const view = buildDiscipleGeneralView(d);
      content.appendChild(view);
    } else if (active === 'health') {
      content.appendChild(buildDiscipleHealthView(d));
    } else if (active === 'proficiency') {
      content.appendChild(buildDiscipleProficiencyView(d));
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
  return discipleOverlay;
}

window.addEventListener('open-disciple-overlay', e =>
  openDiscipleOverlay(e.detail)
);

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
    const badge = createDiscipleBadge(d);
    if (cb.checked) badge.classList.add('selected');
    cb.addEventListener('change', () => {
      if (cb.checked) {
        explorationParty.add(d.id);
        badge.classList.add('selected');
      } else {
        explorationParty.delete(d.id);
        badge.classList.remove('selected');
      }
    });
    row.appendChild(cb);
    row.appendChild(badge);
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
        d.currentHp = d.maxHp;
        selectDisciple(d);
      }
    });
    closeExplorationOverlay();
    showTab(mainTab);
    respawnDealerStage();
  }
}

export function startWorldCombat(worldId, party) {
  if (!Array.isArray(party) || party.length === 0) return;
  goToWorld(worldId);
  clearActiveDisciples();
  party.forEach(id => {
    const d = sectSystem.disciples.find(x => x.id === id);
    if (d) {
      d.currentHp = d.maxHp;
      selectDisciple(d);
    }
  });
  closeDungeonOverlay?.();
  closeExplorationOverlay?.();
  showTab(mainTab);
  respawnDealerStage();
}


//========render functions==========
function init() {
  // now the DOM is in, and lucide.js has run, so window.lucide is defined
  initSect();
  initTabs();
  initPollen();
  initQiRibbons();
  initCombat();
  initUi({
    mainTab,
    starChartTab,
    playerStatsTab,
    metamorphosisTab,
    lexiconTab,
    sectTab,
    explorationTab,
    locationTab,
    logTab,
    locationTabButton,
    explorationTabButton
  });
  initDisciples();
  initDebug();
  window.addEventListener('location-discovered', e => addDiscoveredLocation(e.detail.name, locationListContainer, LOCATION_DEFS));
  loadGame();
  updateResourceCaps();
  // Apply current brightness settings immediately after loading saved data
  updateMapBrightness(getCurrentSchedule().phase);
  if (sectSystem.disciples.length === 0) {
    sectSystem.disciples.push(...disciples);
    sectTabUnlocked = true;
    if (playerSectTabButton) playerSectTabButton.style.display = '';
    updateSectDisplay();
  }
  checkBuildingUnlock();
  updateSectDisplay();
  initOrbMask();
  window.addEventListener('orbs-changed', updateOrbMaskPosition);
  initVignetteToggles();
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  initMetamorphosis();
  renderConstructLexicon();
  document.addEventListener('day-passed', () => {
    sectSystem.disciples.forEach(d => {
      d.stamina = Math.min(
        calculateMaxStamina(),
        d.stamina + calculateStaminaRegen()
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
  });
  document.addEventListener('schedule-phase', e => {
    updateMapBrightness(e.detail.phase);
    setNightMode(e.detail.phase === 'Night');
    if (e.detail.phase === 'Night') {
      enableOrbGlow();
      showOrbMask();
      updateOrbMaskPosition();
      sectSystem.disciples.forEach(d => {
        if (!d.incapacitated) sectState.discipleTasks[d.id] = 'Idle';
      });
    } else {
      disableOrbGlow();
      hideOrbMask();
    }
    if (e.detail.action !== 'Work')  {
      sectSystem.disciples.forEach(d => {
        sectState.discipleProgress[d.id] = 0;
      });
    }
    updateTaskProgressDisplay();
  });
  document.addEventListener('disciple-gained', e => {
    if (!sectTabUnlocked && e.detail.count >= 1) {
      sectTabUnlocked = true;
      if (playerSectTabButton) playerSectTabButton.style.display = '';
      addLog('A presence stirs. The first disciple has heard the Calling.', 'info');
    }
    if (playerSectTabButton && !playerSectTabButton.classList.contains('active')) {
      playerSectTabButton.classList.add('glow-notify');
    }
    updateSectDisplay();
  });
  document.addEventListener('raid-start', e => {
    setInCombat(true);
    removeDealerLifeBar();
    const detail = e.detail || {};
    const enemy =
      typeof detail.enemy !== 'undefined' ? detail.enemy : detail;
    const useCard = detail.useCard !== false;
    setCurrentEnemy(enemy);
    if (useCard) {
      renderDealerCard(dom.raidCardContainer);
      enemyAttackFill = renderEnemyAttackBar();
    }
    showPlayerAttackBar();
  });
  document.addEventListener('raid-end', () => {
    setInCombat(false);
    setCurrentEnemy(null);
    hidePlayerAttackBar(enemyAttackFill);
    removeDealerLifeBar();
    if (dom.raidCardContainer) dom.raidCardContainer.innerHTML = '';

  });
  updatePlayerStats(stats);
  // Game starts in sect view; exploration initiates combat
  renderWorldsMenu();
  showTab(sectTab);
  setActiveTabButton(playerSectTabButton);

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
  removeDealerLifeBar();
  setCurrentEnemy(null);
  setInCombat(false);

  const btn = document.getElementById("debugToggle");
  if (btn) btn.addEventListener("click", toggleDebug);

  const tbtn = document.getElementById("themeToggle");
  if (tbtn) {
    setIsDarkenshift(localStorage.getItem('isDarkenshift') === 'true');
    applyTheme();
    tbtn.addEventListener("click", toggleTheme);
  }

  requestAnimationFrame(gameLoop);
}

document.addEventListener("DOMContentLoaded", init);

// life rendering moved to rendering.js

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
  const combatLevelDisplay = document.getElementById("combatLevelDisplay");
  const avgProfDisplay = document.getElementById("avgProfDisplay");

  if (combatLevelDisplay) {
    combatLevelDisplay.textContent = `Avg Combat Lv: ${stats.avgCombatLevel.toFixed(1)}`;
  }
  if (avgProfDisplay) {
    avgProfDisplay.textContent = `Avg Skill Lv: ${stats.avgProficiencyLevel.toFixed(1)}`;
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
  const lifeBar = document.createElement('div');
  lifeBar.className = 'raid-life-bar';
  const lifeFill = document.createElement('div');
  lifeFill.className = 'raid-life-fill';
  lifeFill.style.width = `${(enemy.currentHp / enemy.maxHp) * 100}%`;
  lifeBar.appendChild(lifeFill);
  pane.appendChild(lifeBar);
  abilityPane.innerHTML = renderAbilityIcons(enemy.abilities, false);
  wrapper.append(pane, abilityPane);
  if (enemy.isSpeaker) {
    const canvas = pane.querySelector('canvas.speaker-icon');
    if (canvas) drawSpeakerIcon(canvas);
  }
  enemy.raidLifeFill = lifeFill;
  return wrapper;
}

function renderDealerCard(container = dom.dCardContainer) {
  if (!currentEnemy || !container) return;
  const card = currentEnemy instanceof Boss
    ? renderBossCard(currentEnemy)
    : renderDealerCardBase(currentEnemy);
  container.innerHTML = '';
  container.appendChild(card);
  lucide.createIcons({ icons: lucide.icons });
  applyNightFilters(currentMapBrightness);
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

export function renderWorldsMenu() {
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
  let highestUnlocked = 0;
  let rewardAvailable = false;
  Object.entries(worldProgress).forEach(([id, data]) => {
    const num = parseInt(id);
    if (data.unlocked && num > highestUnlocked) highestUnlocked = num;
    if (data.bossDefeated && !data.rewardClaimed) rewardAvailable = true;
  });
  const newWorldAvailable = highestUnlocked > stageData.world;
  const shouldGlow = rewardAvailable || newWorldAvailable;
  if (worldSubTabButton) {
    worldSubTabButton.classList.toggle("glow-notify", shouldGlow);
  }
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
  setInCombat(false);
  setCurrentEnemy(null);
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
  setWorldProgressTimer(0);
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
  setInCombat(false);
  setCurrentEnemy(null);
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
  setWorldProgressTimer(0);
  worldProgressRateTracker.reset(computeWorldProgress(stageData.world) * 100);
  if (dom.worldProgressPerSecDisplay) {
    dom.worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";
  }
  dom.killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  updateNextStageProgress();
  updateBossProgress();
  renderGlobalStats();
  renderStageInfo();
  setInCombat(false);
  setCurrentEnemy(null);
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

//dealer

// Spawn logic moved to enemySpawning.js

// Adjust the width of the dealer's HP bar

export function spawnDealerEvent(powerMult = 1) {
  setInCombat(true);
  removeDealerLifeBar();
  const temp = { ...stageData, stage: Math.round(stageData.stage * powerMult) };
  setCurrentEnemy(spawnEnemy('dealer', temp, enemyAttackProgress, cDealerDamage, onDealerDefeat));
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}

export function spawnBossEvent() {
  setInCombat(true);
  removeDealerLifeBar();
  const data = worldProgress[stageData.world];
  const bossStage = 10 * (data?.level || 1);
  const temp = { ...stageData, stage: bossStage };
  setCurrentEnemy(spawnEnemy('boss', temp, enemyAttackProgress, cDealerDamage, () => onBossDefeat(currentEnemy)));
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  showPlayerAttackBar();
  dealerDeathAnimation();
}




// After a kill, decide whether to spawn a dealer or a boss
export function respawnDealerStage() {
  removeDealerLifeBar();
  if (speakerEncounterPending) {
    speakerEncounterPending = false;
    setCurrentEnemy(spawnEnemy('speaker', stageData, enemyAttackProgress, cDealerDamage, onSpeakerDefeat));
  } else {
    setCurrentEnemy(spawnEnemy('dealer', stageData, enemyAttackProgress, cDealerDamage, onDealerDefeat));
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
      setInCombat(false);
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
    showTab(mainTab);
  }
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    setInCombat(false);
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
    setInCombat(false);
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


// Create DOM elements for a card in the player's hand
// card rendering moved to rendering.js

// state flags moved to game/state.js
//let stageProgressing = false;
//let stageProgressInterval = null;
//let progressButtonActive = false;
//let stageEndEnemyActive = false;
//let stageComplete = false;



function openCamp(onCloseCallback = null) {
  if (campOverlayOpen) return;
  setCampOverlayOpen(true);
  setGamePaused(true);
  hidePlayerAttackBar(playerAttackFill);
  setCampOverlay(createOverlay({ className: 'camp-overlay', boxClass: 'parchment-box' }));
  campOverlay.box.classList.add('parchment-box');
  campOverlay.onClose(() => {
    setCampOverlayOpen(false);
    setGamePaused(false);
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
    <div>Avg Combat Lv: ${stats.avgCombatLevel.toFixed(1)}</div>
    <div>Avg Skill Lv: ${stats.avgProficiencyLevel.toFixed(1)}</div>
  `;
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




// Visual pulse when a disciple gains health




//=========player functions===========

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
  setInCombat(false);
  setCurrentEnemy(null);
  removeDealerLifeBar();
  hidePlayerAttackBar(playerAttackFill);
  playerStats.hasDied = false;
  showTab(sectTab);
  setActiveTabButton(playerSectTabButton);
  updateSectDisplay();
}

setPartyDefeatHandler(returnPartyToSect);


function showSpeakerQuote(text) {
  if (speakerOverlay) return;
  const overlay = document.createElement("div");
  overlay.classList.add("speaker-overlay");
  const msg = document.createElement("div");
  msg.classList.add("speaker-quote");
  msg.textContent = text;
  overlay.appendChild(msg);
  document.body.appendChild(overlay);
  setSpeakerOverlay(overlay);
  setTimeout(hideSpeakerQuote, 8000);
}

function hideSpeakerQuote() {
  if (speakerOverlay) {
    speakerOverlay.remove();
    setSpeakerOverlay(null);
  }
}

// Fully wipe saved data and reload the page
export function startNewGame() {
  destroyMetamorphosis();
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("gameSave");
  }
  window.removeEventListener("beforeunload", saveGame);
  clearInterval(saveInterval);
  location.reload();
}

// Regroup disciples and refresh the combat party




// Recalculate combat stats based on active disciples
function updatePlayerStats() {
  stats.avgCombatLevel = 0;
  stats.avgProficiencyLevel = 0;

  if (sectSystem && Array.isArray(sectSystem.disciples) && sectSystem.disciples.length > 0) {
    let combatTotal = 0;
    let profTotal = 0;
    sectSystem.disciples.forEach(d => {
      combatTotal += d.combatLevel || 0;
      profTotal += d.globalLevel || 0;
    });
    const count = sectSystem.disciples.length;
    stats.avgCombatLevel = combatTotal / count;
    stats.avgProficiencyLevel = profTotal / count;
  }

  stats.combatSlots = BASE_STATS.combatSlots;
  renderPlayerStats(stats);
}

//=========save/load functions===========
// Serialize the current game state to localStorage
export function saveGame() {
if (typeof localStorage === "undefined") return;

  const state = {
    stats,
    stageData,
    playerStats,
    worldProgress,
    lifeCore,
    sectSystem,
    sectState,
    sectTabUnlocked,
    systems: {
      buildingUnlocked: systems.buildingUnlocked,
      researchUnlocked: systems.researchUnlocked,
      chantingHallUnlocked: systems.chantingHallUnlocked,
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
  Object.assign(stats, state.stats || {});
  if (state.systems) {
    Object.assign(systems, state.systems);
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
      const { upgrades: _unused, ...restSect } = state.sectSystem;
      Object.assign(sectSystem, restSect);
      // ensure orbs exist for older saves
      if (!sectSystem.orbs || !sectSystem.orbs.water) {
        const water = sectSystem.resources?.water || {};
        sectSystem.orbs = {
          water: {
            current: water.current || 0,
            max: water.max || 20,
            regen: water.regen || 0.1
          }
        };
      }
      // maintain reference between water resource and orb
      sectSystem.resources.water = sectSystem.orbs.water;
      if (sectSystem.weather && sectSystem.weather.days !== undefined) {
        sectSystem.weather.duration = sectSystem.weather.days;
        delete sectSystem.weather.days;
      }

      if (!sectSystem.gains) {
        sectSystem.gains = { water: 0, fruits: 0, softwood: 0 };
      } else {
        if (typeof sectSystem.gains.water !== 'number') sectSystem.gains.water = 0;
        if (typeof sectSystem.gains.fruits !== 'number') sectSystem.gains.fruits = 0;
        if (typeof sectSystem.gains.softwood !== 'number') sectSystem.gains.softwood = 0;
      }

    if (!Array.isArray(sectSystem.savedConstructs)) {
      sectSystem.savedConstructs = [];
    }
    if (!Array.isArray(sectSystem.activeConstructs)) {
      sectSystem.activeConstructs = [];
    }

    // ensure disciples have required stats when loading older saves
    if (Array.isArray(sectSystem.disciples)) {
      sectSystem.disciples.forEach(d => initializeDisciple(d));
    }
  }

  if (state.sectState) {
    Object.assign(sectState, state.sectState);
    sectState.researchProgress = 0; // progress is not persisted
    if (sectSystem.resources && sectSystem.resources.undeadNectar) {
      const res = sectSystem.resources.undeadNectar;
      res.current = sectState.undeadNectar || 0;
      res.unlocked = res.current > 0;
    }
    updateResourceCaps();
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
    if (playerSectTabButton) playerSectTabButton.style.display = '';
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
let pendingSectTime = 0;
let lastRaidState = false;

// Main animation loop; handles ticking the enemy and player actions
function gameLoop(currentTime) {
  const rawDelta = currentTime - lastFrameTime;
  lastFrameTime = currentTime;
  const deltaTime = rawDelta * timeScale;
  bus.publish('TICK', { delta: deltaTime });
  const startWater = sectSystem.resources.water.current;
  const startFruit = sectState.fruits;
  const startSoftwood = sectState.softwood;


  if (currentEnemy) {
    currentEnemy.tick(deltaTime);
    updateDealerLifeBar(currentEnemy);
  }


  updatePlayerStats(stats);
  setWorldProgressTimer(worldProgressTimer + deltaTime);
  if (worldProgressTimer >= 1000) {
    const currentPct = computeWorldProgress(stageData.world) * 100;
    worldProgressRateTracker.record(currentPct);
    if (dom.worldProgressPerSecDisplay) {
      const rate = worldProgressRateTracker.getRate();
      dom.worldProgressPerSecDisplay.textContent = `Avg World Progress/sec: ${rate.toFixed(2)}%`;
    }
    setWorldProgressTimer(0);
  }
  if (currentEnemy) {
    attack(deltaTime);
  }



  let processedDelta = deltaTime;
  if (raidState.active) {
    pendingSectTime += deltaTime;
    processedDelta = 0;
    tickRaid(deltaTime);
  } else {
    if (lastRaidState && pendingSectTime > 0) {
      processedDelta += pendingSectTime;
      pendingSectTime = 0;
    }
    tickSectSystem(processedDelta);
    tickSect(processedDelta);
    tickBuilding(processedDelta / 1000);
  }
  lastRaidState = raidState.active;
  const dtSeconds = processedDelta / 1000;
  if (dtSeconds > 0) {
    sectSystem.gains.water =
      (sectSystem.resources.water.current - startWater) / dtSeconds;
    sectSystem.gains.fruits = (sectState.fruits - startFruit) / dtSeconds;
    sectSystem.gains.softwood =
      (sectState.softwood - startSoftwood) / dtSeconds;
  } else {
    sectSystem.gains.water = 0;
    sectSystem.gains.fruits = 0;
    sectSystem.gains.softwood = 0;
  }
  // refresh sect resource UI every tick for real-time updates
  if (typeof updateSectDisplay === 'function') updateSectDisplay();
  updateTaskProgressDisplay();
  updateDiscipleHealthDisplay();
  updateDiscipleWaterDisplay();
  updateOrbGlow(deltaTime);
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
  setIsDarkenshift(!isDarkenshift);
  localStorage.setItem('isDarkenshift', isDarkenshift);
  applyTheme();
}

document.addEventListener("keydown", e => {
if (e.shiftKey && e.key === "D") {
toggleDebug();
}
});



