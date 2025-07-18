import { currentEnemy, stageData } from '../script.js';
import { dealerLifeDisplay } from './ui.js';
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
