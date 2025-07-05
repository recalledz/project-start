const { expect } = require('chai');

describe('🏃 Dexterity attribute', () => {
  const mod = require('../attributes.js');

  it('scales attack speed and cast time', () => {
    mod.attributes.Dexterity.points = 2;
    expect(mod.attributes.Dexterity.attackSpeedMultiplier).to.equal(1 + 0.05 * 2);
    expect(mod.attributes.Dexterity.castTimeMultiplier).to.equal(1 - 0.05 * 2);
  });

  it('provides XP bonus for dexterity tasks', () => {
    mod.attributes.Dexterity.points = 3;
    expect(mod.dexterityXpMultiplier('Gather Fruit')).to.equal(1 + 0.1 * 3);
  });

  it('does not affect unrelated skills', () => {
    mod.attributes.Dexterity.points = 4;
    expect(mod.dexterityXpMultiplier('Research')).to.equal(1);
  });
});
