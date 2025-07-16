const { expect } = require('chai');
const { generateDiscipleAttributes } = require('../discipleAttributes.js');

describe('🧍 Disciple attribute distribution', () => {
  it('starts with base attributes of 3 and distributes 6 extra points', () => {
    for (let i = 0; i < 10; i++) {
      const dist = generateDiscipleAttributes();
      const total =
        dist.strength +
        dist.dexterity +
        dist.endurance +
        dist.intelligence +
        dist.charisma;
      expect(total).to.equal(21);
      Object.values(dist).forEach(v => expect(v).to.be.at.least(3));
    }
  });

  it('adds random points beyond the base', () => {
    const first = generateDiscipleAttributes();
    let varied = false;
    for (let i = 0; i < 20; i++) {
      const next = generateDiscipleAttributes();
      if (
        next.strength !== first.strength ||
        next.dexterity !== first.dexterity ||
        next.endurance !== first.endurance ||
        next.intelligence !== first.intelligence ||
        next.charisma !== first.charisma
      ) {
        varied = true;
        break;
      }
    }
    expect(varied).to.equal(true);
  });
});
