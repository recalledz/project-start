/* global updateSectDisplay */
import { sectSystem } from './sect.js';
import {
  sectState,
  stageData,
  setCurrentEnemy,
  currentEnemy
} from './state.js';
import { updateRaidLifeBar, updateDealerLifeDisplay } from './ui.js';
import { showRaidSummaryOverlay } from '../ui/raidSummaryOverlay.js';

import { spawnDealer } from '../enemySpawning.js';
import addLog from '../log.js';
import { showRaidAlert } from './alerts.js';
import { runAnimation } from '../utils/animation.js';

export const raidState = {
  active: false,
  enemy: null,
  attackTimers: {},
  orbTimer: 0,
  damageDealt: 0,
  damageReceived: 0
};

function shootWaterBurst(targetEl) {
  const orb = document.querySelector('#sectOrbs .sect-orb.water');
  const map = document.getElementById('colonyMap');
  if (!orb || !map || !targetEl) return;
  const orbRect = orb.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();
  const mapRect = map.getBoundingClientRect();
  const proj = document.createElement('div');
  const dx = targetRect.left + targetRect.width / 2 - (orbRect.left + orbRect.width / 2);
  const dy = targetRect.top + targetRect.height / 2 - (orbRect.top + orbRect.height / 2);
  const dist = Math.hypot(dx, dy);
  proj.className = 'water-burst';
  proj.style.left = `${orbRect.left - mapRect.left + orbRect.width / 2}px`;
  proj.style.top = `${orbRect.top - mapRect.top + orbRect.height / 2}px`;
  proj.style.setProperty('--dx', `${dx}px`);
  proj.style.setProperty('--dy', `${dy}px`);
  proj.style.setProperty('--duration', `${Math.max(300, dist)}ms`);
  map.appendChild(proj);
  proj.addEventListener('animationend', () => proj.remove(), { once: true });
  runAnimation(targetEl, 'hit-animate');
  runAnimation(orb, 'orb-hit');
}

const ORB_INTERVAL = 10000; // ms

export function startRaid() {
  if (raidState.active) return;
  const stage = Math.max(1, stageData.stage);
  const world = stageData.world;
  raidState.damageDealt = 0;
  raidState.damageReceived = 0;
  const onAttack = enemy => {
    let dmg = enemy.damage;
    const fighters = sectSystem.disciples.filter(
      d => sectState.discipleTasks[d.id] === 'Fight' && !d.incapacitated
    );
    if (fighters.length > 0) {
      const target = fighters[Math.floor(Math.random() * fighters.length)];
      raidState.damageReceived += dmg;
      const before = target.water;
      const blocked = Math.min(before, dmg);
      target.water -= blocked;
      dmg -= blocked;
      if (dmg > 0) {
        target.currentHp = Math.max(0, target.currentHp - dmg);
        if (target.currentHp === 0) target.incapacitated = true;
      }
      if (typeof updateSectDisplay === 'function') updateSectDisplay();
      return;
    }
    raidState.damageReceived += dmg;
    sectSystem.orbs.water.current = Math.max(0, sectSystem.orbs.water.current - dmg);
    const orbEl = document.querySelector('#sectOrbs .sect-orb.water');
    if (orbEl) runAnimation(orbEl, 'orb-hit');
    if (sectSystem.orbs.water.current === 0) {
      sectState.fruits = Math.floor(sectState.fruits * 0.5);
      sectState.softwood = Math.floor(sectState.softwood * 0.5);
      addLog('Raiders plunder your supplies!', 'damage');
      endRaid();
    }
    if (typeof updateSectDisplay === 'function') updateSectDisplay();
  };
  const onDefeat = () => {
    sectState.undeadNectar = (sectState.undeadNectar || 0) + 1;
    addLog('Raiders dropped Undead Nectar!', 'good');
    endRaid();
    showRaidSummaryOverlay({
      damageDealt: raidState.damageDealt,
      damageReceived: raidState.damageReceived,
      rewards: { undeadNectar: 1 }
    });
  };
  raidState.enemy = spawnDealer({ stage, world }, 0, onAttack, onDefeat);
  setCurrentEnemy(raidState.enemy);
  updateRaidLifeBar(raidState.enemy);

  raidState.active = true;
  raidState.attackTimers = {};
  raidState.orbTimer = 0;
  addLog('Raiders have attacked!', 'info');
  showRaidAlert('Raiders incoming!');
  document.dispatchEvent(new CustomEvent('raid-start', { detail: raidState.enemy }));
  if (typeof updateSectDisplay === 'function') updateSectDisplay();
}

export function endRaid() {
  if (!raidState.active) return;
  raidState.active = false;
  setCurrentEnemy(null);
  raidState.enemy = null;
  raidState.attackTimers = {};
  raidState.orbTimer = 0;
  addLog('The raid has ended.', 'info');
  updateDealerLifeDisplay(null);
  document.dispatchEvent(new CustomEvent('raid-end'));
  if (typeof updateSectDisplay === 'function') updateSectDisplay();
}

export function tickRaid(delta) {
  if (!raidState.active || !raidState.enemy) return;
  if (raidState.enemy !== currentEnemy) raidState.enemy.tick(delta);
  raidState.orbTimer += delta;
  if (raidState.orbTimer >= ORB_INTERVAL) {
    raidState.orbTimer -= ORB_INTERVAL;
    raidState.enemy.takeDamage(5);
    raidState.damageDealt += 5;
    const card = document.querySelector('.raidCardContainer .dCardPane');
    shootWaterBurst(card);
    if (raidState.enemy) {
      updateRaidLifeBar(raidState.enemy);
      if (raidState.enemy.isDefeated()) endRaid();
    }
  }
}
