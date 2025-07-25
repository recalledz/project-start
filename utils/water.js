// Base maximum Water disciples can hold before bonuses
export const BASE_WATER = 10;
export const BASE_REGEN_PER_SEC = 1;

export function calculateMaxWater(waterSenseLevel = 0) {
  return BASE_WATER * (1 + 0.024 * waterSenseLevel);
}

export function calculateWaterRegen(waterSenseLevel = 0) {
  return BASE_REGEN_PER_SEC * (1 + 0.05 * waterSenseLevel);
}

export function cultivationSpeedMultiplier(waterSenseLevel = 0) {
  return 1 + 0.04 * waterSenseLevel;
}
