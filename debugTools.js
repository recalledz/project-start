import { Boss } from './boss.js';
import { unlockConstruct } from './sect.js';
import {
  spawnBossEvent,
  spawnDealerEvent,
  nextStage,
  stageData,
  respawnDealerStage,
  renderStageInfo,
  renderPlayerStats,
  stats,
  timeScale,
  FAST_MODE_SCALE,
  systems,
  addDiscoveredLocation,
  saveGame,
  loadGame,
  startNewGame,
  currentEnemy,
  cDealerDamage,
  setTimeScale
} from './script.js';

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
    if (!isNaN(mult)) {
      stats.damageMultiplier = mult;
      renderPlayerStats(stats);
    }
  },
  addManaRegen: () => {
    const amt = parseFloat(document.getElementById('debugManaRegen').value) || 0;
    stats.manaRegen += amt;
    renderPlayerStats(stats);
  },
  toggleFastMode: () => {
    setTimeScale(timeScale === 1 ? FAST_MODE_SCALE : 1);
  },
  unlockExploration: () => {
    systems.explorationUnlocked = true;
    addDiscoveredLocation('Esoteric Dungeon');
    unlockConstruct('Sonic Boom');
  },
  save: saveGame,
  load: loadGame,
  newGame: startNewGame
};

