import { Boss } from './boss.js';
import { unlockConstruct, skipToNextNight } from './game/sect.js';
import {
  spawnBossEvent,
  spawnDealerEvent,
  nextStage,
  respawnDealerStage,
  renderStageInfo,
  saveGame,
  loadGame,
  startNewGame
} from './script.js';
import { cDealerDamage } from './game/combat.js';
import { addDiscoveredLocation } from './game/ui.js';
import {
  stageData,
  timeScale,
  FAST_MODE_SCALE,
  systems,
  currentEnemy,
  setTimeScale
} from './game/state.js';
import { activeDisciples } from './game/disciples.js';
import { toggleZones } from './game/zones.js';
import { sectState } from './game/state.js';

export const devTools = {
  spawnBoss: () => spawnBossEvent(),
  spawnDealer: () => spawnDealerEvent(),
  cDealerDamage,
  killEnemy: () => {
    if (!currentEnemy) return;
    currentEnemy.takeDamage(currentEnemy.maxHp);
    if (currentEnemy instanceof Boss) {
      currentEnemy.onDefeat?.();
    }
  },
  killBoss: () => {
    if (currentEnemy instanceof Boss) {
      currentEnemy.takeDamage(currentEnemy.maxHp);
      currentEnemy.onDefeat?.();
    }
  },
  logEnemy: () => console.log(currentEnemy),
  advanceStage: () => nextStage(),
  nextNight: () => skipToNextNight(),
  setStageWorld: () => {
    const stage = parseInt(document.getElementById('debugStage').value);
    const world = parseInt(document.getElementById('debugWorld').value);
    if (!isNaN(stage)) stageData.stage = stage;
    if (!isNaN(world)) stageData.world = world;
    renderStageInfo();
    respawnDealerStage();
  },
  setDamageMult: () => {
    const mult = parseFloat(
      document.getElementById('debugDamageMult').value
    );
    if (isNaN(mult)) return;
    activeDisciples.forEach(d => {
      d.damage = Math.round(d.damage * mult);
    });
  },
  toggleFastMode: () => {
    setTimeScale(timeScale === 1 ? FAST_MODE_SCALE : 1);
  },
  unlockExploration: () => {
    systems.explorationUnlocked = true;
    addDiscoveredLocation('Esoteric Dungeon');
    unlockConstruct('Sonic Boom');
  },
  giveCash: () => {
    const amount = parseFloat(document.getElementById('debugCash').value);
    if (isNaN(amount)) return;
    sectState.fruits += amount;
  },
  toggleZones,
  save: saveGame,
  load: loadGame,
  newGame: startNewGame
};

