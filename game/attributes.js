// Centralized attribute logic and disciple generation
// Attributes determine yields and learning across the game
export const attributes = {
  strength: 0,
  dexterity: 0,
  endurance: 0,
  intelligence: 0,
  charisma: 0,
  potential: 0
};

// Only Intelligence modifies skill XP gain
export function intelligenceXpMultiplier(intelligence = attributes.intelligence) {
  return 0.5 + 0.15 * intelligence;
}

export function generateDiscipleAttributes() {
  const base = { strength: 3, dexterity: 3, endurance: 3, intelligence: 3, charisma: 3 };
  const attrs = Object.keys(base);
  const points = 6;
  for (let i = 0; i < points; i++) {
    const idx = Math.floor(Math.random() * attrs.length);
    base[attrs[idx]] += 1;
  }
  const socialSkill = Math.floor(Math.random() * 100) + 1;
  const potential =
    socialSkill / 20 +
    (base.strength + base.dexterity + base.endurance + base.intelligence + base.charisma) / 10;
  return { ...base, potential };
}
