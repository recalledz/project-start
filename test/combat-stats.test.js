/* global describe, it, before */
import { expect } from 'chai';

const listeners = {};
globalThis.document = {
  getElementById: () => null,
  getElementsByClassName: () => [null],
  querySelector: () => null,
  createElement: () => ({
    appendChild() {},
    style: {},
    classList: { add() {}, toggle() {} }
  }),
  addEventListener(name, fn) {
    listeners[name] = listeners[name] || [];
    listeners[name].push(fn);
  },
  removeEventListener() {},
  dispatchEvent(e) {
    (listeners[e.type] || []).forEach(fn => fn(e));
  },
  body: { appendChild() {} }
};
globalThis.window = {};

let Disciple;
let initializeDisciple;
let updateDiscipleStatsDisplay;

before(async () => {
  ({ default: Disciple } = await import('../game/disciple.js'));
  ({ initializeDisciple } = await import('../utils/discipleInit.js'));
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

    // level up triggers UI refresh
    d.gainCombatXp(d.xpForNextLevel());

    expect(levelRow.textContent).to.equal(`Level ${d.combatLevel}`);
    expect(stats.innerHTML).to.not.equal(before);
    expect(stats.innerHTML).to.include(`Damage ${Math.round(d.damage)}`);
    expect(stats.innerHTML).to.include(`Defense ${Math.round(d.defense)}`);
  });
});
