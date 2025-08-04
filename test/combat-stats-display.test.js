/* global describe, it, before */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';

function setupDom() {
  globalThis.document = {
    getElementById: () => null,
    getElementsByClassName: () => [{ textContent: '', style: {}, appendChild() {} }],
    createElement: () => ({
      appendChild() {},
      style: {},
      addEventListener() {},
      remove() {},
      classList: { add() {}, toggle() {} }
    }),
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild() {} },
    dispatchEvent: () => {}
  };
  globalThis.window = { dispatchEvent() {} };
}

describe('combat stat xp display', () => {
  before(() => {
    setupDom();
  });

  it('updates melee damage xp bar on gain', () => {
    const levelRow = { textContent: '' };
    const combatFill = { style: {} };
    const combatLabel = { textContent: '' };
    const statLabel = { textContent: '' };
    const statFill = { style: {} };
    const statXpLabel = { textContent: '' };
    const statRow = {
      querySelector: sel => {
        if (sel === '.combat-stat-label') return statLabel;
        if (sel === '.disciple-progress-fill') return statFill;
        if (sel === '.disciple-progress-label') return statXpLabel;
        return null;
      }
    };
    const section = {
      querySelector: sel => {
        if (sel === '.combat-level') return levelRow;
        if (sel === '.combat-xp .disciple-progress-fill') return combatFill;
        if (sel === '.combat-xp .disciple-progress-label') return combatLabel;
        if (sel === '.stat-meleeDamage') return statRow;
        return null;
      }
    };
    const overlayBox = { querySelector: sel => (sel === '.disciple-stats-combat' ? section : null) };
    globalThis.discipleOverlay = { box: overlayBox };
    globalThis.discipleOverlayActiveTab = 'combat';

    const d = new Disciple({ id: 1 });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    globalThis.discipleOverlayData = { disciple: d };

    globalThis.updateDiscipleCombatStatsDisplay = function() {
      if (globalThis.discipleOverlay && globalThis.discipleOverlayActiveTab === 'combat') {
        const sec = globalThis.discipleOverlay.box.querySelector('.disciple-stats-combat');
        const row = sec.querySelector('.stat-meleeDamage');
        const fillEl = row.querySelector('.disciple-progress-fill');
        const labEl = row.querySelector('.disciple-progress-label');
        const stat = globalThis.discipleOverlayData.disciple.combatStats.meleeDamage;
        const pct = Math.min(1, stat.xp / stat.xpForNextLevel());
        if (fillEl) fillEl.style.width = `${Math.floor(pct * 100)}%`;
        if (labEl) labEl.textContent = `${Math.floor(stat.xp)}/${stat.xpForNextLevel()}`;
      }
    };

    const amount = 10;
    d.gainMeleeDamageXp(amount);

    const next = d.combatStats.meleeDamage.xpForNextLevel();
    const expectedPct = Math.floor((amount / next) * 100);
    expect(statFill.style.width).to.equal(`${expectedPct}%`);
    expect(statXpLabel.textContent).to.equal(`${amount}/${next}`);
  });
});
