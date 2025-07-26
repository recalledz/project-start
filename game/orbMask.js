let overlay = null;
let map = null;

function update() {
  if (!overlay || !map) return;
  const orb = document.querySelector('#sectOrbs .sect-orb.water');
  if (!orb) return;
  const mapRect = map.getBoundingClientRect();
  const orbRect = orb.getBoundingClientRect();
  const x = orbRect.left + orbRect.width / 2 - mapRect.left;
  const y = orbRect.top + orbRect.height / 2 - mapRect.top;
  overlay.style.setProperty('--orb-x', `${x}px`);
  overlay.style.setProperty('--orb-y', `${y}px`);
}

export function initOrbMask() {
  map = document.getElementById('colonyMap');
  if (!map) return;
  overlay = document.createElement('div');
  overlay.id = 'orbLightMask';
  overlay.style.display = 'none';
  map.appendChild(overlay);
  update();
  window.addEventListener('resize', update);
  window.addEventListener('orbs-changed', update);
}

export function showOrbMask() {
  if (overlay) overlay.style.display = 'block';
}

export function hideOrbMask() {
  if (overlay) overlay.style.display = 'none';
}

export function updateOrbMaskPosition() {
  update();
}
