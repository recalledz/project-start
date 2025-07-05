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
  }
};

export function addStrength(points = 1) {
  attributes.Strength.points += points;
}

export function strengthXpMultiplier(task) {
  const affected = ['Woodcutting', 'Log Pine', 'Mining', 'Smithing'];
  return affected.includes(task) ? 1 + attributes.Strength.points * 0.1 : 1;
}

export function addEndurance(points = 1) {
  attributes.Endurance.points += points;
}

export function enduranceXpMultiplier(task) {
  const affected = ['Building', 'Defending', 'Combat'];
  return affected.includes(task) ? 1 + attributes.Endurance.points * 0.1 : 1;
}
