import { createOverlay } from '../ui/overlay.js';
import { STARTER_PATHS } from './paths.js';

export function showPathOverlay({ onSelect, available = 3 } = {}) {
  const overlay = createOverlay({ className: 'path-overlay' });
  const { box, close } = overlay;
  const title = document.createElement('h2');
  title.textContent = 'Choose a Path';
  box.appendChild(title);
  STARTER_PATHS.slice(0, available).forEach(name => {
    const btn = document.createElement('button');
    btn.textContent = name;
    btn.addEventListener('click', () => {
      if (onSelect) onSelect(name);
      close();
    });
    box.appendChild(btn);
  });
  return overlay;
}
