import Disciple from '../game/disciple.js';
import { calculateMaxWater } from './water.js';
import { sectState } from '../game/state.js';
import { ensureInjuryState } from '../game/injury.js';

export function initializeDisciple(d) {
  if (!d) return d;
  if (d.health === undefined) d.health = 10;
  if (d.stamina === undefined) d.stamina = 10;
  if (d.water === undefined) d.water = calculateMaxWater(0);
  if (d.waterSenseXp === undefined) d.waterSenseXp = 0;
  if (d.hunger === undefined) d.hunger = 20;
  if (d.power === undefined) d.power = 1;
  if (d.strength === undefined) d.strength = 1;
  if (d.dexterity === undefined) d.dexterity = 1;
  if (d.endurance === undefined) d.endurance = 1;
  if (d.intelligence === undefined) d.intelligence = 1;
  if (d.charisma === undefined) d.charisma = 1;
  if (d.potential === undefined) d.potential = 1;
  if (d.globalLevel === undefined) d.globalLevel = 0;
  if (d.combatXp === undefined) d.combatXp = 0;
  if (d.baseStrength === undefined) d.baseStrength = d.strength;
  if (d.baseDexterity === undefined) d.baseDexterity = d.dexterity;
  if (d.baseEndurance === undefined) d.baseEndurance = d.endurance;
  if (d.baseIntelligence === undefined) d.baseIntelligence = d.intelligence;
  if (d.baseCharisma === undefined) d.baseCharisma = d.charisma;
  if (d.basePotential === undefined) d.basePotential = d.potential;
  if (d.incapacitated === undefined) d.incapacitated = false;
  if (!d.name) d.name = `Disciple ${d.id}`;
  if (d.inventorySlots === undefined) d.inventorySlots = 10;
  if (!d.inventory) d.inventory = {};
  if (d.combatLevel === undefined) d.combatLevel = 1;
  if (d.maxHp === undefined) d.maxHp = 10;
  if (d.currentHp === undefined) d.currentHp = d.maxHp;
  if (d.foundationXp === undefined) d.foundationXp = 0;
  if (d.lastTab === undefined) d.lastTab = 'general';
  ensureInjuryState(d);
  if (!sectState.discipleMetamorphosis[d.id]) {
    sectState.discipleMetamorphosis[d.id] = {
      xp: 0,
      stage: 0,
      meditating: false
    };
  }
  if (sectState.disciplePaths[d.id] === undefined) {
    sectState.disciplePaths[d.id] = null;
  }
  Object.setPrototypeOf(d, Disciple.prototype);
  if (typeof d.updateCombatStats === 'function') d.updateCombatStats();
  return d;
}
