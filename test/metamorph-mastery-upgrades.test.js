/* global describe, it */
import { strict as assert } from 'assert';
import { applyUpgradeById } from '../game/metamorphMasteryUpgrades.js';
import { getMaxWater } from '../game/metamorphosisBonuses.js';

describe('metamorph mastery upgrades', () => {
  it('applies metamorph speed bonus', () => {
    const d = { id: 1, potential: 2 };
    const meta = { upgrades: [] };
    applyUpgradeById(d, meta, 'metamorph-speed-10');
    assert.equal(d.metamorphSpeedMult, 1.1);
    assert.deepEqual(meta.upgrades, ['metamorph-speed-10']);
  });

  it('applies max water bonus', () => {
    const d = { id: 1 };
    const meta = { upgrades: [] };
    applyUpgradeById(d, meta, 'max-water-10');
    assert.equal(getMaxWater(d, 0), 33);
  });
});
