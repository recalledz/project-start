import { sectSystem } from './game/sect.js';

export const metamorphosisState = {
  meditationProgress: 0,
  meditating: false,
  requirement: 100000
};

let container;
let meditateBtn;
let progressFill;
let progressText;

export function initMetamorphosis() {
  container = document.getElementById('metamorphosisTabContent');
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
  window.addEventListener('orbs-changed', renderMetamorphosis);
  meditateBtn.addEventListener('click', toggleMeditation);
  meditateBtn.addEventListener('mouseenter', e => {
    window.showTooltip('Toggle meditation focus', e.pageX + 10, e.pageY + 10);
  });
  meditateBtn.addEventListener('mouseleave', window.hideTooltip);
  if (window.lucide) window.lucide.createIcons({ icons: window.lucide.icons });
  renderMetamorphosis();
}


function toggleMeditation() {
  if (metamorphosisState.meditationProgress >= metamorphosisState.requirement) {
    breakthrough();
    return;
  }
  metamorphosisState.meditating = !metamorphosisState.meditating;
  meditateBtn.textContent = metamorphosisState.meditating ? 'Meditating...' : 'Meditate';
}

function breakthrough() {
  metamorphosisState.meditationProgress = 0;
  // requirement could scale later; keep constant for now
  sectSystem.orbs.water.current = 0;
  meditateBtn.textContent = 'Meditate';
  renderMetamorphosis();
}

function renderMetamorphosis() {
  if (!container) return;
  const coreFill = Math.min(1, metamorphosisState.meditationProgress / metamorphosisState.requirement);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#bodyFill', 200, 180, 60, coreFill);

  if (progressText) progressText.textContent = `${Math.floor(metamorphosisState.meditationProgress)}/${metamorphosisState.requirement}`;
  if (progressFill) progressFill.style.width = `${coreFill * 100}%`;
  if (metamorphosisState.meditationProgress >= metamorphosisState.requirement) {
    meditateBtn.textContent = 'Breakthrough';
  } else {
    meditateBtn.textContent = metamorphosisState.meditating ? 'Meditating...' : 'Meditate';
  }
  meditateBtn.disabled = false;

  const halo = container.querySelector('#metamorphosisHalo');
  if (halo) halo.setAttribute('opacity', metamorphosisState.meditationProgress >= metamorphosisState.requirement ? '1' : '0');
}

export function refreshMetamorphosis() {
  renderMetamorphosis();
}

