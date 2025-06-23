const { expect } = require('chai');

describe('📊 XP progression', () => {
  it('levels match stage after ~18 kills each stage', async () => {
    const { Card } = await import('../card.js');
    const { calculateKillXp } = await import('../utils/xp.js');

    const card = new Card('Hearts', 7); // average value
    for (let stage = 1; stage <= 5; stage++) {
      for (let i = 0; i < 18; i++) {
        card.gainXp(calculateKillXp(stage, 1));
      }
      expect(card.currentLevel).to.be.at.least(stage);
    }
    expect(card.currentLevel).to.equal(5);
  });
});
