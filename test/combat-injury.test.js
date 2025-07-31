/* global describe, it, before, after */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';

let combatModule;
let applyDamage;

before(async () => {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [null],
    querySelector: () => null,
    createElement: () => ({
      appendChild() {},
      addEventListener() {},
      remove() {},
      style: {},
      classList: { add() {}, remove() {} },
      getContext: () => ({ clearRect() {}, beginPath() {}, arc() {}, fill() {} }),
      getBoundingClientRect: () => ({ width: 0, height: 0 })
    }),
    body: { appendChild() {} },
    addEventListener() {},
    removeEventListener() {}
  };
  globalThis.window = { dispatchEvent() {} };
  combatModule = await import('../game/combat.js');
  ({ applyDamage } = combatModule);
});

after(() => {
  delete globalThis.document;
  delete globalThis.window;
});

describe('combat injuries', () => {
  it('applies an injury when taking damage without water', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    d.water = 0;
    const prev = Math.random;
    Math.random = () => 0;
    applyDamage(d, 1);
    Math.random = prev;
    expect(d.injuries.head.tier).to.equal('bruise');
  });
});

