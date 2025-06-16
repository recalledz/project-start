export const Jobs = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    attribute: 'Strength',
    description: 'High HP, taunt abilities'
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    attribute: 'Dexterity',
    description: 'Increased critical hits and speed'
  },
  mage: {
    id: 'mage',
    name: 'Mage',
    attribute: 'Mind',
    description: 'Powerful magical attacks'
  },
  trickster: {
    id: 'trickster',
    name: 'Trickster',
    attribute: 'Chaos',
    description: 'Unpredictable burst damage'
  },
  priest: {
    id: 'priest',
    name: 'Priest',
    attribute: 'Holy',
    description: 'Healing and support abilities'
  }
};

export function getJob(id) {
  return Jobs[id] || null;
}

export function assignJob(card, jobId) {
  if (!Jobs[jobId]) return false;
  card.job = jobId;
  // Placeholder: apply job bonuses here in the future
  return true;
}

export function getAvailableJobs(card) {
  const mapping = {
    Spades: ['warrior'],
    Diamonds: ['rogue'],
    Clubs: ['mage'],
    Hearts: ['priest']
  };
  return mapping[card.suit] || [];
}
