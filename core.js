import { speechState, renderXpBar, openQiRegenPopup } from './speech.js';

export const coreState = {
  coreLevel: 1,
  meditationProgress: 0,
  meditating: false,
  requirement: 100000
};

let container;
let meditateBtn;
let levelDisplay;
let progressText;
let meditationTimer; // unused now but kept for compatibility
let speechLevelEl; // deprecated variable name for backward compatibility
let voiceLevelEl;
let mindValEl;
let bodyValEl; // deprecated, retained for compatibility but unused
let willValEl; // deprecated, retained for compatibility but unused

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
        <clipPath id="qiClip"><circle cx="200" cy="80" r="20" /></clipPath>
      </defs>
      <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
      <circle id="coreHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
      <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
      <circle cx="200" cy="80" r="20" fill="rgba(127,217,255,0.3)" />
      <rect id="qiFill" x="180" y="100" width="40" height="0" fill="rgba(127,217,255,0.6)" clip-path="url(#qiClip)" />
      <circle id="qiOrb" cx="200" cy="80" r="20" fill="none" stroke="#7fd9ff" stroke-width="2" />
      <text id="qiText" x="200" y="115" text-anchor="middle" class="orb-text"></text>
      <text id="coreProgressText" x="200" y="260" text-anchor="middle" class="orb-text"></text>
    </svg>
  `;
  meditateBtn = container.querySelector("#meditateCoreBtn");
  levelDisplay = container.querySelector('#coreLevelText');
  progressText = container.querySelector("#coreProgressText");
  window.addEventListener('orbs-changed', renderCore);
  const qiOrb = container.querySelector('#qiOrb');
  if (qiOrb) {
    qiOrb.addEventListener('mouseenter', e => {
      const orb = speechState.orbs.qi;
      window.showTooltip(`Qi: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    qiOrb.addEventListener('mouseleave', window.hideTooltip);
    qiOrb.addEventListener('click', openQiRegenPopup);
  }
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  speechLevelEl = container.querySelector('#voiceLevelValue');
  voiceLevelEl = speechLevelEl;
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
  if (meditationTimer) {
    clearInterval(meditationTimer);
    coreState.meditating = false;
  }
  coreState.coreLevel += 1;
  coreState.meditationProgress = 0;
  // requirement could scale later; keep constant for now
  speechState.orbs.qi.current = 0;
  meditateBtn.textContent = 'Meditate Core';
  renderCore();
}

function renderCore() {
  if (!container) return;
  const qiFill = Math.min(1, speechState.orbs.qi.current / speechState.orbs.qi.max);
  const bodyFill = 0;
  const willFill = 0;

  const coreFill = Math.min(1, coreState.meditationProgress / coreState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#qiFill', 200, 80, 20, qiFill);
  updateRect('#bodyFill', 200, 180, 60, coreFill);

  const qiOrbEl = container.querySelector('#qiOrb');
  if (qiOrbEl) qiOrbEl.setAttribute('stroke', qiFill >= 1 ? '#7fafff' : '#7fd9ff');
  const bodyOrb = null;
  const willOrb = null;

  const qiText = container.querySelector('#qiText');
  if (qiText) qiText.textContent = `${Math.floor(speechState.orbs.qi.current)}/${speechState.orbs.qi.max}`;
  const bodyText = null;
  const willText = null;
  const progressText = container.querySelector('#coreProgressText');
  if (progressText) progressText.textContent = `${Math.floor(coreState.meditationProgress)}/${coreState.requirement}`;
  levelDisplay.textContent = `Core Level: ${coreState.coreLevel}`;
  if (voiceLevelEl) voiceLevelEl.textContent = speechState.level;
  if (mindValEl) mindValEl.textContent = `${Math.floor(speechState.orbs.qi.current)}/${speechState.orbs.qi.max}`;
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

