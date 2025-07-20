import { sectSystem, getCurrentSchedule } from './game/sect.js';
import { sectState } from './game/state.js';
import { createDiscipleBadge } from './game/badges.js';
import { METAMORPHOSIS_STAGE_REQ } from './game/constants.js';
import { showPathOverlay } from './game/pathOverlay.js';

export const metamorphosisState = {
  requirement: METAMORPHOSIS_STAGE_REQ
};

let container;
let progressFill;
let progressText;
let ringFill;
let ringWrapper;
let listContainer;
let breakthroughBtn;
let statsContainer;
let selectedDiscipleId = null;
const RING_RADIUS = 80;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const STAGE_NAMES = ['Egg', 'Tadpole', 'Young Coquí', 'Elder Frog', 'Divine Coquí'];

export function initMetamorphosis() {
  container = document.getElementById('metamorphosisTabContent');
  listContainer = document.getElementById('metamorphosisDiscipleList');
  statsContainer = document.getElementById('metamorphosisStats');
  if (!container) return;
const bodyPath = `M200 150
               m -25 0
               a25 25 0 1 0 50 0
               a25 25 0 1 0 -50 0
               m25 20
               c60 20 90 60 50 110
               c-30 -40 -70 -70 -100 -80
               Z`;
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
          </defs>
          <circle class="progress-ring-bg" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${RING_RADIUS}" />
          <circle id="metamorphosisRing" class="progress-ring-fill" cx="${RING_RADIUS + 10}" cy="${RING_RADIUS + 10}" r="${RING_RADIUS}" />
        </svg>
        <div class="metamorphosis-figure">
          <svg id="metamorphosisDiagram" viewBox="0 0 400 400" width="100%" height="100%">
            <defs>
              <clipPath id="bodyShapeClip"><path d="${bodyPath}" /></clipPath>
            </defs>
            <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
            <circle id="metamorphosisHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
            <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
          </svg>
        </div>
      </div>
      <div class="progress-area">
        <div id="metamorphosisProgressText" class="progress-text"></div>
        <div class="progress-bar"><div id="metamorphosisBarFill" class="progress-fill"></div></div>
      </div>
      <button id="breakthroughBtn" class="breakthrough-btn" style="display:none;">Breakthrough</button>
      <div class="assigned-disciple">Assigned to <span id="assignedDisciple">disciple 1</span></div>
    </div>
  `;
  progressFill = container.querySelector('#metamorphosisBarFill');
  progressText = container.querySelector('#metamorphosisProgressText');
  ringFill = container.querySelector('#metamorphosisRing');
  ringWrapper = container.querySelector('.metamorphosis-progress');
  breakthroughBtn = container.querySelector('#breakthroughBtn');
  if (breakthroughBtn) {
    breakthroughBtn.addEventListener('click', () => {
      if (selectedDiscipleId) breakthrough(selectedDiscipleId);
    });
  }
  selectedDiscipleId = sectSystem.disciples[0]?.id || null;
  window.addEventListener('orbs-changed', renderMetamorphosis);
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  document.addEventListener('disciple-gained', refreshMetamorphosis);
  renderDiscipleList();
  renderMetamorphosis();
}

function ensureMeta(id) {
  if (!sectState.discipleMetamorphosis[id]) {
        sectState.discipleMetamorphosis[id] = { xp: 0, stage: 0 };
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
    list.appendChild(card);
  });
  listContainer.appendChild(list);
}


function breakthrough(id) {
  const meta = sectState.discipleMetamorphosis[id];
  if (!meta) return;
  meta.xp = 0;
  meta.stage += 1;
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

  const label = container.querySelector('#assignedDisciple');
  if (label && d) label.textContent = d.name || `Disciple ${d.id}`;

  updateStats();
}

export function refreshMetamorphosis() {
  renderMetamorphosis();
}

export function tickMetamorphosis(dt) {
  const training = getCurrentSchedule().action === 'Training';
  sectSystem.disciples.forEach(d => {
    ensureMeta(d.id);
    const meta = sectState.discipleMetamorphosis[d.id];
    if (training && meta.xp < metamorphosisState.requirement) {
      const rate = 0.4 *
        getMethodMultiplier(d) *
        getBuildingMultiplier(d) *
        getRoomMultiplier(d) *
        getPathMatchMultiplier(d) *
        getStabilityFactor(d) *
        getCultivationSpeed(d) *
        getSeasonMultiplier();
      meta.xp = Math.min(metamorphosisState.requirement, meta.xp + rate * dt);
    }
  });
  renderMetamorphosis();
  updateStats();
}

function getMethodMultiplier() { return 1; }
function getBuildingMultiplier() { return 1; }
function getRoomMultiplier() { return 1; }
function getPathMatchMultiplier() { return 1; }
function getStabilityFactor() { return 1; }
function getCultivationSpeed(d) {
  return d.potential * d.potential;
}
function getSeasonMultiplier() { return 1; }

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
    <div class="meta-stat" data-tip="Multiplier from assigned cultivation method">Method ×${stats.method}</div>
    <div class="meta-stat" data-tip="Multiplier from cultivation building effects">Building ×${stats.building}</div>
    <div class="meta-stat" data-tip="Room bonuses like humidity and ornaments">Room ×${stats.room}</div>
    <div class="meta-stat" data-tip="Bonus when method matches disciple's Path">Path Match ×${stats.pathMatch}</div>
    <div class="meta-stat" data-tip="Penalty or boost based on current Stability">Stability ×${stats.stability}</div>
    <div class="meta-stat" data-tip="Potential squared (discipline talent)">Cultivation ${stats.cultivation}</div>
    <div class="meta-stat" data-tip="Seasonal multiplier from weather">Season ×${stats.season}</div>
  `;
  statsContainer.querySelectorAll('.meta-stat').forEach(el => {
    const tip = el.dataset.tip;
    if (!tip) return;
    el.addEventListener('mouseenter', e => {
      window.showTooltip(tip, e.pageX + 10, e.pageY + 10);
    });
    el.addEventListener('mouseleave', window.hideTooltip);
  });
}

