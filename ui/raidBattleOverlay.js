import { createOverlay } from './overlay.js';
import { createHorizontalRaid } from '../game/horizontalRaid.js';

export function openRaidBattleOverlay({ config, onSuccess = () => {}, onFailure = () => {}, onDamage = () => {} } = {}) {
  const overlay = createOverlay({ className: 'raid-overlay', boxClass: 'parchment-box', closable: false });
  overlay.box.classList.add('parchment-box');
  const area = document.createElement('div');
  area.className = 'raid-battle-area';
  overlay.append(area);

  const raid = createHorizontalRaid({
    ...config,
    container: area,
    onSuccess: () => {
      overlay.close();
      onSuccess();
    },
    onFailure: () => {
      overlay.close();
      onFailure();
    },
    onDamage
  });

  raid.start();
  return { overlay, raid };
}
