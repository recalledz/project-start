import Disciple from '../disciple.js';
import { initializeDisciple } from './discipleInit.js';
import { generateSkillAffinities, initializeStartingSkills } from '../game/affinities.js';
import { sectState } from '../game/state.js';

export function initializeSect() {
  const disciples = [1, 2, 3].map(id => {
    const d = new Disciple({ id });
    initializeDisciple(d);
    d.affinities = generateSkillAffinities();
    initializeStartingSkills(d);
    return d;
  });
  sectState.fruits = 100;
  return { disciples };
}
