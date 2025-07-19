export const HealingJoker = {
  id: "joker_heal",
  name: "Healing Joker",
  isJoker: true,
  abilityType: "heal",
  baseValue: 10,
  image: "img/healerJoker.png",
  awardCondition: "defeat_boss_world_1",

  getScaledPower(context = {}) {
    const { healingBonus = 0 } = context;
    return Math.floor(this.baseValue * (1 + healingBonus));
  },

  description: "Heal for 10 HP, increased by healing bonuses.",
};


export const DamageJoker = {
  id: "joker_damage",
  name: "Damage Joker",
  isJoker: true,
  abilityType: "damage",
  baseValue: 8,
  image: "assets/jokers/damage_joker.png",
  awardCondition: "defeat_boss_world_3",

  getScaledPower(context = {}) {
    const { damageBonus = 0 } = context;
    return Math.floor(this.baseValue * (1 + damageBonus));
  },

  description: "Deal 8 damage, increased by damage bonuses.",
};


export const ShieldJoker = {
  id: "joker_shield",
  name: "Shield Joker",
  isJoker: true,
  abilityType: "shield",
  baseValue: 5,
  image: "assets/jokers/shield_joker.png",
  awardCondition: "defeat_boss_world_2",

  getScaledPower(context = {}) {
    const { shieldBonus = 0 } = context;
    return Math.floor(this.baseValue * (1 + shieldBonus));
  },

  description: "Gain a 5-point shield, increased by shield bonuses.",
};


export const BuffJoker = {
  id: "joker_buff",
  name: "Buff Joker",
  isJoker: true,
  abilityType: "buff",
  baseValue: 1.2,
  baseDuration: 2,
  image: "assets/jokers/buff_joker.png",
  awardCondition: "defeat_boss_world_4",

  getScaledPower(context = {}) {
    const {
      buffPowerBonus = 0,
      buffDurationBonus = 0,
    } = context;

    const finalMultiplier = parseFloat(
      (this.baseValue * (1 + buffPowerBonus)).toFixed(2)
    );
    const finalDuration = Math.floor(
      this.baseDuration * (1 + buffDurationBonus)
    );

    return { finalMultiplier, finalDuration };
  },

  description: "Buff attack ×1.2 for 2 turns, scaled by bonuses.",
};


export const AllJokerTemplates = [
  HealingJoker,
  ShieldJoker,
  DamageJoker,
  BuffJoker,
];
