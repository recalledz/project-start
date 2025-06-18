export const coreState = {
  coreLevel: 1,
  mind: { level: 1, xp: 0, maxXP: 1000 },
  body: { level: 1, xp: 0, maxXP: 10 },
  soul: { level: 1, xp: 0, maxXP: 10 },
  meditationProgress: 0,
  meditating: false
};

let container;
let meditateBtn;
let levelDisplay;
let progressText;
let soulTimer;
let meditationTimer;

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
    <svg id="coreDiagram" viewBox="0 0 400 400" width="100%" height="100%">
      <defs>
        <clipPath id="bodyShapeClip"><path d="${bodyPath}" /></clipPath>
        <clipPath id="mindClip"><circle cx="200" cy="60" r="20" /></clipPath>
        <clipPath id="bodyOrbClip"><circle cx="120" cy="220" r="20" /></clipPath>
        <clipPath id="soulClip"><circle cx="280" cy="220" r="20" /></clipPath>
      </defs>
      <path d="${bodyPath}" fill="rgba(0,0,0,0.3)" stroke="#888" stroke-width="2" />
      <circle id="coreHalo" cx="200" cy="180" r="70" fill="none" stroke="gold" stroke-width="4" opacity="0" />
      <rect id="bodyFill" x="170" y="240" width="60" height="0" fill="rgba(255,255,255,0.4)" clip-path="url(#bodyShapeClip)" />
      <circle cx="200" cy="60" r="20" fill="rgba(100,150,255,0.3)" />
      <rect id="mindFill" x="180" y="80" width="40" height="0" fill="rgba(100,150,255,0.6)" clip-path="url(#mindClip)" />
      <circle id="mindOrb" cx="200" cy="60" r="20" fill="none" stroke="#88aaff" stroke-width="2" />
      <text id="mindText" x="200" y="95" text-anchor="middle" class="orb-text"></text>
      <circle cx="120" cy="220" r="20" fill="rgba(255,100,100,0.3)" />
      <rect id="bodyOrbFill" x="100" y="240" width="40" height="0" fill="rgba(255,100,100,0.6)" clip-path="url(#bodyOrbClip)" />
      <circle id="bodyOrb" cx="120" cy="220" r="20" fill="none" stroke="#ff8888" stroke-width="2" />
      <text id="bodyText" x="120" y="255" text-anchor="middle" class="orb-text"></text>
      <circle cx="280" cy="220" r="20" fill="rgba(180,100,255,0.3)" />
      <rect id="soulFill" x="260" y="240" width="40" height="0" fill="rgba(180,100,255,0.6)" clip-path="url(#soulClip)" />
      <circle id="soulOrb" cx="280" cy="220" r="20" fill="none" stroke="#cc88ff" stroke-width="2" />
      <text id="soulText" x="280" y="255" text-anchor="middle" class="orb-text"></text>
      <text id="coreProgressText" x="200" y="260" text-anchor="middle" class="orb-text"></text>
    </svg>
    <button id="meditateCoreBtn" disabled>Meditate Core</button>
    <div id="coreLevelText" class="core-level-text"></div>
  `;
  meditateBtn = container.querySelector("#meditateCoreBtn");
  levelDisplay = container.querySelector('#coreLevelText');
  progressText = container.querySelector("#coreProgressText");
  const mindOrb = container.querySelector('#mindOrb');
  mindOrb.addEventListener('click', onMindOrbClick);
  meditateBtn.addEventListener('click', startMeditation);
  if (!soulTimer) {
    soulTimer = setInterval(() => addCoreXP('soul', 0.5), 1000);
  }
  renderCore();
}

export function getMindLevel() {
  return coreState.mind.level;
}

export function addCoreXP(type, amt = 1) {
  const orb =
    type === 'mental' ? coreState.mind :
    type === 'physical' ? coreState.body :
    type === 'soul' ? coreState.soul : null;
  if (!orb) return;
  const maxLevel = coreState.coreLevel * 5;
  if (orb.level >= maxLevel) return;
  orb.xp = Math.min(orb.maxXP, orb.xp + amt);
  renderCore();
}

function onMindOrbClick() {
  const orb = coreState.mind;
  const maxLevel = coreState.coreLevel * 5;
  if (orb.xp < orb.maxXP || orb.level >= maxLevel) return;
  orb.level += 1;
  coreState.mind.xp = 0;
  coreState.mind.maxXP = Math.floor(coreState.mind.maxXP * 1.5);
  window.dispatchEvent(new CustomEvent('core-mind-upgrade'));
  renderCore();
}

function startMeditation() {
  if (coreState.meditationProgress >= 100) {
    breakthrough();
    return;
  }
  if (coreState.meditating) return;
  coreState.meditating = true;
  meditateBtn.textContent = 'Meditating...';
  meditateBtn.disabled = true;
  meditationTimer = setInterval(() => {
    coreState.meditationProgress = Math.min(100, coreState.meditationProgress + 1);
    renderCore();
    if (coreState.meditationProgress >= 100) {
      clearInterval(meditationTimer);
      coreState.meditating = false;
      meditateBtn.textContent = 'Breakthrough';
      meditateBtn.disabled = false;
    }
  }, 100);
}

function breakthrough() {
  if (meditationTimer) {
    clearInterval(meditationTimer);
    coreState.meditating = false;
  }
  coreState.coreLevel += 1;
  coreState.meditationProgress = 0;
  coreState.mind.xp = 0;
  coreState.body.xp = 0;
  coreState.soul.xp = 0;
  meditateBtn.textContent = 'Meditate Core';
  renderCore();
}

function renderCore() {
  if (!container) return;
  const mindFill = Math.min(1, coreState.mind.xp / coreState.mind.maxXP);
  const bodyFill = Math.min(1, coreState.body.xp / coreState.body.maxXP);
  const soulFill = Math.min(1, coreState.soul.xp / coreState.soul.maxXP);

  const coreFill = Math.min(1, coreState.meditationProgress / 100);

  const updateRect = (id, cx, cy, r, fill) => {
    const rect = container.querySelector(id);
    if (!rect) return;
    const size = r * 2;
    const h = size * fill;
    rect.setAttribute('y', cy + r - h);
    rect.setAttribute('height', h);
  };

  updateRect('#mindFill', 200, 60, 20, mindFill);
  updateRect('#bodyOrbFill', 120, 220, 20, bodyFill);
  updateRect('#soulFill', 280, 220, 20, soulFill);
  updateRect('#bodyFill', 200, 180, 60, coreFill);

  const mindOrb = container.querySelector('#mindOrb');
  if (mindOrb) mindOrb.setAttribute('stroke', mindFill >= 1 ? '#ffffaa' : '#88aaff');
  const bodyOrb = container.querySelector('#bodyOrb');
  if (bodyOrb) bodyOrb.setAttribute('stroke', bodyFill >= 1 ? '#ffcccc' : '#ff8888');
  const soulOrb = container.querySelector('#soulOrb');
  if (soulOrb) soulOrb.setAttribute('stroke', soulFill >= 1 ? '#ddaaff' : '#cc88ff');

  const mindText = container.querySelector('#mindText');
  if (mindText) mindText.textContent = `${Math.floor(coreState.mind.xp)}/${coreState.mind.maxXP}`;
  const bodyText = container.querySelector('#bodyText');
  if (bodyText) bodyText.textContent = `${Math.floor(coreState.body.xp)}/${coreState.body.maxXP}`;
  const soulText = container.querySelector('#soulText');
  if (soulText) soulText.textContent = `${Math.floor(coreState.soul.xp)}/${coreState.soul.maxXP}`;
  const progressText = container.querySelector('#coreProgressText');
  if (progressText) progressText.textContent = `${Math.floor(coreState.meditationProgress)}/100`;
  levelDisplay.textContent = `Core Level: ${coreState.coreLevel}`;
  const ready = mindFill >= 1 && bodyFill >= 1 && soulFill >= 1 && !coreState.meditating && coreState.meditationProgress === 0;

  if (coreState.meditationProgress >= 100) {
    meditateBtn.textContent = 'Breakthrough';
    meditateBtn.disabled = false;
  } else {
    meditateBtn.textContent = coreState.meditating ? 'Meditating...' : 'Meditate Core';
    meditateBtn.disabled = !ready;
  }

  const halo = container.querySelector('#coreHalo');
  if (halo) halo.setAttribute('opacity', coreState.meditationProgress >= 100 ? '1' : '0');
}

export function refreshCore() {
  renderCore();
}
