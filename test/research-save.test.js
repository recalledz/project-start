/* global describe, it, before, beforeEach */
import { expect } from 'chai';

let saveGame;
let sectState;
let systems;

describe('research persistence', () => {
  function stubElement() {
    return {
      style: {},
      classList: { add() {}, remove() {}, toggle() {} },
      appendChild() {},
      remove() {},
      setAttribute() {},
      getAttribute() { return null; },
      addEventListener() {},
      removeEventListener() {},
      querySelector() { return stubElement(); },
      querySelectorAll() { return []; },
      innerHTML: '',
      textContent: '',
      value: '',
      dataset: {}
    };
  }

  before(async () => {
    const docStub = {
      getElementById: () => stubElement(),
      getElementsByClassName: () => [stubElement()],
      querySelector: () => stubElement(),
      querySelectorAll: () => [],
      createElement: () => stubElement(),
      addEventListener() {},
      removeEventListener() {},
      documentElement: { style: { setProperty() {} } },
      body: stubElement()
    };
    globalThis.document = docStub;
    globalThis.window = {
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {},
      location: { reload() {} },
      CustomEvent: class {},
    };
    globalThis.requestAnimationFrame = () => {};
    const noop = () => 0;
    globalThis.setInterval = noop;
    globalThis.clearInterval = () => {};
    globalThis.setTimeout = noop;
    globalThis.clearTimeout = () => {};
    globalThis.localStorage = {
      _data: {},
      setItem(k, v) { this._data[k] = String(v); },
      getItem(k) { return Object.prototype.hasOwnProperty.call(this._data, k) ? this._data[k] : null; },
      removeItem(k) { delete this._data[k]; },
      clear() { this._data = {}; }
    };

    const script = await import('../script.js');
    saveGame = script.saveGame;
    const stateModule = await import('../game/state.js');
    sectState = stateModule.sectState;
    systems = stateModule.systems;
  });

  beforeEach(() => {
    localStorage.clear();
    sectState.completedResearch.length = 0;
    systems.researchUnlocked = false;
    systems.orbManagementUnlocked = false;
  });

  it('saves completed research and system unlocks', () => {
    systems.researchUnlocked = true;
    systems.orbManagementUnlocked = true;
    sectState.completedResearch.push('wordOfHaste', 'orbRevival');
    saveGame();
    const raw = localStorage.getItem('gameSave');
    const parsed = JSON.parse(raw);
    expect(parsed.systems.researchUnlocked).to.be.true;
    expect(parsed.systems.orbManagementUnlocked).to.be.true;
    expect(parsed.sectState.completedResearch).to.include('wordOfHaste');
    expect(parsed.sectState.completedResearch).to.include('orbRevival');
  });
});

