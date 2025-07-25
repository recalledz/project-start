/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';

let sectModule;
let raidModule;
let sectSystem;
let tickSect;
let startRaid;
let tickRaid;
let raidState;

function setupDom() {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [{ textContent: '', style: {}, appendChild() {} }],
    createElement: () => ({ appendChild() {}, style: {}, addEventListener() {}, remove() {} }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild() {} },
    dispatchEvent: () => {}
  };
  globalThis.window = { dispatchEvent() {} };
}

describe('combat xp gain', () => {
  before(async () => {
    setupDom();
    sectModule = await import(`../game/sect.js?test=${Date.now()}`);
    raidModule = await import(`../game/raids.js?test=${Date.now()}`);
    ({ sectSystem, tickSect } = sectModule);
    ({ startRaid, tickRaid, raidState } = raidModule);
  });

  after(() => {});

  beforeEach(() => {
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    Object.keys(sectState.discipleSkills).forEach(k => delete sectState.discipleSkills[k]);
  });

  it('awards combat xp to fighters during a raid', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = 'Fight';

    const startXp = sectState.discipleSkills[d.id]?.Combat || 0;
    startRaid();
    for (let i = 0; i < 10; i++) {
      tickSect(1000);
      tickRaid(1000);
    }
    raidState.active = false;
    const endXp = sectState.discipleSkills[d.id].Combat || 0;
    expect(endXp - startXp).to.be.greaterThan(0);
  });
});
