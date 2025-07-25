/* global describe, it, beforeEach, afterEach, before, after */
import { expect } from 'chai';
import Disciple from '../disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';
import {
  GATHER_SPOTS,
  GATHER_WORK_SECONDS,
  MIN_TRAVEL_SECONDS,
  TRAVEL_SECONDS_PER_UNIT,
  TASK_GROUPS,
  ATTRIBUTE_FOR_GROUP
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

    const spot = GATHER_SPOTS[task];
    const travel = Math.max(MIN_TRAVEL_SECONDS, spot.travel * TRAVEL_SECONDS_PER_UNIT);
    const cycleSeconds = travel * 2 + GATHER_WORK_SECONDS;
    const group = TASK_GROUPS[task];
    const attr = ATTRIBUTE_FOR_GROUP[group];
    const lvl = getTaskSkillProgress(0).level;
    const gatherAmt = spot.baseYield * (1 + 0.05 * d[attr] + 0.02 * lvl) * cycleSeconds;

    let called = false;
    globalThis.updateSectDisplay = () => { called = true; };

    tickSect(cycleSeconds * 1000);

    if (task === 'Gather Fruit') expect(sectState.fruits).to.be.closeTo(gatherAmt, 1e-6);
    else expect(sectState.softwood).to.be.closeTo(gatherAmt, 1e-6);
    expect(sectState.discipleProgress[d.id]).to.be.closeTo(0, 1e-6);
    expect(called).to.be.true;
  }

  it('collects fruit after a full cycle', () => {
    runGatherTest('Gather Fruit');
  });

  it('collects softwood after a full cycle', () => {
    runGatherTest('Gather Softwood');
  });
});
