/* global describe, it, beforeEach, afterEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { BODY_PARTS } from '../game/injury.js';

describe('disciple quirks', () => {
  let prevRandom;
  beforeEach(() => {
    prevRandom = Math.random;
    Math.random = () => 0; // deterministic
  });
  afterEach(() => {
    Math.random = prevRandom;
  });

  it('assigns 1-3 quirks and may destroy body parts', () => {
    const d = new Disciple({ id: 1 });
    initializeDisciple(d);
    expect(d.quirks.length).to.be.at.least(1);
    const destroyed = BODY_PARTS.some(p => d.injuries[p.key].tier === 'destroyed');
    expect(destroyed).to.be.true;
  });
});
