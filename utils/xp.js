// Constants tuned so an average card levels roughly once every 18 kills
export const XP_KILL_BASE = 0.389;
export const XP_KILL_EPSILON = 0.007;
export const XP_EFFICIENCY = 0.5; // deck cards gain half XP when not drawn

export function xpRequirement(value, level) {
  return value * (level ** 2);
}

export function effectiveLevel(stage, world) {
  return stage + 10 * (world - 1);
}

export function calculateKillXp(stage, world) {
  const level = effectiveLevel(stage, world);
  return XP_KILL_BASE * (level ** 2) / (1 + XP_KILL_EPSILON * (level - 1));
}
