export const BODY_PARTS = [
  { key: 'head', label: 'Head', contribution: 0.2, vital: true },
  { key: 'leftEye', label: 'Left Eye', contribution: 0.025, vital: false },
  { key: 'rightEye', label: 'Right Eye', contribution: 0.025, vital: false },
  { key: 'vocalSac', label: 'Vocal Sac', contribution: 0.05, vital: false },
  { key: 'leftHand', label: 'Left Hand', contribution: 0.05, vital: false },
  { key: 'rightHand', label: 'Right Hand', contribution: 0.05, vital: false },
  { key: 'leftLeg', label: 'Left Leg', contribution: 0.05, vital: false },
  { key: 'rightLeg', label: 'Right Leg', contribution: 0.05, vital: false },
  { key: 'belly', label: 'Belly', contribution: 0.1, vital: false },
  { key: "meridians", label: "Inner Meridians", contribution: 0.1, vital: false },
];

export const INJURY_TIERS = [
  { key: 'bruise', rate: 0.5, heals: true },
  { key: 'wound', rate: 1.0, heals: true },
  { key: 'destroyed', rate: 0, heals: false }
];

export function ensureInjuryState(d) {
  if (!d.injuries) d.injuries = {};
  BODY_PARTS.forEach(p => {
    if (!d.injuries[p.key]) {
      d.injuries[p.key] = { tier: null, progress: 0 };
    }
  });
}

export function calculateMaxHealth(d) {
  ensureInjuryState(d);
  const base = d.maxHp;
  let hp = 0;
  BODY_PARTS.forEach(p => {
    const state = d.injuries[p.key];
    if (state.tier !== 'destroyed') hp += base * p.contribution;
  });
  return Math.round(hp);
}

export function applyInjury(d, partKey, tier) {
  ensureInjuryState(d);
  const part = d.injuries[partKey];
  if (!part) return;
  const currentIndex = INJURY_TIERS.findIndex(t => t.key === part.tier);
  const newIndex = INJURY_TIERS.findIndex(t => t.key === tier);
  if (newIndex > currentIndex) {
    part.tier = tier;
    part.progress = 0;
  }
}

export function tickInjuries(d, dt, resilience = 0) {
  ensureInjuryState(d);
  const resting = (d.currentTask || '') === 'Resting';
  BODY_PARTS.forEach(p => {
    const state = d.injuries[p.key];
    if (!state.tier || state.tier === 'destroyed') return;
    const tierInfo = INJURY_TIERS.find(t => t.key === state.tier);
    let rate = tierInfo.rate;
    if (resting) rate -= 2;
    const recover = resilience - rate;
    state.progress = Math.max(0, state.progress + rate * dt);
    if (recover > 0) state.progress = Math.max(0, state.progress - recover * dt);
    if (state.progress >= 100 && tierInfo.key !== 'destroyed') {
      const nextIndex = INJURY_TIERS.indexOf(tierInfo) + 1;
      state.tier = INJURY_TIERS[Math.min(nextIndex, INJURY_TIERS.length - 1)].key;
      state.progress = 0;
    }
  });
  d.health = calculateMaxHealth(d);
}
