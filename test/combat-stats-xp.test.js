/* global describe, it, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { sectState } from '../game/state.js';
import {
  ensureCombatStats,
  addCombatStatXp,
  combatStatXpRequired,
  COMBAT_STAT_DEFS,
  getCombatStatProgress
} from '../game/combatStats.js';
import { applyDamage } from '../game/combat.js';

describe('combat stat xp', () => {
  beforeEach(() => {
    sectState.discipleCombatStats = {};
    sectState.discipleSkills = {};
  });

  it('gains defense xp proportional to damage taken', () => {
    const d = new Disciple({ id: 1 });
    ensureCombatStats(d.id);
    const start = sectState.discipleCombatStats[d.id].defense;
    applyDamage(d, 5, 'physical');
    const end = sectState.discipleCombatStats[d.id].defense;
    expect(end).to.be.closeTo(start + 1, 0.001);
  });

  it('levels melee damage after sufficient xp', () => {
    const d = new Disciple({ id: 2 });
    ensureCombatStats(d.id);
    const needed = combatStatXpRequired(1);
    addCombatStatXp(d, 'meleeDamage', needed);
    const { level } = getCombatStatProgress(d, 'meleeDamage');
    expect(level).to.equal(1);
    expect(d.meleeDamage).to.equal(COMBAT_STAT_DEFS.meleeDamage.base + 1);
  });
});
