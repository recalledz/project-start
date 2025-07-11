const { expect } = require('chai');
const Disciple = require('../disciple.js').default;

describe('⚔️ Disciple attribute effects', () => {
  it('applies strength, dexterity and endurance to combat stats', () => {
    const d = new Disciple({ id: 1 });
    d.strength = 4;
    d.dexterity = 6;
    d.endurance = 3;
    d.combatLevel = 5;
    d.updateCombatStats();
    expect(d.damage).to.equal(d.combatLevel * 3 * (1 + 0.05 * d.strength));
    expect(d.attackSpeed).to.equal(10000 / (1 + 0.05 * d.dexterity));
    expect(d.defense).to.equal((1 + 0.05 * d.endurance) * d.combatLevel);
  });
});
