// Raid rendering helpers.

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
