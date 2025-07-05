const { expect } = require('chai');

describe('🧠 Intelligence attribute', () => {
  const mod = require('../attributes.js');

  it('scales construct potency', () => {
    mod.attributes.Intelligence.points = 2;
    expect(mod.attributes.Intelligence.constructPotencyMultiplier).to.equal(1 + 0.03 * 2);
  });

  it('provides XP bonus for research tasks', () => {
    mod.attributes.Intelligence.points = 4;
    expect(mod.intelligenceXpMultiplier('Research')).to.equal(1 + 0.1 * 4);
  });

  it('does not affect unrelated skills', () => {
    mod.attributes.Intelligence.points = 3;
    expect(mod.intelligenceXpMultiplier('Log Pine')).to.equal(1);
  });
});
