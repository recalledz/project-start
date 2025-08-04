/* global describe, it */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import Enemy from '../game/enemy.js';
import { sectState } from '../game/state.js';

describe('damage range assignment', () => {
  it('assigns min and max damage to disciples', () => {
    const d = new Disciple({ id: 1 });
    sectState.discipleMetamorphosis[d.id] = { stage: 1 };
    d.updateCombatStats();
    const base = d.damage;
    expect(d.minDamage).to.equal(Math.floor(base * 0.5));
    expect(d.maxDamage).to.equal(Math.ceil(base * 1.5));
  });

  it('assigns min and max damage to enemies', () => {
    const e = new Enemy(1, 1, { damage: 8 });
    expect(e.minDamage).to.equal(Math.floor(8 * 0.5));
    expect(e.maxDamage).to.equal(Math.ceil(8 * 1.5));
  });
});
