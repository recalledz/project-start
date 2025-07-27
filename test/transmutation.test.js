
/* global describe, it, beforeEach, before, after */

import { expect } from 'chai';
import { sectState, systems } from '../game/state.js';

let startBuilding;
let tickBuilding;
let performTransmute;
let checkBuildingUnlock;
let sectSystem;

describe('Circle of Areito', () => {
  before(() => {
    globalThis.document = {
      getElementsByClassName: () => [null],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
    return import('../game/buildings.js').then(mod => {
      ({ startBuilding, tickBuilding, checkBuildingUnlock } = mod);
    }).then(() => import('../game/transmutation.js')).then(mod => {
      ({ performTransmute } = mod);
    }).then(() => import('../game/sect.js')).then(mod => {
      ({ sectSystem } = mod);
    });
  });
  after(() => {
    delete globalThis.document;
  });
  beforeEach(() => {
    systems.areitoBuildingAvailable = false;
    systems.transmutationUnlocked = false;
    sectState.softwood = 0;
    sectSystem.orbs.water.current = sectSystem.orbs.water.max;
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    sectState.buildings.areitoCircle = 0;
    sectState.planks = 0;
  });

  it('unlocks after gathering 100 softwood', () => {
    sectState.softwood = 99;
    checkBuildingUnlock();
    expect(systems.areitoBuildingAvailable).to.be.false;
    sectState.softwood = 100;
    checkBuildingUnlock();
    expect(systems.areitoBuildingAvailable).to.be.true;
  });

  it('builds and transmutes planks', () => {
    systems.areitoBuildingAvailable = true;
    sectState.softwood = 150;
    startBuilding('areitoCircle');
    const d = { id: 1, endurance: 0 };
    sectSystem.disciples.push(d);
    sectState.discipleTasks[d.id] = 'Building';
    tickBuilding(600);
    expect(sectState.buildings.areitoCircle).to.equal(1);
    expect(systems.transmutationUnlocked).to.be.true;
    sectState.softwood = 100;
    performTransmute('plank');
    expect(sectState.planks).to.be.above(0);
  });
});
