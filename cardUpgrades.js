export const cardUpgradeDefinitions = {
  healOnRedraw: {
    id: 'healOnRedraw',
    name: 'Heal on Redraw +1',
    rarity: 'common',
    effect: ({ stats }) => {
      stats.healOnRedraw = (stats.healOnRedraw || 0) + 1;
    }
  },
  hpPerKill: {
    id: 'hpPerKill',
    name: 'HP per Kill +1',
    rarity: 'common',
    effect: ({ stats, pDeck }) => {
      stats.hpPerKill += 1;
      pDeck.forEach(c => (c.hpPerKill = stats.hpPerKill));
    }
  },
  attackSpeedReduction: {
    id: 'attackSpeedReduction',
    name: 'Attack Speed Reduction',
    rarity: 'uncommon',
    effect: ({ stats }) => {
      stats.attackSpeed = Math.max(1000, stats.attackSpeed - 100);
    }
  },
  redrawCooldownReduction: {
    id: 'redrawCooldownReduction',
    name: 'Redraw Cooldown Reduction',
    rarity: 'rare',
    effect: ({ stats }) => {
      stats.redrawCooldownReduction += 0.1;
    }
  },
  extraCardSlot: {
    id: 'extraCardSlot',
    name: 'Extra Card Slot',
    rarity: 'super-rare',
    effect: ({ stats }) => {
      stats.cardSlots += 1;
    }
  },
  hpMultiplier: {
    id: 'hpMultiplier',
    name: 'HP Multiplier x1.1',
    rarity: 'common',
    effect: ({ stats, updateAllCardHp }) => {
      stats.hpMultiplier = (stats.hpMultiplier || 1) * 1.1;
      if (typeof updateAllCardHp === 'function') updateAllCardHp();
    }
  },
  damageMultiplier: {
    id: 'damageMultiplier',
    name: 'Damage Multiplier x1.1',
    rarity: 'common',
    effect: ({ stats }) => {
      stats.extraDamageMultiplier = (stats.extraDamageMultiplier || 1) * 1.1;
    }
  },
  drawPointsIncrease: {
    id: 'drawPointsIncrease',
    name: 'Draw Points +10%',
    rarity: 'common',
    effect: ({ stats }) => {
      stats.drawPointsMult = (stats.drawPointsMult || 1) * 1.1;
    }
  },
  damageBuff30s: {
    id: 'damageBuff30s',
    name: 'Damage Buff 30s',
    rarity: 'uncommon',
    noLevel: true,
    effect: ({ stats, updateActiveEffects }) => {
      const now = Date.now();
      const expiry = now + 30000;
      stats.damageBuffMultiplier = 1.3;
      stats.damageBuffExpiration = Math.max(stats.damageBuffExpiration || 0, expiry);
      updateActiveEffects?.();
      setTimeout(() => {
        if (Date.now() >= stats.damageBuffExpiration) {
          stats.damageBuffMultiplier = 1;
          updateActiveEffects?.();
        }
      }, expiry - now);
    }
  },
  // Prestige unlocked upgrades
  maxMana: {
    id: 'maxMana',
    name: 'Max Mana +10',
    rarity: 'uncommon',
    prestige: true,
    effect: ({ stats }) => {
      stats.maxMana += 10;
    }
  },
  manaRegen: {
    id: 'manaRegen',
    name: 'Mana Regeneration +0.1',
    rarity: 'uncommon',
    prestige: true,
    effect: ({ stats }) => {
      stats.manaRegen += 0.1;
    }
  },
  abilityPower: {
    id: 'abilityPower',
    name: 'Ability Power +5%',
    rarity: 'rare',
    prestige: true,
    effect: ({ stats }) => {
      stats.abilityPower = (stats.abilityPower || 1) + 0.05;
    }
  },
  spadeDamageMultiplier: {
    id: 'spadeDamageMultiplier',
    name: 'Spade Damage Multiplier +5%',
    rarity: 'rare',
    prestige: true,
    effect: ({ stats }) => {
      stats.spadeDamageMultiplier = (stats.spadeDamageMultiplier || 1) + 0.05;
    }
  },
  heartHpMultiplier: {
    id: 'heartHpMultiplier',
    name: 'Heart HP Multiplier +5%',
    rarity: 'rare',
    prestige: true,
    effect: ({ stats, updateAllCardHp }) => {
      stats.heartHpMultiplier = (stats.heartHpMultiplier || 1) + 0.05;
      if (typeof updateAllCardHp === 'function') updateAllCardHp();
    }
  },
  clubsPlaceholder: {
    id: 'clubsPlaceholder',
    name: 'Clubs Placeholder',
    rarity: 'uncommon',
    prestige: true,
    effect: () => {}
  },
  diamondCashMultiplier: {
    id: 'diamondCashMultiplier',
    name: 'Diamond Cash Multiplier +5%',
    rarity: 'rare',
    prestige: true,
    effect: ({ stats }) => {
      stats.diamondCashMultiplier = (stats.diamondCashMultiplier || 1) + 0.05;
    }
  }
};

