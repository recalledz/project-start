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

export function renderDiscardCard(card, discardContainer, backImages) {
  discardContainer.innerHTML = '';
  const img = document.createElement('img');
  img.alt = 'Card Back';
  img.src = backImages[card.backType] || backImages['basic-red'];
  img.classList.add('card-back', card.backType);
  discardContainer.appendChild(img);
  card.discardElement = img;
}

function drawBloodSplat(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < 6; i++) {
    const r = Math.random() * 10 + 5;
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.beginPath();
    ctx.fillStyle = `rgba(150,0,0,${0.5 + Math.random() * 0.5})`;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
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
