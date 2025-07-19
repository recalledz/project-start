import { Boss } from './boss.js';
import { unlockConstruct } from './game/sect.js';
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
  save: saveGame,
  load: loadGame,
  newGame: startNewGame
};

