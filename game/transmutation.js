export const TRANSMUTES = {
  plank: {
    name: 'Plank',
    input: { softwood: 100 },
    output: { planks: 1 },
    unlocked: true
  }
};

import { sectState } from './state.js';

export function getTransmutePower() {
  const lvl = sectState.buildings.areitoCircle || 0;
  return 1 + lvl * 0.04;
}

export function canTransmute(key) {
  const def = TRANSMUTES[key];
  if (!def || !def.unlocked) return false;
  return Object.entries(def.input).every(([res, amt]) => (sectState[res] || 0) >= amt);
}

export function performTransmute(key) {
  const def = TRANSMUTES[key];
  if (!canTransmute(key)) return false;
  Object.entries(def.input).forEach(([res, amt]) => {
    sectState[res] -= amt;
  });
  const mult = getTransmutePower();
  Object.entries(def.output).forEach(([res, amt]) => {
    sectState[res] = (sectState[res] || 0) + amt * mult;
  });
  return true;
}
