import { renderDealerLifeBar, renderDealerLifeBarFill, renderDiscipleCard } from './rendering.js';
import { activeDisciples } from './disciples.js';
import { formatNumber } from '../utils/numberFormat.js';
let mainTab;
let starChartTab;
let playerStatsTab;
let worldsTab;
let metamorphosisTab;
let lexiconTab;
let sectTab;
let explorationTab;
let locationTab;
let logTab;
let locationTabButton;
let explorationTabButton;

export function init(elements = {}) {
  mainTab = elements.mainTab;
  starChartTab = elements.starChartTab;
  playerStatsTab = elements.playerStatsTab;
  worldsTab = elements.worldsTab;
  metamorphosisTab = elements.metamorphosisTab;
  lexiconTab = elements.lexiconTab;
  sectTab = elements.sectTab;
  explorationTab = elements.explorationTab;
  locationTab = elements.locationTab;
  logTab = elements.logTab;
  locationTabButton = elements.locationTabButton;
  explorationTabButton = elements.explorationTabButton;
}

export const handContainer = document.getElementsByClassName('handContainer')[0];
export const dealerLifeDisplay =
  document.getElementsByClassName('dealerLifeDisplay')[0] || null;

export function showPlayerAttackBar() {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'block';
}

export function hidePlayerAttackBar(playerAttackFill) {
  const bar = document.getElementById('playerAttackBar');
  if (bar) bar.style.display = 'none';
  if (playerAttackFill) playerAttackFill.style.width = '0%';
}

export function updateDealerLifeBar(enemy) {
  const barFill = document.getElementById('dealerBarFill');
  if (!barFill || !enemy) return;
  const hpRatio = enemy.currentHp / enemy.maxHp;
  barFill.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
}

export function removeDealerLifeBar() {
  const bar = document.querySelector('.dealerLifeContainer');
  if (bar) bar.remove();
  const atk = document.querySelector('.enemyAttackBar');
  if (atk) atk.remove();
  if (dealerLifeDisplay) dealerLifeDisplay.textContent = '';
}

export function updateDealerLifeDisplay(currentEnemy) {
  if (!currentEnemy) {
    removeDealerLifeBar();
    return;
  }
  if (!dealerLifeDisplay) return;
  dealerLifeDisplay.textContent = `Life: ${formatNumber(currentEnemy.currentHp)}/${formatNumber(currentEnemy.maxHp)}`;
  renderDealerLifeBar(dealerLifeDisplay, currentEnemy);
  renderDealerLifeBarFill(currentEnemy);
}

export function updateRaidLifeBar(enemy) {
  if (!enemy || !enemy.raidLifeFill) return;
  const ratio = Math.max(0, Math.min(1, enemy.currentHp / enemy.maxHp));
  enemy.raidLifeFill.style.width = `${ratio * 100}%`;
}

export function updateDiscipleStatsDisplay(d) {
  if (!d.statsElement) return;
  d.statsElement.innerHTML = '';
}

export function renderCombatDisciples() {
  if (!handContainer) return;
  handContainer.innerHTML = '';
  activeDisciples.forEach(d => {
    renderDiscipleCard(d, handContainer);
    const bar = document.createElement('div');
    bar.className = 'disciple-attack-bar';
    const fill = document.createElement('div');
    fill.className = 'disciple-attack-fill';
    bar.appendChild(fill);
    d.wrapperElement.insertBefore(bar, d.xpBar);
    d.attackFill = fill;
    updateDiscipleStatsDisplay(d);
  });
}

export function makeBar(value, max, color) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'bar-fill';
  fill.style.background = color;
  fill.style.width = `${Math.min(100, (value / max) * 100)}%`;
  bar.appendChild(fill);
  return bar;
}

export function formatTime(seconds) {
  if (!isFinite(seconds)) return '∞';
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function createLabeledBar(icon, value, max, color) {
  const row = document.createElement('div');
  row.className = 'disciple-card-row';
  const ic = document.createElement('span');
  ic.className = 'disciple-bar-icon';
  ic.textContent = icon;
  const text = document.createElement('span');
  text.className = 'disciple-bar-text';
  text.textContent = `${Math.round(value)}/${Math.round(max)}`;
  const bar = makeBar(value, max, color);
  bar.classList.add('disciple-card-bar');
  row.appendChild(ic);
  row.appendChild(text);
  row.appendChild(bar);
  return row;
}

export function setActiveTabButton(btn) {
  document.querySelectorAll('.tabsContainer button').forEach(b => {
    b.classList.toggle('active', b === btn);
  });
}

export function hideTab() {
  if (mainTab) mainTab.style.display = 'none';
  if (starChartTab) starChartTab.style.display = 'none';
  if (playerStatsTab) playerStatsTab.style.display = 'none';
  if (worldsTab) worldsTab.style.display = 'none';
  if (metamorphosisTab) metamorphosisTab.style.display = 'none';
  if (lexiconTab) lexiconTab.style.display = 'none';
  if (sectTab) sectTab.style.display = 'none';
  if (explorationTab) explorationTab.style.display = 'none';
  if (locationTab) locationTab.style.display = 'none';
  if (logTab) logTab.style.display = 'none';
}

export function showTab(tab) {
  hideTab();
  if (tab) tab.style.display = '';
}

export function addDiscoveredLocation(name, locationListContainer, LOCATION_DEFS) {
  if (!LOCATION_DEFS) return;
  const discoveredLocations = addDiscoveredLocation.discoveredLocations || (addDiscoveredLocation.discoveredLocations = []);
  if (discoveredLocations.includes(name)) return;
  discoveredLocations.push(name);
  if (locationListContainer) {
    const row = document.createElement('div');
    row.textContent = name;
    locationListContainer.appendChild(row);
  }
  const map = document.getElementById('colonyMap');
  const def = LOCATION_DEFS.find(l => l.name === name);
  if (map && def) {
    const icon = document.createElement('div');
    icon.className = 'location-icon';
    icon.style.left = def.x;
    icon.style.top = def.y;
    map.appendChild(icon);
  }
  if (locationTabButton && locationTabButton.style.display === 'none') {
    locationTabButton.style.display = '';
  }
  if (
    explorationTabButton &&
    name === 'Esoteric Dungeon' &&
    explorationTabButton.style.display === 'none'
  ) {
    explorationTabButton.style.display = '';
  }
}
