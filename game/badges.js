export function createDiscipleBadge(d) {
  const badge = document.createElement('div');
  badge.className = 'disciple-badge';

  const name = document.createElement('span');
  name.className = 'badge-name';
  name.textContent = d.name || `Disciple ${d.id}`;
  badge.appendChild(name);

  const mood = document.createElement('span');
  mood.className = 'mood-icon';
  mood.textContent = d.mood || '🙂';
  badge.appendChild(mood);

  return badge;
}
