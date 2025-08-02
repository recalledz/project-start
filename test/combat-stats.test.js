/* global describe, it, before */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';

let updateDiscipleStatsDisplay;

before(async () => {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [null],
    querySelector: () => null,
    createElement: () => ({
      appendChild() {},
      style: {},
      classList: { add() {}, toggle() {} }
    }),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {} }
  };
  globalThis.window = {};
  ({ updateDiscipleStatsDisplay } = await import('../game/ui.js'));
});

describe('combat stat updates', () => {
  it('increases and updates combat stats on level up', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);

    // stub elements for display
    const levelRow = { textContent: '' };
    const xpFill = { style: { width: '' } };
    const xpLabel = { textContent: '' };
    const stats = { innerHTML: '' };
    d.combatStatElems = { level: levelRow, xpFill, xpLabel, stats };

    // initial render
    updateDiscipleStatsDisplay(d);
    const before = stats.innerHTML;

    // level up
    d.gainCombatXp(d.xpForNextLevel());
    updateDiscipleStatsDisplay(d);

    expect(levelRow.textContent).to.equal(`Level ${d.combatLevel}`);
    expect(stats.innerHTML).to.not.equal(before);
    expect(stats.innerHTML).to.include(`Damage ${Math.round(d.damage)}`);
    expect(stats.innerHTML).to.include(`Defense ${Math.round(d.defense)}`);
  });
});
