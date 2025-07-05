export function generateDiscipleAttributes() {
  const attrs = ['strength', 'dexterity', 'endurance', 'intelligence'];
  const result = { strength: 0, dexterity: 0, endurance: 0, intelligence: 0 };
  const points = Math.floor(Math.random() * 3) + 3; // 3-5 total
  for (let i = 0; i < points; i++) {
    const weights = attrs.map(a => 1 / Math.pow(result[a] + 1, 2));
    const sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let j = 0; j < attrs.length; j++) {
      r -= weights[j];
      if (r <= 0) {
        result[attrs[j]] += 1;
        break;
      }
    }
  }
  return result;
}
