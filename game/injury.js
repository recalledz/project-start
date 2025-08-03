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

export const BODY_PART_CHANCES = [
  { key: 'head', chance: 5 },
  { key: 'leftEye', chance: 2 },
  { key: 'rightEye', chance: 2 },
  { key: 'vocalSac', chance: 10 },
  { key: 'belly', chance: 15 },
  { key: 'leftHand', chance: 5 },
  { key: 'rightHand', chance: 5 },
  { key: 'leftLeg', chance: 10 },
  { key: 'rightLeg', chance: 10 },
  { key: 'meridians', chance: 10 },
  { key: 'general', chance: 26 }
];

export function randomBodyPart() {
  const roll = Math.random() * 100;
  let sum = 0;
  for (const entry of BODY_PART_CHANCES) {
    sum += entry.chance;
    if (roll < sum) return entry.key;
  }
  return 'general';
}

export const INJURY_TIERS = [
  { key: 'bruise', rateRange: [0.25, 0.5], heals: true },
  { key: 'wound', rateRange: [0.5, 1.0], heals: true },
  { key: 'destroyed', rateRange: [0, 0], heals: false }
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
  let hp = base;
  BODY_PARTS.forEach(p => {
    const state = d.injuries[p.key];
    if (state.tier === 'destroyed') hp -= base * p.contribution;
  });
  return Math.round(hp);
}

export function applyStarvationHit(d) {
  const part = randomBodyPart();
  if (part !== 'general') {
    const tier = Math.random() < 0.5 ? 'bruise' : 'wound';
    applyInjury(d, part, tier);
  }
  d.health = Math.max(0, d.health - 1);
  if (d.health === 0) d.incapacitated = true;
}

export function applyInjury(d, partKey, tier) {
  ensureInjuryState(d);
  const part = d.injuries[partKey];
  if (!part) return;
  const currentIndex = INJURY_TIERS.findIndex(t => t.key === part.tier);
  const newIndex = INJURY_TIERS.findIndex(t => t.key === tier);
  if (newIndex > currentIndex) {
    part.tier = tier;
    const range = INJURY_TIERS[newIndex].rateRange;
    part.rate = Math.random() * (range[1] - range[0]) + range[0];
    part.progress = 0;
  }
}

export function tickInjuries(d, dt, resilience = 0, task = 'Idle') {
  ensureInjuryState(d);
  const resting = task === 'Resting';
  BODY_PARTS.forEach(p => {
    const state = d.injuries[p.key];
    if (!state.tier || state.tier === 'destroyed') return;
    const tierInfo = INJURY_TIERS.find(t => t.key === state.tier);
    const baseRate = state.rate ??
      (Math.random() * (tierInfo.rateRange[1] - tierInfo.rateRange[0]) + tierInfo.rateRange[0]);
    state.rate = baseRate;
    let rate = baseRate;
    if (resting) rate /= 2;
    const net = rate - resilience;
    state.progress = Math.max(0, state.progress + net * dt);
    if (state.progress >= 200) {
      state.tier = 'destroyed';
      state.progress = 200;
      if (p.vital) d.incapacitated = true;
    } else if (state.progress >= 100 && state.tier === 'bruise') {
      state.tier = 'wound';
      const range = INJURY_TIERS[1].rateRange;
      state.rate = Math.random() * (range[1] - range[0]) + range[0];
      state.progress = 0;
    } else if (state.progress === 0 && net < 0) {
      state.tier = null;
    }
  });
  const maxHp = calculateMaxHealth(d);
  d.health = Math.min(maxHp, d.health + resilience * dt);
}
