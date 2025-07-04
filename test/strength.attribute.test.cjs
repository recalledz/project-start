const { expect } = require('chai');

describe('💪 Strength attribute', () => {
  const mod = require('../attributes.js');

  it('scales melee damage and inventory slots', () => {
    mod.attributes.Strength.points = 4;
    expect(mod.attributes.Strength.meleeDamageMultiplier).to.equal(1 + 0.05 * 4);
    expect(mod.attributes.Strength.inventorySlots).to.equal(2);
  });

  it('provides XP bonus for relevant skills', () => {
    mod.attributes.Strength.points = 3;
    expect(mod.strengthXpMultiplier('Mining')).to.equal(1 + 0.1 * 3);
  });

  it('does not affect unrelated skills', () => {
    mod.attributes.Strength.points = 5;
    expect(mod.strengthXpMultiplier('Gather Fruit')).to.equal(1);
  });
});
