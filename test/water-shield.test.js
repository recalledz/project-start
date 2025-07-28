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

describe('water shield', () => {
  it('absorbs damage before hp', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    d.water = 5;
    d.currentHp = d.maxHp;

    applyDamage(d, 3);
    expect(d.water).to.equal(2);
    expect(d.currentHp).to.equal(d.maxHp);

    applyDamage(d, 3);
    expect(d.water).to.equal(0);
    expect(d.currentHp).to.equal(d.maxHp - 1);
  });
});
