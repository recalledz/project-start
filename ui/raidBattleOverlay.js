import { createOverlay } from './overlay.js';
import { createHorizontalRaid } from '../game/horizontalRaid.js';

// Resolve parallax layer image URLs relative to this module
const reedsUrl = new URL('../img/reeds-back.png', import.meta.url).href;
const waterUrl = new URL('../img/water-mid.png', import.meta.url).href;
const lilyUrl = new URL('../img/lily-pads.png', import.meta.url).href;

export function openRaidBattleOverlay({ config, onSuccess = () => {}, onFailure = () => {}, onDamage = () => {} } = {}) {
  const overlay = createOverlay({ className: 'raid-overlay', boxClass: 'parchment-box', closable: false });
  overlay.box.classList.add('parchment-box');
  const area = document.createElement('div');
  area.className = 'raid-battle-area';
  area.id = 'battle-container';
  const mid = document.createElement('div');
  mid.className = 'mid';
  area.appendChild(mid);

  // set background image variables so bundlers include assets
  if (area.style?.setProperty) {
    area.style.setProperty('--reeds-bg', `url(${reedsUrl})`);
    area.style.setProperty('--water-bg', `url(${waterUrl})`);
    area.style.setProperty('--lily-bg', `url(${lilyUrl})`);
  }

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
