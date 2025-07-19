// simulator.cjs
/* eslint-env node */
/* global process */
const { saveCSV } = require('./utils/logger.cjs');

class GameSimulator {
  constructor(strategy = "balanced") {
    this.stage = 1;
    this.cash = 0;
    this.globalDamageLevel = 0;
    this.strategy = strategy;
    this.hp = 100;
    this.logs = [];
    this.commitHash = process.env.GITHUB_SHA || "";
    // track upgrade unlocks
    this.upgrades = {
      combatSlots: { unlocked: false, unlockStage: 5 }
    };

    // analytics placeholders for future expansion
    this.tracking = {
      jokerActivations: 0,
      manaSpent: 0,
      abilityUsage: {},
      cooldownUsage: {},
      traitInteractions: {}
    };
  }

  checkUpgradeUnlocks() {
    Object.values(this.upgrades).forEach(up => {
      if (!up.unlocked && this.stage >= up.unlockStage) {
        up.unlocked = true;
      }
    });
  }

  run(ticks = 100, options = {}) {
    const { timestamp = false } = options;
    for (let i = 0; i < ticks; i++) {
      this.stage++;
      this.cash += this.stage * 10;

      if (this.strategy === "aggressive" && this.cash >= this.upgradeCost()) {
        this.cash -= this.upgradeCost();
        this.globalDamageLevel++;
      }

      this.checkUpgradeUnlocks();

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

    const result = {
      finalStage: this.stage,
      totalCash: this.cash,
      damageLevel: this.globalDamageLevel,
      unlockedUpgrades: Object.fromEntries(
        Object.entries(this.upgrades).map(([k, v]) => [k, v.unlocked])
      ),
      tracking: this.tracking
    };

    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const detailed = timestamp ? `sim-${this.strategy}-${now}.csv` : 'detailed-sim.csv';
    saveCSV(this.logs, detailed);
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

  upgradeCost() {
    return 200 * (this.globalDamageLevel + 1) ** 2;
  }
}

module.exports = { GameSimulator };

