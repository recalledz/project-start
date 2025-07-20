import { createOverlay } from './overlay.js';

let restartOverlay = null;
let restartTimer = null;

export function drawRestartArt(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // skull
  ctx.fillStyle = '#eee';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2 - 5, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(canvas.width / 2 - 8, canvas.height / 2 + 7, 16, 8);
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(canvas.width / 2 - 5, canvas.height / 2 - 5, 3, 0, Math.PI * 2);
  ctx.arc(canvas.width / 2 + 5, canvas.height / 2 - 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2 - 6, canvas.height / 2 + 4);
  ctx.lineTo(canvas.width / 2 + 6, canvas.height / 2 + 4);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export const SPEAKER_QUOTES = [
  'Sometimes it\u2019s safer to hide in a nightmare... but are we ever truly free from the dream?',
  'Words don\u2019t just describe. They make.',
  'The soul is the only prison you\u2019ve never tried to break.'
];

export function showRestartScreen(onRestart) {
  if (restartOverlay) return;

  restartOverlay = createOverlay({ className: 'restart-overlay', boxClass: 'parchment-box' });
  restartOverlay.box.classList.add('parchment-box');
  const { box } = restartOverlay;

  const canvas = document.createElement('canvas');
  canvas.width = 80;
  canvas.height = 60;
  canvas.classList.add('restart-art');
  box.appendChild(canvas);
  drawRestartArt(canvas);

  const message = document.createElement('div');
  message.classList.add('restart-message');
  const quote = SPEAKER_QUOTES[Math.floor(Math.random() * SPEAKER_QUOTES.length)];
  message.textContent = quote;
  box.appendChild(message);

  const flavor = document.createElement('div');
  flavor.classList.add('restart-flavor');
  flavor.textContent = 'You muster your strength and bring back your party.';
  box.appendChild(flavor);

  const btn = document.createElement('button');
  btn.classList.add('restart-button');
  btn.textContent = 'Return to Sect';
  btn.addEventListener('click', () => {
    if (onRestart) onRestart();
    hideRestartScreen();
  });
  box.appendChild(btn);

  restartTimer = setTimeout(() => {
    if (onRestart) onRestart();
    hideRestartScreen();
  }, 5000);
}

export function hideRestartScreen() {
  if (restartOverlay) {
    restartOverlay.close();
    restartOverlay = null;
  }
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
}
