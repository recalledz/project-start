import { sectSystem, sectIntegrity } from './sect.js';
import { sectState } from './state.js';
import { createDiscipleBadge } from './badges.js';
import { METAMORPHOSIS_STAGE_REQ, TRAINING_NECTAR_RATE } from './constants.js';
import { showPathOverlay } from './pathOverlay.js';
import { applyStageBonuses } from './metamorphosisBonuses.js';
import { ensureMeta, addMasteryXp, getMasteryProgress } from './metamorphMastery.js';
import { getRandomUpgrades, applyUpgradeById, UPGRADES } from './metamorphMasteryUpgrades.js';

export const metamorphosisState = {
  requirement: METAMORPHOSIS_STAGE_REQ
};

let container;
let progressFill;
let progressText;
let ringFill;
let masteryRing;
let ringWrapper;
let listContainer;
let breakthroughBtn;
let masteryBtn;
let statsContainer;
let statsPanel;
let statsToggle;
let upgradesContainer;
let selectedDiscipleId = null;
let breakthroughHandler;
let masteryBtnHandler;
const RING_RADIUS = 70;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MASTERY_RING_RADIUS = RING_RADIUS - 5;
const MASTERY_RING_CIRCUMFERENCE = 2 * Math.PI * MASTERY_RING_RADIUS;
const STAGE_NAMES = ['Egg', 'Tadpole', 'Young Coquí', 'Elder Frog', 'Divine Coquí'];

export function initMetamorphosis() {
  // Clean up any existing listeners before reinitializing
  destroyMetamorphosis();
  container = document.getElementById('metamorphosisTabContent');
  listContainer = document.getElementById('metamorphosisDiscipleList');
  statsContainer = document.getElementById('metamorphosisStats');
  statsPanel = document.querySelector('.metamorphosis-stats-panel');
  statsToggle = document.getElementById('metaStatsToggle');
  if (!container) return;
  container.innerHTML = `
    <div class="metamorphosis-room">
          <div id="metamorphosisStageLabel" class="metamorphosis-stage"></div>
      <div class="progress-wrapper metamorphosis-progress">
        <svg class="progress-ring" width="${RING_RADIUS * 2 + 20}" height="${RING_RADIUS * 2 + 20}">
          <defs>
            <linearGradient id="metaRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#c8a2ff" />
              <stop offset="100%" stop-color="#50e3c2" />
            </linearGradient>
            <linearGradient id="metaMasteryGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ffe29f" />
              <stop offset="100%" stop-color="#ff6e7f" />
            </linearGradient>
          </defs>
          <circle class="progress-ring-bg" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${RING_RADIUS}" />
          <circle class="progress-ring-bg" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${MASTERY_RING_RADIUS}" />
          <circle id="metamorphosisRing" class="progress-ring-fill" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${RING_RADIUS}" />
          <circle id="metamorphMasteryRing" class="progress-ring-fill" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${MASTERY_RING_RADIUS}" />
        </svg>
        <div class="metamorphosis-figure">
          <svg id="metamorphosisDiagram" viewBox="0 0 400 400" width="100%" height="100%">
            <defs>
              <clipPath id="bodyShapeClip"><circle cx="200" cy="180" r="60" /></clipPath>
            </defs>
            <circle cx="200" cy="180" r="60" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
            <circle id="metamorphosisHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
            <rect id="bodyFill" x="140" y="240" width="120" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
          </svg>
        </div>
      </div>
      <div class="progress-area">
        <div id="metamorphosisProgressText" class="progress-text"></div>
        <div class="progress-bar"><div id="metamorphosisBarFill" class="progress-fill"></div></div>
      </div>
      <button id="masteryLevelUpBtn" class="levelup-btn" style="display:none;">Level Up</button>
      <button id="breakthroughBtn" class="breakthrough-btn" style="display:none;">Breakthrough</button>
      <div class="assigned-disciple">Assigned to <span id="assignedDisciple">disciple 1</span></div>
      <div id="metamorphosisUpgrades" class="meta-upgrades"></div>
    </div>
  `;
  progressFill = container.querySelector('#metamorphosisBarFill');
  progressText = container.querySelector('#metamorphosisProgressText');
  ringFill = container.querySelector('#metamorphosisRing');
  masteryRing = container.querySelector('#metamorphMasteryRing');
  ringWrapper = container.querySelector('.metamorphosis-progress');
  breakthroughBtn = container.querySelector('#breakthroughBtn');
  masteryBtn = container.querySelector('#masteryLevelUpBtn');
  upgradesContainer = container.querySelector('#metamorphosisUpgrades');
  if (breakthroughBtn) {
    breakthroughHandler = () => {
      if (selectedDiscipleId) breakthrough(selectedDiscipleId);
    };
    breakthroughBtn.addEventListener('click', breakthroughHandler);
  }
  if (masteryBtn) {
    masteryBtnHandler = () => {
      if (selectedDiscipleId) handleMasteryLevelUp(selectedDiscipleId);
    };
    masteryBtn.addEventListener('click', masteryBtnHandler);
  }
  selectedDiscipleId = sectSystem.disciples[0]?.id || null;
  window.addEventListener('orbs-changed', renderMetamorphosis);
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  document.addEventListener('disciple-gained', refreshMetamorphosis);
  renderDiscipleList();
  renderMetamorphosis();
  if (statsToggle) {
    statsToggle.addEventListener('click', toggleStatsPanel);
    statsToggle.addEventListener('mouseenter', e => {
      window.showTooltip('Toggle stats panel', e.pageX + 10, e.pageY + 10);
    });
    statsToggle.addEventListener('mouseleave', window.hideTooltip);
  }
}

