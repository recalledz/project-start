const { expect } = require('chai');

describe('🌎 WorldProgressTracker', () => {
  it('computes weighted progress', async () => {
    const { WorldProgressTracker } = await import('../utils/trackers.js');
    const progress = { 1: { stageKills: {} } };
    const tracker = new WorldProgressTracker(progress, 10, s => s); // simple weight
    tracker.record(1, 1); // weight 1
    tracker.record(1, 2); // weight 2
    expect(tracker.compute(1)).to.be.closeTo(0.3, 0.001);
  });
});
