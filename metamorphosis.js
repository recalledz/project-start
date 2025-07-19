import { sectSystem } from './game/sect.js';
import { sectState } from './game/state.js';
import { createDiscipleBadge } from './game/badges.js';
import { METAMORPHOSIS_STAGE_REQ } from './game/constants.js';

export const metamorphosisState = {
  requirement: METAMORPHOSIS_STAGE_REQ
};

let container;
let meditateBtn;
let progressFill;
let progressText;
let listContainer;
let selectedDiscipleId = null;

export function initMetamorphosis() {
  container = document.getElementById('metamorphosisTabContent');
  listContainer = document.getElementById('metamorphosisDiscipleList');
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
      <div class="progress-area">
        <div id="metamorphosisProgressText" class="progress-text"></div>
        <div class="progress-bar"><div id="metamorphosisBarFill" class="progress-fill"></div></div>
      </div>
      <div class="assigned-disciple">Assigned to <span id="assignedDisciple">disciple 1</span></div>
    </div>
    <div class="core-button-wrapper">
      <button id="meditateMetamorphosisBtn" disabled>Meditate</button>
    </div>
  `;
  meditateBtn = container.querySelector('#meditateMetamorphosisBtn');
  progressFill = container.querySelector('#metamorphosisBarFill');
  progressText = container.querySelector('#metamorphosisProgressText');
  selectedDiscipleId = sectSystem.disciples[0]?.id || null;
  window.addEventListener('orbs-changed', renderMetamorphosis);
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  document.addEventListener('disciple-gained', refreshMetamorphosis);
  renderDiscipleList();
  renderMetamorphosis();
}

function ensureMeta(id) {
  if (!sectState.discipleMetamorphosis[id]) {
    sectState.discipleMetamorphosis[id] = { xp: 0, stage: 0, meditating: false };
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


function toggleMeditation() {
  if (!selectedDiscipleId) return;
  const meta = sectState.discipleMetamorphosis[selectedDiscipleId];
  if (!meta) return;
  if (meta.xp >= metamorphosisState.requirement) {
    breakthrough();
    return;
  }
  meta.meditating = !meta.meditating;
  meditateBtn.textContent = meta.meditating ? 'Meditating...' : 'Meditate';
}

function breakthrough() {
  if (!selectedDiscipleId) return;
  const meta = sectState.discipleMetamorphosis[selectedDiscipleId];
  if (!meta) return;
  meta.xp = 0;
  meta.stage += 1;
  sectSystem.orbs.water.current = 0;
  meta.meditating = false;
  meditateBtn.textContent = 'Meditate';
  renderMetamorphosis();
}

function renderMetamorphosis() {
  if (!container) return;
  if (!selectedDiscipleId) {
    if (progressText) progressText.textContent = '';
    if (progressFill) progressFill.style.width = '0%';
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

  if (progressText) progressText.textContent = `${Math.floor(meta.xp)}/${metamorphosisState.requirement}`;
  if (progressFill) progressFill.style.width = `${coreFill * 100}%`;
  if (meta.xp >= metamorphosisState.requirement) {
    meditateBtn.textContent = 'Breakthrough';
  } else {
    meditateBtn.textContent = meta.meditating ? 'Meditating...' : 'Meditate';
  }
  meditateBtn.disabled = false;

  const halo = container.querySelector('#metamorphosisHalo');
  if (halo) halo.setAttribute('opacity', meta.xp >= metamorphosisState.requirement ? '1' : '0');

  const label = container.querySelector('#assignedDisciple');
  if (label && d) label.textContent = d.name || `Disciple ${d.id}`;
}

export function refreshMetamorphosis() {
  renderMetamorphosis();
}

export function tickMetamorphosis(dt) {
  sectSystem.disciples.forEach(d => {
    ensureMeta(d.id);
    const meta = sectState.discipleMetamorphosis[d.id];
    if (meta.meditating && meta.xp < metamorphosisState.requirement) {
      const rate = 0.4 * d.potential * d.potential;
      meta.xp = Math.min(metamorphosisState.requirement, meta.xp + rate * dt);
    }
  });
}

