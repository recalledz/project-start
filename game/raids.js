/* global updateSectDisplay */
import { sectSystem } from './sect.js';
import {
  sectState,
  setCurrentEnemy
} from './state.js';
import { updateDealerLifeDisplay } from './ui.js';
import { showRaidSummaryOverlay } from '../ui/raidSummaryOverlay.js';

import addLog from './log.js';
import { showRaidAlert } from './alerts.js';
import { ensureDiscipleSkills, getTaskSkillProgress } from '../utils/skills.js';
import {
  tickBlobRaid,
  spawnBlob,
  clearBlobs,
  damageClosestBlob,
  canSpawn,
  raidFinished,
  showOrbAttackBar,
  hideOrbAttackBar
} from './blobRaids.js';

export const raidState = {
  active: false,
  enemy: null,
  attackTimers: {},
  orbTimer: 0,
  damageDealt: 0,
  damageReceived: 0,
  xpStart: {}
};


// blob raids handle their own visuals and timing


export function startRaid() {
  if (raidState.active) return;
  raidState.damageDealt = 0;
  raidState.damageReceived = 0;
  raidState.xpStart = {};
  sectSystem.disciples.forEach(d => {
    if (sectState.discipleTasks[d.id] === 'Fight' && !d.incapacitated) {
      ensureDiscipleSkills(d.id);
      raidState.xpStart[d.id] = {
        xp: sectState.discipleSkills[d.id].Combat || 0,
        level: getTaskSkillProgress(
          sectState.discipleSkills[d.id].Combat || 0
        ).level,
        name: d.name
      };
    }
  });
  clearBlobs();
  if (
    typeof window !== 'undefined' &&
    window.requestAnimationFrame &&
    !canSpawn()
  ) {
    const check = () => {
      if (canSpawn()) {
        spawnBlob();
      } else {
        window.requestAnimationFrame(check);
      }
    };
    window.requestAnimationFrame(check);
  } else {
    spawnBlob();
  }
  raidState.enemy = {
    maxHp: 20,
    currentHp: 20,
    takeDamage(dmg) {
      damageClosestBlob(dmg);
      raidState.damageDealt += dmg;
    },
    isDefeated() {
      if (!canSpawn()) return false;
      return raidFinished();
    },
    tick(dt) {
      tickBlobRaid(dt);
    }
  };
  setCurrentEnemy(raidState.enemy);
  showOrbAttackBar();

  raidState.active = true;
  raidState.attackTimers = {};
  raidState.orbTimer = 0;
  addLog('Raiders have attacked!', 'info');
  showRaidAlert('Raiders incoming!');
  document.dispatchEvent(
    new CustomEvent('raid-start', { detail: { enemy: raidState.enemy, useCard: false } })
  );
  if (typeof updateSectDisplay === 'function') updateSectDisplay();
}

export function endRaid(victory = false) {
  if (!raidState.active) return;
  const enemy = raidState.enemy;
  raidState.active = false;
  setCurrentEnemy(null);
  raidState.enemy = null;
  raidState.attackTimers = {};
  raidState.orbTimer = 0;
  const xpStart = raidState.xpStart;
  raidState.xpStart = {};
  clearBlobs();
  hideOrbAttackBar();
  addLog('The raid has ended.', 'info');
  updateDealerLifeDisplay(null);
  if (victory && enemy) {
    const fighters = Object.keys(xpStart).map(id => {
      const start = xpStart[id];
      const xp =
        sectState.discipleSkills[id]?.Combat || 0;
      const diff = xp - start.xp;
      const prog = getTaskSkillProgress(xp);
      return {
        name: start.name,
        xp: diff,
        level: prog.level,
        progress: prog.progress,
        leveled: prog.level > start.level
      };
    });
    sectState.undeadNectar = (sectState.undeadNectar || 0) + 1;
    showRaidSummaryOverlay({
      damageDealt: raidState.damageDealt,
      damageReceived: raidState.damageReceived,
      rewards: { undeadNectar: 1 },
      fighters
    });
  } else if (!victory) {
    const lost = {
      fruits: Math.floor(sectState.fruits / 2),
      softwood: Math.floor(sectState.softwood / 2)
    };
    sectState.fruits -= lost.fruits;
    sectState.softwood -= lost.softwood;
    showRaidSummaryOverlay({
      victory: false,
      damageDealt: raidState.damageDealt,
      damageReceived: raidState.damageReceived,
      lost
    });
  }
  document.dispatchEvent(new CustomEvent('raid-end', { detail: { victory } }));
  if (typeof updateSectDisplay === 'function') updateSectDisplay();
}

export function tickRaid(delta) {
  if (!raidState.active || !raidState.enemy) return;
  raidState.enemy.tick(delta);
  if (sectSystem.orbs.water.current <= 0) {
    endRaid(false);
    return;
  }
  if (raidState.enemy.isDefeated()) endRaid(true);
}
