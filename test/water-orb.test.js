/* global describe, it, before, after */
import { expect } from 'chai';
import { sectState } from '../game/state.js';

let sectModule;
let sectSystem;
let tickSectSystem;
let ORB_REGEN_PER_SEC;

// Setup DOM stubs to satisfy module imports
before(async () => {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [null],
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
  };
  global.document = globalThis.document;
  globalThis.window = { dispatchEvent() {} };
  global.window = globalThis.window;
  sectModule = await import('../game/sect.js');
  ({ sectSystem, tickSectSystem, ORB_REGEN_PER_SEC } = sectModule);
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

describe('water orb regeneration', () => {
  it('regenerates over time', () => {
    sectSystem.resources.water.current = 1;
    sectSystem.resources.water.cracked = false;
    for (let i = 0; i < 10; i++) {
      tickSectSystem(1000);
    }
    expect(sectSystem.resources.water.current).to.be.closeTo(2, 1e-6);
  });

  it('cracks when emptied', () => {
    sectSystem.orbs.water.current = 0;
    sectSystem.orbs.water.max = 20;
    sectSystem.orbs.water.cracked = false;
    tickSectSystem(1000);
    expect(sectSystem.orbs.water.cracked).to.be.true;
    expect(sectSystem.orbs.water.max).to.equal(10);
    expect(sectSystem.orbs.water.current).to.be.closeTo(ORB_REGEN_PER_SEC * 0.5, 1e-6);
  });

  it('repairs itself over time when cracked', () => {
    sectSystem.orbs.water.cracked = true;
    sectSystem.orbs.water.max = 10;
    sectState.orbRepairProgress = 0;
    for (let i = 0; i < sectModule.ORB_REPAIR_SECONDS; i++) {
      tickSectSystem(1000);
    }
    expect(sectSystem.orbs.water.cracked).to.be.false;
    expect(sectSystem.orbs.water.max).to.equal(20);
  });
});
