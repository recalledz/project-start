import { TASK_ICONS } from './constants.js';

function scheduleNext(el) {
  el.dataset.nextCroak = Date.now() + 10000 + Math.random() * 10000;
}

export function initDiscipleVisual(d, el) {
  scheduleNext(el);
  updateItem(el, 'Idle');
}

export function updateDiscipleVisual(d, el, task) {
  updateItem(el, task);
  const next = parseFloat(el.dataset.nextCroak || '0');
  if (Date.now() >= next) {
    showCroak(el);
    scheduleNext(el);
  }
}

function updateItem(el, task) {
  const icon = TASK_ICONS[task];
  if (icon) {
    el.dataset.item = icon;
  } else {
    el.removeAttribute('data-item');
  }
}

function showCroak(el) {
  const bubble = document.createElement('div');
  bubble.className = 'croak-bubble';
  bubble.textContent = 'ribbit!';
  el.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1200);
}
