import { sectSystem, renderXpBar } from './game/sect.js';

export const coreState = {
  coreLevel: 1,
  meditationProgress: 0,
  meditating: false,
  requirement: 100000
};

let container;
let meditateBtn;
let levelDisplay;
let voiceLevelEl;
let mindValEl;

export function initCore() {
  container = document.getElementById('coreTabContent');
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
    <div id="voiceLevelDisplay" class="voice-level-display">Voice Level: <span id="voiceLevelValue" class="voice-level-value"></span></div>
    <div class="core-resource-indicators">
      <div class="resource-box mind"><i data-lucide="brain"></i><span id="mindValue" class="resource-value"></span></div>
    </div>
    <div class="core-button-wrapper">
      <button id="meditateCoreBtn" disabled>Meditate Core</button>
      <div id="coreLevelText" class="core-level-text"></div>
    </div>
    <svg id="coreDiagram" viewBox="0 0 400 400" width="100%" height="100%">
      <defs>
        <clipPath id="bodyShapeClip"><path d="${bodyPath}" /></clipPath>
      </defs>
      <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
      <circle id="coreHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
      <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
      <text id="coreProgressText" x="200" y="260" text-anchor="middle" class="orb-text"></text>
    </svg>
  `;
  meditateBtn = container.querySelector("#meditateCoreBtn");
  levelDisplay = container.querySelector('#coreLevelText');
  window.addEventListener('orbs-changed', renderCore);
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  voiceLevelEl = container.querySelector('#voiceLevelValue');
  mindValEl = container.querySelector('#mindValue');
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  const voicePanel = document.getElementById('voiceSkillPanel');
  if (voicePanel) {
    voicePanel.addEventListener('click', () => {
      voicePanel.classList.toggle('expanded');
    });
  }
  window.addEventListener('voice-xp-changed', () => {
    renderCore();
    renderXpBar();
  });
  renderCore();
  renderXpBar();
}


function toggleMeditation() {
  if (coreState.meditationProgress >= coreState.requirement) {
    breakthrough();
    return;
  }
  coreState.meditating = !coreState.meditating;
  meditateBtn.textContent = coreState.meditating ? 'Meditating...' : 'Meditate Core';
}

function breakthrough() {
  coreState.coreLevel += 1;
  coreState.meditationProgress = 0;
  // requirement could scale later; keep constant for now
  sectSystem.orbs.water.current = 0;
  meditateBtn.textContent = 'Meditate Core';
  renderCore();
}

function renderCore() {
  if (!container) return;
  const coreFill = Math.min(1, coreState.meditationProgress / coreState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#bodyFill', 200, 180, 60, coreFill);

  const progressText = container.querySelector('#coreProgressText');
  if (progressText) progressText.textContent = `${Math.floor(coreState.meditationProgress)}/${coreState.requirement}`;
  levelDisplay.textContent = `Core Level: ${coreState.coreLevel}`;
  if (voiceLevelEl) voiceLevelEl.textContent = sectSystem.level;
  if (mindValEl) mindValEl.textContent = `${Math.floor(sectSystem.orbs.water.current)}/${sectSystem.orbs.water.max}`;
  if (coreState.meditationProgress >= coreState.requirement) {
    meditateBtn.textContent = 'Breakthrough';
  } else {
    meditateBtn.textContent = coreState.meditating ? 'Meditating...' : 'Meditate Core';
  }
  meditateBtn.disabled = false;

  const halo = container.querySelector('#coreHalo');
  if (halo) halo.setAttribute('opacity', coreState.meditationProgress >= coreState.requirement ? '1' : '0');
}

export function refreshCore() {
  renderCore();
}

