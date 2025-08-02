import { sectSystem } from './sect.js';
import { sectState } from './state.js';
import {
  ensureDiscipleSkills,
  getTaskSkillProgress,
  addSkillXp
} from '../utils/skills.js';
import { showRaidAlert } from './alerts.js';
import { showRaidSummaryOverlay } from '../ui/raidSummaryOverlay.js';
import { openRaidBattleOverlay } from '../ui/raidBattleOverlay.js';
import { RAID_NECTAR_REWARD, RAID_COMBAT_XP_REWARD } from './constants.js';

export const raidState = {
  active: false,
  raid: null,
  overlay: null,
  damageDealt: 0,
  damageReceived: 0,
  xpStart: {},
  prevTasks: {}
};

function buildDefaultConfig() {
  return {
    orb: sectSystem.orbs.water,
    disciples: sectSystem.disciples.filter(d => !d.incapacitated),
    waves: Array.from({ length: 5 }, () => ({
      count: 1,
      rate: 1000,
      stats: { hp: 10, damage: 1, attackSpeed: 5000, moveSpeed: 0.004 }
    }))
  };
}

function finalize(victory) {
  const xpStart = raidState.xpStart;
  raidState.xpStart = {};

  if (victory) {
    Object.keys(xpStart).forEach(id => {
      const disc = sectSystem.disciples.find(d => d.id === Number(id));
      if (disc) addSkillXp(disc, 'Combat', RAID_COMBAT_XP_REWARD);
    });
    sectState.undeadNectar += RAID_NECTAR_REWARD;
    if (sectSystem.resources.undeadNectar) {
      const res = sectSystem.resources.undeadNectar;
      res.current = Math.min(res.max, res.current + RAID_NECTAR_REWARD);
    }
  }

  Object.keys(raidState.prevTasks).forEach(id => {
    sectState.discipleTasks[id] = raidState.prevTasks[id] || 'Idle';
  });
  raidState.prevTasks = {};
  raidState.active = false;
  raidState.raid = null;
  raidState.overlay = null;

  const fighters = Object.keys(xpStart).map(id => {
    const start = xpStart[id];
    const xp = sectState.discipleSkills[id]?.Combat || 0;
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

  const rewards = victory ? { undeadNectar: RAID_NECTAR_REWARD } : {};

  showRaidSummaryOverlay({
    victory,
    damageDealt: raidState.damageDealt,
    damageReceived: raidState.damageReceived,
    fighters,
    rewards
  });
}

export function startRaid(config = buildDefaultConfig()) {
  if (raidState.active) return;
  raidState.damageDealt = 0;
  raidState.damageReceived = 0;
  raidState.prevTasks = {};
  sectSystem.disciples.forEach(d => {
    raidState.prevTasks[d.id] = sectState.discipleTasks[d.id];
    if (!d.incapacitated) {
      sectState.discipleTasks[d.id] = 'Idle';
    }
  });
  sectSystem.disciples.forEach(d => {
    if (!d.incapacitated) {
      ensureDiscipleSkills(d.id);
      raidState.xpStart[d.id] = {
        xp: sectState.discipleSkills[d.id].Combat || 0,
        level: getTaskSkillProgress(sectState.discipleSkills[d.id].Combat || 0).level,
        name: d.name
      };
    }
  });

  const { overlay, raid } = openRaidBattleOverlay({
    config: {
      orb: config.orb,
      disciples: config.disciples,
      waves: config.waves
    },
    onSuccess: () => endRaid(true),
    onFailure: () => endRaid(false),
    onDamage: ({ amount, source }) => {
      if (source === 'disciple') raidState.damageDealt += amount;
      else raidState.damageReceived += amount;
    }
  });
  raidState.raid = raid;
  raidState.overlay = overlay;
  raidState.active = true;
  showRaidAlert('Raiders incoming!');
  document.dispatchEvent(
    new CustomEvent('raid-start', { detail: { enemy: null, useCard: false } })
  );
}

export function tickRaid(delta) {
  if (!raidState.active || !raidState.raid) return;
  raidState.raid.tick(delta);
}

export function endRaid(victory = false) {
  if (!raidState.active) return;
  raidState.raid.end(victory);
  raidState.overlay?.close();
  finalize(victory);
  document.dispatchEvent(new CustomEvent('raid-end', { detail: { victory } }));
}
