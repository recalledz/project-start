/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';
import { FRUIT_CONSUMPTION_RATE } from '../game/constants.js';

let sectModule;
let sectSystem;
let tickSect;

before(async () => {
  globalThis.document = {
    getElementsByClassName: () => [null],
    getElementById: () => null,
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  globalThis.window = { addEventListener() {} };
  sectModule = await import('../game/sect.js');
  ({ sectSystem, tickSect } = sectModule);
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

beforeEach(() => {
  sectSystem.disciples.length = 0;
  Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
  sectState.fruits = 10;
});

describe('incapacitated disciples', () => {
  it('consume triple food and recover over time', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    d.incapacitated = true;
    d.health = 0;
    sectSystem.disciples.push(d);
    const rate = FRUIT_CONSUMPTION_RATE;

    // simulate until just past 50% health
    for (let i = 0; i < 5; i++) {
      tickSect(1000);
    }
    expect(d.health).to.be.closeTo(5, 0.1);
    expect(d.incapacitated).to.be.false;
    const expectedFood = 10 - rate * 3 * 5;
    expect(sectState.fruits).to.be.closeTo(expectedFood, 1e-6);
  });
});
