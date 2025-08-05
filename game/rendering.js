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

// Display a floating '+ X' text and glow when a disciple levels a combat stat.
export function showCombatLevelUp(d, text) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector(`.sect-disciple[data-disciple-id="${d.id}"]`);
  if (!el) return;
  const gain = document.createElement('div');
  gain.classList.add('levelup-float');
  gain.textContent = `+ ${text}`;
  el.appendChild(gain);
  gain.addEventListener('animationend', () => gain.remove(), { once: true });
  setTimeout(() => gain.remove(), 3000);
  el.classList.add('glow-notify');
  setTimeout(() => el.classList.remove('glow-notify'), 1000);
}
