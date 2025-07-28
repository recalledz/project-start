/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { sectState } from '../game/state.js';

let sectModule;
let sectSystem;
let tickSect;
let tickInjuries;
let applyInjury;

before(async () => {
  globalThis.document = {
    getElementsByClassName: () => [null],
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  sectModule = await import('../game/sect.js');
  ({ sectSystem, tickSect } = sectModule);
  ({ tickInjuries, applyInjury } = await import('../game/injury.js'));
});

after(() => {
  delete globalThis.document;
});

beforeEach(() => {
  sectSystem.disciples.length = 0;
});

describe('injury system', () => {
  it('applies starvation damage and injuries', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    d.water = 0;
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = 'Research';
    const prev = Math.random;
    Math.random = () => 0; // always hit head and apply bruise
    tickSect(1000);
    Math.random = prev;
    expect(d.health).to.be.below(10);
  });

  it('resilience slows injury progress', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    applyInjury(d, 'head', 'bruise');
    d.injuries.head.rate = 0.5;
    tickInjuries(d, 1, 0.4, 'Idle');
    expect(d.injuries.head.progress).to.be.closeTo(0.1, 1e-6);
  });
});
