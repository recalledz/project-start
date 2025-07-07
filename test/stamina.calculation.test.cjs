const { expect } = require('chai');
const { calculateMaxStamina, calculateStaminaRegen } = require('../utils/stamina.js');

describe('🏃 Stamina calculations', () => {
  it('max stamina scales with endurance', () => {
    expect(calculateMaxStamina(1)).to.equal(10);
    expect(calculateMaxStamina(3)).to.equal(10 * (1 + 0.05 * 2));
  });

  it('regen scales with endurance', () => {
    expect(calculateStaminaRegen(1)).to.equal(0.1);
    expect(calculateStaminaRegen(4)).to.equal(0.1 * (1 + 0.01 * 3));
  });
});
