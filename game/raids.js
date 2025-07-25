/* global updateSectDisplay */
import { sectSystem } from './sect.js';
import {
  sectState,
  stageData,
  setCurrentEnemy,
  currentEnemy
} from './state.js';
import { updateDealerLifeDisplay } from './ui.js';
import { spawnDealer } from '../enemySpawning.js';
import addLog from '../log.js';
import { showRaidAlert } from './alerts.js';

export const raidState = {
  active: false,
  enemy: null,
  attackTimers: {},
  orbTimer: 0
};

const ORB_INTERVAL = 5000; // ms

export function startRaid() {
  if (raidState.active) return;
  const stage = Math.max(1, stageData.stage);
  const world = stageData.world;
  const onAttack = enemy => {
    const dmg = enemy.damage;
    sectSystem.orbs.water.current = Math.max(0, sectSystem.orbs.water.current - dmg);
    if (sectSystem.orbs.water.current === 0) {
      sectState.fruits = Math.max(0, sectState.fruits - 20);
      sectState.softwood = Math.max(0, sectState.softwood - 10);
      addLog('Raiders plunder your supplies!', 'damage');
      endRaid();
    }
    if (typeof updateSectDisplay === 'function') updateSectDisplay();
  };
  raidState.enemy = spawnDealer({ stage, world }, 0, onAttack, endRaid);
  setCurrentEnemy(raidState.enemy);
  updateDealerLifeDisplay(raidState.enemy);
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
    if (raidState.enemy.isDefeated()) endRaid();
  }
}
