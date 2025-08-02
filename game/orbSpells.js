import { sectSystem } from './sect.js';
import { sectState } from './state.js';
import { raidState } from './raids.js';
import addLog from './log.js';

export function orbDamageMultiplier() {
  return 1 + 0.2 * (sectState.buildings.orbSpellStrength || 0);
}

export function castWordOfHaste() {
  if (sectSystem.wordOfHasteCd > 0) return;
  if (sectSystem.orbs.water.current < 15) return;
  sectSystem.orbs.water.current -= 15;
  sectSystem.wordOfHasteTimer = 60;
  sectSystem.wordOfHasteCd = 60;
  addLog('Word of Haste activated!', 'info');
}

export function toggleReverberation() {
  if (sectSystem.orbReverbActive) {
    sectSystem.orbReverbActive = false;
    sectSystem.attackSpeedMult = 1;
    return;
  }
  if (sectSystem.orbs.water.current <= 0) return;
  sectSystem.orbReverbActive = true;
  sectSystem.attackSpeedMult = 1.3;
  addLog('Orb Reverberation active', 'info');
}

export function castWaterBurst() {
  if (!raidState.active || !raidState.raid) return;
  const cost = 30;
  if (sectSystem.orbs.water.current < cost) return;
  sectSystem.orbs.water.current -= cost;
  const damage = 20 * orbDamageMultiplier();
  raidState.raid.castWaterBurst(damage);
  addLog('Water Burst unleashed!', 'info');
}

export function tickOrbSpells(dt) {
  if (sectSystem.wordOfHasteTimer > 0) {
    sectSystem.wordOfHasteTimer = Math.max(0, sectSystem.wordOfHasteTimer - dt);
  }
  if (sectSystem.wordOfHasteCd > 0) {
    sectSystem.wordOfHasteCd = Math.max(0, sectSystem.wordOfHasteCd - dt);
  }
  if (sectSystem.orbReverbActive) {
    const orb = sectSystem.orbs.water;
    orb.current = Math.max(0, orb.current - dt);
    if (orb.current === 0) {
      sectSystem.orbReverbActive = false;
      sectSystem.attackSpeedMult = 1;
    }
  }
}
