import Disciple from '../disciple.js';
import { initializeDisciple } from './discipleInit.js';

export function initializeSect() {
  const disciples = [1, 2, 3].map(id => {
    const d = new Disciple({ id });
    initializeDisciple(d);
    return d;
  });
  return { disciples };
}