function renderDiscipleList() {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  const list = document.createElement('div');
  list.className = 'sect-disciple-list';
  sectSystem.disciples.forEach(d => {
    ensureMeta(d.id);
    const card = createDiscipleBadge(d);
    card.classList.add('sect-disciple-card');
    if (d.id === selectedDiscipleId) card.classList.add('selected');
    card.addEventListener('click', () => {
      selectedDiscipleId = d.id;
      renderDiscipleList();
      renderMetamorphosis();
    });
    const btn = document.createElement('button');
    const assigned = !!sectState.metamorphAssignments[d.id];
    btn.textContent = assigned ? 'Stop' : 'Train';
    btn.disabled =
      !assigned &&
      Object.keys(sectState.metamorphAssignments).length >=
        sectState.metamorphRooms;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (sectState.metamorphAssignments[d.id]) {
        delete sectState.metamorphAssignments[d.id];
        sectState.discipleTasks[d.id] = 'Idle';
      } else if (
        Object.keys(sectState.metamorphAssignments).length <
        sectState.metamorphRooms
      ) {
        sectState.metamorphAssignments[d.id] = true;
        sectState.discipleTasks[d.id] = 'Training';
      }
      renderDiscipleList();
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'disciple-train-entry';
    wrapper.appendChild(card);
    wrapper.appendChild(btn);
    list.appendChild(wrapper);
  });
  listContainer.appendChild(list);
}


function breakthrough(id) {
  const meta = sectState.discipleMetamorphosis[id];
  if (!meta) return;
  meta.xp = 0;
  meta.stage += 1;
  const d = sectSystem.disciples.find(x => x.id === id);
  if (d) {
    applyStageBonuses(d);
    d.updateCombatStats?.();
  }
  sectSystem.orbs.water.current = 0;
  if (meta.stage === 1) {
    showPathOverlay({ onSelect: path => { sectState.disciplePaths[id] = path; } });
  }
  renderMetamorphosis();
}

