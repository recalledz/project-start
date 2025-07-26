import Enemy from "./enemy.js"

 export class Boss extends Enemy {
  constructor(stage, world, config = {}) {
    super(stage, world, {
      ...config,
      name: config.name || "Boss",
      attackInterval: config.attackInterval || 3000,
    });
    this.icon = config.icon;
    this.iconColor = config.iconColor;
    this.abilities = config.abilities || [];
  }

  tick(deltaTime) {
    super.tick(deltaTime);
    this.abilities.forEach(ability => ability.tick(deltaTime, this));
  }
    
  die() {
    this.defeated = true;
  }
}

export const BossTemplates = {
  1: {
    name: "Coqui del Mar",
    icon: "waves",
    iconColor: "blue",
    abilityKeys: ["healing.heal"],
  },
  2: {
    name: "Ogre",
    icon: "shield",
    iconColor: "gray",
    abilityKeys: ["defense.shield"],
  },
  // Add more worlds here
};
