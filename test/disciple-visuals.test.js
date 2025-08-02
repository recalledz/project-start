/* global describe, it, before, after, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { initDiscipleVisual, updateDiscipleVisual } from '../game/disciplesVisuals.js';
import { applyInjury } from '../game/injury.js';

describe('disciple visual customization', () => {
  let el;
  before(() => {
    globalThis.document = {
      createElement: () => ({ remove() {} }),
      getElementsByClassName: () => [null],
      getElementById: () => null,
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  });

  after(() => {
    delete globalThis.document;
  });

  beforeEach(() => {
    el = {
      dataset: {},
      appendChild() {},
      removeChild() {},
      removeAttribute(attr) { delete this.dataset[attr.replace('data-', '')]; }
    };
  });

  it('sets data-scar when a body part is destroyed', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    initDiscipleVisual(d, el);
    applyInjury(d, 'leftEye', 'destroyed');
    updateDiscipleVisual(d, el, 'Idle');
    expect(el.dataset.scar).to.equal('✖');
  });

  it('applies mark attribute', () => {
    const d = new Disciple({ id: 2 });
    initializeDisciple(d);
    d.mark = 'shellwarden';
    initDiscipleVisual(d, el);
    expect(el.dataset.mark).to.equal('shellwarden');
  });
});
