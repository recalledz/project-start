import { currentEnemy, stageData } from './state.js';
import { dealerLifeDisplay, updateDealerLifeBar } from './ui.js';
import { renderDealerLifeBarFill } from '../rendering.js';
import { formatNumber } from '../utils/numberFormat.js';
import { activeDisciples } from './disciples.js';

export function init() {}

export let discipleAttackTimers = {};
export let enemyAttackProgress = 0;
export function setEnemyAttackProgress(val) {
  enemyAttackProgress = val;
}

export function attack(deltaTime = 0) {
  const enemy = currentEnemy;
  if (!enemy) return;

  activeDisciples.forEach(d => {
    if (!discipleAttackTimers[d.id]) discipleAttackTimers[d.id] = 0;
    discipleAttackTimers[d.id] += deltaTime;

    if (d.attackFill) {
      const pratio = Math.min(1, discipleAttackTimers[d.id] / d.attackSpeed);
      d.attackFill.style.width = `${pratio * 100}%`;
    }

    if (discipleAttackTimers[d.id] >= d.attackSpeed && !enemy.isDefeated()) {
      enemy.takeDamage(d.damage);
      discipleAttackTimers[d.id] = 0;
      if (d.attackFill) d.attackFill.style.width = '0%';
    }
  });

  stageData.dealerLifeCurrent = enemy.currentHp;

  if (enemy.isDefeated()) {
    enemy.onDefeat?.();
  } else {
    dealerLifeDisplay.textContent = `Life: ${formatNumber(Math.floor(
      enemy.currentHp
    ))}/${formatNumber(enemy.maxHp)}`;
    renderDealerLifeBarFill(enemy);
  }
}

export function tickEnemy(deltaTime = 0, enemyAttackFill) {
  if (!currentEnemy) return;

  currentEnemy.tick(deltaTime);

  if (!currentEnemy) return;

  updateDealerLifeBar(currentEnemy);

  if (enemyAttackFill) {
    const eratio = Math.min(
      1,
      currentEnemy.attackTimer / currentEnemy.attackInterval
    );
    enemyAttackFill.style.width = `${eratio * 100}%`;
  }

  const overlays = document.querySelectorAll('.cooldown-overlay');
  overlays.forEach((overlay, i) => {
    const ability = currentEnemy.abilities[i];
    if (
      ability &&
      typeof ability.timer === 'number' &&
      typeof ability.maxTimer === 'number'
    ) {
      const ratio = Math.min(1, Math.max(0, ability.timer / ability.maxTimer));
      overlay.style.setProperty('--cooldown', ratio);
    }
  });
}
