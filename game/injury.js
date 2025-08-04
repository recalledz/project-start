export const BODY_PARTS = [
  { key: 'head', label: 'Head', vital: true },
  { key: 'leftEye', label: 'Left Eye', vital: false },
  { key: 'rightEye', label: 'Right Eye', vital: false },
  { key: 'vocalSac', label: 'Vocal Sac', vital: false },
  { key: 'leftHand', label: 'Left Hand', vital: false },
  { key: 'rightHand', label: 'Right Hand', vital: false },
  { key: 'leftLeg', label: 'Left Leg', vital: false },
  { key: 'rightLeg', label: 'Right Leg', vital: false },
  { key: 'belly', label: 'Belly', vital: false },
  { key: 'meridians', label: 'Inner Meridians', vital: false },
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

export function applyInjuryEffects(d) {
  ensureInjuryState(d);
  if (!d.baseStats) {
    d.baseStats = {
      attackSpeed: d.attackSpeed ?? 5000,
      hitAccuracy: d.hitAccuracy ?? 1,
      workSpeedMult: d.workSpeedMult ?? 1,
      mobility: d.mobility ?? 1,
      waterRegenMult: d.waterRegenMult ?? 1,
      metamorphSpeedMult: d.metamorphSpeedMult ?? 1
    };
  }
  let attackSpeedMult = 1;
  let accuracyMult = 1;
  let workSpeedMult = 1;
  let mobilityMult = 1;
  let waterRegenMult = 1;
  let metamorphMult = 1;
  let canChant = true;
  let canMelee = true;
  let canMove = true;
  const effects = {};

  const s = d.injuries;
  const leftEyeDestroyed = s.leftEye?.tier === 'destroyed';
  const rightEyeDestroyed = s.rightEye?.tier === 'destroyed';
  const leftHandDestroyed = s.leftHand?.tier === 'destroyed';
  const rightHandDestroyed = s.rightHand?.tier === 'destroyed';
  const leftLegDestroyed = s.leftLeg?.tier === 'destroyed';
  const rightLegDestroyed = s.rightLeg?.tier === 'destroyed';

  BODY_PARTS.forEach(p => {
    const state = s[p.key];
    if (!state || !state.tier) return;
    if (state.tier === 'destroyed') {
      switch (p.key) {
        case 'head':
          effects[p.key] = 'Instant death';
          d.health = 0;
          d.currentHp = 0;
          d.incapacitated = true;
          break;
        case 'leftEye':
        case 'rightEye':
          accuracyMult *= 0.5;
          workSpeedMult *= 0.75;
          effects[p.key] = '-50% hit accuracy, -25% work speed';
          break;
        case 'vocalSac':
          canChant = false;
          effects[p.key] = 'Cannot chant or cast spells';
          break;
        case 'leftHand':
        case 'rightHand':
          attackSpeedMult *= 2;
          workSpeedMult *= 0.75;
          effects[p.key] = '-50% attack speed, -25% work speed';
          break;
        case 'leftLeg':
        case 'rightLeg':
          mobilityMult *= 0.5;
          workSpeedMult *= 0.5;
          effects[p.key] = '-50% mobility, -50% work speed';
          break;
        case 'belly':
          workSpeedMult *= 0.75;
          effects[p.key] = '-25% work speed';
          break;
        case 'meridians':
          waterRegenMult *= 0.5;
          metamorphMult *= 0.5;
          effects[p.key] = 'Halved water regen and metamorphosis speed';
          break;
      }
    } else if (state.tier === 'wound') {
      effects[p.key] = 'Wound: HP drain and severe penalty';
    } else if (state.tier === 'bruise') {
      effects[p.key] = 'Bruise: minor penalty';
    }
  });

  if (leftEyeDestroyed && rightEyeDestroyed) {
    accuracyMult = 0;
    effects.leftEye = '0% hit accuracy; ranged attacks impossible';
    effects.rightEye = '0% hit accuracy; ranged attacks impossible';
  }
  if (leftHandDestroyed && rightHandDestroyed) {
    canMelee = false;
    effects.leftHand = 'Cannot perform melee attacks or crafting';
    effects.rightHand = 'Cannot perform melee attacks or crafting';
  }
  if (leftLegDestroyed && rightLegDestroyed) {
    mobilityMult = 0;
    canMove = false;
    effects.leftLeg = 'Cannot move';
    effects.rightLeg = 'Cannot move';
  }

  d.attackSpeed = d.baseStats.attackSpeed * attackSpeedMult;
  d.hitAccuracy = d.baseStats.hitAccuracy * accuracyMult;
  d.workSpeedMult = d.baseStats.workSpeedMult * workSpeedMult;
  d.mobility = d.baseStats.mobility * mobilityMult;
  d.waterRegenMult = d.baseStats.waterRegenMult * waterRegenMult;
  d.metamorphSpeedMult = d.baseStats.metamorphSpeedMult * metamorphMult;
  d.canChant = canChant;
  d.canMelee = canMelee;
  d.canMove = canMove;
  d.injuryEffects = effects;
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
    applyInjuryEffects(d);
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
  d.health = Math.min(d.maxHp, d.health + resilience * dt);
  applyInjuryEffects(d);
}
