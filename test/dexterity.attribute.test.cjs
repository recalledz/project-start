const { expect } = require('chai');

describe('🏹 Dexterity attribute', () => {
  const mod = require('../attributes.js');

  it('scales attack speed', () => {
    mod.attributes.Dexterity.points = 2;
    expect(mod.attributes.Dexterity.attackSpeedMultiplier).to.equal(1 + 0.05 * 2);
  });

  it('provides XP bonus for gathering skills', () => {
    mod.attributes.Dexterity.points = 3;
    expect(mod.dexterityXpMultiplier('Gather Fruit')).to.equal(1 + 0.1 * 3);
  });

  it('does not affect unrelated skills', () => {
    mod.attributes.Dexterity.points = 4;
    expect(mod.dexterityXpMultiplier('Building')).to.equal(1);
  });
});
