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
  }
};

export function strengthXpMultiplier(task) {
  const affected = ['Log Pine', 'Mining', 'Smithing'];
  return affected.includes(task) ? 1 + attributes.Strength.points * 0.1 : 1;
}

export function enduranceXpMultiplier(task) {
  const affected = ['Building', 'Defending', 'Combat'];
  return affected.includes(task) ? 1 + attributes.Endurance.points * 0.1 : 1;
}

export function dexterityXpMultiplier(task) {
  const affected = ['Woodcutting', 'Gather Fruit'];
  return affected.includes(task) ? 1 + attributes.Dexterity.points * 0.1 : 1;
}

export function intelligenceXpMultiplier(task) {
  const affected = ['Chant', 'Research'];
  return affected.includes(task) ? 1 + attributes.Intelligence.points * 0.1 : 1;
}
