export const attributes = {
  Strength: {
    points: 0,
    get meleeDamageMultiplier() {
      return 1 + 0.05 * this.points;
    },
    get inventorySlots() {
      return Math.floor(this.points / 2);
    }
  },
  Endurance: {
    points: 0,
    get staminaMultiplier() {
      return 1 + 0.05 * this.points;
    },
    get staminaRegenMultiplier() {
      return 1 + 0.01 * this.points;
    },
    get hpBonus() {
      return 10 * this.points;
    }
  },
  Dexterity: {
    points: 0,
    get attackSpeedMultiplier() {
      return 1 + 0.05 * this.points;
    }
  },
  Intelligence: {
    points: 0,
    get constructPotencyMultiplier() {
      return 1 + 0.03 * this.points;
    }
  },
  Charisma: {
    points: 0,
    get recruitChanceMultiplier() {
      return 1 + 0.05 * this.points;
    },
    get diplomacyBonus() {
      return 1 + 0.05 * this.points;
    }
  },
  Potential: {
    value: 0,
    get innerCauldronSize() {
      return Math.round(this.value * 500);
    }
  }
};

export function strengthXpMultiplier() {
  return 1;
}

export function enduranceXpMultiplier() {
  return 1;
}

export function dexterityXpMultiplier() {
  return 1;
}

export function intelligenceXpMultiplier() {
  return 0.5 + 0.15 * attributes.Intelligence.points;
}
