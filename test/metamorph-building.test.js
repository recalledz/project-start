/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import { sectState, systems } from '../game/state.js';

let startBuilding, checkBuildingUnlock;

before(async () => {
  globalThis.document = {
    getElementsByClassName: () => [null],
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  ({ startBuilding, checkBuildingUnlock } = await import('../game/buildings.js'));
});

after(() => {
  delete globalThis.document;
});

beforeEach(() => {
  systems.metamorphBuildingAvailable = false;
  sectState.softwood = 0;
  sectState.undeadNectar = 0;
  sectState.buildings.metamorphRoom = 0;
  sectState.metamorphRooms = 0;
});

describe('Metamorph Room', () => {
  it('unlocks after obtaining undead nectar', () => {
    checkBuildingUnlock();
    expect(systems.metamorphBuildingAvailable).to.be.false;
    sectState.undeadNectar = 1;
    checkBuildingUnlock();
    expect(systems.metamorphBuildingAvailable).to.be.true;
  });

  it('builds first room when resources available', () => {
    systems.metamorphBuildingAvailable = true;
    sectState.softwood = 100;
    sectState.undeadNectar = 1;
    startBuilding('metamorphRoom');
    expect(sectState.buildings.metamorphRoom).to.equal(1);
    expect(sectState.metamorphRooms).to.equal(1);
  });
});
