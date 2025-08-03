/* global describe, it */
import { expect } from 'chai';
import { updatePlayerStatsUI } from '../game/ui.js';

describe('updatePlayerStatsUI', () => {
  it('exits cleanly when some elements are undefined', () => {
    const elems = {
      level: { textContent: '' },
      xpLabel: { textContent: '' },
      // xpFill and stats intentionally omitted
    };

    const data = {
      level: 3,
      xpPercent: 40,
      xpLabel: '40/100',
      stats: 'HP: 10'
    };

    expect(() => updatePlayerStatsUI(elems, data)).to.not.throw();
    expect(elems.level.textContent).to.equal('3');
    expect(elems.xpLabel.textContent).to.equal('40/100');
  });
});
