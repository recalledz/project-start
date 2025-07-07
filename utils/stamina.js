export const BASE_STAMINA = 10;
export const BASE_REGEN_PER_SEC = 0.1;

export function calculateMaxStamina(endurance) {
  return BASE_STAMINA * (1 + 0.05 * (endurance - 1));
}

export function calculateStaminaRegen(endurance) {
  return BASE_REGEN_PER_SEC * (1 + 0.01 * (endurance - 1));
}
