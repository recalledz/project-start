import { speechState, renderXpBar, openInsightRegenPopup } from './speech.js';

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
let speechLevelEl;
let mindValEl;
let bodyValEl;
let willValEl;

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
    <div id="speechLevelDisplay" class="speech-level-display">Speech Level: <span id="speechLevelValue" class="speech-level-value"></span></div>
    <div class="core-resource-indicators">
      <div class="resource-box mind"><i data-lucide="brain"></i><span id="mindValue" class="resource-value"></span></div>
      <div class="resource-box body"><i data-lucide="heart"></i><span id="bodyValue" class="resource-value"></span></div>
      <div class="resource-box will"><i data-lucide="flame"></i><span id="willValue" class="resource-value"></span></div>
    </div>
    <div class="core-button-wrapper">
      <button id="meditateCoreBtn" disabled>Meditate Core</button>
      <div id="coreLevelText" class="core-level-text"></div>
    </div>
    <svg id="coreDiagram" viewBox="0 0 400 400" width="100%" height="100%">
      <defs>
        <clipPath id="bodyShapeClip"><path d="${bodyPath}" /></clipPath>
        <clipPath id="insightClip"><circle cx="200" cy="80" r="20" /></clipPath>
        <clipPath id="bodyOrbClip"><circle cx="113" cy="230" r="20" /></clipPath>
        <clipPath id="willClip"><circle cx="287" cy="230" r="20" /></clipPath>
      </defs>
      <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
      <circle id="coreHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
      <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
      <circle cx="200" cy="80" r="20" fill="rgba(127,217,255,0.3)" />
      <rect id="insightFill" x="180" y="100" width="40" height="0" fill="rgba(127,217,255,0.6)" clip-path="url(#insightClip)" />
      <circle id="insightOrb" cx="200" cy="80" r="20" fill="none" stroke="#7fd9ff" stroke-width="2" />
      <text id="insightText" x="200" y="115" text-anchor="middle" class="orb-text"></text>
      <circle cx="113" cy="230" r="20" fill="rgba(255,100,100,0.3)" />
      <rect id="bodyOrbFill" x="93" y="250" width="40" height="0" fill="rgba(255,100,100,0.6)" clip-path="url(#bodyOrbClip)" />
      <circle id="bodyOrb" cx="113" cy="230" r="20" fill="none" stroke="#ff8888" stroke-width="2" />
      <text id="bodyText" x="113" y="265" text-anchor="middle" class="orb-text"></text>
      <circle cx="287" cy="230" r="20" fill="rgba(255,163,127,0.3)" />
      <rect id="willFill" x="267" y="250" width="40" height="0" fill="rgba(255,163,127,0.6)" clip-path="url(#willClip)" />
      <circle id="willOrb" cx="287" cy="230" r="20" fill="none" stroke="#ffa37f" stroke-width="2" />
      <text id="willText" x="287" y="265" text-anchor="middle" class="orb-text"></text>
      <text id="coreProgressText" x="200" y="260" text-anchor="middle" class="orb-text"></text>
    </svg>
  `;
  meditateBtn = container.querySelector("#meditateCoreBtn");
  levelDisplay = container.querySelector('#coreLevelText');
  progressText = container.querySelector("#coreProgressText");
  window.addEventListener('orbs-changed', renderCore);
  const insightOrb = container.querySelector('#insightOrb');
  if (insightOrb) {
    insightOrb.addEventListener('mouseenter', e => {
      const orb = speechState.orbs.insight;
      window.showTooltip(`Insight: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    insightOrb.addEventListener('mouseleave', window.hideTooltip);
    insightOrb.addEventListener('click', openInsightRegenPopup);
  }
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  const bodyOrbEl = container.querySelector('#bodyOrb');
  if (bodyOrbEl) {
    bodyOrbEl.addEventListener('mouseenter', e => {
      const orb = speechState.orbs.body;
      window.showTooltip(`Body: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    bodyOrbEl.addEventListener('mouseleave', window.hideTooltip);
  }
  const willOrbEl = container.querySelector('#willOrb');
  if (willOrbEl) {
    willOrbEl.addEventListener('mouseenter', e => {
      const orb = speechState.orbs.will;
      window.showTooltip(`Will: ${Math.floor(orb.current)}/${orb.max}`, e.pageX + 10, e.pageY + 10);
    });
    willOrbEl.addEventListener('mouseleave', window.hideTooltip);
  }
  speechLevelEl = container.querySelector('#speechLevelValue');
  mindValEl = container.querySelector('#mindValue');
  bodyValEl = container.querySelector('#bodyValue');
  willValEl = container.querySelector('#willValue');
  if (window.lucide) lucide.createIcons({ icons: lucide.icons });
  window.addEventListener('speech-xp-changed', () => {
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
  speechState.orbs.insight.current = 0;
  speechState.orbs.body.current = 0;
  speechState.orbs.will.current = 0;
  meditateBtn.textContent = 'Meditate Core';
  renderCore();
}

function renderCore() {
  if (!container) return;
  const insightFill = Math.min(1, speechState.orbs.insight.current / speechState.orbs.insight.max);
  const bodyFill = Math.min(1, speechState.orbs.body.current / speechState.orbs.body.max);
  const willFill = Math.min(1, speechState.orbs.will.current / speechState.orbs.will.max);

  const coreFill = Math.min(1, coreState.meditationProgress / coreState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#insightFill', 200, 80, 20, insightFill);
  updateRect('#bodyOrbFill', 113, 230, 20, bodyFill);
  updateRect('#willFill', 287, 230, 20, willFill);
  updateRect('#bodyFill', 200, 180, 60, coreFill);

  const insightOrbEl = container.querySelector('#insightOrb');
  if (insightOrbEl) insightOrbEl.setAttribute('stroke', insightFill >= 1 ? '#7fafff' : '#7fd9ff');
  const bodyOrb = container.querySelector('#bodyOrb');
  if (bodyOrb) bodyOrb.setAttribute('stroke', bodyFill >= 1 ? '#7fafff' : '#ff8888');
  const willOrb = container.querySelector('#willOrb');
  if (willOrb) willOrb.setAttribute('stroke', willFill >= 1 ? '#7fafff' : '#ffa37f');

  const insightText = container.querySelector('#insightText');
  if (insightText) insightText.textContent = `${Math.floor(speechState.orbs.insight.current)}/${speechState.orbs.insight.max}`;
  const bodyText = container.querySelector('#bodyText');
  if (bodyText) bodyText.textContent = `${Math.floor(speechState.orbs.body.current)}/${speechState.orbs.body.max}`;
  const willText = container.querySelector('#willText');
  if (willText) willText.textContent = `${Math.floor(speechState.orbs.will.current)}/${speechState.orbs.will.max}`;
  const progressText = container.querySelector('#coreProgressText');
  if (progressText) progressText.textContent = `${Math.floor(coreState.meditationProgress)}/${coreState.requirement}`;
  levelDisplay.textContent = `Core Level: ${coreState.coreLevel}`;
  if (speechLevelEl) speechLevelEl.textContent = speechState.level;
  if (mindValEl) mindValEl.textContent = `${Math.floor(speechState.orbs.insight.current)}/${speechState.orbs.insight.max}`;
  if (bodyValEl) bodyValEl.textContent = `${Math.floor(speechState.orbs.body.current)}/${speechState.orbs.body.max}`;
  if (willValEl) willValEl.textContent = `${Math.floor(speechState.orbs.will.current)}/${speechState.orbs.will.max}`;
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

