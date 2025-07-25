/* global describe, it, beforeEach, afterEach, before, after */
import { expect } from 'chai';
import Disciple from '../disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';
import {
  GATHER_SPOTS,
  TASK_GROUPS,
  ATTRIBUTE_FOR_GROUP,
  FRUIT_CONSUMPTION_RATE
} from '../game/constants.js';
import { getTaskSkillProgress } from '../utils/skills.js';

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
  beforeEach(() => {
    prevUpdate = globalThis.updateSectDisplay;
    globalThis.updateSectDisplay = () => {};
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    Object.keys(sectState.discipleProgress).forEach(k => delete sectState.discipleProgress[k]);
    Object.keys(sectState.discipleSkills).forEach(k => delete sectState.discipleSkills[k]);
    sectState.fruits = 0;
    sectState.softwood = 0;
  });
  afterEach(() => {
    globalThis.updateSectDisplay = prevUpdate;
  });

  function runGatherTest(task) {
    const d = new Disciple({ id: 1, attributes: { strength: 1, dexterity: 1, endurance: 1, intelligence: 1, charisma: 1, potential: 1 } });
    initializeDisciple(d);
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = task;
    sectState.fruits = 1;

    const spot = GATHER_SPOTS[task];
    const group = TASK_GROUPS[task];
    const attr = ATTRIBUTE_FOR_GROUP[group];
    const lvl = getTaskSkillProgress(0).level;
    const gatherRate = spot.baseYield * (1 + 0.05 * d[attr] + 0.02 * lvl);

    let called = false;
    globalThis.updateSectDisplay = () => { called = true; };

   tickSect(1000);

   if (task === 'Gather Fruit') {
      const expected = 1 - FRUIT_CONSUMPTION_RATE + gatherRate;
      expect(sectState.fruits).to.be.closeTo(expected, 1e-6);
    } else {
      expect(sectState.softwood).to.be.closeTo(gatherRate, 1e-6);
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
});
