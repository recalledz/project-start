import { createOverlay } from './overlay.js';
import { createVerticalRaid } from '../game/verticalRaid.js';
import { castWordOfHaste, toggleReverberation, castWaterBurst } from '../game/orbSpells.js';
import { sectState } from '../game/state.js';
import { sectSystem } from '../game/sect.js';

export function openRaidBattleOverlay({ config, onSuccess = () => {}, onFailure = () => {}, onDamage = () => {} } = {}) {
  const overlay = createOverlay({ className: 'raid-overlay', boxClass: 'parchment-box', closable: false });
  overlay.box.classList.add('parchment-box');
  const area = document.createElement('div');
  area.className = 'raid-battle-area';
  area.id = 'battle-container';
  overlay.append(area);
  const spells = document.createElement('div');
  spells.className = 'raid-spell-bar';
  overlay.append(spells);

  const raid = createVerticalRaid({
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

  function renderSpells() {
    spells.innerHTML = '';
    if (sectState.completedResearch.includes('wordOfHaste')) {
      const btn = document.createElement('button');
      btn.textContent = 'Word of Haste';
      btn.disabled = sectSystem.wordOfHasteCd > 0 || sectSystem.orbs.water.current < 15;
      btn.addEventListener('click', () => {
        castWordOfHaste();
        renderSpells();
      });
      spells.appendChild(btn);
    }
    if (sectState.completedResearch.includes('waterBurst')) {
      const btn = document.createElement('button');
      btn.textContent = 'Water Burst';
      btn.disabled = sectSystem.orbs.water.current < 30;
      btn.addEventListener('click', () => {
        castWaterBurst();
        renderSpells();
      });
      spells.appendChild(btn);
    }
    if (sectState.completedResearch.includes('orbReverb')) {
      const btn = document.createElement('button');
      btn.textContent = sectSystem.orbReverbActive ? 'Stop Reverberation' : 'Start Reverberation';
      btn.disabled = !sectSystem.orbReverbActive && sectSystem.orbs.water.current < 1;
      btn.addEventListener('click', () => {
        toggleReverberation();
        renderSpells();
      });
      spells.appendChild(btn);
    }
  }

  renderSpells();
  const interval = setInterval(renderSpells, 1000);
  overlay.onClose(() => clearInterval(interval));

  raid.start();
  return { overlay, raid };
}
