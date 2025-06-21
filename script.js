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
import { initPlayerLife, refreshPlayerLife } from "./playerLife.js";
import { Jobs, assignJob, getAvailableJobs, renderJobAssignments, renderJobCarousel } from "./jobs.js"; // job definitions
import RateTracker from "./utils/rateTracker.js";
import { formatNumber } from "./utils/numberFormat.js";
import { initCore, refreshCore } from './core.js';
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
  removeActiveUpgrade
} from "./cardUpgrades.js";
import {
  calculateEnemyHp,
  calculateEnemyBasicDamage,
  spawnDealer,
  spawnBoss
} from "./enemySpawning.js";
import {
  renderCard,
  renderDiscardCard,
  renderDealerLifeBar,
  renderEnemyAttackBar,
  renderPlayerAttackBar,
  renderDealerLifeBarFill
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
// resources and progress trackers
let cash = 0;
let cardPoints = 0;
// Track how many card points have already been converted to cash
let lastCashOutPoints = 0;
let currentEnemy = null;

function spendCash(amount) {
  const amt = Math.min(amount, cash);
  cash -= amt;
  if (cashDisplay) cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  cashRateTracker.record(cash);
  updateUpgradeButtons();
  return amt;
}

// track how many upgrade power points have been bought total
let upgradePowerPurchased = 0;

function upgradePowerCost() {
  return Math.floor(50 * Math.pow(1.5, upgradePowerPurchased));
}

// Persistent player stats affecting combat and rewards
const stats = {
  points: 0,
  upgradePower: 0,
  pDamage: 0,
  pRegen: 0,
  cashMulti: 1,
  damageMultiplier: 1,
  upgradeDamageMultiplier: 1,
  cardSlots: 3,
  //at start max
  attackSpeed: 5000,
  //ms between automatic attacks
  hpPerKill: 1,
  baseCardHpBoost: 0,
  maxMana: 0,
  mana: 0,
  manaRegen: 0,
  healOnRedraw: 0,
  abilityPower: 1,
  spadeDamageMultiplier: 1,
  heartHpMultiplier: 1,
  diamondCashMultiplier: 1,
  playerShield: 0,
  abilityCooldownReduction: 0,
  jokerCooldownReduction: 0,
  redrawCooldownReduction: 0,
  hpMultiplier: 1,
  extraDamageMultiplier: 1,
  drawPoints: 0,
  drawPointsMult: 1,
  damageBuffMultiplier: 1,
  damageBuffExpiration: 0
};

const systems = {
  manaUnlocked: false
};

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
  attackspeed: 10000, //10 sec at start
  progress: 0,
  progressTarget: 100,
  event50: false,
  event75: false
};

let speakerEncounterPending = false;

// Weight a kill's contribution toward world completion based on the stage
// Lower stages contribute less while stages beyond 10 scale slowly upward
function stageWeight(stage) {
  return stage <= 10 ? stage : 10 + Math.sqrt(stage - 10);
}

// Total weighted kills needed for a world to be considered "complete"
const WORLD_PROGRESS_TARGET = 1820; // roughly matches old fixed requirements

