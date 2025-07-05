const { expect } = require('chai');

describe('🛡️ Endurance attribute', () => {
  const mod = require('../attributes.js');

  it('scales stamina, regen, and HP', () => {
    mod.attributes.Endurance.points = 2;
    expect(mod.attributes.Endurance.staminaMultiplier).to.equal(1 + 0.05 * 2);
    expect(mod.attributes.Endurance.staminaRegenMultiplier).to.equal(1 + 0.01 * 2);
    expect(mod.attributes.Endurance.hpBonus).to.equal(20);
  });

  it('provides XP bonus for certain skills', () => {
    mod.attributes.Endurance.points = 3;
    expect(mod.enduranceXpMultiplier('Building')).to.equal(1 + 0.1 * 3);
  });

  it('does not affect unrelated skills', () => {
    mod.attributes.Endurance.points = 5;
    expect(mod.enduranceXpMultiplier('Gather Fruit')).to.equal(1);
  });
});
