/* global describe, it, before, after */
import { expect } from 'chai';

let sectModule;
let sectSystem;
let tickSectSystem;

// Setup DOM stubs to satisfy module imports
before(async () => {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [null],
    addEventListener: () => {},
    removeEventListener: () => {},
    querySelector: () => null,
  };
  globalThis.window = { dispatchEvent() {} };
  sectModule = await import('../game/sect.js');
  ({ sectSystem, tickSectSystem } = sectModule);
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

describe('water orb regeneration', () => {
  it('regenerates over time', () => {
    sectSystem.resources.water.current = 0;
    for (let i = 0; i < 10; i++) {
      tickSectSystem(1000);
    }
    expect(sectSystem.resources.water.current).to.be.closeTo(1, 1e-6);
  });
});
