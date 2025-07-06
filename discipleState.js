export function getDiscipleMaxStamina(d) {
  return 10 * (1 + 0.05 * (d.endurance - 1));
}

export function regenDiscipleStamina(d, dt) {
  const max = getDiscipleMaxStamina(d);
  const rate = 0.1 * (1 + 0.01 * (d.endurance - 1));
  d.stamina = Math.min(max, d.stamina + dt * rate);
}

export function consumeDiscipleStamina(d, amount) {
  d.stamina = Math.max(0, d.stamina - amount);
}
