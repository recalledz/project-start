import { calculateMaxWater } from '../utils/water.js';

// Upgrade definitions grouped by rarity
export const UPGRADES = [
  // Common
  {
    id: 'melee-damage-10',
    name: '10% melee damage',
    rarity: 'common',
    apply(d) {
      d.meleeDamageMult = (d.meleeDamageMult || 1) * 1.1;
    }
  },
  {
    id: 'spell-potency-10',
    name: '10% spell potency',
    rarity: 'common',
    apply(d) {
      d.spellPotency = (d.spellPotency || 1) * 1.1;
    }
  },
  {
    id: 'crit-damage-10',
    name: '10% crit damage',
    rarity: 'common',
    apply(d) {
      d.critDamageMult = (d.critDamageMult || 1) * 1.1;
    }
  },
  {
    id: 'work-speed-10',
    name: '10% work speed',
    rarity: 'common',
    apply(d) {
      d.workSpeedMult = (d.workSpeedMult || 1) * 1.1;
    }
  },
  {
    id: 'metamorph-speed-10',
    name: '10% metamorph speed',
    rarity: 'common',
    apply(d) {
      d.metamorphSpeedMult = (d.metamorphSpeedMult || 1) * 1.1;
    }
  },

  // Uncommon
  {
    id: 'base-mood-5',
    name: '5 base mood',
    rarity: 'uncommon',
    apply(d) {
      d.baseMoodBonus = (d.baseMoodBonus || 0) + 5;
    }
  },
  {
    id: 'attack-speed-10',
    name: '10% attack speed',
    rarity: 'uncommon',
    apply(d) {
      d.attackSpeedMult = (d.attackSpeedMult || 1) * 1.1;
    }
  },
  {
    id: 'max-water-10',
    name: '10% max water',
    rarity: 'uncommon',
    apply(d) {
      d.maxWaterBonus = (d.maxWaterBonus || 0) + calculateMaxWater(0) * 0.1;
    }
  },
  {
    id: 'crit-chance-5',
    name: '5% crit chance',
    rarity: 'uncommon',
    apply(d) {
      d.critChanceBonus = (d.critChanceBonus || 0) + 0.05;
    }
  },
  {
    id: 'metamorph-speed-20',
    name: '20% metamorph speed',
    rarity: 'uncommon',
    apply(d) {
      d.metamorphSpeedMult = (d.metamorphSpeedMult || 1) * 1.2;
    }
  },
  {
    id: 'water-spell-cost-10',
    name: 'Reduced water spell cost 10%',
    rarity: 'uncommon',
    apply(d) {
      d.waterSpellCostMult = (d.waterSpellCostMult || 1) * 0.9;
    }
  },

  // Rare
  {
    id: 'metamorph-speed-40',
    name: '40% metamorph speed',
    rarity: 'rare',
    apply(d) {
      d.metamorphSpeedMult = (d.metamorphSpeedMult || 1) * 1.4;
    }
  },
  {
    id: 'max-water-20',
    name: '20% max water',
    rarity: 'rare',
    apply(d) {
      d.maxWaterBonus = (d.maxWaterBonus || 0) + calculateMaxWater(0) * 0.2;
    }
  },
  {
    id: 'water-barrier-spell',
    name: 'Water barrier spell',
    rarity: 'rare',
    apply(d) {
      d.waterBarrierSpell = true;
    }
  },
  {
    id: 'iron-tongue-spell',
    name: 'Iron tongue spell',
    rarity: 'rare',
    apply(d) {
      d.ironTongueSpell = true;
    }
  },
  {
    id: 'blizzard-spell',
    name: 'Blizzard spell',
    rarity: 'rare',
    apply(d) {
      d.blizzardSpell = true;
    }
  }
];

const RARITY_WEIGHTS = {
  common: 0.7,
  uncommon: 0.2,
  rare: 0.09
};

function pickRarity(rng = Math.random) {
  const r = rng();
  let acc = 0;
  for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS)) {
    acc += weight;
    if (r < acc) return rarity;
  }
  return 'common';
}

export function getRandomUpgrades(count = 3, rng = Math.random) {
  const results = [];
  const used = new Set();
  while (results.length < count) {
    const rarity = pickRarity(rng);
    const pool = UPGRADES.filter(u => u.rarity === rarity && !used.has(u.id));
    if (pool.length === 0) continue;
    const choice = pool[Math.floor(rng() * pool.length)];
    results.push(choice);
    used.add(choice.id);
  }
  return results;
}

export function applyUpgradeById(d, meta, id) {
  const upgrade = UPGRADES.find(u => u.id === id);
  if (!upgrade) return;
  upgrade.apply(d);
  if (meta && Array.isArray(meta.upgrades)) meta.upgrades.push(id);
}
