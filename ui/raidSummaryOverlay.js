import { createOverlay } from './overlay.js';

export function showRaidSummaryOverlay({ damageDealt = 0, damageReceived = 0, rewards = {} } = {}) {
  const overlay = createOverlay({ className: 'raid-summary-overlay', boxClass: 'parchment-box' });
  overlay.box.classList.add('parchment-box');
  const { box, close } = overlay;

  const title = document.createElement('h2');
  title.textContent = 'Raid Defeated';
  box.appendChild(title);

  const stats = document.createElement('div');
  stats.className = 'raid-summary-stats';
  stats.innerHTML = `
    <p>Damage Dealt: ${Math.round(damageDealt)}</p>
    <p>Damage Received: ${Math.round(damageReceived)}</p>
  `;
  box.appendChild(stats);

  const rewardLines = [];
  if (rewards.undeadNectar) rewardLines.push(`Undead Nectar +${rewards.undeadNectar}`);
  if (rewardLines.length > 0) {
    const rewardSection = document.createElement('div');
    rewardSection.className = 'raid-summary-rewards';
    rewardSection.innerHTML = '<p>Rewards:</p><ul>' + rewardLines.map(r => `<li>${r}</li>`).join('') + '</ul>';
    box.appendChild(rewardSection);
  }

  overlay.appendButton('Close', close);
  return overlay;
}
