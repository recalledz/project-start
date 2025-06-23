// simulator.js
import generateDeck from "./card.js";
import { Enemy } from "./enemy.js"; // assume this works without DOM
import { Boss } from "./boss.js";
import { upgrades as allUpgrades } from "./cardUpgrades.js";
import { saveCSV } from "./utils/logger.cjs";

export class GameSimulator {
  constructor(strategy = "balanced") {
    this.stats = {
      pDamage: 5,
      hpPerKill: 1,
      baseCardHpBoost: 0,
      cardSlots: 3,
      attackSpeed: 10000,
      stage: 1,
      cash: 500,
      xp: 0,
      hp: 100,
    };
    this.deck = generateDeck();
    this.strategy = strategy;
    this.upgrades = structuredClone(allUpgrades); // safe copy
    this.logs = [];
    this.commitHash = process.env.GITHUB_SHA || "";
  }

  tick() {
    this.stats.stage += 1;
    this.stats.cash += 100 + 10 * this.stats.stage;
    this.stats.xp += 5;
    this.applyStrategy();
  }

  applyStrategy() {
    const tryBuy = key => {
      const up = this.upgrades[key];
      if (!up || !up.unlocked) return;
      const cost = up.costFormula(up.level + 1);
      if (this.stats.cash >= cost) {
        this.stats.cash -= cost;
        up.level += 1;
        up.effect({ stats: this.stats });
        this.logs.push(`Bought ${up.name} to level ${up.level}`);
      }
    };

    if (this.strategy === "aggressive") {
      tryBuy("globalDamage");
    } else if (this.strategy === "defensive") {
      tryBuy("baseCardHp");
    } else {
      tryBuy("cardHpPerKill");
    }
  }

  run(maxTicks = 100, options = {}) {
    const { timestamp = false } = options;
    for (let i = 0; i < maxTicks; i++) {
      this.tick();
      this.logs.push({
        tick: i,
        stage: this.stats.stage,
        hp: this.stats.hp ?? 0,
        cash: this.stats.cash,
        damageLevel: this.upgrades.globalDamage?.level || 0,
        strategy: this.strategy,
        commitHash: this.commitHash
      });
    }

    const now = new Date().toISOString().replace(/[:.]/g, '-');
    const detailed = timestamp ? `sim-${this.strategy}-${now}.csv` : 'detailed-sim.csv';
    saveCSV(this.logs, detailed);
    saveCSV([
      {
        strategy: this.strategy,
        finalStage: this.stats.stage,
        totalCash: this.stats.cash,
        damageLevel: this.upgrades.globalDamage?.level || 0,
        commitHash: this.commitHash
      }
    ], 'summary.csv');

    return this.logs;
  }
}
