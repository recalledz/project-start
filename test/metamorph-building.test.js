/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import { sectState, systems } from '../game/state.js';

let startBuilding, tickBuilding, checkBuildingUnlock, sectSystem;

before(async () => {
  globalThis.document = {
    getElementsByClassName: () => [null],
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  ({ startBuilding, tickBuilding, checkBuildingUnlock } = await import('../game/buildings.js'));
  ({ sectSystem } = await import('../game/sect.js'));
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
    sectSystem.disciples.push({ id: 1, endurance: 0 });
    sectState.discipleTasks[1] = 'Building';
    tickBuilding(600);
    expect(sectState.buildings.metamorphRoom).to.equal(1);
    expect(sectState.metamorphRooms).to.equal(1);
  });
});
