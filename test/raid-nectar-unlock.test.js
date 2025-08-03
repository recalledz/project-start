/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import { sectState } from '../game/state.js';

let sectModule;
let raidModule;
let sectSystem;
let endRaid;
let raidState;

function setupDom() {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [{ textContent: '', style: {}, appendChild() {} }],
    createElement: () => ({
      appendChild() {},
      style: {},
      addEventListener() {},
      remove() {},
      classList: { add() {}, remove() {}, toggle() {} }
    }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild() {}, classList: { add() {}, remove() {} } },
    dispatchEvent: () => {}
  };
  globalThis.window = { dispatchEvent() {} };
}

describe('undead nectar rewards', () => {
  before(async () => {
    setupDom();
    sectModule = await import('../game/sect.js');
    raidModule = await import('../game/raids.js');
    ({ sectSystem } = sectModule);
    ({ endRaid, raidState } = raidModule);
  });

  after(() => {
    delete globalThis.document;
    delete globalThis.window;
  });

  beforeEach(() => {
    sectState.undeadNectar = 0;
    const res = sectSystem.resources.undeadNectar;
    res.current = 0;
    res.unlocked = false;
    raidState.active = true;
    raidState.raid = { end() {} };
    raidState.overlay = { close() {} };
    raidState.prevTasks = {};
    raidState.xpStart = {};
  });

  it('unlocks undead nectar resource after a raid victory', () => {
    endRaid(true);
    expect(sectSystem.resources.undeadNectar.unlocked).to.be.true;
  });
});
