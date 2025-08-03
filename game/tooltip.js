let tooltipEl;

export function initTooltip() {
  tooltipEl = document.getElementById('tooltip');
  if (typeof document !== 'undefined') {
    document.addEventListener('touchstart', hideTooltip);
  }
}

export function showTooltip(text, x = 0, y = 0) {
  if (!tooltipEl) {
    tooltipEl = document.getElementById('tooltip');
    if (!tooltipEl) return;
  }
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  const padding = 8;
  let left = x;
  let top = y;
  const width = tooltipEl.offsetWidth;
  const height = tooltipEl.offsetHeight;
  const { innerWidth, innerHeight } = window;
  if (left + width > innerWidth - padding) left = innerWidth - width - padding;
  if (top + height > innerHeight - padding) top = innerHeight - height - padding;
  if (left < padding) left = padding;
  if (top < padding) top = padding;
  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top = `${top}px`;
}

export function hideTooltip() {
  if (!tooltipEl) {
    tooltipEl = document.getElementById('tooltip');
    if (!tooltipEl) return;
  }
  tooltipEl.style.display = 'none';
}

if (typeof window !== 'undefined') {
  window.showTooltip = showTooltip;
  window.hideTooltip = hideTooltip;
}
