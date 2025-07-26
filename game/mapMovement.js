import { BASE_MOVE_SPEED } from './constants.js';

export function parseTranslate(transform) {
  const match = /translate\((-?[0-9.]+)px,\s*(-?[0-9.]+)px\)/.exec(transform || '');
  return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : { x: 0, y: 0 };
}

export function moveElement(el, x, y, speed = BASE_MOVE_SPEED) {
  const { x: px, y: py } = parseTranslate(el.style.transform);
  const dx = x - px;
  const dy = y - py;
  const dist = Math.hypot(dx, dy);
  const duration = dist / speed;
  el.style.transitionDuration = `${duration}s`;
  el.style.transform = `translate(${x}px, ${y}px)`;
}
