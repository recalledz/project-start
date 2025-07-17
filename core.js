import { sectSystem, renderXpBar, openWaterRegenPopup } from './sect.js';

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
const bodyPath = `M200 140
               C185 140, 180 120, 200 120
               C220 120, 215 140, 200 140
               M190 140
               C170 160, 170 190, 185 200
               C170 210, 170 240, 200 240
               C230 240, 230 210, 215 200
               C230 190, 230 160, 210 140
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
        <clipPath id="waterClip"><circle cx="200" cy="80" r="20" /></clipPath>
      </defs>
      <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
      <circle id="coreHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
      <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
      <circle cx="200" cy="80" r="20" fill="rgba(127,217,255,0.3)" />
      <rect id="waterFill" x="180" y="100" width="40" height="0" fill="rgba(127,217,255,0.6)" clip-path="url(#waterClip)" />
      <circle id="waterOrb" cx="200" cy="80" r="20" fill="none" stroke="#7fd9ff" stroke-width="2" />
      <text id="waterText" x="200" y="115" text-anchor="middle" class="orb-text"></text>
      <text id="coreProgressText" x="200" y="260" text-anchor="middle" class="orb-text"></text>
    </svg>
  `;
  meditateBtn = container.querySelector("#meditateCoreBtn");
  levelDisplay = container.querySelector('#coreLevelText');
  window.addEventListener('orbs-changed', renderCore);
  const waterOrb = container.querySelector('#waterOrb');
  if (waterOrb) {
    waterOrb.addEventListener('mouseenter', e => {
      const orb = sectSystem.orbs.water;
      window.showTooltip(`Water: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    waterOrb.addEventListener('mouseleave', window.hideTooltip);
    waterOrb.addEventListener('click', openWaterRegenPopup);
  }
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  voiceLevelEl = container.querySelector('#voiceLevelValue');
  mindValEl = container.querySelector('#mindValue');
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
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
  const waterFill = Math.min(1, sectSystem.orbs.water.current / sectSystem.orbs.water.max);
  const coreFill = Math.min(1, coreState.meditationProgress / coreState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#waterFill', 200, 80, 20, waterFill);
  updateRect('#bodyFill', 200, 180, 60, coreFill);

  const waterOrbEl = container.querySelector('#waterOrb');
  if (waterOrbEl) waterOrbEl.setAttribute('stroke', waterFill >= 1 ? '#7fafff' : '#7fd9ff');

  const waterText = container.querySelector('#waterText');
  if (waterText) waterText.textContent = `${Math.floor(sectSystem.orbs.water.current)}/${sectSystem.orbs.water.max}`;
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