export const upgrades = {
  // Unlocked from start
  globalDamage: {
    name: 'Global Damage Multiplier',
    level: 0,
    baseValue: 1.0,
    unlocked: true,
    costFormula: level => 100 * level ** 1.2,
    effect: ({ stats }) => {
      stats.upgradeDamageMultiplier =
        upgrades.globalDamage.baseValue + 0.15 * upgrades.globalDamage.level;
    }
  },
  cardHpPerKill: {
    name: 'Card HP per Kill',
    level: 0,
    baseValue: 1,
    unlocked: true,
    costFormula: level => 150 * level ** 2,
    effect: ({ stats, pDeck }) => {
      stats.hpPerKill =
        upgrades.cardHpPerKill.baseValue + upgrades.cardHpPerKill.level;
      if (pDeck) pDeck.forEach(card => (card.hpPerKill = stats.hpPerKill));
    }
  },
  baseCardHp: {
    name: 'Base Card HP Boost',
    level: 0,
    baseValue: 0,
    unlocked: true,
    costFormula: level => 100 * level ** 1.2,
    effect: ({ stats, pDeck }) => {
      const prev = stats.baseCardHpBoost || 0;
      const newBoost = 3 * upgrades.baseCardHp.level;
      const diff = newBoost - prev;
      stats.baseCardHpBoost = newBoost;
      if (pDeck) {
        pDeck.forEach(card => {
          card.baseHpBoost = (card.baseHpBoost || 0) + diff;
          card.maxHp = Math.round(card.maxHp + diff);
          card.currentHp = Math.round(card.currentHp + diff);
        });
      }
    }
  },

  // Locked at start
  autoAttackSpeed: {
    name: 'Auto-Attack Speed',
    level: 0,
    baseValue: 5000,
    unlocked: false,
    unlockCondition: ({ stageData }) => stageData.stage >= 10,
    costFormula: level => Math.floor(300 * level ** 2),
    effect: ({ stats }) => {
      const lvl = upgrades.autoAttackSpeed.level;
      const base = upgrades.autoAttackSpeed.baseValue;
      const fastReduction = 500 * Math.min(lvl, 4);
      const diminishing = 250 * Math.max(lvl - 4, 0);
      stats.attackSpeed = Math.max(2000, base - fastReduction - diminishing);
    }
  },
  /* maxMana and manaRegen upgrades were previously implemented as card
     upgrades. Removing duplicates to avoid conflicting behavior. */
  abilityCooldownReduction: {
    name: 'Ability Cooldown Reduction',
    level: 0,
    baseValue: 0,
    unlocked: false,
    unlockCondition: ({ stageData }) => stageData.stage >= 10,
    costFormula: level => 200 * level ** 2,
    effect: ({ stats }) => {
      stats.abilityCooldownReduction = upgrades.abilityCooldownReduction.level * 0.05;
    }
  },
  jokerCooldownReduction: {
    name: 'Joker Cooldown Reduction',
    level: 0,
    baseValue: 0,
    unlocked: false,
    unlockCondition: ({ stageData }) => stageData.stage >= 12,
    costFormula: level => 200 * level ** 2,
    effect: ({ stats }) => {
      stats.jokerCooldownReduction = upgrades.jokerCooldownReduction.level * 0.05;
    }
  },
  // redrawCooldownReduction upgrade handled via card upgrades
}; 

