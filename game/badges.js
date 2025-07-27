import { makeBar } from './ui.js';
import { sectState } from './state.js';
import { getMaxWater } from './metamorphosisBonuses.js';
import { DISCIPLE_MAX_HEALTH } from './constants.js';

export function createDiscipleBadge(d) {
  const badge = document.createElement('div');
  badge.className = 'disciple-badge';
  badge.dataset.discipleId = d.id;

  const content = document.createElement('div');
  content.className = 'disciple-content parchment-box';

  const name = document.createElement('div');
  name.className = 'disciple-name';
  name.textContent = d.name || `Disciple ${d.id}`;
  content.appendChild(name);

  const mood = document.createElement('span');
  mood.className = 'mood-icon';
  mood.textContent = d.mood || '🙂';
  content.appendChild(mood);

  const lifeBar = makeBar(d.health, DISCIPLE_MAX_HEALTH, '#a33');
  lifeBar.classList.add('life-bar');
  content.appendChild(lifeBar);

  const waterLvl = sectState.discipleSkills[d.id]?.WaterSense || 0;
  const waterBar = makeBar(d.water, getMaxWater(d, waterLvl), '#7fd9ff');
  waterBar.classList.add('water-bar');
  content.appendChild(waterBar);

  const wrapper = document.createElement('div');
  wrapper.dataset.discipleId = d.id;
  wrapper.className = 'disciple-progress';
  const fill = document.createElement('div');
  fill.className = 'disciple-progress-fill';
  wrapper.appendChild(fill);
  const label = document.createElement('div');
  label.className = 'disciple-progress-label';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  label.textContent = curTask;
  wrapper.appendChild(label);
  content.appendChild(wrapper);

  badge.appendChild(content);

  
  return badge;
}
