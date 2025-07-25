export let raidAlertEl = null;

export function showRaidAlert(text = 'Raiders incoming!') {
  if (raidAlertEl) return;
  raidAlertEl = document.createElement('div');
  raidAlertEl.className = 'raid-alert';
  raidAlertEl.textContent = text;
  document.body.appendChild(raidAlertEl);
  setTimeout(() => {
    raidAlertEl.remove();
    raidAlertEl = null;
  }, 3000);
}
