import { createOverlay } from './overlay.js';

export function showLoadErrorOverlay(error, onReset) {
  const overlay = createOverlay({ className: 'load-error-overlay' });
  const { box } = overlay;

  const msg = document.createElement('div');
  msg.className = 'load-error-message';
  msg.textContent = 'Failed to load saved data. It may be corrupted.';
  box.appendChild(msg);

  if (error && error.message) {
    const detail = document.createElement('pre');
    detail.className = 'load-error-detail';
    detail.textContent = error.message;
    box.appendChild(detail);
  }

  const btn = document.createElement('button');
  btn.className = 'reset-save-button';
  btn.textContent = 'Reset Save';
  btn.addEventListener('click', () => {
    if (onReset) onReset();
    overlay.close();
  });
  box.appendChild(btn);

  return overlay;
}
