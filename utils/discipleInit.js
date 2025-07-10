import Disciple from '../disciple.js';

export function initializeDisciple(d) {
  if (!d) return d;
  if (d.health === undefined) d.health = 10;
  if (d.stamina === undefined) d.stamina = 10;
  if (d.hunger === undefined) d.hunger = 20;
  if (d.power === undefined) d.power = 1;
  if (d.strength === undefined) d.strength = 1;
  if (d.dexterity === undefined) d.dexterity = 1;
  if (d.endurance === undefined) d.endurance = 1;
  if (d.intelligence === undefined) d.intelligence = 1;
  if (d.incapacitated === undefined) d.incapacitated = false;
  if (!d.name) d.name = `Disciple ${d.id}`;
  if (d.inventorySlots === undefined) d.inventorySlots = 10;
  if (!d.inventory) d.inventory = {};
  if (d.combatLevel === undefined) d.combatLevel = 1;
  if (d.maxHp === undefined) d.maxHp = 10;
  if (d.currentHp === undefined) d.currentHp = d.maxHp;
  Object.setPrototypeOf(d, Disciple.prototype);
  if (typeof d.updateCombatStats === 'function') d.updateCombatStats();
  return d;
}
