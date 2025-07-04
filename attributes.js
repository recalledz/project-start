export const attributes = {
  Strength: {
    points: 0,
    get meleeDamageMultiplier() {
      return 1 + 0.05 * this.points;
    },
    get inventorySlots() {
      return Math.floor(this.points / 2);
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
