export function generateDiscipleAttributes() {
  const attrs = ['strength', 'dexterity', 'endurance', 'intelligence', 'charisma'];
  const result = {};
  attrs.forEach(a => {
    result[a] = 3; // base value for each attribute
  });
  const points = 6; // extra points distributed randomly
  for (let i = 0; i < points; i++) {
    const idx = Math.floor(Math.random() * attrs.length);
    result[attrs[idx]] += 1;
  }
  return result;
}
