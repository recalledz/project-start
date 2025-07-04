export function taskXpRequired(level) {
  return Math.round(50 * Math.pow(1.2, level));
}

export function getTaskSkillProgress(xp) {
  let total = 0;
  let level = 0;
  let next = taskXpRequired(level);
  while (xp >= total + next) {
    total += next;
    level += 1;
    next = taskXpRequired(level);
  }
  const progress = (xp - total) / next;
  return { level, progress, next };
}