function renderMetamorphosis() {
  if (!container) return;
  if (!selectedDiscipleId) {
    if (progressText) progressText.textContent = '';
    if (progressFill) progressFill.style.width = '0%';
    const stageLabel = container.querySelector('#metamorphosisStageLabel');
    if (stageLabel) stageLabel.textContent = '';
    return;
  }
  const meta = sectState.discipleMetamorphosis[selectedDiscipleId];
  const d = sectSystem.disciples.find(x => x.id === selectedDiscipleId);
  const coreFill = Math.min(1, (meta?.xp || 0) / metamorphosisState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#bodyFill', 200, 180, 60, coreFill);

  if (ringFill) {
    ringFill.style.strokeDasharray = RING_CIRCUMFERENCE;
    ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - coreFill);
  }
  const masteryProg = getMasteryProgress(meta.masteryXp || 0);
  if (masteryRing) {
    masteryRing.style.strokeDasharray = MASTERY_RING_CIRCUMFERENCE;
    masteryRing.style.strokeDashoffset =
      MASTERY_RING_CIRCUMFERENCE * (1 - masteryProg.progress);
  }
  if (ringWrapper) {
    if (coreFill >= 0.9) ringWrapper.classList.add('near-complete');
    else ringWrapper.classList.remove('near-complete');
  }

  if (progressText) progressText.textContent = `${Math.floor(meta.xp)}/${metamorphosisState.requirement}`;
  if (progressFill) progressFill.style.width = `${coreFill * 100}%`;
  const stageLabel = container.querySelector('#metamorphosisStageLabel');
  if (stageLabel) stageLabel.textContent = STAGE_NAMES[meta.stage] || 'Unknown';

  const halo = container.querySelector('#metamorphosisHalo');
  if (halo) halo.setAttribute('opacity', meta.xp >= metamorphosisState.requirement ? '1' : '0');

  if (breakthroughBtn) {
    breakthroughBtn.style.display = meta.xp >= metamorphosisState.requirement ? 'block' : 'none';
  }
  if (masteryBtn) {
    masteryBtn.style.display = meta.masteryPending ? 'block' : 'none';
  }

  const label = container.querySelector('#assignedDisciple');
  if (label && d) label.textContent = d.name || `Disciple ${d.id}`;

  renderUpgrades(meta);
  updateStats();
}

export function refreshMetamorphosis() {
  renderMetamorphosis();
}

export function destroyMetamorphosis() {
  if (breakthroughBtn && breakthroughHandler) {
    breakthroughBtn.removeEventListener('click', breakthroughHandler);
  }
  if (masteryBtn && masteryBtnHandler) {
    masteryBtn.removeEventListener('click', masteryBtnHandler);
  }
  window.removeEventListener('orbs-changed', renderMetamorphosis);
  document.removeEventListener('disciple-gained', refreshMetamorphosis);
  breakthroughHandler = null;
  masteryBtnHandler = null;
  container = null;
  progressFill = null;
  progressText = null;
  ringFill = null;
  masteryRing = null;
  ringWrapper = null;
  listContainer = null;
  breakthroughBtn = null;
  masteryBtn = null;
  statsContainer = null;
  selectedDiscipleId = null;
}

export function tickMetamorphosis(dt) {
  sectSystem.disciples.forEach(d => {
    ensureMeta(d.id);
    const meta = sectState.discipleMetamorphosis[d.id];
    const training =
      sectState.discipleTasks[d.id] === 'Training' &&
      sectState.metamorphAssignments[d.id];
    if (training && meta.xp < metamorphosisState.requirement) {
      const cost = TRAINING_NECTAR_RATE * dt;
      if (sectState.undeadNectar >= cost) {
        sectState.undeadNectar -= cost;
        if (sectSystem.resources.undeadNectar) {
          const res = sectSystem.resources.undeadNectar;
          res.current = Math.max(0, res.current - cost);
        }
        const rate =
          0.4 *
          getMethodMultiplier(d) *
          getBuildingMultiplier(d) *
          getRoomMultiplier(d) *
          getPathMatchMultiplier(d) *
          getStabilityFactor(d) *
          getCultivationSpeed(d) *
          getSeasonMultiplier() *
          sectIntegrity;
        const before = meta.xp;
        meta.xp = Math.min(
          metamorphosisState.requirement,
          meta.xp + rate * dt
        );
        const gained = meta.xp - before;
        if (gained > 0) addMasteryXp(d.id, gained);
      }
    }
  });
  renderMetamorphosis();
  updateStats();
}

