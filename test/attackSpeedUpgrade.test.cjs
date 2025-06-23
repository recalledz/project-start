const { expect } = require('chai');

describe('⚙️ autoAttackSpeed Upgrade', () => {
  function setup() {
    const stats = { attackSpeed: 10000 };
    const upgrades = {
      autoAttackSpeed: {
        level: 0,
        baseValue: 10000,
        costFormula: level => Math.floor(300 * level ** 2),
        effect: player => {
          const lvl = upgrades.autoAttackSpeed.level;
          const base = upgrades.autoAttackSpeed.baseValue;
          const fast = 500 * Math.min(lvl, 4);
          const slow = 250 * Math.max(lvl - 4, 0);
          player.attackSpeed = Math.max(2000, base - fast - slow);
        }
      }
    };
    const purchase = () => {
      upgrades.autoAttackSpeed.level += 1;
      upgrades.autoAttackSpeed.effect(stats);
    };
    return { stats, upgrades, purchase };
  }

  it('reduces attack interval with each purchase', () => {
    const { stats, purchase } = setup();
    const expected = [
      9500,
      9000,
      8500,
      8000,
      7750,
      7500,
      7250,
      7000,
      6750
    ];
    expected.forEach(val => {
      purchase();
      expect(stats.attackSpeed).to.equal(val);
    });
  });
});
