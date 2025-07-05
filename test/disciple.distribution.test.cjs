const { expect } = require('chai');
const { generateDiscipleAttributes } = require('../discipleAttributes.js');

describe('🧍 Disciple attribute distribution', () => {
  it('allocates between 3 and 5 points total', () => {
    for (let i = 0; i < 50; i++) {
      const dist = generateDiscipleAttributes();
      const total =
        dist.strength + dist.dexterity + dist.endurance + dist.intelligence;
      expect(total).to.be.at.least(3).and.at.most(5);
    }
  });

  it('rarely gives 3 points in one stat', () => {
    let triples = 0;
    const runs = 500;
    for (let i = 0; i < runs; i++) {
      const d = generateDiscipleAttributes();
      if (
        Math.max(d.strength, d.dexterity, d.endurance, d.intelligence) >= 3
      ) {
        triples++;
      }
    }
    expect(triples).to.be.below(runs * 0.1);
  });
});
