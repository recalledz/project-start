import { renderDealerLifeBar, renderDealerLifeBarFill } from '../rendering.js';
import { activeDisciples } from './disciples.js';
import { renderDiscipleCard } from '../rendering.js';
import { formatNumber } from '../utils/numberFormat.js';

export function init() {}

export const handContainer = document.getElementsByClassName('handContainer')[0];
export const dealerLifeDisplay =
  document.getElementsByClassName('dealerLifeDisplay')[0];

export function showPlayerAttackBar() {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'block';
}

export function hidePlayerAttackBar(playerAttackFill) {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'none';
  if (playerAttackFill) playerAttackFill.style.width = '0%';
}

export function updateDealerLifeBar(enemy) {
  const barFill = document.getElementById('dealerBarFill');
  if (!barFill || !enemy) return;
  const hpRatio = enemy.currentHp / enemy.maxHp;
  barFill.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
}

export function removeDealerLifeBar() {
  const bar = document.querySelector('.dealerLifeContainer');
  if (bar) bar.remove();
  const atk = document.querySelector('.enemyAttackBar');
  if (atk) atk.remove();
  dealerLifeDisplay.textContent = '';
}

export function updateDealerLifeDisplay(currentEnemy) {
  if (!currentEnemy) {
    removeDealerLifeBar();
    return;
  }
  dealerLifeDisplay.textContent = `Life: ${formatNumber(currentEnemy.currentHp)}/${formatNumber(currentEnemy.maxHp)}`;
  renderDealerLifeBar(dealerLifeDisplay, currentEnemy);
  renderDealerLifeBarFill(currentEnemy);
}

export function updateDiscipleStatsDisplay(d) {
  if (!d.statsElement) return;
  d.statsElement.innerHTML = '';
}

export function renderCombatDisciples() {
  if (!handContainer) return;
  handContainer.innerHTML = '';
  activeDisciples.forEach(d => {
    renderDiscipleCard(d, handContainer);
    const bar = document.createElement('div');
    bar.className = 'disciple-attack-bar';
    const fill = document.createElement('div');
    fill.className = 'disciple-attack-fill';
    bar.appendChild(fill);
    d.wrapperElement.insertBefore(bar, d.xpBar);
    d.attackFill = fill;
    updateDiscipleStatsDisplay(d);
  });
}
