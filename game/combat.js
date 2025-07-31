// Handles exploration battles between the player's party and a single enemy.
import { currentEnemy, stageData, sectState, playerStats } from './state.js';
import { dealerLifeDisplay } from './ui.js';
import {
  renderDealerLifeBarFill,
  removeBloodSplat,
  updateBloodSplat,
  animateDiscipleHit,
  showDamageFloat,
  animateDiscipleDeath
} from './rendering.js';
import { formatNumber } from '../utils/numberFormat.js';
import { activeDisciples } from './disciples.js';
import { calculateEnemyBasicDamage } from './enemySpawning.js';
import { sectSystem } from './sect.js';
import { showRestartScreen } from '../ui/restartOverlay.js';
import { raidState } from './raids.js';

import addLog from './log.js';
import bus from './canBus.js';
import { randomBodyPart, applyInjury } from './injury.js';

export function applyDamage(target, amount) {
  let remaining = Math.round(amount);
  if (target.water > 0) {
    const absorbed = Math.min(target.water, remaining);
    target.water -= absorbed;
    remaining -= absorbed;
  }
  if (remaining > 0 && target.water <= 0 && Object.hasOwn(target, 'injuries')) {
    const part = randomBodyPart();
    if (part !== 'general') {
      const tier = Math.random() < 0.5 ? 'bruise' : 'wound';
      applyInjury(target, part, tier);
    }
  }
  target.currentHp = Math.max(0, target.currentHp - remaining);
  if (Object.hasOwn(target, 'health')) {
    target.health = target.currentHp;
  }
  return remaining;
}

export function init() {}

// Map of disciple id to their current attack timer used during exploration
export let discipleAttackTimers = {};
export let enemyAttackProgress = 0;
export function setEnemyAttackProgress(val) {
  enemyAttackProgress = val;
}

// Generic helper used by both exploration and raid battles. Iterates over the
// provided disciples, advancing their attack timers and applying damage when
// ready. Optional callbacks allow customization for different combat modes.
export function applyDiscipleAttacks(
  enemy,
  disciples,
  timers,
  deltaTime,
  onHit,
  updateFill
) {
  disciples.forEach(d => {
    if (!timers[d.id]) timers[d.id] = 0;
    timers[d.id] += deltaTime;
    const atkTime = d.attackSpeed / sectSystem.attackSpeedMult;
    if (updateFill) {
      const ratio = Math.min(1, timers[d.id] / atkTime);
      updateFill(d, ratio);
    }
    if (timers[d.id] >= atkTime && !enemy.isDefeated()) {
      enemy.takeDamage(d.damage);
      onHit?.(d.damage, d);
      timers[d.id] = 0;
      if (updateFill) updateFill(d, 0);
    }
  });
}

export function attack(deltaTime = 0) {
  const enemy = currentEnemy;
  if (!enemy) return;

  applyDiscipleAttacks(
    enemy,
    activeDisciples,
    discipleAttackTimers,
    deltaTime,
    null,
    (disc, ratio) => {
      if (disc.attackFill) disc.attackFill.style.width = `${ratio * 100}%`;
    }
  );

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
    if (!raidState.active) {
      playerStats.hasDied = true;
      showRestartScreen(partyDefeatHandler);
    }
    return;
  }

  const { minDamage, maxDamage } = calculateEnemyBasicDamage(
    stageData.stage,
    stageData.world
  );
  const dDamage =
    damageAmount ?? Math.floor(Math.random() * (maxDamage - minDamage + 1)) + minDamage;

  let finalDamage = dDamage;

  const idx = Math.floor(Math.random() * targets.length);
  const card = targets[idx];

  applyDamage(card, finalDamage);
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
      if (activeDisciples.length === 0 && !raidState.active) {
        playerStats.hasDied = true;
        showRestartScreen(partyDefeatHandler);
      }
    });
  }
}

export function damageDisciple(target, damageAmount, source = 'enemy') {
  if (!target || target.incapacitated) return;

  const amount = Math.round(damageAmount);
  applyDamage(target, amount);
  const targetName = target.name ? target.name : `${target.value}${target.symbol}`;
  addLog(`${source} hit ${targetName} for ${amount} damage!`, 'damage');

  if (target.hpDisplay) {
    target.hpDisplay.textContent = `HP: ${formatNumber(Math.round(target.currentHp))}/${formatNumber(
      Math.round(target.maxHp)
    )}`;
  }
  if (target.wrapperElement) {
    animateDiscipleHit(target);
    showDamageFloat(target, amount);
  }
  updateBloodSplat(target);

  if (target.currentHp === 0) {
    const idx = activeDisciples.indexOf(target);
    if (idx >= 0) activeDisciples.splice(idx, 1);
    target.incapacitated = true;
    target.health = 0;
    target.stamina = 0;
    sectState.discipleTasks[target.id] = 'Idle';
    animateDiscipleDeath(target, () => {
      removeBloodSplat(target);
      target.wrapperElement?.remove();
      if (activeDisciples.length === 0 && !raidState.active) {
        playerStats.hasDied = true;
        showRestartScreen(partyDefeatHandler);
      }
    });
  }
}

// Event bus wiring
bus.subscribe('BLOB_ATTACK_DISCIPLE', ({ id, damage }) => {
  const disc = sectSystem.disciples.find(d => d.id === id);
  if (disc) damageDisciple(disc, damage, 'SlowBlob');
});

globalThis.cDealerDamage = cDealerDamage;
