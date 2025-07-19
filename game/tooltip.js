let tooltipEl;

export function initTooltip() {
  tooltipEl = document.getElementById('tooltip');
}

export function showTooltip(text, x = 0, y = 0) {
  if (!tooltipEl) {
    tooltipEl = document.getElementById('tooltip');
    if (!tooltipEl) return;
  }
  tooltipEl.textContent = text;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = `${x}px`;
  tooltipEl.style.top = `${y}px`;
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