function handleMasteryLevelUp(id) {
  const d = sectSystem.disciples.find(x => x.id === id);
  const meta = sectState.discipleMetamorphosis[id];
  if (!d || !meta) return;
  const options = getRandomUpgrades(3);
  const text = options
    .map((u, i) => `${i + 1}) ${u.name}`)
    .join('\n');
  const choice = window.prompt(`Choose upgrade:\n${text}`, '1');
  const idx = Number(choice) - 1;
  if (options[idx]) {
    applyUpgradeById(d, meta, options[idx].id);
  }
  meta.masteryPending = false;
  renderMetamorphosis();
}

function getMethodMultiplier() { return 1; }
function getBuildingMultiplier() {
  return 1 + 0.04 * (sectState.buildings.metamorphRoom || 0);
}
function getRoomMultiplier() { return 1; }
function getPathMatchMultiplier() { return 1; }
function getStabilityFactor() { return 1; }
function getCultivationSpeed(d) {
  return d.potential * d.potential * (d.metamorphSpeedMult || 1);
}
function getSeasonMultiplier() { return 1; }

function renderUpgrades(meta) {
  if (!upgradesContainer) return;
  const list = meta?.upgrades || [];
  if (list.length === 0) {
    upgradesContainer.textContent = 'No upgrades';
    return;
  }
  upgradesContainer.innerHTML = list
    .map(id => {
      const u = UPGRADES.find(x => x.id === id);
      return `<div class="meta-upgrade">${u ? u.name : id}</div>`;
    })
    .join('');
}

function updateStats() {
  if (!statsContainer || !selectedDiscipleId) return;
  const d = sectSystem.disciples.find(x => x.id === selectedDiscipleId);
  const stats = {
    method: getMethodMultiplier(d),
    building: getBuildingMultiplier(d),
    room: getRoomMultiplier(d),
    pathMatch: getPathMatchMultiplier(d),
    stability: getStabilityFactor(d),
    cultivation: getCultivationSpeed(d),
    season: getSeasonMultiplier()
  };
  let rate = 0.4;
  Object.values(stats).forEach(v => { rate *= v; });
  statsContainer.innerHTML = `
    <div class="meta-stat" data-tip="XP/sec = 0.4 × method × building × room × path match × stability × cultivation × season">XP/sec: ${rate.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Multiplier from assigned cultivation method">Method ×${stats.method.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Multiplier from cultivation building effects">Building ×${stats.building.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Room bonuses like humidity and ornaments">Room ×${stats.room.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Bonus when method matches disciple's Path">Path Match ×${stats.pathMatch.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Penalty or boost based on current Stability">Stability ×${stats.stability.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Potential squared (discipline talent)">Cultivation ${stats.cultivation.toFixed(2)}</div>
    <div class="meta-stat" data-tip="Seasonal multiplier from weather">Season ×${stats.season.toFixed(2)}</div>
  `;
  statsContainer.querySelectorAll('.meta-stat').forEach(el => {
    const tip = el.dataset.tip;
    if (!tip) return;
    el.addEventListener('mouseenter', e => {
      window.showTooltip(tip, e.pageX + 10, e.pageY + 10);
    });
    el.addEventListener('mouseleave', window.hideTooltip);
    el.addEventListener('touchstart', e => {
      const t = e.touches[0];
      window.showTooltip(tip, t.pageX + 10, t.pageY + 10);
      e.stopPropagation();
    });
    el.addEventListener('touchend', window.hideTooltip);
  });
}

function toggleStatsPanel() {
  if (!statsPanel) return;
  const open = statsPanel.classList.contains('open');
  if (open) {
    statsPanel.classList.remove('open');
  } else {
    statsPanel.classList.add('open');
  }
  if (statsToggle) statsToggle.textContent = open ? '❮' : '❯';
}

