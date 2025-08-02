/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';

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

describe('disciple health regeneration', () => {
  it('updates currentHp when healing', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    d.health = 5;
    d.currentHp = 5;
    d.water = 10;
    sectSystem.disciples.push(d);

    tickSect(1000);

    expect(d.health).to.be.closeTo(6, 0.1);
    expect(d.currentHp).to.equal(d.health);
  });
});
