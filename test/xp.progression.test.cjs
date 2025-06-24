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

  it('world two continues the one-level pace', async () => {
    const { Card } = await import('../card.js');
    const { calculateKillXp, xpRequirement } = await import('../utils/xp.js');

    const card = new Card('Spades', 7);
    card.currentLevel = 10;
    card.XpCurrent = 0;
    card.XpReq = xpRequirement(card.value, card.currentLevel);

    for (let stage = 1; stage <= 5; stage++) {
      for (let i = 0; i < 18; i++) {
        card.gainXp(calculateKillXp(stage, 2));
      }
      expect(card.currentLevel).to.be.at.least(10 + stage);
    }
    expect(card.currentLevel).to.equal(15);
  });

  it('higher worlds do not drastically slow progression', async () => {
    const { Card } = await import('../card.js');
    const { calculateKillXp, xpRequirement } = await import('../utils/xp.js');

    const card = new Card('Clubs', 7);
    card.currentLevel = 20;
    card.XpCurrent = 0;
    card.XpReq = xpRequirement(card.value, card.currentLevel);

    for (let stage = 1; stage <= 5; stage++) {
      for (let i = 0; i < 18; i++) {
        card.gainXp(calculateKillXp(stage, 3));
      }
      // First stage may fall short of a level due to epsilon scaling
      const expected = 20 + Math.max(0, stage - 1);
      expect(card.currentLevel).to.be.at.least(expected);
    }
    expect(card.currentLevel).to.equal(24);
  });
});
