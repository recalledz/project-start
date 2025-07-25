import { createOverlay } from './overlay.js';

export function showRaidSummaryOverlay({
  damageDealt = 0,
  damageReceived = 0,
  rewards = {},
  fighters = []
} = {}) {
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

  if (fighters.length > 0) {
    const fighterSection = document.createElement('div');
    fighterSection.className = 'raid-summary-fighters';
    const list = document.createElement('ul');
    fighters.forEach(f => {
      const li = document.createElement('li');
      li.textContent = `${f.name}: +${Math.round(f.xp)} XP` +
        (f.leveled ? ' (Level Up!)' : '');
      const bar = document.createElement('div');
      bar.className = 'disciple-progress';
      const fill = document.createElement('div');
      fill.className = 'disciple-progress-fill';
      fill.style.width = `${Math.floor(f.progress * 100)}%`;
      const label = document.createElement('div');
      label.className = 'disciple-progress-label';
      label.textContent = `LV ${f.level}`;
      bar.append(fill, label);
      li.appendChild(bar);
      list.appendChild(li);
    });
    fighterSection.innerHTML = '<p>Participants:</p>';
    fighterSection.appendChild(list);
    box.appendChild(fighterSection);
  }

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
