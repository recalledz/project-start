const { expect } = require('chai');
const { initializeDisciple } = require('../utils/discipleInit.js');
const Disciple = require('../disciple.js').default;

describe('🧍 Disciple initialization', () => {
  it('applies default stats for new disciples', () => {
    const d = new Disciple({ id: 42 });
    initializeDisciple(d);
    expect(d.health).to.equal(10);
    expect(d.stamina).to.equal(10);
    expect(d.inventorySlots).to.equal(10);
    expect(d.currentHp).to.equal(d.maxHp);
  });
});
