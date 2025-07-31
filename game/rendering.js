import { runAnimation } from '../utils/animation.js';

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

export function renderDealerLifeBar(dealerLifeDisplay, currentEnemy) {
  if (document.querySelector('.dealerLifeContainer')) return;
  const container = document.createElement('div');
  const fill = document.createElement('div');
  container.classList.add('dealerLifeContainer');
  fill.id = 'dealerBarFill';
  container.appendChild(fill);
  dealerLifeDisplay.insertAdjacentElement('afterend', container);
  dealerLifeDisplay.textContent = `Life: ${currentEnemy.maxHp}`;
  return fill;
}

export function renderEnemyAttackBar() {
  const existing = document.querySelector('.enemyAttackBar');
  if (existing) existing.remove();
  const bar = document.createElement('div');
  const fill = document.createElement('div');
  bar.classList.add('enemyAttackBar');
  fill.classList.add('enemyAttackFill');
  fill.style.width = '0%';
  bar.appendChild(fill);
  const lifeContainer = document.querySelector('.dealerLifeContainer');
  if (lifeContainer) lifeContainer.insertAdjacentElement('afterend', bar);
  return fill;
}

export function renderPlayerAttackBar(container) {
  if (!container) return null;
  const bar = document.getElementById('playerAttackBar');
  if (!bar) return null;
  return bar.querySelector('.playerAttackFill');
}

export function renderDealerLifeBarFill(currentEnemy) {
  const dealerBarFill = document.getElementById('dealerBarFill');
  if (!dealerBarFill) return;
  dealerBarFill.style.width = `${(currentEnemy.currentHp / currentEnemy.maxHp) * 100}%`;
}

export function renderCard(card, handContainer) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('card-wrapper');
  const cardPane = document.createElement('div');
  cardPane.classList.add('card');
  cardPane.innerHTML = `\n  <div class="card-value" style="color: ${card.color}">${card.value}</div>\n  <div class="card-suit" style="color: ${card.color}">${card.symbol}</div>\n  <div class="card-hp">HP: ${Math.round(card.currentHp)}/${Math.round(card.maxHp)}</div>\n  `;
  const xpBar = document.createElement('div');
  const xpBarFill = document.createElement('div');
  const xpLabel = document.createElement('div');
  xpBar.classList.add('xpBar');
  xpBarFill.classList.add('xpBarFill');
  xpLabel.classList.add('xpBarLabel');
  xpLabel.textContent = `LV: ${card.currentLevel}`;
  xpBar.append(xpBarFill, xpLabel);
  wrapper.append(cardPane, xpBar);
  handContainer.appendChild(wrapper);
  card.wrapperElement = wrapper;
  card.cardElement = cardPane;
  card.hpDisplay = cardPane.querySelector('.card-hp');
  card.xpBar = xpBar;
  card.xpBarFill = xpBarFill;
  card.xpLabel = xpLabel;
}

export function renderDiscipleCard(disciple, handContainer) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('card-wrapper');
  const cardPane = document.createElement('div');
  cardPane.classList.add('card');
  cardPane.innerHTML = `\n  <div class="card-value">${disciple.name}</div>\n  <div class="card-suit">🧍</div>\n  <div class="card-hp">HP: ${Math.round(disciple.currentHp)}/${Math.round(disciple.maxHp)}</div>\n  `;
  const xpBar = document.createElement('div');
  const xpBarFill = document.createElement('div');
  const xpLabel = document.createElement('div');
  xpBar.classList.add('xpBar');
  xpBarFill.classList.add('xpBarFill');
  xpLabel.classList.add('xpBarLabel');
  xpLabel.textContent = `LV: ${disciple.combatLevel}`;
  xpBar.append(xpBarFill, xpLabel);
  const statsDiv = document.createElement('div');
  statsDiv.className = 'disciple-stats';
  wrapper.append(cardPane, xpBar, statsDiv);
  handContainer.appendChild(wrapper);
  disciple.wrapperElement = wrapper;
  disciple.cardElement = cardPane;
  disciple.hpDisplay = cardPane.querySelector('.card-hp');
  disciple.xpBar = xpBar;
  disciple.xpBarFill = xpBarFill;
  disciple.xpLabel = xpLabel;
  disciple.statsElement = statsDiv;
}



export function applyBloodSplat(card) {
  if (!card.cardElement) return;
  if (card.bloodSplatEl) return;
  const rect = card.cardElement.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.classList.add('blood-splat');
  canvas.width = rect.width;
  canvas.height = rect.height;
  drawBloodSplat(canvas);
  card.cardElement.appendChild(canvas);
  card.bloodSplatEl = canvas;
}

export function removeBloodSplat(card) {
  if (card.bloodSplatEl) {
    card.bloodSplatEl.remove();
    card.bloodSplatEl = null;
  }
}

export function updateBloodSplat(card) {
  if (!card) return;
  const ratio = card.maxHp > 0 ? card.currentHp / card.maxHp : 0;
  if (ratio <= 0.1) {
    applyBloodSplat(card);
  } else {
    removeBloodSplat(card);
  }
}

export function animateDiscipleHit(card) {
  const w = card.wrapperElement;
  if (!w) return;
  const target = card.cardElement || w;
  runAnimation(target, 'hit-animate');
}

export function showDamageFloat(card, amount) {
  const hp = card.hpDisplay;
  if (!hp) return;
  const dmg = document.createElement('div');
  dmg.classList.add('damage-float');
  dmg.textContent = `-${amount}`;
  hp.appendChild(dmg);
  dmg.addEventListener(
    'animationend',
    () => dmg.remove(),
    {
      once: true
    }
  );
  setTimeout(() => dmg.remove(), 3000);
}

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

export function animateDiscipleDeath(card, callback) {
  const w = card.wrapperElement;
  if (!w) {
    callback?.();
    return;
  }
  runAnimation(w, 'card-death', 600).then(() => callback?.());
}