const worldProgress = {};
Object.keys(BossTemplates).forEach(id => {
  worldProgress[id] = {
    unlocked: parseInt(id) === 1,
    bossDefeated: false,
    rewardClaimed: false,
    stageKills: {}
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
    handContainer,
    renderCard: card => renderCard(card, handContainer),
    updateDeckDisplay,
    stats,
    showUpgradePopup,
    applyCardUpgrade,
    renderCardUpgrades,
    purchaseCardUpgrade,
    cash,
    renderPurchasedUpgrades,
    updateActiveEffects,
    updateAllCardHp: recalcAllCardHp,
    pDeck,
    shuffleArray,
    updateDrawButton,
    updatePlayerStats,
    drawCard, // will be replaced after definition
  };
}

const btn = document.getElementById("clickalipse");
const redrawBtn = document.getElementById("redrawBtn");
const nextStageBtn = document.getElementById("nextStageBtn");
const moveForwardBtn = document.getElementById("moveForwardBtn");
const fightBossBtn = document.getElementById("fightBossBtn");
const pointsDisplay = document.getElementById("pointsDisplay");
const cashDisplay = document.getElementById("cashDisplay");
const cardPointsDisplay = document.getElementById("cardPointsDisplay");
const handContainer = document.getElementsByClassName("handContainer")[0];
const discardContainer = document.getElementsByClassName("discardContainer")[0];
const dealerLifeDisplay =
document.getElementsByClassName("dealerLifeDisplay")[0];
const killsDisplay = document.getElementById("kills");
const cashPerSecDisplay = document.getElementById("cashPerSecDisplay");
const worldProgressPerSecDisplay = document.getElementById("worldProgressPerSecDisplay");
const deckListContainer = document.querySelector('.deckListContainer');
const deckTabContainer = document.querySelector('.deckTabContainer');
const jokerViewContainer = document.querySelector('.jokerViewContainer');
const deckJobsContainer = document.querySelector('.deckJobsContainer');
const jobCarouselContainer = document.querySelector('.jobCarouselContainer');
const dCardContainer = document.getElementsByClassName("dCardContainer")[0];
const dealerContainer = document.querySelector('.dealerContainer');
const stageProgressFill = document.getElementById("stageProgressFill");
const jokerContainers = document.querySelectorAll(".jokerContainer");
const manaBar = document.getElementById("manaBar");
const manaFill = document.getElementById("manaFill");
const manaText = document.getElementById("manaText");
const manaRegenDisplay = document.getElementById("manaRegenDisplay");
const dpsDisplay = document.getElementById("dpsDisplay");

const unlockedJokers = [];

// attack progress bars
let playerAttackFill = null;
let enemyAttackFill = null;
let playerAttackTimer = 0;
let enemyAttackProgress = 0; // carryover ratio of enemy attack timer
let cashTimer = 0;
let worldProgressTimer = 0;
const cashRateTracker = new RateTracker(10000);
const worldProgressRateTracker = new RateTracker(30000);
const EVENT_CHANCE = 0.5;

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
let mainTab;
let cardSubTab;
let deckTab;
let starChartTab;
let playerStatsTab;
let worldsTab;
let playerTab;
let purchasedUpgradeList;
let activeEffectsContainer;
let tooltip;
let deckViewBtn;
let jokerViewBtn;
let deckUpgradesViewBtn;
let deckUpgradesContainer;
let redrawCostDisplay;
let playerSkillsSubTabButton;
let playerCoreSubTabButton;
let playerSkillsPanel;
let playerCorePanel;
let jobsViewBtn;
let jobsCarouselBtn;

function setActiveTabButton(btn) {
  document.querySelectorAll('.tabsContainer button').forEach(b => {
    b.classList.toggle('active', b === btn);
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
}

function showTab(tab) {
  hideTab();
  // Reset display so CSS controls layout
  if (tab) tab.style.display = "";
}

function hideUpgradePanels() {}
function showBarUpgradesPanel() {}
function showCardUpgradesPanel() {}

function initTabs() {
  if (typeof document === 'undefined') return;

  mainTabButton = document.querySelector('.mainTabButton');
  deckTabButton = document.querySelector('.deckTabButton');
  starChartTabButton = document.querySelector('.starChartTabButton');
  playerStatsTabButton = document.querySelector('.playerStatsTabButton');
  cardSubTabButton = document.querySelector('.cardSubTabButton');
  worldSubTabButton = document.querySelector('.worldSubTabButton');
  playerTabButton = document.querySelector('.playerTabButton');
  mainTab = document.querySelector('.mainTab');
  cardSubTab = document.querySelector('.cardSubTab');
  deckTab = document.querySelector('.deckTab');
  starChartTab = document.querySelector('.starChartTab');
  playerStatsTab = document.querySelector('.playerStatsTab');
  worldsTab = document.querySelector('.worldsTab');
  playerTab = document.querySelector('.playerTab');
  purchasedUpgradeList = document.querySelector('.purchased-upgrade-list');
  activeEffectsContainer = document.querySelector('.active-effects');
  tooltip = document.getElementById('tooltip');
  deckViewBtn = document.querySelector('.deckViewBtn');
  jokerViewBtn = document.querySelector('.jokerViewBtn');
  deckUpgradesViewBtn = document.querySelector('.deckUpgradesViewBtn');
  deckUpgradesContainer = document.querySelector('.deckUpgradesContainer');
  redrawCostDisplay = document.getElementById('redrawCostDisplay');
  jobsViewBtn = document.querySelector('.jobsViewBtn');
  jobsCarouselBtn = document.querySelector('.jobsCarouselBtn');
  playerSkillsSubTabButton = document.querySelector(".playerSkillsSubTabButton");
  playerCoreSubTabButton = document.querySelector(".playerCoreSubTabButton");
  playerSkillsPanel = document.querySelector(".player-skills-panel");
  playerCorePanel = document.querySelector(".player-core-panel");
  if (mainTabButton)
    mainTabButton.addEventListener("click", () => {
      showTab(mainTab);
      setActiveTabButton(mainTabButton);
    });

  if (deckTabButton)
    deckTabButton.addEventListener("click", () => {
      showTab(deckTab);
      setActiveTabButton(deckTabButton);
      showDeckListView();
    });

  if (starChartTabButton) {
    starChartTabButton.addEventListener("click", () => {
      initStarChart();
      showTab(starChartTab);
      setActiveTabButton(starChartTabButton);
    });
  }

  if (playerStatsTabButton) {
    playerStatsTabButton.addEventListener("click", () => {
      renderGlobalStats();
      showTab(playerStatsTab);
      setActiveTabButton(playerStatsTabButton);
    });
  }


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

  if (playerTabButton) {
    playerTabButton.addEventListener('click', () => {
      refreshPlayerLife();
      refreshCore();
      showTab(playerTab);
      setActiveTabButton(playerTabButton);
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
  if (playerSkillsSubTabButton)
    playerSkillsSubTabButton.addEventListener("click", () => {
      if (playerSkillsPanel) playerSkillsPanel.style.display = "flex";
      if (playerCorePanel) playerCorePanel.style.display = "none";
      playerSkillsSubTabButton.classList.add("active");
      if (playerCoreSubTabButton) playerCoreSubTabButton.classList.remove("active");
    });
  if (playerCoreSubTabButton)
    playerCoreSubTabButton.addEventListener("click", () => {
      if (playerSkillsPanel) playerSkillsPanel.style.display = "none";
      if (playerCorePanel) playerCorePanel.style.display = "flex";
      playerCoreSubTabButton.classList.add("active");
      if (playerSkillsSubTabButton) playerSkillsSubTabButton.classList.remove("active");
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

// Build the upgrade shop list in the Deck tab
function renderUpgrades() {
  const container = document.querySelector(".upgrade-list");
  if (!container) return;
  container.innerHTML = "";

  Object.entries(upgrades).forEach(([key, up]) => {
    if (!up.unlocked) return;
    const row = document.createElement("div");
    row.classList.add("upgrade-item");
    row.dataset.key = key;

    const label = document.createElement("span");
    label.textContent = `${up.name} (Lv. ${up.level})`;

    const cost = up.costFormula(up.level + 1);
    const btn = document.createElement("button");
    btn.textContent = `Buy $${cost}`;
    if (cash < cost) {
      btn.disabled = true;
      row.classList.add("unaffordable");
    } else {
      row.classList.add("affordable");
    }
    btn.addEventListener("click", () => purchaseUpgrade(key));

    row.append(label, btn);
    container.appendChild(row);
  });
}

// Refresh button states (enabled/disabled) based on available cash
function updateUpgradeButtons() {
  document.querySelectorAll(".upgrade-item").forEach(row => {
    const key = row.dataset.key;
    const btn = row.querySelector("button");
    if (!key || !btn) return;
    const up = upgrades[key];
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

function purchaseUpgrade(key) {
  const up = upgrades[key];
  const cost = up.costFormula(up.level + 1);
  if (cash < cost) return;
  cash -= cost;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  cashRateTracker.record(cash);
  up.level += 1;
  up.effect({ stats, pDeck, stageData, systems });
  updateDrawButton();
  renderPlayerStats(stats);
}

function purchaseCardUpgrade(id, cost) {
  if (cash < cost) return;
  cash -= cost;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  cashRateTracker.record(cash);
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
    cardEl.classList.add('card', 'upgrade-card');
    cardEl.innerHTML = `<div class="card-suit"><i data-lucide="sword"></i></div><div class="card-desc">${def.name} (Lv. ${lvl})</div>`;
    wrap.appendChild(cardEl);
    purchasedUpgradeList.appendChild(wrap);
  });
  lucide.createIcons();
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

function updateUpgradePowerDisplay() {
  const el = document.getElementById('upgradePowerDisplay');
  if (el) el.textContent = `Upgrade Power: ${formatNumber(Math.floor(stats.upgradePower))}`;
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

function allocateBarPoint(key) {
  if (stats.upgradePower <= 0) return;
  const bar = barUpgrades[key];
  bar.points += 1;
  stats.upgradePower -= 1;
  updateBarUI(key);
  updateUpgradePowerDisplay();
}

function deallocateBarPoint(key) {
  const bar = barUpgrades[key];
  if (bar.points <= 0) return;
  bar.points -= 1;
  stats.upgradePower += 1;
  updateBarUI(key);
  updateUpgradePowerDisplay();
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

function renderBarUpgrades() {
  const container = document.querySelector('.bar-upgrades');
  if (!container) return;
  container.innerHTML = '';
  Object.entries(barUpgrades).forEach(([key, bar]) => {
    const row = document.createElement('div');
    row.classList.add('bar-upgrade');
    row.dataset.key = key;
    const header = document.createElement('div');
    header.classList.add('bar-header');
    const label = document.createElement('div');
    label.classList.add('bar-label');
    label.textContent = key === 'damage' ? 'Damage' : 'Max HP';
    const info = document.createElement('div');
    info.classList.add('bar-info');
    header.append(label, info);
    const barEl = document.createElement('div');
    barEl.classList.add('bar');
    const fill = document.createElement('div');
    fill.classList.add('bar-fill');
    barEl.appendChild(fill);
    const controls = document.createElement('div');
    controls.classList.add('bar-controls');
    const minus = document.createElement('button');
    minus.textContent = '-';
    minus.addEventListener('click', () => deallocateBarPoint(key));
    const pts = document.createElement('span');
    pts.classList.add('bar-points');
    pts.textContent = bar.points;
    const plus = document.createElement('button');
    plus.textContent = '+';
    plus.addEventListener('click', () => allocateBarPoint(key));
    controls.append(minus, pts, plus);
    row.append(header, barEl, controls);
    container.appendChild(row);
    updateBarUI(key);
  });
  updateUpgradePowerDisplay();
}
//=========card tab==========

// Render a single card inside the Deck tab listing
function renderTabCard(card) {
  // 1) Wrapper
  const wrapper = document.createElement("div");
  wrapper.classList.add("card-wrapper");

  // 2) Card pane (value / suite / HP)
  const cardPane = document.createElement("div");
  cardPane.classList.add("card");
  cardPane.innerHTML = `
  <div class="card-value" style="color: ${card.color}">${card.value}</div>
  <div class="card-suit" style="color: ${card.color}">${card.symbol}</div>
  <div class="card-hp">HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}</div>
  `;

  // 3) XP bar
  const xpBar = document.createElement("div");
  const xpBarFill = document.createElement("div");
  const xpLabel = document.createElement("div");
  xpBar.classList.add("xpBar");
  xpBarFill.classList.add("xpBarFill");
  xpLabel.classList.add("xpBarLabel");
  xpLabel.textContent = `LV: ${card.currentLevel}`;
  xpBar.append(xpBarFill, xpLabel);

  // 4) Store references on the card object for deck tab
  card.deckXpBarFill = xpBarFill;
  card.deckXpLabel = xpLabel;
  card.deckHpDisplay = cardPane.querySelector(".card-hp");

  // 5) Nest and append
  wrapper.append(cardPane, xpBar);
  deckTabContainer.appendChild(wrapper);

  wrapper.addEventListener("mouseover", e => {
    tooltip.innerHTML = `
    <strong>${card.value}${card.symbol}</strong><br>
    Level: ${card.currentLevel}<br>
    XP: ${formatNumber(card.XpCurrent)}/${formatNumber(card.XpReq)}<br>
    Damage: ${formatNumber(card.damage)}<br>
    `;
    tooltip.style.display = "block";
  });

  // move with the mouse
  wrapper.addEventListener("mousemove", e => {
    // offset so the tip doesn’t sit *under* the cursor
    tooltip.style.left = e.pageX + 10 + "px";
    tooltip.style.top = e.pageY + 10 + "px";
  });

  // hide when you leave
  wrapper.addEventListener("mouseout", () => {
    tooltip.style.display = "none";
  });
}

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
  loadGame();
  initVignetteToggles();
  initPlayerLife({ getGameCash: () => cash, spendGameCash: spendCash });
  initCore();
  window.addEventListener('core-mind-upgrade', () => {
    stats.maxMana += 10;
    updateManaBar();
  });
  showDeckListView();
  Object.values(upgrades).forEach(u => u.effect({ stats, pDeck, stageData, systems }));
  renderPurchasedUpgrades();
  // Start or resume the game after loading
  spawnPlayer();
  stageData.progress = 0;
  stageData.progressTarget = 100;
  stageData.event50 = false;
  stageData.event75 = false;
  updateStageProgressDisplay();
  renderDealerCard();
  resetStageCashStats();
  renderStageInfo();
  renderWorldsMenu();
  renderJobAssignments(deckJobsContainer, pDeck);
  rollNewCardUpgrades();
  renderPurchasedUpgrades();
  shuffleArray(deck);
  checkUpgradeUnlocks();

  nextStageBtn.style.display = 'none';
  moveForwardBtn.style.display = 'inline-block';

  btn.addEventListener("click", () => drawCard(getCardState()));
  redrawBtn.addEventListener("click", handleRedraw);
  moveForwardBtn.addEventListener("click", moveForward);
  nextStageBtn.addEventListener("click", nextStage);
  fightBossBtn.addEventListener("click", () => {
    fightBossBtn.style.display = "none";
    stageData.stage = 10;
    stageData.kills = playerStats.stageKills[stageData.stage] || 0;
    renderStageInfo();
    currentEnemy = spawnBoss(
      stageData,
      enemyAttackProgress,
      boss => {
        const { minDamage, maxDamage } = calculateEnemyBasicDamage(
          stageData.stage,
          stageData.world
        );
        const dmg = Math.floor(Math.random() * (maxDamage - minDamage + 1)) +
          minDamage;
        cDealerDamage(dmg, null, boss.name);
      },
      () => onBossDefeat(currentEnemy)
    );
    updateDealerLifeDisplay();
    enemyAttackFill = renderEnemyAttackBar();
    dealerDeathAnimation();
  });
  renderJokers();
  const buttons = document.querySelector('.buttonsContainer');
  playerAttackFill = renderPlayerAttackBar(buttons);
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
  stageDisplay.textContent = `Stage ${stageData.stage} World ${stageData.world}`;
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
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
  const dpDisp = document.getElementById('drawPointsDisplay');
  if (dpDisp) dpDisp.textContent = `DP: ${formatNumber(stats.drawPoints)}`;
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
  const container = document.getElementById("playerStatsContainer");
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

function renderDealerCard() {
  const {
    minDamage,
    maxDamage
  } = calculateEnemyBasicDamage(
    stageData.stage,
    stageData.world
  ); //calculate damage for the current stage min and max

  // define d container wrapper
  const dCardWrapper = document.createElement("div");
  dCardWrapper.classList.add("dCardWrapper");

  const dCardPane = document.createElement("div");
  dCardPane.classList.add("dCardPane");
  const typeClass = currentEnemy instanceof Boss ? "boss": "dealer";
  dCardPane.classList.add(typeClass);

  const dCardAbilityPane = document.createElement("div");
  dCardAbilityPane.classList.add("dCardAbilityPane");

  if (currentEnemy instanceof Boss) {
    let abilitiesHTML = `<div class="dCard_abilities">`;

    for (const ability of currentEnemy.abilities) {
      const icon = ability.icon || "sparkles";
      const label = ability.label || "Ability";
      const isOnCooldown = ability.timer < ability.cooldown;
      const cooldownRatio = ability.timer / ability.cooldown;
      const typeClass = ability.colorClass || "";
      const cooldownClass =
      ability.timer &&
      ability.cooldown &&
      ability.timer < ability.cooldown
      ? "onCooldown": "";

      abilitiesHTML += `<div class="dCard_ability ${cooldownClass} ${typeClass}" title="${label}">
      <i data-lucide="${icon}"></i>
      ${
      isOnCooldown
      ? `<div class="cooldown-overlay" style="--cooldown:${cooldownRatio}"></div>`: ""
      }
      </div>`;
    }
    abilitiesHTML += `</div>`;

    const iconColor = currentEnemy.iconColor || "#a04444";
    dCardPane.innerHTML = `
    <i data-lucide="${currentEnemy.icon}" class="dCard__icon" style="color:${iconColor}"></i>
    <span class="dCard__text">
    ${currentEnemy.name}<br>
    Damage: ${formatNumber(minDamage)} - ${formatNumber(maxDamage)}
    </span>
    `;

    //add abilities to the card
    dCardAbilityPane.innerHTML = abilitiesHTML;
    // apend card pane data and ability data to wrapper
    dCardWrapper.appendChild(dCardPane);
    dCardWrapper.appendChild(dCardAbilityPane);
    // append wrapper to container
    dCardContainer.appendChild(dCardWrapper);
    lucide.createIcons();
  } else {
    let abilitiesHTML = `<div class="dCard_abilities">`;
    for (const ability of currentEnemy.abilities) {
      const icon = ability.icon || "sparkles";
      const label = ability.label || "Ability";

      abilitiesHTML += `<div class="dCard_ability" title="${label}">
      <i data-lucide="${icon}"></i>
      </div>`;
    }
    abilitiesHTML += `</div>`;

    const {
      color,
      blur
    } = getDealerIconStyle(stageData.stage);
    dCardPane.innerHTML = `
    <i data-lucide="skull" class="dCard__icon" style="stroke:${color}; filter: drop-shadow(0 0 ${blur}px ${color});"></i>
    <span class="dCard__text">
    ${currentEnemy.name}<br>
    Damage: ${formatNumber(Math.floor(minDamage))} - ${formatNumber(Math.floor(maxDamage))}
    </span>
    `;

    //add abilities to the card
    dCardAbilityPane.innerHTML = abilitiesHTML;
    // apend card pane data and ability data to wrapper
    dCardWrapper.appendChild(dCardPane);
    dCardWrapper.appendChild(dCardAbilityPane);
    // append wrapper to container
    dCardContainer.appendChild(dCardWrapper);
    lucide.createIcons();
  }
}

function animateCardHit(card) {
  const w = card.wrapperElement;
  if (!w) return;

  const target = card.cardElement || w;
  target.classList.remove("hit-animate");
  void target.offsetWidth;
  target.classList.add("hit-animate");
  target.addEventListener(
    "animationend",
    () => target.classList.remove("hit-animate"),

    {
      once: true
    }
  );
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
  setTimeout(() => dmg.remove(), 1000);
}

//=========stage functions===========

function recordWorldKill(world, stage) {
  const data = worldProgress[world];
  if (!data) return;
  data.stageKills[stage] = (data.stageKills[stage] || 0) + 1;
  updateWorldProgressUI(world);
  if (world === stageData.world) {
    worldProgressRateTracker.record(computeWorldProgress(world) * 100);
  }
}

function computeWorldWeight(id) {
  const data = worldProgress[id];
  if (!data) return 0;
  let weight = 0;
  for (const [stage, kills] of Object.entries(data.stageKills)) {
    weight += stageWeight(parseInt(stage)) * kills;
  }
  return weight;
}

function computeWorldProgress(id) {
  return Math.min(computeWorldWeight(id) / WORLD_PROGRESS_TARGET, 1);
}

function updateWorldProgressUI(id) {
  const pct = computeWorldProgress(id) * 100;
  const weight = computeWorldWeight(id);
  const fill = document.querySelector(
    `.world-progress[data-world="${id}"] .world-progress-fill`
  );
  if (fill) fill.style.width = `${pct}%`;
  const textEl = document.querySelector(
    `.world-progress-text[data-world="${id}"]`
  );
  if (textEl) {
    textEl.textContent = `${weight}/${WORLD_PROGRESS_TARGET} (${pct.toFixed(1)}%)`;
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
    entry.innerHTML = `<div>World ${id}</div>`;
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
  resetStageCashStats();
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  checkSpeakerEncounter();
  // start the next stage without double-counting points
  lastCashOutPoints = stats.points;
  stageData.progress = 0;
  stageData.progressTarget = 100;
  stageData.event50 = false;
  stageData.event75 = false;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  moveForwardBtn.style.display = 'inline-block';
  nextStageBtn.style.display = 'none';
  updateStageProgressDisplay();
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
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  // entering a new world resets cash-out tracking
  lastCashOutPoints = stats.points;
  stageData.progress = 0;
  stageData.progressTarget = 100;
  stageData.event50 = false;
  stageData.event75 = false;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  moveForwardBtn.style.display = 'inline-block';
  nextStageBtn.style.display = 'none';
  updateStageProgressDisplay();
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
  renderGlobalStats();
  renderStageInfo();
  checkUpgradeUnlocks();
  lastCashOutPoints = stats.points;
  stageData.progress = 0;
  stageData.progressTarget = 100;
  stageData.event50 = false;
  stageData.event75 = false;
  inCombat = false;
  currentEnemy = null;
  redrawAllowed = false;
  moveForwardBtn.style.display = 'inline-block';
  nextStageBtn.style.display = 'none';
  updateStageProgressDisplay();
  renderWorldsMenu();
  updateWorldTabNotification();
}

// Reset tracking for average cash when a new stage begins
function resetStageCashStats() {
  cashTimer = 0;
  cashRateTracker.reset(cash);
  if (cashPerSecDisplay) {
    cashPerSecDisplay.textContent = "Avg Cash/sec: 0";
  }
}

// Enable the next stage button when kill requirements met
function nextStageChecker() {
  const ready = stageData.progress >= stageData.progressTarget;
  nextStageBtn.disabled = !ready;
  nextStageBtn.style.background = ready ? "green" : "grey";
}

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
  currentEnemy = spawnDealer(
    temp,
    enemyAttackProgress,
    Enemy => {
      const { minDamage, maxDamage } = calculateEnemyBasicDamage(temp.stage, temp.world);
      const dmg = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
      cDealerDamage(dmg, null, Enemy.name);
    },
    onDealerDefeat
  );
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  dealerDeathAnimation();
}

function spawnBossEvent() {
  inCombat = true;
  removeDealerLifeBar();
  currentEnemy = spawnBoss(
    stageData,
    enemyAttackProgress,
    boss => {
      const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world);
      const dmg = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
      cDealerDamage(dmg, null, boss.name);
    },
    () => onBossDefeat(currentEnemy)
  );
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  dealerDeathAnimation();
}

function triggerRandomEvent() {
  const roll = Math.random();
  if (roll < 0.6) {
    spawnDealerEvent(1);
  } else if (roll < 0.7) {
    spawnDealerEvent(1.3);
  } else if (roll < 0.9) {
    openCamp();
  }
}

function maybeTriggerEvent() {
  if (Math.random() < EVENT_CHANCE) {
    triggerRandomEvent();
  }
}

function updateStageProgressDisplay() {
  if (stageProgressFill) {
    const ratio = Math.min(stageData.progress / stageData.progressTarget, 1);
    stageProgressFill.style.width = `${ratio * 100}%`;
  }
  const disp = document.getElementById('distanceDisplay');
  if (disp) disp.textContent = `distance: ${Math.floor(stageData.progress)}/${stageData.progressTarget}`;
}

function moveForward() {
  if (currentEnemy || campOverlayOpen || upgradeSelectionOpen) return;
  stageData.progress = Math.min(stageData.progress + 25, stageData.progressTarget);
  updateStageProgressDisplay();
  if (!stageData.event50 && stageData.progress >= stageData.progressTarget * 0.5) {
    stageData.event50 = true;
    maybeTriggerEvent();
  }
  if (!stageData.event75 && stageData.progress >= stageData.progressTarget * 0.75) {
    stageData.event75 = true;
    maybeTriggerEvent();
  }
  if (stageData.progress >= stageData.progressTarget) {
    moveForwardBtn.style.display = 'none';
    nextStageBtn.style.display = 'inline-block';
    nextStageChecker();
  }
}

// After a kill, decide whether to spawn a dealer or a boss
function respawnDealerStage() {
  removeDealerLifeBar();
  if (speakerEncounterPending) {
    speakerEncounterPending = false;
    currentEnemy = spawnSpeaker(
      stageData,
      enemyAttackProgress,
      e => {
        const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world);
        const dmg = (Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage) * 3;
        cDealerDamage(dmg, null, e.name);
      },
      onSpeakerDefeat
    );
  } else if (stageData.stage === 10) {
    currentEnemy = spawnBoss(
      stageData,
      enemyAttackProgress,
      boss => {
        const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world);
        const dmg = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
        cDealerDamage(dmg, null, boss.name);
      },
      () => onBossDefeat(currentEnemy)
    );
  } else {
    currentEnemy = spawnDealer(
      stageData,
      enemyAttackProgress,
      Enemy => {
        const { minDamage, maxDamage } = calculateEnemyBasicDamage(stageData.stage, stageData.world);
        const dmg = Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;
        cDealerDamage(dmg, null, Enemy.name);
      },
      onDealerDefeat
    );
  }
  updateDealerLifeDisplay();
  enemyAttackFill = renderEnemyAttackBar();
  dealerDeathAnimation();
}

// What happens after defeating a regular dealer
function onDealerDefeat() {
  // capture remaining attack progress before resetting
  enemyAttackProgress = currentEnemy.attackTimer / currentEnemy.attackInterval;
  cardXp(stageData.stage ** 1.5 * stageData.world);
  cashOut();
  healCardsOnKill();
  stageData.kills += 1;
  playerStats.stageKills[stageData.stage] = stageData.kills;
  killsDisplay.textContent = `Kills: ${formatNumber(stageData.kills)}`;
  renderGlobalStats();
  recordWorldKill(stageData.world, stageData.stage);
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    currentEnemy = null;
    updateDealerLifeDisplay();
  });
} // need to define xp formula

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
    updateDealerLifeDisplay();
  });
}

// Called when the player defeats a boss enemy
function onBossDefeat(boss) {
  // capture remaining attack progress before resetting
  enemyAttackProgress = boss.attackTimer / boss.attackInterval;
  cardXp(boss.xp);
  worldProgress[stageData.world].bossDefeated = true;
  worldProgress[stageData.world].rewardClaimed = false;
  if (worldProgress[stageData.world + 1]) {
    worldProgress[stageData.world + 1].unlocked = true;
  }
  addLog(`${boss.name} was defeated!`);
  currentEnemy = null;

  playerStats.totalBossKills += 1;
  renderGlobalStats();

  healCardsOnKill();
  stats.upgradePower += 5;
  rollNewCardUpgrades();
  renderPurchasedUpgrades();
  shuffleArray(deck);
  checkSpeakerEncounter();
  // Unlock the next world but require the player to travel manually
  updateWorldTabNotification();
  renderWorldsMenu();
  fightBossBtn.style.display = "none";
  dealerDeathAnimation();
  dealerBarDeathAnimation(() => {
    inCombat = false;
    currentEnemy = null;
    nextWorld();
  });
}

// Spawn the boss that appears every 10 stages
// Spawn logic moved to enemySpawning.js

// Update text and bar UI for the current enemy's health
function updateDealerLifeDisplay() {
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
    showRestartScreen();
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

  // target the front‐line card
  const card = drawnCards[0];

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
  // if it’s dead, remove it
  if (card.currentHp === 0) {
    // immediately remove from data so new draws don't shift the wrong card
    drawnCards.shift();

    animateCardDeath(card, () => {
      // 1) from the DOM
      card.wrapperElement?.remove();

      discardCard(card);
      updatePlayerStats(stats);
      updateDrawButton();
      updateDeckDisplay();
      if (drawnCards.length === 0 && deck.length === 0) {
        showRestartScreen();
      }
    });
  }
  // Optional ability logic (e.g., healing, fireball
}

function dealerDeathAnimation() {
  const dCardWrapper = document.querySelector(".dCardWrapper:last-child");
  const dCardPane = document.querySelector(".dCardPane");
  if (!dCardWrapper) return;

  dCardWrapper.classList.add("dealer-dead");
  dCardPane.classList.add("dealer-dead");

  dCardWrapper.addEventListener(
    "animationend",
    () => {
      dCardContainer.innerHTML = "";
      renderDealerCard();
    },
    {
      once: true
    }
  );
}

function dealerBarDeathAnimation(callback) {
  const bar = document.querySelector(".dealerLifeContainer");
  if (!bar) {
    if (callback) callback();
    return;
  }
  bar.classList.add("bar-dead");
  bar.addEventListener(
    "animationend",
    () => {
      removeDealerLifeBar();
      if (callback) callback();
    },
    {
      once: true
    }
  );
}

//========deck functions===========

function cardXp(xpAmount) {
  drawnCards.forEach(card => {
    if (!card) return;

    const leveled = card.gainXp(xpAmount);
    if (leveled) {
      cardPoints += 1;
      animateCardLevelUp(card);
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
  if (stats.cardSlots === drawnCards.length) {
    btn.disabled = true;
    btn.style.background = "grey";
  } else {
    btn.disabled = false;
    btn.style.background = "green";
  }
}

function updateRedrawButton() {
  if (!redrawBtn) return;
  redrawBtn.textContent = `🔄`;
  if (redrawCostDisplay)
    redrawCostDisplay.textContent = `Cost: $${redrawCost}`;
  redrawBtn.disabled = cash < redrawCost;
}

// Refresh the cards currently shown in the player's hand
function updateHandDisplay() {
  drawnCards.forEach(card => {
    if (!card || !card.hpDisplay) return; // Skip if card or elements are missing
    card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(Math.round(card.maxHp))}`;
    card.xpLabel.textContent = `LV: ${card.currentLevel}`;
    card.xpBarFill.style.width = `${(card.XpCurrent / card.XpReq) * 100}%`;
  });
}

// Create DOM elements for a card in the player's hand
// card rendering moved to rendering.js

// Move a card to the discard pile and update the UI
function discardCard(card) {
  discardPile.push(card);
  renderDiscardCard(card);
}

// Passive healing based on Hearts in your hand
function heartHeal() {
  if (drawnCards.length === 0) return;

  const target = drawnCards[0];
  if (target.currentHp === target.maxHp) return;

  drawnCards.forEach(card => {
    if (card.suit === "Hearts") {
      target.currentHp = Math.round(
        Math.min(target.currentHp + card.currentLevel, target.maxHp)
      );
      animateCardHeal(target);
    }
  });
  target.hpDisplay.textContent = `HP: ${formatNumber(Math.round(target.currentHp))}/${formatNumber(Math.round(target.maxHp))}`;
}

let gamePaused = false;
let campOverlayOpen = false;
let campOverlay = null;
let inCombat = false;
let redrawAllowed = false;
let upgradeSelectionOpen = false;
let upgradeOverlay = null;
let redrawCost = 10;

function handleRedraw() {
  if (!redrawAllowed) return;
  if (cash < redrawCost) return;
  spendCash(redrawCost);
  stats.drawPoints = (stats.drawPoints || 0) + stats.drawPointsMult;
  redrawCost = redrawCost * 2;
  redrawHand(getCardState());
  updateRedrawButton();
  renderPlayerStats(stats);
  openCardUpgradeSelection();
}

function openCardUpgradeSelection() {
  if (upgradeSelectionOpen) return;
  upgradeSelectionOpen = true;
  gamePaused = true;
  dCardContainer.innerHTML = '';
  upgradeOverlay = document.createElement('div');
  upgradeOverlay.classList.add('upgrade-selection-overlay');
  dealerContainer.appendChild(upgradeOverlay);
  const ids = rollNewCardUpgrades(3);
  ids.forEach(id => {
    const def = cardUpgradeDefinitions[id];
    const cost = getCardUpgradeCost(id, { points: stats.points }, stageData);
    const wrap = document.createElement('div');
    wrap.classList.add('card-wrapper');
    const card = document.createElement('div');
    card.classList.add('card', 'upgrade-card');
    card.innerHTML = `<div class="card-suit"><i data-lucide="sword"></i></div><div class="card-desc">${def.name} - $${cost}</div>`;
    wrap.appendChild(card);
    wrap.addEventListener('click', () => {
      purchaseCardUpgrade(id, cost);
      closeCardUpgradeSelection();
    });
    upgradeOverlay.appendChild(wrap);
  });
  lucide.createIcons();
}

function closeCardUpgradeSelection() {
  if (!upgradeSelectionOpen) return;
  upgradeSelectionOpen = false;
  dCardContainer.innerHTML = '';
  if (upgradeOverlay) {
    upgradeOverlay.remove();
    upgradeOverlay = null;
  }
  renderDealerCard();
  gamePaused = false;
}

function openCamp(withUpgrade = false) {
  if (campOverlayOpen) return;
  campOverlayOpen = true;
  redrawAllowed = true;
  gamePaused = true;
  campOverlay = document.createElement('div');
  campOverlay.classList.add('upgrade-selection-overlay', 'camp-overlay');
  const continueBtn = document.createElement('button');
  continueBtn.textContent = 'Continue';
  continueBtn.addEventListener('click', () => {
    closeCamp();
  });
  const redrawBtn = document.createElement('button');
  redrawBtn.textContent = 'Redraw & Cash Out';
  redrawBtn.addEventListener('click', () => {
    cashOut();
    handleRedraw();
    closeCamp();
  });
  const healBtn = document.createElement('button');
  healBtn.textContent = 'Heal Party';
  healBtn.addEventListener('click', () => {
    drawnCards.forEach(c => {
      if (!c) return;
      c.currentHp = Math.min(c.maxHp, c.currentHp + c.maxHp * 0.5);
    });
    updateHandDisplay();
    closeCamp();
  });
  campOverlay.appendChild(continueBtn);
  campOverlay.appendChild(redrawBtn);
  campOverlay.appendChild(healBtn);
  if (withUpgrade) {
    const upBtn = document.createElement('button');
    upBtn.textContent = 'Upgrade Card';
    upBtn.addEventListener('click', () => {
      closeCamp();
      openCardUpgradeSelection();
    });
    campOverlay.appendChild(upBtn);

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next Stage';
    nextBtn.addEventListener('click', () => {
      closeCamp();
      nextStage();
    });
    campOverlay.appendChild(nextBtn);
  }
  dealerContainer.appendChild(campOverlay);
  updateRedrawButton();
}

function closeCamp() {
  if (!campOverlayOpen) return;
  campOverlayOpen = false;
  redrawAllowed = false;
  if (campOverlay) {
    campOverlay.remove();
    campOverlay = null;
  }
  gamePaused = false;
  updateRedrawButton();
}


// Visual pulse when a card gains health
function animateCardHeal(card) {
  const w = card.wrapperElement;
  w.classList.add("heal-animate");
  w.addEventListener(
    "animationend",
    () => w.classList.remove("heal-animate"),
    {
      once: true
    }
  );
}

// Brief animation shown when a card levels up
function animateCardLevelUp(card) {
  const w = card.wrapperElement;
  w.classList.add("levelup-animate");
  w.addEventListener(
    "animationend",
    () => w.classList.remove("levelup-animate"),
    {
      once: true
    }
  );
}

function showUpgradePopup(id) {
  const def = cardUpgradeDefinitions[id];
  if (!def) return;
  const wrapper = document.createElement('div');
  wrapper.classList.add('upgrade-popup');
  wrapper.innerHTML = `
    <div class="card-wrapper">
      <div class="card upgrade-card">
        <div class="card-suit"><i data-lucide="sword"></i></div>
        <div class="card-desc">${def.name}</div>
      </div>
    </div>`;
  document.body.appendChild(wrapper);
  lucide.createIcons();
  setTimeout(() => wrapper.remove(), 3000);
}

// Fade out and remove the card when its HP reaches zero
function animateCardDeath(card, callback) {
  const w = card.wrapperElement;
  if (!w) {
    callback?.();
    return;
  }
  const onEnd = () => {
    w.classList.remove("card-death");
    w.removeEventListener("animationend", onEnd);
    callback?.();
  };

  w.addEventListener("animationend", onEnd, {
    once: true
  });
  w.classList.add("card-death");

  // Fallback: ensure removal even if animation events don't fire
  setTimeout(onEnd, 600);
}

function healCardsOnKill() {
  drawnCards.forEach(card => {
    if (!card) return;
    card.healFromKill();
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

function openJokerDetails(joker) {
  // Legacy overlay display no longer used
}

function showJokerTooltip(joker, x, y) {
  if (!tooltip) return;
  tooltip.innerHTML = `<strong>${joker.name}</strong><br>${joker.description}<br>Mana Cost: ${joker.manaCost}`;
  tooltip.style.display = "block";
  tooltip.style.left = x + "px";
  tooltip.style.top = y + "px";
}

document.addEventListener("click", e => {
  if (!e.target.closest(".joker-wrapper")) {
    if (tooltip) tooltip.style.display = "none";
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
}

function respawnPlayer() {
  enemyAttackProgress = 0;
  playerStats.hasDied = false;
  cash = 0;
  cashRateTracker.reset(cash);

  deck = [...pDeck];
  drawnCards = [];
  discardPile = [];
  redrawCost = 10;
  updateRedrawButton();

  rollNewCardUpgrades();
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

  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  cashRateTracker.reset(cash);
  updateUpgradeButtons();
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

let restartOverlay = null;
let restartTimer = null;

function showRestartScreen() {
if (restartOverlay) return;
playerStats.hasDied = true;
restartOverlay = document.createElement("div");
restartOverlay.classList.add("restart-overlay");

const message = document.createElement("div");
message.classList.add("restart-message");
message.textContent = "Game Over";

const btn = document.createElement("button");
btn.textContent = "Restart";
btn.addEventListener("click", () => {
respawnPlayer();
hideRestartScreen();
});

restartOverlay.append(message, btn);
document.body.appendChild(restartOverlay);

restartTimer = setTimeout(() => {
respawnPlayer();
hideRestartScreen();
}, 5000);
}

function hideRestartScreen() {
if (restartOverlay) {
restartOverlay.remove();
restartOverlay = null;
}
if (restartTimer) {
clearTimeout(restartTimer);
restartTimer = null;
}
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
  setTimeout(hideSpeakerQuote, 4000);
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
  // Reward cash based on current card points and stage multiplier
  const reward = Math.floor(
    stats.points *
    (1 + Math.pow(stageData.stage, 0.5)) *
    stats.cashMulti
  );
  if (reward <= 0) return cash;

  cash += reward;
  cashDisplay.textContent = `Cash: $${formatNumber(cash)}`;
  cashRateTracker.record(cash);
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

    if (card.suit === "Spades")
      stats.damageMultiplier += 0.1 * card.currentLevel;
if (card.suit === "Hearts") stats.pRegen += card.currentLevel;
if (card.suit === "Diamonds")
stats.cashMulti += Math.floor(Math.pow(card.currentLevel, 0.5));

card.damage = card.baseDamage + 5 * (card.currentLevel - 1);
stats.pDamage += card.damage;
stats.points += card.value;
}

stats.pDamage *= stats.damageMultiplier * stats.damageBuffMultiplier;
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
    upgradePowerPurchased,
    lastCashOutPoints,
    cardPoints,
    redrawCost,
    drawPoints: stats.drawPoints,
    deck: deckData,
    upgrades: upgradeLevels,
    unlockedJokers: unlockedJokers.map(j => j.id),
    playerStats,
    worldProgress,
    barUpgrades
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
  cardPoints = state.cardPoints || 0;
  redrawCost = state.redrawCost || 10;
  stats.drawPoints = state.drawPoints || 0;
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
cardPointsDisplay.textContent = `Card Points: ${formatNumber(cardPoints)}`;

  renderJokers();
updateUpgradeButtons();
  renderPlayerStats(stats);
  renderStageInfo();
  renderGlobalStats();
  renderWorldsMenu();
  cashRateTracker.reset(cash);
  worldProgressRateTracker.reset(
    computeWorldProgress(stageData.world) * 100
  );
  if (cashPerSecDisplay) cashPerSecDisplay.textContent = "Avg Cash/sec: 0";
  if (worldProgressPerSecDisplay)
    worldProgressPerSecDisplay.textContent = "Avg World Progress/sec: 0%";

  updateManaBar();

  checkUpgradeUnlocks();
  updateUpgradePowerCost();
  renderPurchasedUpgrades();
  applyWorldTheme();
  updateRedrawButton();

  updateWorldTabNotification();

addLog("Game loaded!",
"info");
} catch (e) {
console.error("Load failed",
e);
}
}


/*function retry() {
  points =0
  pointsDisplay.textContent = points;
  suite = [1,2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  drawnCards = []
  handContainer.innerHTML = ""
}*/

//=========game loop===========

/*setInterval(updateUi(), 1000);*/

setInterval(() => {
//healerinterval
heartHeal();
}, 20000);

let lastFrameTime = performance.now();

// Main animation loop; handles ticking the enemy and player actions
function gameLoop(currentTime) {
const rawDelta = currentTime - lastFrameTime;
lastFrameTime = currentTime;
const deltaTime = rawDelta * timeScale;

if (currentEnemy) {
currentEnemy.tick(deltaTime);
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


  updateDrawButton();
  updateRedrawButton();
  updatePlayerStats(stats);
  cashTimer += deltaTime;
  worldProgressTimer += deltaTime;
  if (cashTimer >= 1000) {
    cashRateTracker.record(cash);
    if (cashPerSecDisplay) {
      const rate = cashRateTracker.getRate();
      cashPerSecDisplay.textContent = `Avg Cash/sec: ${rate.toFixed(2)}`;
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

if (systems.manaUnlocked) {
stats.mana = Math.min(
stats.maxMana,
stats.mana + (stats.manaRegen * deltaTime) / 1000
);
 updateManaBar();
}

  // passive progress for bar upgrades
  tickBarProgress(deltaTime);
requestAnimationFrame(gameLoop);
}

//devtools

function toggleDebug() {
const panel = document.getElementById("debugPanel");
panel.style.display = panel.style.display === "none" ? "block": "none";
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

// Developer helpers exposed on the console for testing
window.devTools = {
spawnBoss,
spawnDealer,
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
cashRateTracker.record(cash);
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