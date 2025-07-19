import { makeBar } from './ui.js';
import { sectState } from './state.js';
import { DISCIPLE_MAX_HEALTH } from './constants.js';

export function createDiscipleBadge(d) {
  const badge = document.createElement('div');
  badge.className = 'disciple-badge';

  const name = document.createElement('div');
  name.className = 'disciple-name';
  name.textContent = d.name || `Disciple ${d.id}`;
  badge.appendChild(name);

  const mood = document.createElement('span');
  mood.className = 'mood-icon';
  mood.textContent = d.mood || '🙂';
  badge.appendChild(mood);

  const lifeBar = makeBar(d.health, DISCIPLE_MAX_HEALTH, '#a33');
  lifeBar.classList.add('life-bar');
  badge.appendChild(lifeBar);

  const wrapper = document.createElement('div');
  wrapper.id = `disciple-task-${d.id}`;
  wrapper.className = 'disciple-progress';
  const fill = document.createElement('div');
  fill.className = 'disciple-progress-fill';
  wrapper.appendChild(fill);
  const label = document.createElement('div');
  label.className = 'disciple-progress-label';
  const curTask = d.incapacitated ? 'Resting' : sectState.discipleTasks[d.id] || 'Idle';
  label.textContent = curTask;
  wrapper.appendChild(label);
  badge.appendChild(wrapper);

  return badge;
}
