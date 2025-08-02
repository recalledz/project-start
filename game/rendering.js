// Raid rendering helpers.

export function drawBloodSplat(canvas) {
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const count = 3 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const r = 2 + Math.random() * 2;
    const x = r + Math.random() * (canvas.width - 2 * r);
    const y = r + Math.random() * (canvas.height - 2 * r);
    ctx.beginPath();
    ctx.fillStyle = '#a00';
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createMapSplatter(x, y) {
  const map = document.getElementById('colonyMap');
  if (!map) return;
  const size = 12;
  const canvas = document.createElement('canvas');
  canvas.className = 'map-splatter';
  canvas.width = size;
  canvas.height = size;
  canvas.style.left = `${x - size / 2}px`;
  canvas.style.top = `${y - size / 2}px`;
  drawBloodSplat(canvas);
  map.appendChild(canvas);
}

export function renderEnemyAttackBar() { return null; }

export function renderPlayerAttackBar() { return null; }

export function renderDealerLifeBarFill() {}

export function applyBloodSplat() {}

export function removeBloodSplat() {}

export function updateBloodSplat() {}

// Display damage numbers during raid battles.
export function showRaidDamageFloat(el, amount, isRaider = false) {
  if (!el) return;
  const dmg = document.createElement('div');
  dmg.classList.add('damage-float');
  if (isRaider) dmg.classList.add('raider-damage');
  dmg.textContent = `-${amount}`;
  el.appendChild(dmg);
  dmg.addEventListener(
    'animationend',
    () => dmg.remove(),
    {
      once: true
    }
  );
  setTimeout(() => dmg.remove(), 3000);
}
