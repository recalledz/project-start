export const QUIRKS = {
  hardWorker: {
    name: 'Hard Worker',
    description: '+5 to gathering and woodcutting. Mood increases while working these tasks.'
  },
  lazy: {
    name: 'Lazy',
    description: 'Sometimes stops working without reason.'
  },
  multitasker: {
    name: 'Multitasker',
    description: '-5 Water Sense. Switches between tasks daily.'
  },
  scrawny: {
    name: 'Scrawny',
    description: '-20% combat XP.'
  },
  hedonistic: {
    name: 'Hedonistic',
    description: '1.3× work speed if mood above 50%, otherwise 0.5×.'
  },
  condemned: {
    name: 'Condemned',
    description: '1.5× work speed but 0.3× metamorph XP.'
  },
  strong: {
    name: 'Strong',
    description: '1.3× melee damage.'
  },
  amplified: {
    name: 'Amplified',
    description: '1.3× potency.'
  },
  frugal: {
    name: 'Frugal',
    description: 'Consumes 10% fewer resources.'
  },
  stoic: {
    name: 'Stoic',
    description: 'Mood decreases 20% slower.'
  },
  glutton: {
    name: 'Glutton',
    description: 'Eats 20% more food.'
  },
  zealous: {
    name: 'Zealous',
    description: '+10% xp when studying or training.'
  },
  clumsy: {
    name: 'Clumsy',
    description: 'Small chance to injure self while working.'
  }
};

export function generateRandomQuirks() {
  const keys = Object.keys(QUIRKS);
  const count = Math.floor(Math.random() * 3) + 1;
  const result = [];
  for (let i = 0; i < count && keys.length > 0; i++) {
    const idx = Math.floor(Math.random() * keys.length);
    result.push(keys.splice(idx, 1)[0]);
  }
  return result;
}
