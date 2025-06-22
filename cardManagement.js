
export function drawCard(state) {
  const {
    deck,
    drawnCards,
    handContainer,
    renderCard,
    updateDeckDisplay,
    stats,
    showUpgradePopup,
    applyCardUpgrade,
    renderCardUpgrades,
    purchaseCardUpgrade,
    cash,
    renderPurchasedUpgrades,
    updateActiveEffects,
    updateAllCardHp,
    updateHandDisplay,
    pDeck,
    renderDeckTop,
    updatePileCounts
  } = state;

  if (deck.length === 0) return null;

  const card = deck.shift();

  if (card.upgradeId) {
    showUpgradePopup(card.upgradeId);
    applyCardUpgrade(card.upgradeId, { stats, pDeck, updateAllCardHp });
    renderCardUpgrades(document.querySelector('.card-upgrade-list'), {
      stats,
      cash,
      onPurchase: purchaseCardUpgrade
    });
    renderPurchasedUpgrades();
    updateActiveEffects();
    updateAllCardHp();
    if (typeof updateHandDisplay === 'function') updateHandDisplay();
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
    discardPile,
    discardContainer,
    cardBackImages,
    renderDiscardCard,
    renderDeckTop,
    updatePileCounts
  } = state;

  // move current hand to discard pile
  drawnCards.forEach(c => {
    discardPile.push(c);
    if (renderDiscardCard)
      renderDiscardCard(c, discardContainer, cardBackImages);
  });
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
