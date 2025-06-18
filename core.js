export const coreState = {
  coreLevel: 1,
  mind: { level: 1, xp: 0, maxXP: 10 },
  body: { level: 1, xp: 0, maxXP: 10 },
  soul: { level: 1, xp: 0, maxXP: 10 },
  meditating: false
};

let container;
let meditateBtn;
let levelDisplay;

export function initCore() {
  container = document.getElementById('coreTabContent');
  if (!container) return;
  container.innerHTML = `\n    <svg id="coreDiagram" viewBox="0 0 400 400" width="100%" height="100%">\n      <path d="M200 140\n               C185 140, 180 120, 200 120\n               C220 120, 215 140, 200 140\n               M190 140\n               C170 160, 170 190, 185 200\n               C170 210, 170 240, 200 240\n               C230 240, 230 210, 215 200\n               C230 190, 230 160, 210 140\n               Z"\n            fill="rgba(0,0,0,0.5)" stroke="#888" stroke-width="2" />\n\n      <circle id="mindOrb" cx="200" cy="60" r="20" fill="rgba(100,150,255,0.3)" stroke="#88aaff" stroke-width="2" />\n      <circle id="bodyOrb" cx="120" cy="220" r="20" fill="rgba(255,100,100,0.3)" stroke="#ff8888" stroke-width="2" />\n      <circle id="soulOrb" cx="280" cy="220" r="20" fill="rgba(180,100,255,0.3)" stroke="#cc88ff" stroke-width="2" />\n    </svg>\n    <button id="meditateCoreBtn" disabled>Meditate Core</button>\n    <div id="coreLevelText" class="core-level-text"></div>\n  `;
  meditateBtn = container.querySelector('#meditateCoreBtn');
  levelDisplay = container.querySelector('#coreLevelText');
  meditateBtn.addEventListener('click', startMeditation);
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
  orb.xp = Math.min(orb.maxXP, orb.xp + amt);
  renderCore();
}

function startMeditation() {
  if (coreState.meditating) return;
  coreState.meditating = true;
  meditateBtn.disabled = true;
  let progress = 0;
  const timer = setInterval(() => {
    progress += 0.05;
    if (progress >= 1) {
      clearInterval(timer);
      coreState.coreLevel += 1;
      coreState.mind.xp = 0;
      coreState.body.xp = 0;
      coreState.soul.xp = 0;
      coreState.meditating = false;
      renderCore();
    }
  }, 100);
}

function renderCore() {
  if (!container) return;
  const mindFill = Math.min(1, coreState.mind.xp / coreState.mind.maxXP);
  const bodyFill = Math.min(1, coreState.body.xp / coreState.body.maxXP);
  const soulFill = Math.min(1, coreState.soul.xp / coreState.soul.maxXP);
  container.querySelector('#mindOrb').setAttribute('fill', `rgba(100,150,255,${0.3 + 0.7 * mindFill})`);
  container.querySelector('#bodyOrb').setAttribute('fill', `rgba(255,100,100,${0.3 + 0.7 * bodyFill})`);
  container.querySelector('#soulOrb').setAttribute('fill', `rgba(180,100,255,${0.3 + 0.7 * soulFill})`);
  levelDisplay.textContent = `Core Level: ${coreState.coreLevel}`;
  const ready = mindFill >= 1 && bodyFill >= 1 && soulFill >= 1 && !coreState.meditating;
  meditateBtn.disabled = !ready;
}

export function refreshCore() {
  renderCore();
}