const rarityCostMultiplier = {
  common: 1,
  uncommon: 1.5,
  rare: 2,
  'super-rare': 3
};

const rarityWeights = {
  common: 60,
  uncommon: 25,
  rare: 10,
  'super-rare': 5
};

export const unlockedCardUpgrades = [
  'healOnRedraw',
  'hpPerKill',
  'attackSpeedReduction',
  'redrawCooldownReduction',
  'extraCardSlot',
  'drawPointsIncrease',
  'damageBuff30s'
];

export const upgradeLevels = {};

let activeCardUpgrades = [];

export function removeActiveUpgrade(id) {
  activeCardUpgrades = activeCardUpgrades.filter(a => a !== id);
}

export function unlockCardUpgrade(id) {
  if (!unlockedCardUpgrades.includes(id)) {
    unlockedCardUpgrades.push(id);
  }
}

function weightedRandomId() {
  const weighted = [];
  unlockedCardUpgrades.forEach(id => {
    const def = cardUpgradeDefinitions[id];
    const weight = rarityWeights[def.rarity] || 1;
    for (let i = 0; i < weight; i++) weighted.push(id);
  });
  if (!weighted.length) return null;
  return weighted[Math.floor(Math.random() * weighted.length)];
}

export function rollNewCardUpgrades(count = 2) {
  const chosen = new Set();
  while (chosen.size < count && unlockedCardUpgrades.length > 0) {
    const id = weightedRandomId();
    if (id) chosen.add(id);
  }
  activeCardUpgrades = Array.from(chosen);
  return activeCardUpgrades;
}

export function createUpgradeCard(id) {
  return { upgradeId: id };
}

export function getCardUpgradeCost(id, stats = {}, stageData = {}) {
  const def = cardUpgradeDefinitions[id];
  if (!def) return 0;
  const rarityMult = rarityCostMultiplier[def.rarity] || 1;
  const kills = Math.floor(Math.random() * 6) + 10; // 10-15 kills
  const points = stats.points || 30;
  const baseReward = Math.floor(points * (1 + Math.sqrt(stageData.stage || 1)));
  return Math.floor(baseReward * kills * rarityMult);
}

export function addActiveUpgradeCardsToDeck(deck) {
  activeCardUpgrades.forEach(id => {
    deck.push(createUpgradeCard(id));
  });
}

export function applyCardUpgrade(id, context) {
  const def = cardUpgradeDefinitions[id];
  if (!def) return;
  if (!def.noLevel) {
    if (!upgradeLevels[id]) upgradeLevels[id] = 0;
    upgradeLevels[id] += 1;
  }
  def.effect(context);
}

export function renderCardUpgrades(container, options = {}) {
  if (!container) return;
  const { stats = {}, stageData = {}, cash = 0, onPurchase = null } = options;
  container.innerHTML = '';
  const ids = new Set([...activeCardUpgrades, ...Object.keys(upgradeLevels)]);
  ids.forEach(id => {
    const def = cardUpgradeDefinitions[id];
    const level = upgradeLevels[id] || 0;
    const cost = getCardUpgradeCost(id, stats, stageData);
    const wrapper = document.createElement('div');
    wrapper.classList.add('card-wrapper');
    wrapper.dataset.id = id;
    const card = document.createElement('div');
    card.classList.add('card', 'upgrade-card');
    card.innerHTML = `
      <div class="card-suit"><i data-lucide="sword"></i></div>
      <div class="card-desc">${def.name} (Lv. ${level})</div>
    `;
    wrapper.appendChild(card);
    const btn = document.createElement('button');
    btn.textContent = `Buy $${cost}`;
    btn.disabled = cash < cost || !onPurchase;
    btn.addEventListener('click', () => {
      if (!onPurchase) return;
      wrapper.classList.add('purchasing');
      setTimeout(() => onPurchase(id, cost), 300);
    });
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  });
}

export function getActiveCardUpgrades() {
  return activeCardUpgrades;
}
