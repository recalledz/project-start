export const suitSymbols = {
  Hearts: '♥',
  Spades: '♠',
  Diamonds: '♦',
  Clubs: '♣'
};

export const suitColors = {
  Hearts: 'red',
  Diamonds: 'red',
  Spades: 'black',
  Clubs: 'black'
};

export const suits = ['Hearts', 'Spades', 'Diamonds', 'Clubs'];

const names = {
  1: 'Ace',
  11: 'Jack',
  12: 'Queen',
  13: 'King'
};

export class Card {
  constructor(suit, value, backType = 'basic-red') {
    this.suit = suit;
    this.value = value;
    this.name = names[value] || String(value);
    this.symbol = suitSymbols[suit];
    this.color = suitColors[suit];
    this.id = `${value}_of_${suit}`;

    this.backType = backType;

    this.currentLevel = 1;
    this.XpCurrent = 0;
    this.XpReq = 1;

    const baseMultiplier = 1 + (value - 1) / 12;
    this.baseDamage = 5 * baseMultiplier;
    this.damage = this.baseDamage;
    this.maxHp = Math.round(5 * baseMultiplier);
    this.currentHp = this.maxHp;
    this.baseHpBoost = 0;

    // Amount of HP this card recovers each time an enemy is killed
    this.hpPerKill = 1;

    this.job = null;
    this.traits = [];
  }

  gainXp(amount) {
    this.XpCurrent += amount;
    let leveled = false;
    while (this.XpCurrent >= this.XpReq) {
      this.XpCurrent -= this.XpReq;
      this.levelUp();
      leveled = true;
    }
    return leveled;
  }

  levelUp() {
    this.currentLevel++;
    this.XpReq += this.currentLevel * 1.7 * (this.value ** 2);
    this.damage = this.baseDamage + 5 * (this.currentLevel - 1);
    const baseMultiplier = 1 + (this.value - 1) / 12;
    this.maxHp = Math.round(5 * baseMultiplier + 5 * (this.currentLevel - 1) + this.baseHpBoost);
    this.currentHp = this.maxHp;
  }

  healFromKill() {
    const healed = Math.min(this.maxHp, this.currentHp + this.hpPerKill);
    this.currentHp = Math.round(healed);
  }

  upgradeHpPerKill(amount = 1) {
    this.hpPerKill += amount;
  }

  takeDamage(amount) {
    const remaining = Math.max(0, this.currentHp - amount);
    this.currentHp = Math.round(remaining);
  }

  isDefeated() {
    return this.currentHp <= 0;
  }

  /**
   * Recalculate this card's max and current HP based on level and multipliers.
   * @param {object} stats - Player stats providing heartHpMultiplier.
   * @param {object} barUpgrades - Bar data providing maxHp multiplier.
   */
  recalcHp(stats = {}, barUpgrades = {}) {
    recalcCardHp(this, stats, barUpgrades);
  }
}

export function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export function generateDeck() {
  const deck = [];
  for (const suit of suits) {
    for (let value = 1; value <= 13; value++) {
      deck.push(new Card(suit, value));
    }
  }
  shuffleArray(deck);
  return deck;
}

export function recalcCardHp(card, stats = {}, barUpgrades = {}) {
  const baseMul = 1 + (card.value - 1) / 12;
  const baseHp = 5 * baseMul + 5 * (card.currentLevel - 1) + card.baseHpBoost;
  const suitMult =
    card.suit === 'Hearts' ? stats.heartHpMultiplier || 1 : 1;
  const maxHpMult = barUpgrades.maxHp?.multiplier || 1;
  const hp = Math.round(baseHp * maxHpMult * suitMult);
  const ratio = card.maxHp > 0 ? card.currentHp / card.maxHp : 1;
  card.maxHp = hp;
  card.currentHp = Math.round(Math.min(hp, ratio * hp));
}

export function updateAllCardHp(deck, stats = {}, barUpgrades = {}) {
  deck.forEach(c => recalcCardHp(c, stats, barUpgrades));
}

export default generateDeck;
