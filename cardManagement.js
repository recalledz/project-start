
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
    pDeck
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
    return null;
  }

  drawnCards.push(card);
  renderCard(card, handContainer);
  updateDeckDisplay();
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
    pDeck
  } = state;

  deck.push(...drawnCards);
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
  updateDrawButton();
  updateDeckDisplay();
  updatePlayerStats(stats);
}
