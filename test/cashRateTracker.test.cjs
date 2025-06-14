const { expect } = require('chai');

describe('💰 CashRateTracker', () => {
  it('calculates cash per second over sliding window', async () => {
    const { CashRateTracker } = await import('../utils/trackers.js');
    const tracker = new CashRateTracker(5000); // 5s window

    tracker.record(0, 0);
    tracker.record(10, 1000); // +10 after 1s
    tracker.record(20, 2000); // +10 after another 1s

    const rate1 = tracker.getRate(2000, 20);
    expect(rate1).to.be.closeTo(10, 0.001);

    tracker.record(30, 6000); // +10 after 4s; first sample (0) is out of window
    const rate2 = tracker.getRate(6000, 30);
    // now window from t=1000..6000: cash 10->30 over 5s => 4/sec
    expect(rate2).to.be.closeTo(4, 0.001);
  });
});
