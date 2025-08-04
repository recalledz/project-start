/* global describe, it, before, beforeEach */
import { expect } from 'chai';
import Disciple from '../game/disciple.js';
import { initializeDisciple } from '../utils/discipleInit.js';
import { ensureDiscipleSkills, addSkillXp } from '../utils/skills.js';
import { sectSystem } from '../game/sect.js';
import { sectState } from '../game/state.js';
import { RAID_COMBAT_XP_REWARD } from '../game/constants.js';

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

describe('combat stats tab level display', () => {
  before(() => {
    setupDom();
  });

  beforeEach(() => {
    sectSystem.disciples.length = 0;
    Object.keys(sectState.discipleTasks).forEach(k => delete sectState.discipleTasks[k]);
    Object.keys(sectState.discipleSkills).forEach(k => delete sectState.discipleSkills[k]);
  });

  it('shows increased level when raid xp grants a level', () => {
    const levelRow = { textContent: '' };
    const section = { querySelector: sel => (sel === '.combat-level' ? levelRow : null) };
    const overlayBox = { querySelector: sel => (sel === '.disciple-stats-combat' ? section : null) };
    globalThis.discipleOverlay = { box: overlayBox };
    globalThis.discipleOverlayActiveTab = 'combat';
    globalThis.discipleOverlayData = { disciple: null };
    globalThis.updateDiscipleCombatStatsDisplay = function() {
      if (globalThis.discipleOverlay && globalThis.discipleOverlayActiveTab === 'combat') {
        const d = globalThis.discipleOverlayData.disciple;
        if (!d) return;
        const sec = globalThis.discipleOverlay.box.querySelector('.disciple-stats-combat');
        if (!sec) return;
        const lvl = sec.querySelector('.combat-level');
        if (lvl) lvl.textContent = `Level ${d.combatLevel}`;
      }
    };

    const d = new Disciple({ id: 1 });
    initializeDisciple(d, { allowInjuries: false, generateQuirks: false });
    d.combatXp = 40; // close to leveling
    sectSystem.disciples.push(d);
    ensureDiscipleSkills(d.id);
    sectState.discipleSkills[d.id].Combat = 40;
    globalThis.discipleOverlayData.disciple = d;

    addSkillXp(d, 'Combat', RAID_COMBAT_XP_REWARD);
    expect(d.combatLevel).to.equal(2);
    expect(levelRow.textContent).to.equal('Level 2');
  });
});

