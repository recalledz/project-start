
export function drawCard(state) {
  const {
    deck,
    drawnCards,
    handContainer,
    renderCard,
    updateDeckDisplay,
    stats,
    pDeck,
    renderDeckTop,
    updatePileCounts
  } = state;

  if (deck.length === 0) return null;

  const card = deck.shift();

  if (card.upgradeId) {
    return null;
  }

  drawnCards.push(card);
  renderCard(card, handContainer);
  updateDeckDisplay();
  if (renderDeckTop) renderDeckTop();
  if (updatePileCounts) updatePileCounts();
  return card;
}

export function redrawHand(state) {
  const {
    deck,
    drawnCards,
    handContainer,
    shuffleArray,
    stats,
    drawCard,
    updateDrawButton,
    updateDeckDisplay,
    updatePlayerStats,
    pDeck,
    renderDeckTop,
    updatePileCounts
  } = state;

  // clear existing hand
  drawnCards.length = 0;
  handContainer.innerHTML = '';

  shuffleArray(deck);
  if (stats.healOnRedraw > 0) {
    pDeck.forEach(c => {
      c.currentHp = Math.min(c.maxHp, c.currentHp + stats.healOnRedraw);
    });
  }
  while (drawnCards.length < stats.cardSlots && deck.length > 0) {
    drawCard(state);
  }
  if (renderDeckTop) renderDeckTop();
  if (updatePileCounts) updatePileCounts();
  updateDrawButton();
  updateDeckDisplay();
  updatePlayerStats(stats);
}
