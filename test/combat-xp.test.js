/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';
import { ensureDiscipleSkills, addSkillXp } from '../utils/skills.js';

let sectModule;
let raidModule;
let sectSystem;
let startRaid;
let endRaid;

function setupDom() {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [{ textContent: '', style: {}, appendChild() {} }],
    createElement: () => ({
      appendChild() {},
      style: {},
      addEventListener() {},
      remove() {},
      classList: { add() {}, toggle() {} }
    }),
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
    ({ sectSystem } = sectModule);
    ({ startRaid, endRaid } = raidModule);
  });

  after(() => {});

  beforeEach(() => {
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    Object.keys(sectState.discipleSkills).forEach(k => delete sectState.discipleSkills[k]);
  });

  it('awards combat xp to fighters during a raid', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    sectSystem.disciples.push(d);
    ensureDiscipleSkills(d.id);
    sectState.discipleTasks[d.id] = 'Gather Fruit';

    startRaid();
    addSkillXp(d, 'Combat', 1);
    const endXp = sectState.discipleSkills[d.id].Combat || 0;
    expect(endXp).to.be.greaterThan(0);
    expect(d.combatXp).to.be.greaterThan(0);
    endRaid(true);
  });
});
