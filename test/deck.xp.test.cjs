const { expect } = require('chai');

describe('📈 Deck XP distribution', () => {
  it('awards xp to hand and deck cards with efficiency', async () => {
    const { Card } = await import('../card.js');

    const xpEfficiency = 0.5;
    const xpAmount = 0.4;
    const c1 = new Card('Hearts', 2);
    const c2 = new Card('Spades', 3);
    const drawnCards = [c1];
    const pDeck = [c1, c2];

    pDeck.forEach(card => {
      const amt = drawnCards.includes(card) ? xpAmount : xpAmount * xpEfficiency;
      card.gainXp(amt);
    });

    expect(c1.XpCurrent).to.equal(xpAmount);
    expect(c2.XpCurrent).to.equal(xpAmount * xpEfficiency);
  });
});
