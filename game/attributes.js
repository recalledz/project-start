export const attributes = {
  Strength: { points: 0 },
  Endurance: { points: 0 },
  Dexterity: { points: 0 },
  Intelligence: { points: 0 },
  Charisma: { points: 0 },
  Potential: {
    value: 0,
    get innerCauldronSize() {
      return Math.round(this.value * 500);
    }
  }
};

export function intelligenceXpMultiplier() {
  return 0.5 + 0.15 * attributes.Intelligence.points;
}
