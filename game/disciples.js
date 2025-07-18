import { stats } from './state.js';
import { discipleAttackTimers } from "./combat.js";
import { handContainer, renderCombatDisciples } from "./ui.js";

export function init() {}

// Active disciples engaged in combat
export let activeDisciples = [];

// Functions to manage which disciples are active in combat
export function selectDisciple(d) {
  if (!activeDisciples.includes(d) && activeDisciples.length < stats.cardSlots) {
    activeDisciples.push(d);
    discipleAttackTimers[d.id] = 0;
    renderCombatDisciples();
  }
}

export function deselectDisciple(d) {
  const idx = activeDisciples.indexOf(d);
  if (idx >= 0) activeDisciples.splice(idx, 1);
  delete discipleAttackTimers[d.id];
  renderCombatDisciples();
}

export function clearActiveDisciples() {
  activeDisciples.length = 0;
  for (const k in discipleAttackTimers) delete discipleAttackTimers[k];
  if (handContainer) handContainer.innerHTML = '';
}
