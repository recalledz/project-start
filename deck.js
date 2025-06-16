// Deck management module
// Stores mastery progress and deck configurations

export const deckMastery = {};

export const deckConfigs = {
  basic: {
    id: 'basic',
    name: 'Basic Deck',
    description: 'Starter deck',
    cards: []
  }
};

export let selectedDeck = 'basic';

export function addDeckMasteryProgress(deckId, amount = 1) {
  deckMastery[deckId] = (deckMastery[deckId] || 0) + amount;
}

export function renderDeckList(container) {
  if (!container) return;
  container.innerHTML = '';
  Object.entries(deckConfigs).forEach(([id, cfg]) => {
    const btn = document.createElement('button');
    btn.textContent = `${cfg.name} (${deckMastery[id] || 0})`;
    btn.addEventListener('click', () => {
      selectedDeck = id;
      renderDeckCards(container);
    });
    container.appendChild(btn);
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
