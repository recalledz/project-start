import assert from 'node:assert/strict';
import { LifeGame, Activity } from '../lifeCore.js';

describe('Life activities', () => {
  let game;
  beforeEach(() => {
    game = new LifeGame();
    game.addActivity(new Activity('ponder', { skill: 'mentalAcuity', resource: 'thought', rate: 1, tags: ['mental'], stamina: 1 }));
    game.addActivity(new Activity('read', { skill: 'literacy', resource: 'knowledge', rate: 0.2, xpRate: 0.1, stamina: -1, unlock: g => g.skills.mentalAcuity.level >= 1 }));
  });

  it('simulates ponder for N ticks', () => {
    game.start('ponder');
    for (let i = 0; i < 5; i++) game.tick(1);
    assert.equal(game.resources.thought.amount, 5);
  });

  it('levels up mental acuity and unlocks read', () => {
    game.start('ponder');
    for (let i = 0; i < 10; i++) game.tick(1);
    assert.equal(game.skills.mentalAcuity.level, 1);
    const readAct = game.activities.read;
    assert.ok(readAct.unlock(game));
  });
});
