import { currentEnemy, stageData, sectState, playerStats } from './state.js';
import { dealerLifeDisplay } from './ui.js';
import { renderDealerLifeBarFill, removeBloodSplat, updateBloodSplat, animateDiscipleHit, showDamageFloat, animateDiscipleDeath } from './rendering.js';
import { formatNumber } from '../utils/numberFormat.js';
import { activeDisciples } from './disciples.js';
import { calculateEnemyBasicDamage } from './enemySpawning.js';
import { sectSystem } from './sect.js';
import { showRestartScreen } from '../ui/restartOverlay.js';
import addLog from './log.js';
import { raidState } from './raids.js';

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

    const atkTime = d.attackSpeed / sectSystem.attackSpeedMult;
    if (d.attackFill) {
      const pratio = Math.min(1, discipleAttackTimers[d.id] / atkTime);
      d.attackFill.style.width = `${pratio * 100}%`;
    }

    if (discipleAttackTimers[d.id] >= atkTime && !enemy.isDefeated()) {
      enemy.takeDamage(d.damage);
      if (raidState.active) raidState.damageDealt += d.damage;
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

let partyDefeatHandler = null;
export function setPartyDefeatHandler(fn) {
  partyDefeatHandler = fn;
}


export function cDealerDamage(damageAmount = null, source = 'dealer') {
  const targets = activeDisciples;
  if (targets.length === 0) {
    playerStats.hasDied = true;
    showRestartScreen(partyDefeatHandler);
    return;
  }

  const { minDamage, maxDamage } = calculateEnemyBasicDamage(
    stageData.stage,
    stageData.world
  );
  const dDamage =
    damageAmount ?? Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

  let finalDamage = dDamage;
  if (raidState.active) raidState.damageReceived += finalDamage;

  const idx = Math.floor(Math.random() * targets.length);
  const card = targets[idx];

  card.currentHp = Math.round(Math.max(0, card.currentHp - finalDamage));
  const targetName = card.name ? card.name : `${card.value}${card.symbol}`;
  addLog(`${source} hit ${targetName} for ${finalDamage} damage!`, 'damage');

  if (card.hpDisplay) {
    card.hpDisplay.textContent = `HP: ${formatNumber(Math.round(card.currentHp))}/${formatNumber(
      Math.round(card.maxHp)
    )}`;
  }
  if (card.wrapperElement) {
    animateDiscipleHit(card);
    showDamageFloat(card, finalDamage);
  }
  updateBloodSplat(card);

  if (card.currentHp === 0) {
    activeDisciples.splice(idx, 1);
    card.incapacitated = true;
    card.health = 0;
    card.stamina = 0;
    sectState.discipleTasks[card.id] = 'Idle';
    animateDiscipleDeath(card, () => {
      removeBloodSplat(card);
      card.wrapperElement?.remove();
      if (activeDisciples.length === 0) {
        playerStats.hasDied = true;
        showRestartScreen(partyDefeatHandler);
      }
    });
  }
}

globalThis.cDealerDamage = cDealerDamage;
