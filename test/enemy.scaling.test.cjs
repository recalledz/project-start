const { expect } = require('chai');
let calculateEnemyHp;
let calculateEnemyBasicDamage;
let calculateRelativeEnemyStats;
let assignEnemyStats;
before(async () => {
  const mod = await import('../enemySpawning.js');
  calculateEnemyHp = mod.calculateEnemyHp;
  calculateEnemyBasicDamage = mod.calculateEnemyBasicDamage;
  calculateRelativeEnemyStats = mod.calculateRelativeEnemyStats;
  assignEnemyStats = mod.assignEnemyStats;
});

describe('🧮 Enemy Scaling Functions', () => {
  describe('calculateEnemyHp', () => {
    const cases = [
      { stage: 1, world: 1, hp: 11 },
      { stage: 1, world: 2, hp: 153 },
      { stage: 5, world: 1, hp: 88 },
      { stage: 5, world: 2, hp: 294 },
      { stage: 10, world: 1, hp: 251 },
      { stage: 10, world: 2, hp: 539 },
      { stage: 15, world: 1, hp: 491 },
      { stage: 15, world: 2, hp: 862 }
    ];

    cases.forEach(({ stage, world, hp }) => {
      it(`stage ${stage} world ${world} => ${hp} HP`, () => {
        expect(calculateEnemyHp(stage, world)).to.equal(hp);
      });
    });
  });

  describe('calculateEnemyBasicDamage', () => {
    const cases = [
      { stage: 1, world: 1, min: 2, max: 2 },
      { stage: 1, world: 2, min: 12, max: 23 },
      { stage: 5, world: 1, min: 4, max: 6 },
      { stage: 5, world: 2, min: 16, max: 31 },
      { stage: 10, world: 1, min: 6, max: 11 },
      { stage: 10, world: 2, min: 21, max: 41 },
      { stage: 15, world: 1, min: 9, max: 16 },
      { stage: 15, world: 2, min: 26, max: 51 }
    ];

    cases.forEach(({ stage, world, min, max }) => {
      it(`stage ${stage} world ${world} => damage ${min}-${max}`, () => {
        const result = calculateEnemyBasicDamage(stage, world);
        expect(result).to.deep.equal({ minDamage: min, maxDamage: max });
      });
    });
  });

  describe('calculateRelativeEnemyStats', () => {
    const cases = [
      { stage: 1, world: 1, hp: 23, dmg: 2 },
      { stage: 5, world: 1, hp: 83, dmg: 6 },
      { stage: 1, world: 2, hp: 345, dmg: 23 }
    ];
    cases.forEach(({ stage, world, hp, dmg }) => {
      it(`stage ${stage} world ${world} => hp ${hp} dmg ${dmg}`, () => {
        const res = calculateRelativeEnemyStats(stage, world);
        expect(res).to.deep.equal({ hp, damage: dmg });
      });
    });
  });

  describe('assignEnemyStats', () => {
    const Enemy = function () {
      this.maxHp = 0;
      this.currentHp = 0;
      this.minDamage = 0;
      this.maxDamage = 0;
      this.damage = 0;
    };
    it('applies stats to the enemy instance', () => {
      const enemy = new Enemy();
      assignEnemyStats(enemy, 1, 1);
      expect(enemy).to.deep.equal({
        maxHp: 23,
        currentHp: 23,
        minDamage: 2,
        maxDamage: 2,
        damage: 2
      });
    });
  });
});
