/* global describe, it, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { sectState } from '../game/state.js';
import { ensureCombatStats, addCombatStatXp } from '../game/combatStats.js';
import { applyDamage } from '../game/combat.js';

describe('combat stat xp', () => {
  beforeEach(() => {
    sectState.discipleCombatStats = {};
  });

  it('gains defense xp when taking physical damage', () => {
    const d = new Disciple({ id: 1 });
    ensureCombatStats(d.id);
    const start = sectState.discipleCombatStats[d.id].defense;
    applyDamage(d, 1, 'physical');
    const end = sectState.discipleCombatStats[d.id].defense;
    expect(end).to.equal(start + 1);
  });

  it('gains melee damage xp when adding xp', () => {
    const d = new Disciple({ id: 2 });
    ensureCombatStats(d.id);
    const start = sectState.discipleCombatStats[d.id].meleeDamage;
    addCombatStatXp(d, 'meleeDamage', 2);
    const end = sectState.discipleCombatStats[d.id].meleeDamage;
    expect(end).to.equal(start + 2);
  });
});
