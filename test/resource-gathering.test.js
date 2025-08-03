/* global describe, it, beforeEach, afterEach, before, after */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';
import { FRUIT_CONSUMPTION_RATE } from '../game/constants.js';

let sectModule;
let sectSystem;
let tickSect;

describe('resource gathering', () => {
  before(async () => {
    globalThis.document = {
      getElementsByClassName: () => [null],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    sectModule = await import('../game/sect.js');
    ({ sectSystem, tickSect } = sectModule);
  });
  after(() => {
    delete globalThis.document;
  });
  let prevUpdate;
  beforeEach(async () => {
    prevUpdate = globalThis.updateSectDisplay;
    globalThis.updateSectDisplay = () => {};
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    Object.keys(sectState.discipleProgress).forEach(k => delete sectState.discipleProgress[k]);
    Object.keys(sectState.discipleSkills).forEach(k => delete sectState.discipleSkills[k]);
    sectState.fruits = 0;
    sectState.softwood = 0;
    sectState.buildings.bohio = 0;
    sectModule.sectSystem.deathMoodPenalty = 0;
    const { raidState } = await import('../game/raids.js');
    raidState.active = false;
  });
  afterEach(() => {
    globalThis.updateSectDisplay = prevUpdate;
  });

  function runGatherTest(task) {
    const d = new Disciple({ id: 1, attributes: { strength: 1, dexterity: 1, endurance: 1, intelligence: 1, charisma: 1, potential: 1 } });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = task;
    sectState.buildings.bohio = sectSystem.disciples.length;
    sectState.fruits = 1;

    let called = false;
    globalThis.updateSectDisplay = () => { called = true; };
    tickSect(1000);

    if (task === 'Gather Fruit') {
      const expected = 1 - FRUIT_CONSUMPTION_RATE;
      expect(sectState.fruits).to.be.closeTo(expected, 1e-6);
    } else {
      expect(sectState.softwood).to.be.closeTo(0, 1e-6);
      expect(sectState.fruits).to.be.closeTo(1 - FRUIT_CONSUMPTION_RATE, 1e-6);
    }
    expect(sectState.discipleProgress[d.id]).to.be.closeTo(0, 1e-6);
    expect(called).to.be.true;
  }

  it('collects fruit each second', () => {
    runGatherTest('Gather Fruit');
  });

  it('collects softwood each second', () => {
    runGatherTest('Gather Softwood');
  });

  it('respects fruit cap', () => {
    const d = new Disciple({ id: 2, attributes: { strength: 1, dexterity: 1, endurance: 1, intelligence: 1, charisma: 1, potential: 1 } });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = 'Gather Fruit';
    sectState.fruits = sectState.fruitCap - 0.05;
    tickSect(1000);
    expect(sectState.fruits).to.be.closeTo(sectState.fruitCap, 1e-6);
  });

  it('respects softwood cap', () => {
    const d = new Disciple({ id: 3, attributes: { strength: 1, dexterity: 1, endurance: 1, intelligence: 1, charisma: 1, potential: 1 } });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = 'Gather Softwood';
    sectState.softwood = sectState.softwoodCap - 0.05;
    tickSect(1000);
    expect(sectState.softwood).to.be.closeTo(sectState.softwoodCap, 1e-6);
  });
});
