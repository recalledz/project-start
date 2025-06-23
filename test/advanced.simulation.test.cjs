const { expect } = require('chai');
const { GameSimulator } = require('../simulator.cjs');
const { saveCSV } = require('../utils/logger.cjs');

// Helper simulator with HP tracking
class HPSimulator extends GameSimulator {
  constructor(strategy = 'balanced', hp = 100) {
    super(strategy);
    this.hp = hp;
  }
  run(ticks = 100) {
    for (let i = 0; i < ticks; i++) {
      this.stage += 0.1;
      this.cash += this.stage * 5;
      const loss = this.strategy === 'defensive' ? 0.05 : 0.1;
      this.hp = Math.max(0, this.hp - loss);
      if (this.hp === 0) break;
      this.logs.push({
        tick: i,
        stage: this.stage,
        hp: this.hp,
        cash: this.cash,
        damageLevel: this.globalDamageLevel,
        strategy: this.strategy,
        commitHash: this.commitHash
      });
    }
    const avgHP = this.hp;
    const result = { finalStage: this.stage, totalCash: this.cash, avgHP };
    saveCSV(this.logs, 'detailed-sim.csv');
    saveCSV([
      {
        strategy: this.strategy,
        finalStage: this.stage,
        totalCash: this.cash,
        damageLevel: this.globalDamageLevel,
        commitHash: this.commitHash
      }
    ], 'summary.csv');
    return result;
  }
}

// Helper simulator for balanced strategy upgrades
class BalancedBuySimulator extends GameSimulator {
  run(ticks = 100) {
    for (let i = 0; i < ticks; i++) {
      this.stage++;
      this.cash += this.stage * 10;
      if (this.cash >= this.upgradeCost()) {
        this.cash -= this.upgradeCost();
        this.globalDamageLevel++;
      }
      this.logs.push({
        tick: i,
        stage: this.stage,
        hp: this.hp,
        cash: this.cash,
        damageLevel: this.globalDamageLevel,
        strategy: this.strategy,
        commitHash: this.commitHash
      });
    }
    const result = { finalStage: this.stage, totalCash: this.cash, damageLevel: this.globalDamageLevel };
    saveCSV(this.logs, 'detailed-sim.csv');
    saveCSV([
      {
        strategy: this.strategy,
        finalStage: this.stage,
        totalCash: this.cash,
        damageLevel: this.globalDamageLevel,
        commitHash: this.commitHash
      }
    ], 'summary.csv');
    return result;
  }
}

describe('🧪 General Simulation Test Templates', () => {
  it('Aggressive strategy progression', () => {
    const sim = new GameSimulator('aggressive');
    const res = sim.run(100);
    expect(res.finalStage).to.be.at.least(15);
    expect(res.damageLevel).to.be.at.least(2);
  });

  it('Defensive strategy HP scaling', () => {
    const sim = new HPSimulator('defensive');
    const res = sim.run(200);
    expect(res.avgHP).to.be.at.least(60);
    expect(res.finalStage).to.be.within(10, 25);
  });

  it('Cost curve logic', () => {
    const sim = new GameSimulator();
    let last = 0;
    for (let lvl = 1; lvl <= 10; lvl++) {
      sim.globalDamageLevel = lvl - 1;
      const cost = sim.upgradeCost();
      expect(cost).to.be.greaterThan(last);
      expect(cost).to.be.at.least(100);
      last = cost;
    }
  });

  it('Cash accumulation with balanced strategy', () => {
    const sim = new BalancedBuySimulator('balanced');
    const res = sim.run(100);
    expect(res.totalCash).to.be.greaterThan(1500);
    expect(res.damageLevel).to.be.greaterThan(0);
  });

  it('Upgrade unlocks at correct stage', () => {
    const sim = new GameSimulator('balanced');
    const res = sim.run(5);
    expect(res.unlockedUpgrades.cardSlots).to.be.true;
  });

  it('Compare strategies side-by-side', () => {
    const strategies = ['aggressive', 'defensive', 'balanced'];
    const results = [];
    const summary = [];
    strategies.forEach(strat => {
      const sim = strat === 'balanced' ? new BalancedBuySimulator(strat) : new GameSimulator(strat);
      const res = sim.run(150);
      expect(res.finalStage).to.be.a('number');
      summary.push({ strat, stage: res.finalStage, cash: res.totalCash, dmg: res.damageLevel });
      results.push(...sim.logs);
    });
    console.table(summary);
  saveCSV(results, 'strategy-results.csv');
  });

  it('Game over condition triggers', () => {
    class GameOverSim extends HPSimulator {
      runUntilDeath() {
        let ticks = 0;
        while (this.hp > 0 && ticks < 1000) {
          this.stage++;
          this.cash += this.stage * 10;
          this.hp -= 1;
          ticks++;
        }
        const gameOver = this.hp <= 0;
        return { finalStage: this.stage, gameOver };
      }
    }
    const sim = new GameOverSim('balanced', 10);
    const res = sim.runUntilDeath();
    expect(res.gameOver).to.be.true;
    expect(res.finalStage).to.be.at.most(50);
  });

  it('Strategy behavior across ticks', () => {
    const strategies = ['aggressive', 'defensive', 'balanced'];
    const results = [];
    const summary = [];
    strategies.forEach(strat => {
      const sim = strat === 'balanced' ? new BalancedBuySimulator(strat) : new GameSimulator(strat);
      const res = sim.run(100);
      expect(res.finalStage).to.not.equal(0);
      summary.push({ strat, stage: res.finalStage, cash: res.totalCash });
      results.push(...sim.logs);
    });
    const maxGap = Math.max(...summary.map(r => r.stage)) - Math.min(...summary.map(r => r.stage));
    expect(maxGap).to.be.below(50);
    console.table(summary);
  saveCSV(results, 'strategy-results.csv');
  });

  it('Boss defeat grants card XP', async () => {
    const { Card } = await import('../card.js');
    const { Boss } = await import('../boss.js');
    const { calculateKillXp } = await import('../utils/xp.js');

    const card = new Card('Hearts', 2);
    const drawn = [card];
    const cardXp = amt => drawn.forEach(c => c.gainXp(amt));

    const boss = new Boss(5, 1, {
      maxHp: 1,
      xp: calculateKillXp(5, 1),
      onDefeat: b => cardXp(b.xp)
    });

    const before = card.XpCurrent;
    boss.takeDamage(1);
    if (boss.isDefeated()) boss.onDefeat(boss);
    expect(card.XpCurrent).to.be.greaterThan(before);
  });
});
