// Deck management module
// Stores mastery progress and deck configurations

export const deckMastery = {};

import { formatNumber } from './utils/numberFormat.js';
import { cardUpgradeDefinitions } from './cardUpgrades.js';

// Required levels to reach each mastery tier
export const masteryRequirements = [
  // first tier is intentionally low for testing purposes
  10,
  100000,
  1000000,
  10000000,
  100000000
];

export const deckConfigs = {
  basic: {
    id: 'basic',
    name: 'Basic Deck',
    description: 'Starter deck',
    cards: [],
    deckSize: 52,
    maxJokers: 2,
    hpMultiplier: 1,
    damageMultiplier: 1,
    upgrades: [
      'hpPerKill',
      'damageMultiplier',
      'hpMultiplier',
      'spadeDamage15',
      'cashOutNoRedraw'
    ]
  }
};

export let selectedDeck = 'basic';

export function addDeckMasteryProgress(deckId, amount = 1) {
  deckMastery[deckId] = (deckMastery[deckId] || 0) + amount;
}

export function getDeckMasteryInfo(deckId) {
  const progress = deckMastery[deckId] || 0;
  let level = 0;
  let prev = 0;
  let req = masteryRequirements[0];
  while (level < masteryRequirements.length && progress >= req) {
    level++;
    prev = req;
    req = masteryRequirements[level] || req;
  }
  const pct = req > prev ? (progress - prev) / (req - prev) : 1;
  return { level, progress, pct, req };
}

export function renderDeckList(container) {
  if (!container) return;
  container.innerHTML = '';
  Object.entries(deckConfigs).forEach(([id, cfg]) => {
    const row = document.createElement('div');
    row.classList.add('deck-row', 'casino-section');
    row.dataset.deckId = id;

    const name = document.createElement('span');
    const { level, pct, req } = getDeckMasteryInfo(id);
    name.classList.add('deck-level');
    name.textContent = `${cfg.name} Lv ${level}`;

    const art = document.createElement('img');
    art.src = 'img/basic deck.png';
    art.classList.add('deck-art');

    const bar = document.createElement('div');
    bar.classList.add('deckMasteryBar');
    const fill = document.createElement('div');
    fill.classList.add('deckMasteryFill');
    fill.style.width = `${Math.min(1, pct) * 100}%`;
    bar.appendChild(fill);

    const reqSpan = document.createElement('span');
    reqSpan.classList.add('deck-req');
    reqSpan.textContent = formatNumber(req);

    const bottom = document.createElement('div');
    bottom.classList.add('deck-bottom-row');
    bottom.append(art, bar, reqSpan);

    const caps = document.createElement('div');
    caps.classList.add('deck-capacities');
    caps.innerHTML = `
      <span>Size: ${cfg.deckSize || cfg.cards.length}</span>
      <span>Jokers: ${cfg.maxJokers}</span>
      <span>HP ×${cfg.hpMultiplier}</span>
      <span>DMG ×${cfg.damageMultiplier}</span>
    `;

    const upContainer = document.createElement('div');
    const upTitle = document.createElement('div');
    upTitle.textContent = 'Upgrades';
    const upList = document.createElement('ul');
    upList.classList.add('deck-upgrade-list');
    (cfg.upgrades || []).forEach(u => {
      const li = document.createElement('li');
      li.textContent = cardUpgradeDefinitions[u]?.name || u;
      upList.appendChild(li);
    });
    upContainer.append(upTitle, upList);

    row.append(name, bottom, caps, upContainer);
    row.addEventListener('click', () => {
      selectedDeck = id;
      const event = new CustomEvent('deck-selected', { detail: { id } });
      container.dispatchEvent(event);
    });
    container.appendChild(row);
  });
}

export function renderDeckCards(container) {
  if (!container) return;
  container.innerHTML = '';
  const cards = deckConfigs[selectedDeck]?.cards || [];
  cards.forEach(c => {
    const div = document.createElement('div');
    div.textContent = c.name || String(c);
    container.appendChild(div);
  });
}

export function renderJokerView(container) {
  if (!container) return;
  container.innerHTML = '<em>No jokers available</em>';
}

export function renderJobsList(container) {
  if (!container) return;
  container.innerHTML = '<em>No jobs available</em>';
}

export function showJobs(container) {
  if (!container) return;
  container.style.display = '';
}
